"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  captureAdLanding,
  captureMetaPageView,
  capturePageView,
  persistConsent,
  readStoredConsent,
  setAnalyticsConsent,
  type ConsentPreferences,
} from "@/lib/analytics";

type ConsentContextValue = {
  openCookieSettings: () => void;
  analyticsReady: boolean;
  analyticsConsentGranted: boolean;
  consentResolved: boolean;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function ConsentChoice({
  title,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex min-h-14 items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition focus-within:ring-2 focus-within:ring-cyan-300 ${disabled ? "cursor-default" : "cursor-pointer"} ${checked ? "border-cyan-300/70 bg-cyan-300/10" : "border-slate-700 bg-slate-900 hover:border-cyan-300/50"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer sr-only"
      />
      <span>
        <span className="block text-sm font-black text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-400">{description}</span>
      </span>
      <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-slate-500 bg-slate-950 text-transparent transition peer-checked:border-cyan-300 peer-checked:bg-cyan-300 peer-checked:text-slate-950 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-950">
        <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 8 3 3 7-7" />
        </svg>
      </span>
    </label>
  );
}

function ConsentChoices({
  preferences,
  disabled,
  onChange,
}: {
  preferences: ConsentPreferences;
  disabled?: boolean;
  onChange: (preferences: ConsentPreferences) => void;
}) {
  return (
    <fieldset className="mt-5 space-y-3 border-0 p-0">
      <legend className="text-sm font-black text-white">Choose optional cookies</legend>
      <ConsentChoice
        title="Analytics"
        description="Help us understand which games and features are working well, including whether a browser returns."
        checked={preferences.analytics}
        disabled={disabled}
        onCheckedChange={(analytics) => onChange({ ...preferences, analytics })}
      />
      <ConsentChoice
        title="Marketing"
        description="Help us measure whether our ads are reaching the right players."
        checked={preferences.marketing}
        disabled={disabled}
        onCheckedChange={(marketing) => onChange({ ...preferences, marketing })}
      />
    </fieldset>
  );
}

function ConsentDialog({
  initialPreferences,
  onSave,
  onReject,
  onClose,
  showClose,
}: {
  initialPreferences: ConsentPreferences;
  onSave: (preferences: ConsentPreferences) => void;
  onReject: () => void;
  onClose: () => void;
  showClose: boolean;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => setPreferences(initialPreferences), [initialPreferences]);

  useEffect(() => {
    if (!isAcceptingAll) return;

    const confirmationTimer = window.setTimeout(() => {
      onSave({ analytics: true, marketing: true });
    }, 450);

    return () => window.clearTimeout(confirmationTimer);
  }, [isAcceptingAll, onSave]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusDialog = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isAcceptingAll) return;
        if (showClose) onClose();
        else onReject();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("disabled"));
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.clearTimeout(focusDialog);
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [isAcceptingAll, onClose, onReject, showClose]);

  const acceptAll = () => {
    if (isAcceptingAll) return;
    setPreferences({ analytics: true, marketing: true });
    setIsAcceptingAll(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" aria-describedby="cookie-settings-description" tabIndex={-1} className="w-full rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl focus:outline-none sm:max-w-lg sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Privacy choices</p>
            <h2 id="cookie-settings-title" className="mt-1 text-2xl font-black tracking-tight text-white">Your cookie settings</h2>
          </div>
          {showClose && (
            <button type="button" disabled={isAcceptingAll} onClick={onClose} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl text-slate-400 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-default disabled:opacity-50" aria-label="Close cookie settings">×</button>
          )}
        </div>
        <p id="cookie-settings-description" className="mt-3 text-sm leading-6 text-slate-300">Necessary storage keeps this choice and your local game records. Cookieless Vercel Web Analytics runs to measure basic traffic and popular pages. Optional PostHog analytics and Meta marketing use browser identifiers only if you choose them. You can change your mind at any time.</p>

        <ConsentChoices preferences={preferences} disabled={isAcceptingAll} onChange={setPreferences} />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={isAcceptingAll} onClick={acceptAll} className="min-h-12 rounded-xl border border-slate-600 bg-slate-900 px-4 text-sm font-black text-white transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-default disabled:border-cyan-300 disabled:bg-cyan-300 disabled:text-slate-950">{isAcceptingAll ? "Saved ✓" : "Accept optional cookies"}</button>
          <button type="button" disabled={isAcceptingAll} onClick={onReject} className="min-h-12 rounded-xl border border-slate-600 bg-slate-900 px-4 text-sm font-black text-white transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-default disabled:opacity-50">Reject optional</button>
        </div>
        <button type="button" disabled={isAcceptingAll} onClick={() => onSave(preferences)} className="mt-3 min-h-12 w-full rounded-xl border border-slate-700 px-4 text-sm font-black text-slate-200 transition hover:border-cyan-300/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-default disabled:opacity-50">Save preferences</button>
        <p className="mt-4 text-center text-xs leading-5 text-slate-500"><Link href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">Read the privacy notice</Link></p>
      </section>
    </div>
  );
}

function CookieSettingsFooter({ onOpen }: { onOpen: () => void }) {
  return (
    <footer className="relative border-t border-slate-900 bg-slate-950 px-5 py-5 text-center sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
        <span>© Pocket Arcade</span>
        <Link href="/privacy" className="min-h-10 rounded-lg px-2 py-2 text-slate-400 transition hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Privacy</Link>
        <button type="button" onClick={onOpen} className="min-h-10 rounded-lg px-2 py-2 text-slate-400 transition hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Cookie settings</button>
      </div>
    </footer>
  );
}

function ConsentRouteTracker({ consent, analyticsReady }: { consent: ConsentPreferences | null; analyticsReady: boolean }) {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!consent || !analyticsReady) return;
    let cancelled = false;

    void (async () => {
      const search = typeof window === "undefined" ? "" : window.location.search;
      await capturePageView(pathname);
      if (cancelled) return;

      await captureAdLanding(pathname, search);
      if (cancelled) return;

      if (lastTrackedPathRef.current !== pathname) {
        lastTrackedPathRef.current = pathname;
        await captureMetaPageView(pathname);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analyticsReady, consent, pathname]);

  return null;
}

export function AnalyticsConsentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);

  useEffect(() => {
    setConsent(readStoredConsent());
    setLoaded(true);
  }, []);

  const saveConsent = useCallback((nextConsent: ConsentPreferences) => {
    persistConsent(nextConsent);
    setAnalyticsReady(false);
    setConsent(nextConsent);
    setSettingsOpen(false);
  }, []);

  useEffect(() => {
    if (!loaded || !consent) return;
    let cancelled = false;

    void setAnalyticsConsent(consent).then(() => {
      if (!cancelled) setAnalyticsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [consent, loaded]);

  const openCookieSettings = useCallback(() => setSettingsOpen(true), []);
  const contextValue = useMemo(() => ({
    openCookieSettings,
    analyticsReady,
    analyticsConsentGranted: consent?.analytics === true,
    consentResolved: consent !== null,
  }), [analyticsReady, consent, openCookieSettings]);

  // The notice must remain readable before a visitor makes a choice. An
  // automatic dialog would otherwise cover the privacy page opened from it.
  const dialogIsOpen = loaded && (settingsOpen || (!consent && pathname !== "/privacy"));

  return (
    <ConsentContext.Provider value={contextValue}>
      <ConsentRouteTracker consent={consent} analyticsReady={analyticsReady} />
      <div aria-hidden={dialogIsOpen || undefined} inert={dialogIsOpen}>
        {children}
        <CookieSettingsFooter onOpen={openCookieSettings} />
      </div>
      {dialogIsOpen && (
        <ConsentDialog
          initialPreferences={consent ?? { analytics: false, marketing: false }}
          onSave={saveConsent}
          onReject={() => saveConsent({ analytics: false, marketing: false })}
          onClose={() => setSettingsOpen(false)}
          showClose={Boolean(consent)}
        />
      )}
    </ConsentContext.Provider>
  );
}

export function useCookieSettings(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) throw new Error("useCookieSettings must be used within AnalyticsConsentProvider");
  return context;
}
