export function createRunState() {
  return {
    roundIndex: 0,
    phase: "ready",
    answer: null,
    history: [],
    gameFinished: false,
  };
}

export function beginRound(state) {
  if (state.gameFinished || !["ready", "error"].includes(state.phase))
    return state;
  return { ...state, phase: "judging" };
}

export function receiveDecision(state, answer) {
  if (state.phase !== "judging") return state;
  return { ...state, phase: "switching", answer };
}

export function failRound(state) {
  if (state.phase !== "judging") return state;
  return { ...state, phase: "error" };
}

export function finishSwitch(state) {
  if (state.phase !== "switching") return state;
  return { ...state, phase: "moving" };
}

export function finishMotion(state) {
  if (state.phase !== "moving") return state;
  return { ...state, phase: "impact" };
}

export function finishImpact(state) {
  if (state.phase !== "impact") return state;
  return {
    ...state,
    phase: "departing",
    history: [
      ...state.history,
      { roundIndex: state.roundIndex, answer: state.answer },
    ],
  };
}

export function advanceRound(state, totalRounds) {
  if (state.gameFinished || state.phase !== "departing") return state;
  if (state.roundIndex === totalRounds - 1)
    return { ...state, phase: "station" };
  return {
    ...state,
    roundIndex: state.roundIndex + 1,
    phase: "judging",
    answer: null,
  };
}

export function arriveAtStation(state) {
  if (state.phase !== "station") return state;
  return { ...state, phase: "arrived", gameFinished: true };
}
