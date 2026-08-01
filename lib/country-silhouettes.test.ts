import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SOVEREIGN_NATIONS } from "@/app/data/countries";
import { COUNTRY_SILHOUETTE_QUESTION_COUNT, createSilhouetteOptions, createSilhouetteQuestions, getSilhouetteCountries } from "./country-silhouettes";

function silhouettePath(code: string): string {
  return JSON.parse(readFileSync(join(process.cwd(), "public", "country-silhouettes", `${code}.json`), "utf8")).path;
}

describe("Country Silhouettes", () => {
  it("ships individual assets only for the playable countries", () => {
    expect(SOVEREIGN_NATIONS).toHaveLength(195);
    expect(getSilhouetteCountries()).toHaveLength(193);
    expect(getSilhouetteCountries().every((country) => existsSync(join(process.cwd(), "public", "country-silhouettes", `${country.code}.json`)))).toBe(true);
    expect(getSilhouetteCountries().some((country) => country.code === "mh" || country.code === "tv")).toBe(false);
    expect(existsSync(join(process.cwd(), "public", "country-silhouettes", "mh.json"))).toBe(false);
    expect(existsSync(join(process.cwd(), "public", "country-silhouettes", "tv.json"))).toBe(false);
  });

  it("uses substantial home-region geometry for countries with overseas territories", () => {
    expect((silhouettePath("au").match(/M/g) ?? []).length).toBeGreaterThan(20);
    expect(silhouettePath("au").length).toBeGreaterThan(10_000);
    expect(silhouettePath("nl").length).toBeGreaterThan(2_000);
    expect((silhouettePath("pt").match(/M/g) ?? []).length).toBeLessThanOrEqual(3);
    expect(silhouettePath("mc").length).toBeGreaterThan(5_000);
    expect(silhouettePath("bb").length).toBeGreaterThan(8_000);
    expect(silhouettePath("nr").length).toBeGreaterThan(2_000);
    expect(silhouettePath("sm").length).toBeGreaterThan(8_000);
    expect(silhouettePath("va").length).toBeGreaterThan(1_000);
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
