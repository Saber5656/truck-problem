import { useEffect, useRef, useState } from "react";
import RailwayScene from "./RailwayScene.jsx";
import StartScreen from "./StartScreen.jsx";
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

function GroupCard({ option, tone, chosen, decided }) {
  return (
    <div
      className={`choice-button choice-button--${tone} ${chosen ? "is-selected" : ""}`}
    >
      {decided && (
        <span className="choice-button__eyebrow">
          {chosen ? "犠牲にする相手" : "助かる相手"}
        </span>
      )}
      <span className="choice-button__label">{option.label}</span>
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
  const isStart = phase === "ready";
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState("demo");
  const [configured, setConfigured] = useState(null);
  const [error, setError] = useState("");
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const decisions = useRef(createDecisionSession(decisionProvider));
  const [attempt, setAttempt] = useState(0);
  const questionRef = useRef(null);
  const sceneRef = useRef(null);
  const previousScreen = useRef(`${roundIndex}:${gameFinished}:${isStart}`);
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
    const screen = `${roundIndex}:${gameFinished}:${isStart}`;
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
  }, [roundIndex, gameFinished, isStart]);

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
    if (phase !== "judging" || !sceneReady || sceneError) return;
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
  }, [phase, scenario, mode, attempt, sceneReady, sceneError]);

  const play = () => {
    if (
      !["ready", "error"].includes(phase) ||
      sceneError ||
      (phase === "error" && !sceneReady)
    )
      return;
    if (phase === "error") setAttempt((value) => value + 1);
    setError("");
    setShowSettings(false);
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
    setShowSettings(false);
    setError("");
  };

  if (gameFinished) {
    return (
      <main className="game-shell game-shell--result">
        <div className="result-screen">
          <div className="brand-lockup brand-lockup--result">
            <span className="brand-lockup__name">JEV</span>
            <span className="brand-lockup__tagline">MORAL RAILWAY</span>
          </div>
          <p className="eyebrow eyebrow--cyan">
            {mode === "demo" ? "DEMO / 架空の判定" : "TYPESAFE / APIの判定"} · 3
            / 3
          </p>
          <h1 ref={questionRef} tabIndex={-1}>
            3つの選択の先に。
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
                  犠牲：
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
                  選択確率 {decision.probabilities[decision.choice]}% · 確信度{" "}
                  {decision.confidence}%
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
      ? "運転席を準備中…"
      : phase === "judging"
        ? "Jevが判断中…"
        : phase === "switching"
          ? "分岐器を切り替え中"
          : phase === "moving"
            ? `${jevChoiceLabel}を犠牲にする`
            : ["impact", "departing"].includes(phase)
              ? roundIndex < SCENARIOS.length - 1
                ? "次の分岐へ"
                : "終点駅へ"
              : phase === "station"
                ? "終点駅へ"
                : phase === "arrived"
                  ? "終点に到着しました"
                  : phase === "error"
                    ? "判定を取得できませんでした"
                    : "Jevの選択を見届ける。全3問。");

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-lockup__name">JEV</span>
          <span className="brand-lockup__tagline">MORAL RAILWAY</span>
        </div>
        <div className="topbar__status">
          <div className="mode-menu">
            <button
              type="button"
              className="mode-badge"
              aria-expanded={showSettings}
              aria-controls="mode-settings"
              onClick={() => setShowSettings((value) => !value)}
            >
              {mode === "demo" ? "デモ · 架空の判定" : "TypeSafe API"}
            </button>
            {showSettings && (
              <div id="mode-settings" className="mode-settings">
                <label htmlFor="decision-mode">判定モード</label>
                <select
                  id="decision-mode"
                  value={mode}
                  disabled={phase !== "ready"}
                  onChange={(event) => {
                    setMode(event.target.value);
                    setError("");
                  }}
                >
                  <option value="demo">デモ（通信なし）</option>
                  <option value="live" disabled={!configured}>
                    TypeSafe API
                  </option>
                </select>
                <p>
                  {mode === "demo"
                    ? "架空の固定値で再生します。"
                    : "プレイで最大3回の判定を送信し、残高を使用します。再試行は追加送信です。"}
                </p>
                {!configured && <p>実APIは未接続です。</p>}
              </div>
            )}
          </div>
          {!isStart && (
            <span className="topbar__round">
              {String(roundIndex + 1).padStart(2, "0")} / 03
            </span>
          )}
        </div>
      </header>

      {isStart ? (
        <StartScreen
          headingRef={questionRef}
          mode={mode}
          disabled={mode === "live" && !configured}
          onPlay={play}
        />
      ) : (
        <section className="game-layout" aria-label="Jevトロッコ問題ゲーム">
          <div className="play-field">
            <div className="stage-visual stage-visual--playback">
              <div className="question-block">
                <h1 ref={questionRef} tabIndex={-1}>
                  {atStation
                    ? phase === "arrived"
                      ? "終点に到着しました。"
                      : "終点駅へ。"
                    : scenario.title}
                </h1>
                <p>
                  {atStation
                    ? "Jevの3つの選択を振り返る。"
                    : scenario.description}
                </p>
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
                    !sceneError &&
                    (busy || !sceneReady || (mode === "live" && !configured))
                  }
                  onClick={
                    sceneError
                      ? restart
                      : phase === "arrived"
                        ? () => setRun(finishRun)
                        : play
                  }
                >
                  {sceneError
                    ? "スタート画面に戻る"
                    : !sceneReady
                      ? "準備中…"
                      : phase === "arrived"
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
                {mode === "live" && ["ready", "error"].includes(phase) && (
                  <span className="playback-mode-note">
                    {phase === "error"
                      ? "再試行は追加で残高を使用します"
                      : "開始すると最大3回のAPI判定で残高を使用します"}
                  </span>
                )}
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
                <div
                  className={`route-sign route-sign--left ${answer?.choice === "left" ? "route-sign--chosen" : ""}`}
                >
                  <strong>{scenario.left.label}</strong>
                </div>
                <div
                  className={`route-sign route-sign--right ${answer?.choice === "right" ? "route-sign--chosen" : ""}`}
                >
                  <strong>{scenario.right.label}</strong>
                </div>
                <img
                  className="cockpit-overlay"
                  src="/assets/jev-cockpit-overlay.png"
                  alt="Jevの手と運転席の操作盤"
                />
                <div className="impact-curtain" aria-hidden="true" />
                {["impact", "departing"].includes(phase) && (
                  <div className="consequence-card" role="status">
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
                    decided={!!answer}
                    chosen={answer?.choice === "left"}
                  />
                  <div className="choice-dock__divider" aria-hidden="true" />
                  <GroupCard
                    option={scenario.right}
                    tone="red"
                    decided={!!answer}
                    chosen={answer?.choice === "right"}
                  />
                </div>
              )}
            </div>
          </div>

          <aside className="intel-panel" aria-label="Jevの判断パネル">
            <div className="intel-panel__header">
              <h2>Jevの選択</h2>
            </div>
            <div className="mascot-frame">
              <img src="/assets/jev-fox-mascot.png" alt="Jev、キツネの運転手" />
            </div>
            <div
              className="jev-judgement"
              aria-label="判定結果"
              aria-live="polite"
            >
              {answer ? (
                <>
                  <div className="section-heading">
                    <span>犠牲にする相手</span>
                    <span className="confidence-label">
                      確信度 {answer.confidence}%
                    </span>
                  </div>
                  <div className="jev-choice">
                    <strong>{jevChoiceLabel}</strong>
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
                </>
              ) : (
                <p>
                  {busy
                    ? "Jevの判断を待っています…"
                    : "プレイすると、ここに判定が表示されます。"}
                </p>
              )}
            </div>
            <p className="judgement-note">
              確率・確信度は倫理的な正解率ではありません。
            </p>
          </aside>
        </section>
      )}
    </main>
  );
}

export { App };
