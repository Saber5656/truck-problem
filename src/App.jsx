import { useEffect, useRef, useState } from "react";
import RailwayScene from "./RailwayScene.jsx";
import { SCENARIOS, decisionOutcome } from "./scenarios.mjs";
import { createDecisionSession } from "./game-api.mjs";
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
  finishRun,
} from "./game-logic.mjs";

function PercentBar({ value, tone = "cyan" }) {
  return (
    <div className="percent-bar" aria-hidden="true">
      <span
        className={`percent-bar__fill percent-bar__fill--${tone}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function GroupCard({ option, tone, chosen }) {
  return (
    <div
      className={`choice-button choice-button--${tone} ${chosen ? "is-selected" : ""}`}
    >
      <span className="choice-button__eyebrow">
        {chosen ? "JEV'S CHOICE / 犠牲にする相手" : option.caption}
      </span>
      <span className="choice-button__label">{option.label}</span>
      <span className="choice-button__detail">{option.detail}</span>
    </div>
  );
}

function ScoreRow({ label, values, keyName, tone }) {
  return (
    <div className="score-row">
      <div className="score-row__meta">
        <span>{label}</span>
        <strong>{values[keyName]}%</strong>
      </div>
      <PercentBar value={values[keyName]} tone={tone} />
    </div>
  );
}

function App({ decisionProvider } = {}) {
  const [run, setRun] = useState(createRunState);
  const { roundIndex, phase, answer, history, gameFinished } = run;
  const [showHow, setShowHow] = useState(false);
  const [mode, setMode] = useState("demo");
  const [configured, setConfigured] = useState(null);
  const [error, setError] = useState("");
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const decisions = useRef(createDecisionSession(decisionProvider));
  const [attempt, setAttempt] = useState(0);
  const questionRef = useRef(null);
  const sceneRef = useRef(null);
  const previousScreen = useRef(`${roundIndex}:${gameFinished}`);
  const scenario = SCENARIOS[roundIndex];
  const busy = [
    "judging",
    "switching",
    "moving",
    "impact",
    "departing",
    "station",
  ].includes(phase);
  const outcome = answer && decisionOutcome(scenario, answer.choice);
  const consequence =
    outcome &&
    `${outcome.sacrificed.label}が犠牲になり、${outcome.saved.label}が助かりました`;
  const jevChoiceLabel = outcome?.sacrificed.label;
  const atStation = phase === "station" || phase === "arrived";

  useEffect(() => {
    const screen = `${roundIndex}:${gameFinished}`;
    if (previousScreen.current !== screen) {
      questionRef.current?.focus({ preventScroll: true });
      if (gameFinished || roundIndex === 0) window.scrollTo(0, 0);
      else
        questionRef.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      previousScreen.current = screen;
    }
  }, [roundIndex, gameFinished]);

  useEffect(() => {
    let active = true;
    fetch("/api/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((status) => {
        if (active) setConfigured(status.configured === true);
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== "judging") return;
    const session = decisions.current;
    session.request(scenario, mode, attempt).then(
      (result) => {
        if (decisions.current === session)
          setRun((current) => receiveDecision(current, result));
      },
      (failure) => {
        if (decisions.current !== session) return;
        setError(failure.message);
        setRun(failRound);
      },
    );
  }, [phase, scenario, mode, attempt]);

  const play = () => {
    if (!["ready", "error"].includes(phase) || !sceneReady || sceneError)
      return;
    if (phase === "error") setAttempt((value) => value + 1);
    setError("");
    setRun(beginRound);
    sceneRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  };

  const sceneEvent = (event) => {
    const transitions = {
      switch: finishSwitch,
      impact: finishMotion,
      consequence: finishImpact,
      arrived: arriveAtStation,
    };
    if (event === "next")
      setRun((current) => advanceRound(current, SCENARIOS.length));
    else if (transitions[event]) setRun(transitions[event]);
  };

  const restart = () => {
    decisions.current = createDecisionSession(decisionProvider);
    setAttempt(0);
    setRun(createRunState());
    setSceneReady(false);
    setSceneError("");
    setMode("demo");
    setShowHow(false);
    setError("");
  };

  if (gameFinished) {
    return (
      <main className="game-shell game-shell--result">
        <div className="result-screen">
          <div className="brand-lockup brand-lockup--result">
            <span className="brand-lockup__name">JEV</span>
            <span className="brand-lockup__tagline">MORAL RAILWAY LIVE</span>
          </div>
          <p className="eyebrow eyebrow--cyan">
            {mode === "demo" ? "DEMO / 架空の判定" : "TYPESAFE / APIの判定"} · 3
            / 3
          </p>
          <h1 ref={questionRef} tabIndex={-1}>
            Jevが犠牲にした人。
            <br />
            助かった人。
          </h1>
          <ol className="decision-history">
            {history.map(({ roundIndex: index, answer: decision }) => (
              <li key={SCENARIOS[index].id}>
                <span className="mini-label">
                  問 {index + 1} · {SCENARIOS[index].title}
                </span>
                <strong
                  className={`decision-history__choice decision-history__choice--${decision.choice}`}
                >
                  {decision.choice === "left"
                    ? SCENARIOS[index].left.label
                    : SCENARIOS[index].right.label}
                </strong>
                <span>
                  助けた相手：
                  {
                    decisionOutcome(SCENARIOS[index], decision.choice).saved
                      .label
                  }
                  <br />
                  犠牲になった相手：
                  {
                    decisionOutcome(SCENARIOS[index], decision.choice)
                      .sacrificed.label
                  }
                  <br />
                  犠牲にする選択の確率 {decision.probabilities[decision.choice]}
                  % · 確信度 {decision.confidence}%
                </span>
              </li>
            ))}
          </ol>
          <p className="result-copy">
            {mode === "demo" && (
              <>
                今回は架空の固定値によるデモです。
                <br />
              </>
            )}
            確率・確信度は倫理的な正解率ではありません。
          </p>
          <button className="primary-button" type="button" onClick={restart}>
            もう一度プレイする
          </button>
        </div>
      </main>
    );
  }

  const status =
    sceneError ||
    (!sceneReady
      ? "運転席を準備しています…"
      : phase === "judging"
        ? "Jevが犠牲にする相手を判断しています…"
        : phase === "switching"
          ? `${jevChoiceLabel}を犠牲にする — 分岐器を合わせています`
          : phase === "moving"
            ? `${jevChoiceLabel}がいる線路へ走行中`
            : phase === "impact"
              ? consequence
              : phase === "departing"
                ? `${consequence}。${roundIndex < 2 ? "次の分岐へ進んでいます" : "終点駅へ向かいます"}`
                : phase === "station"
                  ? "3つの問いを終え、終点駅へ向かっています"
                  : phase === "arrived"
                    ? "終点に到着しました。3つの判断を振り返れます"
                    : phase === "error"
                      ? history.length
                        ? "通信エラー。直線を走行しながら再試行を待っています"
                        : "判定できませんでした。再試行できます"
                      : "プレイ1回で、Jevが3問を判断して終点まで走ります");

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-lockup__name">JEV</span>
          <span className="brand-lockup__tagline">MORAL RAILWAY LIVE</span>
        </div>
        <div className="topbar__middle">
          <span className="live-dot" />
          <span>トロッコ問題・思考実験</span>
        </div>
        <div className="topbar__status">
          <span>
            {mode === "demo"
              ? "DEMO MODE"
              : answer
                ? "API RESPONSE"
                : "API MODE"}
          </span>
          <span className="topbar__round">
            {String(roundIndex + 1).padStart(2, "0")} / 03
          </span>
        </div>
      </header>

      <section className="game-layout" aria-label="Jevトロッコ問題ゲーム">
        <div className="play-field">
          <div className="stage-visual stage-visual--playback">
            <div className="stage-visual__topline">
              <span className="stage-chip">
                {atStation ? "終点 / TERMINUS" : scenario.kicker}
              </span>
              <span className="stage-slogan">Jevが選ぶ。未来が動く。</span>
            </div>
            <div className="question-block">
              <p className="eyebrow eyebrow--cyan">
                {atStation
                  ? "END OF THE LINE"
                  : "どちらを犠牲にする？ / WHO WILL JEV SACRIFICE?"}
              </p>
              <h1 ref={questionRef} tabIndex={-1}>
                {atStation
                  ? phase === "arrived"
                    ? "終点に到着しました。"
                    : "終点駅へ。"
                  : scenario.title}
              </h1>
              <p>
                {atStation
                  ? "3つの選択の先に、この駅があります。Jevが助けた人と、犠牲になった人を振り返ります。"
                  : scenario.description}
              </p>
            </div>
            <div className="playback-mode-control">
              <label htmlFor="decision-mode">判定モード</label>
              <select
                id="decision-mode"
                value={mode}
                disabled={busy || history.length > 0}
                onChange={(event) => {
                  setMode(event.target.value);
                  setError("");
                }}
              >
                <option value="demo">デモ（API通信なし）</option>
                <option value="live" disabled={!configured}>
                  TypeSafe API（残高を使用）
                </option>
              </select>
            </div>
            <div className="action-strip playback-controls">
              <div className="action-strip__hint" role="status">
                <span
                  className={`result-dot ${phase === "departing" ? "result-dot--match" : ""}`}
                />
                {status}
              </div>
              <button
                className="primary-button primary-button--compact"
                type="button"
                disabled={
                  busy ||
                  !sceneReady ||
                  !!sceneError ||
                  (mode === "live" && !configured)
                }
                onClick={phase === "arrived" ? () => setRun(finishRun) : play}
              >
                {phase === "arrived"
                  ? "結果を見る"
                  : phase === "judging"
                    ? "判定中…"
                    : phase === "switching"
                      ? "進路を設定中…"
                      : busy
                        ? "運行中…"
                        : error
                          ? "もう一度判定する"
                          : "ゲームをプレイ"}
              </button>
              <span className="playback-mode-note">
                {mode === "demo"
                  ? "デモ：3問を自動判定 / 架空の固定値・API通信なし"
                  : error || attempt > 0
                    ? "実API：3問を自動判定・再試行分は追加で残高を使用"
                    : "実API：開始すると3問を自動判定（最大3回・残高を使用）"}
              </span>
            </div>
            {error && (
              <p className="api-error" role="alert">
                {error}
              </p>
            )}
            <div
              className={`railway-scene driver-scene driver-scene--${phase}`}
              ref={sceneRef}
              data-phase={phase}
              data-route={outcome?.route || "pending"}
              role="group"
              aria-label="Jevの運転席から見た線路"
            >
              <RailwayScene
                run={run}
                onEvent={sceneEvent}
                onReady={() => setSceneReady(true)}
                onError={(message) => {
                  setSceneError(message);
                  setSceneReady(false);
                }}
              />
              <span className="points-indicator" aria-live="polite">
                {atStation
                  ? phase === "arrived"
                    ? "終点 · 停車中"
                    : "終点駅へ · 減速中"
                  : phase === "switching"
                    ? "分岐器 · 切り替え中"
                    : answer
                      ? `進路固定 · ${outcome.route === "stay" ? "直進" : "支線"}`
                      : "分岐器 · 待機"}
              </span>
              <div
                className={`route-sign route-sign--left ${answer?.choice === "left" ? "route-sign--chosen" : ""}`}
              >
                <span>
                  {answer?.choice === "left"
                    ? "犠牲にする相手"
                    : "左側の人たち"}
                </span>
                <strong>{scenario.left.label}</strong>
              </div>
              <div
                className={`route-sign route-sign--right ${answer?.choice === "right" ? "route-sign--chosen" : ""}`}
              >
                <span>
                  {answer?.choice === "right"
                    ? "犠牲にする相手"
                    : "右側の人たち"}
                </span>
                <strong>{scenario.right.label}</strong>
              </div>
              <img
                className="cockpit-overlay"
                src="/assets/jev-cockpit-overlay.png"
                alt="Jevの手と運転席の操作盤"
              />
              <span className="driver-view-label">JEV'S VIEW / 運転席</span>
              <div className="impact-curtain" aria-hidden="true" />
              {["impact", "departing"].includes(phase) && (
                <div className="consequence-card">
                  <span>
                    この選択の結果 ·{" "}
                    {roundIndex < 2 ? "次の分岐へ" : "終点駅へ"}
                  </span>
                  <strong>{consequence}</strong>
                </div>
              )}
            </div>
            {!atStation && (
              <div
                className="choice-dock"
                aria-label="Jevが犠牲にする相手の2択"
              >
                <GroupCard
                  option={scenario.left}
                  tone="cyan"
                  chosen={answer?.choice === "left"}
                />
                <div className="choice-dock__divider" aria-hidden="true" />
                <GroupCard
                  option={scenario.right}
                  tone="red"
                  chosen={answer?.choice === "right"}
                />
              </div>
            )}
            <p className="stage-note">
              架空の思考実験です。選んだ側の人たちが犠牲になります。問の間は走り続け、終点駅で停車します。
            </p>
          </div>
        </div>

        <aside className="intel-panel" aria-label="Jevの判断パネル">
          <div className="intel-panel__header">
            <div>
              <span className="eyebrow eyebrow--red">
                {mode === "demo"
                  ? "DEMO / サンプル"
                  : answer
                    ? "API応答受信済み"
                    : "API / 未判定"}
              </span>
              <h2>運転手Jevの判断</h2>
            </div>
            <span className="signal-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="mascot-frame">
            <img src="/assets/jev-fox-mascot.png" alt="Jev、キツネの運転手" />
            <div className="mascot-frame__bubble">
              DRIVER
              <br />
              JEV
            </div>
          </div>
          <div className="intel-panel__copy">
            <span className="mini-label">JEV / STRUCTURED DECISION</span>
            <p>
              {mode === "demo"
                ? "質問は実APIモードと共通です。デモの判定・数値・投票は架空です。"
                : "Jevは犠牲にする相手を選び、その人たちがいる線路へ進みます。返された確率・確信度も表示します。"}
            </p>
          </div>
          <div className="connection-controls">
            <p>
              {configured === null
                ? "キー設定を確認中…"
                : configured
                  ? "キー設定あり（認証・残高は未確認）"
                  : "APIキー未設定・デモで遊べます"}
            </p>
            <details>
              <summary>API設定と送信内容</summary>
              <p>
                .env.local の TYPESAFE_API_KEY
                にキーを保存し、開発サーバーを再起動してください。
              </p>
              <p>
                送信するのは問題文と選択肢だけです。プレイ1回で最大3問を順に判定します。通信エラーの自動再送はせず、再試行を押した場合だけ追加で送信します。モードは1ゲーム中固定です。
              </p>
            </details>
          </div>
          <div
            className="jev-judgement"
            aria-label="判定結果"
            aria-live="polite"
          >
            {answer ? (
              <>
                <div className="section-heading">
                  <span>
                    {answer.source === "demo"
                      ? "デモが犠牲にする相手（固定値）"
                      : "Jevが犠牲にする相手（API応答）"}
                  </span>
                  <span className="confidence-label">
                    確信度 {answer.confidence}%
                  </span>
                </div>
                <div className="jev-choice">
                  <strong>{jevChoiceLabel}</strong>
                  <span>{answer.probabilities[answer.choice]}%</span>
                </div>
                <ScoreRow
                  label={scenario.left.label}
                  values={answer.probabilities}
                  keyName="left"
                  tone="cyan"
                />
                <ScoreRow
                  label={scenario.right.label}
                  values={answer.probabilities}
                  keyName="right"
                  tone="red"
                />
                <p>
                  {answer.source === "demo"
                    ? "動作確認用の架空の値です。Jevには問い合わせていません。"
                    : "TypeSafeから受け取った、犠牲にする相手の選択・確率・確信度です。"}
                </p>
                <p>
                  犠牲にする相手を選ぶ確率です。生存確率や倫理的な正解率ではありません。
                </p>
              </>
            ) : (
              <p>
                {busy
                  ? "Jevの判断を待っています…"
                  : "プレイするとJevの判定を表示し、3問を続けて運行します。"}
              </p>
            )}
          </div>
          <div className="poll-section">
            <div className="section-heading">
              <span>投票の表示サンプル</span>
              <span className="section-heading__count">架空の集計</span>
            </div>
            <ScoreRow
              label={scenario.left.label}
              values={scenario.poll}
              keyName="left"
              tone="cyan"
            />
            <ScoreRow
              label={scenario.right.label}
              values={scenario.poll}
              keyName="right"
              tone="red"
            />
          </div>
          <button
            className="text-button"
            type="button"
            aria-expanded={showHow}
            aria-controls="judgement-explanation"
            onClick={() => setShowHow((current) => !current)}
          >
            {showHow ? "判定の説明を閉じる" : "Jevの判定をどう見る？"}
          </button>
          {showHow && (
            <div className="how-panel" id="judgement-explanation">
              <strong>Jevは「正解」を決めていません。</strong>
              <p>
                確率・確信度は倫理的な正しさの点数ではありません。Jevは説明文を生成しないため、判断理由を推測して表示することもしません。デモの数値と投票サンプルは架空です。
              </p>
            </div>
          )}
        </aside>
      </section>
      <footer className="footer-bar">
        <span>Jevが選ぶ、で世界は動く。</span>
        <span>
          {history.length} / {SCENARIOS.length} 問回答済み
        </span>
        <span>Jevは判断、あなたは意味をつくる。</span>
      </footer>
    </main>
  );
}

export { App };
