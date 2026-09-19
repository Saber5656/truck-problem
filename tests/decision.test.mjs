import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { createDecisionMiddleware } from "../server/decision.mjs";

const SECRET = "test-only-not-a-real-key";
const result = {
  model: "jev-test",
  answers: {
    save: {
      type: "choice",
      choice: "right",
      probabilities: { left: 0.08, right: 0.92 },
      confidence: 0.596,
    },
  },
};
function invoke(
  handler,
  {
    path = "/api/decision",
    method = "POST",
    body = { scenarioId: "social-worth" },
    headers = {},
  } = {},
) {
  const req = Readable.from([
    typeof body === "string" ? body : JSON.stringify(body),
  ]);
  Object.assign(req, {
    url: path,
    method,
    headers: {
      host: "127.0.0.1:5173",
      origin: "http://127.0.0.1:5173",
      "content-type": "application/json",
      ...headers,
    },
  });
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end(data) {
        resolve({
          status: this.statusCode,
          body: JSON.parse(data),
          headers: this.headers,
        });
      },
    };
    Promise.resolve(handler(req, res, () => resolve({ next: true }))).catch(
      reject,
    );
  });
}

test("status reveals only whether a key is configured; no upstream call", async () => {
  const handler = createDecisionMiddleware({
    apiKey: SECRET,
    fetchImpl: () => assert.fail("no API call expected"),
  });
  const response = await invoke(handler, {
    path: "/api/status",
    method: "GET",
  });
  assert.deepEqual(response.body, { configured: true });
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("a missing key produces an explicit setup error, not a fake AI answer", async () => {
  const response = await invoke(
    createDecisionMiddleware({
      apiKey: "",
      fetchImpl: () => assert.fail("must not call API"),
    }),
  );
  assert.equal(response.status, 503);
  assert.equal(response.body.code, "KEY_NOT_CONFIGURED");
});

test("only the official endpoint receives the key and the fixed scenario", async () => {
  let calls = 0;
  const handler = createDecisionMiddleware({
    apiKey: SECRET,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "https://api.typesafe.ai/v1/systemone");
      assert.equal(options.headers.Authorization, `Bearer ${SECRET}`);
      assert.equal(options.redirect, "error");
      const payload = JSON.parse(options.body);
      assert.equal(payload.model, "jev-latest");
      assert.equal(payload.questions.save.type, "choice");
      assert.deepEqual(Object.keys(payload.questions.save.criteria), [
        "left",
        "right",
      ]);
      assert.ok(payload.state.description.includes("5名"));
      assert.ok(!("jev" in payload.state));
      assert.ok(!("poll" in payload.state));
      return { ok: true, json: async () => ({ ...result, secret: SECRET }) };
    },
  });
  const response = await invoke(handler);
  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.equal(response.body.choice, "right");
  assert.deepEqual(response.body.probabilities, { left: 8, right: 92 });
  assert.equal(response.body.confidence, 60);
  assert.doesNotMatch(JSON.stringify(response), new RegExp(SECRET));
});

test("rejects cross-origin, invalid scenarios, malformed JSON and oversized input before API usage", async () => {
  const handler = createDecisionMiddleware({
    apiKey: SECRET,
    fetchImpl: () => assert.fail("must not call API"),
  });
  for (const [options, status] of [
    [{ headers: { origin: "https://evil.example" } }, 403],
    [{ headers: { origin: undefined } }, 403],
    [{ headers: { host: "evil.example", origin: "http://evil.example" } }, 403],
    [{ headers: { "content-type": "text/plain" } }, 415],
    [{ body: { scenarioId: "untrusted", apiKey: SECRET } }, 400],
    [{ body: "{" }, 400],
    [{ body: " ".repeat(1025) }, 413],
  ])
    assert.equal((await invoke(handler, options)).status, status);
});

test("errors are sanitized and do not trigger automatic retries", async () => {
  for (const status of [401, 402, 429, 500]) {
    let calls = 0;
    const response = await invoke(
      createDecisionMiddleware({
        apiKey: SECRET,
        fetchImpl: async () => {
          calls++;
          return { ok: false, status, text: async () => SECRET };
        },
      }),
    );
    assert.equal(calls, 1);
    assert.notEqual(response.status, 200);
    assert.doesNotMatch(JSON.stringify(response), new RegExp(SECRET));
  }
  const response = await invoke(
    createDecisionMiddleware({
      apiKey: SECRET,
      fetchImpl: async () => {
        throw new Error(SECRET);
      },
    }),
  );
  assert.equal(response.status, 502);
  assert.doesNotMatch(JSON.stringify(response), new RegExp(SECRET));
});

test("invalid model responses are rejected", async () => {
  for (const answer of [
    {},
    { ...result.answers.save, choice: "fly" },
    { ...result.answers.save, probabilities: { left: 8, right: 92 } },
    { ...result.answers.save, confidence: -1 },
    { ...result.answers.save, probabilities: { left: 0.8, right: 0.2 } },
  ]) {
    const response = await invoke(
      createDecisionMiddleware({
        apiKey: SECRET,
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ answers: { save: answer } }),
        }),
      }),
    );
    assert.equal(response.status, 502);
  }
});

test("display probabilities still total 100 at a rounding boundary", async () => {
  const answer = {
    ...result.answers.save,
    probabilities: { left: 0.495, right: 0.505 },
  };
  const response = await invoke(
    createDecisionMiddleware({
      apiKey: SECRET,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ answers: { save: answer } }),
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(
    response.body.probabilities.left + response.body.probabilities.right,
    100,
  );
});

test("unrelated routes pass through and wrong methods cannot spend credits", async () => {
  const handler = createDecisionMiddleware({
    apiKey: SECRET,
    fetchImpl: () => assert.fail("must not call API"),
  });
  assert.deepEqual(await invoke(handler, { path: "/assets/fox.png" }), {
    next: true,
  });
  assert.equal((await invoke(handler, { method: "GET" })).status, 405);
});
