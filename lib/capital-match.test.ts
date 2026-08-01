import { describe, expect, it } from "vitest";
import { CAPITAL_MATCH_PAIRS } from "@/app/data/capitals";
import { SOVEREIGN_NATIONS } from "@/app/data/countries";
import {
  CAPITAL_MATCH_PAIR_COUNT,
  WRONG_CAPITAL_MATCH_PENALTY_MS,
  createCapitalMatchBoard,
  getCapitalMatchElapsedMs,
  isCapitalMatch,
} from "./capital-match";

describe("capital matching", () => {
  it("provides a capital for every country available to Puzzler", () => {
    expect(CAPITAL_MATCH_PAIRS).toHaveLength(SOVEREIGN_NATIONS.length);
    expect(CAPITAL_MATCH_PAIRS.some((pair) => pair.code.startsWith("gb-"))).toBe(false);
  });

  it("creates a ten-pair board with independently ordered country and capital cards", () => {
    const board = createCapitalMatchBoard();

    expect(board.pairs).toHaveLength(CAPITAL_MATCH_PAIR_COUNT);
    expect(new Set(board.pairs.map((pair) => pair.code)).size).toBe(CAPITAL_MATCH_PAIR_COUNT);
    expect(new Set(board.countries.map((pair) => pair.code))).toEqual(new Set(board.pairs.map((pair) => pair.code)));
    expect(new Set(board.capitals.map((pair) => pair.code))).toEqual(new Set(board.pairs.map((pair) => pair.code)));
    expect(new Set(board.pairs.map((pair) => pair.capital.toLocaleLowerCase()))).toHaveLength(CAPITAL_MATCH_PAIR_COUNT);
  });

  it("does not put identical capital labels on the same board", () => {
    const londonPairs = CAPITAL_MATCH_PAIRS.filter((pair) => pair.capital === "London");
    const otherPairs = CAPITAL_MATCH_PAIRS.filter((pair) => pair.capital !== "London").slice(0, CAPITAL_MATCH_PAIR_COUNT - 1);
    const board = createCapitalMatchBoard([...londonPairs, ...otherPairs]);

    expect(board.pairs.filter((pair) => pair.capital === "London")).toHaveLength(1);
  });

  it("matches cards only when they belong to the same country", () => {
    expect(isCapitalMatch(CAPITAL_MATCH_PAIRS[0].code, CAPITAL_MATCH_PAIRS[0].code)).toBe(true);
    expect(isCapitalMatch(CAPITAL_MATCH_PAIRS[0].code, CAPITAL_MATCH_PAIRS[1].code)).toBe(false);
  });

  it("adds a two-second penalty for each incorrect pair", () => {
    expect(getCapitalMatchElapsedMs(10_000, 3, 24_000)).toBe(14_000 + 3 * WRONG_CAPITAL_MATCH_PENALTY_MS);
  });
});
