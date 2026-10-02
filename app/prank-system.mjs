export const ACHIEVEMENT_STORAGE_KEY = "premiere22.achievements.v1";
export const HEE_COUNT_STORAGE_KEY = "premiere22.hee-count.v1";
export const VISIT_STORAGE_KEY = "premiere22.visits.v1";

export const ACHIEVEMENTS = [
  { id: "mute5", title: "NO PUEDES HUIR DEL RITMO", detail: "Intentaste callar a MJ cinco veces." },
  { id: "director", title: "DIRECTOR AL MANDO", detail: "Cortaste el hee-hee como un profesional." },
  { id: "coward", title: "COBARDE, PERO VALE", detail: "Preferiste el botón antes que gritar." },
  { id: "thriller", title: "BANDA SONORA ALTERNATIVA", detail: "Pediste silencio. Te dieron terror-funk." },
  { id: "chipmunk", title: "ARDILLA DEL POP", detail: "Llegaste al fondo con el hee-hee a ×8." },
  { id: "hee100", title: "100 HEE-HEES", detail: "Tus oídos ya pertenecen a Neverland." },
  { id: "blackout", title: "SOBREVIVISTE AL APAGÓN", detail: "La cajita de música sonó para ti." },
  { id: "sixAm", title: "6 AM · YOU SURVIVED", detail: "Turno completo sin dimitir." },
  { id: "realNight", title: "INSOMNE OFICIAL", detail: "Entraste de madrugada. De verdad." },
  { id: "tabWatch", title: "ABANDONASTE EL TURNO", detail: "Te fuiste de la pestaña y alguien entró." },
  { id: "flashlight", title: "MIEDO A LA OSCURIDAD", detail: "Te quedaste quieto demasiado tiempo." },
  { id: "ghostPhoto", title: "¿LO HAS VISTO?", detail: "Pillaste al intruso de la foto." },
  { id: "closeEncounters", title: "ENCUENTRO EN LA TERCERA FASE", detail: "Re · Mi · Do · Do · Sol." },
  { id: "lean", title: "SMOOTH CRIMINAL", detail: "Inclinaste la premiere 45 grados." },
  { id: "take22", title: "TOMA 22", detail: "Veintiuna tomas falsas. Una buena." },
  { id: "pan", title: "EL PAN TA' DURO", detail: "Rompiste la pantalla con una barra de pan." },
  { id: "calor", title: "¿QUÉ CALOREH?", detail: "Te quedaste tanto que se recalentó el plató." },
  { id: "credits", title: "TE TRAGASTE LOS CRÉDITOS", detail: "Los viste enteros. Como debe ser." },
  { id: "print", title: "IMPRESOR DE FREDDYS", detail: "Intentaste imprimir la premiere." },
  { id: "wordHehe", title: "PALABRA SECRETA · HEHE", detail: "Lo invocaste tú solito." },
  { id: "wordAnnie", title: "PALABRA SECRETA · ANNIE", detail: "Annie, are you OK?" },
  { id: "wordFreddy", title: "PALABRA SECRETA · FREDDY", detail: "Freddy se ha reído contigo." },
  { id: "word22", title: "PALABRA SECRETA · 22", detail: "Confeti reglamentario." },
  { id: "welcomeBack", title: "HAS VUELTO", detail: "Freddy te echaba de menos." },
  { id: "moonwalk", title: "PASADIZO M00NW4LK", detail: "Te persiguió un animatrónico en moonwalk." },
  { id: "declassified", title: "EXPEDIENTE FILTRADO", detail: "Quitaste todas las barras negras." },
];

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((achievement) => achievement.id);

export function achievementById(id) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id) ?? null;
}

export function createAchievementState() {
  return { version: 1, unlocked: [] };
}

export function sanitizeAchievementState(value) {
  const clean = createAchievementState();
  if (!value || typeof value !== "object" || value.version !== 1) return clean;
  if (!Array.isArray(value.unlocked)) return clean;
  clean.unlocked = [
    ...new Set(value.unlocked.filter((id) => ACHIEVEMENT_IDS.includes(id))),
  ];
  return clean;
}

export function parseAchievementState(serialized) {
  try {
    return sanitizeAchievementState(JSON.parse(serialized ?? "null"));
  } catch {
    return createAchievementState();
  }
}

export function unlockAchievement(state, id) {
  const clean = sanitizeAchievementState(state);
  if (!ACHIEVEMENT_IDS.includes(id) || clean.unlocked.includes(id)) {
    return { state: clean, isNew: false };
  }
  return {
    state: { ...clean, unlocked: [...clean.unlocked, id] },
    isNew: true,
  };
}

export function parseHeeCount(serialized) {
  const value = Number.parseInt(serialized ?? "0", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The deeper Raúl scrolls, the higher Michael sings: the top of the page keeps
 * the natural sample and the bottom reaches roughly double speed and pitch.
 */
export function heePlaybackRate(depth, index = 0) {
  const normalized = Math.max(0, Math.min(1, depth));
  const jitter = ((index % 5) - 2) * 0.025;
  return Math.round((0.96 + normalized ** 1.6 * 1.14 + jitter) * 1000) / 1000;
}

export const TAKE_REASONS = [
  "FUERA DE FOCO",
  "SE HA VISTO EL MICRO",
  "EL ACTOR HA MIRADO A CÁMARA",
  "HA PASADO UN AVIÓN",
  "FREDDY HA SALIDO EN PLANO",
  "LA CLAQUETA ESTABA AL REVÉS",
  "SE HA FUNDIDO UN FOCO",
  "ALGUIEN HA DICHO HEE-HEE",
  "EL CATERING SE HA COMIDO EL ATREZZO",
  "BALANCE DE BLANCOS: AZUL PITUFO",
  "SPIELBERG HA LLAMADO, CUELGA",
  "LA TOMA ERA BUENA PERO NO ME HA EMOCIONADO",
  "SE HA COLADO UN ANIMATRÓNICO EN EL FONDO",
  "EL PAN TA' DURO Y HA HECHO RUIDO",
  "HACE DEMASIADO CALOREH",
  "SONIDO DIRECTO: SOLO SE OYE UN CUARTO DE TONO",
  "EL GUANTE DE MJ NO RACORDEA",
  "DAVINCI SE HA CERRADO SIN GUARDAR",
  "TODO PERFECTO. OTRA POR SI ACASO",
  "MEDIA OFFLINE",
  "ÚLTIMA. DE VERDAD. LA ÚLTIMA",
];

export const FINAL_TAKE = TAKE_REASONS.length + 1;

export function takeReason(take) {
  if (!Number.isFinite(take) || take < 1 || take >= FINAL_TAKE) return null;
  return TAKE_REASONS[Math.floor(take) - 1];
}

export const NIGHT_MS_PER_HOUR = 100_000;
export const POWER_FULL_DRAIN_MS = 540_000;

export function nightClock(elapsedMs, msPerHour = NIGHT_MS_PER_HOUR) {
  const hour = Math.max(0, Math.min(6, Math.floor(Math.max(0, elapsedMs) / msPerHour)));
  return {
    hour,
    label: hour === 0 ? "12 AM" : `${hour} AM`,
    survived: hour >= 6,
  };
}

export function nextPower(power, deltaMs, fullDrainMs = POWER_FULL_DRAIN_MS, extra = 0) {
  const drained = (Math.max(0, deltaMs) / Math.max(1, fullDrainMs)) * 100 + Math.max(0, extra);
  return Math.max(0, Math.min(100, power - drained));
}

export function isRealNight(date) {
  return date.getHours() < 6;
}

export function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isNewVisitDay(lastKey, nowKey) {
  return typeof lastKey === "string" && lastKey.length > 0 && lastKey !== nowKey;
}

export const SECRET_WORDS = ["hehe", "annie", "freddy", "22"];

export function matchSecretWord(buffer) {
  const normalized = String(buffer ?? "").toLowerCase();
  return SECRET_WORDS.find((word) => normalized.endsWith(word)) ?? null;
}

// Re · Mi · Do · Do · Sol on the 24-step keyboard whose step 0 is A.
export const CLOSE_ENCOUNTERS_STEPS = [10, 14, 6, 6, 20];

function stepDistance(a, b) {
  const difference = Math.abs((((a - b) % 24) + 24) % 24);
  return Math.min(difference, 24 - difference);
}

export function matchCloseEncounters(notes, windowMs = 8000) {
  if (!Array.isArray(notes) || notes.length < CLOSE_ENCOUNTERS_STEPS.length) {
    return false;
  }
  const recent = notes.slice(-CLOSE_ENCOUNTERS_STEPS.length);
  if (recent[recent.length - 1].at - recent[0].at > windowMs) return false;
  return recent.every(
    (note, index) => stepDistance(note.step, CLOSE_ENCOUNTERS_STEPS[index]) <= 1,
  );
}

function normalizeSpeech(transcript) {
  return String(transcript ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function matchDirectorCommand(transcript) {
  const text = normalizeSpeech(transcript);
  const cut = [...text.matchAll(/\bcort(?:en|a|e|ad|ar)\b/g)].pop()?.index ?? -1;
  const action = [...text.matchAll(/\baccion\b/g)].pop()?.index ?? -1;
  if (cut < 0 && action < 0) return null;
  return cut > action ? "cut" : "action";
}

export function detectClap({ peak, rms, floor, sinceLastMs }) {
  if (sinceLastMs < 800) return false;
  if (peak < 0.55 || rms < 0.06) return false;
  if (rms < Math.max(0.01, floor) * 5) return false;
  return peak / Math.max(rms, 0.0001) >= 2.6;
}

// Public-domain melody in C; steps are quarter tones above C4.
const BIRTHDAY_NOTES = [
  [7, 0.75], [7, 0.25], [9, 1], [7, 1], [12, 1], [11, 2],
  [7, 0.75], [7, 0.25], [9, 1], [7, 1], [14, 1], [12, 2],
  [7, 0.75], [7, 0.25], [19, 1], [16, 1], [12, 1], [11, 1], [9, 2],
  [17, 0.75], [17, 0.25], [16, 1], [12, 1], [14, 1], [12, 2],
];
const BIRTHDAY_DETUNE = [
  0, 0, 0, 0, 1, 0,
  0, 0, 0, -1, 0, 0,
  0, 0, 1, 0, 0, -1, 0,
  0, 1, 0, 0, -1, 1,
];

export function birthdayMelody() {
  return BIRTHDAY_NOTES.map(([semitone, beats], index) => {
    const detune = BIRTHDAY_DETUNE[index];
    const step = semitone * 2 + detune;
    return {
      step,
      beats,
      detune,
      frequency: Math.round(261.63 * 2 ** (step / 24) * 100) / 100,
    };
  });
}

// Computer keyboard → 24 quarter-tone steps (two rows and a half of keys).
export const MICRO_KEYS = "1234567890qwertyuiopasdf";

export function microKeyStep(key) {
  if (typeof key !== "string" || key.length !== 1) return -1;
  return MICRO_KEYS.indexOf(key.toLowerCase());
}
