"use client";

import { useRouter } from "next/navigation";
import { DailyCountryChallenge } from "./DailyCountryChallenge";

export function DailyCountryRoute() {
  const router = useRouter();
  return <DailyCountryChallenge onBack={() => router.push("/")} />;
}
