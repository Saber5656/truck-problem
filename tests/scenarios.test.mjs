import assert from "node:assert/strict";
import test from "node:test";
import { SCENARIOS, decisionOutcome } from "../src/scenarios.mjs";
import { requestDecision } from "../src/game-api.mjs";
import { decisionQuestion } from "../server/decision.mjs";

test("choosing either group hits that group and saves the opposite group", () => {
  for (const scenario of SCENARIOS) {
    const left = decisionOutcome(scenario, "left");
    assert.equal(left.saved, scenario.right);
    assert.equal(left.sacrificed, scenario.left);
    assert.equal(left.route, "stay");
    const right = decisionOutcome(scenario, "right");
    assert.equal(right.saved, scenario.left);
    assert.equal(right.sacrificed, scenario.right);
    assert.equal(right.route, "switch");
  }
  assert.throws(() => decisionOutcome(SCENARIOS[0], "stay"));
});
test("demo and API use identical real dilemma text; API explicitly chooses whom to hit", async () => {
  for (const scenario of SCENARIOS) {
    const payload = decisionQuestion(scenario);
    assert.equal(payload.state.title, scenario.title);
    assert.equal(payload.state.description, scenario.description);
    for (const choice of ["left", "right"]) {
      const outcome = decisionOutcome(scenario, choice);
      assert.ok(
        payload.questions.hit.criteria[choice].includes(
          outcome.saved.label + "を助ける",
        ),
      );
      assert.ok(
        payload.questions.hit.criteria[choice].includes(
          outcome.sacrificed.label + "を犠牲にする",
        ),
      );
      assert.doesNotMatch(scenario[choice].label, /このまま|切り替|進路/);
    }
    const demo = await requestDecision(scenario, "demo", () =>
      assert.fail("demo must not call API"),
    );
    assert.ok(["left", "right"].includes(demo.choice));
  }
});
