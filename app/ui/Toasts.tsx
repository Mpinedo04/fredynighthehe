"use client";

import { useSyncExternalStore } from "react";

export type ToastTone = "neutral" | "red" | "blue" | "green" | "amber";

export type Toast = {
  id: number;
  title: string;
  body?: string;
  kicker?: string;
  image?: string;
  tone?: ToastTone;
};

type ToastInput = Omit<Toast, "id"> & { duration?: number; key?: string };

const EMPTY: Toast[] = [];
let toasts: Toast[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();
const keyed = new Map<string, number>();

function publish(next: Toast[]) {
  toasts = next;
  listeners.forEach((listener) => listener());
}

export function dismissToast(id: number) {
  publish(toasts.filter((toast) => toast.id !== id));
  keyed.forEach((value, key) => {
    if (value === id) keyed.delete(key);
  });
}

/**
 * One queue for every note on screen (FNAF, continuity, pranks, real night…),
 * so they stack instead of drawing on top of each other. A `key` replaces the
 * previous toast with the same key instead of stacking a duplicate.
 */
export function showToast({ duration = 3600, key, ...toast }: ToastInput) {
  if (typeof window === "undefined") return -1;
  const id = nextId++;
  const previous = key ? keyed.get(key) : undefined;
  const base = previous ? toasts.filter((item) => item.id !== previous) : toasts;
  publish([...base, { id, ...toast }].slice(-3));
  if (key) keyed.set(key, id);
  window.setTimeout(() => dismissToast(id), duration);
  return id;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export default function ToastStack() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  if (items.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite" data-hee-control>
      {items.map((toast) => (
        <div key={toast.id} className={`toast-card tone-${toast.tone ?? "neutral"}`}>
          {toast.image && <img src={toast.image} alt="" />}
          <div>
            {toast.kicker && <small>{toast.kicker}</small>}
            <strong>{toast.title}</strong>
            {toast.body && <p>{toast.body}</p>}
          </div>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
