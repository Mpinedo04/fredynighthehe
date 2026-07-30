export type VentAdvanceResult = {
  distance: number;
  moved: number;
  progress: number;
  atSource: boolean;
  atDestination: boolean;
};

export type BatteryResult = {
  power: number;
  depleted: boolean;
};

export type FixedClockResync = {
  simulationTimeMs: number;
  accumulatorSeconds: number;
  lagBeforeResyncMs: number;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function advanceVentTraversal(
  distance: number,
  totalDistance: number,
  input: number,
  deltaSeconds: number,
  speed = 1.72,
): VentAdvanceResult {
  const total = Math.max(0.0001, finite(totalDistance, 0.0001));
  const previous = clamp(finite(distance), 0, total);
  const direction = clamp(finite(input), -1, 1);
  const delta = Math.max(0, finite(deltaSeconds));
  const metresPerSecond = Math.max(0, finite(speed));
  const next = clamp(
    previous + direction * metresPerSecond * delta,
    0,
    total,
  );
  return {
    distance: next,
    moved: Math.abs(next - previous),
    progress: next / total,
    atSource: next <= 0.0001,
    atDestination: next >= total - 0.0001,
  };
}

export function drainCctvBattery(
  power: number,
  open: boolean,
  deltaSeconds: number,
  drainPerSecond = 1,
): BatteryResult {
  const current = clamp(finite(power), 0, 100);
  if (!open || current <= 0) {
    return { power: current, depleted: current <= 0 };
  }
  const next = clamp(
    current -
      Math.max(0, finite(deltaSeconds)) *
        Math.max(0, finite(drainPerSecond)),
    0,
    100,
  );
  return { power: next, depleted: next <= 0 };
}

export function sequenceProgress(
  nowMs: number,
  startedAtMs: number,
  durationMs: number,
) {
  const duration = Math.max(1, finite(durationMs, 1));
  const progress = clamp(
    (finite(nowMs) - finite(startedAtMs)) / duration,
    0,
    1,
  );
  return {
    progress,
    smooth: progress * progress * (3 - 2 * progress),
    done: progress >= 1,
  };
}

export function resynchronizeFixedClock(
  nowMs: number,
  simulationTimeMs: number,
  accumulatorSeconds: number,
  fixedDeltaSeconds: number,
): FixedClockResync {
  const now = finite(nowMs);
  const simulationTime = finite(simulationTimeMs);
  const fixedDelta = Math.max(0.000001, finite(fixedDeltaSeconds));
  const accumulator = Math.max(0, finite(accumulatorSeconds));
  const remainder = accumulator % fixedDelta;
  const representedNow = simulationTime + accumulator * 1000;
  return {
    simulationTimeMs: now - remainder * 1000,
    accumulatorSeconds: remainder,
    lagBeforeResyncMs: Math.max(0, now - representedNow),
  };
}
