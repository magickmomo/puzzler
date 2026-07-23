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
});
