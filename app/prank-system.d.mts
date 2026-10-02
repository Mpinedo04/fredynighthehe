export type AchievementId =
  | "mute5"
  | "director"
  | "coward"
  | "thriller"
  | "chipmunk"
  | "hee100"
  | "blackout"
  | "sixAm"
  | "realNight"
  | "tabWatch"
  | "flashlight"
  | "ghostPhoto"
  | "closeEncounters"
  | "lean"
  | "take22"
  | "pan"
  | "calor"
  | "credits"
  | "print"
  | "wordHehe"
  | "wordAnnie"
  | "wordFreddy"
  | "word22"
  | "welcomeBack"
  | "moonwalk"
  | "declassified";

export interface Achievement {
  id: AchievementId;
  title: string;
  detail: string;
}

export interface AchievementStateV1 {
  version: 1;
  unlocked: AchievementId[];
}

export type SecretWord = "hehe" | "annie" | "freddy" | "22";
export type DirectorCommand = "cut" | "action";

export interface BirthdayNote {
  step: number;
  beats: number;
  detune: number;
  frequency: number;
}

export const ACHIEVEMENT_STORAGE_KEY: string;
export const HEE_COUNT_STORAGE_KEY: string;
export const VISIT_STORAGE_KEY: string;
export const ACHIEVEMENTS: Achievement[];
export const ACHIEVEMENT_IDS: AchievementId[];
export function achievementById(id: string): Achievement | null;
export function createAchievementState(): AchievementStateV1;
export function sanitizeAchievementState(value: unknown): AchievementStateV1;
export function parseAchievementState(serialized: string | null): AchievementStateV1;
export function unlockAchievement(
  state: AchievementStateV1,
  id: AchievementId,
): { state: AchievementStateV1; isNew: boolean };
export function parseHeeCount(serialized: string | null): number;
export function heePlaybackRate(depth: number, index?: number): number;
export const TAKE_REASONS: string[];
export const FINAL_TAKE: number;
export function takeReason(take: number): string | null;
export const NIGHT_MS_PER_HOUR: number;
export const POWER_FULL_DRAIN_MS: number;
export function nightClock(
  elapsedMs: number,
  msPerHour?: number,
): { hour: number; label: string; survived: boolean };
export function nextPower(
  power: number,
  deltaMs: number,
  fullDrainMs?: number,
  extra?: number,
): number;
export function isRealNight(date: Date): boolean;
export function dayKey(date: Date): string;
export function isNewVisitDay(lastKey: string | null, nowKey: string): boolean;
export const SECRET_WORDS: SecretWord[];
export function matchSecretWord(buffer: string): SecretWord | null;
export const CLOSE_ENCOUNTERS_STEPS: number[];
export function matchCloseEncounters(
  notes: ReadonlyArray<{ step: number; at: number }>,
  windowMs?: number,
): boolean;
export function matchDirectorCommand(transcript: string): DirectorCommand | null;
export function detectClap(sample: {
  peak: number;
  rms: number;
  floor: number;
  sinceLastMs: number;
}): boolean;
export function birthdayMelody(): BirthdayNote[];
export const MICRO_KEYS: string;
export function microKeyStep(key: string): number;
