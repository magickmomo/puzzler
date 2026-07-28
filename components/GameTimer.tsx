import { formatSeconds } from "@/lib/player-records";

export function GameTimer({
  durationMs,
  mode,
  tone,
  warning = false,
  align = "right",
}: {
  durationMs: number;
  mode: "elapsed" | "countdown";
  tone: "cyan" | "violet";
  warning?: boolean;
  align?: "center" | "right";
}) {
  const wholeSeconds = Math.max(0, Math.ceil(durationMs / 1_000));
  const dateTimeSeconds = Math.max(0, Math.round(durationMs / 1_000));
  const display = formatSeconds(durationMs);
  const label = `${display} ${mode === "elapsed" ? "elapsed" : "remaining"}`;
  const toneClass = warning ? "animate-pulse text-rose-300" : tone === "violet" ? "text-violet-300" : "text-cyan-300";

  return (
    <time
      className={`min-w-20 text-xl font-black tabular-nums ${align === "center" ? "text-center" : "text-right"} ${toneClass}`}
      dateTime={`PT${mode === "elapsed" ? dateTimeSeconds : wholeSeconds}S`}
      aria-label={label}
    >
      {display}
    </time>
  );
}
