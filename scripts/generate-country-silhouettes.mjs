import { mkdir, readFile, writeFile } from "node:fs/promises";

const [inputPath, outputDirectory] = process.argv.slice(2);

if (!inputPath || !outputDirectory) {
  throw new Error("Usage: node scripts/generate-country-silhouettes.mjs <input.geojson> <output-directory>");
}

const countrySource = await readFile(new URL("../app/data/countries.ts", import.meta.url), "utf8");
const countryCodes = [...countrySource.matchAll(/\["([a-z]{2})",/g)]
  .map((match) => match[1])
  .filter((code) => !code.startsWith("gb-"));
const countries = JSON.parse(await readFile(inputPath, "utf8"));
const overrideDirectory = new URL("../app/data/country-silhouette-overrides/", import.meta.url);
const overrideCodes = ["bb", "mc", "nr", "sm", "va"];
const temporarilyDisabledCodes = new Set(["mh", "tv"]);
const overrideFeatures = new Map(await Promise.all(overrideCodes.map(async (code) => {
  const data = JSON.parse(await readFile(new URL(`${code}.geojson`, overrideDirectory), "utf8"));
  return [code, data.features[0]];
})));

function getPolygons(geometry) {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function getBounds(polygon) {
  const points = polygon.flat();
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  return {
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
    pointCount: points.length,
  };
}

function intervalGap(firstMin, firstMax, secondMin, secondMax) {
  return Math.max(0, secondMin - firstMax, firstMin - secondMax);
}

function longitudeGap(first, second) {
  return Math.min(...[-360, 0, 360].map((offset) => intervalGap(
    first.minLongitude,
    first.maxLongitude,
    second.minLongitude + offset,
    second.maxLongitude + offset,
  )));
}

function getHomeRegionPolygons(polygons) {
  const records = polygons.map((polygon) => ({ polygon, bounds: getBounds(polygon) }));
  const mainland = records.reduce((largest, current) => (
    current.bounds.pointCount > largest.bounds.pointCount ? current : largest
  ));
  const maximumIslandGap = 1;
  const homeRegion = records.filter((candidate) => (
    candidate === mainland || (
      longitudeGap(mainland.bounds, candidate.bounds) <= maximumIslandGap
      && intervalGap(mainland.bounds.minLatitude, mainland.bounds.maxLatitude, candidate.bounds.minLatitude, candidate.bounds.maxLatitude) <= maximumIslandGap
    )
  ));

  return homeRegion.map(({ polygon }) => polygon);
}

function toPath(rings) {
  const adjustedRings = rings.map((ring) => {
    const anchor = ring[0][0];
    return ring.map(([longitude, latitude]) => [
      longitude + Math.round((anchor - longitude) / 360) * 360,
      latitude,
    ]);
  });
  const points = adjustedRings.flat();
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const width = Math.max(maxLongitude - minLongitude, 0.0001);
  const height = Math.max(maxLatitude - minLatitude, 0.0001);
  const scale = 88 / Math.max(width, height);
  const offsetX = (100 - width * scale) / 2;
  const offsetY = (100 - height * scale) / 2;
  const format = (value) => Number(value.toFixed(2));

  return adjustedRings.map((ring) => ring.map(([longitude, latitude], index) => (
    `${index === 0 ? "M" : "L"}${format(offsetX + (longitude - minLongitude) * scale)} ${format(offsetY + (maxLatitude - latitude) * scale)}`
  )).join("") + "Z").join("");
}

function getFeatureForCode(code) {
  const upperCode = code.toUpperCase();
  const exactMatch = countries.features.find((feature) => feature.properties.ISO_A2 === upperCode);
  if (exactMatch) return exactMatch;

  const countryFallback = countries.features.find((feature) => (
    feature.properties.ISO_A2_EH === upperCode && feature.properties.TYPE === "Country"
  ));
  if (countryFallback) return countryFallback;

  return countries.features.find((feature) => feature.properties.ISO_A2_EH === upperCode);
}

const silhouettes = countryCodes.filter((code) => !temporarilyDisabledCodes.has(code)).map((code) => {
  const feature = overrideFeatures.get(code) ?? getFeatureForCode(code);
  if (!feature) throw new Error(`Missing Natural Earth geometry for ${code}.`);
  const allPolygons = getPolygons(feature.geometry);
  const polygons = getHomeRegionPolygons(allPolygons);
  return [code, toPath(polygons.flat())];
});

await mkdir(outputDirectory, { recursive: true });
await Promise.all(silhouettes.map(([code, path]) => (
  writeFile(`${outputDirectory}/${code}.json`, JSON.stringify({ path }))
)));
