export function PauseOverlay({
  onResume,
  onRestart,
  onEndRun,
  onHub,
}: {
  onResume: () => void;
  onRestart: () => void;
  onEndRun: () => void;
  onHub: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-slate-950 px-5 py-[max(1.25rem,env(safe-area-inset-top))] text-center" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <section className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-3xl text-cyan-300" aria-hidden="true">Ⅱ</div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Game paused</p>
        <h1 id="pause-title" className="mt-2 text-3xl font-black tracking-tight text-white">Take a breather</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Your current run is waiting exactly where you left it.</p>
        <div className="mt-8 space-y-3">
          <button type="button" autoFocus onClick={onResume} className="min-h-14 w-full rounded-2xl bg-cyan-300 px-5 font-black text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900">Resume</button>
          <button type="button" onClick={onRestart} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 font-black text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Restart run</button>
          <button type="button" onClick={onEndRun} className="min-h-14 w-full rounded-2xl border border-amber-300/40 bg-amber-300/10 px-5 font-black text-amber-200 transition hover:bg-amber-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">Save &amp; see results</button>
          <button type="button" onClick={onHub} className="min-h-14 w-full rounded-2xl px-5 font-black text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Return to Hub — abandon run</button>
        </div>
      </section>
    </div>
  );
}
