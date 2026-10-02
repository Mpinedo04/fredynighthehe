import type { AchievementId } from "../prank-system.mjs";

export type PrankEventMap = {
  "premiere22:achievement": CustomEvent<{ id: AchievementId }>;
  "premiere22:scare-warning": CustomEvent<{ durationMs: number }>;
  "premiere22:scare": CustomEvent<Record<string, never>>;
  "premiere22:power-drain": CustomEvent<{ amount: number }>;
  "premiere22:micro-note": CustomEvent<{ step: number }>;
  "premiere22:hee-burst": CustomEvent<{ layers: number }>;
  "premiere22:hee-count": CustomEvent<{ total: number; session: number }>;
  "premiere22:lean": CustomEvent<{ direction: number }>;
  "premiere22:beat": CustomEvent<{ step: number }>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface WindowEventMap extends PrankEventMap {}
}

function emit<K extends keyof PrankEventMap>(
  name: K,
  detail: PrankEventMap[K]["detail"],
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function unlock(id: AchievementId) {
  emit("premiere22:achievement", { id });
}

/** The Jurassic Park glass trembles: something is coming. */
export function warnScare(durationMs = 1000) {
  emit("premiere22:scare-warning", { durationMs });
}

/** A jumpscare is happening right now: splash the glass and shake the phone. */
export function fireScare() {
  emit("premiere22:scare", {});
  try {
    // Browsers block vibration until the visitor has interacted with the page.
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) return;
    navigator.vibrate?.([0, 90, 40, 220, 60, 120]);
  } catch {
    // Vibration is optional and unsupported on most desktops and iOS.
  }
}

export function drainPower(amount: number) {
  emit("premiere22:power-drain", { amount });
}

export function announceMicroNote(step: number) {
  emit("premiere22:micro-note", { step });
}

export function requestHeeBurst(layers = 8) {
  emit("premiere22:hee-burst", { layers });
}

export function announceHeeCount(total: number, session: number) {
  emit("premiere22:hee-count", { total, session });
}

export function requestLean(direction = 1) {
  emit("premiere22:lean", { direction });
}

/** iOS only exposes the gyroscope after a permission prompt inside a click. */
export function requestMotionPermission() {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return;
  const orientation = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>;
  };
  void orientation.requestPermission?.().catch(() => undefined);
}

export function qaSpeed() {
  if (typeof window === "undefined") return 1;
  return new URLSearchParams(window.location.search).get("qa") === "pranks"
    ? 20
    : 1;
}

export function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be disabled; the pranks still work in memory.
  }
}
