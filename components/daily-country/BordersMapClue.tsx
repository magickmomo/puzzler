"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { getDailyCountryCoordinate } from "@/lib/daily-country";
import { centreBoundsOnTarget, getIndexedBounds, type BoundaryBounds, type BoundaryIndexEntry } from "./border-map";
import { createClockwiseTracePath, getPathBounds, type PathBounds } from "./border-trace";

type Point = [number, number];
type Geometry = { type: "Polygon"; coordinates: Point[][] } | { type: "MultiPolygon"; coordinates: Point[][][] };
type BorderIndex = Record<string, BoundaryIndexEntry>;
type BoundaryData = { geometry: Geometry };
type RegionalFeature = { code: string; geometry: Geometry };
type MapShape = { path: string; isTarget: boolean };
type BorderMap = { shapes: MapShape[]; marker: { x: number; y: number } | null; targetBounds: PathBounds | null };
type MapProjection = { longitudeScale: number; scale: number; offsetX: number; offsetY: number };
type RevealPhase = "tracing" | "joining" | "complete";

const MAP_WIDTH = 116;
const MAP_HEIGHT = 100;
const REVEAL_TRANSITION_DURATION_MS = 650;
const COMPLETED_TRACE_HOLD_MS = 260;

function getRings(geometry: Geometry): Point[][] {
  return geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
}

function adjustLongitude(longitude: number, centreLongitude: number): number {
  return longitude + Math.round((centreLongitude - longitude) / 360) * 360;
}

function getBounds(rings: readonly Point[][], centreLongitude: number): BoundaryBounds {
  const points = rings.flat();
  const longitudes = points.map(([longitude]) => adjustLongitude(longitude, centreLongitude));
  const latitudes = points.map(([, latitude]) => latitude);

  return {
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
  };
}

function overlaps(first: BoundaryBounds, second: BoundaryBounds): boolean {
  return first.minLongitude <= second.maxLongitude
    && first.maxLongitude >= second.minLongitude
    && first.minLatitude <= second.maxLatitude
    && first.maxLatitude >= second.minLatitude;
}

function intervalGap(firstMin: number, firstMax: number, secondMin: number, secondMax: number): number {
  return Math.max(0, secondMin - firstMax, firstMin - secondMax);
}

function isNearTarget(first: BoundaryBounds, second: BoundaryBounds, maximumGap: number): boolean {
  return intervalGap(first.minLongitude, first.maxLongitude, second.minLongitude, second.maxLongitude) <= maximumGap
    && intervalGap(first.minLatitude, first.maxLatitude, second.minLatitude, second.maxLatitude) <= maximumGap;
}

function getViewBounds(targetBounds: BoundaryBounds): BoundaryBounds {
  const targetSpan = Math.max(targetBounds.maxLongitude - targetBounds.minLongitude, targetBounds.maxLatitude - targetBounds.minLatitude);
  // Keep the target at almost the same scale as the original silhouette, leaving
  // only a slim contextual edge for adjacent borders and coastlines.
  const padding = Math.max(0.75, targetSpan * 0.07);
  return {
    minLongitude: targetBounds.minLongitude - padding,
    maxLongitude: targetBounds.maxLongitude + padding,
    minLatitude: Math.max(-90, targetBounds.minLatitude - padding),
    maxLatitude: Math.min(90, targetBounds.maxLatitude + padding),
  };
}

function expandBoundsToMapAspect(bounds: BoundaryBounds): BoundaryBounds {
  const centreLatitude = (bounds.minLatitude + bounds.maxLatitude) / 2;
  const longitudeScale = Math.max(0.01, Math.cos(centreLatitude * Math.PI / 180));
  const longitudeSpan = bounds.maxLongitude - bounds.minLongitude;
  const latitudeSpan = bounds.maxLatitude - bounds.minLatitude;
  const requiredLongitudeSpan = latitudeSpan * (MAP_WIDTH / MAP_HEIGHT) / longitudeScale;
  if (longitudeSpan >= requiredLongitudeSpan) return bounds;

  const padding = (requiredLongitudeSpan - longitudeSpan) / 2;
  return {
    ...bounds,
    minLongitude: bounds.minLongitude - padding,
    maxLongitude: bounds.maxLongitude + padding,
  };
}

function createMapProjection(bounds: BoundaryBounds): MapProjection {
  const centreLatitude = (bounds.minLatitude + bounds.maxLatitude) / 2;
  const longitudeScale = Math.max(0.01, Math.cos(centreLatitude * Math.PI / 180));
  const width = (bounds.maxLongitude - bounds.minLongitude) * longitudeScale;
  const height = bounds.maxLatitude - bounds.minLatitude;
  const scale = Math.min(MAP_WIDTH / Math.max(width, 0.001), MAP_HEIGHT / Math.max(height, 0.001));

  return {
    longitudeScale,
    scale,
    offsetX: (MAP_WIDTH - width * scale) / 2,
    offsetY: (MAP_HEIGHT - height * scale) / 2,
  };
}

function projectPoint(longitude: number, latitude: number, bounds: BoundaryBounds, centreLongitude: number, projection: MapProjection): Point {
  return [
    projection.offsetX + (adjustLongitude(longitude, centreLongitude) - bounds.minLongitude) * projection.longitudeScale * projection.scale,
    projection.offsetY + (bounds.maxLatitude - latitude) * projection.scale,
  ];
}

function createMapPath(rings: readonly Point[][], bounds: BoundaryBounds, centreLongitude: number): string {
  const projection = createMapProjection(bounds);
  const format = (value: number) => Number(value.toFixed(2));

  return rings.map((ring) => ring.map(([longitude, latitude], index) => {
    const [x, y] = projectPoint(longitude, latitude, bounds, centreLongitude, projection);
    return `${index === 0 ? "M" : "L"}${format(x)} ${format(y)}`;
  }).join("") + "Z").join("");
}

function getProjectedBounds(rings: readonly Point[][], bounds: BoundaryBounds, centreLongitude: number): PathBounds | null {
  const projection = createMapProjection(bounds);
  let projectedBounds: PathBounds | null = null;

  for (const ring of rings) {
    for (const [longitude, latitude] of ring) {
      const [x, y] = projectPoint(longitude, latitude, bounds, centreLongitude, projection);
      projectedBounds = projectedBounds ? {
        minX: Math.min(projectedBounds.minX, x),
        maxX: Math.max(projectedBounds.maxX, x),
        minY: Math.min(projectedBounds.minY, y),
        maxY: Math.max(projectedBounds.maxY, y),
      } : { minX: x, maxX: x, minY: y, maxY: y };
    }
  }

  return projectedBounds;
}

function createRevealTransform(fallbackBounds: PathBounds | null, targetBounds: PathBounds | null): string | null {
  if (!fallbackBounds || !targetBounds) return null;
  const fallbackOffsetX = (MAP_WIDTH - MAP_HEIGHT) / 2;
  const fallbackWidth = fallbackBounds.maxX - fallbackBounds.minX;
  const fallbackHeight = fallbackBounds.maxY - fallbackBounds.minY;
  const targetWidth = targetBounds.maxX - targetBounds.minX;
  const targetHeight = targetBounds.maxY - targetBounds.minY;
  if (fallbackWidth <= 0 || fallbackHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) return null;

  const scale = Math.min(8, Math.max(1, Math.min(fallbackWidth / targetWidth, fallbackHeight / targetHeight)));
  const fallbackCentreX = fallbackOffsetX + (fallbackBounds.minX + fallbackBounds.maxX) / 2;
  const fallbackCentreY = (fallbackBounds.minY + fallbackBounds.maxY) / 2;
  const targetCentreX = (targetBounds.minX + targetBounds.maxX) / 2;
  const targetCentreY = (targetBounds.minY + targetBounds.maxY) / 2;
  const translateX = fallbackCentreX - scale * targetCentreX;
  const translateY = fallbackCentreY - scale * targetCentreY;
  const format = (value: number) => Number(value.toFixed(4));

  return `${format(scale)} 0 0 ${format(scale)} ${format(translateX)} ${format(translateY)}`;
}

function createBorderMap(features: readonly RegionalFeature[], countryCode: string, expandedContext: boolean): BorderMap | null {
  const target = features.find((feature) => feature.code === countryCode);
  const coordinate = getDailyCountryCoordinate(countryCode);
  if (!target && !coordinate) return null;

  const centreLongitude = coordinate?.longitude ?? 0;
  const targetBounds = target
    ? getBounds(getRings(target.geometry), centreLongitude)
    : {
      minLongitude: centreLongitude - 4,
      maxLongitude: centreLongitude + 4,
      minLatitude: (coordinate?.latitude ?? 0) - 4,
      maxLatitude: (coordinate?.latitude ?? 0) + 4,
    };
  const tightViewBounds = getViewBounds(targetBounds);
  const targetSpan = Math.max(targetBounds.maxLongitude - targetBounds.minLongitude, targetBounds.maxLatitude - targetBounds.minLatitude);
  const nearbyBounds = expandedContext ? features.flatMap((feature) => (
    feature.code === countryCode
      ? []
      : getRings(feature.geometry)
        .map((ring) => getBounds([ring], centreLongitude))
        .filter((bounds) => isNearTarget(bounds, targetBounds, Math.max(0.75, targetSpan * 0.02)))
  )) : [];
  const maximumExpansion = targetSpan * 0.32;
  const contextualViewBounds = nearbyBounds.length > 0 ? {
    minLongitude: Math.max(targetBounds.minLongitude - maximumExpansion, Math.min(tightViewBounds.minLongitude, ...nearbyBounds.map((bounds) => bounds.minLongitude))),
    maxLongitude: Math.min(targetBounds.maxLongitude + maximumExpansion, Math.max(tightViewBounds.maxLongitude, ...nearbyBounds.map((bounds) => bounds.maxLongitude))),
    minLatitude: Math.max(-90, Math.max(targetBounds.minLatitude - maximumExpansion, Math.min(tightViewBounds.minLatitude, ...nearbyBounds.map((bounds) => bounds.minLatitude)))),
    maxLatitude: Math.min(90, Math.min(targetBounds.maxLatitude + maximumExpansion, Math.max(tightViewBounds.maxLatitude, ...nearbyBounds.map((bounds) => bounds.maxLatitude)))),
  } : tightViewBounds;
  const viewBounds = expandBoundsToMapAspect(centreBoundsOnTarget(contextualViewBounds, targetBounds));
  const shapes = features.flatMap((feature) => {
    const visibleRings = getRings(feature.geometry).filter((ring) => overlaps(getBounds([ring], centreLongitude), viewBounds));
    if (visibleRings.length === 0) return [];
    return [{
      path: createMapPath(visibleRings, viewBounds, centreLongitude),
      isTarget: feature.code === countryCode,
    }];
  });

  const markerPoint = !target && coordinate
    ? projectPoint(coordinate.longitude, coordinate.latitude, viewBounds, centreLongitude, createMapProjection(viewBounds))
    : null;
  const marker = markerPoint ? { x: markerPoint[0], y: markerPoint[1] } : null;
  const targetVisibleRings = target
    ? getRings(target.geometry).filter((ring) => overlaps(getBounds([ring], centreLongitude), viewBounds))
    : [];
  const projectedTargetBounds = getProjectedBounds(targetVisibleRings, viewBounds, centreLongitude);

  return { shapes, marker, targetBounds: projectedTargetBounds };
}

export function BordersMapClue({
  countryCode,
  fallbackPath,
  isolated = false,
  revealContext = false,
  className,
}: {
  countryCode: string;
  fallbackPath?: string | null;
  isolated?: boolean;
  revealContext?: boolean;
  className?: string;
}) {
  const [map, setMap] = useState<BorderMap | null | undefined>(undefined);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>(revealContext ? "tracing" : "complete");
  const [hasTraceFinished, setHasTraceFinished] = useState(!revealContext);
  const fallbackBounds = useMemo(() => fallbackPath ? getPathBounds(fallbackPath) : null, [fallbackPath]);
  const targetShape = map?.shapes.find((shape) => shape.isTarget) ?? null;
  const tracePath = useMemo(() => targetShape ? createClockwiseTracePath(targetShape.path) : null, [targetShape]);
  const clipPathId = useId();
  const expandedContext = isolated || revealContext;

  useEffect(() => {
    if (!countryCode) return;
    const controller = new AbortController();
    setMap(undefined);

    void (async () => {
      try {
        const indexResponse = await fetch("/country-borders/10m/index.json", { signal: controller.signal });
        const index: BorderIndex | null = indexResponse.ok ? await indexResponse.json() as BorderIndex : null;
        const coordinate = getDailyCountryCoordinate(countryCode);
        const targetIndexEntry = index?.[countryCode];
        if (!index || !coordinate || !targetIndexEntry) {
          if (!controller.signal.aborted) setMap(null);
          return;
        }

        const indexedTargetBounds = getIndexedBounds(targetIndexEntry.bounds, coordinate.longitude);
        const viewBounds = expandBoundsToMapAspect(centreBoundsOnTarget(getViewBounds(indexedTargetBounds), indexedTargetBounds));
        const regionalCodes = Object.entries(index)
          .filter(([, entry]) => entry.parts.some((bounds) => overlaps(getIndexedBounds(bounds, coordinate.longitude), viewBounds)))
          .map(([code]) => code);
        if (!regionalCodes.includes(countryCode)) regionalCodes.push(countryCode);

        const boundaries = await Promise.all(regionalCodes.map(async (code): Promise<RegionalFeature | null> => {
          const response = await fetch(`/country-borders/10m/${code}.json`, { signal: controller.signal });
          if (!response.ok) return null;
          const data = await response.json() as BoundaryData;
          return data?.geometry ? { code, geometry: data.geometry } : null;
        }));

        if (!controller.signal.aborted) setMap(createBorderMap(boundaries.filter((feature): feature is RegionalFeature => feature !== null), countryCode, expandedContext));
      } catch {
        if (!controller.signal.aborted) setMap(null);
      }
    })();

    return () => controller.abort();
  }, [countryCode, expandedContext]);

  useLayoutEffect(() => {
    setRevealPhase(revealContext ? "tracing" : "complete");
    setHasTraceFinished(!revealContext || !tracePath);
  }, [countryCode, revealContext, tracePath]);

  useEffect(() => {
    if (!revealContext || !hasTraceFinished || !map || revealPhase !== "tracing") return;
    const timer = window.setTimeout(() => setRevealPhase("joining"), COMPLETED_TRACE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [hasTraceFinished, map, revealContext, revealPhase]);

  useEffect(() => {
    if (revealPhase !== "joining" || !map) return;
    const timer = window.setTimeout(() => setRevealPhase("complete"), REVEAL_TRANSITION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [map, revealPhase]);

  if (map === null) return <p className="mt-2 text-xs font-semibold text-slate-500">Regional map unavailable.</p>;
  if (isolated && (map === undefined || fallbackPath === undefined)) return <p className="text-sm font-bold text-slate-500">Loading outline…</p>;
  if (map === undefined && !fallbackPath) return <p className="mt-2 text-xs font-semibold text-slate-500">Loading regional map…</p>;

  const showMap = map !== undefined && map !== null;
  const isTracing = revealContext && revealPhase === "tracing";
  const isJoining = revealContext && revealPhase === "joining";
  const showFallbackCountry = Boolean(fallbackPath) && !showMap;
  const revealTransform = createRevealTransform(fallbackBounds, map?.targetBounds ?? null);
  const showCloseView = isolated || isTracing || isJoining;
  const showFinalView = !isolated && (!revealContext || isJoining || revealPhase === "complete");
  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="hidden"
      role="img"
      aria-label="Unlabelled regional borders map with the target country highlighted"
      className={className ?? "mt-2 h-44 w-full rounded-xl border border-slate-800 bg-slate-950 p-2"}
    >
      <defs>
        <clipPath id={clipPathId}>
          <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        {showFallbackCountry && fallbackPath && (
          <g transform={`translate(${(MAP_WIDTH - MAP_HEIGHT) / 2} 0)`}>
            <path d={fallbackPath} fill="currentColor" fillRule="evenodd" className="text-amber-300" />
          </g>
        )}
        {showMap && (
          <>
            {showCloseView && targetShape && (
              <g transform={revealTransform ? `matrix(${revealTransform})` : undefined} className={isJoining ? "animate-daily-view-out" : undefined}>
                <path d={targetShape.path} fill="#fcd34d" fillRule="evenodd" stroke={isolated || isTracing ? "transparent" : "#ffffff"} strokeWidth="1.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {isTracing && tracePath && (
                  <path
                    d={tracePath.path}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="animate-daily-border-trace"
                    style={{ "--daily-trace-length": tracePath.length } as CSSProperties}
                    onAnimationEnd={() => setHasTraceFinished(true)}
                  />
                )}
              </g>
            )}
            {showFinalView && (
              <g className={isJoining ? "animate-daily-view-in" : undefined}>
                {map.shapes.filter((shape) => !shape.isTarget).map((shape, index) => (
                  <path key={`nearby-${index}`} d={shape.path} fill="#334155" fillRule="evenodd" stroke="#ffffff" strokeWidth="0.45" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                ))}
                {targetShape && <path d={targetShape.path} fill="#fcd34d" fillRule="evenodd" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                {map.marker && <circle cx={map.marker.x} cy={map.marker.y} r="2.25" fill="#fcd34d" stroke="#fef3c7" strokeWidth="0.7" />}
              </g>
            )}
          </>
        )}
      </g>
    </svg>
  );
}
