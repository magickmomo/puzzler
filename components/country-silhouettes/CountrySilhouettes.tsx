"use client";

import { useEffect, useRef, useState } from "react";
import type { Country } from "@/app/data/countries";
import { AnswerChoiceGrid } from "@/components/gameplay/AnswerChoiceGrid";
import { AnswerFeedback } from "@/components/gameplay/AnswerFeedback";
import type { AnswerOutcome } from "@/components/gameplay/answer-outcome";
import { COUNTRY_SILHOUETTE_QUESTION_COUNT, createSilhouetteOptions, createSilhouetteQuestions } from "@/lib/country-silhouettes";
import { trackFirstGameCompletion, trackGameAbandoned, trackGameCompleted, trackGameStarted, trackReplayStarted } from "@/lib/analytics";
import { useCookieSettings } from "@/components/analytics/AnalyticsConsentProvider";
import { ShareResultButton } from "@/components/gameplay/ShareResultButton";

type RoundState = "intro" | "loading" | "playing" | "answered" | "results";

async function loadSilhouettePaths(countries: Country[]): Promise<Record<string, string>> {
  const paths = await Promise.all(countries.map(async (country) => {
    const response = await fetch(`/country-silhouettes/${country.code}.json`);
    const data: unknown = await response.json();
    if (!response.ok || !data || typeof data !== "object" || !("path" in data) || typeof data.path !== "string") {
      throw new Error(`Could not load the ${country.code} silhouette.`);
    }
    return [country.code, data.path] as const;
  }));

  return Object.fromEntries(paths);
}

export function CountrySilhouettes({ onBack }: { onBack: () => void }) {
  const [roundState, setRoundState] = useState<RoundState>("intro");
  const [questions, setQuestions] = useState<Country[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [options, setOptions] = useState<Country[]>([]);
  const [score, setScore] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [silhouettePaths, setSilhouettePaths] = useState<Record<string, string>>({});
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { analyticsConsentGranted, analyticsReady } = useCookieSettings();
  const startedAtRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const mistakesRef = useRef(0);
  const activeRunRef = useRef(false);
  const gameRunNumberRef = useRef(0);
  const gameStartedTrackedRef = useRef(false);

  const question = questions[questionIndex];
  const outcome: AnswerOutcome = roundState !== "answered" ? "unanswered" : selectedCode === question?.code ? "correct" : "incorrect";

  useEffect(() => {
    if (!activeRunRef.current || !analyticsReady || !analyticsConsentGranted || gameStartedTrackedRef.current) return;

    gameStartedTrackedRef.current = true;
    void trackGameStarted({ game: "country_silhouettes", game_run_number: gameRunNumberRef.current });
  }, [analyticsConsentGranted, analyticsReady, roundState]);

  async function startRound(isReplay = false) {
    const nextQuestions = createSilhouetteQuestions();
    setRoundState("loading");
    setLoadingError(null);
    try {
      const nextPaths = await loadSilhouettePaths(nextQuestions);
      setSilhouettePaths(nextPaths);
    } catch {
      setRoundState("intro");
      setLoadingError("The silhouettes could not load. Please try again.");
      return;
    }
    setQuestions(nextQuestions);
    setQuestionIndex(0);
    setOptions(createSilhouetteOptions(nextQuestions[0]));
    setScore(0);
    setSelectedCode(null);
    startedAtRef.current = Date.now();
    attemptsRef.current = 0;
    mistakesRef.current = 0;
    activeRunRef.current = true;
    gameRunNumberRef.current += 1;
    gameStartedTrackedRef.current = false;
    if (isReplay) void trackReplayStarted({ game: "country_silhouettes" });
    setRoundState("playing");
  }

  function answer(countryCode: string) {
    if (roundState !== "playing" || !question) return;
    attemptsRef.current += 1;
    if (countryCode !== question.code) mistakesRef.current += 1;
    setSelectedCode(countryCode);
    if (countryCode === question.code) setScore((current) => current + 1);
    setRoundState("answered");
  }

  function nextQuestion() {
    if (questionIndex + 1 >= questions.length) {
      if (activeRunRef.current) {
        activeRunRef.current = false;
        void (async () => {
          if (!gameStartedTrackedRef.current && analyticsReady && analyticsConsentGranted) {
            gameStartedTrackedRef.current = true;
            await trackGameStarted({ game: "country_silhouettes", game_run_number: gameRunNumberRef.current });
          }
          await trackGameCompleted({
            game: "country_silhouettes",
            score,
            duration_ms: startedAtRef.current === null ? 0 : Math.max(0, Date.now() - startedAtRef.current),
            attempts: attemptsRef.current,
            mistakes: mistakesRef.current,
            game_run_number: gameRunNumberRef.current,
            end_reason: "cleared",
          });
          if (attemptsRef.current > 0) await trackFirstGameCompletion("country_silhouettes");
        })();
      }
      setRoundState("results");
      return;
    }

    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setOptions(createSilhouetteOptions(questions[nextIndex]));
    setSelectedCode(null);
    setRoundState("playing");
  }

  function abandonRound() {
    if (activeRunRef.current) {
      activeRunRef.current = false;
      void (async () => {
        if (!gameStartedTrackedRef.current && analyticsReady && analyticsConsentGranted) {
          gameStartedTrackedRef.current = true;
          await trackGameStarted({ game: "country_silhouettes", game_run_number: gameRunNumberRef.current });
        }
        await trackGameAbandoned({
          game: "country_silhouettes",
          duration_ms: startedAtRef.current === null ? 0 : Math.max(0, Date.now() - startedAtRef.current),
          attempts: attemptsRef.current,
          mistakes: mistakesRef.current,
          game_run_number: gameRunNumberRef.current,
          exit_reason: "hub",
        });
      })();
    }
    onBack();
  }

  const header = (
    <header className="flex min-h-14 items-center justify-between gap-3">
      <button type="button" onClick={abandonRound} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"><span aria-hidden="true">←</span> Back to Hub</button>
      <p className="text-center text-base font-black tracking-tight text-white">Country Silhouettes</p>
      <span className="min-w-12" aria-hidden="true" />
    </header>
  );

  if (roundState === "intro" || roundState === "loading") {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
        {header}
        <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="silhouette-intro-title">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl border border-amber-300/30 bg-amber-400/10 text-4xl shadow-glow" aria-hidden="true">◒</div>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-amber-300">193 sovereign states</p>
          <h1 id="silhouette-intro-title" className="mt-2 text-4xl font-black tracking-tight text-white">Know the shape?</h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-slate-400">Identify ten country outlines. There&apos;s no timer—take a close look and trust your geography instincts.</p>
          {loadingError && <p className="mx-auto mt-4 max-w-sm text-sm font-bold text-rose-300" role="alert">{loadingError}</p>}
          <button type="button" autoFocus disabled={roundState === "loading"} onClick={() => void startRound()} className="mx-auto mt-8 min-h-14 w-full max-w-sm rounded-2xl bg-amber-300 px-5 font-black text-slate-950 transition hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:bg-amber-200">{roundState === "loading" ? "Loading silhouettes…" : "Start round"}</button>
        </section>
      </main>
    );
  }

  if (roundState === "results") {
    const message = score === COUNTRY_SILHOUETTE_QUESTION_COUNT ? "Shape master!" : score >= 7 ? "Strong geography!" : "Keep exploring!";
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
        {header}
        <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="silhouette-results-title">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl border border-amber-300/30 bg-amber-400/10 text-4xl shadow-glow" aria-hidden="true">◒</div>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-amber-300">Round complete</p>
          <h1 id="silhouette-results-title" className="mt-2 text-4xl font-black tracking-tight text-white">{message}</h1>
          <p className="mt-5 text-5xl font-black text-amber-300">{score}<span className="text-2xl text-slate-600">/{COUNTRY_SILHOUETTE_QUESTION_COUNT}</span></p>
          <p className="mt-2 text-sm font-bold text-slate-500">Correct silhouettes</p>
          <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
            <ShareResultButton message={`I identified ${score}/${COUNTRY_SILHOUETTE_QUESTION_COUNT} country silhouettes on Puzzler.`} path="/country-silhouettes" tone="amber" />
            <button type="button" onClick={() => void startRound(true)} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Play again</button>
            <button type="button" onClick={abandonRound} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Try another game</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      {header}
      <section className="flex flex-1 flex-col py-8" aria-labelledby="silhouette-question-title">
        <div className="flex items-center justify-between text-sm font-black"><p className="text-amber-300">Question {questionIndex + 1} of {COUNTRY_SILHOUETTE_QUESTION_COUNT}</p><p className="text-slate-500">{score} correct</p></div>
        <h1 id="silhouette-question-title" className="mt-4 text-3xl font-black tracking-tight text-white">Which country is this?</h1>
        <div className="mt-7 grid min-h-64 place-items-center rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <svg viewBox="0 0 100 100" className="h-64 w-full max-w-xs text-amber-300" role="img" aria-label="Country silhouette"><path d={question ? silhouettePaths[question.code] : ""} fill="currentColor" fillRule="evenodd" /></svg>
        </div>
        {roundState === "answered" && question && (
          <div className="mt-5"><AnswerFeedback outcome={outcome === "correct" ? "correct" : "incorrect"} answer={question.name} actionLabel={questionIndex + 1 === questions.length ? "See results" : "Next silhouette"} onContinue={nextQuestion} /></div>
        )}
        <div className="mt-8">
          <AnswerChoiceGrid choices={options.map((country) => ({ id: country.code, label: country.name }))} selectedId={selectedCode} correctId={question?.code ?? ""} outcome={outcome} tone="amber" onAnswer={answer} />
        </div>
      </section>
    </main>
  );
}
