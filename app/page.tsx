"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { create } from "zustand";
import { COUNTRIES, type Country } from "./data/countries";

type Screen = "hub" | "flag-blitz";
type Difficulty = "easy" | "medium" | "hard";
type GameMode = "classic" | "unlimited";
type RoundState = "selecting-mode" | "selecting-difficulty" | "playing" | "answered" | "results";

type AppStore = {
  screen: Screen;
  totalPlays: number;
  navigate: (screen: Screen) => void;
  recordPlay: () => void;
};

const useAppStore = create<AppStore>((set) => ({
  screen: "hub",
  totalPlays: 0,
  navigate: (screen) => set({ screen }),
  recordPlay: () => set((state) => ({ totalPlays: state.totalPlays + 1 })),
}));

const QUESTIONS_PER_GAME = 10;
const SHOW_DEV_GAMES = process.env.NEXT_PUBLIC_PUZZLER_MODE === "dev";

const DIFFICULTIES: ReadonlyArray<{
  id: Difficulty;
  label: string;
  description: string;
}> = [
  { id: "easy", label: "Easy", description: "Choose from four answers" },
  { id: "medium", label: "Medium", description: "Type the country, hints allowed" },
  { id: "hard", label: "Hard", description: "Type the country, no lifelines" },
];

const GAME_MODES: ReadonlyArray<{
  id: GameMode;
  label: string;
  description: string;
  badge: string;
  icon: string;
}> = [
  {
    id: "classic",
    label: "Classic",
    description: "Ten flags. Build a score and finish the run.",
    badge: "10 flags",
    icon: "10",
  },
  {
    id: "unlimited",
    label: "Unlimited",
    description: "Keep your streak alive. One wrong answer ends it.",
    badge: "One life",
    icon: "∞",
  },
];

const GAME_CARDS: ReadonlyArray<{
  id: Screen | "word-grid" | "number-drop";
  title: string;
  eyebrow: string;
  description: string;
  accent: string;
  icon: string;
  available: boolean;
}> = [
  {
    id: "flag-blitz",
    title: "Flag Blitz",
    eyebrow: "Featured game",
    description: "Name the nation. Build your streak. Rule the map.",
    accent: "from-cyan-400 to-blue-500",
    icon: "⚑",
    available: true,
  },
  {
    id: "word-grid",
    title: "Word Grid",
    eyebrow: "Coming soon",
    description: "Connect letters and uncover hidden words.",
    accent: "from-violet-400 to-fuchsia-500",
    icon: "Aa",
    available: false,
  },
  {
    id: "number-drop",
    title: "Number Drop",
    eyebrow: "Coming soon",
    description: "Stack numbers and chase the perfect combo.",
    accent: "from-amber-300 to-orange-500",
    icon: "42",
    available: false,
  },
];

function shuffle<T>(items: readonly T[]): T[] {
  return [...items]
    .map((item) => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isCorrectAnswer(value: string, country: Country): boolean {
  const normalizedAnswer = normalize(value);
  return [country.name, ...country.aliases].some((name) => normalize(name) === normalizedAnswer);
}

function getCountryHint(country: Country): string {
  const letterCount = country.name.replace(/[^\p{L}]/gu, "").length;
  return `It starts with “${country.name[0]}” and has ${letterCount} letters.`;
}

function LogoMark() {
  return (
    <div className="grid h-12 w-12 shrink-0 grid-cols-2 gap-1 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 shadow-glow" aria-hidden="true">
      <span className="rounded-sm bg-cyan-300" />
      <span className="rounded-sm bg-blue-500" />
      <span className="rounded-sm bg-blue-500" />
      <span className="rounded-sm border border-cyan-300/60" />
    </div>
  );
}

function HubHeader() {
  return (
    <header className="flex items-center gap-3 pb-10 pt-2">
      <LogoMark />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Pocket arcade</p>
        <h1 className="text-2xl font-black tracking-tight text-white">Puzzler</h1>
      </div>
    </header>
  );
}

function GameCard({ game }: { game: (typeof GAME_CARDS)[number] }) {
  const navigate = useAppStore((state) => state.navigate);
  const commonClasses = "group relative min-h-52 overflow-hidden rounded-3xl border p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950";

  const content = (
    <>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${game.accent} ${game.available ? "opacity-100" : "opacity-30"}`} />
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-xl font-black text-slate-950 ${game.accent} ${game.available ? "shadow-lg" : "grayscale"}`}>
          {game.icon}
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${game.available ? "bg-cyan-300/10 text-cyan-300" : "bg-slate-800 text-slate-500"}`}>
          {game.eyebrow}
        </span>
      </div>
      <div className="mt-7">
        <h2 className="text-xl font-black text-white">{game.title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{game.description}</p>
      </div>
      {game.available && (
        <div className="mt-5 flex min-h-12 items-center justify-between border-t border-white/10 pt-4 text-sm font-bold text-cyan-300">
          <span>Play now</span>
          <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
        </div>
      )}
    </>
  );

  if (!game.available) {
    return (
      <article aria-disabled="true" className={`${commonClasses} cursor-not-allowed border-slate-800/70 bg-slate-900/35 opacity-60`}>
        {content}
      </article>
    );
  }

  return (
    <button type="button" onClick={() => navigate("flag-blitz")} className={`${commonClasses} w-full border-slate-700/80 bg-slate-900/80 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-slate-900`}>
      {content}
    </button>
  );
}

function Hub() {
  const visibleGames = SHOW_DEV_GAMES ? GAME_CARDS : GAME_CARDS.filter((game) => game.available);

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-5xl px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <HubHeader />
      <section aria-labelledby="games-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">Quick games. Sharp minds.</p>
            <h2 id="games-heading" className="mt-1 text-3xl font-black tracking-tight text-white">Choose your challenge</h2>
          </div>
          <span className="hidden rounded-full border border-slate-800 px-3 py-2 text-xs font-bold text-slate-500 sm:block">{SHOW_DEV_GAMES ? "Dev catalog" : "1 game live"}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGames.map((game) => <GameCard key={game.id} game={game} />)}
        </div>
      </section>
      <footer className="mt-10 border-t border-slate-900 pt-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
        New games loading
      </footer>
    </main>
  );
}

function GameTopBar({ streak, onBack }: { streak: number; onBack: () => void }) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3">
      <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        <span aria-hidden="true">←</span> Hub
      </button>
      <p className="text-base font-black tracking-tight text-white">Flag Blitz</p>
      <div className="flex min-h-12 min-w-20 items-center justify-end gap-1.5 text-sm font-black text-amber-300" aria-label={`${streak} answer streak`}>
        <span aria-hidden="true">◆</span> {streak}
      </div>
    </header>
  );
}

function GameModeSelector({ onSelect }: { onSelect: (mode: GameMode) => void }) {
  return (
    <section className="flex flex-1 flex-col justify-center py-8" aria-labelledby="game-mode-title">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Flag Blitz</p>
      <h1 id="game-mode-title" className="mt-2 text-4xl font-black tracking-tight text-white">Choose your run</h1>
      <p className="mt-3 text-base leading-7 text-slate-400">Play a quick set or see how long your streak can last.</p>
      <div className="mt-8 space-y-3">
        {GAME_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            className="group flex min-h-24 w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-cyan-300/40 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-800 text-2xl font-black text-cyan-300 group-hover:bg-cyan-300 group-hover:text-slate-950">{mode.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-black text-white">{mode.label}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-500">{mode.description}</span>
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{mode.badge}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DifficultySelector({ gameMode, onSelect, onBack }: {
  gameMode: GameMode;
  onSelect: (difficulty: Difficulty) => void;
  onBack: () => void;
}) {
  const modeLabel = gameMode === "classic" ? "Classic · 10 flags" : "Unlimited · one life";
  const badge = gameMode === "classic" ? "10 flags" : "unlimited";

  return (
    <section className="flex flex-1 flex-col justify-center py-8" aria-labelledby="difficulty-title">
      <button type="button" onClick={onBack} className="-ml-2 flex min-h-12 w-fit items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        <span aria-hidden="true">←</span> Change run
      </button>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">{modeLabel}</p>
      <h1 id="difficulty-title" className="mt-2 text-4xl font-black tracking-tight text-white">How sharp are you?</h1>
      <p className="mt-3 text-base leading-7 text-slate-400">Choose how you want to name each flag.</p>
      <div className="mt-8 space-y-3">
        {DIFFICULTIES.map((difficulty, index) => (
          <button
            key={difficulty.id}
            type="button"
            onClick={() => onSelect(difficulty.id)}
            className="group flex min-h-20 w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-cyan-300/40 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-lg font-black text-cyan-300 group-hover:bg-cyan-300 group-hover:text-slate-950">0{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-black text-white">{difficulty.label}</span>
              <span className="mt-1 block text-sm text-slate-500">{difficulty.description}</span>
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{badge}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProgressBar({ current, total, gameMode }: { current: number; total: number; gameMode: GameMode }) {
  if (gameMode === "unlimited") {
    return (
      <div className="mt-4">
        <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          <span>Flag {current}</span>
          <span className="text-cyan-300">Unlimited</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-900">
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-cyan-300 via-blue-500 to-cyan-300" />
        </div>
      </div>
    );
  }

  const progress = Math.round(((current + 1) / total) * 100);
  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        <span>Flag {current + 1} of {total}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function FlagImage({ country }: { country: Country }) {
  return (
    <div className="relative mx-auto aspect-[8/5] w-full max-w-sm overflow-hidden border border-white/10 bg-slate-900 shadow-glow">
      <Image
        src={`https://flagcdn.com/${country.code}.svg`}
        alt={`Flag to identify for this question`}
        fill
        unoptimized
        priority
        sizes="(max-width: 640px) calc(100vw - 40px), 384px"
        className="object-contain"
      />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

function MultipleChoice({ options, answer, correctAnswer, disabled, wasCorrect, onAnswer }: {
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

function TextAnswer({ difficulty, hint, hintVisible, disabled, wasCorrect, value, onChange, onHint, onSubmit }: {
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
      <button type="submit" disabled={disabled || normalize(value).length === 0} className={`min-h-14 w-full rounded-2xl px-5 font-black transition disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 ${submitButtonClass}`}>
        {wasCorrect === null ? "Lock in answer" : wasCorrect ? "Correct!" : "Incorrect"}
      </button>
    </form>
  );
}

function AnswerFeedback({ correct, answer, actionLabel, onNext }: { correct: boolean; answer: string; actionLabel: string; onNext: () => void }) {
  return (
    <div role="status" aria-live="polite" className={`rounded-2xl border p-4 ${correct ? "animate-answer-success border-emerald-400/30 bg-emerald-400/10" : "animate-answer-shake border-rose-400/30 bg-rose-400/10"}`}>
      <p className={`font-black ${correct ? "text-emerald-300" : "text-rose-300"}`}>{correct ? "Perfect call!" : "Not this time"}</p>
      <p className="mt-1 text-sm text-slate-300">The answer is <strong className="text-white">{answer}</strong>.</p>
      <button type="button" onClick={onNext} className="mt-4 min-h-12 w-full rounded-xl bg-white px-4 font-black text-slate-950 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
        {actionLabel}
      </button>
    </div>
  );
}

function QuizRound({ gameMode, difficulty, questions, index, questionNumber, answer, hintVisible, roundState, wasCorrect, onAnswerChange, onHint, onSubmit, onNext }: {
  gameMode: GameMode;
  difficulty: Difficulty;
  questions: Country[];
  index: number;
  questionNumber: number;
  answer: string;
  hintVisible: boolean;
  roundState: RoundState;
  wasCorrect: boolean | null;
  onAnswerChange: (value: string) => void;
  onHint: () => void;
  onSubmit: (answer: string) => void;
  onNext: () => void;
}) {
  const question = questions[index];
  const options = useMemo(() => {
    const distractors = shuffle(COUNTRIES.filter((country) => country.code !== question.code)).slice(0, 3);
    return shuffle([question, ...distractors]);
  }, [question]);
  const answered = roundState === "answered";
  const actionLabel = gameMode === "unlimited" && !wasCorrect
    ? "See results"
    : gameMode === "classic" && index === questions.length - 1
      ? "See results"
      : "Next flag";

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(answer);
  }

  return (
    <section className="flex flex-1 flex-col py-4" aria-labelledby="quiz-question">
      <ProgressBar current={gameMode === "classic" ? index : questionNumber} total={questions.length} gameMode={gameMode} />
      <div className="flex flex-1 flex-col justify-center py-7">
        <div className="mb-5 text-center">
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{gameMode} · {difficulty}</span>
          <h1 id="quiz-question" className="mt-4 text-2xl font-black tracking-tight text-white">Which country flies this flag?</h1>
        </div>
        <FlagImage country={question} />
      </div>
      {answered && wasCorrect !== null && (
        <div className="mb-4">
          <AnswerFeedback correct={wasCorrect} answer={question.name} actionLabel={actionLabel} onNext={onNext} />
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

function Results({ gameMode, score, total, streak, questionNumber, difficulty, onReplay, onHub }: {
  gameMode: GameMode;
  score: number;
  total: number;
  streak: number;
  questionNumber: number;
  difficulty: Difficulty;
  onReplay: () => void;
  onHub: () => void;
}) {
  const isUnlimited = gameMode === "unlimited";
  const percent = isUnlimited ? 0 : Math.round((score / total) * 100);
  const title = isUnlimited
    ? score >= 25 ? "Streak legend!" : score >= 10 ? "Strong run!" : "Keep exploring!"
    : percent >= 75 ? "Map master!" : percent >= 50 ? "Solid run!" : "Keep exploring!";
  return (
    <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="results-title">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-4xl shadow-glow" aria-hidden="true">🏁</div>
      <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Run complete</p>
      <h1 id="results-title" className="mt-2 text-4xl font-black tracking-tight text-white">{title}</h1>
      <p className="mx-auto mt-3 max-w-xs text-slate-400">
        {isUnlimited
          ? `Your run ended on flag ${questionNumber}. One miss ends the streak.`
          : <>You completed <span className="capitalize">{difficulty}</span> mode. Another run could put you on top.</>}
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-3xl font-black text-white">{score}{!isUnlimited && <span className="text-lg text-slate-600">/{total}</span>}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{isUnlimited ? "Correct flags" : "Score"}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-3xl font-black text-amber-300">{isUnlimited ? questionNumber : streak}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{isUnlimited ? "Run ended on" : "Final streak"}</p>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
        <button type="button" onClick={onReplay} className="min-h-14 w-full rounded-2xl bg-cyan-300 px-5 font-black text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Play again</button>
        <button type="button" onClick={onHub} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Back to Hub</button>
      </div>
    </section>
  );
}

function FlagBlitz() {
  const navigate = useAppStore((state) => state.navigate);
  const recordPlay = useAppStore((state) => state.recordPlay);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<Country[]>([]);
  const [roundState, setRoundState] = useState<RoundState>("selecting-mode");
  const [index, setIndex] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  function selectGameMode(selectedGameMode: GameMode) {
    setGameMode(selectedGameMode);
    setDifficulty(null);
    setRoundState("selecting-difficulty");
  }

  function startGame(selectedDifficulty: Difficulty) {
    if (!gameMode) return;

    setDifficulty(selectedDifficulty);
    setQuestions(gameMode === "classic" ? shuffle(COUNTRIES).slice(0, QUESTIONS_PER_GAME) : shuffle(COUNTRIES));
    setRoundState("playing");
    setIndex(0);
    setQuestionNumber(1);
    setScore(0);
    setStreak(0);
    setAnswer("");
    setHintVisible(false);
    setWasCorrect(null);
    recordPlay();
  }

  function submitAnswer(value: string) {
    if (roundState !== "playing") return;
    const correct = isCorrectAnswer(value, questions[index]);
    setAnswer(value);
    setWasCorrect(correct);
    setScore((current) => current + (correct ? 1 : 0));
    setStreak((current) => (correct ? current + 1 : 0));
    setRoundState("answered");
  }

  function nextQuestion() {
    if (gameMode === "unlimited" && !wasCorrect) {
      setRoundState("results");
      return;
    }

    if (gameMode === "classic" && index === questions.length - 1) {
      setRoundState("results");
      return;
    }

    if (gameMode === "unlimited" && index === questions.length - 1) {
      setQuestions(shuffle(COUNTRIES));
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

  function backToHub() {
    navigate("hub");
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <GameTopBar streak={streak} onBack={backToHub} />
      {roundState === "selecting-mode" && <GameModeSelector onSelect={selectGameMode} />}
      {gameMode && roundState === "selecting-difficulty" && (
        <DifficultySelector gameMode={gameMode} onSelect={startGame} onBack={() => setRoundState("selecting-mode")} />
      )}
      {gameMode && difficulty && (roundState === "playing" || roundState === "answered") && questions.length > 0 && (
        <QuizRound
          gameMode={gameMode}
          difficulty={difficulty}
          questions={questions}
          index={index}
          questionNumber={questionNumber}
          answer={answer}
          hintVisible={hintVisible}
          roundState={roundState}
          wasCorrect={wasCorrect}
          onAnswerChange={setAnswer}
          onHint={() => setHintVisible(true)}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
        />
      )}
      {gameMode && difficulty && roundState === "results" && (
        <Results gameMode={gameMode} score={score} total={questions.length} streak={streak} questionNumber={questionNumber} difficulty={difficulty} onReplay={() => startGame(difficulty)} onHub={backToHub} />
      )}
    </main>
  );
}

const SCREEN_COMPONENTS: Record<Screen, () => React.ReactNode> = {
  hub: Hub,
  "flag-blitz": FlagBlitz,
};

export default function PuzzlerApp() {
  const screen = useAppStore((state) => state.screen);
  const ActiveScreen = SCREEN_COMPONENTS[screen];

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-950 text-slate-50 antialiased">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.12),transparent_34rem)]" />
      <div className="relative">
        <ActiveScreen />
      </div>
    </div>
  );
}
