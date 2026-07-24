"use client";

import { useRouter } from "next/navigation";
import { FlagReport } from "@/components/FlagReport";
import { Settings } from "@/components/Settings";
import { FlagBlitz } from "./FlagBlitz";

export type FlagBlitzRouteView = "play" | "report" | "settings";

export function FlagBlitzRoute({ view = "play" }: { view?: FlagBlitzRouteView }) {
  const router = useRouter();
  const goToHub = () => router.push("/");
  const goToFlagBlitz = () => router.push("/flag-blitz");

  if (view === "report") return <FlagReport onBack={goToFlagBlitz} onHub={goToHub} />;
  if (view === "settings") return <Settings onBack={goToFlagBlitz} onHub={goToHub} />;

  return (
    <FlagBlitz
      onBack={goToHub}
      onOpenReport={() => router.push("/flag-blitz/report")}
      onOpenSettings={() => router.push("/flag-blitz/settings")}
    />
  );
}
