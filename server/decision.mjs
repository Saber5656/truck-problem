import { SCENARIOS, decisionOutcome } from "../src/scenarios.mjs";

const hosts = new Set(["127.0.0.1:5173", "localhost:5173"]);
const unit = (v) => Number.isFinite(v) && v >= 0 && v <= 1;

function normalizeAnswer(data) {
  const answer = data?.answers?.save;
  const p = answer?.probabilities;
  if (
    answer?.type !== "choice" ||
    !["left", "right"].includes(answer.choice) ||
    !p ||
    Object.keys(p).length !== 2 ||
    !unit(p.left) ||
    !unit(p.right) ||
    Math.abs(p.left + p.right - 1) > 0.0001 ||
    !unit(answer.confidence) ||
    p[answer.choice] < Math.max(p.left, p.right)
  )
    throw new Error("Invalid answer");
  const leftPercent = Math.round(p.left * 100);
  return {
    choice: answer.choice,
    probabilities: { left: leftPercent, right: 100 - leftPercent },
    confidence: Math.round(answer.confidence * 100),
    source: "typesafe",
  };
}

export function decisionQuestion(scenario) {
  const criteria = Object.fromEntries(
    ["left", "right"].map((choice) => {
      const { saved, sacrificed } = decisionOutcome(scenario, choice);
      return [
        choice,
        `${saved.label}を助ける。${sacrificed.label}が犠牲になる。`,
      ];
    }),
  );
  return {
    model: "jev-latest",
    state: { title: scenario.title, description: scenario.description },
    questions: {
      save: {
        type: "choice",
        instructions:
          "This is a fictional trolley dilemma. Choose the group to SAVE, not the group to hit and not a travel direction. The other group dies. Use only the stated facts. There is no predetermined correct answer.",
        criteria,
      },
    },
  };
}

// Local development only. The key never enters Vite's client environment.
export function createDecisionMiddleware({
  apiKey = "",
  fetchImpl = globalThis.fetch,
} = {}) {
  let inFlight = false;
  return async (req, res, next) => {
    const path = req.url?.split("?")[0];
    if (path !== "/api/status" && path !== "/api/decision") return next();
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(body));
    };
    if (!hosts.has(req.headers.host)) return send(403, { code: "LOCAL_ONLY" });
    if (path === "/api/status") {
      return req.method === "GET"
        ? send(200, { configured: Boolean(apiKey.trim()) })
        : send(405, { code: "METHOD_NOT_ALLOWED" });
    }
    if (req.method !== "POST") return send(405, { code: "METHOD_NOT_ALLOWED" });
    if (req.headers.origin !== `http://${req.headers.host}`)
      return send(403, { code: "ORIGIN_NOT_ALLOWED" });
    if (
      req.headers["content-type"]?.split(";")[0].trim() !== "application/json"
    )
      return send(415, { code: "JSON_REQUIRED" });
    let body;
    try {
      let text = "";
      for await (const chunk of req) {
        text += chunk;
        if (Buffer.byteLength(text) > 1024)
          return send(413, { code: "BODY_TOO_LARGE" });
      }
      body = JSON.parse(text);
    } catch {
      return send(400, { code: "INVALID_REQUEST" });
    }
    const scenario = SCENARIOS.find((item) => item.id === body?.scenarioId);
    if (!scenario || Object.keys(body).some((key) => key !== "scenarioId"))
      return send(400, { code: "INVALID_SCENARIO" });
    if (!apiKey.trim()) return send(503, { code: "KEY_NOT_CONFIGURED" });
    if (inFlight) return send(429, { code: "REQUEST_IN_PROGRESS" });
    inFlight = true;
    try {
      const response = await fetchImpl("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify(decisionQuestion(scenario)),
      });
      if (!response.ok) {
        const code =
          {
            401: "INVALID_KEY",
            403: "ACCESS_DENIED",
            402: "CREDIT_REQUIRED",
            429: "RATE_LIMITED",
          }[response.status] || "UPSTREAM_ERROR";
        return send(502, { code });
      }
      return send(200, normalizeAnswer(await response.json()));
    } catch (error) {
      return send(502, {
        code: error?.name === "TimeoutError" ? "TIMEOUT" : "UPSTREAM_ERROR",
      });
    } finally {
      inFlight = false;
    }
  };
}
