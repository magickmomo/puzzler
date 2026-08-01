import { getAnswerChoiceState, type AnswerOutcome } from "./answer-outcome";

export type AnswerChoice = {
  id: string;
  label: string;
};

export function AnswerChoiceGrid({
  choices,
  selectedId,
  correctId,
  outcome,
  tone,
  onAnswer,
}: {
  choices: readonly AnswerChoice[];
  selectedId: string | null;
  correctId: string;
  outcome: AnswerOutcome;
  tone: "cyan" | "amber";
  onAnswer: (choiceId: string) => void;
}) {
  const focusRing = tone === "cyan" ? "focus-visible:ring-cyan-300" : "focus-visible:ring-amber-300";
  const idle = tone === "cyan"
    ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-300/50 hover:bg-slate-800"
    : "border-slate-800 bg-slate-900/70 text-white hover:border-amber-300/60 hover:bg-slate-900";

  function choiceClassName(choice: AnswerChoice): string {
    const base = `min-h-14 rounded-2xl border px-4 py-3 text-left font-bold transition focus:outline-none focus-visible:ring-2 ${focusRing}`;
    const state = getAnswerChoiceState({ choiceId: choice.id, selectedId, correctId, outcome });

    if (state === "idle") return `${base} ${idle}`;
    if (state === "selected-correct") return `${base} animate-answer-success border-emerald-300 bg-emerald-400 text-slate-950`;
    if (state === "selected-incorrect") return `${base} animate-answer-shake border-rose-300 bg-rose-500 text-white`;
    if (state === "correct-answer") return `${base} border-emerald-400/70 bg-emerald-400/15 text-emerald-200`;
    return `${base} cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-500`;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {choices.map((choice) => (
        <button key={choice.id} type="button" disabled={outcome !== "unanswered"} onClick={() => onAnswer(choice.id)} className={choiceClassName(choice)}>
          {choice.label}
        </button>
      ))}
    </div>
  );
}
