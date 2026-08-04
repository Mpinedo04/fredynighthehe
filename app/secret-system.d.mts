export type SecretId = "nolan" | "nightShift" | "microtonal" | "continuity";
export type ContinuityId = "hero" | "project" | "friends" | "trailer";

export interface SecretProgressV1 {
  version: 1;
  completed: SecretId[];
  continuityFound: ContinuityId[];
  fnafHandled: number[];
  fnafCaught: number[];
  fnafMissed: number;
}

export const SECRET_STORAGE_KEY: string;
export const SECRET_IDS: SecretId[];
export const CONTINUITY_IDS: ContinuityId[];
export const FNAF_MILESTONES: number[];
export const MICRO_TARGETS: ReadonlyArray<readonly [number, number]>;
export function createSecretProgress(): SecretProgressV1;
export function sanitizeSecretProgress(value: unknown): SecretProgressV1;
export function parseSecretProgress(value: string | null): SecretProgressV1;
export function completeSecret(progress: SecretProgressV1, secretId: SecretId): SecretProgressV1;
export function findContinuityClue(progress: SecretProgressV1, clueId: ContinuityId): SecretProgressV1;
export function resolveFnafMilestone(progress: SecretProgressV1, milestone: number, caught: boolean): SecretProgressV1;
export function nextFnafMilestone(scrollDepth: number, handled: number[]): number | null;
export function registerScrollReversal(history: number[], now: number, windowMs?: number): { history: number[]; triggered: boolean };
export function microtoneFromPoint(clientX: number, clientY: number, width: number, height: number): { step: number; octave: number; frequency: number };
export function completedSecretCount(progress: SecretProgressV1): number;
