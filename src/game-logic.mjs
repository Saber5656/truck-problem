export function createRunState() {
  return {
    roundIndex: 0,
    selected: null,
    revealed: false,
    history: [],
    gameFinished: false,
  };
}

export function selectChoice(state, choice) {
  if (state.revealed || !choice) return state;
  return { ...state, selected: choice };
}

export function revealChoice(state, jevChoice) {
  if (!state.selected || state.revealed) return state;
  return {
    ...state,
    revealed: true,
    history: [...state.history, { selected: state.selected, jevChoice }],
  };
}

export function advanceRound(state, totalRounds) {
  if (!state.revealed) return state;
  if (state.roundIndex === totalRounds - 1) {
    return { ...state, gameFinished: true };
  }
  return {
    ...state,
    roundIndex: state.roundIndex + 1,
    selected: null,
    revealed: false,
  };
}
