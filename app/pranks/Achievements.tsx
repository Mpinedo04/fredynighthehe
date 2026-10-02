"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_STORAGE_KEY,
  achievementById,
  createAchievementState,
  parseAchievementState,
  unlockAchievement,
  type Achievement,
  type AchievementId,
  type AchievementStateV1,
} from "../prank-system.mjs";
import { playAchievementDing } from "./audio";
import { readStorage, writeStorage } from "./bus";

const SERVER_STATE = createAchievementState();
let state: AchievementStateV1 | null = null;
const listeners = new Set<() => void>();

function current() {
  if (state === null) {
    state = parseAchievementState(readStorage(ACHIEVEMENT_STORAGE_KEY));
  }
  return state;
}

function publish(next: AchievementStateV1) {
  state = next;
  writeStorage(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storeUnlock(id: AchievementId) {
  const result = unlockAchievement(current(), id);
  if (result.isNew) publish(result.state);
  return result.isNew;
}

export function resetAchievements() {
  publish(createAchievementState());
}

export function useAchievements() {
  return useSyncExternalStore(subscribe, current, () => SERVER_STATE);
}

export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.length;

/** Xbox-style toasts: one at a time, with a ding, for every first unlock. */
export default function Achievements() {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [visible, setVisible] = useState<Achievement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleUnlock = (event: WindowEventMap["premiere22:achievement"]) => {
      const achievement = achievementById(event.detail.id);
      if (!achievement || !storeUnlock(achievement.id)) return;
      setQueue((items) => [...items, achievement]);
    };
    window.addEventListener("premiere22:achievement", handleUnlock);
    return () => window.removeEventListener("premiere22:achievement", handleUnlock);
  }, []);

  useEffect(() => {
    if (visible || queue.length === 0) return;
    const [next, ...rest] = queue;
    const show = window.setTimeout(() => {
      setVisible(next);
      setQueue(rest);
      playAchievementDing();
      timerRef.current = window.setTimeout(() => setVisible(null), 3400);
    }, 120);
    return () => window.clearTimeout(show);
  }, [queue, visible]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  if (!visible) return null;
  return (
    <div className="achievement-toast" role="status" data-hee-control key={visible.id}>
      <span className="achievement-medal" aria-hidden="true">🏆</span>
      <div>
        <small>LOGRO DESBLOQUEADO · 22G</small>
        <strong>{visible.title}</strong>
        <p>{visible.detail}</p>
      </div>
    </div>
  );
}
