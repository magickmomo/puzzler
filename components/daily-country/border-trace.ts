type Point = [number, number];

export type TracePath = { path: string; length: number };
export type PathBounds = { minX: number; maxX: number; minY: number; maxY: number };

function getPathRings(path: string): Point[][] {
  return [...path.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].reduce<Point[][]>((all, match) => {
    if (match[0].startsWith("M")) all.push([]);
    all.at(-1)?.push([Number(match[1]), Number(match[2])]);
    return all;
  }, []);
}

export function getPathBounds(path: string): PathBounds | null {
  const points = getPathRings(path).flat();
  if (points.length === 0) return null;

  return points.reduce<PathBounds>((bounds, [x, y]) => ({
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minY: Math.min(bounds.minY, y),
    maxY: Math.max(bounds.maxY, y),
  }), {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });
}

function getSignedArea(ring: readonly Point[]): number {
  return ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

export function createClockwiseTracePath(path: string): TracePath | null {
  const rings = getPathRings(path);
  const ring = rings.reduce<Point[] | null>((largest, candidate) => !largest || Math.abs(getSignedArea(candidate)) > Math.abs(getSignedArea(largest)) ? candidate : largest, null);
  if (!ring || ring.length < 3) return null;

  // SVG has a downward y-axis, so a positive signed area travels clockwise on screen.
  const clockwiseRing = getSignedArea(ring) >= 0 ? [...ring] : [...ring].reverse();
  const startIndex = clockwiseRing.reduce((leftmostIndex, point, index, points) => (
    point[0] < points[leftmostIndex][0] || (point[0] === points[leftmostIndex][0] && point[1] < points[leftmostIndex][1])
      ? index
      : leftmostIndex
  ), 0);
  const orderedRing = [...clockwiseRing.slice(startIndex), ...clockwiseRing.slice(0, startIndex)];
  const length = orderedRing.reduce((total, point, index) => {
    const next = orderedRing[(index + 1) % orderedRing.length];
    return total + Math.hypot(next[0] - point[0], next[1] - point[1]);
  }, 0);

  return {
    path: orderedRing.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join("") + "Z",
    length,
  };
}
