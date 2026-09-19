import { advanceRound, createRunState, revealChoice, selectChoice } from "./game-logic.mjs";

const SCENARIOS = [
  {
    kicker: "問 01 / 03",
    title: "どちらの線路に進めますか？",
    description: "制御を失ったトロッコが、5人の作業員がいる線路へ向かっています。レバーを切り替えると、1人の作業員がいる支線へ進みます。",
    left: { key: "stay", label: "このまま進む", detail: "5人が巻き込まれる", caption: "現在の進路を変えない" },
    right: { key: "switch", label: "線路を切り替える", detail: "1人が巻き込まれる", caption: "レバーで進路を変える" },
    poll: { stay: 18, switch: 82 },
    jev: { choice: "switch", probabilities: { stay: 8, switch: 92 }, confidence: 92, message: "影響を受ける人数を最小化する方向を選びました。" },
  },
  {
    kicker: "問 02 / 03",
    title: "知っている人がいる線路なら？",
    description: "直進すると4人の見知らぬ作業員がいる線路へ進みます。切り替え先には、あなたが以前助けたことのある1人がいます。",
    left: { key: "stay", label: "このまま進む", detail: "4人が巻き込まれる", caption: "知り合いの存在を考慮しない" },
    right: { key: "switch", label: "線路を切り替える", detail: "知っている1人が巻き込まれる", caption: "関係性のある人を選ぶ" },
    poll: { stay: 46, switch: 54 },
    jev: { choice: "stay", probabilities: { stay: 61, switch: 39 }, confidence: 64, message: "個人的な関係性より、人数差を優先するか迷いが残ります。" },
  },
  {
    kicker: "問 03 / 03",
    title: "未来の可能性を知っていたら？",
    description: "直進すると2人の作業員がいる線路へ。切り替えると1人ですが、その人は将来たくさんの人を救う研究を進めています。",
    left: { key: "stay", label: "このまま進む", detail: "2人が巻き込まれる", caption: "現在の被害を小さくする" },
    right: { key: "switch", label: "線路を切り替える", detail: "1人の未来を奪う", caption: "未来の影響まで考える" },
    poll: { stay: 57, switch: 43 },
    jev: { choice: "switch", probabilities: { stay: 44, switch: 56 }, confidence: 57, message: "未来の価値は予測に依存するため、ほぼ互角の判断です。" },
  },
];

const state = { ...createRunState(), showHow: false };

const root = document.querySelector("#root");

function percentBar(value, tone = "cyan") {
  return `<div class="percent-bar" aria-hidden="true"><span class="percent-bar__fill percent-bar__fill--${tone}" style="width:${value}%"></span></div>`;
}

function scoreRow(label, values, keyName, tone) {
  return `<div class="score-row"><div class="score-row__meta"><span>${label}</span><strong>${values[keyName]}%</strong></div>${percentBar(values[keyName], tone)}</div>`;
}

function choiceButton(option, tone) {
  const selected = state.selected === option.key;
  return `<button class="choice-button choice-button--${tone} ${selected ? "is-selected" : ""}" type="button" data-choice="${option.key}" aria-pressed="${selected}" ${state.revealed ? "disabled" : ""}><span class="choice-button__eyebrow">${option.caption}</span><span class="choice-button__label">${option.label}</span><span class="choice-button__detail">${option.detail}</span></button>`;
}

function renderResult() {
  const agreementCount = state.history.filter((entry) => entry.selected === entry.jevChoice).length;
  root.innerHTML = `<main class="game-shell game-shell--result"><div class="result-screen"><div class="brand-lockup brand-lockup--result"><span class="brand-lockup__name">JEV</span><span class="brand-lockup__tagline">MORAL RAILWAY LIVE</span></div><p class="eyebrow eyebrow--cyan">ALL QUESTIONS CLEARED</p><h1>あなたの選択は、<br>どんな未来をつくった？</h1><div class="result-score"><span>Jevと同じ選択をした回数</span><strong>${agreementCount}<small> / ${SCENARIOS.length}</small></strong></div><p class="result-copy">正解はありません。違いが見えたとき、ゲームはもう一度始まります。</p><button class="primary-button" type="button" data-restart>もう一度プレイする</button></div></main>`;
  document.querySelector("[data-restart]").addEventListener("click", () => {
    Object.assign(state, { roundIndex: 0, selected: null, revealed: false, showHow: false, history: [], gameFinished: false });
    render();
  });
}

function render() {
  if (state.gameFinished) {
    renderResult();
    return;
  }

  const scenario = SCENARIOS[state.roundIndex];
  const answeredCount = state.history.length + (state.revealed ? 1 : 0);
  const jevChoiceLabel = scenario.jev.choice === "stay" ? scenario.left.label : scenario.right.label;
  const userChoiceLabel = state.selected === "stay" ? scenario.left.label : scenario.right.label;
  const agreesWithJev = state.selected === scenario.jev.choice;
  const actionHint = state.revealed
    ? `<span class="result-dot ${agreesWithJev ? "result-dot--match" : "result-dot--different"}"></span>${agreesWithJev ? "Jevと同じ線路を選びました" : "Jevとは違う線路を選びました"}`
    : state.selected
      ? `選択中：<strong>${userChoiceLabel}</strong>`
      : "あなたの選択で、次の世界が動き出します";
  const nextLabel = state.revealed
    ? (state.roundIndex === SCENARIOS.length - 1 ? "結果を見る" : "次の問いへ")
    : "この選択で進む";

  root.innerHTML = `<main class="game-shell"><header class="topbar"><div class="brand-lockup"><span class="brand-lockup__name">JEV</span><span class="brand-lockup__tagline">MORAL RAILWAY LIVE</span></div><div class="topbar__middle"><span class="live-dot"></span><span>思考実験を配信中</span></div><div class="topbar__status"><span>DEMO MODE</span><span class="topbar__round">${String(state.roundIndex + 1).padStart(2, "0")} / 03</span></div></header><section class="game-layout" aria-label="Jevトロッコ問題ゲーム"><div class="play-field"><div class="stage-visual" role="img" aria-label="ネオンの光に照らされた分岐する線路"><div class="stage-visual__wash"></div><div class="stage-visual__topline"><span class="stage-chip">${scenario.kicker}</span><span class="stage-slogan">一つの選択、未来が動く</span></div><div class="question-block"><p class="eyebrow eyebrow--cyan">TROLLEY DILEMMA</p><h1>${scenario.title}</h1><p>${scenario.description}</p></div><div class="route-sign route-sign--left"><span>直進すると</span><strong>${scenario.left.detail}</strong></div><div class="route-sign route-sign--right"><span>切り替えると</span><strong>${scenario.right.detail}</strong></div><div class="choice-dock">${choiceButton(scenario.left, "cyan")}<div class="choice-dock__divider" aria-hidden="true"></div>${choiceButton(scenario.right, "red")}</div></div><div class="action-strip"><div class="action-strip__hint" aria-live="polite">${actionHint}</div><button class="primary-button primary-button--compact" type="button" data-submit ${state.selected ? "" : "disabled"}>${nextLabel}</button></div></div><aside class="intel-panel" aria-label="Jevの判断パネル"><div class="intel-panel__header"><div><span class="eyebrow eyebrow--red">ON AIR</span><h2>Jevの判断</h2></div><span class="signal-bars" aria-label="ライブ接続中"><i></i><i></i><i></i></span></div><div class="mascot-frame"><img src="/assets/jev-fox-mascot.png" alt="Jev、キツネの実況者"><div class="mascot-frame__bubble">さあ、どちらの未来を選びますか？</div></div><div class="intel-panel__copy"><span class="mini-label">JEV / STRUCTURED DECISION</span><p>Jevは答えを説明する代わりに、選択肢ごとの確率を返します。</p></div><div class="poll-section"><div class="section-heading"><span>みんなの選択</span><span class="section-heading__count">12,438人が参加中</span></div>${scoreRow(scenario.left.label, scenario.poll, "stay", "cyan")}${scoreRow(scenario.right.label, scenario.poll, "switch", "red")}</div><div class="jev-judgement"><div class="section-heading"><span>Jevの選択</span><span class="confidence-label">確信度 ${scenario.jev.confidence}%</span></div><div class="jev-choice"><strong>${jevChoiceLabel}</strong><span>${scenario.jev.probabilities[scenario.jev.choice]}%</span></div>${percentBar(scenario.jev.probabilities[scenario.jev.choice], "red")}<p>${scenario.jev.message}</p></div><button class="text-button" type="button" data-how>${state.showHow ? "判定の説明を閉じる" : "Jevの判定をどう見る？"}</button>${state.showHow ? '<div class="how-panel"><strong>Jevは「正解」を決めていません。</strong><p>このデモでは、人数・関係性・未来の影響をまとめて見たときの選択確率を表示しています。</p></div>' : ""}</aside></section><footer class="footer-bar"><span>選ぶ、で世界は動く。</span><span>${answeredCount} / ${SCENARIOS.length} 問回答済み</span><span>Jevは判断、あなたは意味をつくる。</span></footer></main>`;

  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.revealed) {
        Object.assign(state, selectChoice(state, button.dataset.choice));
        render();
      }
    });
  });

  document.querySelector("[data-submit]").addEventListener("click", () => {
    if (!state.selected) return;
    if (!state.revealed) {
      Object.assign(state, revealChoice(state, scenario.jev.choice));
    } else {
      Object.assign(state, advanceRound(state, SCENARIOS.length));
    }
    render();
  });

  document.querySelector("[data-how]").addEventListener("click", () => {
    state.showHow = !state.showHow;
    render();
  });
}

render();
