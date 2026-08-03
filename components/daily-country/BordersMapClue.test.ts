import { describe, expect, it } from "vitest";
import { centreBoundsOnTarget, getIndexedBounds } from "./border-map";
import { createClockwiseTracePath, getPathBounds } from "./border-trace";

describe("createClockwiseTracePath", () => {
  it("starts at the leftmost point and traces the largest ring clockwise", () => {
    const trace = createClockwiseTracePath("M10 10L0 10L0 0L10 0ZM20 20L21 20L21 21L20 21Z");

    expect(trace?.path).toBe("M0 0L10 0L10 10L0 10Z");
    expect(trace?.length).toBe(40);
  });
});

describe("getPathBounds", () => {
  it("measures every ring in a silhouette", () => {
    expect(getPathBounds("M10 10L0 10L0 0L10 0ZM20 20L21 20L21 21L20 21Z")).toEqual({
      minX: 0,
      maxX: 21,
      minY: 0,
      maxY: 21,
    });
  });
});

describe("getIndexedBounds", () => {
  it("keeps a wide country together when viewed from another longitude", () => {
    expect(getIndexedBounds({
      minLongitude: -141,
      maxLongitude: -52,
      minLatitude: 42,
      maxLatitude: 84,
    }, 71)).toEqual({
      minLongitude: -141,
      maxLongitude: -52,
      minLatitude: 42,
      maxLatitude: 84,
    });
  });
});

describe("centreBoundsOnTarget", () => {
  it("preserves the regional span while centring it on the target", () => {
    expect(centreBoundsOnTarget({
      minLongitude: -30,
      maxLongitude: 50,
      minLatitude: -10,
      maxLatitude: 50,
    }, {
      minLongitude: 10,
      maxLongitude: 30,
      minLatitude: 5,
      maxLatitude: 15,
    })).toEqual({
      minLongitude: -20,
      maxLongitude: 60,
      minLatitude: -20,
      maxLatitude: 40,
    });
  });
});
