import { describe, expect, it } from "vitest";
import { migratePlayerRecords } from "./puzzler-store";

describe("player-record migration", () => {
  it("moves the existing Flag Blitz profile into its game namespace", () => {
    const migrated = migratePlayerRecords({
      totalPlays: 14,
      bestClassicScore: 9,
      bestUnlimitedStreak: 17,
      bestSpeedMatchScore: 8,
      bestSpeedMatchUnlimitedScore: 31,
      flagStatsByMode: {
        classic: {
          br: { attempts: 3, correct: 1, wrong: 2 },
        },
      },
      settings: { excludedCountryCodes: ["br"] },
    }, 1);

    expect(migrated).toMatchObject({
      flagBlitz: {
        totalPlays: 14,
        bestClassicScore: 9,
        bestUnlimitedStreak: 17,
        bestSpeedMatchTimeMs: null,
        bestSpeedMatchUnlimitedScore: 31,
        flagStatsByMode: {
          classic: {
            br: { attempts: 3, correct: 1, wrong: 2 },
          },
        },
        settings: { excludedCountryCodes: ["br"] },
      },
    });
    expect(migrated.dailyCountry).toEqual({ outcomes: {} });
  });

  it("retires the old score-based Speed Match record from the namespaced format", () => {
    const current = {
      flagBlitz: {
        totalPlays: 2,
        bestSpeedMatchScore: 41,
      },
    };

    expect(migratePlayerRecords(current, 2)).toMatchObject({
      flagBlitz: {
        totalPlays: 2,
        bestSpeedMatchTimeMs: null,
      },
    });
  });

  it("adds an independent Capital Cities profile without changing Flag Blitz history", () => {
    const migrated = migratePlayerRecords({
      flagBlitz: {
        totalPlays: 9,
        bestClassicScore: 8,
      },
      capitalCities: {
        totalPlays: 4,
        bestTimeMs: 21_500,
      },
    }, 3);

    expect(migrated).toMatchObject({
      flagBlitz: {
        totalPlays: 9,
        bestClassicScore: 8,
      },
      capitalCities: {
        totalPlays: 4,
        bestTimeMs: 21_500,
      },
    });
  });

  it("moves legacy Flag Match Unlimited history to the renamed mode key", () => {
    const migrated = migratePlayerRecords({
      flagBlitz: {
        flagStatsByMode: {
          "speed-match-unlimited": {
            br: { attempts: 2, correct: 1, wrong: 1 },
          },
        },
      },
    }, 4);

    expect(migrated.flagBlitz.flagStatsByMode["flag-match-unlimited"].br).toEqual({ attempts: 2, correct: 1, wrong: 1 });
    expect(migrated.flagBlitz.flagStatsByMode).not.toHaveProperty("speed-match-unlimited");
  });

  it("keeps valid daily puzzle outcomes while dropping malformed legacy data", () => {
    const migrated = migratePlayerRecords({
      flagBlitz: {},
      capitalCities: {},
      dailyCountry: {
        outcomes: {
          "2026-07-27": { status: "solved", guessesUsed: 2 },
          "not-a-date": { status: "failed", guessesUsed: 6 },
        },
      },
    }, 5);

    expect(migrated.dailyCountry).toEqual({
      outcomes: {
        "2026-07-27": { status: "solved", guessesUsed: 2 },
      },
    });
  });
});
