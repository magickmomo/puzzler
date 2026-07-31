import { describe, expect, it } from "vitest";
import { COUNTRY_SILHOUETTE_PATHS } from "@/app/data/country-silhouettes";
import { SOVEREIGN_NATIONS } from "@/app/data/countries";
import { COUNTRY_SILHOUETTE_QUESTION_COUNT, createSilhouetteOptions, createSilhouetteQuestions, getSilhouetteCountries } from "./country-silhouettes";

describe("Country Silhouettes", () => {
  it("keeps local silhouettes for every sovereign state while withholding unfinished island presentations", () => {
    expect(SOVEREIGN_NATIONS).toHaveLength(195);
    expect(getSilhouetteCountries()).toHaveLength(193);
    expect(SOVEREIGN_NATIONS.every((country) => COUNTRY_SILHOUETTE_PATHS[country.code])).toBe(true);
    expect(getSilhouetteCountries().some((country) => country.code === "mh" || country.code === "tv")).toBe(false);
  });

  it("uses substantial home-region geometry for countries with overseas territories", () => {
    expect((COUNTRY_SILHOUETTE_PATHS.au.match(/M/g) ?? []).length).toBeGreaterThan(20);
    expect(COUNTRY_SILHOUETTE_PATHS.au.length).toBeGreaterThan(10_000);
    expect(COUNTRY_SILHOUETTE_PATHS.nl.length).toBeGreaterThan(2_000);
    expect((COUNTRY_SILHOUETTE_PATHS.pt.match(/M/g) ?? []).length).toBeLessThanOrEqual(3);
    expect(COUNTRY_SILHOUETTE_PATHS.mc.length).toBeGreaterThan(5_000);
    expect(COUNTRY_SILHOUETTE_PATHS.bb.length).toBeGreaterThan(8_000);
    expect(COUNTRY_SILHOUETTE_PATHS.mh.length).toBeGreaterThan(20_000);
    expect(COUNTRY_SILHOUETTE_PATHS.nr.length).toBeGreaterThan(2_000);
    expect(COUNTRY_SILHOUETTE_PATHS.sm.length).toBeGreaterThan(8_000);
    expect(COUNTRY_SILHOUETTE_PATHS.tv.length).toBeGreaterThan(18_000);
    expect(COUNTRY_SILHOUETTE_PATHS.va.length).toBeGreaterThan(1_000);
  });

  it("creates a ten-question round with four distinct choices", () => {
    const questions = createSilhouetteQuestions();
    const options = createSilhouetteOptions(questions[0]);

    expect(questions).toHaveLength(COUNTRY_SILHOUETTE_QUESTION_COUNT);
    expect(new Set(questions.map((country) => country.code))).toHaveLength(COUNTRY_SILHOUETTE_QUESTION_COUNT);
    expect(questions.some((country) => country.code === "mh" || country.code === "tv")).toBe(false);
    expect(options).toHaveLength(4);
    expect(new Set(options.map((country) => country.code))).toHaveLength(4);
    expect(options).toContainEqual(questions[0]);
    expect(options.some((country) => country.code === "mh" || country.code === "tv")).toBe(false);
  });
});
