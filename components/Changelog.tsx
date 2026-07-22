"use client";

import { CHANGELOG_ENTRIES } from "@/app/data/changelog";

const REPOSITORY_URL = "https://github.com/magickmomo/puzzler";

export function Changelog({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-xl px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <span aria-hidden="true">←</span> Hub
        </button>
        <p className="text-base font-black tracking-tight text-white">What&apos;s New</p>
        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="flex min-h-12 items-center rounded-xl px-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          GitHub <span className="ml-1" aria-hidden="true">↗</span>
        </a>
      </header>
      <section className="py-8" aria-labelledby="changelog-title">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Release notes</p>
        <h1 id="changelog-title" className="mt-2 text-4xl font-black tracking-tight text-white">What&apos;s changed</h1>
        <p className="mt-3 max-w-lg text-base leading-7 text-slate-400">A player-friendly record of the features and fixes arriving in Puzzler.</p>
      </section>
      <ol className="space-y-4" aria-label="Puzzler changelog">
        {CHANGELOG_ENTRIES.map((entry) => (
          <li key={entry.commit} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{entry.date}</p>
              <a href={`${REPOSITORY_URL}/commit/${entry.commit}`} target="_blank" rel="noreferrer" className="rounded-full border border-slate-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-300/60 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                GitHub change ↗
              </a>
            </div>
            <h2 className="mt-4 text-xl font-black text-white">{entry.title}</h2>
            <p className="mt-2 leading-6 text-slate-400">{entry.summary}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              {entry.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2">
                  <span className="text-cyan-300" aria-hidden="true">◆</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
