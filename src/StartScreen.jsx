export default function StartScreen({ headingRef, mode, disabled, onPlay }) {
  return (
    <section className="start-screen" aria-labelledby="start-title">
      <div className="start-screen__copy">
        <h1 id="start-title" ref={headingRef} tabIndex={-1}>
          トロッコ問題を遊ぶ
        </h1>
        <p>3つの問い。選ぶのはJev。</p>
        <button
          className="primary-button"
          type="button"
          disabled={disabled}
          onClick={onPlay}
        >
          ゲームをプレイ
        </button>
        {mode === "live" && (
          <p className="start-screen__notice">
            開始すると最大3回のAPI判定で残高を使用します。
          </p>
        )}
      </div>
      <img
        className="start-screen__jev"
        src="/assets/jev-fox-mascot.png"
        alt="キツネの運転手、Jev"
      />
    </section>
  );
}
