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

function ConsentChoices({
  preferences,
  onChange,
}: {
  preferences: ConsentPreferences;
  onChange: (preferences: ConsentPreferences) => void;
}) {
  return (
    <fieldset className="mt-5 space-y-3 border-0 p-0">
      <legend className="text-sm font-black text-white">Choose optional cookies</legend>
      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 transition hover:border-cyan-300/50 focus-within:ring-2 focus-within:ring-cyan-300">
          <span>
            <span className="block text-sm font-black text-white">Analytics</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-400">Help us understand which games and features are working well.</span>
        </span>
        <input
          type="checkbox"
          checked={preferences.analytics}
          onChange={(event) => onChange({ ...preferences, analytics: event.target.checked })}
          className="h-5 w-5 shrink-0 rounded border-slate-500 bg-slate-950 text-cyan-300 focus:ring-cyan-300"
        />
      </label>
      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 transition hover:border-cyan-300/50 focus-within:ring-2 focus-within:ring-cyan-300">
          <span>
            <span className="block text-sm font-black text-white">Marketing</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-400">Help us measure whether our ads are reaching the right players.</span>
        </span>
        <input
          type="checkbox"
          checked={preferences.marketing}
          onChange={(event) => onChange({ ...preferences, marketing: event.target.checked })}
          className="h-5 w-5 shrink-0 rounded border-slate-500 bg-slate-950 text-cyan-300 focus:ring-cyan-300"
        />
      </label>
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
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => setPreferences(initialPreferences), [initialPreferences]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusDialog = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
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
  }, [onClose, onReject, showClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" aria-describedby="cookie-settings-description" tabIndex={-1} className="w-full rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl focus:outline-none sm:max-w-lg sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Privacy choices</p>
            <h2 id="cookie-settings-title" className="mt-1 text-2xl font-black tracking-tight text-white">Your cookie settings</h2>
          </div>
          {showClose && (
            <button type="button" onClick={onClose} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl text-slate-400 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="Close cookie settings">×</button>
          )}
        </div>
        <p id="cookie-settings-description" className="mt-3 text-sm leading-6 text-slate-300">Necessary storage keeps this choice and your local game records. Optional analytics helps Pocket Arcade improve Puzzler; optional marketing measures ads. You can change your mind at any time.</p>

        <ConsentChoices preferences={preferences} onChange={setPreferences} />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => onSave({ analytics: true, marketing: true })} className="min-h-12 rounded-xl border border-slate-600 bg-slate-900 px-4 text-sm font-black text-white transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Accept all &amp; continue</button>
          <button type="button" onClick={onReject} className="min-h-12 rounded-xl border border-slate-600 bg-slate-900 px-4 text-sm font-black text-white transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Reject non-essential</button>
        </div>
        <button type="button" onClick={() => onSave(preferences)} className="mt-3 min-h-12 w-full rounded-xl border border-slate-700 px-4 text-sm font-black text-slate-200 transition hover:border-cyan-300/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Save preferences</button>
        <p className="mt-4 text-center text-xs leading-5 text-slate-500"><Link href="/privacy" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">Read the privacy notice</Link></p>
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

  const dialogIsOpen = loaded && (!consent || settingsOpen);

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
