import type { FormEvent } from "react";
import type { Difficulty } from "@/lib/flag-quiz";

export function TextAnswer({
  difficulty,
  hint,
  hintVisible,
  disabled,
  wasCorrect,
  value,
  onChange,
  onHint,
  onSubmit,
}: {
  difficulty: Difficulty;
  hint: string;
  hintVisible: boolean;
  disabled: boolean;
  wasCorrect: boolean | null;
  value: string;
  onChange: (value: string) => void;
  onHint: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const submitButtonClass = wasCorrect === null
    ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:bg-slate-800 disabled:text-slate-600"
    : wasCorrect
      ? "animate-answer-success bg-emerald-400 text-slate-950"
      : "animate-answer-shake bg-rose-500 text-white";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="country-answer" className="sr-only">Country name</label>
      <input
        id="country-answer"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        disabled={disabled}
        placeholder="Type the country name"
        className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-50"
      />
      {difficulty === "medium" && (
        <div>
          <button type="button" onClick={onHint} disabled={hintVisible || disabled} className="min-h-12 rounded-xl px-3 text-sm font-bold text-amber-300 transition hover:bg-amber-300/10 disabled:cursor-default disabled:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
            {hintVisible ? "Hint unlocked" : "Need a hint?"}
          </button>
          {hintVisible && <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm leading-6 text-amber-100">{hint}</p>}
        </div>
      )}
      <button type="submit" disabled={disabled || value.trim().length === 0} className={`min-h-14 w-full rounded-2xl px-5 font-black transition disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 ${submitButtonClass}`}>
        {wasCorrect === null ? "Lock in answer" : wasCorrect ? "Correct!" : "Incorrect"}
      </button>
    </form>
  );
}
