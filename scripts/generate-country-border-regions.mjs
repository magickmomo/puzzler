import { mkdir, readFile, writeFile } from "node:fs/promises";

const [inputPath, outputDirectory] = process.argv.slice(2);

if (!inputPath || !outputDirectory) {
  throw new Error("Usage: node scripts/generate-country-border-regions.mjs <input.geojson> <output-directory>");
}

const countrySource = await readFile(new URL("../app/data/countries.ts", import.meta.url), "utf8");
const countryCodes = [...countrySource.matchAll(/\["([a-z]{2})",/g)]
  .map((match) => match[1])
  .filter((code) => !code.startsWith("gb-") && !["mh", "tv"].includes(code));
const countries = JSON.parse(await readFile(inputPath, "utf8"));
const overrideDirectory = new URL("../app/data/country-silhouette-overrides/", import.meta.url);
const overrideCodes = ["bb", "mc", "nr", "sm", "va"];
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

  return records.filter((candidate) => (
    candidate === mainland || (
      longitudeGap(mainland.bounds, candidate.bounds) <= 1
      && intervalGap(mainland.bounds.minLatitude, mainland.bounds.maxLatitude, candidate.bounds.minLatitude, candidate.bounds.maxLatitude) <= 1
    )
  )).map(({ polygon }) => polygon);
}

function getBoundaryParts(polygons) {
  const maximumPointsPerPart = 250;
  return polygons.flatMap((polygon) => polygon.flatMap((ring) => {
    const parts = [];
    for (let index = 0; index < ring.length - 1; index += maximumPointsPerPart) {
      const points = ring.slice(index, Math.min(ring.length, index + maximumPointsPerPart + 1));
      if (points.length > 1) parts.push(getBounds([points]));
    }
    return parts;
  }));
}

function getFeatureForCode(code) {
  const upperCode = code.toUpperCase();
  const exactMatch = countries.features.find((feature) => feature.properties.ISO_A2 === upperCode);
  if (exactMatch) return exactMatch;

  const countryFallback = countries.features.find((feature) => (
    feature.properties.ISO_A2_EH === upperCode && feature.properties.TYPE === "Country"
  ));
  return countryFallback ?? countries.features.find((feature) => feature.properties.ISO_A2_EH === upperCode);
}

await mkdir(outputDirectory, { recursive: true });
const index = {};

await Promise.all(countryCodes.map(async (code) => {
  const sourceFeature = overrideFeatures.get(code) ?? getFeatureForCode(code);
  if (!sourceFeature) throw new Error(`Missing Natural Earth geometry for ${code}.`);

  const allPolygons = getPolygons(sourceFeature.geometry);
  const displayPolygons = code === "ca" ? allPolygons : getHomeRegionPolygons(allPolygons);
  const bounds = getBounds(displayPolygons.flat());
  index[code] = {
    bounds: {
      minLongitude: bounds.minLongitude,
      maxLongitude: bounds.maxLongitude,
      minLatitude: bounds.minLatitude,
      maxLatitude: bounds.maxLatitude,
    },
    parts: getBoundaryParts(allPolygons).map((partBounds) => {
      return {
        minLongitude: partBounds.minLongitude,
        maxLongitude: partBounds.maxLongitude,
        minLatitude: partBounds.minLatitude,
        maxLatitude: partBounds.maxLatitude,
      };
    }),
  };
  await writeFile(`${outputDirectory}/${code}.json`, JSON.stringify({ geometry: { type: "MultiPolygon", coordinates: allPolygons } }));
}));

await writeFile(`${outputDirectory}/index.json`, JSON.stringify(index));
