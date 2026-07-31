import type { AnswerOutcome } from "./answer-outcome";

export function AnswerFeedback({
  outcome,
  answer,
  actionLabel,
  onContinue,
}: {
  outcome: Exclude<AnswerOutcome, "unanswered">;
  answer: string;
  actionLabel: string;
  onContinue: () => void;
}) {
  const correct = outcome === "correct";

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={`rounded-2xl border p-4 ${correct ? "animate-answer-success border-emerald-400/30 bg-emerald-400/10" : "animate-answer-shake border-rose-400/30 bg-rose-400/10"}`}>
      <p className={`font-black ${correct ? "text-emerald-300" : "text-rose-300"}`}>{correct ? "Perfect call!" : "Not this time"}</p>
      <p className="mt-1 text-sm text-slate-300">The answer is <strong className="text-white">{answer}</strong>.</p>
      <button type="button" onClick={onContinue} className="mt-4 min-h-12 w-full rounded-xl bg-white px-4 font-black text-slate-950 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
        {actionLabel}
      </button>
    </div>
  );
}
