import assert from "node:assert/strict";
import test from "node:test";
import {
  createRunState,
  beginRound,
  receiveDecision,
  failRound,
  finishSwitch,
  finishMotion,
  finishImpact,
  advanceRound,
  arriveAtStation,
} from "../src/game-logic.mjs";

const answer = {
  choice: "right",
  probabilities: { left: 8, right: 92 },
  confidence: 60,
  source: "demo",
};

test("Play starts Jev without requiring a player choice, then moves before recording arrival", () => {
  const initial = createRunState();
  assert.equal(initial.phase, "ready");
  const judging = beginRound(initial);
  assert.equal(judging.phase, "judging");
  const switching = receiveDecision(judging, answer);
  assert.equal(switching.phase, "switching");
  assert.equal(finishMotion(switching), switching);
  const moving = finishSwitch(switching);
  assert.equal(moving.phase, "moving");
  assert.equal(moving.answer.choice, "right");
  assert.equal(moving.history.length, 0);
  const impact = finishMotion(moving);
  assert.equal(impact.phase, "impact");
  assert.equal(impact.history.length, 0);
  assert.equal(advanceRound(impact, 3), impact);
  const arrived = finishImpact(impact);
  assert.equal(arrived.phase, "departing");
  assert.deepEqual(arrived.history, [{ roundIndex: 0, answer }]);
});

test("double Play, duplicate responses and duplicate arrival never repeat a round", () => {
  const judging = beginRound(createRunState());
  assert.equal(beginRound(judging), judging);
  const switching = receiveDecision(judging, answer);
  assert.equal(switching.phase, "switching");
  assert.equal(finishMotion(switching), switching);
  const moving = finishSwitch(switching);
  assert.equal(receiveDecision(moving, answer), moving);
  assert.equal(beginRound(moving), moving);
  const impact = finishMotion(moving);
  assert.equal(impact.phase, "impact");
  assert.equal(impact.history.length, 0);
  assert.equal(advanceRound(impact, 3), impact);
  const arrived = finishImpact(impact);
  assert.equal(finishMotion(arrived), arrived);
  assert.equal(beginRound(arrived), arrived);
});

test("next round is unavailable until the trolley arrives; advancing automatically judges the next question", () => {
  for (const state of [
    createRunState(),
    beginRound(createRunState()),
    receiveDecision(beginRound(createRunState()), answer),
  ]) {
    assert.equal(advanceRound(state, 3), state);
  }
  const next = advanceRound(
    finishImpact(
      finishMotion(
        finishSwitch(receiveDecision(beginRound(createRunState()), answer)),
      ),
    ),
    3,
  );
  assert.equal(next.roundIndex, 1);
  assert.equal(next.phase, "judging");
  assert.equal(next.answer, null);
});

test("failure enters an explicit retryable error without a fabricated answer or new history", () => {
  const initial = createRunState();
  const failed = failRound(beginRound(initial));
  assert.equal(failed.phase, "error");
  assert.equal(beginRound(failed).phase, "judging");
  assert.equal(receiveDecision(initial, answer), initial);
  assert.equal(finishMotion(initial), initial);
});

test("the final station arrival automatically shows results once; replay clears every decision", () => {
  let state = createRunState();
  for (let round = 0; round < 3; round++) {
    state = finishImpact(
      finishMotion(
        finishSwitch(
          receiveDecision(round === 0 ? beginRound(state) : state, {
            ...answer,
            choice: round === 1 ? "left" : "right",
          }),
        ),
      ),
    );
    state = advanceRound(state, 3);
  }
  assert.equal(state.gameFinished, false);
  assert.equal(state.phase, "station");
  state = arriveAtStation(state);
  assert.equal(state.phase, "arrived");
  assert.equal(state.gameFinished, true);
  assert.equal(state.history.length, 3);
  assert.deepEqual(
    state.history.map((entry) => entry.answer.choice),
    ["right", "left", "right"],
  );
  assert.equal(beginRound(state), state);
  assert.equal(advanceRound(state, 3), state);
  assert.deepEqual(createRunState().history, []);
});

test("impact is a separate non-repeatable transition; no next or play during it", () => {
  const moving = finishSwitch(
    receiveDecision(beginRound(createRunState()), answer),
  );
  assert.equal(finishImpact(moving), moving);
  const impact = finishMotion(moving);
  assert.equal(beginRound(impact), impact);
  assert.equal(finishMotion(impact), impact);
  assert.equal(advanceRound(impact, 3), impact);
  const arrived = finishImpact(impact);
  assert.equal(finishImpact(arrived), arrived);
});

test("point lock is required before motion and may complete only once", () => {
  const ready = createRunState();
  assert.equal(finishSwitch(ready), ready);
  const switching = receiveDecision(beginRound(ready), answer);
  assert.equal(beginRound(switching), switching);
  assert.equal(advanceRound(switching, 3), switching);
  const moving = finishSwitch(switching);
  assert.equal(finishSwitch(moving), moving);
});

test("station arrival cannot skip unanswered questions or consume another decision", () => {
  const ready = createRunState();
  assert.equal(arriveAtStation(ready), ready);
  const station = { ...ready, phase: "station", roundIndex: 2 };
  assert.equal(beginRound(station), station);
  const arrived = arriveAtStation(station);
  assert.equal(beginRound(arrived), arrived);
  assert.equal(arriveAtStation(arrived), arrived);
  assert.equal(arrived.gameFinished, true);
});
