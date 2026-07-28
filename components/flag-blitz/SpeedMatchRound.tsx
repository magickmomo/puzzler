import Image from "next/image";
import type { Country } from "@/app/data/countries";
import { GameTimer } from "@/components/GameTimer";

export function SpeedMatchRound({
  flags,
  target,
  timeLeft,
  timeLeftMs,
  timerBonusSeconds,
  score,
  mistakes,
  total,
  matchedCodes,
  incorrectCodes,
  removingCode,
  leavingFlag,
  isUnlimited,
  columns,
  queuedFlags,
  promotedCodes,
  correctFeedbackVisible,
  correctFeedbackId,
  wrongFlagName,
  onSelect,
}: {
  flags: Country[];
  target: Country;
  timeLeft: number | null;
  timeLeftMs: number | null;
  timerBonusSeconds: number | null;
  score: number;
  mistakes: number;
  total: number | null;
  matchedCodes: string[];
  incorrectCodes: string[];
  removingCode: string | null;
  leavingFlag: { country: Country; columnIndex: number; flagIndex: number } | null;
  isUnlimited: boolean;
  columns: Country[][] | null;
  queuedFlags: Array<Country | null> | null;
  promotedCodes: string[];
  correctFeedbackVisible: boolean;
  correctFeedbackId: number;
  wrongFlagName: string | null;
  onSelect: (country: Country) => void;
}) {
  function tileClassName(country: Country, isPromoted: boolean, fillsSlot: boolean): string {
    const position = fillsSlot ? "absolute inset-0" : "relative aspect-[4/3] min-h-14";
    const base = `${position} overflow-hidden border p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300`;

    if (removingCode === country.code) {
      return `${base} animate-flag-leave border-emerald-300 bg-emerald-400/25`;
    }

    if (matchedCodes.includes(country.code)) {
      return `${base} animate-answer-success border-emerald-300 bg-emerald-400/25`;
    }

    if (incorrectCodes.includes(country.code)) {
      return `${base} animate-answer-error border-rose-300 bg-rose-500/35`;
    }

    return `${base} ${isPromoted ? "animate-flag-promote z-20" : ""} border-slate-700 bg-slate-800 shadow-sm shadow-black/30 hover:z-10 hover:scale-[1.03] hover:border-cyan-300/60 hover:bg-slate-700`;
  }

  function renderFlagButton(country: Country, index: number, isPromoted = false, fillsSlot = false) {
    const isMatched = matchedCodes.includes(country.code);
    const isIncorrect = incorrectCodes.includes(country.code);
    const isLeaving = removingCode === country.code;

    return (
      <button
        key={country.code}
        type="button"
        disabled={isMatched || isIncorrect || removingCode !== null || timeLeft === 0}
        onClick={() => onSelect(country)}
        className={tileClassName(country, isPromoted, fillsSlot)}
        aria-label={isLeaving || isMatched ? `Flag option ${index + 1}, correct` : isIncorrect ? `Flag option ${index + 1}, ${country.name}, incorrect` : `Flag option ${index + 1}`}
      >
        <Image
          src={`https://flagcdn.com/${country.code}.svg`}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) calc((100vw - 56px) / 3), 128px"
          className="object-contain"
        />
        <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        {isIncorrect && (
          <span aria-hidden="true" className="animate-wrong-flag-overlay pointer-events-none absolute inset-0 grid place-items-center bg-rose-950/80 p-2 text-center text-sm font-black leading-tight text-rose-50 sm:text-base">
            <span className="break-words">{country.name}</span>
          </span>
        )}
      </button>
    );
  }

  function renderLeavingFlag() {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30">
        <span className="animate-flag-check pointer-events-none absolute inset-0 grid place-items-center text-3xl font-black text-emerald-100 drop-shadow-[0_0_12px_rgb(52_211_153)]">✓</span>
      </div>
    );
  }

  return (
    <section className="flex flex-1 flex-col py-4" aria-labelledby="speed-match-target">
      {isUnlimited ? (
        <div className="grid grid-cols-3 items-center gap-3 border-b border-slate-900 px-2 py-3 text-sm font-black" aria-label="Flag Match Unlimited statistics">
          <p className="text-rose-300">{mistakes} {mistakes === 1 ? "mistake" : "mistakes"}</p>
          {timeLeft !== null && (
            <div className="relative flex justify-center">
              <GameTimer durationMs={timeLeftMs ?? timeLeft * 1_000} mode="countdown" tone="cyan" warning={timeLeft <= 10} align="center" />
              {timerBonusSeconds !== null && (
                <span className="pointer-events-none absolute left-[calc(50%+1.65rem)] top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-emerald-300" aria-live="polite">
                  <span className="animate-timer-bonus-inline inline-block">+{timerBonusSeconds}s</span>
                </span>
              )}
            </div>
          )}
          <p className="col-start-3 text-right text-amber-300"><span aria-hidden="true">◆</span> {score} / {total ?? flags.length}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 items-center gap-3 border-b border-slate-900 px-2 py-3 text-sm font-black" aria-label="Speed Match statistics">
          <p className="text-rose-300">{mistakes} {mistakes === 1 ? "mistake" : "mistakes"}</p>
          {timeLeft !== null && (
            <div className="col-start-2 flex justify-center">
              <GameTimer durationMs={timeLeftMs ?? timeLeft * 1_000} mode="countdown" tone="cyan" warning={timeLeft <= 10} align="center" />
            </div>
          )}
          <p className="col-start-3 text-right text-amber-300"><span aria-hidden="true">◆</span> {score} / {total ?? flags.length}</p>
        </div>
      )}
      <div className="py-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Find this country</p>
        <h1 id="speed-match-target" aria-live="polite" className="mt-2 text-3xl font-black tracking-tight text-white">{target.name}</h1>
        <p className="mt-2 min-h-6 text-base font-black text-rose-300" aria-live="polite" aria-atomic="true">
          {isUnlimited && correctFeedbackVisible
            ? <span key={correctFeedbackId} aria-hidden="true" className="animate-flag-reward inline-block text-emerald-300">+2</span>
            : wrongFlagName && <span className="animate-wrong-flag">That was {wrongFlagName}</span>}
        </p>
      </div>
      {isUnlimited && columns && queuedFlags ? (
        <div className="grid grid-cols-3 gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]" role="group" aria-label="Selectable flags and queued flags">
          {columns.map((column, columnIndex) => {
            const queuedFlag = queuedFlags[columnIndex];

            return (
              <div key={`column-${columnIndex}`} className="flex flex-col gap-2">
                {column.map((country, flagIndex) => (
                  <div key={country.code} className="relative aspect-[4/3] min-h-14">
                    {renderFlagButton(country, columnIndex * column.length + flagIndex, promotedCodes.includes(country.code), true)}
                    {leavingFlag?.columnIndex === columnIndex && leavingFlag.flagIndex === flagIndex && renderLeavingFlag()}
                  </div>
                ))}
                {queuedFlag && (
                  <div key={queuedFlag.code} aria-hidden="true" className="pointer-events-none relative aspect-[4/3] min-h-14 overflow-hidden border border-slate-800 bg-slate-900/70 p-1.5 opacity-[0.15]">
                    <Image
                      src={`https://flagcdn.com/${queuedFlag.code}.svg`}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 640px) calc((100vw - 56px) / 3), 128px"
                      className="object-contain"
                    />
                    <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                  </div>
                )}
                {leavingFlag?.columnIndex === columnIndex && leavingFlag.flagIndex >= column.length && (
                  <div className="relative aspect-[4/3] min-h-14">
                    {renderLeavingFlag()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]" role="group" aria-label="Flag choices">
          {flags.map((country, index) => renderFlagButton(country, index))}
        </div>
      )}
    </section>
  );
}
