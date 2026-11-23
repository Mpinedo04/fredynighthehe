export type VirtualLightSource = Readonly<{
  id: string;
  x: number;
  y: number;
  z: number;
  color: number;
  intensity: number;
  distance: number;
  priority?: number;
  active?: boolean;
}>;

export type SelectedPoolLight = VirtualLightSource & Readonly<{
  distSq: number;
}>;

/**
 * Pure light-pool selector: picks at most `maxLights` (default 3) closest
 * active light sources to the camera/player so Three.js forward shaders never
 * suffer the 25+ PointLight GPU bottleneck.
 */
export function selectActivePoolLights(
  sources: readonly VirtualLightSource[],
  originX: number,
  originZ: number,
  maxLights = 3,
  maxRadius = 24,
): SelectedPoolLight[] {
  const limitSq = maxRadius * maxRadius;
  const candidates: SelectedPoolLight[] = [];

  for (const source of sources) {
    if (source.active === false || source.intensity <= 0.01) continue;
    const dx = source.x - originX;
    const dz = source.z - originZ;
    const distSq = dx * dx + dz * dz;
    if (distSq > limitSq) continue;
    candidates.push({ ...source, distSq });
  }

  candidates.sort((a, b) => {
    const scoreA = a.distSq / Math.max(0.25, a.priority ?? 1);
    const scoreB = b.distSq / Math.max(0.25, b.priority ?? 1);
    return scoreA - scoreB;
  });

  return candidates.slice(0, Math.max(0, maxLights));
}
