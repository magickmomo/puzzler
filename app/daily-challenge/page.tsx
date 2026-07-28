import type { Metadata } from "next";
import { DailyCountryRoute } from "@/components/daily-country/DailyCountryRoute";

export const metadata: Metadata = {
  title: "Today’s Country | Puzzler",
  description: "Solve today’s country in six guesses with a new clue after every miss.",
};

export default function DailyChallengePage() {
  return <DailyCountryRoute />;
}
