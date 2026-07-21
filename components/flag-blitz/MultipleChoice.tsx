import type { Country } from "@/app/data/countries";

export function MultipleChoice({
  options,
  answer,
  correctAnswer,
  disabled,
  wasCorrect,
  onAnswer,
}: {
  options: Country[];
  answer: string;
  correctAnswer: string;
  disabled: boolean;
  wasCorrect: boolean | null;
  onAnswer: (answer: string) => void;
}) {
  function choiceClassName(country: Country): string {
    const base = "min-h-14 rounded-2xl border px-4 py-3 text-left font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

    if (!disabled) {
      return `${base} border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-300/50 hover:bg-slate-800`;
    }

    if (country.name === answer) {
      return wasCorrect
        ? `${base} animate-answer-success border-emerald-300 bg-emerald-400 text-slate-950`
        : `${base} animate-answer-shake border-rose-300 bg-rose-500 text-white`;
    }

    if (!wasCorrect && country.name === correctAnswer) {
      return `${base} border-emerald-400/70 bg-emerald-400/15 text-emerald-200`;
    }

    return `${base} cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-500`;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((country) => (
        <button
          key={country.code}
          type="button"
          disabled={disabled}
          onClick={() => onAnswer(country.name)}
          className={choiceClassName(country)}
        >
          {country.name}
        </button>
      ))}
    </div>
  );
}
