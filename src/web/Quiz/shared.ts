export const quizState = {
    isQuizShown: false,
    isQuizReady: false,
    isDeckHidden: false,
    isQuizStarted: false,
    q: "",
    currentDeck: "",
    mediaQuery: matchMedia("(max-width: 1000px), (screen and (-webkit-device-pixel-ratio:3)))")
};

export default quizState;
