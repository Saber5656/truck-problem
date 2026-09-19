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
  if (state.gameFinished || state.phase !== "ready") return state;
  return { ...state, phase: "judging" };
}

export function receiveDecision(state, answer) {
  if (state.phase !== "judging") return state;
  return { ...state, phase: "moving", answer };
}

export function failRound(state) {
  if (state.phase !== "judging") return state;
  return { ...state, phase: "ready" };
}

export function finishMotion(state) {
  if (state.phase !== "moving") return state;
  return {
    ...state,
    phase: "arrived",
    history: [
      ...state.history,
      { roundIndex: state.roundIndex, answer: state.answer },
    ],
  };
}

export function advanceRound(state, totalRounds) {
  if (state.gameFinished || state.phase !== "arrived") return state;
  if (state.roundIndex === totalRounds - 1)
    return { ...state, gameFinished: true };
  return {
    ...state,
    roundIndex: state.roundIndex + 1,
    phase: "ready",
    answer: null,
  };
}
