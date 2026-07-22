import { describe, expect, it } from "vitest";
import {
  createEmptyFlagStatsByMode,
  getHardestFlags,
  recordFlagAttempt,
} from "./flag-report";

describe("flag report stats", () => {
  it("records correct and incorrect target attempts separately for each mode", () => {
    let stats = createEmptyFlagStatsByMode();
    stats = recordFlagAttempt(stats, "classic", "br", false);
    stats = recordFlagAttempt(stats, "classic", "br", true);
    stats = recordFlagAttempt(stats, "speed-match-unlimited", "br", false);

    expect(stats.classic.br).toEqual({ attempts: 2, correct: 1, wrong: 1 });
    expect(stats["speed-match-unlimited"].br).toEqual({ attempts: 1, correct: 0, wrong: 1 });
    expect(stats["speed-match"]).toEqual({});
  });

  it("keeps modes separate and aggregates them for the all-modes filter", () => {
    let stats = createEmptyFlagStatsByMode();
    stats = recordFlagAttempt(stats, "classic", "br", false);
    stats = recordFlagAttempt(stats, "speed-match", "br", true);

    expect(getHardestFlags(stats, "classic")).toMatchObject([
      { country: { code: "br" }, stats: { attempts: 1, correct: 0, wrong: 1 } },
    ]);
    expect(getHardestFlags(stats, "speed-match")).toEqual([]);
    expect(getHardestFlags(stats, "all")).toMatchObject([
      { country: { code: "br" }, stats: { attempts: 2, correct: 1, wrong: 1 } },
    ]);
  });

  it("ranks lowest accuracy first and exposes unsolved flags without an invalid average", () => {
    let stats = createEmptyFlagStatsByMode();
    stats = recordFlagAttempt(stats, "unlimited", "br", false);
    stats = recordFlagAttempt(stats, "unlimited", "fr", false);
    stats = recordFlagAttempt(stats, "unlimited", "fr", true);
    stats = recordFlagAttempt(stats, "unlimited", "fr", true);

    const entries = getHardestFlags(stats, "unlimited");

    expect(entries.map((entry) => entry.country.code)).toEqual(["br", "fr"]);
    expect(entries[0].accuracy).toBe(0);
    expect(entries[0].attemptsPerCorrect).toBeNull();
    expect(entries[1].accuracy).toBeCloseTo(2 / 3);
    expect(entries[1].attemptsPerCorrect).toBeCloseTo(1.5);
  });

  it("starts with a complete empty record for players with no stored flag history", () => {
    expect(createEmptyFlagStatsByMode()).toEqual({
      classic: {},
      unlimited: {},
      "speed-match": {},
      "speed-match-unlimited": {},
    });
  });
});
