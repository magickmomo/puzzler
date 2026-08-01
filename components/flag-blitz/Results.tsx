"use client";

import type { Difficulty, GameMode } from "@/lib/flag-quiz";
import { formatSeconds } from "@/lib/player-records";
import { getFlagMatchChallengeOutcome, type FlagMatchChallenge } from "@/lib/flag-challenge";
import { ShareResultButton } from "@/components/gameplay/ShareResultButton";

export function Results({
  gameMode,
  score,
  total,
  streak,
  questionNumber,
  speedMatchCompletionTimeMs,
  runDurationMs,
  mistakes,
  difficulty,
  onReplay,
  onHub,
  challenge,
}: {
  gameMode: GameMode;
  score: number;
  total: number;
  streak: number;
  questionNumber: number;
  speedMatchCompletionTimeMs: number | null;
  runDurationMs: number | null;
  mistakes: number;
  difficulty: Difficulty | null;
  onReplay: () => void;
  onHub: () => void;
  challenge?: FlagMatchChallenge;
}) {
  const isUnlimited = gameMode === "unlimited";
  const isSpeedMatchUnlimited = gameMode === "flag-match-unlimited";
  const isSpeedMatch = gameMode === "speed-match" || isSpeedMatchUnlimited;
  const completedSpeedMatch = gameMode === "speed-match" && speedMatchCompletionTimeMs !== null;
  const percent = isUnlimited || isSpeedMatch ? 0 : Math.round((score / total) * 100);
  const title = isSpeedMatchUnlimited
    ? score >= 25 ? "Flag blur!" : score >= 15 ? "Rapid fire!" : "Keep chasing flags!"
    : isSpeedMatch
    ? score === total ? "Perfect speed!" : score >= 7 ? "Fast finder!" : "Keep chasing flags!"
    : isUnlimited
    ? score >= 25 ? "Streak legend!" : score >= 10 ? "Strong run!" : "Keep exploring!"
    : percent >= 75 ? "Map master!" : percent >= 50 ? "Solid run!" : "Keep exploring!";
  const challengeOutcome = !challenge ? null : getFlagMatchChallengeOutcome({ score, mistakes }, challenge);
  const challengeOutcomeMessage = challengeOutcome === null
    ? null
    : challengeOutcome === "win"
      ? "You beat the challenger!"
      : challengeOutcome === "loss"
        ? "The challenger keeps the lead."
        : "It’s a draw.";
  const shareMessage = isSpeedMatchUnlimited
    ? `I identified ${score} flags with ${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"} on Puzzler Flag Marathon.`
    : isSpeedMatch
      ? `I identified ${score}/${total} flags in ${formatSeconds(completedSpeedMatch ? speedMatchCompletionTimeMs : runDurationMs)} on Puzzler Speed Match.`
      : isUnlimited
        ? `I identified ${score} flags on Puzzler Flag Classic Unlimited.`
        : `I scored ${score}/${total} on Puzzler Flag Classic.`;

  return (
    <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="results-title">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-4xl shadow-glow" aria-hidden="true">🏁</div>
      <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Run complete</p>
      <h1 id="results-title" className="mt-2 text-4xl font-black tracking-tight text-white">{title}</h1>
      <p className="mx-auto mt-3 max-w-xs text-slate-400">
        {challenge
          ? `You found ${score} of ${total} flags on the same Flag Marathon run.`
          : isSpeedMatchUnlimited
          ? `You found ${score} flags before ending the run.`
          : isSpeedMatch
          ? completedSpeedMatch
            ? `You cleared all ${total} flags in ${formatSeconds(speedMatchCompletionTimeMs)}.`
            : `You found ${score} of ${total} flags before the timer ended.`
          : isUnlimited
          ? `Your Classic Unlimited run ended on flag ${questionNumber}. One miss ends the streak.`
          : <>You completed <span className="capitalize">{difficulty}</span> mode. Another run could put you on top.</>}
      </p>
      {challenge && (
        <section className="mx-auto mt-6 w-full max-w-sm rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4" aria-label="Challenge comparison">
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2 text-left">
            <span />
            <p className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Challenger</p>
            <p className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">You</p>
            <p className="text-sm font-bold text-slate-400">Flags</p>
            <p className="text-right text-lg font-black text-amber-300">{challenge.challengerScore} <span className="text-sm text-slate-500">/ {total}</span></p>
            <p className="text-right text-lg font-black text-cyan-300">{score} <span className="text-sm text-slate-500">/ {total}</span></p>
            <p className="text-sm font-bold text-slate-400">Time</p>
            <p className="text-right text-sm font-black text-amber-300">{formatSeconds(challenge.challengerDurationMs)}</p>
            <p className="text-right text-sm font-black text-cyan-300">{formatSeconds(runDurationMs)}</p>
            <p className="text-sm font-bold text-slate-400">Mistakes</p>
            <p className="text-right text-sm font-black text-amber-300">{challenge.challengerMistakes}</p>
            <p className="text-right text-sm font-black text-cyan-300">{mistakes}</p>
          </div>
          <p className="mt-3 text-sm font-black text-white">{challengeOutcomeMessage}</p>
        </section>
      )}
      <div className={`mx-auto mt-8 grid w-full max-w-sm gap-3 ${isSpeedMatch ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className={`rounded-2xl border border-slate-800 bg-slate-900 ${isSpeedMatch ? "p-4" : "p-5"}`}>
          <p className={`${isSpeedMatch ? "text-2xl" : "text-3xl"} font-black text-white`}>{score}{!isUnlimited && !isSpeedMatchUnlimited && <span className="text-lg text-slate-600">/{total}</span>}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{isUnlimited ? "Correct flags" : isSpeedMatch ? "Flags found" : "Score"}</p>
        </div>
        {isSpeedMatch && (
          <>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-2xl font-black text-rose-300">{mistakes}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Mistakes</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-2xl font-black text-amber-300">{formatSeconds(completedSpeedMatch ? speedMatchCompletionTimeMs : runDurationMs)}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Run time</p>
            </div>
          </>
        )}
        {!isSpeedMatch && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-3xl font-black text-amber-300">{isUnlimited ? questionNumber : streak}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{isUnlimited ? "Run ended on" : "Final streak"}</p>
          </div>
        )}
      </div>
      <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
        <ShareResultButton message={shareMessage} path="/flag-blitz" tone="cyan" />
        <button type="button" onClick={onReplay} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Play again</button>
        <button type="button" onClick={onHub} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Try another game</button>
      </div>
    </section>
  );
}
