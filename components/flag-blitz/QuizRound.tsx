import type { FormEvent } from "react";
import { useMemo } from "react";
import type { Country } from "@/app/data/countries";
import {
  createMultipleChoiceOptions,
  getCountryHint,
  getNextRoundAction,
  type Difficulty,
  type GameMode,
} from "@/lib/flag-quiz";
import { AnswerFeedback } from "./AnswerFeedback";
import { FlagImage } from "./FlagImage";
import { MultipleChoice } from "./MultipleChoice";
import { ProgressBar } from "./ProgressBar";
import { TextAnswer } from "./TextAnswer";

export function QuizRound({
  gameMode,
  difficulty,
  questions,
  index,
  questionNumber,
  answer,
  hintVisible,
  answered,
  wasCorrect,
  onAnswerChange,
  onHint,
  onSubmit,
  onNext,
}: {
  gameMode: GameMode;
  difficulty: Difficulty;
  questions: Country[];
  index: number;
  questionNumber: number;
  answer: string;
  hintVisible: boolean;
  answered: boolean;
  wasCorrect: boolean | null;
  onAnswerChange: (value: string) => void;
  onHint: () => void;
  onSubmit: (answer: string) => void;
  onNext: () => void;
}) {
  const question = questions[index];
  const options = useMemo(() => createMultipleChoiceOptions(question), [question]);
  const action = getNextRoundAction({
    gameMode,
    correct: wasCorrect ?? false,
    deckIndex: index,
    deckSize: questions.length,
  });

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(answer);
  }

  return (
    <section className="flex flex-1 flex-col py-4" aria-labelledby="quiz-question">
      <ProgressBar current={gameMode === "classic" ? index : questionNumber} total={questions.length} gameMode={gameMode} />
      <div className="flex flex-1 flex-col justify-center py-7">
        <div className="mb-5 text-center">
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{gameMode === "unlimited" ? "Classic Unlimited" : "Classic"} · {difficulty}</span>
          <h1 id="quiz-question" className="mt-4 text-2xl font-black tracking-tight text-white">Which country flies this flag?</h1>
        </div>
        <FlagImage country={question} />
      </div>
      {answered && wasCorrect !== null && (
        <div className="mb-4">
          <AnswerFeedback
            correct={wasCorrect}
            answer={question.name}
            actionLabel={action === "results" ? "See results" : "Next flag"}
            onNext={onNext}
          />
        </div>
      )}
      <div className="pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {difficulty === "easy" ? (
          <MultipleChoice
            options={options}
            answer={answer}
            correctAnswer={question.name}
            disabled={answered}
            wasCorrect={wasCorrect}
            onAnswer={onSubmit}
          />
        ) : (
          <TextAnswer
            difficulty={difficulty}
            hint={getCountryHint(question)}
            hintVisible={hintVisible}
            disabled={answered}
            wasCorrect={wasCorrect}
            value={answer}
            onChange={onAnswerChange}
            onHint={onHint}
            onSubmit={submitText}
          />
        )}
      </div>
    </section>
  );
}
