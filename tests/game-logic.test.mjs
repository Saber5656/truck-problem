import assert from "node:assert/strict";
import test from "node:test";
import {
  createRunState,
  beginRound,
  receiveDecision,
  failRound,
  finishMotion,
  advanceRound,
} from "../src/game-logic.mjs";

const answer = {
  choice: "switch",
  probabilities: { stay: 8, switch: 92 },
  confidence: 60,
  source: "demo",
};

test("Play starts Jev without requiring a player choice, then moves before recording arrival", () => {
  const initial = createRunState();
  assert.equal(initial.phase, "ready");
  const judging = beginRound(initial);
  assert.equal(judging.phase, "judging");
  const moving = receiveDecision(judging, answer);
  assert.equal(moving.phase, "moving");
  assert.equal(moving.answer.choice, "switch");
  assert.equal(moving.history.length, 0);
  const arrived = finishMotion(moving);
  assert.equal(arrived.phase, "arrived");
  assert.deepEqual(arrived.history, [{ roundIndex: 0, answer }]);
});

test("double Play, duplicate responses and duplicate arrival never repeat a round", () => {
  const judging = beginRound(createRunState());
  assert.equal(beginRound(judging), judging);
  const moving = receiveDecision(judging, answer);
  assert.equal(receiveDecision(moving, answer), moving);
  assert.equal(beginRound(moving), moving);
  const arrived = finishMotion(moving);
  assert.equal(finishMotion(arrived), arrived);
  assert.equal(beginRound(arrived), arrived);
});

test("next round is unavailable until the trolley arrives; advancing requires another explicit Play", () => {
  for (const state of [
    createRunState(),
    beginRound(createRunState()),
    receiveDecision(beginRound(createRunState()), answer),
  ]) {
    assert.equal(advanceRound(state, 3), state);
  }
  const next = advanceRound(
    finishMotion(receiveDecision(beginRound(createRunState()), answer)),
    3,
  );
  assert.equal(next.roundIndex, 1);
  assert.equal(next.phase, "ready");
  assert.equal(next.answer, null);
});

test("failure restores a retryable ready state without movement, fabricated answer or history", () => {
  const initial = createRunState();
  const failed = failRound(beginRound(initial));
  assert.deepEqual(failed, initial);
  assert.equal(receiveDecision(initial, answer), initial);
  assert.equal(finishMotion(initial), initial);
});

test("three arrivals finish the run once; replay clears every decision", () => {
  let state = createRunState();
  for (let round = 0; round < 3; round++) {
    state = finishMotion(
      receiveDecision(beginRound(state), {
        ...answer,
        choice: round === 1 ? "stay" : "switch",
      }),
    );
    state = advanceRound(state, 3);
  }
  assert.equal(state.gameFinished, true);
  assert.equal(state.history.length, 3);
  assert.deepEqual(
    state.history.map((entry) => entry.answer.choice),
    ["switch", "stay", "switch"],
  );
  assert.equal(beginRound(state), state);
  assert.equal(advanceRound(state, 3), state);
  assert.deepEqual(createRunState().history, []);
});
