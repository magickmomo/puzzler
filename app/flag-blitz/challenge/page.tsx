import type { Metadata } from "next";
import Link from "next/link";
import { FlagBlitzRoute } from "@/components/flag-blitz/FlagBlitzRoute";
import { parseFlagMatchChallenge } from "@/lib/flag-challenge";
import { formatSeconds } from "@/lib/player-records";

type ChallengeSearchParams = {
  seed?: string | string[];
  score?: string | string[];
  duration?: string | string[];
  mistakes?: string | string[];
  p?: string | string[];
  v?: string | string[];
};

const DEFAULT_METADATA: Metadata = {
  title: "Flag Marathon Challenge | Puzzler",
  description: "Can you beat the challenger’s Flag Marathon score?",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ChallengeSearchParams>;
}): Promise<Metadata> {
  const challenge = parseFlagMatchChallenge(await searchParams);
  if (!challenge) return DEFAULT_METADATA;

  const description = `A challenger found ${challenge.challengerScore} / ${challenge.countryPool.length} flags in ${formatSeconds(challenge.challengerDurationMs)}. Can you beat them?`;
  const imageParams = new URLSearchParams({
    score: String(challenge.challengerScore),
    total: String(challenge.countryPool.length),
    duration: String(challenge.challengerDurationMs),
    mistakes: String(challenge.challengerMistakes),
  });
  const image = `/flag-blitz/challenge/og?${imageParams}`;

  return {
    title: "Beat this Flag Marathon challenge | Puzzler",
    description,
    openGraph: { title: "Beat this Flag Marathon challenge", description, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title: "Beat this Flag Marathon challenge", description, images: [image] },
  };
}

export default async function FlagMatchChallengePage({
  searchParams,
}: {
  searchParams: Promise<ChallengeSearchParams>;
}) {
  const challenge = parseFlagMatchChallenge(await searchParams);

  if (!challenge) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-5 py-8 sm:px-8">
        <section className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-300">Challenge unavailable</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">This challenge link is invalid or no longer supported.</h1>
          <p className="mt-4 text-slate-400">Start a new Flag Marathon run to make a fresh challenge.</p>
          <Link href="/flag-blitz" className="mt-8 inline-flex min-h-14 items-center rounded-2xl bg-cyan-300 px-5 font-black text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Go to Flag Blitz</Link>
        </section>
      </main>
    );
  }

  return <FlagBlitzRoute challenge={challenge} />;
}
