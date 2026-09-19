const messages = {
  KEY_NOT_CONFIGURED:
    ".env.local に TYPESAFE_API_KEY を設定し、ゲームのサーバーを再起動してください。",
  INVALID_KEY:
    "APIキーを認証できません。TypeSafeの管理画面と設定ファイルを確認してください。",
  ACCESS_DENIED:
    "このAPIキーでのアクセスが拒否されました。TypeSafeの利用権限を確認してください。",
  CREDIT_REQUIRED:
    "TypeSafeの残高が不足しています。管理画面で残高を確認してください。",
  RATE_LIMITED:
    "TypeSafeの利用制限に達しました。少し時間をおいてから再試行してください。",
  REQUEST_IN_PROGRESS: "別の判定を処理中です。完了後に再試行してください。",
  TIMEOUT: "Jevの応答が時間内に返りませんでした。自動再送はしていません。",
};

export async function requestDecision(
  scenario,
  mode,
  fetchImpl = globalThis.fetch,
) {
  if (mode === "demo") return { ...scenario.jev, source: "demo" };
  let response;
  let result;
  try {
    response = await fetchImpl("/api/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId: scenario.id }),
      signal: AbortSignal.timeout(20000),
    });
    result = await response.json();
  } catch {
    throw new Error(
      "判定サーバーに接続できません。ゲームのサーバーの起動を確認してください。自動再送はしていません。",
    );
  }
  if (!response.ok)
    throw new Error(
      messages[result?.code] || "判定に失敗しました。自動再送はしていません。",
    );
  if (
    result?.source !== "typesafe" ||
    !["left", "right"].includes(result.choice) ||
    !Number.isFinite(result.probabilities?.left) ||
    !Number.isFinite(result.probabilities?.right) ||
    !Number.isFinite(result.confidence)
  )
    throw new Error("判定結果の形式を確認できませんでした。");
  return result;
}

// The explicit Play authorizes this session; rendering the same question twice
// cannot charge twice. Failed requests are cached until a manual retry attempt.
export function createDecisionSession(request = requestDecision) {
  const requests = new Map();
  return {
    request(scenario, mode, attempt = 0) {
      const key = `${scenario.id}:${mode}:${attempt}`;
      if (!requests.has(key))
        requests.set(
          key,
          Promise.resolve().then(() => request(scenario, mode)),
        );
      return requests.get(key);
    },
  };
}
