// Both modes use these same dilemmas. Only the decision source changes.
export const SCENARIOS = [
  {
    id: "social-worth",
    kicker: "問 01 / 03",
    title: "将来のために、どちらを犠牲にする？",
    description:
      "新薬の完成を目前にした科学者1名と、働く意思がないニート5名。そのまま進めば左の5名が犠牲になり、レバーを切り替えると右の科学者を轢きます。5人を救うため、あなたの操作で新薬の未来を断てますか。",
    left: {
      key: "left",
      people: 5,
      label: "ニート5名",
      caption: "5人の命より、将来を取る",
      detail: "この5名を犠牲にし、科学者1名を助ける",
    },
    right: {
      key: "right",
      people: 1,
      label: "科学者1名",
      caption: "将来の貢献を諦める",
      detail: "この1名を犠牲にし、ニート5名を助ける",
    },
    poll: { left: 62, right: 38 },
    jev: {
      choice: "right",
      probabilities: { left: 28, right: 72 },
      confidence: 11,
    },
  },
  {
    id: "family-strangers",
    kicker: "問 02 / 03",
    title: "家族1人と他人5人、どちらを犠牲にする？",
    description:
      "そのまま進めば左の見知らぬ5名を轢きます。レバーを切り替えた先には、あなたを育てた家族1名。5人を救うため、自分の手で家族を犠牲にできますか。",
    left: {
      key: "left",
      people: 5,
      label: "見知らぬ5名",
      caption: "自分とは無関係な人たち",
      detail: "この5名を犠牲にし、家族1名を助ける",
    },
    right: {
      key: "right",
      people: 1,
      label: "あなたの家族1名",
      caption: "自分にとって大切な人",
      detail: "家族を犠牲にし、見知らぬ5名を助ける",
    },
    poll: { left: 43, right: 57 },
    jev: {
      choice: "left",
      probabilities: { left: 59, right: 41 },
      confidence: 3,
    },
  },
  {
    id: "responsibility",
    kicker: "問 03 / 03",
    title: "犠牲を減らすなら、どちらを轢く？",
    description:
      "左には爆弾を仕掛けた5名。右には唯一の解除技師1名。直進なら5名が死亡し、技師と乗客100名の計101名が助かります。切り替えると技師を失い、乗客100名も爆死。計101名が死亡し、5名が助かります。この架空の条件では結果は確定し、他の救助方法はありません。",
    left: {
      key: "left",
      people: 5,
      label: "爆弾を仕掛けた5名",
      caption: "技師と乗客100名を救う",
      detail: "死亡は爆弾を仕掛けた5名。解除技師1名が生き残り、乗客100名の爆死を確実に防ぐ。合計101名が助かる。",
    },
    right: {
      key: "right",
      people: 1,
      label: "唯一の解除技師1名",
      caption: "乗客100名も救えなくなる",
      detail: "解除技師1名が死亡し、解除できず乗客100名も爆死する。合計101名が死亡し、爆弾を仕掛けた5名が助かる。",
    },
    poll: { left: 46, right: 54 },
    jev: {
      choice: "left",
      probabilities: { left: 64, right: 36 },
      confidence: 7,
    },
  },
];

export function decisionOutcome(scenario, choice) {
  if (!["left", "right"].includes(choice))
    throw new Error("Invalid casualty group");
  return {
    sacrificed: scenario[choice],
    saved: scenario[choice === "left" ? "right" : "left"],
    route: choice === "left" ? "stay" : "switch",
  };
}
