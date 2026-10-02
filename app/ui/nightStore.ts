"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared night-shift state: the topbar clock, the CCTV console in the FNAF
 * world and the secret night-shift objectives all read the same numbers.
 */
export type NightState = {
  power: number;
  clock: string;
  survived: boolean;
  caught: number;
  objectives: number;
  shiftActive: boolean;
};

const SERVER: NightState = {
  power: 100,
  clock: "12 AM",
  survived: false,
  caught: 0,
  objectives: 5,
  shiftActive: false,
};

let state: NightState = SERVER;
const listeners = new Set<() => void>();

export function updateNight(patch: Partial<NightState>) {
  const next = { ...state, ...patch };
  if (Object.keys(patch).every((key) => next[key as keyof NightState] === state[key as keyof NightState])) {
    return;
  }
  state = next;
  listeners.forEach((listener) => listener());
}

export function useNight() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => SERVER,
  );
}
