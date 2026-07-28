import type { Metadata } from "next";
import { FlagBlitzRoute } from "@/components/flag-blitz/FlagBlitzRoute";

export const metadata: Metadata = {
  title: "Flag Marathon: 60-Second Challenge | Puzzler",
  description: "Find the named country’s flag before time runs out. Every correct answer adds two seconds.",
};

export default async function FlagMatchChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return <FlagBlitzRoute entry={from === "launcher" ? "flag-match-timer-selection" : "flag-match-challenge"} />;
}
