// All coordinates are metres. The camera and both rail meshes share this path.
export const START_Z = 8;
export const JUNCTION_LENGTH = 96;
export const TILE_LENGTH = 256;
export const END_Z = START_Z - TILE_LENGTH;
export const PEOPLE_Z = -42;
export const GAUGE = 1.6;
export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const smooth = (t) => {
  const u = clamp(t);
  return u * u * (3 - 2 * u);
};

export function centerAtZ(choice, z) {
  const outward = smooth((-z - 4) / 32);
  const inward = smooth((-z - 48) / 32);
  return { x: choice === "switch" ? 8 * outward * (1 - inward) : 0, z };
}
export function nextOrigin(origin, choice) {
  return {
    x: origin.x,
    z: origin.z - TILE_LENGTH,
  };
}
export function makeRoute(
  choice,
  origin = { x: 0, z: 0 },
  trackLength = TILE_LENGTH,
) {
  const points = [];
  let length = 0,
    impactDistance = 0;
  // 0.1 metre steps put the impact plane exactly on the table at z=-41.
  for (let i = 0; i <= trackLength * 10; i++) {
    const local = centerAtZ(choice, START_Z - i / 10);
    const position = { x: local.x + origin.x, z: local.z + origin.z };
    if (i)
      length += Math.hypot(
        position.x - points[i - 1].x,
        position.z - points[i - 1].z,
      );
    points.push({ ...position, distance: length });
    if (i === 490) impactDistance = length;
  }
  return { points, length, impactDistance };
}
export function sampleRoute(route, distance) {
  const d = clamp(distance, 0, route.length);
  let low = 0,
    high = route.points.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (route.points[mid].distance <= d) low = mid;
    else high = mid;
  }
  const a = route.points[low],
    b = route.points[high];
  const span = b.distance - a.distance,
    t = (d - a.distance) / span;
  return {
    position: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t },
    tangent: { x: (b.x - a.x) / span, z: (b.z - a.z) / span },
  };
}
export function journeyDistance(seconds, length, duration) {
  const t = clamp(seconds, 0, duration),
    ramp = Math.min(1.2, duration / 3);
  const speed = length / (duration - ramp);
  if (t < ramp) return (speed * t * t) / (2 * ramp);
  if (t > duration - ramp)
    return length - (speed * (duration - t) ** 2) / (2 * ramp);
  return speed * (t - ramp / 2);
}
export function switchBladePoint(side, fraction, alignment) {
  const t = clamp(fraction),
    aligned = clamp(alignment);
  const toe = (side * GAUGE) / 2 + (side < 0 ? aligned : aligned - 1) * 0.28;
  const heel = side < 0 ? -GAUGE / 2 : centerAtZ("switch", -12).x + GAUGE / 2;
  return { x: toe + (heel - toe) * smooth(t), z: -4 - 8 * t };
}

export function makeStationRoute(rounds) {
  const startZ = START_Z - TILE_LENGTH * (rounds - 1) - JUNCTION_LENGTH;
  const length = 48;
  return {
    points: [
      { x: 0, z: startZ, distance: 0 },
      { x: 0, z: startZ - length, distance: length },
    ],
    length,
    bufferZ: startZ - length - 8,
  };
}
