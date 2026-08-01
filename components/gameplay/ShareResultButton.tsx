"use client";

import { useState } from "react";
import { createShareText } from "@/lib/share-result";

type ShareTone = "cyan" | "violet" | "amber";

const TONE_CLASSES: Record<ShareTone, string> = {
  cyan: "bg-cyan-300 text-slate-950 hover:bg-cyan-200 focus-visible:ring-cyan-100",
  violet: "bg-violet-300 text-slate-950 hover:bg-violet-200 focus-visible:ring-violet-100",
  amber: "bg-amber-300 text-slate-950 hover:bg-amber-200 focus-visible:ring-amber-100",
};

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.className = "fixed -left-full top-0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  }
}

export function ShareResultButton({ message, path, tone }: { message: string; path: string; tone: ShareTone }) {
  const [status, setStatus] = useState<"copied" | "shared" | "failed" | null>(null);

  async function shareResult() {
    const url = new URL(path, window.location.origin).toString();
    const text = createShareText(message, url);
    setStatus(null);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Puzzler", text });
        setStatus("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    setStatus(await copyToClipboard(text) ? "copied" : "failed");
  }

  return (
    <div>
      <button type="button" onClick={() => void shareResult()} className={`min-h-14 w-full rounded-2xl px-5 font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 ${TONE_CLASSES[tone]}`}>Share result</button>
      {status && <p className={`mt-3 text-center text-sm font-bold ${status === "failed" ? "text-rose-300" : "text-emerald-300"}`} aria-live="polite">{status === "shared" ? "Share sheet opened" : status === "copied" ? "Result and link copied" : "Couldn’t copy the result"}</p>}
    </div>
  );
}
