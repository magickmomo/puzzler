"use client";

import { useEffect, useState } from "react";
import {
  createQuestionDeck,
  getNextRoundAction,
  getUpdatedScore,
  isCorrectAnswer,
  type Difficulty,
  type GameMode,
} from "@/lib/flag-quiz";
import { usePuzzlerStore } from "@/lib/puzzler-store";
import { DifficultySelector } from "./DifficultySelector";
import { GameModeSelector } from "./GameModeSelector";
import { QuizRound } from "./QuizRound";
import { Results } from "./Results";
import { SpeedMatchRound } from "./SpeedMatchRound";

type RoundState = "selecting-mode" | "selecting-difficulty" | "playing" | "answered" | "results";

export function FlagBlitz({ onBack }: { onBack: () => void }) {
  const recordPlay = usePuzzlerStore((state) => state.recordPlay);
  const recordResult = usePuzzlerStore((state) => state.recordResult);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<ReturnType<typeof createQuestionDeck>>([]);
  const [roundState, setRoundState] = useState<RoundState>("selecting-mode");
  const [index, setIndex] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [matchedCodes, setMatchedCodes] = useState<string[]>([]);
  const [incorrectCodes, setIncorrectCodes] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);

  function selectGameMode(selectedGameMode: GameMode) {
    if (selectedGameMode === "speed-match") {
      beginGame(selectedGameMode, null);
      return;
    }

    setGameMode(selectedGameMode);
    setDifficulty(null);
    setRoundState("selecting-difficulty");
  }

  function beginGame(selectedGameMode: GameMode, selectedDifficulty: Difficulty | null) {
    setGameMode(selectedGameMode);
    setDifficulty(selectedDifficulty);
    setQuestions(createQuestionDeck(selectedGameMode));
    setRoundState("playing");
    setIndex(0);
    setQuestionNumber(1);
    setScore(0);
    setStreak(0);
    setAnswer("");
    setHintVisible(false);
    setWasCorrect(null);
    setMatchedCodes([]);
    setIncorrectCodes([]);
    setTimeLeft(60);
    recordPlay();
  }

  function startGame(selectedDifficulty: Difficulty) {
    if (!gameMode) return;
    beginGame(gameMode, selectedDifficulty);
  }

  function submitAnswer(value: string) {
    if (roundState !== "playing" || !questions[index]) return;

    const correct = isCorrectAnswer(value, questions[index]);
    const updatedScore = getUpdatedScore({ score, streak }, correct);
    setAnswer(value);
    setWasCorrect(correct);
    setScore(updatedScore.score);
    setStreak(updatedScore.streak);
    setRoundState("answered");
  }

  function finishGame() {
    if (!gameMode) return;
    recordResult(gameMode, score);
    setRoundState("results");
  }

  function selectSpeedMatchFlag(countryCode: string) {
    if (gameMode !== "speed-match" || roundState !== "playing" || !questions[index]) return;

    if (countryCode !== questions[index].code) {
      setIncorrectCodes((current) => current.includes(countryCode) ? current : [...current, countryCode]);
      setStreak(0);

      window.setTimeout(() => {
        setIncorrectCodes((current) => current.filter((code) => code !== countryCode));
      }, 1800);
      return;
    }

    const nextScore = score + 1;
    setIncorrectCodes([]);
    setMatchedCodes((current) => [...current, countryCode]);
    setScore(nextScore);
    setStreak((current) => current + 1);

    if (index === questions.length - 1) {
      recordResult("speed-match", nextScore);
      setRoundState("results");
      return;
    }

    setIndex((current) => current + 1);
  }

  function nextQuestion() {
    if (!gameMode || wasCorrect === null) return;

    const action = getNextRoundAction({
      gameMode,
      correct: wasCorrect,
      deckIndex: index,
      deckSize: questions.length,
    });

    if (action === "results") {
      finishGame();
      return;
    }

    if (action === "reshuffle") {
      setQuestions(createQuestionDeck("unlimited"));
      setIndex(0);
    } else {
      setIndex((current) => current + 1);
    }

    setQuestionNumber((current) => current + 1);
    setAnswer("");
    setHintVisible(false);
    setWasCorrect(null);
    setRoundState("playing");
  }

  useEffect(() => {
    if (gameMode !== "speed-match" || roundState !== "playing") return;

    if (timeLeft === 0) {
      finishGame();
      return;
    }

    const timer = window.setTimeout(() => setTimeLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [gameMode, roundState, timeLeft, score]);

  const headerValue = gameMode === "speed-match" ? score : streak;
  const headerLabel = gameMode === "speed-match" ? `${score} flags found` : `${streak} answer streak`;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <span aria-hidden="true">←</span> Hub
        </button>
        <p className="text-base font-black tracking-tight text-white">Flag Blitz</p>
        <div className="flex min-h-12 min-w-20 items-center justify-end gap-1.5 text-sm font-black text-amber-300" aria-label={headerLabel}>
          <span aria-hidden="true">◆</span> {headerValue}
        </div>
      </header>
      {roundState === "selecting-mode" && <GameModeSelector onSelect={selectGameMode} />}
      {gameMode && roundState === "selecting-difficulty" && (
        <DifficultySelector gameMode={gameMode} onSelect={startGame} onBack={() => setRoundState("selecting-mode")} />
      )}
      {gameMode && gameMode !== "speed-match" && difficulty && (roundState === "playing" || roundState === "answered") && questions.length > 0 && (
        <QuizRound
          gameMode={gameMode}
          difficulty={difficulty}
          questions={questions}
          index={index}
          questionNumber={questionNumber}
          answer={answer}
          hintVisible={hintVisible}
          answered={roundState === "answered"}
          wasCorrect={wasCorrect}
          onAnswerChange={setAnswer}
          onHint={() => setHintVisible(true)}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
        />
      )}
      {gameMode === "speed-match" && roundState === "playing" && questions.length > 0 && (
        <SpeedMatchRound
          flags={questions}
          targetIndex={index}
          timeLeft={timeLeft}
          score={score}
          matchedCodes={matchedCodes}
          incorrectCodes={incorrectCodes}
          onSelect={(country) => selectSpeedMatchFlag(country.code)}
        />
      )}
      {gameMode && (difficulty || gameMode === "speed-match") && roundState === "results" && (
        <Results
          gameMode={gameMode}
          score={score}
          total={questions.length}
          streak={streak}
          questionNumber={questionNumber}
          timeLeft={timeLeft}
          difficulty={difficulty}
          onReplay={() => beginGame(gameMode, difficulty)}
          onHub={onBack}
        />
      )}
    </main>
  );
}
