export type WalkDifficulty = "estreno" | "pesadilla";

export type DetectionStepInput = Readonly<{
  current: number;
  lineOfSight: boolean;
  distance: number;
  flashlightOn: boolean;
  crouching: boolean;
  deltaSeconds: number;
  difficulty?: WalkDifficulty;
}>;

export type DetectionStepResult = Readonly<{
  meter: number;
  spotted: boolean;
  effectiveRange: number;
}>;

/**
 * Realistic horror stealth visibility range:
 * Turning off the flashlight (F) and crouching (CTRL) dramatically shrinks
 * how far Subject M can spot Raúl down a dark corridor.
 */
export function visualDetectionRange(
  flashlightOn: boolean,
  crouching: boolean,
  difficulty: WalkDifficulty = "estreno",
) {
  const base = flashlightOn
    ? crouching
      ? 13.5
      : 18.5
    : crouching
      ? 4.6
      : 8.5;
  return difficulty === "pesadilla" ? base * 1.18 : base;
}

export function stepDetectionMeter(input: DetectionStepInput): DetectionStepResult {
  const difficulty = input.difficulty ?? "estreno";
  const effectiveRange = visualDetectionRange(
    input.flashlightOn,
    input.crouching,
    difficulty,
  );
  const delta = Math.max(0, Math.min(0.25, input.deltaSeconds));
  const withinRange = input.lineOfSight && input.distance <= effectiveRange;

  if (!withinRange) {
    const next = Math.max(0, input.current - delta * 0.58);
    return { meter: next, spotted: false, effectiveRange };
  }

  // Point-blank contact is instant detection.
  if (input.distance <= 3.4) {
    return { meter: 1, spotted: true, effectiveRange };
  }

  const closeness = 1 - Math.max(0, Math.min(1, input.distance / effectiveRange));
  const postureFactor = input.flashlightOn ? 1.25 : input.crouching ? 0.55 : 0.85;
  const diffFactor = difficulty === "pesadilla" ? 1.3 : 0.92;
  const gainPerSecond = (0.45 + closeness * 1.65) * postureFactor * diffFactor;
  const next = Math.min(1, input.current + delta * gainPerSecond);
  return { meter: next, spotted: next >= 0.99, effectiveRange };
}

/**
 * Flashlight stun ("Estatua"): shining the beam straight at Subject M at
 * close-to-mid range momentarily blinds his optical sensors so Raúl can slip away.
 */
export function isFlashlightDazzle(input: {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  enemyX: number;
  enemyZ: number;
  distance: number;
  flashlightOn: boolean;
  lineOfSight: boolean;
}) {
  if (!input.flashlightOn || !input.lineOfSight) return false;
  if (input.distance < 1.9 || input.distance > 10.5) return false;
  const dx = input.enemyX - input.playerX;
  const dz = input.enemyZ - input.playerZ;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return false;
  const forwardX = -Math.sin(input.playerYaw);
  const forwardZ = -Math.cos(input.playerYaw);
  const dot = (dx / len) * forwardX + (dz / len) * forwardZ;
  // cos(22 deg) ≈ 0.927
  return dot >= 0.925;
}

/** Adaptive speed scaling: tension climbs as Raúl recovers more tapes. */
export function adaptiveEnemySpeed(
  baseSpeed: number,
  tapesHeld: number,
  difficulty: WalkDifficulty = "estreno",
) {
  const tapeBoost = Math.max(0, Math.min(5, tapesHeld)) * 0.045;
  const diffScale = difficulty === "pesadilla" ? 1.12 : 0.94;
  return baseSpeed * (1 + tapeBoost) * diffScale;
}
