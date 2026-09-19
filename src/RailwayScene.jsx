import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RailwayJourney } from "./railway-journey.mjs";
import { SCENARIOS, decisionOutcome } from "./scenarios.mjs";
import {
  GAUGE,
  START_Z,
  END_Z,
  TILE_LENGTH,
  JUNCTION_LENGTH,
  PEOPLE_Z,
  centerAtZ,
  makeRoute,
  sampleRoute,
  switchBladePoint,
  smooth,
} from "./railway-motion.mjs";

// Rectangular steel rails, swept along exactly the same centerline as the camera.
function ribbon(points, width, height = 0.13, y = 0.15) {
  const vertices = [],
    indices = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)],
      b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / length,
      nz = (b.x - a.x) / length;
    for (const [side, up] of [
      [-1, 0],
      [1, 0],
      [-1, 1],
      [1, 1],
    ]) {
      vertices.push(
        p.x + (nx * width * side) / 2,
        y + up * height,
        p.z + (nz * width * side) / 2,
      );
    }
    if (i) {
      const n = i * 4,
        p0 = n - 4;
      indices.push(
        p0 + 2,
        n + 2,
        p0 + 3,
        p0 + 3,
        n + 2,
        n + 3,
        p0,
        n,
        p0 + 2,
        p0 + 2,
        n,
        n + 2,
        p0 + 1,
        p0 + 3,
        n + 1,
        p0 + 3,
        n + 3,
        n + 1,
      );
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function trackPoints(choice, start = 16, end = END_Z, offset = 0) {
  const points = [];
  for (let z = start; z >= end - 0.001; z -= 0.25) {
    const p = centerAtZ(choice, z),
      a = centerAtZ(choice, z + 0.01),
      b = centerAtZ(choice, z - 0.01);
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    points.push({
      x: p.x - ((b.z - a.z) / length) * offset,
      z: p.z + ((b.x - a.x) / length) * offset,
    });
  }
  return points;
}

function createWorld(host, callbacks) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x071027, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x101a30, 40, 115);
  const camera = new THREE.PerspectiveCamera(48, 2.4, 0.1, 220);
  scene.add(new THREE.HemisphereLight(0xdaecff, 0x394358, 2.6));
  const sunlight = new THREE.DirectionalLight(0xffc295, 3.1);
  sunlight.position.set(-25, 35, -20);
  scene.add(sunlight);
  const materials = {
    rail: new THREE.MeshStandardMaterial({
      color: 0xc1d5df,
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide,
    }),
    blade: new THREE.MeshStandardMaterial({
      color: 0xffcd68,
      metalness: 0.55,
      roughness: 0.3,
      emissive: 0x5e3912,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    }),
    ballast: new THREE.MeshStandardMaterial({
      color: 0x323d50,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    wood: new THREE.MeshStandardMaterial({ color: 0x454051, roughness: 0.9 }),
    cyan: new THREE.MeshBasicMaterial({ color: 0x56ddee }),
    red: new THREE.MeshBasicMaterial({ color: 0xff626c }),
    dark: new THREE.MeshStandardMaterial({ color: 0x172039, roughness: 0.85 }),
  };
  // Fog must fade into the painted sky, not leave opaque silhouettes of
  // future junctions that would visibly jump when a pending track extends.
  const fadeIntoSky = (material) => {
    material.transparent = true;
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <fog_fragment>",
        "#include <fog_fragment>\n#ifdef USE_FOG\ngl_FragColor.a *= 1.0 - fogFactor;\n#endif",
      );
    };
  };
  Object.values(materials).forEach(fadeIntoSky);
  let dirty = true;
  let dead = false,
    texturesReady = false,
    personReady = false,
    stationReady = false,
    activeTile,
    currentIndex = -1;
  let phaseKey = "",
    phaseTime = 0,
    fired = false;
  let frame = 0,
    previous = 0,
    latestState;
  let lastDistance = -1;
  const journey = new RailwayJourney(SCENARIOS.length);
  const extensions = [];
  const tiles = [],
    resources = new Set();
  const remember = (g) => {
    resources.add(g);
    return g;
  };
  const texture = new THREE.TextureLoader().load(
    "/assets/railway-person.png",
    () => {
      if (!dead) {
        personReady = true;
        texturesReady = personReady && stationReady;
        dirty = true;
      }
    },
    undefined,
    () =>
      callbacks.error(
        "人物画像を読み込めませんでした。ページを再読み込みしてください。",
      ),
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  // Crop transparent margins using UVs; the source image is kept intact.
  texture.repeat.set(485 / 1024, 1193 / 1536);
  texture.offset.set(269 / 1024, 172 / 1536);
  const personMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    // Visible sprite pixels must occlude farther transparent rail sections.
    // Keep depth testing so nearer world geometry can still occlude the person.
    depthWrite: true,
  });
  fadeIntoSky(personMaterial);
  const skylineTexture = new THREE.TextureLoader().load(
    "/assets/railway-skyline.png",
    () => {
      dirty = true;
    },
  );
  skylineTexture.colorSpace = THREE.SRGBColorSpace;
  const skylineGeometry = new THREE.CylinderGeometry(
    140,
    140,
    186.7,
    80,
    1,
    true,
    Math.PI - 1.6,
    3.2,
  );
  const skylineMaterial = new THREE.MeshBasicMaterial({
    map: skylineTexture,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const skyline = new THREE.Mesh(skylineGeometry, skylineMaterial);
  skyline.renderOrder = -1;
  scene.add(skyline);
  const sleeperGeometry = remember(new THREE.BoxGeometry(2.55, 0.13, 0.27));

  function addTile(index, origin) {
    const group = new THREE.Group();
    group.position.set(origin.x, 0, origin.z);
    scene.add(group);
    const people = {},
      blades = [];
    for (const choice of ["stay", "switch"]) {
      const start = choice === "stay" ? START_Z : -4;
      const end =
        choice === "stay"
          ? index === SCENARIOS.length - 1
            ? START_Z - JUNCTION_LENGTH
            : END_Z
          : -80;
      const bed = new THREE.Mesh(
        remember(
          ribbon(
            trackPoints(choice, start, end),
            3.1,
            0.18,
            choice === "stay" ? -0.18 : -0.185,
          ),
        ),
        materials.ballast,
      );
      group.add(bed);
      for (const side of [-1, 1])
        group.add(
          new THREE.Mesh(
            remember(
              ribbon(trackPoints(choice, start, end, (side * GAUGE) / 2), 0.11),
            ),
            materials.rail,
          ),
        );
      const route = makeRoute(
        choice,
        { x: 0, z: 0 },
        index === SCENARIOS.length - 1 ? JUNCTION_LENGTH : TILE_LENGTH,
      );
      const sleepers = [];
      for (let d = 0; d < route.length; d += 0.75) {
        const p = sampleRoute(route, d);
        if (choice === "switch" && p.position.x < 1.7) continue;
        sleepers.push(p);
      }
      const ties = new THREE.InstancedMesh(
          sleeperGeometry,
          materials.wood,
          sleepers.length,
        ),
        matrix = new THREE.Object3D();
      sleepers.forEach((p, i) => {
        matrix.position.set(p.position.x, 0.015, p.position.z);
        matrix.rotation.y = Math.atan2(-p.tangent.x, -p.tangent.z);
        matrix.updateMatrix();
        ties.setMatrixAt(i, matrix.matrix);
      });
      group.add(ties);
      // Subtle outer guide stripe retains the cyan/red route vocabulary.
      group.add(
        new THREE.Mesh(
          remember(
            ribbon(
              trackPoints(choice, start, end, choice === "stay" ? -1.4 : 1.4),
              0.05,
              0.025,
              0.045,
            ),
          ),
          choice === "stay" ? materials.cyan : materials.red,
        ),
      );
      const personGroup = new THREE.Group();
      people[choice] = personGroup;
      group.add(personGroup);
      personGroup.visible = index === 0;
      const count =
        choice === "stay"
          ? SCENARIOS[index].left.people
          : SCENARIOS[index].right.people;
      for (let i = 0; i < count; i++) {
        const person = new THREE.Sprite(personMaterial);
        // A single row keeps every person visible from the driver's seat.
        person.position.set(
          centerAtZ(choice, PEOPLE_Z).x + (i - (count - 1) / 2) * 0.56,
          1.03,
          PEOPLE_Z,
        );
        person.scale.set(0.68, 1.7, 1);
        personGroup.add(person);
      }
      // Trackside illuminated marker, attached to the same world as the rails.
      const marker = new THREE.Mesh(
        remember(new THREE.BoxGeometry(0.1, 1.8, 0.12)),
        choice === "stay" ? materials.cyan : materials.red,
      );
      marker.position.set(
        centerAtZ(choice, PEOPLE_Z).x + (choice === "stay" ? -1.5 : 1.5),
        0.9,
        PEOPLE_Z,
      );
      personGroup.add(marker);
    }
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BufferGeometry(), materials.blade);
      group.add(blade);
      blades.push({ side, mesh: blade });
    }
    const bar = new THREE.Mesh(
      remember(new THREE.BoxGeometry(2.1, 0.12, 0.16)),
      materials.blade,
    );
    bar.position.set(0, 0.08, -4.6);
    group.add(bar);
    const motor = new THREE.Mesh(
      remember(new THREE.BoxGeometry(0.6, 0.3, 1)),
      materials.dark,
    );
    motor.position.set(-1.65, 0.18, -4.6);
    group.add(motor);
    const tile = { index, origin, group, people, blades, bar, alignment: -1 };
    tiles.push(tile);
    align(tile, 0.5);
    return tile;
  }
  // Every rail exists from the first frame. Both branches rejoin the next trunk.
  for (let index = 0; index < SCENARIOS.length; index++)
    addTile(index, journey.origins[index]);
  const stationRoute = journey.stationRoute;
  const stationGroup = new THREE.Group();
  scene.add(stationGroup);
  const stationStart = stationRoute.points[0].z,
    stationEnd = stationRoute.bufferZ;
  const straight = (offset = 0) => [
    { x: offset, z: stationStart },
    { x: offset, z: stationEnd },
  ];
  stationGroup.add(
    new THREE.Mesh(
      remember(ribbon(straight(), 3.1, 0.18, -0.18)),
      materials.ballast,
    ),
  );
  for (const side of [-1, 1])
    stationGroup.add(
      new THREE.Mesh(
        remember(ribbon(straight((side * GAUGE) / 2), 0.11)),
        materials.rail,
      ),
    );
  const stationTies = new THREE.InstancedMesh(
    sleeperGeometry,
    materials.wood,
    Math.ceil((stationStart - stationEnd) / 0.75),
  );
  const tiePose = new THREE.Object3D();
  for (let i = 0; i < stationTies.count; i++) {
    tiePose.position.set(0, 0.015, stationStart - i * 0.75);
    tiePose.updateMatrix();
    stationTies.setMatrixAt(i, tiePose.matrix);
  }
  stationGroup.add(stationTies);
  const structure = (
    width,
    height,
    depth,
    x,
    y,
    z,
    material = materials.dark,
  ) => {
    const mesh = new THREE.Mesh(
      remember(new THREE.BoxGeometry(width, height, depth)),
      material,
    );
    mesh.position.set(x, y, z);
    stationGroup.add(mesh);
    return mesh;
  };
  const platformCenter = stationStart - 42;
  for (const side of [-1, 1]) {
    structure(5, 0.7, 36, side * 4.25, 0.2, platformCenter, materials.ballast);
    structure(
      0.12,
      0.025,
      36,
      side * 1.82,
      0.57,
      platformCenter,
      side < 0 ? materials.cyan : materials.red,
    );
    structure(
      5.4,
      0.18,
      31,
      side * 4.4,
      4.4,
      platformCenter - 1,
      materials.dark,
    );
    for (let i = 0; i < 5; i++) {
      const z = platformCenter + 12 - i * 6;
      structure(0.14, 3.8, 0.14, side * 6.2, 2.4, z, materials.rail);
      structure(
        3,
        0.04,
        0.1,
        side * 4.2,
        4.28,
        z,
        side < 0 ? materials.cyan : materials.red,
      );
    }
  }
  // A real buffer stop ends the station siding; the train stops eight metres before it.
  structure(2.2, 0.25, 0.3, 0, 1.0, stationEnd + 1, materials.blade);
  for (const side of [-1, 1])
    structure(
      0.22,
      0.8,
      0.8,
      side * 0.75,
      0.55,
      stationEnd + 0.6,
      materials.rail,
    );
  const stationTexture = new THREE.TextureLoader().load(
    "/assets/terminal-station.png",
    () => {
      if (!dead) {
        stationReady = true;
        texturesReady = personReady && stationReady;
        dirty = true;
      }
    },
    undefined,
    () =>
      callbacks.error(
        "終点駅の画像を読み込めませんでした。ページを再読み込みしてください。",
      ),
  );
  stationTexture.colorSpace = THREE.SRGBColorSpace;
  const stationMaterial = new THREE.MeshBasicMaterial({
    map: stationTexture,
    transparent: true,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
  });
  fadeIntoSky(stationMaterial);
  const facade = new THREE.Mesh(
    remember(new THREE.PlaneGeometry(27, 13.5)),
    stationMaterial,
  );
  facade.position.set(0, 6.9, stationEnd - 14);
  stationGroup.add(facade);

  function extendTrack({ afterIndex, fromZ, toZ, amount }) {
    for (let i = afterIndex + 1; i < tiles.length; i++)
      tiles[i].group.position.z = journey.origins[i].z;
    stationGroup.position.z -= amount;
    const group = new THREE.Group();
    const straight = (offset) => [
      { x: offset, z: fromZ },
      { x: offset, z: toZ },
    ];
    group.add(
      new THREE.Mesh(
        remember(ribbon(straight(0), 3.1, 0.18, -0.18)),
        materials.ballast,
      ),
    );
    for (const side of [-1, 1])
      group.add(
        new THREE.Mesh(
          remember(ribbon(straight((side * GAUGE) / 2), 0.11)),
          materials.rail,
        ),
      );
    group.add(
      new THREE.Mesh(
        remember(ribbon(straight(-1.4), 0.05, 0.025, 0.045)),
        materials.cyan,
      ),
    );
    const ties = new THREE.InstancedMesh(
      sleeperGeometry,
      materials.wood,
      Math.ceil(amount / 0.75),
    );
    const pose = new THREE.Object3D();
    for (let i = 0; i < ties.count; i++) {
      pose.position.set(0, 0.015, fromZ - i * 0.75);
      pose.updateMatrix();
      ties.setMatrixAt(i, pose.matrix);
    }
    group.add(ties);
    scene.add(group);
    extensions.push({ group, endZ: toZ });
    dirty = true;
  }
  function align(tile, value) {
    if (Math.abs(tile.alignment - value) < 0.0001) return;
    tile.alignment = value;
    for (const { side, mesh } of tile.blades) {
      const points = Array.from({ length: 33 }, (_, i) =>
        switchBladePoint(side, i / 32, value),
      );
      mesh.geometry.dispose();
      mesh.geometry = ribbon(points, 0.09, 0.12, 0.285);
    }
    tile.bar.position.x = value * 0.28;
  }
  function setCamera({ position, tangent }) {
    camera.position.set(position.x, 2.45, position.z);
    skyline.position.set(position.x, -16.2, position.z);
    dirty = true;
    // A tangent-facing camera has no lateral offset from the rail centerline.
    camera.lookAt(
      position.x + tangent.x * 16,
      1.45,
      position.z + tangent.z * 16,
    );
  }
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width / height < 1.7 ? 58 : 48;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  function signal(name) {
    if (fired) return;
    fired = true;
    callbacks.event(name);
  }
  function tick(time) {
    if (dead) return;
    frame = requestAnimationFrame(tick);
    // Hidden tabs pause the simulation; no skipped collision or unseen paid round.
    const dt = document.hidden
      ? 0
      : Math.min((time - previous) / 1000 || 0, 0.05);
    previous = time;
    const state = latestState;
    if (!state) return;
    if (state.roundIndex !== currentIndex) {
      currentIndex = state.roundIndex;
      activeTile = tiles[currentIndex];
      for (const group of Object.values(activeTile.people))
        group.visible = true;
      host.dataset.junction = String(currentIndex + 1);
    }
    const key = `${state.roundIndex}:${state.phase}`;
    if (key !== phaseKey) {
      phaseKey = key;
      phaseTime = 0;
      fired = false;
      dirty = true;
      if (state.phase === "moving") {
        journey.lock(
          currentIndex,
          decisionOutcome(SCENARIOS[currentIndex], state.answer.choice).route,
        );
        journey.start();
      }
      if (state.phase === "impact")
        activeTile.people[
          decisionOutcome(SCENARIOS[currentIndex], state.answer.choice).route
        ].visible = false;
      if (state.phase === "arrived") host.dataset.station = "arrived";
      if (state.phase === "ready") host.dataset.points = "unlocked";
    }
    phaseTime += dt;
    if (state.phase === "switching") {
      align(
        activeTile,
        0.5 +
          smooth(phaseTime / 1.15) *
            ((decisionOutcome(SCENARIOS[currentIndex], state.answer.choice)
              .route === "switch"
              ? 1
              : 0) -
              0.5),
      );
      host.dataset.points =
        phaseTime < 1.15
          ? "changing"
          : decisionOutcome(SCENARIOS[currentIndex], state.answer.choice).route;
      if (phaseTime >= 1.3) signal("switch");
    }
    const motion = journey.step(dt);
    if (motion.extension) extendTrack(motion.extension);
    // Keep an undecided fork beyond the fog. Only delayed replies need extra
    // straight track; reveal the new distance gradually after an extension/lock.
    const pendingNext =
      !motion.station &&
      motion.physicalIndex < SCENARIOS.length - 1 &&
      !journey.routes[motion.physicalIndex + 1];
    const visibleDistance = pendingNext
      ? Math.min(
          115,
          motion.position.z -
            (journey.origins[motion.physicalIndex + 1].z + START_Z) -
            2,
        )
      : 115;
    scene.fog.far = Math.min(visibleDistance, scene.fog.far + dt * 50);
    scene.fog.near = Math.min(40, scene.fog.far * 0.4);
    host.dataset.visibility = scene.fog.far.toFixed(1);
    host.dataset.speed = motion.speed.toFixed(3);
    host.dataset.distance = motion.totalDistance.toFixed(3);
    host.dataset.physicalJunction = String(motion.physicalIndex + 1);
    host.dataset.waitingTrack = String(extensions.length);
    const localZ = motion.position.z - journey.origins[motion.physicalIndex].z;
    host.dataset.travel = !journey.started
      ? "stopped"
      : motion.station
        ? "station"
        : motion.physicalIndex < currentIndex
          ? "between-questions"
          : localZ > -4
            ? "approach-points"
            : localZ > -36
              ? "curve"
              : localZ > PEOPLE_Z
                ? "approach-people"
                : localZ > -80
                  ? "rejoining"
                  : "connecting-straight";
    // Reduced-motion viewers get stable views at each event, with the same
    // logical journey and timing. It never changes requests or skips a question.
    if (dirty || (!reduced.matches && motion.totalDistance !== lastDistance))
      setCamera(motion);
    lastDistance = motion.totalDistance;
    for (let i = extensions.length - 1; i >= 0; i--) {
      const old = extensions[i];
      if (old.endZ > motion.position.z + 25) {
        scene.remove(old.group);
        old.group.traverse((object) => {
          if (object.isInstancedMesh) object.dispose();
          if (object.geometry && object.geometry !== sleeperGeometry) {
            resources.delete(object.geometry);
            object.geometry.dispose();
          }
        });
        extensions.splice(i, 1);
      }
    }
    if (
      state.phase === "moving" &&
      motion.physicalIndex === currentIndex &&
      journey.distance >= journey.routes[currentIndex].impactDistance
    )
      signal("impact");
    if (state.phase === "impact" && phaseTime >= 0.55) signal("consequence");
    if (state.phase === "departing") {
      if (currentIndex < SCENARIOS.length - 1 && phaseTime >= 1.7)
        signal("next");
      else if (currentIndex === SCENARIOS.length - 1 && motion.station)
        signal("next");
    }
    if (state.phase === "station") {
      host.dataset.station = motion.arrived
        ? "arrived"
        : journey.distance < 20
          ? "approaching"
          : "platform";
      if (motion.arrived) signal("arrived");
    }
    if (!document.hidden && (dirty || state.phase === "switching")) {
      renderer.render(scene, camera);
      dirty = false;
    }
    if (texturesReady && host.dataset.ready !== "true") {
      host.dataset.ready = "true";
      callbacks.ready();
    }
  }
  const lost = (event) => {
    event.preventDefault();
    dead = true;
    cancelAnimationFrame(frame);
    callbacks.error("描画が中断されました。ページを再読み込みしてください。");
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  frame = requestAnimationFrame(tick);
  return {
    update(state) {
      latestState = state;
    },
    dispose() {
      dead = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      for (const tile of tiles)
        for (const blade of tile.blades) blade.mesh.geometry.dispose();
      scene.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
      });
      for (const g of resources) g.dispose();
      for (const m of Object.values(materials)) m.dispose();
      skylineGeometry.dispose();
      skylineMaterial.dispose();
      skylineTexture.dispose();
      stationMaterial.dispose();
      stationTexture.dispose();
      personMaterial.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default function RailwayScene({ run, onEvent, onReady, onError }) {
  const host = useRef(null),
    world = useRef(null),
    latest = useRef({ run, onEvent, onReady, onError });
  latest.current = { run, onEvent, onReady, onError };
  useEffect(() => {
    try {
      world.current = createWorld(host.current, {
        event: (name) => latest.current.onEvent(name),
        ready: () => latest.current.onReady(),
        error: (message) => latest.current.onError(message),
      });
      world.current.update(latest.current.run);
    } catch {
      latest.current.onError(
        "3D描画を開始できません。WebGL対応のブラウザで開いてください。",
      );
    }
    return () => world.current?.dispose();
  }, []);
  useEffect(() => {
    world.current?.update(run);
  }, [run]);
  return (
    <div
      ref={host}
      className="railway-canvas"
      role="img"
      aria-label={
        ["station", "arrived"].includes(run.phase)
          ? "終点駅のホームに続く線路"
          : `分岐 ${run.roundIndex + 1}：左に${SCENARIOS[run.roundIndex].left.label}、右に${SCENARIOS[run.roundIndex].right.label}。${["impact", "departing"].includes(run.phase) ? "犠牲にすると選んだ側の人たちを通過しました。" : ""}`
      }
    />
  );
}
