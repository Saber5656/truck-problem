export const SCENARIOS = [
  {
    id: "classic-switch",
    kicker: "問 01 / 03",
    title: "どちらの線路に進めますか？",
    description:
      "制御を失ったトロッコが、5人の作業員がいる線路へ向かっています。レバーを切り替えると、1人の作業員がいる支線へ進みます。",
    left: {
      key: "stay",
      people: 5,
      label: "このまま進む",
      detail: "5人が巻き込まれる",
      caption: "現在の進路を変えない",
    },
    right: {
      key: "switch",
      people: 1,
      label: "線路を切り替える",
      detail: "1人が巻き込まれる",
      caption: "レバーで進路を変える",
    },
    poll: { stay: 18, switch: 82 },
    jev: {
      choice: "switch",
      probabilities: { stay: 8, switch: 92 },
      confidence: 60,
    },
  },
  {
    id: "known-person",
    kicker: "問 02 / 03",
    title: "知っている人がいる線路なら？",
    description:
      "直進すると4人の見知らぬ作業員がいる線路へ進みます。切り替え先には、あなたが以前助けたことのある1人がいます。",
    left: {
      key: "stay",
      people: 4,
      label: "このまま進む",
      detail: "4人が巻き込まれる",
      caption: "知っている1人を巻き込まない",
    },
    right: {
      key: "switch",
      people: 1,
      label: "線路を切り替える",
      detail: "知っている1人が巻き込まれる",
      caption: "見知らぬ4人を巻き込まない",
    },
    poll: { stay: 46, switch: 54 },
    jev: {
      choice: "stay",
      probabilities: { stay: 61, switch: 39 },
      confidence: 4,
    },
  },
  {
    id: "future-impact",
    kicker: "問 03 / 03",
    title: "未来の可能性を知っていたら？",
    description:
      "直進すると2人の作業員がいる線路へ。切り替えると1人ですが、その人は将来たくさんの人を救う研究を進めています。",
    left: {
      key: "stay",
      people: 2,
      label: "このまま進む",
      detail: "2人が巻き込まれる",
      caption: "研究者を巻き込まない",
    },
    right: {
      key: "switch",
      people: 1,
      label: "線路を切り替える",
      detail: "研究者1人が巻き込まれる",
      caption: "2人の作業員を巻き込まない",
    },
    poll: { stay: 57, switch: 43 },
    jev: {
      choice: "switch",
      probabilities: { stay: 44, switch: 56 },
      confidence: 1,
    },
  },
];
