import { useEffect, useMemo, useRef, useState } from "react";
import { SCENARIOS } from "./scenarios.mjs";
import { requestDecision } from "./game-api.mjs";
import { createRunState, selectChoice, revealChoice, advanceRound } from "./game-logic.mjs";

function PercentBar({ value, tone = "cyan" }) {
  return (
    <div className="percent-bar" aria-hidden="true">
      <span className={`percent-bar__fill percent-bar__fill--${tone}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function ChoiceButton({ option, tone, selected, disabled, onClick }) {
  return (
    <button
      className={`choice-button choice-button--${tone} ${selected ? "is-selected" : ""}`}
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="choice-button__eyebrow">{option.caption}</span>
      <span className="choice-button__label">{option.label}</span>
      <span className="choice-button__detail">{option.detail}</span>
    </button>
  );
}

function ScoreRow({ label, values, keyName, tone }) {
  const value = values[keyName];
  return (
    <div className="score-row">
      <div className="score-row__meta">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <PercentBar value={value} tone={tone} />
    </div>
  );
}

function App() {
  const [run, setRun] = useState(createRunState);
  const { roundIndex, selected, revealed, history, gameFinished } = run;
  const [showHow, setShowHow] = useState(false);
  const [mode, setMode] = useState("demo");
  const [configured, setConfigured] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const questionRef = useRef(null);
  const judgementRef = useRef(null);
  const previousScreen = useRef(`${roundIndex}:${gameFinished}`);
  const scenario = SCENARIOS[roundIndex];
  const answeredCount = history.length;
  const agreementCount = useMemo(
    () => history.filter((entry) => entry.selected === entry.jevChoice).length,
    [history],
  );

  useEffect(() => {
    const screen = `${roundIndex}:${gameFinished}`;
    if (previousScreen.current !== screen) {
      questionRef.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      previousScreen.current = screen;
    }
  }, [roundIndex, gameFinished]);

  useEffect(() => {
    if (answer) judgementRef.current?.focus();
  }, [answer]);

  useEffect(() => {
    let active = true;
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((status) => { if (active) setConfigured(status.configured === true); })
      .catch(() => { if (active) setConfigured(false); });
    return () => { active = false; };
  }, []);

  const revealAnswer = async () => {
    if (!selected || revealed || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await requestDecision(scenario, mode);
      setAnswer(result);
      setRun((current) => revealChoice(current, result.choice));
    } catch (error) {
      setError(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const nextRound = () => {
    if (busy) return;
    setRun((current) => advanceRound(current, SCENARIOS.length));
    setAnswer(null);
    setError("");
  };

  const restart = () => {
    setRun(createRunState());
    setShowHow(false);
    setAnswer(null);
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
          <p className="eyebrow eyebrow--cyan">ALL QUESTIONS CLEARED</p>
          <h1 ref={questionRef} tabIndex={-1}>あなたの選択は、<br />どんな未来をつくった？</h1>
          <div className="result-score">
            <span>{mode === "live" ? "Jev" : "デモのJev"}と同じ選択をした回数</span>
            <strong>{agreementCount}<small> / {SCENARIOS.length}</small></strong>
          </div>
          <p className="result-copy">
            正解はありません。違いが見えたとき、ゲームはもう一度始まります。
          </p>
          <button className="primary-button" type="button" onClick={restart}>
            もう一度プレイする
          </button>
        </div>
      </main>
    );
  }

  const jevChoiceLabel = answer?.choice === "stay" ? scenario.left.label : scenario.right.label;
  const userChoiceLabel = selected === "stay" ? scenario.left.label : scenario.right.label;
  const agreesWithJev = selected === answer?.choice;

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
          <span>{mode === "demo" ? "DEMO MODE" : answer ? "API RESPONSE" : "API MODE"}</span>
          <span className="topbar__round">{String(roundIndex + 1).padStart(2, "0")} / 03</span>
        </div>
      </header>

      <section className="game-layout" aria-label="Jevトロッコ問題ゲーム">
        <div className="play-field">
          <div className="stage-visual">
            <div className="stage-visual__wash" />
            <div className="stage-visual__topline">
              <span className="stage-chip">{scenario.kicker}</span>
              <span className="stage-slogan">一つの選択、未来が動く</span>
            </div>
            <div className="question-block">
              <p className="eyebrow eyebrow--cyan">TROLLEY DILEMMA</p>
              <h1 ref={questionRef} tabIndex={-1}>{scenario.title}</h1>
              <p>{scenario.description}</p>
            </div>
            <div className="route-sign route-sign--left">
              <span>直進すると</span>
              <strong>{scenario.left.detail}</strong>
            </div>
            <div className="route-sign route-sign--right">
              <span>切り替えると</span>
              <strong>{scenario.right.detail}</strong>
            </div>
            <span className="stage-note">舞台はイメージです。人数・条件は問題文をご覧ください。</span>
            <div className="choice-dock">
              <ChoiceButton
                option={scenario.left}
                tone="cyan"
                selected={selected === scenario.left.key}
                disabled={revealed || busy}
                onClick={() => setRun((current) => selectChoice(current, scenario.left.key))}
              />
              <div className="choice-dock__divider" aria-hidden="true" />
              <ChoiceButton
                option={scenario.right}
                tone="red"
                selected={selected === scenario.right.key}
                disabled={revealed || busy}
                onClick={() => setRun((current) => selectChoice(current, scenario.right.key))}
              />
            </div>
          </div>

          <div className="action-strip">
            <div className="action-strip__hint" aria-live="polite">
              {revealed ? (
                <>
                  <span className={`result-dot ${agreesWithJev ? "result-dot--match" : "result-dot--different"}`} />
                  {agreesWithJev ? "Jevと同じ線路を選びました" : "Jevとは違う線路を選びました"}
                </>
              ) : selected ? (
                <>選択中：<strong>{userChoiceLabel}</strong></>
              ) : (
                <>あなたの選択で、次の世界が動き出します</>
              )}
            </div>
            <button
              className="primary-button primary-button--compact"
              type="button"
              disabled={!selected || busy}
              onClick={revealed ? () => judgementRef.current?.focus() : revealAnswer}
            >
              {busy ? "Jevに問い合わせ中…" : revealed ? "Jevの判定を見る" : mode === "live" ? "選択を確定してAPIで判定" : "この選択で進む"}
            </button>
          </div>
          {error && <p className="api-error" role="alert">{error}</p>}
        </div>

        <aside className="intel-panel" aria-label="Jevの判断パネル">
          <div className="intel-panel__header">
            <div>
              <span className="eyebrow eyebrow--red">{mode === "demo" ? "DEMO / サンプル" : answer ? "API応答受信済み" : "API / 未判定"}</span>
              <h2>Jevの判断</h2>
            </div>
            <span className="signal-bars" aria-hidden="true"><i /><i /><i /></span>
          </div>

          <div className="mascot-frame">
            <img src="/assets/jev-fox-mascot.png" alt="Jev、キツネの実況者" />
            <div className="mascot-frame__bubble">さあ、どちらの未来を選びますか？</div>
          </div>

          <div className="intel-panel__copy">
            <span className="mini-label">JEV / STRUCTURED DECISION</span>
            <p>{mode === "demo" ? "デモの判定・数値・投票は架空です。API通信は行いません。" : "Jevは答えを説明する代わりに、選択肢ごとの確率を返します。"}</p>
          </div>

          <div className="connection-controls">
            <label htmlFor="decision-mode">判定モード</label>
            <select id="decision-mode" value={mode} disabled={busy || history.length > 0}
              onChange={(event) => { setMode(event.target.value); setError(""); }}>
              <option value="demo">デモ（API通信なし）</option>
              <option value="live" disabled={!configured}>TypeSafe API（残高を使用）</option>
            </select>
            <p>{configured === null ? "キー設定を確認中…" : configured
              ? "キー設定あり（認証・残高は未確認）"
              : "APIキー未設定・デモで遊べます"}</p>
            <details>
              <summary>API設定と送信内容</summary>
              <p>.env.local の TYPESAFE_API_KEY にキーを保存し、開発サーバーを再起動してください。</p>
              <p>APIへ送るのは問題文と選択肢だけです。確定時に1回送信し、残高を使用します。モードは1ゲーム中固定です。</p>
            </details>
          </div>

          <div className="poll-section">
            <div className="section-heading">
              <span>投票の表示サンプル</span>
              <span className="section-heading__count">架空の集計</span>
            </div>
            <ScoreRow label={scenario.left.label} values={scenario.poll} keyName="stay" tone="cyan" />
            <ScoreRow label={scenario.right.label} values={scenario.poll} keyName="switch" tone="red" />
          </div>

          <div className="jev-judgement" ref={judgementRef} tabIndex={-1} aria-label="判定結果" aria-live="polite">
            {answer ? (
              <>
                <div className="section-heading">
                  <span>{answer.source === "demo" ? "デモの選択（固定値）" : "Jevの選択（API応答）"}</span>
                  <span className="confidence-label">確信度 {answer.confidence}%</span>
                </div>
                <div className="jev-choice">
                  <strong>{jevChoiceLabel}</strong>
                  <span>{answer.probabilities[answer.choice]}%</span>
                </div>
                <ScoreRow label={scenario.left.label} values={answer.probabilities} keyName="stay" tone="cyan" />
                <ScoreRow label={scenario.right.label} values={answer.probabilities} keyName="switch" tone="red" />
                <p>{answer.source === "demo" ? "この値は動作確認用です。Jevには問い合わせていません。" : "TypeSafeから受け取った選択・確率・確信度を表示しています。"}</p>
                <p>確率・確信度は倫理的な正解率ではありません。</p>
                <button className="primary-button judgement-next" type="button" onClick={nextRound}>
                  {roundIndex === SCENARIOS.length - 1 ? "結果を見る" : "次の問いへ"}
                </button>
              </>
            ) : <p>{busy ? "Jevの判断を待っています…" : "あなたの選択を確定すると、判断結果がここに表示されます。"}</p>}
          </div>

          <button className="text-button" type="button" aria-expanded={showHow} aria-controls="judgement-explanation" onClick={() => setShowHow((current) => !current)}>
            {showHow ? "判定の説明を閉じる" : "Jevの判定をどう見る？"}
          </button>
          {showHow && (
            <div className="how-panel" id="judgement-explanation">
              <strong>Jevは「正解」を決めていません。</strong>
              <p>確率・確信度は倫理的な正しさの点数ではありません。Jevは説明文を生成しないため、判断理由を推測して表示することもしません。デモの数値と投票サンプルは架空です。</p>
            </div>
          )}
        </aside>
      </section>

      <footer className="footer-bar">
        <span>選ぶ、で世界は動く。</span>
        <span>{answeredCount} / {SCENARIOS.length} 問回答済み</span>
        <span>Jevは判断、あなたは意味をつくる。</span>
      </footer>
    </main>
  );
}

export { App };
