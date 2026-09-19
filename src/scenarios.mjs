// Both modes use these same dilemmas. Only the decision source changes.
export const SCENARIOS = [
  {
    id: "social-worth",
    kicker: "問 01 / 03",
    title: "将来のために、どちらを犠牲にする？",
    description:
      "新薬の完成を目前にした科学者1名と、働く意思がないニート5名。将来の貢献を理由に、今ここにいる5人を見捨てられますか。どちらかを轢くしかありません。",
    left: {
      key: "left",
      people: 1,
      label: "科学者1名",
      caption: "将来の貢献を諦める",
      detail: "この1名を犠牲にし、ニート5名を助ける",
    },
    right: {
      key: "right",
      people: 5,
      label: "ニート5名",
      caption: "5人の命より、将来を取る",
      detail: "この5名を犠牲にし、科学者1名を助ける",
    },
    poll: { left: 38, right: 62 },
    jev: {
      choice: "left",
      probabilities: { left: 72, right: 28 },
      confidence: 11,
    },
  },
  {
    id: "family-strangers",
    kicker: "問 02 / 03",
    title: "家族1人と他人4人、どちらを犠牲にする？",
    description:
      "片方にはあなたを育てた家族1名。もう片方には見知らぬ4名。人数を優先すれば、家族は帰ってきません。「公平な判断」を、自分の家族にもできますか。",
    left: {
      key: "left",
      people: 1,
      label: "あなたの家族1名",
      caption: "自分にとって大切な人",
      detail: "家族を犠牲にし、見知らぬ4名を助ける",
    },
    right: {
      key: "right",
      people: 4,
      label: "見知らぬ4名",
      caption: "自分とは無関係な人たち",
      detail: "この4名を犠牲にし、家族1名を助ける",
    },
    poll: { left: 57, right: 43 },
    jev: {
      choice: "right",
      probabilities: { left: 41, right: 59 },
      confidence: 3,
    },
  },
  {
    id: "responsibility",
    kicker: "問 03 / 03",
    title: "事故を起こした5人と通行人、どちらを轢く？",
    description:
      "安全装置を壊して、この暴走を招いた5名。反対側には、ただ通りかかった1名。5人を助ける代償を、何の責任もない1人に払わせますか。",
    left: {
      key: "left",
      people: 5,
      label: "事故を起こした5名",
      caption: "事故の責任を問う",
      detail: "この5名を犠牲にし、通行人1名を助ける",
    },
    right: {
      key: "right",
      people: 1,
      label: "無関係の通行人1名",
      caption: "責任のない1人に代償を払わせる",
      detail: "この1名を犠牲にし、事故を起こした5名を助ける",
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
