"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CELL_SIZE,
  CROUCH_HEIGHT,
  PLAYER_HEIGHT,
  WALL_HEIGHT,
  WALL_THICKNESS,
  cellCenter2D,
  corridorLineOfSight,
  createAcousticEvent,
  createMaze,
  decideEnemyState,
  extrapolateAcousticTrailCell,
  mazeDistances,
  mazePath,
  openingDirection,
  positionCell2D,
  pruneAcousticEvents,
  resolveGridMovement,
  seededRandom,
  selectAcousticTarget,
  validateMaze,
  type AcousticEvent,
  type AcousticPerception,
  type EnemyState,
  type NoiseKind,
} from "./game-core";
import {
  capsuleVelocityFromInput,
  createCapsuleCollisionWorld,
  createCapsuleState,
  stepCapsuleController,
} from "./capsule-controller";
import { SpatialAudioEngine } from "./spatial-audio";
import {
  TAPES_TO_EXIT,
  WALK_BEST_KEY,
  WALK_TAPES,
  fearLevel,
  formatTimecode,
  rateRun,
  resolveEndingKind,
} from "./run-report";
import {
  ACHIEVEMENT_STORAGE_KEY,
  parseAchievementState,
  unlockAchievement,
  type AchievementId,
} from "../prank-system.mjs";
import {
  advanceVentTraversal,
  drainCctvBattery,
  resynchronizeFixedClock,
  sequenceProgress,
} from "./runtime-core";
import {
  WalkInputController,
  walkInputActionForCode,
  type WalkInputAction,
} from "./input-controller";
import {
  decideCctvEncounter,
  mascotForCamera,
  mascotForCatch,
  type ScareMascot,
} from "./scare-roster";
import {
  SUBJECT_MATERIALS,
  SUBJECT_TEXTURE_SETS,
  subjectTextureAnisotropy,
} from "./subject-materials";
import { computeObjectiveReading } from "./objective-tracker";
import {
  adaptiveEnemySpeed,
  isFlashlightDazzle,
  stepDetectionMeter,
  type WalkDifficulty,
} from "./perception";
import {
  STUDIO_BIOME_ATMOSPHERE,
  STUDIO_GRID_SIZE,
  STUDIO_WINGS,
  buildStudioLayout,
  type StudioBiomeId,
  type StudioEggId,
  type StudioWingId,
} from "./studio-layout";
import { selectActivePoolLights, type VirtualLightSource } from "./light-pool";
import { buildBiomeComplex } from "./biome-builder";
import { buildThemedStudio } from "./level-builder";
import WalkBriefing, {
  type AudioLevels,
  type QualityProfile,
} from "./WalkBriefing";
import WalkHud, { type HudSnapshot } from "./WalkHud";
import WalkCctv, { type MapDot, type WingMapLabel } from "./WalkCctv";
import WalkEnding, { type EndingRunStats } from "./WalkEnding";

type GamePhase = "briefing" | "playing" | "caught" | "escaped";
type CctvEncounterPhase = "idle" | "presence" | "scream";

type RuntimeEcho = {
  mesh: THREE.Group;
  cell: number;
  collected: boolean;
};

type RuntimeTape = {
  mesh: THREE.Group;
  cell: number;
  index: number;
  collected: boolean;
};

type VentTrip = {
  sourceCell: number;
  to: THREE.Vector3;
  destinationCell: number;
  pairIndex: number;
  path: THREE.Vector3[];
  cumulative: number[];
  totalDistance: number;
  distanceAlong: number;
};

type ActiveLure = {
  mesh: THREE.Group;
  cell: number;
  expiresAt: number;
};

type RuntimeNoiseObject = {
  mesh: THREE.Mesh;
  activeUntil: number;
};

type EscapeSequence = {
  startedAt: number;
  playerStart: THREE.Vector3;
  playerEnd: THREE.Vector3;
  slammed: boolean;
  finaleCuePlayed: boolean;
};

type CaughtSequence = {
  startedAt: number;
  subjectStart: THREE.Vector3;
  subjectYaw: number;
};

const JUMPSCARE_DURATION_MS = 1080;
const ESCAPE_DURATION_MS = 4200;

const BOOT_LINES = [
  "> INICIANDO ESTUDIOS PLATÓ 22 (13×13) ........ OK",
  "> CARGANDO 5 ALAS Y POOL DE 3 LUCES .......... OK",
  "> SUJETO M-22 (MODELO GLB + IA) .............. ACTIVO",
  "> 5 CINTAS + 5 ARTEFACTOS DE LORE ............ OCULTOS",
  "> PROTOCOLO ALERTA ROJA Y FINAL 3D ........... ARMADO",
] as const;

const CAMERA_NAMES = [
  "CAM 01 · PLATÓ NEVERLAND",
  "CAM 02 · CRIPTA GHOST (1969)",
  "CAM 03 · CÁMARA 24 TET",
  "CAM 04 · OFICINA FAZBEAR",
  "CAM 05 · ARCHIVO MUERTO",
  "CAM 06 · PUERTA DE ESTRENO",
] as const;

const QUALITY_SETTINGS: Record<
  QualityProfile,
  {
    pixelRatio: number;
    dust: number;
    cctvWidth: number;
    cctvFps: number;
    highTextures: boolean;
  }
> = {
  low: { pixelRatio: 0.85, dust: 120, cctvWidth: 384, cctvFps: 10, highTextures: false },
  medium: { pixelRatio: 1.0, dust: 220, cctvWidth: 512, cctvFps: 12, highTextures: false },
  high: { pixelRatio: 1.2, dust: 340, cctvWidth: 640, cctvFps: 15, highTextures: false },
  ultra: { pixelRatio: 1.45, dust: 520, cctvWidth: 768, cctvFps: 18, highTextures: true },
};

const INITIAL_HUD: HudSnapshot = {
  bpm: 48,
  distance: 99,
  traveled: 0,
  sector: "A-01",
  wing: "booth",
  enemyMode: "patrol",
  echoes: 0,
  tapes: [],
  eggsFound: [],
  hardBreadArmed: false,
  ghostBlessed: false,
  redAlert: false,
  detectionPct: 0,
  stealthState: "lit",
  dazzled: false,
  objective: null,
  interactPrompt: null,
  loreBanner: null,
  prompt: "Explora las cinco alas y recupera 3 cintas de Raúl.",
  difficulty: "estreno",
};

const tapeColor = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

function unlockPremiereAchievement(id: AchievementId) {
  try {
    const state = parseAchievementState(window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY));
    const result = unlockAchievement(state, id);
    if (result.isNew) {
      window.localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(result.state));
    }
  } catch {
    // Storage optional.
  }
}

function vibrateScare() {
  try {
    navigator.vibrate?.([0, 90, 40, 220, 60, 120]);
  } catch {
    // Optional on non-Android devices.
  }
}

function cellCenter(index: number, size = STUDIO_GRID_SIZE) {
  const c = cellCenter2D(index, size, CELL_SIZE);
  return new THREE.Vector3(c.x, 0, c.z);
}

function positionCell(position: THREE.Vector3, size = STUDIO_GRID_SIZE) {
  return positionCell2D(position.x, position.z, size, CELL_SIZE);
}

function sectorForCell(index: number, size = STUDIO_GRID_SIZE) {
  const row = Math.floor(index / size);
  const col = index % size;
  return `${String.fromCharCode(65 + Math.floor(row / 3))}-${String(col + 1).padStart(2, "0")}`;
}

function mat(color: THREE.ColorRepresentation, roughness = 0.72, metalness = 0.12) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  surface: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

/** Fallback procedural rig while subject-m22.glb streams in. */
function createSubjectM() {
  const root = new THREE.Group();
  root.name = "SUJETO_M";
  const black = mat(0x080809, 0.42, 0.45);
  const jacket = mat(0x1b1c20, 0.55, 0.32);
  const chrome = mat(0x72767c, 0.22, 0.9);
  const skin = mat(0x888a82, 0.64, 0.35);
  const white = mat(0xe9e6dd, 0.48, 0.14);
  const red = new THREE.MeshStandardMaterial({
    color: 0x330000,
    emissive: 0xff0909,
    emissiveIntensity: 3,
  });

  const hips = new THREE.Group();
  hips.name = "hips";
  hips.position.y = 1.7;
  root.add(hips);
  addMesh(hips, new THREE.BoxGeometry(0.9, 1.18, 0.46), jacket, [0, 0.28, 0]);
  addMesh(hips, new THREE.BoxGeometry(0.26, 1.02, 0.06), white, [0, 0.28, -0.26]);

  const headPivot = new THREE.Group();
  headPivot.name = "head";
  headPivot.position.set(0, 1.15, 0);
  hips.add(headPivot);
  addMesh(headPivot, new THREE.SphereGeometry(0.39, 16, 12), skin, [0, 0.33, -0.02]).scale.set(0.84, 1.08, 0.88);
  addMesh(headPivot, new THREE.SphereGeometry(0.045, 8, 6), red, [-0.14, 0.37, -0.37]);
  addMesh(headPivot, new THREE.SphereGeometry(0.045, 8, 6), red, [0.14, 0.37, -0.37]);
  const jaw = new THREE.Group();
  jaw.name = "jaw";
  jaw.position.set(0, 0.06, -0.34);
  headPivot.add(jaw);
  addMesh(jaw, new THREE.BoxGeometry(0.32, 0.14, 0.12), chrome, [0, 0, 0]);

  const hat = new THREE.Group();
  hat.name = "hat";
  hat.position.set(0, 0.66, -0.01);
  headPivot.add(hat);
  addMesh(hat, new THREE.CylinderGeometry(0.49, 0.49, 0.055, 20), black, [0, 0, 0]);
  addMesh(hat, new THREE.CylinderGeometry(0.31, 0.37, 0.35, 18), black, [0, 0.18, 0]);
  addMesh(hat, new THREE.CylinderGeometry(0.375, 0.375, 0.055, 18), white, [0, 0.08, 0]);

  const makeArm = (side: -1 | 1, glove: boolean) => {
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? "armLeft" : "armRight";
    shoulder.position.set(side * 0.56, 0.66, 0);
    hips.add(shoulder);
    addMesh(shoulder, new THREE.CapsuleGeometry(0.13, 0.56, 4, 8), jacket, [0, -0.42, 0]);
    addMesh(shoulder, new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), black, [0, -1.1, 0]);
    addMesh(shoulder, new THREE.SphereGeometry(0.15, 10, 8), glove ? white : chrome, [0, -1.5, 0]);
  };
  makeArm(-1, true);
  makeArm(1, false);

  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.name = side < 0 ? "legLeft" : "legRight";
    leg.position.set(side * 0.24, -0.3, 0);
    hips.add(leg);
    addMesh(leg, new THREE.CapsuleGeometry(0.15, 0.64, 4, 8), black, [0, -0.42, 0]);
    addMesh(leg, new THREE.CapsuleGeometry(0.13, 0.6, 4, 8), black, [0, -1.18, 0]);
    addMesh(leg, new THREE.BoxGeometry(0.33, 0.18, 0.64), black, [0, -1.6, -0.14]);
  };
  makeLeg(-1);
  makeLeg(1);

  root.scale.setScalar(1.06);
  return root;
}

function createSubjectMProxy() {
  const proxy = new THREE.Group();
  proxy.name = "SUJETO_M_PROXY";
  const dark = mat(0x060709, 0.48, 0.46);
  const ivory = mat(0xb8b4aa, 0.76, 0.06);
  const eye = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xe30d0d, emissiveIntensity: 2.5 });
  addMesh(proxy, new THREE.BoxGeometry(0.84, 1.15, 0.4), ivory, [0, 2.02, 0]);
  addMesh(proxy, new THREE.CapsuleGeometry(0.14, 1.35, 4, 6), dark, [-0.24, 0.88, 0]);
  addMesh(proxy, new THREE.CapsuleGeometry(0.14, 1.35, 4, 6), dark, [0.24, 0.88, 0]);
  addMesh(proxy, new THREE.SphereGeometry(0.33, 10, 8), ivory, [0, 2.86, 0]);
  addMesh(proxy, new THREE.CylinderGeometry(0.48, 0.48, 0.055, 14), dark, [0, 3.22, 0]);
  addMesh(proxy, new THREE.CylinderGeometry(0.28, 0.34, 0.32, 12), dark, [0, 3.38, 0]);
  addMesh(proxy, new THREE.SphereGeometry(0.05, 6, 6), eye, [-0.12, 2.9, -0.29]);
  addMesh(proxy, new THREE.SphereGeometry(0.05, 6, 6), eye, [0.12, 2.9, -0.29]);
  proxy.scale.setScalar(0.92);
  return proxy;
}

function createSubjectMotionClips() {
  const cyclic = (name: string, duration: number, legSwing: number, armSwing: number, hipsTravel: number) =>
    new THREE.AnimationClip(name, duration, [
      new THREE.NumberKeyframeTrack("legLeft.rotation[x]", [0, duration * 0.25, duration * 0.5, duration * 0.75, duration], [0, legSwing, 0, -legSwing, 0]),
      new THREE.NumberKeyframeTrack("legRight.rotation[x]", [0, duration * 0.25, duration * 0.5, duration * 0.75, duration], [0, -legSwing, 0, legSwing, 0]),
      new THREE.NumberKeyframeTrack("armLeft.rotation[x]", [0, duration * 0.25, duration * 0.5, duration * 0.75, duration], [0, -armSwing, 0, armSwing, 0]),
      new THREE.NumberKeyframeTrack("armRight.rotation[x]", [0, duration * 0.25, duration * 0.5, duration * 0.75, duration], [0, armSwing, 0, -armSwing, 0]),
      new THREE.NumberKeyframeTrack("hips.position[z]", [0, duration * 0.5, duration], [0, hipsTravel, 0]),
    ]);
  return {
    idle: cyclic("idle", 2.4, 0.025, 0.02, 0.012),
    moonwalk: cyclic("moonwalk", 1.18, 0.42, 0.2, -0.12),
    investigate: cyclic("investigate", 0.92, 0.3, 0.18, -0.06),
    chase: cyclic("chase", 0.54, 0.62, 0.48, -0.08),
  };
}

/** Emissive spectral echo — zero PointLights (light pool handles glow). */
function createEcho(color = 0x87d9e9) {
  const ghost = new THREE.Group();
  const glow = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.65,
    transparent: true,
    opacity: 0.48,
    roughness: 0.18,
  });
  addMesh(ghost, new THREE.CapsuleGeometry(0.21, 0.62, 5, 10), glow, [0, 0.84, 0]);
  addMesh(ghost, new THREE.SphereGeometry(0.24, 12, 8), glow, [0, 1.46, 0]);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.42, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  ghost.add(ring);
  return ghost;
}

/** Emissive VHS cassette from Raúl's archive — zero PointLights! */
function createTape(color: number) {
  const tape = new THREE.Group();
  const shell = mat(0x0d0d10, 0.42, 0.35);
  const label = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.3,
    roughness: 0.35,
  });
  const reel = mat(0xe8e4da, 0.5, 0.2);
  const body = new THREE.Group();
  body.position.y = 0.98;
  body.rotation.x = -0.35;
  body.scale.setScalar(1.35);
  addMesh(body, new THREE.BoxGeometry(0.78, 0.46, 0.12), shell, [0, 0, 0]);
  addMesh(body, new THREE.BoxGeometry(0.6, 0.16, 0.01), label, [0, 0.1, 0.065]);
  addMesh(body, new THREE.BoxGeometry(0.6, 0.16, 0.01), label, [0, 0.1, -0.065]);
  addMesh(body, new THREE.BoxGeometry(0.8, 0.03, 0.13), label, [0, 0.235, 0]);
  addMesh(body, new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12), reel, [-0.17, -0.08, 0.065], [Math.PI / 2, 0, 0]);
  addMesh(body, new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12), reel, [0.17, -0.08, 0.065], [Math.PI / 2, 0, 0]);
  tape.add(body);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.54, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.025;
  tape.add(halo);
  tape.userData.body = body;
  return tape;
}

function createSecurityCamera() {
  const camera = new THREE.Group();
  const casing = mat(0x1b2022, 0.42, 0.72);
  const dark = mat(0x090a0a, 0.22, 0.85);
  addMesh(camera, new THREE.BoxGeometry(0.28, 0.18, 0.42), casing, [0, 0, 0]);
  addMesh(camera, new THREE.CylinderGeometry(0.08, 0.08, 0.09, 12), dark, [0, 0, -0.24], [Math.PI / 2, 0, 0]);
  addMesh(
    camera,
    new THREE.CylinderGeometry(0.032, 0.032, 0.09, 10),
    new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xe31616, emissiveIntensity: 2.2 }),
    [0.06, 0.04, -0.24],
    [Math.PI / 2, 0, 0],
  );
  return camera;
}

function createExitDoor() {
  const door = new THREE.Group();
  const steel = mat(0x303336, 0.38, 0.86);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x420606,
    emissive: 0xe01111,
    emissiveIntensity: 1.8,
  });
  addMesh(door, new THREE.BoxGeometry(0.28, 3.35, 0.34), steel, [-1.08, 1.66, 0]);
  addMesh(door, new THREE.BoxGeometry(0.28, 3.35, 0.34), steel, [1.08, 1.66, 0]);
  addMesh(door, new THREE.BoxGeometry(2.44, 0.28, 0.34), steel, [0, 3.22, 0]);
  const panel = new THREE.Group();
  panel.name = "emergencyDoorPanel";
  addMesh(panel, new THREE.BoxGeometry(1.86, 2.9, 0.18), mat(0x090909, 0.8, 0.3), [0, 1.48, 0]);
  addMesh(panel, new THREE.BoxGeometry(1.6, 0.16, 0.1), beaconMat, [0, 2.72, -0.13]);
  addMesh(panel, new THREE.BoxGeometry(0.22, 0.55, 0.18), beaconMat, [0.69, 1.52, -0.16]);
  door.add(panel);
  door.userData.panel = panel;
  door.userData.beaconMat = beaconMat;
  return door;
}

function pointerEventTimestamp(e: ReactPointerEvent<HTMLButtonElement>) {
  return !Number.isFinite(e.timeStamp) || e.timeStamp <= 0
    ? performance.now()
    : e.timeStamp > performance.timeOrigin
      ? e.timeStamp - performance.timeOrigin
      : e.timeStamp;
}

export default function WalkExe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<GamePhase>("briefing");
  const difficultyRef = useRef<WalkDifficulty>("estreno");
  const inputControllerRef = useRef<WalkInputController | null>(null);
  if (inputControllerRef.current === null) {
    inputControllerRef.current = new WalkInputController();
  }
  const mobilePointersRef = useRef(
    new Map<number, { action: WalkInputAction; source: string }>(),
  );
  const interactQueuedRef = useRef(false);
  const dropQueuedRef = useRef(false);
  const objectQueuedRef = useRef(false);
  const tabletRef = useRef(false);
  const cctvIndexRef = useRef(0);
  const cctvFeedRef = useRef<HTMLDivElement>(null);
  const cctvVisitRef = useRef(0);
  const cctvQuietVisitsRef = useRef(0);
  const cctvLastEncounterAtRef = useRef(Number.NEGATIVE_INFINITY);
  const cctvEncounterGenerationRef = useRef(0);
  const cctvEncounterTimersRef = useRef<Set<number>>(new Set());
  const cctvEncounterRef = useRef<ScareMascot | null>(null);
  const cctvEncounterPhaseRef = useRef<CctvEncounterPhase>("idle");
  const audioRef = useRef<SpatialAudioEngine | null>(null);
  const heeBufferRef = useRef<AudioBuffer | null>(null);
  const timecodeRef = useRef<HTMLSpanElement | null>(null);
  const autoStartNextRunRef = useRef(false);
  const qaActionsRef = useRef<{
    triggerRedAlert: () => boolean;
    triggerEscape: () => boolean;
    triggerSecretEscape: () => boolean;
    visitNextBiome: () => string | false;
  } | null>(null);

  const [phase, setPhase] = useState<GamePhase>("briefing");
  const [qaSummary, setQaSummary] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<WalkDifficulty>("estreno");
  const [quality, setQuality] = useState<QualityProfile>("medium");
  const [seed, setSeed] = useState(220722);
  const [runEpoch, setRunEpoch] = useState(0);
  const [bootStep, setBootStep] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [runStats, setRunStats] = useState<EndingRunStats | null>(null);
  const [tabletOpen, setTabletOpen] = useState(false);
  const [cctvIndex, setCctvIndex] = useState(0);
  const [power, setPower] = useState(100);
  const [inVent, setInVent] = useState(false);
  const [ventProgress, setVentProgress] = useState(0);
  const [ventRoute, setVentRoute] = useState("SIN RUTA");
  const [pointerHelp, setPointerHelp] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [motionDetected, setMotionDetected] = useState(false);
  const [signalLost, setSignalLost] = useState(false);
  const [cctvEncounter, setCctvEncounter] = useState<ScareMascot | null>(null);
  const [cctvEncounterPhase, setCctvEncounterPhase] = useState<CctvEncounterPhase>("idle");
  const [activeJumpscare, setActiveJumpscare] = useState<ScareMascot | null>(null);
  const [mapPlayer, setMapPlayer] = useState({ left: 4, top: 4 });
  const [cameraMapPositions, setCameraMapPositions] = useState<Array<{ left: number; top: number }>>([]);
  const [tapeMapMarkers, setTapeMapMarkers] = useState<MapDot[]>([]);
  const [wingMapLabels, setWingMapLabels] = useState<WingMapLabel[]>([]);
  const [exitMapMarker, setExitMapMarker] = useState<{ left: number; top: number } | null>(null);
  const [mapSegments, setMapSegments] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);
  const [audioLevels, setAudioLevels] = useState<AudioLevels>({
    master: 0.84,
    ambience: 0.72,
    music: 0.36,
    sfx: 0.86,
    heartbeat: 0.88,
    jumpscare: 0.7,
  });
  const [message, setMessage] = useState("El motor 3D está preparando las cinco alas del estudio.");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  const clearCctvEncounter = useCallback(() => {
    cctvEncounterGenerationRef.current += 1;
    cctvEncounterTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    cctvEncounterTimersRef.current.clear();
    cctvEncounterRef.current = null;
    cctvEncounterPhaseRef.current = "idle";
    setCctvEncounter(null);
    setCctvEncounterPhase("idle");
  }, []);

  const startAudio = useCallback(() => {
    const engine =
      audioRef.current ??
      new SpatialAudioEngine({ seed, levels: audioLevels });
    audioRef.current = engine;
    engine.setLevels(audioLevels);
    void engine
      .unlock()
      .then((unlocked) => {
        if (!unlocked || audioRef.current !== engine) return;
        engine.startBeds();
        engine.ensureEmitter("subject-m", {
          bus: "sfx",
          gain: 1,
          refDistance: 1.5,
          maxDistance: 40,
          rolloffFactor: 1.4,
        });
        engine.ensureEmitter("metal-impact", {
          bus: "sfx",
          gain: 0.95,
          refDistance: 1.2,
          maxDistance: 35,
          rolloffFactor: 1.5,
        });
        if (!heeBufferRef.current) {
          void engine
            .loadSample("/audio/michael-jackson-hee-hee.mp3")
            .then((buffer) => {
              heeBufferRef.current = buffer;
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        setMessage("El navegador ha bloqueado el audio. El juego continúa en silencio.");
      });
    return engine;
  }, [audioLevels, seed]);

  const primeCctvAudio = useCallback(() => {
    const engine = audioRef.current ?? startAudio();
    const activation = engine.isUnlocked ? engine.resume() : engine.unlock();
    return activation.catch(() => false);
  }, [startAudio]);

  const previewMascotScream = useCallback(
    (mascot: ScareMascot) => {
      const engine = audioRef.current ?? startAudio();
      void primeCctvAudio().then((running) => {
        if (!running || audioRef.current !== engine) {
          setMessage("AUDIO BLOQUEADO · vuelve a pulsar OÍR para autorizar el sonido.");
          return;
        }
        engine.playMascotWarning(mascot.screamVariant);
        engine.playMascotScream(mascot.screamVariant, 0.9);
        setMessage(`PRUEBA DE AUDIO · ${mascot.name} · ${mascot.signal}`);
      });
    },
    [primeCctvAudio, startAudio],
  );

  const setGamePhase = useCallback((next: GamePhase) => {
    inputControllerRef.current?.reset(performance.now());
    mobilePointersRef.current.clear();
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const requestControl = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.focus({ preventScroll: true });
    try {
      const request = canvas.requestPointerLock();
      if (request && typeof request.catch === "function") {
        void request.catch(() => setPointerHelp(true));
      }
    } catch {
      setPointerHelp(true);
    }
  }, []);

  useEffect(() => {
    if (phase !== "briefing") return;
    const timers = BOOT_LINES.map((_, index) =>
      window.setTimeout(() => setBootStep(index + 1), 160 + index * 200),
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      setBootStep(0);
    };
  }, [phase, seed, runEpoch]);

  const beginGame = useCallback(() => {
    startAudio();
    setGamePhase("playing");
    setActiveJumpscare(null);
    setPointerHelp(false);
    setHud((prev) => ({
      ...prev,
      difficulty: difficultyRef.current,
      prompt: "Sigue el rastreador VHS o abre el mapa con [TAB].",
    }));
    requestControl();
    window.requestAnimationFrame(() => {
      canvasRef.current?.focus({ preventScroll: true });
    });
  }, [requestControl, setGamePhase, startAudio]);

  const resetRunState = useCallback(
    (nextSeed: number, immediateStart: boolean) => {
      document.exitPointerLock?.();
      clearCctvEncounter();
      if (audioRef.current) {
        void audioRef.current.cleanup();
        audioRef.current = null;
      }
      heeBufferRef.current = null;
      setRunStats(null);
      setPower(100);
      setTabletOpen(false);
      setInVent(false);
      setVentProgress(0);
      setVentRoute("SIN RUTA");
      setActiveJumpscare(null);
      tabletRef.current = false;
      cctvVisitRef.current = 0;
      cctvQuietVisitsRef.current = 0;
      cctvLastEncounterAtRef.current = Number.NEGATIVE_INFINITY;
      autoStartNextRunRef.current = immediateStart;
      setHud({ ...INITIAL_HUD, difficulty: difficultyRef.current });
      setSeed(nextSeed);
      setRunEpoch((value) => value + 1);
      if (immediateStart) {
        setGamePhase("playing");
      } else {
        setGamePhase("briefing");
        setMessage("El estudio ha reorganizado sus cinco alas.");
      }
    },
    [clearCctvEncounter, setGamePhase],
  );

  const quickRetry = useCallback(() => {
    resetRunState(seed, true);
  }, [resetRunState, seed]);

  const newMaze = useCallback(() => {
    resetRunState(Math.floor(100000 + Math.random() * 899999), false);
  }, [resetRunState]);

  const handleCloseTablet = useCallback(() => {
    tabletRef.current = false;
    setTabletOpen(false);
    clearCctvEncounter();
    requestControl();
  }, [clearCctvEncounter, requestControl]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const inputController = inputControllerRef.current;
    if (!inputController) return;
    const mobilePointers = mobilePointersRef.current;
    const encounterTimers = cctvEncounterTimersRef.current;
    inputController.reset(performance.now());
    mobilePointers.clear();
    setRuntimeError(null);
    setSceneReady(false);

    const GRID = STUDIO_GRID_SIZE;
    let maze = createMaze(seed, GRID);
    let validation = validateMaze(maze, GRID);
    for (let attempt = 1; !validation.valid && attempt < 8; attempt += 1) {
      maze = createMaze(seed + attempt * 104729, GRID);
      validation = validateMaze(maze, GRID);
    }
    if (!validation.valid) {
      setRuntimeError(`MAPA RECHAZADO · ${validation.issues.join(" · ")}`);
      return;
    }

    const layout = buildStudioLayout(maze, seed, GRID);
    const capsuleWorld = createCapsuleCollisionWorld(maze, {
      size: GRID,
      cellSize: CELL_SIZE,
      wallThickness: WALL_THICKNESS,
      standingEyeHeight: PLAYER_HEIGHT,
      crouchingEyeHeight: CROUCH_HEIGHT,
    });
    const random = seededRandom(seed * 7 + 22);
    const graphics = QUALITY_SETTINGS[quality];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const searchParams = new URLSearchParams(window.location.search);
    const qaMode = searchParams.has("qa");
    const qaTapesRaw = searchParams.get("tapes");
    const qaTapes = qaTapesRaw !== null ? Number(qaTapesRaw) : TAPES_TO_EXIT;
    const requiredTapes =
      qaMode && qaTapesRaw !== null
        ? Math.max(0, Math.min(WALK_TAPES.length, Number.isFinite(qaTapes) ? qaTapes : TAPES_TO_EXIT))
        : TAPES_TO_EXIT;

    // Publish CCTV schematic & markers (padded below header so YOU/C6 never collide)
    const gridX = (col: number) => 8 + (col / Math.max(1, GRID - 1)) * 84;
    const gridY = (row: number) => 16 + (row / Math.max(1, GRID - 1)) * 76;
    const cellMapPos = (cell: number) => ({
      left: gridX(cell % GRID),
      top: gridY(Math.floor(cell / GRID)),
    });
    setCameraMapPositions(
      layout.cctvCells.map((cell, idx) => {
        const pos = cellMapPos(cell);
        return idx === 5 ? { left: Math.max(10, pos.left - 6), top: Math.min(93, pos.top + 4) } : pos;
      }),
    );
    setTapeMapMarkers(
      layout.tapeCells.map((cell, index) => ({
        code: WALK_TAPES[index].code,
        color: tapeColor(WALK_TAPES[index].color),
        ...cellMapPos(cell),
        collected: false,
      })),
    );
    setExitMapMarker(cellMapPos(layout.exitCell));
    setWingMapLabels(
      layout.eggPlacements.map((egg) => ({
        id: egg.id,
        short: egg.title,
        color: STUDIO_WINGS[egg.wing].accentCss,
        ...cellMapPos(egg.cell),
        done: false,
      })),
    );

    const schematic: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    maze.forEach((cell, index) => {
      const row = Math.floor(index / GRID);
      const col = index % GRID;
      if (cell.e && col + 1 < GRID) {
        schematic.push({ x1: gridX(col), y1: gridY(row), x2: gridX(col + 1), y2: gridY(row) });
      }
      if (cell.s && row + 1 < GRID) {
        schematic.push({ x1: gridX(col), y1: gridY(row), x2: gridX(col), y2: gridY(row + 1) });
      }
    });
    setMapSegments(schematic);

    // ── Three.js Scene & Performance-First Renderer ─────────────────────────
    const scene = new THREE.Scene();
    const currentBgColor = new THREE.Color(STUDIO_BIOME_ATMOSPHERE.booth.fogHex);
    const targetBgColor = new THREE.Color(STUDIO_BIOME_ATMOSPHERE.booth.fogHex);
    const targetHemiSky = new THREE.Color(STUDIO_BIOME_ATMOSPHERE.booth.hemiSkyHex);
    const targetHemiGround = new THREE.Color(STUDIO_BIOME_ATMOSPHERE.booth.hemiGroundHex);
    const alertBg = new THREE.Color(0x140305);
    scene.background = currentBgColor;
    scene.fog = new THREE.FogExp2(STUDIO_BIOME_ATMOSPHERE.booth.fogHex, STUDIO_BIOME_ATMOSPHERE.booth.fogDensity);

    const camera = new THREE.PerspectiveCamera(
      74,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.06,
      30,
    );
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({
      antialias: quality === "high" || quality === "ultra",
      powerPreference: "high-performance",
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, graphics.pixelRatio));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.info.autoReset = false;
    renderer.domElement.className = "walk-canvas";
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    const cctvTarget = new THREE.WebGLRenderTarget(
      graphics.cctvWidth,
      Math.round((graphics.cctvWidth * 9) / 16),
      { depthBuffer: true, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter },
    );
    cctvTarget.texture.colorSpace = THREE.SRGBColorSpace;
    const cctvDisplayScene = new THREE.Scene();
    const cctvDisplayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const cctvDisplayGeometry = new THREE.PlaneGeometry(2, 2);
    const cctvDisplayMaterial = new THREE.MeshBasicMaterial({ map: cctvTarget.texture, toneMapped: false });
    cctvDisplayScene.add(new THREE.Mesh(cctvDisplayGeometry, cctvDisplayMaterial));

    const world = new THREE.Group();
    scene.add(world);
    const hemiLight = new THREE.HemisphereLight(0x8a9c96, 0x0a0b0d, 0.78);
    scene.add(hemiLight);
    const emergencyLight = new THREE.DirectionalLight(0x748a82, 0.52);
    emergencyLight.position.set(4, 12, 2);
    scene.add(emergencyLight);

    // ── Light Pool: MAXIMUM 3 recycled PointLights for silky 60 FPS! ────────
    const poolLights = Array.from({ length: 3 }, () => {
      const light = new THREE.PointLight(0xffffff, 0, 12, 1.9);
      light.visible = false;
      scene.add(light);
      return light;
    });

    const metalMat = mat(0x282d2c, 0.36, 0.85);
    const boardSpan = GRID * CELL_SIZE;

    // Build all 6 rich architectural biomes (per-biome walls, floors, arches, pipes & 150+ instanced corridor furniture!)
    const biomeComplex = buildBiomeComplex(world, maze, layout, seed);

    // Build the 5 themed horror wings + interactive set pieces!
    const studioEnv = buildThemedStudio(world, maze, layout);

    // Atmospheric dust particles
    const dustPositions = new Float32Array(graphics.dust * 3);
    const halfSpan = boardSpan / 2;
    for (let i = 0; i < graphics.dust; i += 1) {
      dustPositions[i * 3] = (random() - 0.5) * halfSpan * 2;
      dustPositions[i * 3 + 1] = 0.2 + random() * (WALL_HEIGHT - 0.4);
      dustPositions[i * 3 + 2] = (random() - 0.5) * halfSpan * 2;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: 0x9daaa1, size: 0.036, transparent: true, opacity: 0.24, depthWrite: false }),
    );
    world.add(dust);

    // Floor start chevrons
    const start = cellCenter(layout.boothCell, GRID);
    const startOpening = openingDirection(maze[layout.boothCell]);
    const routeGuideMat = new THREE.MeshBasicMaterial({ color: 0x9fcbb0 });
    for (let marker = 0; marker < 3; marker += 1) {
      const longX = startOpening.x !== 0;
      addMesh(
        world,
        new THREE.BoxGeometry(longX ? 0.42 : 0.12, 0.02, longX ? 0.12 : 0.42),
        routeGuideMat,
        [start.x + startOpening.x * (0.65 + marker * 0.5), 0.02, start.z + startOpening.z * (0.65 + marker * 0.5)],
      );
    }

    // 6 CCTV cameras watching the 5 wings + exit
    const cctvCameras: THREE.PerspectiveCamera[] = [];
    layout.cctvCells.forEach((cellIndex, index) => {
      const center = cellCenter(cellIndex, GRID);
      const nextCell = mazePath(maze, cellIndex, layout.exitCell, GRID)[1] ?? cellIndex;
      const target = cellCenter(nextCell, GRID).setY(1.1);
      const housing = createSecurityCamera();
      housing.position.set(center.x + 1.4, 3.05, center.z + 1.4);
      housing.lookAt(target);
      const optical = new THREE.PerspectiveCamera(62, 16 / 9, 0.08, 36);
      optical.position.set(0, 0.08, 0.42);
      optical.rotation.y = Math.PI;
      optical.name = `CCTV_0${index + 1}`;
      housing.add(optical);
      cctvCameras.push(optical);
      world.add(housing);
    });

    // Emergency Premiere Blast Door
    const exit = createExitDoor();
    const exitPosition = cellCenter(layout.exitCell, GRID);
    const exitOpening = openingDirection(maze[layout.exitCell]);
    exit.position.set(exitPosition.x, 0, exitPosition.z);
    exit.rotation.y = exitOpening.yaw;
    world.add(exit);
    const exitPanel = exit.getObjectByName("emergencyDoorPanel");
    const exitBeaconMat = exit.userData.beaconMat as THREE.MeshStandardMaterial | undefined;

    // Virtual light table (all wing lights + exit light + tape lights -> fed to 3-light pool!)
    const exitVirtualLight: {
      id: string;
      x: number;
      y: number;
      z: number;
      color: number;
      intensity: number;
      distance: number;
      priority: number;
      active: boolean;
    } = {
      id: "exit-door",
      x: exitPosition.x,
      y: 2.5,
      z: exitPosition.z,
      color: requiredTapes === 0 ? 0x35ff7a : 0xff1717,
      intensity: 24,
      distance: 12,
      priority: 1.8,
      active: true,
    };
    const virtualLights: VirtualLightSource[] = [...studioEnv.virtualLights, exitVirtualLight];

    // Pooled thrown metal/bread objects
    const noiseObjGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8);
    const noiseObjMat = mat(0x737877, 0.3, 0.88);
    const noiseObjects: RuntimeNoiseObject[] = Array.from({ length: 6 }, () => {
      const mesh = new THREE.Mesh(noiseObjGeo, noiseObjMat);
      mesh.rotation.z = Math.PI / 2;
      mesh.visible = false;
      world.add(mesh);
      return { mesh, activeUntil: 0 };
    });

    // Spectral echoes (no PointLight!)
    const runtimeEchoes: RuntimeEcho[] = layout.echoCells.map((cell, index) => {
      const mesh = createEcho(index % 2 ? 0x7ec6ff : 0xb58bff);
      const center = cellCenter(cell, GRID);
      mesh.position.set(center.x + (random() - 0.5) * 0.6, 0, center.z + (random() - 0.5) * 0.6);
      world.add(mesh);
      return { mesh, cell, collected: false };
    });

    // 5 Tapes of Raúl (no PointLight — registered in virtualLights!)
    const tapeVirtualLights: Array<{
      id: string;
      x: number;
      y: number;
      z: number;
      color: number;
      intensity: number;
      distance: number;
      priority: number;
      active: boolean;
    }> = [];
    const runtimeTapes: RuntimeTape[] = layout.tapeCells.map((cell, index) => {
      const mesh = createTape(WALK_TAPES[index].color);
      const center = cellCenter(cell, GRID);
      mesh.position.set(center.x + (random() - 0.5) * 0.7, 0, center.z + (random() - 0.5) * 0.7);
      mesh.name = `RAUL_TAPE_${WALK_TAPES[index].code}`;
      world.add(mesh);
      const vLight = {
        id: `tape-${index}`,
        x: mesh.position.x,
        y: 1.2,
        z: mesh.position.z,
        color: WALK_TAPES[index].color,
        intensity: 10,
        distance: 8,
        priority: 1.1,
        active: true,
      };
      tapeVirtualLights.push(vLight);
      virtualLights.push(vLight);
      return { mesh, cell, index, collected: false };
    });

    // Maintenance Vents (2 connected shortcut pairs, zero PointLights!)
    const ventMeshes: THREE.Group[] = [];
    const ductRoutes: THREE.Group[] = [];
    const ventByCell = new Map<number, number>();
    const ventGlowMat = new THREE.MeshBasicMaterial({ color: 0x6f98b8 });
    layout.ventPairs.forEach(([first, second], pairIndex) => {
      ventByCell.set(first, second);
      ventByCell.set(second, first);
      [first, second].forEach((cell, side) => {
        const center = cellCenter(cell, GRID);
        const vent = new THREE.Group();
        vent.position.set(center.x + (side ? -1.48 : 1.48), 0.72, center.z);
        vent.rotation.y = side ? Math.PI / 2 : -Math.PI / 2;
        addMesh(vent, new THREE.BoxGeometry(1.22, 1.16, 0.14), metalMat, [0, 0, 0]);
        for (let bar = -2; bar <= 2; bar += 1) {
          addMesh(vent, new THREE.BoxGeometry(0.07, 0.96, 0.05), mat(0x080909, 0.4, 0.9), [bar * 0.22, 0, -0.1]);
        }
        addMesh(vent, new THREE.BoxGeometry(1.0, 0.05, 0.05), ventGlowMat, [0, 0.56, -0.09]);
        vent.userData.cell = cell;
        vent.userData.pair = pairIndex;
        world.add(vent);
        ventMeshes.push(vent);
      });
    });
    layout.ventPairs.forEach((_, pairIndex) => {
      const pairVents = ventMeshes.filter((v) => v.userData.pair === pairIndex);
      if (pairVents.length !== 2) return;
      const first = pairVents[0].position;
      const second = pairVents[1].position;
      const length = Math.hypot(second.x - first.x, second.z - first.z);
      const duct = new THREE.Group();
      duct.position.set((first.x + second.x) / 2, WALL_HEIGHT + 0.78, (first.z + second.z) / 2);
      duct.rotation.y = -Math.atan2(second.z - first.z, second.x - first.x);
      const panel = mat(0x161b1e, 0.55, 0.8);
      addMesh(duct, new THREE.BoxGeometry(length + 1.2, 0.08, 1.36), panel, [0, -0.59, 0]);
      addMesh(duct, new THREE.BoxGeometry(length + 1.2, 0.08, 1.36), panel, [0, 0.59, 0]);
      addMesh(duct, new THREE.BoxGeometry(length + 1.2, 1.22, 0.08), panel, [0, 0, -0.68]);
      addMesh(duct, new THREE.BoxGeometry(length + 1.2, 1.22, 0.08), panel, [0, 0, 0.68]);
      duct.visible = false;
      world.add(duct);
      ductRoutes[pairIndex] = duct;
    });

    // ── Subject M-22 Model (LOD + Pre-compiled low textures by default) ─────
    const subjectDetailSlot = new THREE.Group();
    const subjectFallback = createSubjectM();
    subjectDetailSlot.add(subjectFallback);
    let subjectDetail = subjectFallback;
    const subject = new THREE.LOD();
    subject.addLevel(subjectDetailSlot, 0);
    subject.addLevel(createSubjectMProxy(), 18);
    const enemyPosition = cellCenter(layout.enemyStartCell, GRID);
    subject.position.set(enemyPosition.x, 0, enemyPosition.z);
    world.add(subject);

    let head = subjectDetail.getObjectByName("head");
    let jaw = subjectDetail.getObjectByName("jaw");
    let subjectHat = subjectDetail.getObjectByName("hat");
    let subjectHatBaseY = subjectHat?.position.y ?? 0.77;
    let facePlateLeft = subjectDetail.getObjectByName("facePlateLeft");
    let facePlateRight = subjectDetail.getObjectByName("facePlateRight");
    let chestCore = subjectDetail.getObjectByName("chestCore");
    let servoMaterials: THREE.MeshStandardMaterial[] = [];
    const collectServoMaterials = () => {
      const collected = new Set<THREE.MeshStandardMaterial>();
      subjectDetail.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const surfaces = Array.isArray(object.material) ? object.material : [object.material];
        surfaces.forEach((s) => {
          if (s instanceof THREE.MeshStandardMaterial && s.name === "RED_SERVO_EMISSION") collected.add(s);
        });
      });
      servoMaterials = [...collected];
    };
    collectServoMaterials();

    const pbrTextures = new Set<THREE.Texture>();
    const textureLoader = new THREE.TextureLoader();
    const pbrVariant = graphics.highTextures ? "high" : "low";
    const aniso = Math.min(subjectTextureAnisotropy(quality), renderer.capabilities.getMaxAnisotropy());

    let enemyMixer = new THREE.AnimationMixer(subjectDetail);
    const enemyClips = createSubjectMotionClips();
    const createEnemyActions = (mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[]) => {
      const byName = new Map(clips.map((c) => [c.name, c]));
      return {
        idle: mixer.clipAction(byName.get("idle") ?? enemyClips.idle),
        moonwalk: mixer.clipAction(byName.get("moonwalk") ?? enemyClips.moonwalk),
        investigate: mixer.clipAction(byName.get("investigate") ?? enemyClips.investigate),
        chase: mixer.clipAction(byName.get("chase") ?? enemyClips.chase),
      };
    };
    let enemyActions = createEnemyActions(enemyMixer, Object.values(enemyClips));
    Object.values(enemyActions).forEach((action) => {
      action.enabled = true;
      action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
    });
    let activeEnemyAction = enemyActions.moonwalk;
    activeEnemyAction.play();

    let rigLoadCancelled = false;
    let gltfRigLoaded = false;
    const actionForEnemyState = (state: EnemyState) =>
      state === "chase" || state === "ambush"
        ? enemyActions.chase
        : state === "investigate" || state === "search" || state === "lure" || state === "vent-watch"
          ? enemyActions.investigate
          : state === "listen" || state === "recover"
            ? enemyActions.idle
            : enemyActions.moonwalk;

    const transitionEnemyAnimation = (state: EnemyState) => {
      const nextAction = actionForEnemyState(state);
      if (nextAction === activeEnemyAction) return;
      nextAction.reset().play();
      nextAction.crossFadeFrom(activeEnemyAction, 0.26, true);
      activeEnemyAction = nextAction;
    };

    const loadTex = (url: string, isColor: boolean, repeat: readonly [number, number]) =>
      new Promise<THREE.Texture | null>((resolve) => {
        const tex = textureLoader.load(
          url,
          (loaded) => {
            if (rigLoadCancelled) {
              loaded.dispose();
              resolve(null);
              return;
            }
            loaded.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            loaded.wrapS = THREE.RepeatWrapping;
            loaded.wrapT = THREE.RepeatWrapping;
            loaded.repeat.set(...repeat);
            loaded.anisotropy = aniso;
            pbrTextures.add(loaded);
            resolve(loaded);
          },
          undefined,
          () => {
            tex.dispose();
            resolve(null);
          },
        );
      });

    new GLTFLoader().load(
      "/models/subject-m22.glb",
      (gltf) => {
        if (rigLoadCancelled) return;
        const imported = gltf.scene;
        const hasRig = ["hips", "head", "jaw", "hat", "armLeft", "armRight", "legLeft", "legRight"].every((n) =>
          imported.getObjectByName(n),
        );
        if (!hasRig) return;

        // Disable any PointLights embedded inside the GLB to preserve our strict 3-light budget!
        imported.traverse((obj) => {
          if (obj instanceof THREE.Light) obj.visible = false;
        });

        enemyMixer.stopAllAction();
        enemyMixer.uncacheRoot(subjectDetail);
        subjectFallback.visible = false;
        subjectDetailSlot.add(imported);
        subjectDetail = imported;
        head = subjectDetail.getObjectByName("head");
        jaw = subjectDetail.getObjectByName("jaw");
        subjectHat = subjectDetail.getObjectByName("hat");
        subjectHatBaseY = subjectHat?.position.y ?? 0.75;
        facePlateLeft = subjectDetail.getObjectByName("facePlateLeft");
        facePlateRight = subjectDetail.getObjectByName("facePlateRight");
        chestCore = subjectDetail.getObjectByName("chestCore");
        collectServoMaterials();

        enemyMixer = new THREE.AnimationMixer(subjectDetail);
        enemyActions = createEnemyActions(enemyMixer, gltf.animations);
        Object.values(enemyActions).forEach((action) => {
          action.enabled = true;
          action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
        });
        activeEnemyAction = actionForEnemyState(currentEnemyMode);
        activeEnemyAction.reset().play();
        gltfRigLoaded = true;

        // Apply low/high PBR textures without heavy RoomEnvironment PMREM stall!
        const texSets = SUBJECT_TEXTURE_SETS[pbrVariant];
        void Promise.all(
          (Object.keys(texSets) as Array<keyof typeof texSets>).map(async (setKey) => {
            const set = texSets[setKey];
            const [baseColor, normal] = await Promise.all([
              loadTex(set.baseColor, true, set.repeat),
              loadTex(set.normal, false, set.repeat),
            ]);
            return [setKey, { baseColor, normal }] as const;
          }),
        ).then((entries) => {
          if (rigLoadCancelled) return;
          const loadedMap = new Map(entries);
          const mats = new Map<string, THREE.MeshStandardMaterial[]>();
          imported.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            const arr = Array.isArray(obj.material) ? obj.material : [obj.material];
            arr.forEach((m) => {
              if (m instanceof THREE.MeshStandardMaterial) {
                const list = mats.get(m.name) ?? [];
                list.push(m);
                mats.set(m.name, list);
              }
            });
          });
          Object.entries(SUBJECT_MATERIALS).forEach(([matName, def]) => {
            const targets = mats.get(matName);
            const bundle = loadedMap.get(def.textureSet);
            if (!targets || !bundle) return;
            targets.forEach((surface) => {
              if (bundle.baseColor && (!("useBaseColor" in def) || def.useBaseColor !== false)) {
                surface.map = bundle.baseColor;
                surface.color.setHex(def.tint);
              }
              if (bundle.normal) {
                surface.normalMap = bundle.normal;
                surface.normalScale.setScalar(def.normalScale);
              }
              surface.needsUpdate = true;
            });
          });
          // Pre-compile WebGL shaders while still in briefing to prevent first-sight stutter!
          renderer.compile(scene, camera);
          setSceneReady(true);
        });
      },
      undefined,
      () => {
        renderer.compile(scene, camera);
        setSceneReady(true);
      },
    );

    // Player flashlight (the ONLY SpotLight in the scene!)
    const flashlight = new THREE.SpotLight(0xeef6ee, 138, 22, Math.PI / 5.4, 0.56, 1.5);
    flashlight.position.set(0, -0.08, 0);
    flashlight.target.position.set(0, -0.08, -1);
    camera.add(flashlight);
    camera.add(flashlight.target);
    scene.add(camera);

    // ── Simulation State & Scratch Vectors (ZERO GC inside fixedUpdate!) ────
    const player = new THREE.Vector3(start.x, PLAYER_HEIGHT, start.z);
    let capsuleState = createCapsuleState(capsuleWorld, { x: player.x, z: player.z });
    let yaw = startOpening.yaw;
    let pitch = 0;
    let currentVentHeadingYaw = yaw;
    let traveledDistance = 0;
    let echoesHeld = 0;
    let tapesHeld = 0;
    const tapeIndices: number[] = [];
    const eggsFound: StudioEggId[] = [];
    let hardBreadArmed = false;
    let ghostBlessed = false;
    let redAlert = false;
    let runStartedAt = 0;
    let echoesUsed = 0;
    let objectsThrown = 0;
    let dazzles = 0;
    let closeCalls = 0;
    let inCloseCall = false;
    let peakBpm = 48;
    let lastHeeAt = Number.NEGATIVE_INFINITY;
    let nextGiggleAt = performance.now() + 18000;
    let nextHeartbeat = 0;
    let nextFootstep = 0;
    let nextEnemyStep = 0;
    let lastHudUpdate = 0;
    let lastLightPoolUpdate = 0;
    let lastVentHudUpdate = 0;
    let cctvPower = 100;
    let lastReportedPower = 100;
    let ventTrip: VentTrip | null = null;
    let activeLure: ActiveLure | null = null;
    let escapeSequence: EscapeSequence | null = null;
    let caughtSequence: CaughtSequence | null = null;
    let flashlightEnabled = true;
    let caught = false;
    let escaped = false;
    let draggingLook = false;
    let dragPointerId: number | null = null;
    let dragLastX = 0;
    let dragLastY = 0;
    let pointerWasLocked = false;
    let simulationPaused = document.hidden;
    const FIXED_DELTA = 1 / 60;
    const MAX_FRAME_DELTA = 0.25;
    const MAX_CATCH_UP_STEPS = 10;
    let simulationTime = performance.now();
    let simulationAccumulator = 0;
    let lastRenderTime = performance.now();
    let currentEnemyMode: EnemyState = "patrol";
    let currentEnemySpeed = 1.05;
    let currentPlayerDistance = 99;
    let currentRouteDistance = 99;
    let currentBpm = 48;
    let detectionMeter = 0;
    let dazzledUntil = Number.NEGATIVE_INFINITY;
    let dazzleCooldownUntil = Number.NEGATIVE_INFINITY;
    let banishedUntil = Number.NEGATIVE_INFINITY;
    let acousticEvents: AcousticEvent[] = [];
    let acousticPerception: AcousticPerception | null = null;
    let lastHeardAt = Number.NEGATIVE_INFINITY;
    let lastHeardCell = 0;
    let lastHeardKind: NoiseKind | null = null;
    let predictedHeardCell = 0;
    let lastNoiseDistance = Number.POSITIVE_INFINITY;
    let nextNoisePulseAt = 0;
    let previousSprintCell: number | null = null;
    let latestSprintCell: number | null = null;
    let lastSeenAt = Number.NEGATIVE_INFINITY;
    let lastSeenCell = 0;
    let cctvExposureMs = 0;
    let cctvSignalLost = false;
    let patrolCursor = 0;
    let playerMoving = false;
    let playerSprinting = false;
    let playerCrouching = false;
    let nextObjectDropAt = 0;
    let loreBanner: { kicker: string; text: string; until: number } | null = null;
    let currentPrompt = "Explora las cinco alas y recupera 3 cintas de Raúl.";
    let lastAppliedFov = 74;

    // Cached BFS tables (recomputed ONLY when cells change — kills 180 BFS/s lag!)
    let cachedEnemyCell = -1;
    let cachedPlayerCell = -1;
    let cachedTargetCell = -1;
    let cachedEnemyDistances = mazeDistances(maze, layout.enemyStartCell, GRID);
    let enemyPath = mazePath(maze, layout.enemyStartCell, 0, GRID);
    let lastPathAt = 0;

    // Pre-allocated scratch vectors (ZERO allocations in 60 Hz loop!)
    const tmpPlayerFlat = new THREE.Vector3();
    const tmpEnemyTarget = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();
    const tmpForward = new THREE.Vector3();
    const cctvFrustum = new THREE.Frustum();
    const cctvProjection = new THREE.Matrix4();
    const enemyProbe = new THREE.Vector3();
    const audioForward = new THREE.Vector3();
    const audioUp = new THREE.Vector3();
    const enemyAudioForward = new THREE.Vector3();

    const showLore = (kicker: string, text: string, durationMs = 5400) => {
      loreBanner = { kicker, text, until: performance.now() + durationMs };
    };

    const emitNoise = (kind: NoiseKind, cell: number, now: number) => {
      acousticEvents = pruneAcousticEvents([...acousticEvents, createAcousticEvent(kind, cell, now)], now);
    };

    const playSubjectHee = (gain: number, rate: number) => {
      const buffer = heeBufferRef.current;
      const system = audioRef.current;
      if (!buffer || !system?.isUnlocked) return false;
      return system.playSampleAt("subject-m", buffer, { gain, playbackRate: rate });
    };

    const playClank = (position: THREE.Vector3) => {
      const system = audioRef.current;
      if (!system?.isUnlocked) return;
      system.updateEmitter("metal-impact", {
        position,
        occlusion: corridorLineOfSight(maze, positionCell(player, GRID), positionCell(position, GRID), GRID) ? 0 : 0.72,
      });
      system.playMetalImpact("metal-impact");
    };

    const buildAutopsyTip = () => {
      if (lastHeardKind === "sprint-step" && simulationTime - lastHeardAt < 4000) {
        return "Corriste demasiado cerca: el sprint se oye a 20 celdas. Usa [CTRL] en cruces ciegos.";
      }
      if (flashlightEnabled && !playerCrouching) {
        return "Te vio desde lejos por la linterna encendida. Apaga [F] y agáchate [CTRL] para ocultarte, o enfócale la cara para cegarlo 2 s.";
      }
      if (redAlert) {
        return "Durante la Alerta Roja Sujeto M-22 acelera. Guarda 1 Eco [G] o el Pan Sísmico [Q] para la carrera final.";
      }
      return "Vigila los cruces con [TAB] y aprovecha el Vinilo de Ghost (1969) para repeler a Sujeto M-22 si te acorrala.";
    };

    const reportRun = (escapedRun: boolean, now: number) => {
      const seconds = runStartedAt ? (now - runStartedAt) / 1000 : 0;
      let best: number | null = null;
      let record = false;
      try {
        const previous = Number.parseFloat(window.localStorage.getItem(WALK_BEST_KEY) ?? "");
        best = Number.isFinite(previous) ? previous : null;
        if (escapedRun && difficultyRef.current !== "turista" && (best === null || seconds < best)) {
          record = true;
          best = seconds;
          window.localStorage.setItem(WALK_BEST_KEY, seconds.toFixed(2));
        }
      } catch {
        // Optional.
      }
      const ending = resolveEndingKind({
        escaped: escapedRun,
        tapes: tapesHeld,
        eggsFound: eggsFound.length,
        ghostRelic: ghostBlessed,
      });
      if (escapedRun) unlockPremiereAchievement("walkEscape");
      if (escapedRun && tapesHeld >= WALK_TAPES.length) unlockPremiereAchievement("walkDirectorsCut");
      if (escapedRun && ending === "collectors-cut") unlockPremiereAchievement("walkCollectorEnding");
      if (!escapedRun) unlockPremiereAchievement("walkCaught");

      setRunStats({
        escaped: escapedRun,
        seconds,
        meters: traveledDistance,
        tapes: [...tapeIndices],
        eggsFound: [...eggsFound],
        echoesUsed,
        objectsThrown,
        dazzles,
        closeCalls,
        peakBpm,
        autopsyTip: buildAutopsyTip(),
        grade: rateRun({
          escaped: escapedRun,
          tapes: tapesHeld,
          seconds,
          eggsFound: eggsFound.length,
          ghostRelic: ghostBlessed,
        }),
        best,
        record,
      });
    };

    const triggerCaught = (now: number) => {
      if (caught || escaped || difficultyRef.current === "turista") return;
      const mascot = mascotForCatch(seed, cctvIndexRef.current, cctvExposureMs);
      caught = true;
      caughtSequence = {
        startedAt: now,
        subjectStart: subject.position.clone(),
        subjectYaw: subject.rotation.y,
      };
      inputController.reset(now);
      mobilePointers.clear();
      document.exitPointerLock?.();
      setActiveJumpscare(mascot);
      setMessage(`${mascot.name} ha roto la señal mientras SUJETO M-22 cerraba el pasillo.`);
      audioRef.current?.playJumpscare(1, mascot.screamVariant);
      vibrateScare();
    };

    const dropEcho = (now: number) => {
      if (echoesHeld <= 0 || activeLure || ventTrip) {
        currentPrompt = activeLure ? "Ya hay un eco proyectado." : "No tienes ningún eco espectral.";
        return;
      }
      const ghost = createEcho(0xf2b2ff);
      ghost.scale.setScalar(0.88);
      ghost.position.set(player.x, 0, player.z);
      world.add(ghost);
      echoesHeld -= 1;
      echoesUsed += 1;
      activeLure = { mesh: ghost, cell: positionCell(player, GRID), expiresAt: now + 8200 };
      currentPrompt = "Eco espectral proyectado · Sujeto M-22 se desvía.";
    };

    const dropNoiseObject = (now: number) => {
      if (ventTrip || now < nextObjectDropAt) return;
      const reusable =
        noiseObjects.find((o) => !o.mesh.visible) ??
        noiseObjects.reduce((oldest, o) => (o.activeUntil < oldest.activeUntil ? o : oldest));
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const resolved = resolveGridMovement(
        maze,
        { x: player.x, z: player.z },
        { x: forwardX * 2.5, z: forwardZ * 2.5 },
        GRID,
        CELL_SIZE,
        0.1,
      );
      reusable.mesh.position.set(resolved.x, 0.12, resolved.z);
      reusable.mesh.visible = true;
      reusable.activeUntil = now + 11000;
      const targetCell = positionCell(reusable.mesh.position, GRID);
      nextObjectDropAt = now + 1500;
      objectsThrown += 1;

      if (hardBreadArmed) {
        hardBreadArmed = false;
        audioRef.current?.playHorrorCue("hard-bread");
        emitNoise("exit-alarm", targetCell, now);
        // Also spawn a temporary acoustic lure right at the bread impact!
        if (!activeLure) {
          const ring = createEcho(0xff6b47);
          ring.position.set(resolved.x, 0, resolved.z);
          world.add(ring);
          activeLure = { mesh: ring, cell: targetCell, expiresAt: now + 9500 };
        }
        showLore("RELIQUIA P01 · EL PAN TA' DURO", "IMPACTO SÍSMICO · El estruendo atrae a Sujeto M-22 desde todo el edificio.", 4200);
        currentPrompt = "Barra de pan lanzada · estruendo masivo.";
      } else {
        emitNoise("metal-impact", targetCell, now);
        playClank(reusable.mesh.position);
        currentPrompt = "Pieza metálica lanzada · Sujeto M investiga el ruido.";
      }
    };

    const triggerEgg = (eggId: StudioEggId, now: number) => {
      const egg = studioEnv.eggs.find((e) => e.id === eggId);
      const placement = layout.eggPlacements.find((p) => p.id === eggId);
      if (!egg || !placement) return;
      if (!egg.reusable && egg.used) return;
      if (egg.reusable && now < egg.cooldownUntil) {
        currentPrompt = "Recargando mecanismo del ala...";
        return;
      }

      const isFirst = !eggsFound.includes(eggId);
      if (isFirst) {
        eggsFound.push(eggId);
        setWingMapLabels((prev) =>
          prev.map((w) => (w.id === eggId ? { ...w, done: true } : w)),
        );
      }
      egg.used = true;
      egg.cooldownUntil = now + 22000;
      showLore(placement.title, placement.loreLog, 5600);
      currentPrompt = placement.loreLog;

      if (eggId === "neverland-vitrine") {
        audioRef.current?.playHorrorCue("neverland-chime");
        playSubjectHee(1.1, 0.66);
        unlockPremiereAchievement("walkNeverlandLore");
      } else if (eggId === "ghost-vinyl") {
        ghostBlessed = true;
        cctvPower = Math.min(100, cctvPower + 30);
        lastReportedPower = Math.ceil(cctvPower);
        setPower(lastReportedPower);
        echoesHeld += 1;
        banishedUntil = now + 8000;
        const spinBody = egg.mesh.userData.spinBody as THREE.Object3D | undefined;
        if (spinBody) spinBody.visible = false;
        audioRef.current?.playHorrorCue("ghost-organ");
        unlockPremiereAchievement("walkGhostRelic");
      } else if (eggId === "acoustic-signal") {
        audioRef.current?.playHorrorCue("close-24tet");
        emitNoise("exit-alarm", egg.cell, now);
        if (activeLure) {
          world.remove(activeLure.mesh);
          activeLure = null;
        }
        const wave = createEcho(0xffb347);
        wave.position.copy(egg.position);
        world.add(wave);
        activeLure = { mesh: wave, cell: egg.cell, expiresAt: now + 11000 };
        unlockPremiereAchievement("walkCloseSignal");
      } else if (eggId === "fazbear-honk") {
        cctvPower = 100;
        lastReportedPower = 100;
        setPower(100);
        audioRef.current?.playHorrorCue("honk");
        unlockPremiereAchievement("walkHonk");
      } else if (eggId === "hard-bread") {
        hardBreadArmed = true;
        const loaf = egg.mesh.userData.loaf as THREE.Object3D | undefined;
        if (loaf) loaf.visible = false;
        audioRef.current?.playHorrorCue("hard-bread");
        unlockPremiereAchievement("walkHardBread");
      }
    };

    const interact = (now: number) => {
      tmpPlayerFlat.set(player.x, 0, player.z);

      // 1. Tapes
      const closeTape = runtimeTapes.find(
        (tape) => !tape.collected && tape.mesh.position.distanceTo(tmpPlayerFlat) < 1.65,
      );
      if (closeTape) {
        closeTape.collected = true;
        closeTape.mesh.visible = false;
        tapeVirtualLights[closeTape.index].active = false;
        tapesHeld += 1;
        tapeIndices.push(closeTape.index);
        setTapeMapMarkers((cur) =>
          cur.map((m, idx) => (idx === closeTape.index ? { ...m, collected: true } : m)),
        );
        emitNoise("crouch-step", closeTape.cell, now);
        const tapeInfo = WALK_TAPES[closeTape.index];
        showLore(`CINTA ${tapeInfo.code} · ${tapeInfo.title}`, tapeInfo.lore, 5600);

        if (tapesHeld === requiredTapes && !redAlert) {
          redAlert = true;
          exitVirtualLight.color = 0x35ff7a;
          exitVirtualLight.intensity = 30;
          if (exitBeaconMat) {
            exitBeaconMat.color.setHex(0x0b3d1e);
            exitBeaconMat.emissive.setHex(0x35ff7a);
          }
          audioRef.current?.playHorrorCue("red-alert");
          currentPrompt = "ALERTA ROJA · LA PUERTA DE ESTRENO ESTÁ ABIERTA · ¡CORRE!";
        } else if (tapesHeld === WALK_TAPES.length) {
          audioRef.current?.playChime("unlock");
          currentPrompt = "5/5 CINTAS RECUPERADAS · ESCAPA PARA EL FINAL SECRETO DIRECTOR’S CUT.";
        } else {
          audioRef.current?.playChime("tape");
          currentPrompt = `Cinta «${tapeInfo.title}» recuperada (${tapesHeld}/${WALK_TAPES.length}).`;
        }
        return;
      }

      // 2. Interactive Horror Easter Eggs (5 wings!)
      const closeEgg = studioEnv.eggs.find(
        (egg) =>
          (!egg.used || (egg.reusable && now >= egg.cooldownUntil)) &&
          egg.position.distanceTo(tmpPlayerFlat) < 1.85,
      );
      if (closeEgg) {
        triggerEgg(closeEgg.id, now);
        return;
      }

      // 3. Spectral Echoes
      const closeEcho = runtimeEchoes.find(
        (echo) => !echo.collected && echo.mesh.position.distanceTo(tmpPlayerFlat) < 1.55,
      );
      if (closeEcho) {
        closeEcho.collected = true;
        closeEcho.mesh.visible = false;
        echoesHeld += 1;
        currentPrompt = "Eco estabilizado · pulsa [G] para distraer a Sujeto M-22.";
        return;
      }

      // 4. Maintenance Vents
      const currentCell = positionCell(player, GRID);
      const pairedCell = ventByCell.get(currentCell);
      const closeVent = ventMeshes.some(
        (vent) =>
          vent.userData.cell === currentCell &&
          Math.hypot(vent.position.x - player.x, vent.position.z - player.z) < 2.2,
      );
      if (pairedCell !== undefined && closeVent && !ventTrip) {
        const destination = cellCenter(pairedCell, GRID);
        const sourceVent = ventMeshes.find((v) => v.userData.cell === currentCell);
        const destVent = ventMeshes.find((v) => v.userData.cell === pairedCell);
        if (!sourceVent || !destVent) return;
        const pairIndex = Number(sourceVent.userData.pair ?? 0);
        const ductHeight = WALL_HEIGHT + 0.78;
        const path = [
          sourceVent.position.clone().setY(ductHeight),
          destVent.position.clone().setY(ductHeight),
        ];
        player.copy(path[0]);
        const totalDistance = path[0].distanceTo(path[1]);
        const ductDir = path[1].clone().sub(path[0]);
        if (Math.hypot(ductDir.x, ductDir.z) > 0.05) {
          currentVentHeadingYaw = Math.atan2(ductDir.x, ductDir.z) + Math.PI;
          yaw = currentVentHeadingYaw;
        }
        pitch = 0;
        if (ductRoutes[pairIndex]) ductRoutes[pairIndex].visible = true;
        ventTrip = {
          sourceCell: currentCell,
          to: destination.clone().setY(0.72),
          destinationCell: pairedCell,
          pairIndex,
          path,
          cumulative: [0, totalDistance],
          totalDistance,
          distanceAlong: 0,
        };
        emitNoise("vent-rattle", currentCell, now);
        setInVent(true);
        setVentProgress(0);
        setVentRoute(`${sectorForCell(currentCell, GRID)} → ${sectorForCell(pairedCell, GRID)}`);
        currentPrompt = "En conducto: W/S desplaza · A/D o ratón giran.";
        return;
      }

      // 5. Emergency Premiere Blast Door
      if (exitPosition.distanceTo(tmpPlayerFlat) < 1.75) {
        if (tapesHeld < requiredTapes) {
          const missing = requiredTapes - tapesHeld;
          audioRef.current?.playChime("locked");
          playClank(exitPosition);
          emitNoise("metal-impact", layout.exitCell, now);
          currentPrompt = `PUERTA SIN ENERGÍA · FALTAN ${missing} CINTA${missing === 1 ? "" : "S"} DE RAÚL.`;
          return;
        }
        escaped = true;
        escapeSequence = {
          startedAt: now,
          playerStart: player.clone(),
          playerEnd: exitPosition
            .clone()
            .add(new THREE.Vector3(exitOpening.x * 2.9, PLAYER_HEIGHT, exitOpening.z * 2.9)),
          slammed: false,
          finaleCuePlayed: false,
        };
        // Position Sujeto M-22 in the dark corridor just behind the blast door for the 3D finale reveal!
        subject.position.set(
          exitPosition.x - exitOpening.x * 2.5,
          0,
          exitPosition.z - exitOpening.z * 2.5,
        );
        subject.rotation.y = Math.atan2(exitOpening.x, exitOpening.z) + Math.PI;
        inputController.reset(now);
        mobilePointers.clear();
        document.exitPointerLock?.();
        emitNoise("exit-alarm", layout.exitCell, now);
        playClank(exitPosition);
        currentPrompt = "COMPUERTA DE ESTRENO ABIERTA · ¡NO MIRES ATRÁS!";
      }
    };

    // ── Input Handlers ──────────────────────────────────────────────────────
    const normCode = (e: KeyboardEvent) =>
      e.code || (["W", "A", "S", "D"].includes(e.key.toUpperCase()) ? `Key${e.key.toUpperCase()}` : e.key);
    const evTime = (e: { timeStamp: number }) =>
      !Number.isFinite(e.timeStamp) || e.timeStamp <= 0
        ? performance.now()
        : e.timeStamp > performance.timeOrigin
          ? e.timeStamp - performance.timeOrigin
          : e.timeStamp;

    const keyDown = (event: KeyboardEvent) => {
      const code = normCode(event);
      const action = walkInputActionForCode(code);
      const ts = evTime(event);
      if (action) {
        inputController.press(action, `keyboard:${code}`, ts);
        event.preventDefault();
      }
      if (!event.repeat && code === "KeyE") interactQueuedRef.current = true;
      if (!event.repeat && code === "KeyG") dropQueuedRef.current = true;
      if (!event.repeat && code === "KeyQ") objectQueuedRef.current = true;
      if (!event.repeat && code === "KeyF") {
        flashlightEnabled = !flashlightEnabled;
        flashlight.visible = flashlightEnabled;
      }
      if (!event.repeat && code === "Tab" && phaseRef.current === "playing" && cctvPower > 0) {
        event.preventDefault();
        tabletRef.current = !tabletRef.current;
        inputController.reset(ts);
        mobilePointers.clear();
        setTabletOpen(tabletRef.current);
        if (tabletRef.current) {
          document.exitPointerLock?.();
          void audioRef.current?.resume().then((ok) => ok && tabletRef.current && audioRef.current?.playCctvStatic());
        } else {
          clearCctvEncounter();
          renderer.domElement.focus({ preventScroll: true });
          requestControl();
        }
      }
    };

    const keyUp = (event: KeyboardEvent) => {
      const code = normCode(event);
      const action = walkInputActionForCode(code);
      if (!action) return;
      inputController.release(action, `keyboard:${code}`, evTime(event));
      event.preventDefault();
    };

    const pointerMove = (event: PointerEvent) => {
      const locked = document.pointerLockElement === renderer.domElement;
      if ((!locked && !draggingLook) || tabletRef.current || phaseRef.current !== "playing") return;
      if (!locked && dragPointerId !== null && event.pointerId !== dragPointerId) return;
      const mx = locked ? event.movementX : event.clientX - dragLastX;
      const my = locked ? event.movementY : event.clientY - dragLastY;
      if (!locked) {
        dragLastX = event.clientX;
        dragLastY = event.clientY;
      }
      yaw -= mx * 0.0021;
      pitch = Math.max(-1.0, Math.min(1.0, pitch - my * 0.0018));
    };

    const pointerDown = (event: PointerEvent) => {
      if (event.button === 0 && phaseRef.current === "playing" && !tabletRef.current) {
        draggingLook = true;
        dragPointerId = event.pointerId;
        dragLastX = event.clientX;
        dragLastY = event.clientY;
        renderer.domElement.focus({ preventScroll: true });
        try {
          renderer.domElement.setPointerCapture?.(event.pointerId);
        } catch {
          // Optional.
        }
      }
    };

    const pointerUp = (event?: PointerEvent) => {
      draggingLook = false;
      dragPointerId = null;
      if (event && renderer.domElement.hasPointerCapture?.(event.pointerId)) {
        renderer.domElement.releasePointerCapture?.(event.pointerId);
      }
    };

    const canvasClick = () => {
      if (phaseRef.current === "playing" && !tabletRef.current) requestControl();
    };

    const pointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      if (!locked && pointerWasLocked) {
        inputController.reset(performance.now());
        mobilePointers.clear();
      }
      pointerWasLocked = locked;
      setPointerHelp(!locked && phaseRef.current === "playing" && !tabletRef.current);
    };

    const clearHidden = () => {
      const now = performance.now();
      inputController.reset(now);
      mobilePointers.clear();
      draggingLook = false;
      simulationPaused = document.hidden;
      const sync = resynchronizeFixedClock(now, simulationTime, 0, FIXED_DELTA);
      simulationTime = sync.simulationTimeMs;
      simulationAccumulator = sync.accumulatorSeconds;
      lastRenderTime = now;
      if (document.hidden) void audioRef.current?.pause();
      else if (phaseRef.current === "playing") void audioRef.current?.resume();
    };

    const clearFocus = () => {
      inputController.reset(performance.now());
      mobilePointers.clear();
      draggingLook = false;
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearFocus);
    document.addEventListener("visibilitychange", clearHidden);
    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("pointerlockchange", pointerLockChange);
    renderer.domElement.addEventListener("click", canvasClick);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("lostpointercapture", pointerUp);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);

    // ── Fixed 60 Hz Simulation Step (Cached BFS, ZERO allocations!) ─────────
    const fixedUpdate = (delta: number, tickNow: number) => {
      if (phaseRef.current !== "playing" || simulationPaused) return;
      const inputSlices = inputController.consumeWindow(tickNow - delta * 1000, tickNow);
      const sampled = inputController.getSnapshot().sampled;

      if (activeLure && tickNow >= activeLure.expiresAt) {
        world.remove(activeLure.mesh);
        activeLure = null;
        lastSeenAt = tickNow - 5200;
      }

      for (const obj of noiseObjects) {
        if (obj.mesh.visible && tickNow >= obj.activeUntil) obj.mesh.visible = false;
      }

      if (caughtSequence) {
        const timing = sequenceProgress(tickNow, caughtSequence.startedAt, JUMPSCARE_DURATION_MS);
        const eased = 1 - Math.pow(1 - timing.progress, 4);
        tmpForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        tmpEnemyTarget.copy(player).addScaledVector(tmpForward, 0.72).setY(0);
        subject.position.lerpVectors(caughtSequence.subjectStart, tmpEnemyTarget, eased);
        const tYaw = Math.atan2(player.x - subject.position.x, player.z - subject.position.z) + Math.PI;
        subject.rotation.y =
          caughtSequence.subjectYaw +
          Math.atan2(Math.sin(tYaw - caughtSequence.subjectYaw), Math.cos(tYaw - caughtSequence.subjectYaw)) * eased;
        playerMoving = false;
        if (timing.done) {
          caughtSequence = null;
          setActiveJumpscare(null);
          reportRun(false, tickNow);
          setGamePhase("caught");
        }
        return;
      }

      // ── 3D Horror Escape Finale Sequence (Door opens -> 180° lookback -> M-22 mask -> Door SLAM!) ──
      if (escapeSequence) {
        const timing = sequenceProgress(tickNow, escapeSequence.startedAt, ESCAPE_DURATION_MS);
        const p = timing.progress;
        if (exitPanel) {
          if (p < 0.78) {
            exitPanel.position.y = THREE.MathUtils.smoothstep(p, 0.02, 0.36) * 3.1;
          } else {
            // Blast door SLAMS SHUT right in front of Sujeto M-22!
            const slam = THREE.MathUtils.smoothstep(p, 0.78, 0.9);
            exitPanel.position.y = (1 - slam) * 3.1;
            if (!escapeSequence.slammed && p >= 0.86) {
              escapeSequence.slammed = true;
              audioRef.current?.playHorrorCue("door-slam");
              playSubjectHee(0.65, 0.78);
            }
          }
        }
        const dash = THREE.MathUtils.smoothstep(p, 0.12, 0.52);
        player.lerpVectors(escapeSequence.playerStart, escapeSequence.playerEnd, dash);

        // Whip 180° around to face the closing doorway and Sujeto M-22!
        const lookBackYaw = exitOpening.yaw + Math.PI;
        if (p >= 0.44) {
          const turnAlpha = THREE.MathUtils.smoothstep(p, 0.44, 0.66);
          const diff = Math.atan2(Math.sin(lookBackYaw - yaw), Math.cos(lookBackYaw - yaw));
          yaw += diff * Math.min(1, turnAlpha * 0.28 + delta * 5.2);
          pitch += (0.06 - pitch) * Math.min(1, delta * 4);
          // Sujeto M-22 glides ominously forward toward the closing gap
          const slide = THREE.MathUtils.smoothstep(p, 0.48, 0.84);
          subject.position.set(
            exitPosition.x - exitOpening.x * (2.6 - slide * 1.45),
            0,
            exitPosition.z - exitOpening.z * (2.6 - slide * 1.45),
          );
          currentEnemyMode = "chase";
        }

        if (!escapeSequence.finaleCuePlayed && p >= 0.92) {
          escapeSequence.finaleCuePlayed = true;
          const endKind = resolveEndingKind({
            escaped: true,
            tapes: tapesHeld,
            eggsFound: eggsFound.length,
            ghostRelic: ghostBlessed,
          });
          if (endKind === "collectors-cut") {
            audioRef.current?.playHorrorCue("ghost-organ");
          }
        }

        playerMoving = p < 0.5;
        if (timing.done) {
          escapeSequence = null;
          reportRun(true, tickNow);
          setGamePhase("escaped");
        }
        return;
      }

      // Movement & Interactions
      if (!tabletRef.current) {
        if (ventTrip) {
          let moved = 0;
          let termDir = 0;
          for (const slice of inputSlices) {
            const adv = advanceVentTraversal(ventTrip.distanceAlong, ventTrip.totalDistance, slice.forward, slice.durationSeconds);
            ventTrip.distanceAlong = adv.distance;
            moved += adv.moved;
            if (slice.forward > 0 && adv.atDestination) termDir = 1;
            else if (slice.forward < 0 && adv.atSource) termDir = -1;
          }
          if (sampled.strafe !== 0) yaw -= sampled.strafe * delta * 1.85;
          const prog = THREE.MathUtils.clamp(ventTrip.distanceAlong / Math.max(0.0001, ventTrip.totalDistance), 0, 1);
          traveledDistance += moved;
          player.lerpVectors(ventTrip.path[0], ventTrip.path[1], prog);
          player.y += Math.sin(ventTrip.distanceAlong * 8) * 0.016;
          if (tickNow - lastVentHudUpdate >= 100) {
            setVentProgress(Math.round(prog * 100));
            lastVentHudUpdate = tickNow;
          }
          playerMoving = sampled.forward !== 0 && moved > 0.0001;
          playerCrouching = true;
          playerSprinting = false;
          if (playerMoving && tickNow >= nextNoisePulseAt) {
            emitNoise("vent-rattle", prog < 0.5 ? ventTrip.sourceCell : ventTrip.destinationCell, tickNow);
            nextNoisePulseAt = tickNow + 560;
          }
          if ((prog >= 1 && termDir > 0) || (prog <= 0 && termDir < 0)) {
            const atDest = prog >= 1 && termDir > 0;
            const exitIdx = atDest ? ventTrip.destinationCell : ventTrip.sourceCell;
            player.copy(atDest ? ventTrip.to : cellCenter(ventTrip.sourceCell, GRID).setY(CROUCH_HEIGHT));
            capsuleState = createCapsuleState(capsuleWorld, { x: player.x, z: player.z }, true);
            if (ductRoutes[ventTrip.pairIndex]) ductRoutes[ventTrip.pairIndex].visible = false;
            ventTrip = null;
            setInVent(false);
            setVentProgress(0);
            emitNoise("vent-rattle", exitIdx, tickNow);
          }
        } else {
          let moved = 0;
          for (const slice of inputSlices) {
            const sprinting = !slice.crouch && slice.sprint && (slice.forward !== 0 || slice.strafe !== 0);
            const speed = slice.crouch ? 1.55 : sprinting ? 4.5 : 2.9;
            const velocity = capsuleVelocityFromInput({ forward: slice.forward, strafe: slice.strafe, yaw, speed });
            const res = stepCapsuleController(capsuleWorld, capsuleState, {
              velocity,
              deltaSeconds: slice.durationSeconds,
              crouch: slice.crouch,
            });
            capsuleState = res.state;
            player.set(res.state.position.x, res.eyeHeight, res.state.position.z);
            playerCrouching = res.state.crouching;
            traveledDistance += res.moved;
            moved += res.moved;
          }
          playerMoving = sampled.forward !== 0 || sampled.strafe !== 0;
          playerSprinting = playerMoving && !sampled.crouch && sampled.sprint;
          if (!playerMoving) {
            previousSprintCell = null;
            latestSprintCell = null;
          } else if (moved > 0.0001) {
            const mCell = positionCell(player, GRID);
            if (tickNow >= nextNoisePulseAt) {
              const kind: NoiseKind = playerCrouching ? "crouch-step" : playerSprinting ? "sprint-step" : "walk-step";
              emitNoise(kind, mCell, tickNow);
              nextNoisePulseAt = tickNow + (playerCrouching ? 760 : playerSprinting ? 245 : 430);
              if (playerSprinting && latestSprintCell !== mCell) {
                previousSprintCell = latestSprintCell;
                latestSprintCell = mCell;
              }
            }
            if (tickNow >= nextFootstep) {
              audioRef.current?.playPlayerStep(playerCrouching ? 0.08 : playerSprinting ? 0.24 : 0.16);
              nextFootstep = tickNow + (playerCrouching ? 740 : playerSprinting ? 305 : 490);
            }
          }
        }

        if (interactQueuedRef.current) {
          interactQueuedRef.current = false;
          interact(tickNow);
        }
        if (dropQueuedRef.current) {
          dropQueuedRef.current = false;
          dropEcho(tickNow);
        }
        if (objectQueuedRef.current) {
          objectQueuedRef.current = false;
          dropNoiseObject(tickNow);
        }
        cctvExposureMs = Math.max(0, cctvExposureMs - delta * 650);
      } else {
        playerMoving = false;
        playerSprinting = false;
        cctvExposureMs += delta * 1000;
        const battery = drainCctvBattery(cctvPower, true, delta, 0.85);
        cctvPower = battery.power;
        if (Math.ceil(cctvPower) !== lastReportedPower) {
          lastReportedPower = Math.ceil(cctvPower);
          setPower(lastReportedPower);
        }
        if (battery.depleted) {
          tabletRef.current = false;
          setTabletOpen(false);
          currentPrompt = "SIN BATERÍA CCTV · Recárgala en la Oficina Fazbear.";
        }
      }

      // ── Cached Pathfinding & Stealth AI (ZERO 180 BFS/s overhead!) ────────
      const enemyCell = positionCell(subject.position, GRID);
      const playerCell = positionCell(player, GRID);
      if (enemyCell !== cachedEnemyCell) {
        cachedEnemyDistances = mazeDistances(maze, enemyCell, GRID);
        cachedEnemyCell = enemyCell;
      }
      currentRouteDistance = Math.max(0, cachedEnemyDistances[playerCell] ?? 20);
      tmpPlayerFlat.set(player.x, 0, player.z);
      currentPlayerDistance = subject.position.distanceTo(tmpPlayerFlat);

      const corridorSight =
        !ventTrip && currentPlayerDistance < 21 && corridorLineOfSight(maze, enemyCell, playerCell, GRID);
      const det = stepDetectionMeter({
        current: detectionMeter,
        lineOfSight: corridorSight,
        distance: currentPlayerDistance,
        flashlightOn: flashlightEnabled,
        crouching: playerCrouching,
        deltaSeconds: delta,
        difficulty: difficultyRef.current,
      });
      detectionMeter = det.meter;
      const lineOfSight = det.spotted;

      // Flashlight dazzle stun ("Estatua")
      if (
        difficultyRef.current !== "turista" &&
        tickNow >= dazzleCooldownUntil &&
        tickNow >= dazzledUntil &&
        currentEnemyMode !== "ambush" &&
        isFlashlightDazzle({
          playerX: player.x,
          playerZ: player.z,
          playerYaw: yaw,
          enemyX: subject.position.x,
          enemyZ: subject.position.z,
          distance: currentPlayerDistance,
          flashlightOn: flashlightEnabled,
          lineOfSight: corridorSight,
        })
      ) {
        dazzledUntil = tickNow + 2200;
        dazzleCooldownUntil = tickNow + 13500;
        dazzles += 1;
        audioRef.current?.playHorrorCue("dazzle-zap");
        currentPrompt = "⚡ DESLUMBRADO · SUJETO M-22 PARALIZADO 2 S · ¡ESCAPA!";
      }

      const isDazzled = tickNow < dazzledUntil;
      const isBanished = tickNow < banishedUntil;
      if (lineOfSight) {
        lastSeenAt = tickNow;
        lastSeenCell = playerCell;
      }

      acousticEvents = pruneAcousticEvents(acousticEvents, tickNow);
      acousticPerception = selectAcousticTarget(
        acousticEvents.map((ev) => ({
          ...ev,
          routeDistanceCells: cachedEnemyDistances[ev.cell] >= 0 ? cachedEnemyDistances[ev.cell] : 999,
        })),
        tickNow,
      );
      if (acousticPerception) {
        lastHeardAt = acousticPerception.event.emittedAt;
        lastHeardCell = acousticPerception.event.cell;
        lastHeardKind = acousticPerception.event.kind;
      }
      const heardNoise = Boolean(acousticPerception);
      const noiseDist = acousticPerception?.routeDistanceCells ?? 999;
      predictedHeardCell =
        lastHeardKind === "sprint-step" && previousSprintCell !== null && latestSprintCell === lastHeardCell
          ? extrapolateAcousticTrailCell(maze, previousSprintCell, latestSprintCell, GRID)
          : lastHeardCell;
      lastNoiseDistance = noiseDist;

      const cctvSignalCell = layout.cctvCells[cctvIndexRef.current] ?? 0;
      const cctvSignalDist = cachedEnemyDistances[cctvSignalCell] >= 0 ? cachedEnemyDistances[cctvSignalCell] : 20;

      const nextEnemyMode: EnemyState = isBanished
        ? "recover"
        : difficultyRef.current === "turista"
          ? "patrol"
          : decideEnemyState({
              distanceCells: currentRouteDistance,
              hasLure: Boolean(activeLure),
              heardNoise,
              noiseAgeMs: tickNow - lastHeardAt,
              noiseDistanceCells: noiseDist,
              noiseConfidence: acousticPerception?.confidence ?? 0,
              playerInVent: Boolean(ventTrip),
              lastSeenAgeMs: tickNow - lastSeenAt,
              cctvExposureMs,
              cctvSignalDistanceCells: cctvSignalDist,
              lineOfSight,
              currentState: currentEnemyMode,
            });

      if (nextEnemyMode !== currentEnemyMode) {
        currentEnemyMode = nextEnemyMode;
        transitionEnemyAnimation(nextEnemyMode);
        if (nextEnemyMode === "chase" && tickNow - lastHeeAt > 4800) {
          if (playSubjectHee(1.5, 0.88 + random() * 0.16)) {
            lastHeeAt = tickNow;
            currentPrompt = "HEE-HEE · SUJETO M-22 TE HA LOCALIZADO · ¡CORRE O CÉGALO CON [F]!";
          }
        }
      }

      if (currentEnemyMode !== "chase" && currentPlayerDistance < 15 && tickNow > nextGiggleAt) {
        if (playSubjectHee(0.85, 0.68 + random() * 0.12)) {
          nextGiggleAt = tickNow + 14000 + random() * 11000;
        }
      }

      // Patrol waypoints: visit the 5 thematic wings (and pressure exit during Red Alert!)
      const patrolCells = redAlert
        ? [layout.exitCell, layout.wingCenters.crypt, layout.wingCenters.acoustic, layout.wingCenters.fazbear]
        : [
            layout.wingCenters.neverland,
            layout.wingCenters.crypt,
            layout.wingCenters.acoustic,
            layout.wingCenters.fazbear,
            layout.wingCenters.archive,
          ];

      let targetCell: number;
      if (isBanished) {
        targetCell = layout.enemyStartCell;
      } else if (activeLure) {
        targetCell = activeLure.cell;
      } else if (currentEnemyMode === "chase") {
        targetCell = lineOfSight ? playerCell : lastHeardAt > lastSeenAt ? predictedHeardCell : lastSeenCell;
      } else if (currentEnemyMode === "vent-watch" || currentEnemyMode === "ambush") {
        targetCell = ventTrip?.destinationCell ?? playerCell;
      } else if (currentEnemyMode === "listen" || currentEnemyMode === "investigate") {
        targetCell = predictedHeardCell;
      } else if (currentEnemyMode === "search") {
        targetCell = lastHeardAt > lastSeenAt ? predictedHeardCell : lastSeenCell;
      } else {
        targetCell = patrolCells[patrolCursor % patrolCells.length];
        if (enemyCell === targetCell) {
          patrolCursor = (patrolCursor + 1) % patrolCells.length;
          targetCell = patrolCells[patrolCursor];
        }
      }

      if (
        enemyCell !== cachedPlayerCell ||
        targetCell !== cachedTargetCell ||
        tickNow - lastPathAt > 420
      ) {
        enemyPath = mazePath(maze, enemyCell, targetCell, GRID);
        cachedTargetCell = targetCell;
        cachedPlayerCell = enemyCell;
        lastPathAt = tickNow;
      }

      const nextCell = enemyPath[1] ?? targetCell;
      const nc = cellCenter2D(nextCell, GRID, CELL_SIZE);
      tmpEnemyTarget.set(nc.x, 0, nc.z);
      tmpDir.subVectors(tmpEnemyTarget, subject.position).setY(0);
      const remaining = tmpDir.length();

      const speeds: Record<EnemyState, number> = {
        patrol: 1.06,
        listen: 0.25,
        investigate: 1.45,
        search: 1.28,
        chase: 2.38,
        lure: 1.65,
        "vent-watch": 1.18,
        ambush: 1.95,
        recover: 1.25,
      };
      const rawSpeed = adaptiveEnemySpeed(speeds[currentEnemyMode], tapesHeld, difficultyRef.current, redAlert);
      // In Tourist mode, Subject M-22 respectfully freezes if closer than 4 m!
      const touristHold = difficultyRef.current === "turista" && currentPlayerDistance < 4.0;
      currentEnemySpeed = isDazzled || touristHold ? 0 : rawSpeed;

      if (!isDazzled && !touristHold && remaining > 0.08) {
        tmpDir.normalize();
        subject.position.addScaledVector(tmpDir, Math.min(remaining, currentEnemySpeed * delta));
        const targetYaw = Math.atan2(tmpDir.x, tmpDir.z) + Math.PI;
        subject.rotation.y +=
          Math.atan2(Math.sin(targetYaw - subject.rotation.y), Math.cos(targetYaw - subject.rotation.y)) *
          Math.min(1, delta * 4.4);
      }

      if (tickNow >= nextEnemyStep && remaining > 0.1 && currentEnemySpeed > 0.05 && currentPlayerDistance < 20) {
        audioRef.current?.playMechanicalStep("subject-m", {
          gain: THREE.MathUtils.clamp(1.1 / Math.max(1, currentPlayerDistance * 0.09), 0.25, 1.1),
          playbackRate: currentEnemyMode === "chase" ? 1.16 : 0.94,
        });
        nextEnemyStep = tickNow + (currentEnemyMode === "chase" ? 320 : 600);
      }
      if (currentPlayerDistance < 1.08 && difficultyRef.current !== "turista") {
        triggerCaught(tickNow);
      }

      currentBpm = Math.round(THREE.MathUtils.clamp(44 + (16 - Math.min(currentRouteDistance, 16)) * 7.6, 44, 168));
      if (tickNow >= nextHeartbeat && !tabletRef.current) {
        audioRef.current?.playHeartbeat(THREE.MathUtils.clamp((0.025 + (currentBpm - 44) / 600) * 5.2, 0.18, 1.6));
        nextHeartbeat = tickNow + 60000 / currentBpm;
      }
    };

    const resize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    // ── Render Loop (Light Pool, Single HUD Snapshot, Zero Canvas Filter) ───
    const frameTimes: number[] = [];
    let animation = 0;
    let wasPlaying = false;
    let frame = 0;
    let lastCctvFrame = Number.NEGATIVE_INFINITY;
    let spatialSourcesStarted = false;
    let lastRendererCalls = 0;
    let lastRendererTriangles = 0;
    let lastQaUpdate = 0;

    // Pre-compile base shaders right away
    renderer.compile(scene, camera);
    setSceneReady(true);

    const renderFrame = (now: number) => {
      animation = requestAnimationFrame(renderFrame);
      const rawDelta = Math.max(0, (now - lastRenderTime) / 1000);
      const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
      const playing = phaseRef.current === "playing";
      frameTimes.push(delta * 1000);
      if (frameTimes.length > 120) frameTimes.shift();
      lastRenderTime = now;

      if (playing && !wasPlaying) {
        simulationTime = now;
        simulationAccumulator = 0;
        wasPlaying = true;
      } else if (!playing) {
        wasPlaying = false;
      }

      if (playing && !simulationPaused) {
        simulationAccumulator += delta;
        let steps = 0;
        while (simulationAccumulator >= FIXED_DELTA && steps < MAX_CATCH_UP_STEPS) {
          simulationTime += FIXED_DELTA * 1000;
          fixedUpdate(FIXED_DELTA, simulationTime);
          simulationAccumulator -= FIXED_DELTA;
          steps += 1;
        }
        if (steps === MAX_CATCH_UP_STEPS && simulationAccumulator >= FIXED_DELTA) {
          const sync = resynchronizeFixedClock(now, simulationTime, simulationAccumulator, FIXED_DELTA);
          simulationTime = sync.simulationTimeMs;
          simulationAccumulator = sync.accumulatorSeconds;
        }
      }

      if (playing && runStartedAt === 0) runStartedAt = now;
      if (runStartedAt && !escaped && !caught && timecodeRef.current) {
        timecodeRef.current.textContent = formatTimecode(now - runStartedAt);
      }

      // Cheap animations on props (zero allocations)
      if (!reducedMotion) {
        runtimeTapes.forEach((tape, idx) => {
          if (tape.collected) return;
          const body = tape.mesh.userData.body as THREE.Group | undefined;
          if (body) {
            body.position.y = 0.98 + Math.sin(now * 0.0022 + idx * 1.5) * 0.08;
            body.rotation.y += delta * 0.9;
          }
        });
        runtimeEchoes.forEach((echo, idx) => {
          if (echo.collected) return;
          echo.mesh.position.y = Math.sin(now * 0.0016 + idx) * 0.1;
          echo.mesh.rotation.y += delta * 0.4;
        });
        studioEnv.eggs.forEach((egg) => {
          const spinBody = egg.mesh.userData.spinBody as THREE.Object3D | undefined;
          if (spinBody && spinBody.visible) spinBody.rotation.y += delta * 1.1;
        });
        studioEnv.animatedFlames.forEach((flame, idx) => {
          const s = 0.92 + Math.sin(now * 0.015 + idx * 2.1) * 0.14;
          flame.scale.set(1, s, 1);
        });
        if (studioEnv.deskFanBlades) studioEnv.deskFanBlades.rotation.z += delta * 7.5;
        if (studioEnv.waterGlassRipples) {
          const shake = Math.max(0.08, 1 - currentPlayerDistance / 14);
          const s = 0.7 + ((now * 0.004 * (1 + shake * 2)) % 0.6);
          studioEnv.waterGlassRipples.scale.setScalar(s);
        }
        dust.rotation.y = Math.sin(now * 0.00004) * 0.07;
      }

      if (playing) {
        activeEnemyAction.timeScale = THREE.MathUtils.clamp(currentEnemySpeed / 1.1, 0.25, 1.9);
        enemyMixer.update(delta);
        const threat =
          currentEnemyMode === "ambush"
            ? 1
            : currentEnemyMode === "chase"
              ? THREE.MathUtils.clamp(1.15 - currentPlayerDistance / 8, 0.45, 0.95)
              : currentEnemyMode === "listen"
                ? 0.2
                : 0;
        if (head) {
          head.rotation.y += (Math.PI * threat - head.rotation.y) * Math.min(1, delta * 6);
          head.rotation.z = Math.sin(now * 0.0022) * 0.09 * Math.max(0.18, threat);
        }
        if (jaw) {
          const jTarget = currentEnemyMode === "chase" || currentEnemyMode === "ambush" ? 0.52 : 0.05;
          jaw.rotation.x += (jTarget - jaw.rotation.x) * Math.min(1, delta * 9);
        }
        if (subjectHat) {
          subjectHat.position.y += (subjectHatBaseY - subjectHat.position.y) * Math.min(1, delta * 5);
        }
        if (facePlateLeft && facePlateRight) {
          facePlateLeft.rotation.y += (-threat * 0.52 - facePlateLeft.rotation.y) * Math.min(1, delta * 8);
          facePlateRight.rotation.y += (threat * 0.52 - facePlateRight.rotation.y) * Math.min(1, delta * 8);
        }
        const servoInt = 2.8 + threat * 6;
        servoMaterials.forEach((s) => {
          s.emissiveIntensity = servoInt;
        });
        if (chestCore) {
          chestCore.scale.setScalar(1 + Math.sin(now * 0.012) * 0.03);
        }

        // Update 3-Light Pool every 180 ms (max 3 PointLights active at once!)
        if (now - lastLightPoolUpdate > 180) {
          const origin = tabletRef.current
            ? cellCenter(layout.cctvCells[cctvIndexRef.current] ?? 0, GRID)
            : player;
          const activeLights = selectActivePoolLights(virtualLights, origin.x, origin.z, 3, 22);
          poolLights.forEach((pl, idx) => {
            const src = activeLights[idx];
            if (!src) {
              pl.visible = false;
              pl.intensity = 0;
              return;
            }
            pl.visible = true;
            pl.position.set(src.x, src.y, src.z);
            pl.color.setHex(src.color);
            pl.intensity = src.intensity;
            pl.distance = src.distance;
          });
          lastLightPoolUpdate = now;
        }

        // Emit ONE unified HudSnapshot every 220 ms (massive React perf win!)
        if (now - lastHudUpdate > 220) {
          const curCell = positionCell(player, GRID);
          const row = Math.floor(curCell / GRID);
          const col = curCell % GRID;
          peakBpm = Math.max(peakBpm, currentBpm);
          if (currentPlayerDistance < 3.4) inCloseCall = true;
          else if (inCloseCall && currentPlayerDistance > 6.5) {
            inCloseCall = false;
            closeCalls += 1;
          }

          if (loreBanner && now > loreBanner.until) loreBanner = null;

          // Distance culling on heavy rooms
          const detailOrigin = tabletRef.current
            ? cellCenter(layout.cctvCells[cctvIndexRef.current] ?? 0, GRID)
            : player;
          studioEnv.decorGroups.forEach((g) => {
            g.visible = g.position.distanceToSquared(detailOrigin) < 26 * 26;
          });

          // Contextual [E] interaction prompt
          tmpPlayerFlat.set(player.x, 0, player.z);
          const nearTape = runtimeTapes.find((t) => !t.collected && t.mesh.position.distanceTo(tmpPlayerFlat) < 1.65);
          const nearEgg = studioEnv.eggs.find(
            (e) =>
              (!e.used || (e.reusable && simulationTime >= e.cooldownUntil)) &&
              e.position.distanceTo(tmpPlayerFlat) < 1.85,
          );
          const nearEcho = runtimeEchoes.some((e) => !e.collected && e.mesh.position.distanceTo(tmpPlayerFlat) < 1.55);
          const nearVent = ventMeshes.some(
            (v) => v.userData.cell === curCell && Math.hypot(v.position.x - player.x, v.position.z - player.z) < 2.2,
          );
          const nearExit = exitPosition.distanceTo(tmpPlayerFlat) < 1.75;

          let interactPrompt: string | null = null;
          if (ventTrip) interactPrompt = "EN CONDUCTO · [W/S] AVANZA · [A/D] GIRA";
          else if (nearTape) interactPrompt = `[E] RECOGER CINTA ${WALK_TAPES[nearTape.index].code} · «${WALK_TAPES[nearTape.index].title}»`;
          else if (nearEgg) {
            const meta = layout.eggPlacements.find((p) => p.id === nearEgg.id);
            interactPrompt = meta ? `[${meta.actionPrompt}]` : "[E] INTERACTUAR";
          } else if (nearEcho) interactPrompt = "[E] RECOGER ECO ESPECTRAL";
          else if (nearVent) interactPrompt = "[E] METERSE EN CONDUCTO DE MANTENIMIENTO";
          else if (nearExit) {
            interactPrompt =
              tapesHeld < requiredTapes
                ? `PUERTA BLOQUEADA · FALTAN ${requiredTapes - tapesHeld} CINTA(S)`
                : "[E] ABRIR PUERTA DE ESTRENO Y ESCAPAR";
          }

          const wing: StudioWingId = layout.cellWings[curCell] ?? "corridor";
          const objective = computeObjectiveReading({
            maze,
            size: GRID,
            playerCell: curCell,
            playerX: player.x,
            playerZ: player.z,
            playerYaw: yaw,
            tapes: runtimeTapes.map((t) => ({
              cell: t.cell,
              code: WALK_TAPES[t.index].code,
              title: WALK_TAPES[t.index].title,
              collected: t.collected,
            })),
            tapesHeld,
            requiredTapes,
            exitCell: layout.exitCell,
          });

          setHud({
            bpm: currentBpm,
            distance: Math.max(1, Math.round(currentPlayerDistance)),
            traveled: traveledDistance,
            sector: sectorForCell(curCell, GRID),
            wing,
            enemyMode: currentEnemyMode,
            echoes: echoesHeld,
            tapes: [...tapeIndices],
            eggsFound: [...eggsFound],
            hardBreadArmed,
            ghostBlessed,
            redAlert,
            detectionPct: Math.round(detectionMeter * 100),
            stealthState: !flashlightEnabled && playerCrouching ? "hidden" : !flashlightEnabled || playerCrouching ? "dim" : "lit",
            dazzled: simulationTime < dazzledUntil,
            objective,
            interactPrompt,
            loreBanner: loreBanner ? { kicker: loreBanner.kicker, text: loreBanner.text } : null,
            prompt: currentPrompt,
            difficulty: difficultyRef.current,
          });

          setMapPlayer({ left: gridX(col), top: gridY(row) });

          if (tabletRef.current) {
            const selectedCamera = cctvCameras[cctvIndexRef.current] ?? cctvCameras[0];
            const cycle = (now + cctvIndexRef.current * 977) % 11700;
            cctvSignalLost = cycle < 320 || (currentPlayerDistance < 8 && now % 900 < 140);
            setSignalLost(cctvSignalLost);
            selectedCamera.updateWorldMatrix(true, false);
            cctvProjection.multiplyMatrices(selectedCamera.projectionMatrix, selectedCamera.matrixWorldInverse);
            cctvFrustum.setFromProjectionMatrix(cctvProjection);
            enemyProbe.copy(subject.position).setY(1.4);
            setMotionDetected(
              !cctvSignalLost &&
                cctvFrustum.containsPoint(enemyProbe) &&
                corridorLineOfSight(maze, layout.cctvCells[cctvIndexRef.current] ?? 0, positionCell(subject.position, GRID), GRID),
            );
          }

          lastHudUpdate = now;
        }
      }

      // Camera placement (update projection ONLY when FOV actually changes!)
      let desiredFov = 74;
      if (caughtSequence) {
        const sp = THREE.MathUtils.clamp((simulationTime - caughtSequence.startedAt) / JUMPSCARE_DURATION_MS, 0, 1);
        camera.position.copy(player);
        camera.lookAt(subject.position.x, 2.25 + Math.sin(sp * Math.PI * 8) * 0.08, subject.position.z);
        desiredFov = 74 + Math.sin(sp * Math.PI) * 24;
      } else if (playing) {
        const bob =
          playerMoving && !ventTrip && !reducedMotion
            ? Math.sin(now * 0.011 * (playerSprinting ? 1.4 : 1)) * (playerCrouching ? 0.012 : 0.032)
            : 0;
        camera.position.set(player.x, player.y + bob, player.z);
        camera.rotation.set(pitch, yaw, 0);
        desiredFov = escapeSequence ? 82 : redAlert ? 76 : 74;
      } else {
        const orbit = now * 0.00009;
        camera.position.set(start.x + Math.sin(orbit) * 1.2, 1.65, start.z + Math.cos(orbit) * 1.2);
        camera.lookAt(start.x, 1.4, start.z - 2);
      }
      if (Math.abs(desiredFov - lastAppliedFov) > 0.05) {
        camera.fov = desiredFov;
        camera.updateProjectionMatrix();
        lastAppliedFov = desiredFov;
      }
      flashlight.visible = flashlightEnabled;

      // Spatial audio pose
      const spatialAudio = audioRef.current;
      if (spatialAudio?.isUnlocked) {
        if (!spatialSourcesStarted) {
          spatialAudio.startBeds();
          spatialSourcesStarted = true;
        }
        camera.getWorldDirection(audioForward);
        audioUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
        subject.getWorldDirection(enemyAudioForward);
        spatialAudio.setListener({ position: camera.position, forward: audioForward, up: audioUp });
        spatialAudio.updateEmitter("subject-m", {
          position: subject.position,
          orientation: enemyAudioForward,
          occlusion: corridorLineOfSight(maze, positionCell(player, GRID), positionCell(subject.position, GRID), GRID) ? 0 : 0.76,
        });
      }

      // Dynamic per-biome atmosphere + Red Alert horror flicker
      frame += 1;
      const activeCell = tabletRef.current
        ? (layout.cctvCells[cctvIndexRef.current] ?? 0)
        : positionCell(player, GRID);
      const rawWing = layout.cellWings[activeCell];
      const activeBiome: StudioBiomeId = rawWing && rawWing !== "corridor" ? rawWing : "booth";
      const biomeAtmo = STUDIO_BIOME_ATMOSPHERE[activeBiome];
      const blend = Math.min(1, delta * 3.4);

      const alertWave = redAlert ? 0.55 + Math.sin(now * 0.0075) * 0.45 : 0;
      if (redAlert) {
        currentBgColor.lerp(alertBg, blend);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(currentBgColor);
          scene.fog.density += (0.048 - scene.fog.density) * blend;
        }
        emergencyLight.color.setHex(0xff1b24);
        emergencyLight.intensity = 0.45 + alertWave * 0.85;
      } else {
        targetBgColor.setHex(biomeAtmo.fogHex);
        targetHemiSky.setHex(biomeAtmo.hemiSkyHex);
        targetHemiGround.setHex(biomeAtmo.hemiGroundHex);
        currentBgColor.lerp(targetBgColor, blend);
        hemiLight.color.lerp(targetHemiSky, blend);
        hemiLight.groundColor.lerp(targetHemiGround, blend);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(currentBgColor);
          scene.fog.density += (biomeAtmo.fogDensity - scene.fog.density) * blend;
        }
        emergencyLight.color.setHex(
          currentEnemyMode === "chase" ? 0xff1d14 : STUDIO_WINGS[activeBiome].accentHex,
        );
        emergencyLight.intensity = frame % 230 < 5 ? 0.1 : 0.58;
      }

      // Render WebGL
      renderer.info.reset();
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, mount.clientWidth, mount.clientHeight);
      renderer.clear();

      if (tabletRef.current && playing) {
        const optical = cctvCameras[cctvIndexRef.current] ?? cctvCameras[0];
        if (!cctvSignalLost && now - lastCctvFrame >= 1000 / graphics.cctvFps) {
          optical.aspect = cctvTarget.width / Math.max(1, cctvTarget.height);
          optical.updateProjectionMatrix();
          renderer.setRenderTarget(cctvTarget);
          renderer.setViewport(0, 0, cctvTarget.width, cctvTarget.height);
          renderer.clear();
          renderer.render(scene, optical);
          renderer.setRenderTarget(null);
          lastCctvFrame = now;
        }
        const feedBounds = cctvFeedRef.current?.getBoundingClientRect();
        const canvasBounds = renderer.domElement.getBoundingClientRect();
        if (feedBounds && feedBounds.width > 2 && feedBounds.height > 2) {
          const vx = Math.max(0, feedBounds.left - canvasBounds.left);
          const vy = Math.max(0, canvasBounds.bottom - feedBounds.bottom);
          renderer.setViewport(vx, vy, feedBounds.width, feedBounds.height);
          renderer.setScissor(vx, vy, feedBounds.width, feedBounds.height);
          renderer.setScissorTest(true);
          renderer.render(cctvDisplayScene, cctvDisplayCamera);
          renderer.setScissorTest(false);
        }
      } else {
        renderer.render(scene, camera);
      }

      lastRendererCalls = renderer.info.render.calls;
      lastRendererTriangles = renderer.info.render.triangles;

      // QA JSON snapshot ONLY when ?qa is explicitly enabled (kills 500 ms prod stutters!)
      if (qaMode && now - lastQaUpdate > 500) {
        const snap = qaBridge.snapshot();
        mount.dataset.qa = JSON.stringify(snap);
        const fps = snap.frames.medianMs > 0 ? Math.round(1000 / snap.frames.medianMs) : 0;
        setQaSummary(
          `QA · ${snap.gridSize}×${snap.gridSize} · ${fps} FPS (${snap.frames.medianMs.toFixed(1)}ms / p95 ${snap.frames.p95Ms.toFixed(1)}ms) · LUCES ${snap.activeLights}/3 · CALLS ${snap.renderer.calls} · TRIS ${snap.renderer.triangles} · GLB ${snap.gltfRigLoaded ? "OK" : "LOAD"}`,
        );
        lastQaUpdate = now;
      }
    };

    let qaBiomeCursor = 0;
    const qaBiomeOrder: StudioBiomeId[] = ["fazbear", "crypt", "neverland", "acoustic", "archive", "booth"];

    const qaBridge = {
      snapshot: () => {
        const sorted = [...frameTimes].sort((a, b) => a - b);
        const pct = (r: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * r))] ?? 0;
        return {
          seed,
          gridSize: GRID,
          phase: phaseRef.current,
          difficulty: difficultyRef.current,
          tapesHeld,
          eggsFound: [...eggsFound],
          redAlert,
          activeLights: poolLights.filter((l) => l.visible).length,
          biomeProps: biomeComplex.propCount,
          gltfRigLoaded,
          renderer: { calls: lastRendererCalls, triangles: lastRendererTriangles },
          frames: { samples: sorted.length, medianMs: pct(0.5), p95Ms: pct(0.95) },
          hearing: { lastNoiseDistance },
        };
      },
      visitNextBiome: () => {
        if (!qaMode) return false;
        const biomeId = qaBiomeOrder[qaBiomeCursor % qaBiomeOrder.length];
        qaBiomeCursor += 1;
        // Prefer an adjacent furnished hallway cell facing into that biome's centerpiece!
        const centerCell = layout.wingCenters[biomeId];
        const neighbors = [
          maze[centerCell]?.n ? centerCell - GRID : -1,
          maze[centerCell]?.s ? centerCell + GRID : -1,
          maze[centerCell]?.e ? centerCell + 1 : -1,
          maze[centerCell]?.w ? centerCell - 1 : -1,
        ].filter((c) => c >= 0 && c < GRID * GRID && layout.cellWings[c] === biomeId);
        const targetCell = neighbors[0] ?? centerCell;
        const pos = cellCenter(targetCell, GRID);
        const lookAt = cellCenter(centerCell, GRID);
        player.set(pos.x, PLAYER_HEIGHT, pos.z);
        capsuleState = createCapsuleState(capsuleWorld, { x: pos.x, z: pos.z });
        if (targetCell !== centerCell) {
          yaw = Math.atan2(-(lookAt.x - pos.x), -(lookAt.z - pos.z));
        } else {
          yaw = openingDirection(maze[targetCell]).yaw;
        }
        pitch = -0.04;
        return biomeId;
      },
      triggerRedAlert: () => {
        if (!qaMode) return false;
        while (tapeIndices.length < requiredTapes) {
          const idx = tapeIndices.length;
          tapeIndices.push(idx);
          if (runtimeTapes[idx]) {
            runtimeTapes[idx].collected = true;
            runtimeTapes[idx].mesh.visible = false;
            tapeVirtualLights[idx].active = false;
          }
        }
        tapesHeld = Math.max(tapesHeld, requiredTapes);
        redAlert = true;
        exitVirtualLight.color = 0x35ff7a;
        exitVirtualLight.intensity = 30;
        if (exitBeaconMat) {
          exitBeaconMat.color.setHex(0x0b3d1e);
          exitBeaconMat.emissive.setHex(0x35ff7a);
        }
        audioRef.current?.playHorrorCue("red-alert");
        currentPrompt = "ALERTA ROJA · LA PUERTA DE ESTRENO ESTÁ ABIERTA · ¡CORRE!";
        return true;
      },
      triggerEscape: () => {
        if (!qaMode) return false;
        qaBridge.triggerRedAlert();
        player.set(exitPosition.x, PLAYER_HEIGHT, exitPosition.z);
        interact(simulationTime);
        return Boolean(escapeSequence);
      },
      triggerSecretEscape: () => {
        if (!qaMode) return false;
        for (let i = 0; i < WALK_TAPES.length; i += 1) {
          if (!tapeIndices.includes(i)) tapeIndices.push(i);
        }
        tapesHeld = WALK_TAPES.length;
        ghostBlessed = true;
        (["neverland-vitrine", "ghost-vinyl", "fazbear-honk"] as StudioEggId[]).forEach((id) => {
          if (!eggsFound.includes(id)) eggsFound.push(id);
        });
        redAlert = true;
        player.set(exitPosition.x, PLAYER_HEIGHT, exitPosition.z);
        interact(simulationTime);
        return Boolean(escapeSequence);
      },
    };
    const walkWindow = window as Window & { __M00NQA__?: typeof qaBridge };
    walkWindow.__M00NQA__ = qaBridge;
    qaActionsRef.current = qaMode ? qaBridge : null;

    // If launched via Quick Retry, immediately start audio & pointer lock
    if (autoStartNextRunRef.current) {
      autoStartNextRunRef.current = false;
      startAudio();
      requestControl();
    }

    renderFrame(performance.now());

    return () => {
      rigLoadCancelled = true;
      cctvEncounterGenerationRef.current += 1;
      encounterTimers.forEach((t) => window.clearTimeout(t));
      encounterTimers.clear();
      inputController.reset(performance.now());
      mobilePointers.clear();
      cancelAnimationFrame(animation);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearFocus);
      document.removeEventListener("visibilitychange", clearHidden);
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerlockchange", pointerLockChange);
      renderer.domElement.removeEventListener("click", canvasClick);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("lostpointercapture", pointerUp);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
      enemyMixer.stopAllAction();
      enemyMixer.uncacheRoot(subjectDetail);
      pbrTextures.forEach((t) => t.dispose());
      biomeComplex.dispose();
      studioEnv.dispose();
      cctvTarget.dispose();
      cctvDisplayGeometry.dispose();
      cctvDisplayMaterial.dispose();
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh) && !(obj instanceof THREE.Points)) return;
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      canvasRef.current = null;
      if (walkWindow.__M00NQA__ === qaBridge) delete walkWindow.__M00NQA__;
      if (qaActionsRef.current === qaBridge) qaActionsRef.current = null;
      delete mount.dataset.qa;
    };
  }, [clearCctvEncounter, quality, requestControl, runEpoch, seed, setGamePhase, startAudio]);

  useEffect(() => {
    audioRef.current?.setLevels(audioLevels);
  }, [audioLevels]);

  useEffect(
    () => () => {
      if (audioRef.current) {
        void audioRef.current.cleanup();
        audioRef.current = null;
      }
    },
    [],
  );

  const chooseCamera = useCallback(
    (index: number, eventTimestamp: number) => {
      clearCctvEncounter();
      cctvIndexRef.current = index;
      setCctvIndex(index);
      void primeCctvAudio().then((ok) => ok && tabletRef.current && audioRef.current?.playCctvStatic({ duration: 0.2, gain: 0.14 }));
      if (difficultyRef.current === "turista") return;
      const visitCount = cctvVisitRef.current + 1;
      cctvVisitRef.current = visitCount;
      const decision = decideCctvEncounter(
        seed,
        index,
        visitCount,
        cctvQuietVisitsRef.current,
        eventTimestamp - cctvLastEncounterAtRef.current,
        motionDetected,
      );
      if (!decision.trigger) {
        cctvQuietVisitsRef.current += 1;
        return;
      }
      cctvQuietVisitsRef.current = 0;
      cctvLastEncounterAtRef.current = eventTimestamp;
      const mascot = mascotForCamera(seed + visitCount * 13, index);
      const gen = cctvEncounterGenerationRef.current;
      const sched = (delay: number, fn: () => void) => {
        const timer = window.setTimeout(() => {
          cctvEncounterTimersRef.current.delete(timer);
          if (gen === cctvEncounterGenerationRef.current && tabletRef.current) fn();
        }, delay);
        cctvEncounterTimersRef.current.add(timer);
      };
      sched(decision.revealDelayMs, () => {
        cctvEncounterRef.current = mascot;
        cctvEncounterPhaseRef.current = "presence";
        setCctvEncounter(mascot);
        setCctvEncounterPhase("presence");
        audioRef.current?.playMascotWarning(mascot.screamVariant);
      });
      sched(decision.revealDelayMs + 620, () => {
        cctvEncounterPhaseRef.current = "scream";
        setCctvEncounterPhase("scream");
        vibrateScare();
        audioRef.current?.playMascotScream(mascot.screamVariant, 1.18);
      });
      sched(decision.revealDelayMs + decision.visibleDurationMs, () => {
        cctvEncounterRef.current = null;
        cctvEncounterPhaseRef.current = "idle";
        setCctvEncounter(null);
        setCctvEncounterPhase("idle");
      });
    },
    [clearCctvEncounter, motionDetected, primeCctvAudio, seed],
  );

  const beginMobileAction = (action: WalkInputAction, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (phaseRef.current !== "playing" || tabletRef.current) return;
    event.preventDefault();
    const ts = pointerEventTimestamp(event);
    const source = `touch:${event.pointerId}`;
    const prev = mobilePointersRef.current.get(event.pointerId);
    if (prev && prev.action !== action) inputControllerRef.current?.release(prev.action, prev.source, ts);
    mobilePointersRef.current.set(event.pointerId, { action, source });
    inputControllerRef.current?.press(action, source, ts);
  };

  const endMobileAction = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = mobilePointersRef.current.get(event.pointerId);
    if (!active) return;
    event.preventDefault();
    inputControllerRef.current?.release(active.action, active.source, pointerEventTimestamp(event));
    mobilePointersRef.current.delete(event.pointerId);
  };

  const updateAudioLevel = useCallback((key: keyof AudioLevels, value: number) => {
    setAudioLevels((levels) => ({ ...levels, [key]: value }));
  }, []);

  return (
    <main
      className={`walk-game phase-${phase} enemy-${hud.enemyMode} ${hud.redAlert ? "red-alert" : ""}`}
      style={{ "--fear": phase === "playing" ? fearLevel(hud.bpm).toFixed(3) : 0 } as CSSProperties}
    >
      <div ref={mountRef} className="walk-stage" aria-label="Estudios Plató 22 · M00NW4LK.EXE" />
      <div className="walk-noise" aria-hidden="true" />
      <div className="walk-vignette" aria-hidden="true" />
      <div className="walk-fear" aria-hidden="true" />
      {phase === "playing" && !tabletOpen && (
        <div className="walk-vhs" aria-hidden="true">
          <i className="vhs-tracking" />
          <span className="vhs-play">▶ PLAY · SP · PLATÓ 22</span>
        </div>
      )}

      {activeJumpscare && (
        <div className={`mascot-jumpscare mascot-${activeJumpscare.id}`} aria-hidden="true">
          <div className="mascot-jumpscare-face" style={{ backgroundImage: `url(${activeJumpscare.image})` }} />
          <div className="mascot-jumpscare-id">
            <span>ARCHIVO PARÁSITO · SCREAM FEED</span>
            <strong>{activeJumpscare.name}</strong>
            <small>{activeJumpscare.signal}</small>
          </div>
        </div>
      )}

      {runtimeError && (
        <div className="runtime-error" role="alert">
          <strong>RECUPERANDO MOTOR 3D</strong>
          <span>{runtimeError}</span>
        </div>
      )}

      <header className="walk-topbar">
        <Link href="/#juegos" className="walk-back">← VOLVER A JUEGOS</Link>
        <div>
          <span className="rec-dot" />
          BODY CAM · M00NW4LK.EXE · 13×13
        </div>
        <span className="walk-timecode">
          <b ref={timecodeRef}>00:00:00:00</b>
          <small>PLATÓ #{seed}</small>
        </span>
      </header>

      {phase === "playing" && !tabletOpen && (
        <WalkHud
          hud={hud}
          pointerHelp={pointerHelp}
          tabletOpen={tabletOpen}
          onRequestControl={requestControl}
        />
      )}

      {qaSummary && phase === "playing" && !tabletOpen && (
        <div className="qa-bar" role="region" aria-label="Diagnóstico QA">
          <span>{qaSummary}</span>
          <button type="button" onClick={() => qaActionsRef.current?.visitNextBiome()}>
            QA: SIGUIENTE BIOMA
          </button>
          <button type="button" onClick={() => qaActionsRef.current?.triggerRedAlert()}>
            QA: ALERTA ROJA
          </button>
          <button type="button" onClick={() => qaActionsRef.current?.triggerEscape()}>
            QA: ESCAPE 3D
          </button>
          <button type="button" onClick={() => qaActionsRef.current?.triggerSecretEscape()}>
            QA: FINAL SECRETO
          </button>
        </div>
      )}

      {inVent && !tabletOpen && (
        <div className="vent-overlay" role="status">
          <div className="vent-frame" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="vent-route-readout">
            <small>CONDUCTO DE MANTENIMIENTO · {ventRoute}</small>
            <strong>{String(ventProgress).padStart(2, "0")}%</strong>
            <div><i style={{ width: `${ventProgress}%` }} /></div>
            <span>W/S AVANZA · A/D O RATÓN GIRAN</span>
          </div>
        </div>
      )}

      {tabletOpen && phase === "playing" && (
        <WalkCctv
          cctvFeedRef={cctvFeedRef}
          cameraNames={CAMERA_NAMES}
          cctvIndex={cctvIndex}
          signalLost={signalLost}
          motionDetected={motionDetected}
          cctvEncounter={cctvEncounter}
          cctvEncounterPhase={cctvEncounterPhase}
          power={power}
          tapesHeld={hud.tapes.length}
          mapSegments={mapSegments}
          mapPlayer={mapPlayer}
          cameraMapPositions={cameraMapPositions}
          tapeMapMarkers={tapeMapMarkers}
          wingMapLabels={wingMapLabels}
          exitMapMarker={exitMapMarker}
          onPrimeAudio={() => void primeCctvAudio()}
          onChooseCamera={chooseCamera}
          onClose={handleCloseTablet}
        />
      )}

      {phase === "briefing" && (
        <WalkBriefing
          bootLines={BOOT_LINES}
          bootStep={bootStep}
          difficulty={difficulty}
          quality={quality}
          audioLevels={audioLevels}
          message={message}
          sceneReady={sceneReady}
          onDifficulty={setDifficulty}
          onQuality={setQuality}
          onAudioLevel={updateAudioLevel}
          onPreviewMascot={previewMascotScream}
          onBegin={beginGame}
        />
      )}

      {(phase === "caught" || phase === "escaped") && (
        <WalkEnding
          phase={phase}
          message={message}
          stats={runStats}
          onQuickRetry={quickRetry}
          onNewMaze={newMaze}
        />
      )}

      {phase === "playing" && (
        <div className="mobile-controls" aria-label="Controles táctiles">
          <div className="mobile-pad">
            {(["forward", "left", "backward", "right"] as const).map((dir, i) => (
              <button
                key={dir}
                type="button"
                onPointerDown={(e) => beginMobileAction(dir, e)}
                onPointerUp={endMobileAction}
                onPointerCancel={endMobileAction}
              >
                {["W", "A", "S", "D"][i]}
              </button>
            ))}
          </div>
          <div className="mobile-actions">
            <button type="button" onPointerDown={(e) => beginMobileAction("sprint", e)} onPointerUp={endMobileAction}>RUN</button>
            <button type="button" onPointerDown={(e) => beginMobileAction("crouch", e)} onPointerUp={endMobileAction}>CTRL</button>
            <button
              type="button"
              onClick={() => {
                if (power <= 0) return;
                void primeCctvAudio();
                tabletRef.current = !tabletRef.current;
                setTabletOpen(tabletRef.current);
                if (tabletRef.current) document.exitPointerLock?.();
              }}
            >
              CAM
            </button>
            <button type="button" onClick={() => { interactQueuedRef.current = true; }}>E</button>
            <button type="button" onClick={() => { dropQueuedRef.current = true; }}>G</button>
            <button type="button" onClick={() => { objectQueuedRef.current = true; }}>Q</button>
          </div>
        </div>
      )}
    </main>
  );
}
