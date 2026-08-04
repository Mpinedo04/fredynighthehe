export type SubjectMaterialQuality = "low" | "medium" | "high" | "ultra";

export type SubjectTextureVariant = "low" | "high";

type SubjectTextureSetName = "face" | "ivory" | "black-fabric" | "metal";

type SubjectTextureSet = {
  baseColor: string;
  normal: string;
  rm?: string;
  repeat: readonly [number, number];
};

export type SubjectMaterialDefinition = {
  textureSet: SubjectTextureSetName;
  tint: number;
  normalScale: number;
  useBaseColor?: boolean;
  environmentIntensity?: number;
};

const materialRoot = "/models/subject-m22-materials";

function textureSet(
  variant: SubjectTextureVariant,
  name: SubjectTextureSetName,
  repeat: readonly [number, number],
  hasRm = true,
): SubjectTextureSet {
  const prefix = `${materialRoot}/${variant}/${name}`;
  return {
    baseColor: `${prefix}-basecolor.png`,
    normal: `${prefix}-normal.png`,
    ...(hasRm ? { rm: `${prefix}-rm.png` } : {}),
    repeat,
  };
}

export const SUBJECT_TEXTURE_SETS: Record<
  SubjectTextureVariant,
  Record<SubjectTextureSetName, SubjectTextureSet>
> = {
  low: {
    face: textureSet("low", "face", [1, 1], false),
    ivory: textureSet("low", "ivory", [3, 5]),
    "black-fabric": textureSet("low", "black-fabric", [3, 5]),
    metal: textureSet("low", "metal", [3, 3]),
  },
  high: {
    face: textureSet("high", "face", [1, 1], false),
    ivory: textureSet("high", "ivory", [3, 5]),
    "black-fabric": textureSet("high", "black-fabric", [3, 5]),
    metal: textureSet("high", "metal", [3, 3]),
  },
};

export const SUBJECT_MATERIALS = {
  CRACKED_SILICONE_MASK: {
    textureSet: "face",
    tint: 0x68645e,
    normalScale: 0.58,
  },
  AGED_IVORY_SUIT: {
    textureSet: "ivory",
    tint: 0x6d6961,
    normalScale: 0.62,
  },
  IVORY_WORN_EDGES: {
    textureSet: "ivory",
    tint: 0x58564f,
    normalScale: 0.36,
    useBaseColor: false,
  },
  BLACK_PLEATED_FABRIC: {
    textureSet: "black-fabric",
    tint: 0x292c30,
    normalScale: 0.54,
  },
  BRUSHED_ENDOSKELETON: {
    textureSet: "metal",
    tint: 0x697178,
    normalScale: 0.34,
    environmentIntensity: 0.32,
  },
  GREASED_GUNMETAL: {
    textureSet: "metal",
    tint: 0x30363a,
    normalScale: 0.42,
    useBaseColor: false,
    environmentIntensity: 0.18,
  },
  AGED_COPPER: {
    textureSet: "metal",
    tint: 0x76412b,
    normalScale: 0.3,
    useBaseColor: false,
    environmentIntensity: 0.22,
  },
} satisfies Record<string, SubjectMaterialDefinition>;

export function subjectTextureVariant(
  quality: SubjectMaterialQuality,
): SubjectTextureVariant {
  return quality === "low" || quality === "medium" ? "low" : "high";
}

export function subjectTextureAnisotropy(
  quality: SubjectMaterialQuality,
): number {
  if (quality === "low") return 2;
  if (quality === "medium") return 4;
  return 8;
}
