"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Changelog } from "@/components/Changelog";
import { usePuzzlerStore } from "@/lib/puzzler-store";

type GameCardConfig = {
  id: "flag-blitz" | "capital-cities" | "number-drop";
  title: string;
  eyebrow: string;
  description: string;
  accent: string;
  icon: ReactNode;
  available: boolean;
  href?: "/flag-blitz" | "/capital-cities";
};

const SHOW_DEV_GAMES = process.env.NEXT_PUBLIC_PUZZLER_MODE === "dev";

function EiffelTowerIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 56h30" />
      <path d="M23 56 31 8h2l8 48" />
      <path d="M20 39h24" />
      <path d="M18 47h28" />
      <path d="M26 25h12" />
      <path d="m27 18 5 5 5-5" />
      <path d="M25 56 32 39l7 17" />
    </svg>
  );
}

const GAME_CARDS: readonly GameCardConfig[] = [
  {
    id: "flag-blitz",
    title: "Flag Blitz",
    eyebrow: "Featured game",
    description: "Name the nation. Build your streak. Rule the map.",
    accent: "from-cyan-400 to-blue-500",
    icon: "⚑",
    available: true,
    href: "/flag-blitz",
  },
  {
    id: "capital-cities",
    title: "Match Capital Cities",
    eyebrow: "New game",
    description: "Match every country to its capital and build a world-class run.",
    accent: "from-violet-400 to-fuchsia-500",
    icon: <EiffelTowerIcon />,
    available: true,
    href: "/capital-cities",
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

function HubHeader({ onOpenChangelog }: { onOpenChangelog: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3 pb-10 pt-2">
      <div className="flex min-w-0 items-center gap-3">
        <LogoMark />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Pocket arcade</p>
          <h1 className="text-2xl font-black tracking-tight text-white">Puzzler</h1>
        </div>
      </div>
      <button type="button" onClick={onOpenChangelog} className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 text-xs font-black uppercase tracking-wide text-slate-300 transition hover:border-cyan-300/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        <span aria-hidden="true">✦</span> What&apos;s new
      </button>
    </header>
  );
}

function GameCard({ game }: { game: GameCardConfig }) {
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
    return <article aria-disabled="true" className={`${commonClasses} cursor-not-allowed border-slate-800/70 bg-slate-900/35 opacity-60`}>{content}</article>;
  }

  return <Link href={game.href!} className={`${commonClasses} block w-full border-slate-700/80 bg-slate-900/80 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-slate-900`}>{content}</Link>;
}

function Hub({ onOpenChangelog }: { onOpenChangelog: () => void }) {
  const visibleGames = SHOW_DEV_GAMES ? GAME_CARDS : GAME_CARDS.filter((game) => game.available);

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-5xl px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <HubHeader onOpenChangelog={onOpenChangelog} />
      <section aria-labelledby="games-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">Quick games. Sharp minds.</p>
            <h2 id="games-heading" className="mt-1 text-3xl font-black tracking-tight text-white">Choose your challenge</h2>
          </div>
          <span className="hidden rounded-full border border-slate-800 px-3 py-2 text-xs font-bold text-slate-500 sm:block">{SHOW_DEV_GAMES ? "Dev catalog" : "2 games live"}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGames.map((game) => <GameCard key={game.id} game={game} />)}
        </div>
      </section>
      <footer className="mt-10 border-t border-slate-900 pt-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">New games loading</footer>
    </main>
  );
}

export default function PuzzlerApp() {
  const route = usePuzzlerStore((state) => state.route);
  const goHome = usePuzzlerStore((state) => state.goHome);
  const openChangelog = usePuzzlerStore((state) => state.openChangelog);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-50 antialiased">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.12),transparent_34rem)]" />
      <div className="relative">
        {route.screen === "hub" && <Hub onOpenChangelog={openChangelog} />}
        {route.screen === "changelog" && <Changelog onBack={goHome} />}
      </div>
    </div>
  );
}
