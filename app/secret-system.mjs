export const SECRET_STORAGE_KEY = "premiere22.secret-extras.v1";

export const SECRET_IDS = [
  "nolan",
  "nightShift",
  "microtonal",
  "continuity",
];

export const CONTINUITY_IDS = ["hero", "project", "friends", "trailer"];
export const FNAF_MILESTONES = [28, 42, 56, 70, 84];

export const MICRO_TARGETS = [
  [39, 31], [34, 27], [29, 30], [27, 37], [30, 43], [35, 48],
  [40, 54], [41, 62], [36, 68], [30, 69], [27, 64], [28, 58],
  [59, 31], [54, 27], [49, 30], [47, 37], [50, 43], [55, 48],
  [60, 54], [61, 62], [56, 68], [50, 69], [47, 64], [48, 58],
];

export function createSecretProgress() {
  return {
    version: 1,
    completed: [],
    continuityFound: [],
    fnafHandled: [],
    fnafCaught: [],
    fnafMissed: 0,
  };
}

function uniqueAllowed(values, allowed) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => allowed.includes(value)))];
}

export function sanitizeSecretProgress(value) {
  const clean = createSecretProgress();
  if (!value || typeof value !== "object" || value.version !== 1) return clean;

  clean.completed = uniqueAllowed(value.completed, SECRET_IDS);
  clean.continuityFound = uniqueAllowed(value.continuityFound, CONTINUITY_IDS);
  clean.fnafHandled = uniqueAllowed(value.fnafHandled, FNAF_MILESTONES);
  clean.fnafCaught = uniqueAllowed(value.fnafCaught, FNAF_MILESTONES).filter(
    (milestone) => clean.fnafHandled.includes(milestone),
  );
  clean.fnafMissed = Math.max(
    0,
    Math.min(
      clean.fnafHandled.length,
      Number.isFinite(value.fnafMissed) ? Math.floor(value.fnafMissed) : 0,
    ),
  );

  if (clean.continuityFound.length === CONTINUITY_IDS.length) {
    clean.completed = uniqueAllowed([...clean.completed, "continuity"], SECRET_IDS);
  }
  return clean;
}

export function parseSecretProgress(serialized) {
  try {
    return sanitizeSecretProgress(JSON.parse(serialized ?? "null"));
  } catch {
    return createSecretProgress();
  }
}

export function completeSecret(progress, secretId) {
  return sanitizeSecretProgress({
    ...progress,
    completed: [...progress.completed, secretId],
  });
}

export function findContinuityClue(progress, clueId) {
  return sanitizeSecretProgress({
    ...progress,
    continuityFound: [...progress.continuityFound, clueId],
  });
}

export function resolveFnafMilestone(progress, milestone, caught) {
  if (progress.fnafHandled.includes(milestone)) {
    return sanitizeSecretProgress(progress);
  }
  return sanitizeSecretProgress({
    ...progress,
    fnafHandled: [...progress.fnafHandled, milestone],
    fnafCaught: caught
      ? [...progress.fnafCaught, milestone]
      : progress.fnafCaught,
    fnafMissed: progress.fnafMissed + (caught ? 0 : 1),
  });
}

export function nextFnafMilestone(scrollDepth, handled) {
  return FNAF_MILESTONES.find(
    (milestone) => scrollDepth >= milestone && !handled.includes(milestone),
  ) ?? null;
}

export function registerScrollReversal(history, now, windowMs = 1400) {
  const next = [...history.filter((timestamp) => now - timestamp <= windowMs), now];
  return {
    history: next,
    triggered: next.length >= 3,
  };
}

export function microtoneFromPoint(clientX, clientY, width, height) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const normalizedX = Math.max(0, Math.min(0.999999, clientX / safeWidth));
  const normalizedY = Math.max(0, Math.min(0.999999, clientY / safeHeight));
  const step = Math.min(23, Math.floor(normalizedX * 24));
  const octave = normalizedY < 1 / 3 ? 2 : normalizedY < 2 / 3 ? 1 : 0;
  return {
    step,
    octave,
    frequency: 55 * 2 ** octave * 2 ** (step / 24),
  };
}

export function completedSecretCount(progress) {
  return uniqueAllowed(progress.completed, SECRET_IDS).length;
}
