import test from "node:test";
import assert from "node:assert/strict";
import { RailwayJourney, CRUISE_SPEED } from "../src/railway-journey.mjs";
import {
  makeRoute,
  makeStationRoute,
  TILE_LENGTH,
  JUNCTION_LENGTH,
  sampleRoute,
} from "../src/railway-motion.mjs";
import { createDecisionSession } from "../src/game-api.mjs";

test("one departure cruises through both question boundaries and only stops at the terminus", () => {
  const train = new RailwayJourney(3);
  train.lock(0, "switch");
  train.lock(1, "stay");
  train.lock(2, "switch");
  train.start();
  let previous = train.snapshot(),
    boundaries = 0;
  for (let i = 0; i < 12000 && !train.arrived; i++) {
    const frame = train.step(0.02);
    assert.ok(frame.totalDistance > previous.totalDistance);
    assert.ok(
      Math.hypot(
        frame.position.x - previous.position.x,
        frame.position.z - previous.position.z,
      ) <=
        CRUISE_SPEED * 0.02001,
    );
    if (frame.physicalIndex !== previous.physicalIndex) {
      boundaries++;
      assert.equal(frame.speed, CRUISE_SPEED);
    }
    if (frame.station && !previous.station)
      assert.ok(frame.speed > CRUISE_SPEED * 0.99);
    previous = frame;
  }
  assert.equal(boundaries, 2);
  assert.equal(train.arrived, true);
  assert.equal(train.snapshot().speed, 0);
  assert.ok(train.snapshot().position.z > train.stationRoute.bufferZ + 3);
});

test("a pending or failed next reply extends connected straight rails without stopping or entering that junction", () => {
  const train = new RailwayJourney(3);
  train.lock(0, "stay");
  train.start();
  let extensions = 0;
  for (let i = 0; i < 3500; i++) {
    const frame = train.step(0.02);
    if (i > 100) assert.equal(frame.speed, CRUISE_SPEED);
    assert.equal(frame.physicalIndex, 0);
    if (frame.extension) {
      extensions++;
      assert.equal(
        frame.extension.fromZ - frame.extension.toZ,
        frame.extension.amount,
      );
      assert.deepEqual(
        sampleRoute(train.routes[0], train.routes[0].length).position,
        { x: 0, z: train.origins[1].z + 8 },
      );
    }
  }
  assert.ok(extensions >= 2);
  train.lock(1, "switch");
  train.lock(2, "stay");
  for (let i = 0; i < 12000 && !train.arrived; i++) train.step(0.02);
  assert.equal(train.arrived, true);
});

test("no train movement before the first points lock, and lock cannot change a passed route", () => {
  const train = new RailwayJourney(3);
  train.start();
  assert.equal(train.step(1).totalDistance, 0);
  train.lock(0, "stay");
  train.start();
  train.step(1);
  const route = train.routes[0];
  train.lock(0, "switch");
  assert.equal(train.routes[0], route);
});

test("junctions add only a short response allowance and join the station", () => {
  assert.ok(TILE_LENGTH > JUNCTION_LENGTH);
  assert.ok(TILE_LENGTH - JUNCTION_LENGTH <= CRUISE_SPEED * 3);
  const route = makeRoute(
    "switch",
    { x: 0, z: -2 * TILE_LENGTH },
    JUNCTION_LENGTH,
  );
  const station = makeStationRoute(3);
  assert.deepEqual(
    sampleRoute(route, route.length).position,
    sampleRoute(station, 0).position,
  );
});

test("a game session requests each question once and only explicit retry may resend a failure", async () => {
  let calls = 0;
  const session = createDecisionSession(async (s) => {
    calls++;
    if (s.id === "fail") throw Error("offline");
    return s.id;
  });
  await Promise.all([
    session.request({ id: "one" }, "live"),
    session.request({ id: "one" }, "live"),
  ]);
  assert.equal(calls, 1);
  await session.request({ id: "two" }, "live");
  await session.request({ id: "three" }, "live");
  assert.equal(calls, 3);
  await assert.rejects(session.request({ id: "fail" }, "live"));
  await assert.rejects(session.request({ id: "fail" }, "live"));
  assert.equal(calls, 4);
  await assert.rejects(session.request({ id: "fail" }, "live", 1));
  assert.equal(calls, 5);
});

test("normal replies after impact complete a short run without waiting-track extensions", () => {
  const train = new RailwayJourney(3);
  train.lock(0, "switch");
  train.start();
  let seconds = 0;
  while (!train.arrived && seconds < 60) {
    const index = train.physicalIndex;
    const route = train.routes[index];
    // Impact + consequence + next question + 0.8s reply + point movement.
    if (
      !train.station &&
      index < 2 &&
      train.distance >=
        route.impactDistance + CRUISE_SPEED * (0.55 + 1.7 + 0.8 + 1.3)
    ) {
      train.lock(index + 1, index === 0 ? "stay" : "switch");
    }
    const frame = train.step(0.02);
    assert.equal(
      frame.extension,
      null,
      "a fast reply must not lengthen the journey",
    );
    seconds += 0.02;
  }
  assert.equal(train.arrived, true);
  assert.ok(seconds < 46, `journey took ${seconds.toFixed(1)}s`);
});
