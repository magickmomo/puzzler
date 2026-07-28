import { describe, expect, it } from "vitest";
import { createFlagMatchChallengeUrl, parseFlagMatchChallenge } from "./flag-challenge";

describe("Flag Match challenges", () => {
  it("parses a valid versioned challenge", () => {
    expect(parseFlagMatchChallenge({ seed: "8f92A1bc1a2B3c4D", score: "10", v: "1" })).toEqual({
      seed: "8f92a1bc1a2b3c4d",
      challengerScore: 10,
    });
  });

  it("rejects malformed, unknown, and impossible challenges", () => {
    expect(parseFlagMatchChallenge({ seed: "not-a-seed", score: "10", v: "1" })).toBeNull();
    expect(parseFlagMatchChallenge({ seed: "8f92a1bc1a2b3c4d", score: "10", v: "2" })).toBeNull();
    expect(parseFlagMatchChallenge({ seed: "8f92a1bc1a2b3c4d", score: "999", v: "1" })).toBeNull();
    expect(parseFlagMatchChallenge({ seed: ["8f92a1bc1a2b3c4d"], score: "10", v: "1" })).toBeNull();
  });

  it("creates a self-contained challenge URL", () => {
    expect(createFlagMatchChallengeUrl("https://puzzler.example", { seed: "8f92a1bc1a2b3c4d", challengerScore: 10 }))
      .toBe("https://puzzler.example/flag-blitz/challenge?seed=8f92a1bc1a2b3c4d&score=10&v=1");
  });
});
