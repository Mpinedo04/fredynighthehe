export type ScareMascot = Readonly<{
  id: "ursus-9" | "velvet-r" | "avis-3" | "vulpes-x";
  name: string;
  role: string;
  image: string;
  signal: string;
  screamVariant: number;
  cameraCode: string;
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

