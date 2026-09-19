import assert from "node:assert/strict";
import test from "node:test";
import { requestDecision } from "../src/game-api.mjs";
import { SCENARIOS } from "../src/scenarios.mjs";

test("demo mode never calls the API and labels its result", async () => {
  const result = await requestDecision(SCENARIOS[0], "demo", () =>
    assert.fail("no network in demo"),
  );
  assert.equal(result.source, "demo");
  assert.equal(result.choice, "left");
});

test("live mode submits only the scenario id to the local server", async () => {
  const answer = {
    source: "typesafe",
    choice: "left",
    probabilities: { left: 70, right: 30 },
    confidence: 12,
  };
  const result = await requestDecision(
    SCENARIOS[0],
    "live",
    async (url, options) => {
      assert.equal(url, "/api/decision");
      assert.deepEqual(JSON.parse(options.body), {
        scenarioId: "social-worth",
      });
      assert.equal(options.headers["Content-Type"], "application/json");
      return { ok: true, json: async () => answer };
    },
  );
  assert.deepEqual(result, answer);
});

test("failed live calls show an error and never fall back to a fake result", async () => {
  await assert.rejects(
    requestDecision(SCENARIOS[0], "live", async () => ({
      ok: false,
      json: async () => ({ code: "KEY_NOT_CONFIGURED" }),
    })),
    /\.env\.local/,
  );
  await assert.rejects(
    requestDecision(SCENARIOS[0], "live", async () => ({
      ok: false,
      json: async () => ({ code: "CREDIT_REQUIRED" }),
    })),
    /残高/,
  );
  await assert.rejects(
    requestDecision(SCENARIOS[0], "live", async () => {
      throw new Error("sensitive details");
    }),
    /接続できません/,
  );
  await assert.rejects(
    requestDecision(SCENARIOS[0], "live", async () => ({
      ok: true,
      json: async () => ({}),
    })),
    /形式/,
  );
});
