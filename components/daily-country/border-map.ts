export type BoundaryBounds = {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
};

export type BoundaryIndexEntry = {
  bounds: BoundaryBounds;
  parts: BoundaryBounds[];
};

export function getIndexedBounds(bounds: BoundaryBounds, centreLongitude: number): BoundaryBounds {
  const boundsCentre = (bounds.minLongitude + bounds.maxLongitude) / 2;
  const offset = Math.round((centreLongitude - boundsCentre) / 360) * 360;

  return {
    minLongitude: bounds.minLongitude + offset,
    maxLongitude: bounds.maxLongitude + offset,
    minLatitude: bounds.minLatitude,
    maxLatitude: bounds.maxLatitude,
  };
}

export function centreBoundsOnTarget(bounds: BoundaryBounds, targetBounds: BoundaryBounds): BoundaryBounds {
  const longitudeRadius = (bounds.maxLongitude - bounds.minLongitude) / 2;
  const latitudeRadius = (bounds.maxLatitude - bounds.minLatitude) / 2;
  const targetLongitude = (targetBounds.minLongitude + targetBounds.maxLongitude) / 2;
  const targetLatitude = (targetBounds.minLatitude + targetBounds.maxLatitude) / 2;

  return {
    minLongitude: targetLongitude - longitudeRadius,
    maxLongitude: targetLongitude + longitudeRadius,
    minLatitude: targetLatitude - latitudeRadius,
    maxLatitude: targetLatitude + latitudeRadius,
  };
}
