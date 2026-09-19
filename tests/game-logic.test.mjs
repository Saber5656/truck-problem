import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceRound,
  createRunState,
  revealChoice,
  selectChoice,
} from "../src/game-logic.mjs";

test("runs a choice through reveal and advances to the next round", () => {
  const initial = createRunState();
  const selected = selectChoice(initial, "switch");
  const revealed = revealChoice(selected, "stay");
  const next = advanceRound(revealed, 3);

  assert.equal(next.roundIndex, 1);
  assert.equal(next.selected, null);
  assert.equal(next.revealed, false);
  assert.deepEqual(revealed.history, [{ selected: "switch", jevChoice: "stay" }]);
});

test("does not reveal or advance without a choice", () => {
  const initial = createRunState();

  assert.deepEqual(revealChoice(initial, "switch"), initial);
  assert.deepEqual(advanceRound(initial, 3), initial);
});

test("marks the final round as finished", () => {
  const finalRound = { ...createRunState(), roundIndex: 2, selected: "stay" };
  const revealed = revealChoice(finalRound, "stay");

  assert.equal(advanceRound(revealed, 3).gameFinished, true);
});

test('each revealed round counts once, even when reveal is requested twice', () => {
  let state = createRunState();
  for (let round = 0; round < 3; round++) {
    state = selectChoice(state, 'stay');
    state = revealChoice(state, 'switch');
    state = revealChoice(state, 'switch');
    assert.equal(state.history.length, round + 1);
    state = advanceRound(state, 3);
  }
  assert.equal(state.gameFinished, true);
});
