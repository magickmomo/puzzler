import type { Metadata } from "next";
import { FlagBlitzRoute } from "@/components/flag-blitz/FlagBlitzRoute";
import { parseFlagMatchChallenge } from "@/lib/flag-challenge";

export const metadata: Metadata = {
  title: "Flag Match Challenge | Puzzler",
  description: "Can you beat the challenger’s Flag Match score?",
};

export default async function FlagMatchChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string | string[]; score?: string | string[]; v?: string | string[] }>;
}) {
  const challenge = parseFlagMatchChallenge(await searchParams);

  return <FlagBlitzRoute challenge={challenge ?? undefined} />;
}
