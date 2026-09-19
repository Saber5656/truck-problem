import test from "node:test";
import assert from "node:assert/strict";
import {
  makeRoute,
  sampleRoute,
  nextOrigin,
  journeyDistance,
  switchBladePoint,
  TILE_LENGTH,
  JUNCTION_LENGTH,
  START_Z,
  PEOPLE_Z,
  END_Z,
  centerAtZ,
  makeStationRoute,
} from "../src/railway-motion.mjs";

test("both routes share the incoming track and have smooth forward tangents", () => {
  for (const choice of ["stay", "switch"]) {
    const route = makeRoute(choice);
    assert.deepEqual(sampleRoute(route, 0).position, { x: 0, z: START_Z });
    for (let d = 0; d < route.length; d += 0.15) {
      const a = sampleRoute(route, d),
        b = sampleRoute(route, Math.min(d + 0.15, route.length));
      assert.ok(
        Math.hypot(b.position.x - a.position.x, b.position.z - a.position.z) <=
          0.150001,
      );
      assert.ok(a.tangent.z < -0.9);
    }
  }
});
test("consecutive junctions meet at identical positions and headings in either route", () => {
  for (const choice of ["stay", "switch"]) {
    const origin = { x: 13, z: -72 },
      route = makeRoute(choice, origin);
    const end = sampleRoute(route, route.length),
      next = makeRoute("stay", nextOrigin(origin, choice));
    assert.deepEqual(end.position, sampleRoute(next, 0).position);
    assert.deepEqual(end.tangent, sampleRoute(next, 0).tangent);
    assert.equal(nextOrigin(origin, choice).z, origin.z - TILE_LENGTH);
  }
});
test("impact happens on the chosen path before its end; both rails use the same centerline", () => {
  for (const choice of ["stay", "switch"]) {
    const route = makeRoute(choice);
    const hit = sampleRoute(route, route.impactDistance);
    assert.ok(Math.abs(hit.position.z - (PEOPLE_Z + 1)) < 0.001);
    assert.ok(route.impactDistance < route.length - 15);
    assert.equal(hit.position.x, choice === "switch" ? 8 : 0);
  }
});
test("motion accelerates and decelerates without backward travel or position jumps", () => {
  const length = 80,
    duration = 8;
  assert.equal(journeyDistance(0, length, duration), 0);
  assert.equal(journeyDistance(duration, length, duration), length);
  let prev = 0;
  for (let t = 0.01; t < duration; t += 0.01) {
    const d = journeyDistance(t, length, duration);
    assert.ok(d >= prev);
    assert.ok(d - prev < 0.13);
    prev = d;
  }
  assert.ok(journeyDistance(0.01, length, duration) < 0.001);
  assert.ok(length - journeyDistance(7.99, length, duration) < 0.001);
});
test("movable blades visibly move but keep a common heel, with bounded travel", () => {
  const a = switchBladePoint(-1, 0, 0),
    b = switchBladePoint(-1, 0, 1);
  assert.ok(Math.abs(a.x - b.x) > 0.1);
  assert.deepEqual(switchBladePoint(-1, 1, 0), switchBladePoint(-1, 1, 1));
  const mid = switchBladePoint(-1, 0, 0.5);
  assert.equal(mid.x, (a.x + b.x) / 2);
});

test("both branches rejoin one trunk with no open ends between dilemmas", () => {
  for (let index = 0; index < 3; index++) {
    const origin = { x: 0, z: -index * TILE_LENGTH };
    const stay = makeRoute("stay", origin),
      branch = makeRoute("switch", origin);
    assert.deepEqual(
      sampleRoute(stay, stay.length).position,
      sampleRoute(branch, branch.length).position,
    );
    assert.ok(
      Math.abs(
        sampleRoute(stay, stay.length).tangent.z -
          sampleRoute(branch, branch.length).tangent.z,
      ) < 1e-9,
    );
    assert.equal(centerAtZ("switch", END_Z).x, 0);
    assert.equal(nextOrigin(origin, "stay").x, nextOrigin(origin, "switch").x);
  }
});
test("the last trunk connects to a station path that stops short of its buffer", () => {
  const origin = { x: 0, z: -2 * TILE_LENGTH };
  const rail = makeRoute("switch", origin, JUNCTION_LENGTH),
    station = makeStationRoute(3);
  assert.deepEqual(
    sampleRoute(rail, rail.length).position,
    sampleRoute(station, 0).position,
  );
  assert.ok(station.length > 30);
  assert.ok(
    sampleRoute(station, station.length).position.z > station.bufferZ + 3,
  );
});
