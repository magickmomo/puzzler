"use client";

import { useMemo, useState } from "react";
import { COUNTRIES } from "@/app/data/countries";
import { MINIMUM_ACTIVE_COUNTRIES, getActiveCountries } from "@/lib/puzzler-settings";
import { usePuzzlerStore } from "@/lib/puzzler-store";

type CountryFilter = "all" | "included" | "excluded";

const FILTERS: ReadonlyArray<{ id: CountryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "included", label: "Included" },
  { id: "excluded", label: "Excluded" },
];

export function Settings({ onBack, onHub }: { onBack: () => void; onHub: () => void }) {
  const settings = usePuzzlerStore((state) => state.flagBlitz.settings);
  const setCountryExcluded = usePuzzlerStore((state) => state.setFlagBlitzCountryExcluded);
  const includeAllCountries = usePuzzlerStore((state) => state.includeAllFlagBlitzCountries);
  const resetSettings = usePuzzlerStore((state) => state.resetFlagBlitzSettings);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CountryFilter>("all");
  const excludedCodes = useMemo(() => new Set(settings.excludedCountryCodes), [settings.excludedCountryCodes]);
  const activeCount = getActiveCountries(settings.excludedCountryCodes).length;
  const atMinimum = activeCount <= MINIMUM_ACTIVE_COUNTRIES;
  const belowMinimum = activeCount < MINIMUM_ACTIVE_COUNTRIES;
  const normalizedSearch = search.trim().toLowerCase();
  const countries = COUNTRIES.filter((country) => {
    const included = !excludedCodes.has(country.code);
    const matchesFilter = filter === "all" || (filter === "included" ? included : !included);
    const matchesSearch = normalizedSearch.length === 0 || country.name.toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-xl px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <span aria-hidden="true">←</span> Flag Blitz
        </button>
        <p className="text-base font-black tracking-tight text-white">Settings</p>
        <button type="button" onClick={onHub} className="flex min-h-12 items-center rounded-xl px-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          Back to Hub
        </button>
      </header>

      <section className="py-8" aria-labelledby="settings-title">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Flag Blitz settings</p>
        <h1 id="settings-title" className="mt-2 text-4xl font-black tracking-tight text-white">Choose your flags</h1>
        <p className="mt-3 text-base leading-7 text-slate-400">Your choices affect new runs only. A round already in progress keeps its original flag pool.</p>
      </section>

      <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/5 p-5" aria-live="polite">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Active flags</p>
        <p className="mt-1 text-3xl font-black text-white">{activeCount} <span className="text-lg text-slate-500">of {COUNTRIES.length}</span></p>
        <p className="mt-2 text-sm leading-6 text-slate-400">At least {MINIMUM_ACTIVE_COUNTRIES} flags stay active so every Flag Match Unlimited board can be filled.</p>
        {belowMinimum && <p className="mt-3 rounded-xl bg-rose-400/10 px-3 py-2 text-sm font-bold text-rose-200">Add back at least {MINIMUM_ACTIVE_COUNTRIES - activeCount} flags before starting a new run.</p>}
        {!belowMinimum && atMinimum && <p className="mt-3 rounded-xl bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100">Minimum reached. Include a flag before excluding another.</p>}
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={includeAllCountries} className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-white transition hover:border-cyan-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Include all</button>
        <button type="button" onClick={resetSettings} className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-white transition hover:border-cyan-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Reset to defaults</button>
      </div>

      <label className="mt-6 block">
        <span className="sr-only">Search countries</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search countries" autoCorrect="off" autoCapitalize="none" className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-base font-semibold text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30" />
      </label>

      <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Country status filter">
        {FILTERS.map((option) => {
          const selected = filter === option.id;
          return (
            <button key={option.id} type="button" onClick={() => setFilter(option.id)} aria-pressed={selected} className={`min-h-12 rounded-xl border px-3 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-800 bg-slate-900 text-slate-300 hover:border-cyan-300/50"}`}>
              {option.label}
            </button>
          );
        })}
      </div>

      <section className="mt-6" aria-labelledby="countries-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="countries-title" className="text-xl font-black text-white">Countries</h2>
          <p className="text-sm font-bold text-slate-500">{countries.length} shown</p>
        </div>
        <ul className="mt-3 space-y-2">
          {countries.map((country) => {
            const included = !excludedCodes.has(country.code);
            const exclusionLocked = included && atMinimum;

            return (
              <li key={country.code}>
                <label className={`flex min-h-14 items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition ${included ? "border-slate-800 bg-slate-900/70" : "border-slate-900 bg-slate-900/35 opacity-70"} ${exclusionLocked ? "cursor-not-allowed" : "cursor-pointer hover:border-cyan-300/40"}`}>
                  <span className="min-w-0">
                    <span className="block font-black text-white">{country.name}</span>
                    <span className={`mt-0.5 block text-xs font-bold ${included ? "text-cyan-300" : "text-slate-500"}`}>{included ? "Included" : "Excluded"}</span>
                  </span>
                  <input type="checkbox" checked={included} disabled={exclusionLocked} onChange={(event) => setCountryExcluded(country.code, !event.target.checked)} aria-label={`${included ? "Exclude" : "Include"} ${country.name}`} className="h-6 w-6 shrink-0 accent-cyan-300 disabled:cursor-not-allowed" />
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
