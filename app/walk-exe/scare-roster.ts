export type ScareMascot = Readonly<{
  id: "ursus-9" | "velvet-r" | "avis-3" | "vulpes-x";
  name: string;
  role: string;
  image: string;
  signal: string;
  screamVariant: number;
  cameraCode: string;
}>;

export type CctvEncounterDecision = Readonly<{
  trigger: boolean;
  roll: number;
  revealDelayMs: number;
  visibleDurationMs: number;
}>;

export const SCARE_ROSTER: readonly ScareMascot[] = [
  {
    id: "ursus-9",
    name: "URSUS-9",
    role: "EL ANFITRION",
    image: "/animatronics/ursus-9.webp",
    signal: "GRUNIDO SUBGRAVE / MANDIBULA DOBLE",
    screamVariant: 0,
    cameraCode: "MASCOT_BEAR_09",
  },
  {
    id: "velvet-r",
    name: "VELVET-R",
    role: "LA BAILARINA",
    image: "/animatronics/velvet-r.webp",
    signal: "SERVO AGUDO / DIENTES DE AGUJA",
    screamVariant: 1,
    cameraCode: "MASCOT_RABBIT_R",
  },
  {
    id: "avis-3",
    name: "AVIS-3",
    role: "LA CANTANTE",
    image: "/animatronics/avis-3.webp",
    signal: "ALTAVOZ ROTO / CHIRRIDO CORAL",
    screamVariant: 2,
    cameraCode: "MASCOT_AVIAN_03",
  },
  {
    id: "vulpes-x",
    name: "VULPES-X",
    role: "EL CORREDOR",
    image: "/animatronics/vulpes-x.webp",
    signal: "AULLIDO METALICO / MOTOR DENTAL",
    screamVariant: 3,
    cameraCode: "MASCOT_VULPINE_X",
  },
] as const;

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

function encounterHash(
  seed: number,
  cameraIndex: number,
  visitCount: number,
) {
  let value =
    Math.trunc(seed) ^
    Math.imul(Math.trunc(cameraIndex) + 1, 0x45d9f3b) ^
    Math.imul(Math.trunc(visitCount) + 17, 0x27d4eb2d);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

/**
 * CCTV encounters are uncommon but cannot stay absent forever. The first
 * camera change is always safe, a scare has a real-time cooldown, and the
 * fifth quiet feed after that cooldown guarantees an encounter.
 */
export function decideCctvEncounter(
  seed: number,
  cameraIndex: number,
  visitCount: number,
  quietVisits: number,
  millisecondsSinceLastEncounter: number,
  motionDetected = false,
): CctvEncounterDecision {
  const hash = encounterHash(seed, cameraIndex, visitCount);
  const roll = hash / 0x1_0000_0000;
  const eligible =
    visitCount >= 2 &&
    millisecondsSinceLastEncounter >= 7_500;
  const chance = motionDetected ? 0.34 : 0.24;
  const trigger = eligible && (quietVisits >= 4 || roll < chance);
  return {
    trigger,
    roll,
    revealDelayMs: 260 + (hash % 420),
    visibleDurationMs: 1_650 + ((hash >>> 9) % 700),
  };
}

export function mascotForCamera(seed: number, cameraIndex: number) {
  const seedRotation = positiveModulo(Math.trunc(seed), SCARE_ROSTER.length);
  return SCARE_ROSTER[
    positiveModulo(seedRotation + Math.trunc(cameraIndex), SCARE_ROSTER.length)
  ];
}

export function mascotForCatch(
  seed: number,
  cameraIndex: number,
  cctvExposureMs: number,
) {
  const exposureRotation = Math.floor(Math.max(0, cctvExposureMs) / 4200);
  return mascotForCamera(seed + exposureRotation * 17, cameraIndex);
}
