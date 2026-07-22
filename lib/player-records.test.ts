import { describe, expect, it } from "vitest";
import { getUpdatedBestScores } from "./player-records";

const emptyScores = {
  bestClassicScore: 0,
  bestUnlimitedStreak: 0,
  bestSpeedMatchTimeMs: null,
  bestSpeedMatchUnlimitedScore: 0,
};

describe("player records", () => {
  it("keeps timed Speed Match completion times and untimed scores separate", () => {
    const timed = getUpdatedBestScores(emptyScores, "speed-match", 10, 18_400);
    const untimed = getUpdatedBestScores(timed, "speed-match-unlimited", 25);

    expect(untimed).toEqual({
      bestClassicScore: 0,
      bestUnlimitedStreak: 0,
      bestSpeedMatchTimeMs: 18_400,
      bestSpeedMatchUnlimitedScore: 25,
    });
  });

  it("keeps the fastest completed Speed Match time and ignores incomplete boards", () => {
    const firstTime = getUpdatedBestScores({ ...emptyScores, bestSpeedMatchTimeMs: 15_000 }, "speed-match", 10, 18_000);
    const fasterTime = getUpdatedBestScores(firstTime, "speed-match", 10, 12_650);
    const incompleteBoard = getUpdatedBestScores(fasterTime, "speed-match", 8, 8_000);

    expect(incompleteBoard.bestSpeedMatchTimeMs).toBe(12_650);
  });

  it("never lowers an existing untimed record", () => {
    expect(getUpdatedBestScores({ ...emptyScores, bestSpeedMatchUnlimitedScore: 12 }, "speed-match-unlimited", 8).bestSpeedMatchUnlimitedScore).toBe(12);
  });
});
