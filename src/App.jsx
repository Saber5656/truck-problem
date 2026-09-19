import { useEffect, useRef, useState } from "react";
import { SCENARIOS } from "./scenarios.mjs";
import { requestDecision } from "./game-api.mjs";
import {
  createRunState,
  beginRound,
  receiveDecision,
  failRound,
  finishMotion,
  advanceRound,
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

function RouteCard({ option, tone, chosen }) {
  return (
    <div
      className={`choice-button choice-button--${tone} ${chosen ? "is-selected" : ""}`}
    >
      <span className="choice-button__eyebrow">
        {chosen ? "JEV'S ROUTE / 選ばれた進路" : option.caption}
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

function App() {
  const [run, setRun] = useState(createRunState);
  const { roundIndex, phase, answer, history, gameFinished } = run;
  const [showHow, setShowHow] = useState(false);
  const [mode, setMode] = useState("demo");
  const [configured, setConfigured] = useState(null);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const questionRef = useRef(null);
  const sceneRef = useRef(null);
  const previousScreen = useRef(`${roundIndex}:${gameFinished}`);
  const scenario = SCENARIOS[roundIndex];
  const busy = phase === "judging" || phase === "moving";
  const jevChoiceLabel =
    answer &&
    (answer.choice === "stay" ? scenario.left.label : scenario.right.label);

  useEffect(() => {
    const screen = `${roundIndex}:${gameFinished}`;
    if (previousScreen.current !== screen) {
      questionRef.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      previousScreen.current = screen;
    }
  }, [roundIndex, gameFinished]);

  useEffect(() => {
    if (phase !== "moving") return;
    // A timer also completes the round in background tabs and reduced-motion mode.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 50
      : 2600;
    const timer = window.setTimeout(() => setRun(finishMotion), duration);
    return () => window.clearTimeout(timer);
  }, [phase]);

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

  const play = async () => {
    if (phase !== "ready" || pending.current) return;
    pending.current = true;
    setRun(beginRound);
    setError("");
    sceneRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
    try {
      const result = await requestDecision(scenario, mode);
      setRun((current) => receiveDecision(current, result));
    } catch (error) {
      setError(error.message);
      setRun(failRound);
    } finally {
      pending.current = false;
    }
  };

  const nextRound = () => {
    if (phase !== "arrived") return;
    setRun((current) => advanceRound(current, SCENARIOS.length));
    setError("");
  };

  const restart = () => {
    setRun(createRunState());
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
            Jevが選んだ、
            <br />
            3つの進路。
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
                  {decision.choice === "stay"
                    ? SCENARIOS[index].left.label
                    : SCENARIOS[index].right.label}
                </strong>
                <span>
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
    phase === "judging"
      ? "Jevが進路を判断しています…"
      : phase === "moving"
        ? `${jevChoiceLabel} — トロッコが進んでいます`
        : phase === "arrived"
          ? `${jevChoiceLabel} — この問いの運行が終了しました`
          : "プレイを押すと、Jevが進路を選びます";

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
              <span className="stage-chip">{scenario.kicker}</span>
              <span className="stage-slogan">Jevが選ぶ。未来が動く。</span>
            </div>
            <div className="question-block">
              <p className="eyebrow eyebrow--cyan">TROLLEY DILEMMA</p>
              <h1 ref={questionRef} tabIndex={-1}>
                {scenario.title}
              </h1>
              <p>{scenario.description}</p>
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
                  className={`result-dot ${phase === "arrived" ? "result-dot--match" : ""}`}
                />
                {status}
              </div>
              <button
                className="primary-button primary-button--compact"
                type="button"
                disabled={busy || (mode === "live" && !configured)}
                onClick={phase === "arrived" ? nextRound : play}
              >
                {phase === "judging"
                  ? "判定中…"
                  : phase === "moving"
                    ? "運行中…"
                    : phase === "arrived"
                      ? roundIndex === SCENARIOS.length - 1
                        ? "3問の結果を見る"
                        : "次の問いへ"
                      : error
                        ? "もう一度判定する"
                        : "ゲームをプレイ"}
              </button>
              <span className="playback-mode-note">
                {mode === "demo"
                  ? "デモ：架空の固定判定 / API通信なし"
                  : "実API：プレイ1回につき1回判定・残高を使用"}
              </span>
            </div>
            {error && (
              <p className="api-error" role="alert">
                {error}
              </p>
            )}
            <div
              className={`railway-scene railway-scene--${phase}`}
              ref={sceneRef}
              data-phase={phase}
              data-route={answer?.choice || "pending"}
              role="img"
              aria-label={
                answer
                  ? `トロッコの進路：${jevChoiceLabel}。${phase === "arrived" ? "運行終了" : "移動中"}`
                  : "分岐する線路で待機するトロッコ"
              }
            >
              <img
                className="railway-scene__background"
                src="/assets/railway-stage-empty.png"
                alt=""
              />
              <img
                key={roundIndex}
                className={`trolley-sprite ${answer ? `trolley-sprite--${answer.choice}` : ""}`}
                src="/assets/trolley-sprite.png"
                alt=""
              />
              <div
                className={`route-sign route-sign--left ${answer?.choice === "stay" ? "route-sign--chosen" : ""}`}
                aria-hidden="true"
              >
                <span>直進すると</span>
                <strong>{scenario.left.detail}</strong>
              </div>
              <div
                className={`route-sign route-sign--right ${answer?.choice === "switch" ? "route-sign--chosen" : ""}`}
                aria-hidden="true"
              >
                <span>切り替えると</span>
                <strong>{scenario.right.detail}</strong>
              </div>
            </div>
            <div className="choice-dock" aria-label="Jevが判断する2つの進路">
              <RouteCard
                option={scenario.left}
                tone="cyan"
                chosen={answer?.choice === "stay"}
              />
              <div className="choice-dock__divider" aria-hidden="true" />
              <RouteCard
                option={scenario.right}
                tone="red"
                chosen={answer?.choice === "switch"}
              />
            </div>
            <p className="stage-note">
              舞台はイメージです。人数・条件は問題文をご覧ください。
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
              <h2>Jevの判断</h2>
            </div>
            <span className="signal-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="mascot-frame">
            <img src="/assets/jev-fox-mascot.png" alt="Jev、キツネの車掌" />
            <div className="mascot-frame__bubble">
              ひとつの問い。
              <br />
              ふたつの進路。
            </div>
          </div>
          <div className="intel-panel__copy">
            <span className="mini-label">JEV / STRUCTURED DECISION</span>
            <p>
              {mode === "demo"
                ? "Jevの動きを体験するデモです。判定・数値・投票は架空です。"
                : "Jevが選んだ進路に、トロッコが進みます。返された確率・確信度も表示します。"}
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
                送信するのは問題文と選択肢だけです。プレイ時に1回判定します。次の問いは自動で送信しません。モードは1ゲーム中固定です。
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
                      ? "デモの選択（固定値）"
                      : "Jevの選択（API応答）"}
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
                  keyName="stay"
                  tone="cyan"
                />
                <ScoreRow
                  label={scenario.right.label}
                  values={answer.probabilities}
                  keyName="switch"
                  tone="red"
                />
                <p>
                  {answer.source === "demo"
                    ? "動作確認用の架空の値です。Jevには問い合わせていません。"
                    : "TypeSafeから受け取った選択・確率・確信度です。"}
                </p>
                <p>確率・確信度は倫理的な正解率ではありません。</p>
                {phase === "arrived" && (
                  <button
                    className="primary-button judgement-next"
                    type="button"
                    onClick={nextRound}
                  >
                    {roundIndex === SCENARIOS.length - 1
                      ? "3問の結果を見る"
                      : "次の問いへ"}
                  </button>
                )}
              </>
            ) : (
              <p>
                {busy
                  ? "Jevの判断を待っています…"
                  : "ゲームをプレイすると、ここにJevの判定が表示されます。"}
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
              keyName="stay"
              tone="cyan"
            />
            <ScoreRow
              label={scenario.right.label}
              values={scenario.poll}
              keyName="switch"
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
          {history.length} / {SCENARIOS.length} 問運行終了
        </span>
        <span>Jevは判断、あなたは意味をつくる。</span>
      </footer>
    </main>
  );
}

export { App };
