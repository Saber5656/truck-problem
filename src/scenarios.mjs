// Both modes use these same dilemmas. Only the decision source changes.
export const SCENARIOS = [
  {
    id: "social-worth",
    kicker: "問 01 / 03",
    title: "将来役に立つのは、どちら？",
    description:
      "新薬の完成を目前にした科学者1名と、働く意思がないニート5名。将来の貢献を理由に、今ここにいる5人を見捨てられますか。助けられるのは片方だけです。",
    left: {
      key: "left",
      people: 1,
      label: "科学者1名",
      caption: "将来の貢献を取る",
      detail: "ニート5名を犠牲にする",
    },
    right: {
      key: "right",
      people: 5,
      label: "ニート5名",
      caption: "目の前の人数を取る",
      detail: "科学者1名を犠牲にする",
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
    title: "家族のためなら、他人4人を見捨てる？",
    description:
      "片方にはあなたを育てた家族1名。もう片方には見知らぬ4名。人数を優先すれば、家族は帰ってきません。「公平な判断」を、自分の家族にもできますか。",
    left: {
      key: "left",
      people: 1,
      label: "あなたの家族1名",
      caption: "自分にとって大切な人",
      detail: "見知らぬ4名を犠牲にする",
    },
    right: {
      key: "right",
      people: 4,
      label: "見知らぬ4名",
      caption: "自分とは無関係な人たち",
      detail: "あなたの家族1名を犠牲にする",
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
    title: "事故を起こした5人も、助けるべき？",
    description:
      "安全装置を壊して、この暴走を招いた5名。反対側には、ただ通りかかった1名。5人を助ける代償を、何の責任もない1人に払わせますか。",
    left: {
      key: "left",
      people: 5,
      label: "事故を起こした5名",
      caption: "責任より、人数を取る",
      detail: "無関係の通行人1名を犠牲にする",
    },
    right: {
      key: "right",
      people: 1,
      label: "無関係の通行人1名",
      caption: "責任のない人を守る",
      detail: "事故を起こした5名を犠牲にする",
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
    throw new Error("Invalid saved group");
  return {
    saved: scenario[choice],
    sacrificed: scenario[choice === "left" ? "right" : "left"],
    route: choice === "left" ? "switch" : "stay",
  };
}
