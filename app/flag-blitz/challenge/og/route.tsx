import { ImageResponse } from "next/og";
import { formatSeconds } from "@/lib/player-records";

export const runtime = "edge";

function readStat(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const stat = Number(value);
  return Number.isSafeInteger(stat) && stat >= 0 ? stat : null;
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const score = readStat(url.searchParams.get("score"));
  const total = readStat(url.searchParams.get("total"));
  const duration = readStat(url.searchParams.get("duration"));
  const mistakes = readStat(url.searchParams.get("mistakes"));
  const valid = score !== null && total !== null && duration !== null && mistakes !== null && score <= total;

  return new ImageResponse(
    (
      <div style={{ background: "#020617", color: "white", display: "flex", flexDirection: "column", height: "100%", width: "100%", padding: "72px", fontFamily: "sans-serif" }}>
        <div style={{ color: "#67e8f9", display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: 5, textTransform: "uppercase" }}>Puzzler · Flag Marathon</div>
        <div style={{ display: "flex", fontSize: 70, fontWeight: 900, lineHeight: 1.05, marginTop: 42 }}>Can you beat this run?</div>
        {valid ? (
          <div style={{ color: "#fcd34d", display: "flex", fontSize: 54, fontWeight: 900, marginTop: 42 }}>{score} / {total} flags</div>
        ) : (
          <div style={{ color: "#fcd34d", display: "flex", fontSize: 48, fontWeight: 900, marginTop: 42 }}>Take the same flag challenge</div>
        )}
        {valid && <div style={{ color: "#cbd5e1", display: "flex", fontSize: 30, marginTop: 20 }}>{formatSeconds(duration)} · {mistakes} {mistakes === 1 ? "mistake" : "mistakes"}</div>}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
