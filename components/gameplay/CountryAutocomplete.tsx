"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { type Country } from "@/app/data/countries";
import { DEFAULT_COUNTRY_SUGGESTION_LIMIT, getCountrySuggestions } from "./country-suggestions";

type CountryAutocompleteProps = {
  id: string;
  value: string;
  countries: readonly Country[];
  onChange: (value: string) => void;
  onSelect: (country: Country) => void;
  placeholder?: string;
  disabled?: boolean;
  inputClassName?: string;
  suggestionPlacement?: "above" | "below";
  maxSuggestions?: number;
};

export function CountryAutocomplete({
  id,
  value,
  countries,
  onChange,
  onSelect,
  placeholder = "Type a country name",
  disabled = false,
  inputClassName,
  suggestionPlacement = "below",
  maxSuggestions = DEFAULT_COUNTRY_SUGGESTION_LIMIT,
}: CountryAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = useMemo(() => getCountrySuggestions(value, countries, maxSuggestions), [countries, maxSuggestions, value]);
  const listboxId = `${id}-suggestions`;

  function chooseCountry(country: Country) {
    onSelect(country);
    setIsOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "Enter" && isOpen && suggestions[activeIndex]) {
      event.preventDefault();
      chooseCountry(suggestions[activeIndex]);
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && suggestions[activeIndex] ? `${id}-option-${suggestions[activeIndex].code}` : undefined}
        className={inputClassName}
      />
      {isOpen && suggestions.length > 0 && (
        <ul id={listboxId} role="listbox" aria-label="Country suggestions" className={`absolute z-20 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-1 shadow-2xl ${suggestionPlacement === "above" ? "bottom-full mb-2" : "top-full mt-2"}`}>
          {suggestions.map((country, index) => (
            <li key={country.code} id={`${id}-option-${country.code}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCountry(country)}
                className={[
                  "min-h-11 w-full rounded-xl px-3 text-left text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                  index === activeIndex ? "bg-amber-300/15 text-amber-100" : "text-slate-200 hover:bg-slate-800",
                ].join(" ")}
              >
                {country.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
