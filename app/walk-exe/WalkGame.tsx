"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CELL_SIZE,
  CROUCH_HEIGHT,
  MAZE_SIZE,
  PLAYER_HEIGHT,
  WALL_HEIGHT,
  WALL_THICKNESS,
  chooseSpreadCells,
  corridorLineOfSight,
  createAcousticEvent,
  createMaze,
  createZoneMap,
  decideEnemyState,
  extrapolateAcousticTrailCell,
  farthestCell,
  mazeDistances,
  mazePath,
  openingDirection,
  positionCell2D,
  pruneAcousticEvents,
  resolveGridMovement,
  selectAcousticTarget,
  seededRandom,
  uniqueReachableCells,
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
  advanceVentTraversal,
  drainCctvBattery,
  resynchronizeFixedClock,
  sequenceProgress,
} from "./runtime-core";
import {
  WalkInputController,
  walkInputActionForCode,
  type InputSlice,
  type WalkInputAction,
} from "./input-controller";
import {
  SCARE_ROSTER,
  decideCctvEncounter,
  mascotForCamera,
  mascotForCatch,
  type ScareMascot,
} from "./scare-roster";
import {
  SUBJECT_MATERIALS,
  SUBJECT_TEXTURE_SETS,
  subjectTextureAnisotropy,
  subjectTextureVariant,
} from "./subject-materials";

type GamePhase = "briefing" | "playing" | "caught" | "escaped";
type QualityProfile = "low" | "medium" | "high" | "ultra";
type CctvEncounterPhase = "idle" | "presence" | "scream";
type AudioLevels = {
  master: number;
  ambience: number;
  music: number;
  sfx: number;
  heartbeat: number;
  jumpscare: number;
};

type RuntimeEcho = {
  mesh: THREE.Group;
  cell: number;
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
};

type CaughtSequence = {
  startedAt: number;
  subjectStart: THREE.Vector3;
  subjectYaw: number;
};

const JUMPSCARE_DURATION_MS = 1120;

const cameraNames = [
  "CAM 01 · GALERÍA OESTE",
  "CAM 02 · CUARTO DE FIESTA",
  "CAM 03 · CONDUCTOS",
  "CAM 04 · PASO DE SERVICIO",
  "CAM 05 · ARCHIVO 22",
  "CAM 06 · SALIDA",
];

const qualitySettings: Record<
  QualityProfile,
  {
    pixelRatio: number;
    dust: number;
    localLights: number;
    shadows: boolean;
    cctvWidth: number;
    cctvFps: number;
  }
> = {
  low: {
    pixelRatio: 0.85,
    dust: 180,
    localLights: 4,
    shadows: false,
    cctvWidth: 480,
    cctvFps: 10,
  },
  medium: {
    pixelRatio: 1,
    dust: 360,
    localLights: 6,
    shadows: false,
    cctvWidth: 640,
    cctvFps: 12,
  },
  high: {
    pixelRatio: 1.25,
    dust: 620,
    localLights: 8,
    shadows: false,
    cctvWidth: 854,
    cctvFps: 15,
  },
  ultra: {
    pixelRatio: 1.55,
    dust: 900,
    localLights: 10,
    shadows: true,
    cctvWidth: 960,
    cctvFps: 20,
  },
};

const enemyStateLabels: Record<EnemyState, string> = {
  patrol: "PATRULLA",
  listen: "ESCUCHANDO",
  investigate: "INVESTIGANDO",
  search: "BUSCANDO",
  chase: "PERSECUCIÓN",
  lure: "DISTRAÍDO",
  "vent-watch": "VIGILANDO CONDUCTO",
  ambush: "EMBOSCADA",
  recover: "RECALCULANDO",
};

function cellCenter(index: number) {
  const row = Math.floor(index / MAZE_SIZE);
  const column = index % MAZE_SIZE;
  const half = (MAZE_SIZE * CELL_SIZE) / 2;
  return new THREE.Vector3(
    -half + CELL_SIZE / 2 + column * CELL_SIZE,
    0,
    -half + CELL_SIZE / 2 + row * CELL_SIZE,
  );
}

function positionCell(position: THREE.Vector3) {
  return positionCell2D(position.x, position.z);
}

function sectorForCell(index: number) {
  const row = Math.floor(index / MAZE_SIZE);
  const column = index % MAZE_SIZE;
  return `${String.fromCharCode(65 + Math.floor(row / 4))}-${String(
    column + 1,
  ).padStart(2, "0")}`;
}

function material(
  color: THREE.ColorRepresentation,
  roughness = 0.72,
  metalness = 0.12,
) {
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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createSubjectM() {
  const root = new THREE.Group();
  root.name = "SUJETO_M";

  const black = material(0x080809, 0.42, 0.45);
  const jacket = material(0x17181c, 0.55, 0.32);
  const chrome = material(0x72767c, 0.2, 0.92);
  const skin = material(0x777a73, 0.64, 0.38);
  const white = material(0xe9e6dd, 0.48, 0.14);
  const red = new THREE.MeshStandardMaterial({
    color: 0x330000,
    emissive: 0xff0909,
    emissiveIntensity: 3,
  });

  const hips = new THREE.Group();
  hips.name = "hips";
  hips.position.y = 1.7;
  root.add(hips);

  const torso = addMesh(
    hips,
    new THREE.BoxGeometry(0.94, 1.18, 0.48, 2, 3, 2),
    jacket,
    [0, 0.28, 0],
  );
  torso.scale.x = 0.92;
  addMesh(hips, new THREE.BoxGeometry(0.27, 1.03, 0.07), white, [0, 0.28, -0.27]);
  addMesh(hips, new THREE.BoxGeometry(0.75, 0.06, 0.07), chrome, [0, 0.72, -0.31]);
  addMesh(hips, new THREE.CylinderGeometry(0.1, 0.13, 0.16, 12), red, [0, 0.18, -0.3], [Math.PI / 2, 0, 0]);
  addMesh(hips, new THREE.BoxGeometry(0.36, 1.28, 0.12), jacket, [-0.31, -0.46, 0.18], [0.08, 0, 0.08]);
  addMesh(hips, new THREE.BoxGeometry(0.36, 1.42, 0.12), jacket, [0.31, -0.52, 0.18], [-0.1, 0, -0.08]);
  for (let cable = -1; cable <= 1; cable += 1) {
    addMesh(
      hips,
      new THREE.TorusGeometry(0.31 + Math.abs(cable) * 0.08, 0.018, 6, 20, Math.PI),
      cable === 0 ? red : chrome,
      [cable * 0.18, 0.18, 0.28],
      [Math.PI / 2, cable * 0.3, 0],
    );
  }

  const headPivot = new THREE.Group();
  headPivot.name = "head";
  headPivot.position.set(0, 1.15, 0);
  hips.add(headPivot);
  addMesh(headPivot, new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12), chrome, [0, -0.08, 0]);
  addMesh(
    headPivot,
    new THREE.SphereGeometry(0.42, 24, 18),
    skin,
    [0, 0.33, -0.02],
    [0, 0, 0],
  ).scale.set(0.82, 1.08, 0.88);
  addMesh(headPivot, new THREE.SphereGeometry(0.43, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), black, [0, 0.48, 0.02]);
  addMesh(headPivot, new THREE.BoxGeometry(0.1, 0.035, 0.055), black, [-0.15, 0.39, -0.37]);
  addMesh(headPivot, new THREE.BoxGeometry(0.1, 0.035, 0.055), black, [0.15, 0.39, -0.37]);
  addMesh(headPivot, new THREE.SphereGeometry(0.045, 12, 8), red, [-0.15, 0.37, -0.405]);
  addMesh(headPivot, new THREE.SphereGeometry(0.045, 12, 8), red, [0.15, 0.37, -0.405]);
  addMesh(headPivot, new THREE.ConeGeometry(0.08, 0.24, 8), skin, [0, 0.26, -0.43], [Math.PI / 2, 0, 0]);
  const jaw = new THREE.Group();
  jaw.name = "jaw";
  jaw.position.set(0, 0.06, -0.37);
  headPivot.add(jaw);
  addMesh(jaw, new THREE.BoxGeometry(0.34, 0.16, 0.12), chrome, [0, 0, 0]);
  for (let tooth = -2; tooth <= 2; tooth += 1) {
    addMesh(
      jaw,
      new THREE.BoxGeometry(0.035, 0.08, 0.035),
      white,
      [tooth * 0.06, 0.02, -0.075],
    );
  }
  addMesh(headPivot, new THREE.TorusGeometry(0.17, 0.025, 6, 16, Math.PI), chrome, [0, -0.03, 0.02], [Math.PI / 2, 0, 0]);

  const hat = new THREE.Group();
  hat.name = "hat";
  hat.position.set(0, 0.66, -0.01);
  headPivot.add(hat);
  addMesh(hat, new THREE.CylinderGeometry(0.5, 0.5, 0.055, 28), black, [0, 0, 0]);
  addMesh(hat, new THREE.CylinderGeometry(0.32, 0.38, 0.36, 24), black, [0, 0.18, 0]);
  addMesh(hat, new THREE.CylinderGeometry(0.385, 0.385, 0.055, 24), white, [0, 0.08, 0]);

  const makeArm = (side: -1 | 1, glove: boolean) => {
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? "armLeft" : "armRight";
    shoulder.position.set(side * 0.58, 0.66, 0);
    hips.add(shoulder);
    addMesh(shoulder, new THREE.SphereGeometry(0.18, 12, 8), chrome, [0, 0, 0]);
    addMesh(shoulder, new THREE.CapsuleGeometry(0.14, 0.58, 5, 10), jacket, [0, -0.42, 0]);
    addMesh(shoulder, new THREE.TorusGeometry(0.145, 0.04, 8, 16), chrome, [0, -0.8, 0], [Math.PI / 2, 0, 0]);
    addMesh(shoulder, new THREE.CapsuleGeometry(0.12, 0.52, 5, 10), black, [0, -1.12, 0]);
    const hand = addMesh(
      shoulder,
      new THREE.SphereGeometry(0.17, 14, 10),
      glove ? white : chrome,
      [0, -1.52, 0],
    );
    hand.scale.set(0.72, 1.12, 0.55);
    for (let finger = -2; finger <= 2; finger += 1) {
      addMesh(
        shoulder,
        new THREE.CapsuleGeometry(0.022, 0.15, 3, 6),
        glove ? white : chrome,
        [finger * 0.052, -1.68 - Math.abs(finger) * 0.012, -0.025],
        [0.08, 0, finger * 0.08],
      );
    }
  };
  makeArm(-1, true);
  makeArm(1, false);

  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.name = side < 0 ? "legLeft" : "legRight";
    leg.position.set(side * 0.25, -0.3, 0);
    hips.add(leg);
    addMesh(leg, new THREE.CapsuleGeometry(0.17, 0.65, 5, 10), black, [0, -0.42, 0]);
    addMesh(leg, new THREE.TorusGeometry(0.17, 0.045, 8, 16), chrome, [0, -0.83, 0], [Math.PI / 2, 0, 0]);
    addMesh(leg, new THREE.CapsuleGeometry(0.14, 0.62, 5, 10), black, [0, -1.2, 0]);
    addMesh(leg, new THREE.BoxGeometry(0.35, 0.2, 0.68), black, [0, -1.62, -0.14]);
    addMesh(leg, new THREE.BoxGeometry(0.28, 0.06, 0.42), white, [0, -1.5, -0.08]);
  };
  makeLeg(-1);
  makeLeg(1);

  root.scale.setScalar(1.08);
  return root;
}

function createSubjectMProxy() {
  const proxy = new THREE.Group();
  proxy.name = "SUJETO_M_PROXY";
  const dark = material(0x060709, 0.48, 0.46);
  const ivory = material(0xb8b4aa, 0.76, 0.06);
  const metal = material(0x555b5d, 0.34, 0.8);
  const glove = material(0xdedbd1, 0.3, 0.22);
  const eye = new THREE.MeshStandardMaterial({
    color: 0x220000,
    emissive: 0xe30d0d,
    emissiveIntensity: 2.5,
  });
  addMesh(
    proxy,
    new THREE.BoxGeometry(0.86, 1.16, 0.42),
    ivory,
    [0, 2.02, 0],
  );
  addMesh(
    proxy,
    new THREE.BoxGeometry(0.26, 1.02, 0.045),
    dark,
    [0, 2.03, -0.235],
  );
  addMesh(
    proxy,
    new THREE.CapsuleGeometry(0.15, 0.73, 4, 8),
    dark,
    [-0.24, 0.93, 0],
  );
  addMesh(
    proxy,
    new THREE.CapsuleGeometry(0.15, 0.73, 4, 8),
    dark,
    [0.24, 0.93, 0],
  );
  addMesh(
    proxy,
    new THREE.BoxGeometry(0.34, 0.18, 0.62),
    dark,
    [-0.24, 0.24, -0.15],
  );
  addMesh(
    proxy,
    new THREE.BoxGeometry(0.34, 0.18, 0.62),
    dark,
    [0.24, 0.24, -0.15],
  );
  addMesh(
    proxy,
    new THREE.CapsuleGeometry(0.12, 0.9, 4, 8),
    ivory,
    [-0.57, 1.8, 0],
  );
  addMesh(
    proxy,
    new THREE.CapsuleGeometry(0.1, 0.96, 4, 8),
    metal,
    [0.57, 1.77, 0],
  );
  addMesh(
    proxy,
    new THREE.SphereGeometry(0.15, 9, 7),
    glove,
    [-0.57, 1.14, 0],
  );
  addMesh(
    proxy,
    new THREE.SphereGeometry(0.34, 14, 10),
    metal,
    [0, 2.86, 0],
    [0, 0, 0],
  ).scale.set(0.82, 1.08, 0.9);
  addMesh(
    proxy,
    new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    ivory,
    [0, 2.88, -0.03],
  ).scale.set(0.82, 1.08, 0.92);
  addMesh(
    proxy,
    new THREE.CylinderGeometry(0.48, 0.48, 0.055, 16),
    dark,
    [0, 3.22, 0],
    [0.04, 0, -0.08],
  );
  addMesh(
    proxy,
    new THREE.CylinderGeometry(0.29, 0.35, 0.34, 14),
    dark,
    [0, 3.39, 0],
    [0.04, 0, -0.08],
  );
  addMesh(
    proxy,
    new THREE.SphereGeometry(0.05, 8, 6),
    eye,
    [-0.12, 2.9, -0.3],
  );
  addMesh(
    proxy,
    new THREE.SphereGeometry(0.05, 8, 6),
    eye,
    [0.12, 2.9, -0.3],
  );
  proxy.scale.setScalar(0.92);
  return proxy;
}

function createSubjectMotionClips() {
  const cyclic = (
    name: string,
    duration: number,
    legSwing: number,
    armSwing: number,
    hipsTravel: number,
  ) =>
    new THREE.AnimationClip(name, duration, [
      new THREE.NumberKeyframeTrack(
        "legLeft.rotation[x]",
        [0, duration * 0.25, duration * 0.5, duration * 0.75, duration],
        [0, legSwing, 0, -legSwing, 0],
      ),
      new THREE.NumberKeyframeTrack(
        "legRight.rotation[x]",
        [0, duration * 0.25, duration * 0.5, duration * 0.75, duration],
        [0, -legSwing, 0, legSwing, 0],
      ),
      new THREE.NumberKeyframeTrack(
        "armLeft.rotation[x]",
        [0, duration * 0.25, duration * 0.5, duration * 0.75, duration],
        [0, -armSwing, 0, armSwing, 0],
      ),
      new THREE.NumberKeyframeTrack(
        "armRight.rotation[x]",
        [0, duration * 0.25, duration * 0.5, duration * 0.75, duration],
        [0, armSwing, 0, -armSwing, 0],
      ),
      new THREE.NumberKeyframeTrack(
        "hips.position[z]",
        [0, duration * 0.5, duration],
        [0, hipsTravel, 0],
      ),
    ]);
  return {
    idle: cyclic("idle", 2.4, 0.025, 0.02, 0.012),
    moonwalk: cyclic("moonwalk", 1.18, 0.42, 0.2, -0.12),
    investigate: cyclic("investigate", 0.92, 0.3, 0.18, -0.06),
    chase: cyclic("chase", 0.54, 0.62, 0.48, -0.08),
  };
}

function createEcho(color = 0x87d9e9) {
  const ghost = new THREE.Group();
  const glow = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.42,
    roughness: 0.18,
  });
  addMesh(ghost, new THREE.CapsuleGeometry(0.22, 0.64, 6, 12), glow, [0, 0.84, 0]);
  addMesh(ghost, new THREE.SphereGeometry(0.26, 16, 12), glow, [0, 1.48, 0]);
  addMesh(ghost, new THREE.CapsuleGeometry(0.08, 0.42, 4, 8), glow, [-0.18, 0.68, 0], [0, 0, -0.24]);
  addMesh(ghost, new THREE.CapsuleGeometry(0.08, 0.42, 4, 8), glow, [0.18, 0.68, 0], [0, 0, 0.24]);
  const light = new THREE.PointLight(color, 5, 5);
  light.position.y = 1.1;
  ghost.add(light);
  return ghost;
}

function createSecurityCamera() {
  const camera = new THREE.Group();
  const casing = material(0xaeb0a6, 0.44, 0.62);
  const dark = material(0x090a0a, 0.22, 0.8);
  addMesh(camera, new THREE.BoxGeometry(0.74, 0.46, 0.9), casing, [0, 0, 0]);
  addMesh(camera, new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20), dark, [0, 0, -0.52], [Math.PI / 2, 0, 0]);
  addMesh(
    camera,
    new THREE.CylinderGeometry(0.1, 0.1, 0.13, 18),
    new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xe31616, emissiveIntensity: 1.6 }),
    [0, 0, -0.6],
    [Math.PI / 2, 0, 0],
  );
  addMesh(camera, new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), casing, [0, 0.48, 0.24], [0.4, 0, 0]);
  return camera;
}

function createExitDoor() {
  const door = new THREE.Group();
  const steel = material(0x303336, 0.38, 0.86);
  const red = new THREE.MeshStandardMaterial({
    color: 0x420606,
    emissive: 0xe01111,
    emissiveIntensity: 1.25,
  });
  addMesh(door, new THREE.BoxGeometry(0.28, 3.35, 0.34), steel, [-1.08, 1.66, 0]);
  addMesh(door, new THREE.BoxGeometry(0.28, 3.35, 0.34), steel, [1.08, 1.66, 0]);
  addMesh(door, new THREE.BoxGeometry(2.44, 0.28, 0.34), steel, [0, 3.22, 0]);
  const panel = new THREE.Group();
  panel.name = "emergencyDoorPanel";
  addMesh(panel, new THREE.BoxGeometry(1.86, 2.9, 0.18), material(0x090909, 0.8, 0.3), [0, 1.48, 0]);
  addMesh(panel, new THREE.BoxGeometry(1.6, 0.14, 0.1), red, [0, 2.72, -0.13]);
  addMesh(panel, new THREE.BoxGeometry(0.22, 0.55, 0.18), red, [0.69, 1.52, -0.16]);
  door.add(panel);
  door.userData.panel = panel;
  return door;
}

export default function WalkExe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<GamePhase>("briefing");
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
  const [phase, setPhase] = useState<GamePhase>("briefing");
  const [seed, setSeed] = useState(220722);
  const [echoes, setEchoes] = useState(0);
  const [bpm, setBpm] = useState(48);
  const [distance, setDistance] = useState(99);
  const [traveled, setTraveled] = useState(0);
  const [sector, setSector] = useState("A-01");
  const [tabletOpen, setTabletOpen] = useState(false);
  const [cctvIndex, setCctvIndex] = useState(0);
  const [power, setPower] = useState(96);
  const [inVent, setInVent] = useState(false);
  const [ventProgress, setVentProgress] = useState(0);
  const [ventRoute, setVentRoute] = useState("SIN RUTA");
  const [pointerHelp, setPointerHelp] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [enemyMode, setEnemyMode] = useState<EnemyState>("patrol");
  const [quality, setQuality] = useState<QualityProfile>("high");
  const [motionDetected, setMotionDetected] = useState(false);
  const [signalLost, setSignalLost] = useState(false);
  const [cctvEncounter, setCctvEncounter] =
    useState<ScareMascot | null>(null);
  const [cctvEncounterPhase, setCctvEncounterPhase] =
    useState<CctvEncounterPhase>("idle");
  const [activeJumpscare, setActiveJumpscare] =
    useState<ScareMascot | null>(null);
  const [mapPlayer, setMapPlayer] = useState({ left: 3, top: 3 });
  const [cameraMapPositions, setCameraMapPositions] = useState<
    Array<{ left: number; top: number }>
  >([]);
  const [mapSegments, setMapSegments] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number }>
  >([]);
  const [audioLevels, setAudioLevels] = useState<AudioLevels>({
    master: 0.82,
    ambience: 0.72,
    music: 0.34,
    sfx: 0.82,
    heartbeat: 0.86,
    jumpscare: 0.68,
  });
  const [prompt, setPrompt] = useState("Encuentra una salida. No corras sin escuchar.");
  const [message, setMessage] = useState("El sistema está generando una ruta nueva.");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearCctvEncounter = useCallback(() => {
    cctvEncounterGenerationRef.current += 1;
    cctvEncounterTimersRef.current.forEach((timer) =>
      window.clearTimeout(timer),
    );
    cctvEncounterTimersRef.current.clear();
    cctvEncounterRef.current = null;
    cctvEncounterPhaseRef.current = "idle";
    setCctvEncounter(null);
    setCctvEncounterPhase("idle");
  }, []);

  const startAudio = useCallback(() => {
    const engine =
      audioRef.current ??
      new SpatialAudioEngine({
        seed,
        levels: audioLevels,
      });
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
          maxDistance: 44,
          rolloffFactor: 1.4,
        });
        engine.ensureEmitter("metal-impact", {
          bus: "sfx",
          gain: 0.9,
          refDistance: 1.2,
          maxDistance: 35,
          rolloffFactor: 1.55,
        });
      })
      .catch(() => {
        setMessage(
          "El navegador ha bloqueado el audio. El juego continúa en silencio.",
        );
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
          setMessage(
            "AUDIO BLOQUEADO · vuelve a pulsar OÍR para autorizar el sonido.",
          );
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
        void request.catch(() => {
          setPointerHelp(true);
          setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
        });
      }
    } catch {
      setPointerHelp(true);
      setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
    }
  }, []);

  const beginGame = useCallback(() => {
    startAudio();
    setGamePhase("playing");
    setActiveJumpscare(null);
    setPointerHelp(false);
    setPrompt("Sigue las marcas del suelo. WASD mueve; arrastra para mirar.");
    setMessage("Encuentra la puerta de emergencia. TAB abre la red CCTV.");
    // Pointer lock must be requested synchronously inside the user's click.
    requestControl();
  }, [requestControl, setGamePhase, startAudio]);

  const restart = useCallback(() => {
    document.exitPointerLock?.();
    clearCctvEncounter();
    if (audioRef.current) {
      void audioRef.current.cleanup();
      audioRef.current = null;
    }
    setEchoes(0);
    setTraveled(0);
    setPower(96);
    setTabletOpen(false);
    setInVent(false);
    setVentProgress(0);
    setVentRoute("SIN RUTA");
    setActiveJumpscare(null);
    tabletRef.current = false;
    setSeed(Math.floor(100000 + Math.random() * 899999));
    cctvVisitRef.current = 0;
    cctvQuietVisitsRef.current = 0;
    cctvLastEncounterAtRef.current = Number.NEGATIVE_INFINITY;
    setGamePhase("briefing");
    setMessage("El sistema ha destruido el mapa anterior.");
  }, [clearCctvEncounter, setGamePhase]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const inputController = inputControllerRef.current;
    if (!inputController) return;
    const mobilePointers = mobilePointersRef.current;
    inputController.reset(performance.now());
    mobilePointers.clear();
    setRuntimeError(null);

    let maze = createMaze(seed);
    let validation = validateMaze(maze);
    for (let attempt = 1; !validation.valid && attempt < 8; attempt += 1) {
      maze = createMaze(seed + attempt * 104729);
      validation = validateMaze(maze);
    }
    if (!validation.valid) {
      setRuntimeError(
        `MAPA RECHAZADO · ${validation.issues.join(" · ")}`,
      );
      return;
    }
    const capsuleWorld = createCapsuleCollisionWorld(maze, {
      size: MAZE_SIZE,
      cellSize: CELL_SIZE,
      wallThickness: WALL_THICKNESS,
      standingEyeHeight: PLAYER_HEIGHT,
      crouchingEyeHeight: CROUCH_HEIGHT,
    });
    const zones = createZoneMap(maze, seed);
    const random = seededRandom(seed * 7 + 22);
    const graphics = qualitySettings[quality];
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const qaMode = new URLSearchParams(window.location.search).has("qa");
    const exitCell = farthestCell(maze, 0);
    const spread = chooseSpreadCells(maze, seed, 14);
    const enemyStart = spread[0] ?? exitCell;
    const echoCells = spread.slice(1, 8);
    const ventCells = spread.slice(8, 12);
    const cctvCells = uniqueReachableCells(
      maze,
      [0, exitCell, ...spread.slice(2)],
      6,
    );
    setCameraMapPositions(
      cctvCells.map((cell) => ({
        left:
          4 +
          ((cell % MAZE_SIZE) / Math.max(1, MAZE_SIZE - 1)) * 88,
        top:
          4 +
          (Math.floor(cell / MAZE_SIZE) /
            Math.max(1, MAZE_SIZE - 1)) *
            88,
      })),
    );
    const gridPercent = (coordinate: number) =>
      4 + (coordinate / Math.max(1, MAZE_SIZE - 1)) * 88;
    const schematic: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }> = [];
    maze.forEach((cell, index) => {
      const row = Math.floor(index / MAZE_SIZE);
      const column = index % MAZE_SIZE;
      if (cell.e && column + 1 < MAZE_SIZE) {
        schematic.push({
          x1: gridPercent(column),
          y1: gridPercent(row),
          x2: gridPercent(column + 1),
          y2: gridPercent(row),
        });
      }
      if (cell.s && row + 1 < MAZE_SIZE) {
        schematic.push({
          x1: gridPercent(column),
          y1: gridPercent(row),
          x2: gridPercent(column),
          y2: gridPercent(row + 1),
        });
      }
    });
    setMapSegments(schematic);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050807);
    scene.fog = new THREE.FogExp2(0x050807, 0.032);

    const camera = new THREE.PerspectiveCamera(
      74,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.05,
      34,
    );
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, graphics.pixelRatio),
    );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = graphics.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;
    renderer.info.autoReset = false;
    renderer.domElement.className = "walk-canvas";
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    const cctvTarget = new THREE.WebGLRenderTarget(
      graphics.cctvWidth,
      Math.round((graphics.cctvWidth * 9) / 16),
      {
        depthBuffer: true,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      },
    );
    cctvTarget.texture.colorSpace = THREE.SRGBColorSpace;
    cctvTarget.texture.name = "CCTV_FEED";
    const cctvDisplayScene = new THREE.Scene();
    const cctvDisplayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const cctvDisplayGeometry = new THREE.PlaneGeometry(2, 2);
    const cctvDisplayMaterial = new THREE.MeshBasicMaterial({
      map: cctvTarget.texture,
      toneMapped: false,
    });
    cctvDisplayScene.add(
      new THREE.Mesh(cctvDisplayGeometry, cctvDisplayMaterial),
    );

    const start = cellCenter(0);
    const startOpening = openingDirection(maze[0]);
    const player = new THREE.Vector3(start.x, PLAYER_HEIGHT, start.z);
    let capsuleState = createCapsuleState(capsuleWorld, {
      x: player.x,
      z: player.z,
    });
    let lastCapsuleCollided = false;
    let yaw = startOpening.yaw;
    let pitch = 0;
    let currentVentHeadingYaw = yaw;
    let traveledDistance = 0;
    let echoesHeld = 0;
    let nextHeartbeat = 0;
    let nextFootstep = 0;
    let nextEnemyStep = 0;
    let nextPathUpdate = 0;
    let lastHudUpdate = 0;
    let lastVentHudUpdate = 0;
    let cctvPower = 96;
    let lastReportedPower = 96;
    let enemyPath = mazePath(maze, enemyStart, 0);
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
    const MAX_CATCH_UP_STEPS = 15;
    let simulationTime = performance.now();
    let simulationAccumulator = 0;
    let lastRenderTime = performance.now();
    let clockResyncs = 0;
    let lastClockLagBeforeResyncMs = 0;
    let currentEnemyMode: EnemyState = "patrol";
    let currentEnemySpeed = 1.05;
    let currentPlayerDistance = 99;
    let currentRouteDistance = 99;
    let currentBpm = 42;
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
    let modelPreviewUntil = 0;
    let modelPreviewState: EnemyState = "listen";
    let qaEnemyStage: {
      distance: number;
      state: EnemyState;
      yawOffsetDegrees: number;
      verticalOffset: number;
    } | null = null;
    const qaNeutralLighting =
      new URLSearchParams(window.location.search).get("qa") !== "game";
    let nextObjectDropAt = 0;
    let lastAppliedVelocity = { x: 0, z: 0 };
    let lastInputSlices: InputSlice[] = [];

    const emitNoise = (kind: NoiseKind, cell: number, now: number) => {
      acousticEvents = pruneAcousticEvents(
        [...acousticEvents, createAcousticEvent(kind, cell, now)],
        now,
      );
    };

    const world = new THREE.Group();
    scene.add(world);
    scene.add(new THREE.HemisphereLight(0x9caaa5, 0x0b0d0c, 0.92));
    const emergencyLight = new THREE.DirectionalLight(0x7f948b, 0.68);
    emergencyLight.position.set(4, 12, 2);
    scene.add(emergencyLight);

    const createSurfaceTexture = (
      base: [number, number, number],
      variation: number,
      dataOnly = false,
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) return new THREE.CanvasTexture(canvas);
      const image = context.createImageData(canvas.width, canvas.height);
      for (let index = 0; index < image.data.length; index += 4) {
        const grain =
          (random() - 0.5) * variation +
          Math.sin(index * 0.0017) * variation * 0.12;
        image.data[index] = THREE.MathUtils.clamp(base[0] + grain, 0, 255);
        image.data[index + 1] = THREE.MathUtils.clamp(
          base[1] + grain * 0.86,
          0,
          255,
        );
        image.data[index + 2] = THREE.MathUtils.clamp(
          base[2] + grain * 0.72,
          0,
          255,
        );
        image.data[index + 3] = 255;
      }
      context.putImageData(image, 0, 0);
      context.globalAlpha = 0.2;
      for (let stain = 0; stain < 34; stain += 1) {
        context.fillStyle = stain % 3 ? "#080b09" : "#4b5148";
        context.beginPath();
        context.ellipse(
          random() * 256,
          random() * 256,
          3 + random() * 24,
          1 + random() * 9,
          random() * Math.PI,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(18, 18);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (!dataOnly) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const concreteColor = createSurfaceTexture([66, 72, 68], 48);
    const concreteRelief = createSurfaceTexture([128, 128, 128], 95, true);

    const concrete = new THREE.MeshStandardMaterial({
      color: 0x9aa09c,
      map: concreteColor,
      bumpMap: concreteRelief,
      roughness: 0.92,
      metalness: 0.05,
      bumpScale: 0.12,
    });
    const dampConcrete = new THREE.MeshStandardMaterial({
      color: 0x5d6861,
      map: concreteColor,
      bumpMap: concreteRelief,
      bumpScale: 0.08,
      roughness: 0.82,
      metalness: 0.18,
    });
    const metal = material(0x282d2c, 0.36, 0.88);
    addMesh(
      world,
      new THREE.PlaneGeometry(MAZE_SIZE * CELL_SIZE, MAZE_SIZE * CELL_SIZE),
      dampConcrete,
      [0, 0, 0],
      [-Math.PI / 2, 0, 0],
    );
    addMesh(
      world,
      new THREE.PlaneGeometry(MAZE_SIZE * CELL_SIZE, MAZE_SIZE * CELL_SIZE),
      concrete,
      [0, WALL_HEIGHT, 0],
      [Math.PI / 2, 0, 0],
    );

    const horizontalWall = new THREE.BoxGeometry(
      CELL_SIZE + 0.18,
      WALL_HEIGHT,
      WALL_THICKNESS,
    );
    const verticalWall = new THREE.BoxGeometry(
      WALL_THICKNESS,
      WALL_HEIGHT,
      CELL_SIZE + 0.18,
    );
    const horizontalWallPositions: Array<[number, number]> = [];
    const verticalWallPositions: Array<[number, number]> = [];
    const lightStride = Math.max(
      1,
      Math.floor((MAZE_SIZE * MAZE_SIZE) / graphics.localLights),
    );
    maze.forEach((cell, index) => {
      const center = cellCenter(index);
      const row = Math.floor(index / MAZE_SIZE);
      const column = index % MAZE_SIZE;
      if (!cell.n) {
        horizontalWallPositions.push([center.x, center.z - CELL_SIZE / 2]);
      }
      if (!cell.w) {
        verticalWallPositions.push([center.x - CELL_SIZE / 2, center.z]);
      }
      if (row === MAZE_SIZE - 1 && !cell.s) {
        horizontalWallPositions.push([center.x, center.z + CELL_SIZE / 2]);
      }
      if (column === MAZE_SIZE - 1 && !cell.e) {
        verticalWallPositions.push([center.x + CELL_SIZE / 2, center.z]);
      }

      if (index % 11 === 3) {
        const stain = addMesh(
          world,
          new THREE.PlaneGeometry(1.2 + random(), 1.8 + random()),
          new THREE.MeshBasicMaterial({
            color: random() > 0.5 ? 0x121a16 : 0x1b1010,
            transparent: true,
            opacity: 0.38,
          }),
          [center.x, 1.35, center.z - CELL_SIZE / 2 + 0.116],
        );
        stain.castShadow = false;
      }

      if (index % 19 === 2) {
        addMesh(
          world,
          new THREE.CylinderGeometry(0.07, 0.07, CELL_SIZE * 0.92, 8),
          metal,
          [center.x - 1.5, 3.48, center.z],
          [Math.PI / 2, 0, 0],
        );
      }

      if (index % lightStride === 0) {
        const lampSurface = new THREE.MeshStandardMaterial({
          color: 0x8f9381,
          emissive: random() > 0.3 ? 0xb3c2a1 : 0x2a1010,
          emissiveIntensity: 1.8,
        });
        addMesh(world, new THREE.BoxGeometry(0.16, 0.08, 1.15), lampSurface, [center.x, 3.69, center.z]);
        const light = new THREE.PointLight(
          random() > 0.25 ? 0xa9b7a0 : 0xc01b17,
          9,
          10,
          2.1,
        );
        light.position.set(center.x, 3.5, center.z);
        light.castShadow = graphics.shadows && index === 0;
        scene.add(light);
      }
    });

    const addWallInstances = (
      geometry: THREE.BufferGeometry,
      positions: Array<[number, number]>,
    ) => {
      const walls = new THREE.InstancedMesh(
        geometry,
        concrete,
        positions.length,
      );
      const transform = new THREE.Matrix4();
      positions.forEach(([x, z], index) => {
        transform.makeTranslation(x, WALL_HEIGHT / 2, z);
        walls.setMatrixAt(index, transform);
      });
      walls.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      walls.instanceMatrix.needsUpdate = true;
      walls.castShadow = false;
      walls.receiveShadow = false;
      world.add(walls);
    };
    addWallInstances(horizontalWall, horizontalWallPositions);
    addWallInstances(verticalWall, verticalWallPositions);

    const hazardCanvas = document.createElement("canvas");
    hazardCanvas.width = 128;
    hazardCanvas.height = 64;
    const hazardContext = hazardCanvas.getContext("2d");
    if (hazardContext) {
      hazardContext.fillStyle = "#b79a22";
      hazardContext.fillRect(0, 0, 128, 64);
      hazardContext.strokeStyle = "#11120f";
      hazardContext.lineWidth = 18;
      for (let stripe = -64; stripe < 192; stripe += 34) {
        hazardContext.beginPath();
        hazardContext.moveTo(stripe, 64);
        hazardContext.lineTo(stripe + 64, 0);
        hazardContext.stroke();
      }
    }
    const hazardTexture = new THREE.CanvasTexture(hazardCanvas);
    hazardTexture.colorSpace = THREE.SRGBColorSpace;
    hazardTexture.wrapS = THREE.RepeatWrapping;
    hazardTexture.repeat.set(2, 1);
    const hazardStripe = new THREE.MeshStandardMaterial({
      map: hazardTexture,
      emissive: 0x211901,
      emissiveIntensity: 0.26,
      roughness: 0.84,
      metalness: 0.18,
    });
    const junctionPlate = new THREE.PlaneGeometry(3.1, 1.8);
    const cabinet = material(0x20292b, 0.58, 0.72);
    const archivePaper = material(0x5f5949, 0.92, 0.02);
    const screenGlass = new THREE.MeshStandardMaterial({
      color: 0x0b2118,
      emissive: 0x38d98a,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.3,
    });
    const warningGlass = new THREE.MeshStandardMaterial({
      color: 0x2a0805,
      emissive: 0xff2b16,
      emissiveIntensity: 2.4,
      roughness: 0.28,
    });

    const decorGroups: THREE.Group[] = [];
    zones.forEach((zone, index) => {
      if (zone === "corridor") return;
      const center = cellCenter(index);
      const room = new THREE.Group();
      room.position.copy(center);
      room.userData.zone = zone;

      if (zone === "security") {
        addMesh(
          room,
          new THREE.BoxGeometry(1.55, 0.88, 0.58),
          cabinet,
          [1.15, 0.44, 1.35],
        );
        for (let monitor = -1; monitor <= 1; monitor += 1) {
          addMesh(
            room,
            new THREE.BoxGeometry(0.38, 0.28, 0.06),
            screenGlass,
            [0.8 + monitor * 0.42, 1.12, 1.06],
            [-0.12, 0, 0],
          );
        }
      }

      if (zone === "electrical") {
        addMesh(
          room,
          new THREE.BoxGeometry(1.45, 1.8, 0.32),
          cabinet,
          [-1.65, 0.9, 0.45],
        );
        for (let breaker = 0; breaker < 8; breaker += 1) {
          addMesh(
            room,
            new THREE.BoxGeometry(0.12, 0.18, 0.05),
            breaker % 3 === 0 ? warningGlass : metal,
            [
              -2 + (breaker % 4) * 0.25,
              0.58 + Math.floor(breaker / 4) * 0.34,
              0.26,
            ],
          );
        }
      }

      if (zone === "archive") {
        for (let shelf = -1; shelf <= 1; shelf += 1) {
          addMesh(
            room,
            new THREE.BoxGeometry(0.34, 2.3, 1.4),
            cabinet,
            [1.58, 1.15, shelf * 1.05],
          );
          for (let box = 0; box < 3; box += 1) {
            addMesh(
              room,
              new THREE.BoxGeometry(0.4, 0.28, 0.32),
              archivePaper,
              [1.35, 0.42 + box * 0.62, shelf * 1.05],
            );
          }
        }
      }

      if (zone === "maintenance") {
        for (let pipe = 0; pipe < 4; pipe += 1) {
          addMesh(
            room,
            new THREE.CylinderGeometry(0.1, 0.1, 3.3, 10),
            metal,
            [-1.7 + pipe * 0.28, 2.8, 0.2],
            [Math.PI / 2, 0, 0],
          );
        }
      }

      if (zone === "junction") {
        addMesh(
          room,
          junctionPlate,
          hazardStripe,
          [0, 0.018, 0],
          [-Math.PI / 2, 0, 0],
        );
      }

      world.add(room);
      decorGroups.push(room);
    });

    const dustPositions = new Float32Array(graphics.dust * 3);
    const worldHalf = (MAZE_SIZE * CELL_SIZE) / 2;
    for (let index = 0; index < graphics.dust; index += 1) {
      dustPositions[index * 3] = (random() - 0.5) * worldHalf * 2;
      dustPositions[index * 3 + 1] = 0.2 + random() * (WALL_HEIGHT - 0.4);
      dustPositions[index * 3 + 2] = (random() - 0.5) * worldHalf * 2;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(dustPositions, 3),
    );
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: 0x9daaa1,
        size: 0.035,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    );
    world.add(dust);

    const routeGuide = new THREE.MeshStandardMaterial({
      color: 0x789081,
      emissive: 0x9fcbb0,
      emissiveIntensity: 2.6,
      roughness: 0.44,
    });
    for (let marker = 0; marker < 3; marker += 1) {
      const longX = startOpening.x !== 0;
      addMesh(
        world,
        new THREE.BoxGeometry(
          longX ? 0.42 : 0.12,
          0.025,
          longX ? 0.12 : 0.42,
        ),
        routeGuide,
        [
          start.x + startOpening.x * (0.58 + marker * 0.48),
          0.018,
          start.z + startOpening.z * (0.58 + marker * 0.48),
        ],
      );
    }

    // The visible camera housing and its optical camera share one transform.
    const cctvCameras: THREE.PerspectiveCamera[] = [];
    cctvCells.forEach((cellIndex, index) => {
      const center = cellCenter(cellIndex);
      const nextCell = mazePath(maze, cellIndex, exitCell)[1] ?? cellIndex;
      const target = cellCenter(nextCell).setY(1.15);
      const securityCamera = createSecurityCamera();
      securityCamera.position.set(center.x + 1.45, 3.05, center.z + 1.45);
      securityCamera.lookAt(target);
      securityCamera.rotateX(index % 2 ? -0.05 : 0.05);
      const opticalCamera = new THREE.PerspectiveCamera(62, 16 / 9, 0.08, 65);
      opticalCamera.position.set(0, 0.08, 0.42);
      opticalCamera.rotation.y = Math.PI;
      opticalCamera.name = `CCTV_${String(index + 1).padStart(2, "0")}`;
      securityCamera.add(opticalCamera);
      cctvCameras.push(opticalCamera);
      world.add(securityCamera);
    });

    const exit = createExitDoor();
    const exitPosition = cellCenter(exitCell);
    const exitOpening = openingDirection(maze[exitCell]);
    exit.position.copy(exitPosition);
    exit.position.y = 0;
    exit.rotation.y = exitOpening.yaw;
    world.add(exit);
    const exitPanel = exit.getObjectByName("emergencyDoorPanel");
    const exitLight = new THREE.PointLight(0xff1717, 34, 10, 1.8);
    exitLight.position.copy(exitPosition).add(new THREE.Vector3(0, 2.4, 0));
    scene.add(exitLight);

    // Reusable dropped hardware: one shared geometry/material and no allocations
    // during gameplay. Q throws a metal part that SUJETO M can hear.
    const noiseObjectGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8);
    const noiseObjectMaterial = material(0x676d6d, 0.28, 0.92);
    const noiseObjects: RuntimeNoiseObject[] = Array.from(
      { length: 8 },
      (_, index) => {
        const mesh = new THREE.Mesh(noiseObjectGeometry, noiseObjectMaterial);
        mesh.name = `NOISE_OBJECT_${index + 1}`;
        mesh.rotation.z = Math.PI / 2;
        mesh.visible = false;
        world.add(mesh);
        return { mesh, activeUntil: 0 };
      },
    );

    const runtimeEchoes: RuntimeEcho[] = echoCells.map((cell, index) => {
      const mesh = createEcho(index % 2 ? 0x7ec6ff : 0xb58bff);
      const center = cellCenter(cell);
      mesh.position.set(center.x + (random() - 0.5), 0, center.z + (random() - 0.5));
      world.add(mesh);
      return { mesh, cell, collected: false };
    });

    const ventMeshes: THREE.Group[] = [];
    const ductRoutes: THREE.Group[] = [];
    const ventPairs: Array<[number, number]> = [
      [ventCells[0] ?? spread[1] ?? 1, ventCells[1] ?? spread[2] ?? 2],
      [ventCells[2] ?? spread[3] ?? 3, ventCells[3] ?? spread[4] ?? 4],
    ];
    const ventByCell = new Map<number, number>();
    ventPairs.forEach(([first, second], pairIndex) => {
      ventByCell.set(first, second);
      ventByCell.set(second, first);
      [first, second].forEach((cell, side) => {
        const center = cellCenter(cell);
        const vent = new THREE.Group();
        vent.position.set(center.x + (side ? -1.5 : 1.5), 0.72, center.z);
        vent.rotation.y = side ? Math.PI / 2 : -Math.PI / 2;
        addMesh(vent, new THREE.BoxGeometry(1.25, 1.2, 0.16), metal, [0, 0, 0]);
        for (let bar = -2; bar <= 2; bar += 1) {
          addMesh(vent, new THREE.BoxGeometry(0.08, 1, 0.06), material(0x080909, 0.4, 0.9), [bar * 0.22, 0, -0.11]);
        }
        const ventGlow = new THREE.PointLight(0x6f8090, 0.45, 3);
        ventGlow.position.set(0, 0, -0.3);
        vent.add(ventGlow);
        vent.userData.cell = cell;
        vent.userData.pair = pairIndex;
        world.add(vent);
        ventMeshes.push(vent);
      });
    });
    ventPairs.forEach((_, pairIndex) => {
      const pairVents = ventMeshes.filter(
        (vent) => vent.userData.pair === pairIndex,
      );
      if (pairVents.length !== 2) return;
      const first = pairVents[0].position;
      const second = pairVents[1].position;
      const dx = second.x - first.x;
      const dz = second.z - first.z;
      const length = Math.hypot(dx, dz);
      const duct = new THREE.Group();
      duct.name = `VENT_ROUTE_${pairIndex + 1}`;
      duct.position.set(
        (first.x + second.x) / 2,
        WALL_HEIGHT + 0.78,
        (first.z + second.z) / 2,
      );
      duct.rotation.y = -Math.atan2(dz, dx);
      const panel = material(0x181d1f, 0.52, 0.82);
      const ribs = material(0x080a0a, 0.4, 0.92);
      addMesh(
        duct,
        new THREE.BoxGeometry(length + 1.2, 0.08, 1.38),
        panel,
        [0, -0.59, 0],
      );
      addMesh(
        duct,
        new THREE.BoxGeometry(length + 1.2, 0.08, 1.38),
        panel,
        [0, 0.59, 0],
      );
      addMesh(
        duct,
        new THREE.BoxGeometry(length + 1.2, 1.24, 0.08),
        panel,
        [0, 0, -0.69],
      );
      addMesh(
        duct,
        new THREE.BoxGeometry(length + 1.2, 1.24, 0.08),
        panel,
        [0, 0, 0.69],
      );
      const ribCount = Math.min(8, Math.max(3, Math.floor(length / 6)));
      for (let rib = 0; rib <= ribCount; rib += 1) {
        addMesh(
          duct,
          new THREE.BoxGeometry(0.055, 1.18, 1.34),
          ribs,
          [-length / 2 + (rib / ribCount) * length, 0, 0],
        );
      }
      duct.visible = false;
      world.add(duct);
      ductRoutes[pairIndex] = duct;
    });

    const subjectDetailSlot = new THREE.Group();
    subjectDetailSlot.name = "SUJETO_M22_DETAIL_SLOT";
    const subjectFallback = createSubjectM();
    subjectDetailSlot.add(subjectFallback);
    let subjectDetail = subjectFallback;
    const subject = new THREE.LOD();
    subject.name = "SUJETO_M_LOD";
    subject.addLevel(subjectDetailSlot, 0);
    subject.addLevel(createSubjectMProxy(), 24);
    const enemyPosition = cellCenter(enemyStart);
    subject.position.set(enemyPosition.x, 0, enemyPosition.z);
    world.add(subject);
    let head = subjectDetail.getObjectByName("head");
    let jaw = subjectDetail.getObjectByName("jaw");
    let subjectHat = subjectDetail.getObjectByName("hat");
    let subjectHatBaseY = subjectHat?.position.y ?? 0.77;
    let facePlateLeft = subjectDetail.getObjectByName("facePlateLeft");
    let facePlateRight = subjectDetail.getObjectByName("facePlateRight");
    let chestCore = subjectDetail.getObjectByName("chestCore");
    let eyeGlowLeft = subjectDetail.getObjectByName(
      "eyeGlowLeft",
    ) as THREE.PointLight | undefined;
    let eyeGlowRight = subjectDetail.getObjectByName(
      "eyeGlowRight",
    ) as THREE.PointLight | undefined;
    let outerShellRetracted = false;
    let pbrMaterialsLoaded = false;
    let pbrMaterialsFailed = false;
    let pbrAppliedMaterials = 0;
    const pbrTextureVariant = subjectTextureVariant(quality);
    const pbrTextures = new Set<THREE.Texture>();
    let subjectEnvironmentTarget: THREE.WebGLRenderTarget | null = null;
    let servoMaterials: THREE.MeshStandardMaterial[] = [];
    const collectServoMaterials = () => {
      const collected = new Set<THREE.MeshStandardMaterial>();
      subjectDetail.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const surfaces = Array.isArray(object.material)
          ? object.material
          : [object.material];
        surfaces.forEach((surface) => {
          if (
            surface instanceof THREE.MeshStandardMaterial &&
            surface.name === "RED_SERVO_EMISSION"
          ) {
            collected.add(surface);
          }
        });
      });
      servoMaterials = [...collected];
    };
    collectServoMaterials();

    type SubjectTextureBundle = {
      baseColor: THREE.Texture;
      normal: THREE.Texture;
      rm?: THREE.Texture;
    };
    const subjectTextureLoader = new THREE.TextureLoader();
    const requestedAnisotropy = Math.min(
      subjectTextureAnisotropy(quality),
      renderer.capabilities.getMaxAnisotropy(),
    );
    const ensureSubjectEnvironment = () => {
      if (subjectEnvironmentTarget) return subjectEnvironmentTarget.texture;
      const environment = new RoomEnvironment();
      const generator = new THREE.PMREMGenerator(renderer);
      subjectEnvironmentTarget = generator.fromScene(environment, 0.04);
      environment.dispose();
      generator.dispose();
      subjectEnvironmentTarget.texture.name = "SUBJECT_M22_PMREM";
      return subjectEnvironmentTarget.texture;
    };
    const loadSubjectTexture = (
      url: string,
      colorTexture: boolean,
      repeat: readonly [number, number],
    ) =>
      new Promise<THREE.Texture | null>((resolve) => {
        const pendingTexture = subjectTextureLoader.load(
          url,
          (texture) => {
            if (rigLoadCancelled) {
              texture.dispose();
              resolve(null);
              return;
            }
            texture.colorSpace = colorTexture
              ? THREE.SRGBColorSpace
              : THREE.NoColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(...repeat);
            texture.anisotropy = requestedAnisotropy;
            texture.name = `SUBJECT_M22_${url.split("/").at(-1) ?? "TEXTURE"}`;
            texture.needsUpdate = true;
            pbrTextures.add(texture);
            resolve(texture);
          },
          undefined,
          () => {
            pendingTexture.dispose();
            resolve(null);
          },
        );
      });
    const loadSubjectTextureBundle = async (
      textureSet: (typeof SUBJECT_TEXTURE_SETS)[typeof pbrTextureVariant][keyof (typeof SUBJECT_TEXTURE_SETS)[typeof pbrTextureVariant]],
    ): Promise<SubjectTextureBundle | null> => {
      const [baseColor, normal, rm] = await Promise.all([
        loadSubjectTexture(textureSet.baseColor, true, textureSet.repeat),
        loadSubjectTexture(textureSet.normal, false, textureSet.repeat),
        textureSet.rm
          ? loadSubjectTexture(textureSet.rm, false, textureSet.repeat)
          : Promise.resolve(undefined),
      ]);
      if (!baseColor || !normal || (textureSet.rm && !rm)) {
        [baseColor, normal, rm].forEach((texture) => {
          if (!texture) return;
          pbrTextures.delete(texture);
          texture.dispose();
        });
        return null;
      }
      return { baseColor, normal, ...(rm ? { rm } : {}) };
    };
    const applySubjectPbrMaterials = async (model: THREE.Object3D) => {
      const textureSets = SUBJECT_TEXTURE_SETS[pbrTextureVariant];
      const requiredTextureSets = [
        ...new Set(
          Object.values(SUBJECT_MATERIALS).map(
            (definition) => definition.textureSet,
          ),
        ),
      ];
      const loadedTextureSets = new Map<
        keyof typeof textureSets,
        SubjectTextureBundle
      >();
      await Promise.all(
        requiredTextureSets.map(async (textureSetName) => {
          const bundle = await loadSubjectTextureBundle(
            textureSets[textureSetName],
          );
          if (bundle) loadedTextureSets.set(textureSetName, bundle);
        }),
      );
      if (rigLoadCancelled) return;

      const materials = new Map<string, Set<THREE.MeshStandardMaterial>>();
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const surfaces = Array.isArray(object.material)
          ? object.material
          : [object.material];
        surfaces.forEach((surface) => {
          if (!(surface instanceof THREE.MeshStandardMaterial)) return;
          const namedMaterials = materials.get(surface.name) ?? new Set();
          namedMaterials.add(surface);
          materials.set(surface.name, namedMaterials);
        });
      });

      let failedSets = 0;
      let appliedMaterials = 0;
      Object.entries(SUBJECT_MATERIALS).forEach(
        ([materialName, definition]) => {
          const targets = materials.get(materialName);
          if (!targets?.size) return;
          const bundle = loadedTextureSets.get(definition.textureSet);
          if (!bundle) failedSets += 1;
          targets.forEach((surface) => {
            if (bundle) {
              const useBaseColor =
                !("useBaseColor" in definition) ||
                definition.useBaseColor !== false;
              if (useBaseColor) {
                surface.map = bundle.baseColor;
                surface.color.setHex(definition.tint);
              }
              surface.normalMap = bundle.normal;
              surface.normalScale.setScalar(definition.normalScale);
              if (bundle.rm) {
                surface.roughnessMap = bundle.rm;
                surface.metalnessMap = bundle.rm;
                surface.roughness = 1;
                surface.metalness = 1;
              }
              appliedMaterials += 1;
            }
            if (
              "environmentIntensity" in definition &&
              definition.environmentIntensity
            ) {
              surface.envMap = ensureSubjectEnvironment();
              surface.envMapIntensity = definition.environmentIntensity;
            }
            surface.needsUpdate = true;
          });
        },
      );
      pbrAppliedMaterials = appliedMaterials;
      pbrMaterialsFailed = failedSets > 0;
      pbrMaterialsLoaded = appliedMaterials > 0 && failedSets === 0;
      subject.userData.pbrMaterialsLoaded = pbrMaterialsLoaded;
      subject.userData.pbrMaterialsFailed = pbrMaterialsFailed;
      subject.userData.pbrTextureVariant = pbrTextureVariant;
      subject.userData.pbrAppliedMaterials = pbrAppliedMaterials;
    };

    let enemyMixer = new THREE.AnimationMixer(subjectDetail);
    const enemyClips = createSubjectMotionClips();
    const createEnemyActions = (
      mixer: THREE.AnimationMixer,
      clips: THREE.AnimationClip[],
    ) => {
      const byName = new Map(clips.map((clip) => [clip.name, clip]));
      return {
        idle: mixer.clipAction(byName.get("idle") ?? enemyClips.idle),
        moonwalk: mixer.clipAction(
          byName.get("moonwalk") ?? enemyClips.moonwalk,
        ),
        investigate: mixer.clipAction(
          byName.get("investigate") ?? enemyClips.investigate,
        ),
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
    let gltfRigFailed = false;
    const actionForEnemyState = (state: EnemyState) =>
        state === "chase" || state === "ambush"
          ? enemyActions.chase
          : state === "investigate" ||
              state === "search" ||
              state === "lure" ||
              state === "vent-watch"
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
    new GLTFLoader().load(
      "/models/subject-m22.glb",
      (gltf) => {
        if (rigLoadCancelled) return;
        const importedModel = gltf.scene;
        const requiredNodes = [
          "hips",
          "head",
          "jaw",
          "hat",
          "armLeft",
          "armRight",
          "legLeft",
          "legRight",
        ];
        const hasRig = requiredNodes.every((name) =>
          importedModel.getObjectByName(name),
        );
        const importedClipNames = new Set(
          gltf.animations.map((clip) => clip.name),
        );
        const hasStateAnimations = [
          "idle",
          "moonwalk",
          "investigate",
          "chase",
        ].every((name) => importedClipNames.has(name));
        if (!hasRig || !hasStateAnimations) {
          gltfRigFailed = true;
          return;
        }

        importedModel.name = "SUJETO_M22_ASSET";
        let detailedMeshCount = 0;
        importedModel.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          detailedMeshCount += 1;
          object.castShadow = true;
          object.receiveShadow = true;
        });

        enemyMixer.stopAllAction();
        enemyMixer.uncacheRoot(subjectDetail);
        subjectFallback.visible = false;
        subjectDetailSlot.add(importedModel);
        subjectDetail = importedModel;
        head = subjectDetail.getObjectByName("head");
        jaw = subjectDetail.getObjectByName("jaw");
        subjectHat = subjectDetail.getObjectByName("hat");
        subjectHatBaseY = subjectHat?.position.y ?? 0.75;
        facePlateLeft = subjectDetail.getObjectByName("facePlateLeft");
        facePlateRight = subjectDetail.getObjectByName("facePlateRight");
        chestCore = subjectDetail.getObjectByName("chestCore");
        eyeGlowLeft = subjectDetail.getObjectByName(
          "eyeGlowLeft",
        ) as THREE.PointLight | undefined;
        eyeGlowRight = subjectDetail.getObjectByName(
          "eyeGlowRight",
        ) as THREE.PointLight | undefined;
        collectServoMaterials();
        void applySubjectPbrMaterials(subjectDetail);

        enemyMixer = new THREE.AnimationMixer(subjectDetail);
        enemyActions = createEnemyActions(enemyMixer, gltf.animations);
        Object.values(enemyActions).forEach((action) => {
          action.enabled = true;
          action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
        });
        activeEnemyAction = actionForEnemyState(currentEnemyMode);
        activeEnemyAction.reset().play();

        gltfRigLoaded = true;
        subject.userData.gltfRigLoaded = true;
        subject.userData.model = "subject-m22.glb";
        subject.userData.meshes = detailedMeshCount;
      },
      undefined,
      () => {
        if (!rigLoadCancelled) gltfRigFailed = true;
      },
    );

    const flashlight = new THREE.SpotLight(
      0xe8f4e9,
      132,
      23,
      Math.PI / 5.5,
      0.58,
      1.55,
    );
    flashlight.castShadow = false;
    camera.add(flashlight);
    flashlight.position.set(0, -0.1, 0);
    flashlight.target.position.set(0, -0.1, -1);
    camera.add(flashlight.target);
    const bodyFill = new THREE.PointLight(0xa9c6af, 7.5, 5.5, 2);
    bodyFill.position.set(0, 0.08, 0.18);
    camera.add(bodyFill);
    const qaSideLight = new THREE.PointLight(0xd5ad91, 9, 6, 2);
    qaSideLight.position.set(1.75, 1.1, -0.8);
    qaSideLight.visible = false;
    camera.add(qaSideLight);
    scene.add(camera);

    const playPulse = (strength: number) => {
      audioRef.current?.playHeartbeat(
        THREE.MathUtils.clamp(strength * 5.5, 0.2, 1.65),
      );
    };

    const playStep = () => {
      audioRef.current?.playPlayerStep(
        playerCrouching ? 0.08 : playerSprinting ? 0.24 : 0.16,
      );
    };

    const playClank = (position: THREE.Vector3) => {
      const system = audioRef.current;
      if (!system?.isUnlocked) return;
      system.updateEmitter("metal-impact", {
        position,
        occlusion: corridorLineOfSight(
          maze,
          positionCell(player),
          positionCell(position),
        )
          ? 0
          : 0.72,
      });
      system.playMetalImpact("metal-impact");
    };

    const playEnemyStep = (distanceToPlayer: number) => {
      const system = audioRef.current;
      if (!system?.isUnlocked) return;
      system.playMechanicalStep("subject-m", {
        gain: THREE.MathUtils.clamp(
          1.15 / Math.max(1, distanceToPlayer * 0.08),
          0.28,
          1.15,
        ),
        playbackRate: currentEnemyMode === "chase" ? 1.16 : 0.94,
      });
    };

    const playMechanicalScream = (mascot: ScareMascot) => {
      audioRef.current?.playJumpscare(1, mascot.screamVariant);
    };

    const triggerCaught = (now: number) => {
      if (caught || escaped) return;
      const mascot = mascotForCatch(
        seed,
        cctvIndexRef.current,
        cctvExposureMs,
      );
      caught = true;
      caughtSequence = {
        startedAt: now,
        subjectStart: subject.position.clone(),
        subjectYaw: subject.rotation.y,
      };
      inputController.reset(now);
      mobilePointers.clear();
      lastAppliedVelocity = { x: 0, z: 0 };
      document.exitPointerLock?.();
      setActiveJumpscare(mascot);
      setMessage(
        `${mascot.name} ha invadido la señal mientras SUJETO M cerraba el paso.`,
      );
      setPrompt(`${mascot.cameraCode} · ${mascot.signal}`);
      playMechanicalScream(mascot);
    };

    const applyPlayerMovement = (
      forward: number,
      strafe: number,
      speed: number,
      delta: number,
      crouching: boolean,
    ) => {
      const velocity = capsuleVelocityFromInput({
        forward,
        strafe,
        yaw,
        speed,
      });
      lastAppliedVelocity = velocity;
      const result = stepCapsuleController(capsuleWorld, capsuleState, {
        velocity,
        deltaSeconds: delta,
        crouch: crouching,
      });
      capsuleState = result.state;
      player.x = result.state.position.x;
      player.z = result.state.position.z;
      player.y = result.eyeHeight;
      lastCapsuleCollided = result.collided;
      traveledDistance += result.moved;
      return result;
    };

    const dropEcho = (now: number) => {
      if (echoesHeld <= 0 || activeLure || ventTrip) {
        setPrompt(
          activeLure
            ? "Ya hay una proyección activa."
            : "No tienes ningún eco espectral.",
        );
        return;
      }
      const ghost = createEcho(0xf2b2ff);
      ghost.scale.setScalar(0.88);
      ghost.position.set(player.x, 0, player.z);
      world.add(ghost);
      echoesHeld -= 1;
      setEchoes(echoesHeld);
      activeLure = {
        mesh: ghost,
        cell: positionCell(player),
        expiresAt: now + 7600,
      };
      setPrompt("Eco proyectado. SUJETO M está cambiando de ruta.");
    };

    const dropNoiseObject = (now: number) => {
      if (ventTrip || now < nextObjectDropAt) return;
      const reusable =
        noiseObjects.find((object) => !object.mesh.visible) ??
        noiseObjects.reduce((oldest, object) =>
          object.activeUntil < oldest.activeUntil ? object : oldest,
        );
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const resolved = resolveGridMovement(
        maze,
        { x: player.x, z: player.z },
        { x: forwardX * 2.35, z: forwardZ * 2.35 },
        MAZE_SIZE,
        CELL_SIZE,
        0.1,
      );
      reusable.mesh.position.set(resolved.x, 0.11, resolved.z);
      reusable.mesh.rotation.x = random() * Math.PI;
      reusable.mesh.rotation.y = random() * Math.PI;
      reusable.mesh.visible = true;
      reusable.activeUntil = now + 11500;
      emitNoise("metal-impact", positionCell(reusable.mesh.position), now);
      nextObjectDropAt = now + 1600;
      playClank(reusable.mesh.position);
      setPrompt("Pieza metálica lanzada. Algo está investigando el golpe.");
    };

    const interact = (now: number) => {
      const closeEcho = runtimeEchoes.find(
        (echo) =>
          !echo.collected &&
          echo.mesh.position.distanceTo(player.clone().setY(0)) < 1.45,
      );
      if (closeEcho) {
        closeEcho.collected = true;
        closeEcho.mesh.visible = false;
        echoesHeld += 1;
        setEchoes(echoesHeld);
        setPrompt("Eco estabilizado. Pulsa G para proyectarlo como señuelo.");
        return;
      }

      const currentCell = positionCell(player);
      const pairedCell = ventByCell.get(currentCell);
      const closeVent = ventMeshes.some(
        (vent) =>
          vent.userData.cell === currentCell &&
          vent.position.distanceTo(player.clone().setY(vent.position.y)) < 2.15,
      );
      if (pairedCell !== undefined && closeVent && !ventTrip) {
        const destination = cellCenter(pairedCell);
        const sourceVent = ventMeshes.find(
          (vent) => vent.userData.cell === currentCell,
        );
        const destinationVent = ventMeshes.find(
          (vent) => vent.userData.cell === pairedCell,
        );
        if (!sourceVent || !destinationVent) return;
        const pairIndex = Number(sourceVent.userData.pair ?? 0);
        const ductHeight = WALL_HEIGHT + 0.78;
        const path = [
          sourceVent.position.clone().setY(ductHeight),
          destinationVent.position.clone().setY(ductHeight),
        ];
        player.copy(path[0]);
        const cumulative = [0];
        for (let index = 1; index < path.length; index += 1) {
          cumulative[index] =
            cumulative[index - 1] +
            path[index - 1].distanceTo(path[index]);
        }
        const totalDistance = cumulative[cumulative.length - 1];
        const ductDirection = path[1].clone().sub(path[0]);
        if (Math.hypot(ductDirection.x, ductDirection.z) > 0.05) {
          currentVentHeadingYaw =
            Math.atan2(ductDirection.x, ductDirection.z) + Math.PI;
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
          cumulative,
          totalDistance,
          distanceAlong: 0,
        };
        emitNoise("vent-rattle", currentCell, now);
        setInVent(true);
        setVentProgress(0);
        setVentRoute(
          `${sectorForCell(currentCell)} → ${sectorForCell(pairedCell)}`,
        );
        setPrompt(
          "Conducto activo: W/S desplaza · A/D o ratón giran la cámara.",
        );
        return;
      }

      if (cellCenter(exitCell).distanceTo(player.clone().setY(0)) < 1.55) {
        escaped = true;
        escapeSequence = {
          startedAt: now,
          playerStart: player.clone(),
          playerEnd: exitPosition
            .clone()
            .add(
              new THREE.Vector3(
                exitOpening.x * 3.2,
                PLAYER_HEIGHT,
                exitOpening.z * 3.2,
              ),
            ),
        };
        inputController.reset(now);
        mobilePointers.clear();
        lastAppliedVelocity = { x: 0, z: 0 };
        emitNoise("exit-alarm", exitCell, now);
        playClank(exitPosition);
        document.exitPointerLock?.();
        setPrompt("APERTURA DE EMERGENCIA · mecanismo en movimiento");
        setMessage("La puerta de emergencia está liberando el cierre.");
      }
    };

    const stageVentForQa = (pairIndex = 0) => {
      if (!qaMode) return false;
      const vent = ventMeshes.find(
        (candidate) =>
          Number(candidate.userData.pair ?? -1) ===
          THREE.MathUtils.clamp(
            Math.trunc(pairIndex),
            0,
            ventPairs.length - 1,
          ),
      );
      if (!vent) return false;
      player.set(vent.position.x, CROUCH_HEIGHT, vent.position.z);
      capsuleState = createCapsuleState(
        capsuleWorld,
        { x: player.x, z: player.z },
        true,
      );
      yaw = vent.rotation.y;
      pitch = 0;
      interact(simulationTime);
      return Boolean(ventTrip);
    };

    const openCctvForQa = (cameraIndex = 0) => {
      if (!qaMode) return false;
      const index = THREE.MathUtils.clamp(
        Math.trunc(cameraIndex),
        0,
        cctvCameras.length - 1,
      );
      cctvIndexRef.current = index;
      setCctvIndex(index);
      tabletRef.current = true;
      setTabletOpen(true);
      inputController.reset(simulationTime);
      mobilePointers.clear();
      document.exitPointerLock?.();
      return true;
    };

    const normalizedKeyCode = (event: KeyboardEvent) => {
      if (event.code) return event.code;
      const upper = event.key.toUpperCase();
      if (upper === "W" || upper === "A" || upper === "S" || upper === "D") {
        return `Key${upper}`;
      }
      return event.key;
    };
    const inputTimestamp = (event: { timeStamp: number }) => {
      const timestamp = event.timeStamp;
      if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return performance.now();
      }
      return timestamp > performance.timeOrigin
        ? timestamp - performance.timeOrigin
        : timestamp;
    };
    const keyDown = (event: KeyboardEvent) => {
      const code = normalizedKeyCode(event);
      if (!event.repeat && qaMode && code === "F8") {
        event.preventDefault();
        stageVentForQa(0);
        return;
      }
      if (!event.repeat && qaMode && code === "F9") {
        event.preventDefault();
        openCctvForQa(0);
        return;
      }
      const action = walkInputActionForCode(code);
      const timestamp = inputTimestamp(event);
      if (action) {
        inputController.press(action, `keyboard:${code}`, timestamp);
        event.preventDefault();
      }
      if (!event.repeat && code === "KeyE") interactQueuedRef.current = true;
      if (!event.repeat && code === "KeyG") dropQueuedRef.current = true;
      if (!event.repeat && code === "KeyQ") objectQueuedRef.current = true;
      if (
        !event.repeat &&
        code === "Tab" &&
        phaseRef.current === "playing" &&
        cctvPower > 0
      ) {
        event.preventDefault();
        tabletRef.current = !tabletRef.current;
        inputController.reset(timestamp);
        mobilePointers.clear();
        setTabletOpen(tabletRef.current);
        if (tabletRef.current) {
          void audioRef.current?.resume().then((running) => {
            if (running && tabletRef.current) {
              audioRef.current?.playCctvStatic();
            }
          });
        }
        else clearCctvEncounter();
        setPrompt(
          tabletRef.current
            ? "Red CCTV activa. El consumo de energía aumenta."
            : "Cámara corporal restaurada.",
        );
        if (tabletRef.current) document.exitPointerLock?.();
        else {
          renderer.domElement.focus({ preventScroll: true });
          requestControl();
        }
      }
      if (!event.repeat && code === "KeyF") {
        flashlightEnabled = !flashlightEnabled;
        const qaInspectionActive = qaEnemyStage !== null;
        flashlight.visible = flashlightEnabled;
        flashlight.intensity =
          qaInspectionActive && qaNeutralLighting ? 12 : 132;
        bodyFill.intensity =
          qaInspectionActive && qaNeutralLighting ? 2 : 7.5;
        qaSideLight.visible = qaInspectionActive && qaNeutralLighting;
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      const code = normalizedKeyCode(event);
      const action = walkInputActionForCode(code);
      if (!action) return;
      inputController.release(
        action,
        `keyboard:${code}`,
        inputTimestamp(event),
      );
      event.preventDefault();
    };
    const pointerMove = (event: PointerEvent) => {
      const locked = document.pointerLockElement === renderer.domElement;
      if (
        (!locked && !draggingLook) ||
        tabletRef.current ||
        phaseRef.current !== "playing"
      ) {
        return;
      }
      if (!locked && dragPointerId !== null && event.pointerId !== dragPointerId) {
        return;
      }
      const movementX = locked ? event.movementX : event.clientX - dragLastX;
      const movementY = locked ? event.movementY : event.clientY - dragLastY;
      if (!locked) {
        dragLastX = event.clientX;
        dragLastY = event.clientY;
      }
      yaw -= movementX * 0.0021;
      pitch -= movementY * 0.0018;
      pitch = Math.max(-1.02, Math.min(1.02, pitch));
    };
    const pointerDown = (event: PointerEvent) => {
      if (
        event.button === 0 &&
        phaseRef.current === "playing" &&
        !tabletRef.current
      ) {
        draggingLook = true;
        dragPointerId = event.pointerId;
        dragLastX = event.clientX;
        dragLastY = event.clientY;
        renderer.domElement.focus({ preventScroll: true });
        try {
          renderer.domElement.setPointerCapture?.(event.pointerId);
        } catch {
          // Some embedded browsers send a synthetic pointer without a
          // capturable active button. Document-level move/up still handles it.
        }
      }
    };
    const pointerUp = (event?: PointerEvent) => {
      draggingLook = false;
      dragPointerId = null;
      if (
        event &&
        renderer.domElement.hasPointerCapture?.(event.pointerId)
      ) {
        renderer.domElement.releasePointerCapture?.(event.pointerId);
      }
    };
    const canvasClick = () => {
      if (phaseRef.current === "playing" && !tabletRef.current) {
        requestControl();
      }
    };
    const pointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      if (!locked && pointerWasLocked) {
        inputController.reset(performance.now());
        mobilePointers.clear();
      }
      pointerWasLocked = locked;
      if (locked) {
        setPointerHelp(false);
      } else if (phaseRef.current === "playing" && !tabletRef.current) {
        setPointerHelp(true);
      }
    };
    const pointerLockError = () => {
      setPointerHelp(true);
      setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
    };
    const hardResyncSimulationClock = (now: number) => {
      const synchronization = resynchronizeFixedClock(
        now,
        simulationTime,
        0,
        FIXED_DELTA,
      );
      simulationTime = synchronization.simulationTimeMs;
      simulationAccumulator = synchronization.accumulatorSeconds;
      lastRenderTime = now;
      lastClockLagBeforeResyncMs = synchronization.lagBeforeResyncMs;
      clockResyncs += 1;
    };
    const clearHiddenInput = () => {
      const now = performance.now();
      inputController.reset(now);
      mobilePointers.clear();
      draggingLook = false;
      simulationPaused = document.hidden;
      hardResyncSimulationClock(now);
      if (document.hidden) {
        void audioRef.current?.pause();
      } else if (phaseRef.current === "playing") {
        void audioRef.current?.resume();
      }
    };
    const clearFocusInput = () => {
      inputController.reset(performance.now());
      mobilePointers.clear();
      draggingLook = false;
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      const now = performance.now();
      simulationPaused = true;
      inputController.reset(now);
      mobilePointers.clear();
      hardResyncSimulationClock(now);
      void audioRef.current?.pause();
      setRuntimeError("CONTEXTO WEBGL PERDIDO · esperando recuperación de la GPU");
    };
    const contextRestored = () => {
      const now = performance.now();
      setRuntimeError(null);
      simulationPaused = document.hidden;
      hardResyncSimulationClock(now);
      if (!document.hidden && phaseRef.current === "playing") {
        void audioRef.current?.resume();
      }
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearFocusInput);
    document.addEventListener("visibilitychange", clearHiddenInput);
    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("pointerlockchange", pointerLockChange);
    document.addEventListener("pointerlockerror", pointerLockError);
    renderer.domElement.addEventListener("click", canvasClick);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("lostpointercapture", pointerUp);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    renderer.domElement.addEventListener("webglcontextrestored", contextRestored);

    const fixedUpdate = (delta: number, tickNow: number) => {
      if (phaseRef.current !== "playing" || simulationPaused) return;
      const inputSlices = inputController.consumeWindow(
        tickNow - delta * 1000,
        tickNow,
      );
      lastInputSlices = inputSlices;
      const sampledInput = inputController.getSnapshot().sampled;

      if (activeLure && tickNow >= activeLure.expiresAt) {
        world.remove(activeLure.mesh);
        activeLure.mesh.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const surfaces = Array.isArray(object.material)
            ? object.material
            : [object.material];
          surfaces.forEach((surface) => surface.dispose());
        });
        activeLure = null;
        lastSeenAt = tickNow - 5200;
        setPrompt("La proyecciÃ³n se ha desvanecido.");
      }

      noiseObjects.forEach((object) => {
        if (object.mesh.visible && tickNow >= object.activeUntil) {
          object.mesh.visible = false;
        }
      });

      if (caughtSequence) {
        const caughtTiming = sequenceProgress(
          tickNow,
          caughtSequence.startedAt,
          JUMPSCARE_DURATION_MS,
        );
        const progress = caughtTiming.progress;
        const eased = 1 - Math.pow(1 - progress, 4);
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const target = player.clone().addScaledVector(forward, 0.72).setY(0);
        subject.position.lerpVectors(
          caughtSequence.subjectStart,
          target,
          eased,
        );
        const targetYaw =
          Math.atan2(
            player.x - subject.position.x,
            player.z - subject.position.z,
          ) + Math.PI;
        subject.rotation.y =
          caughtSequence.subjectYaw +
          Math.atan2(
            Math.sin(targetYaw - caughtSequence.subjectYaw),
            Math.cos(targetYaw - caughtSequence.subjectYaw),
          ) *
            eased;
        playerMoving = false;
        playerSprinting = false;
        lastAppliedVelocity = { x: 0, z: 0 };
        if (caughtTiming.done) {
          caughtSequence = null;
          setActiveJumpscare(null);
          setGamePhase("caught");
        }
        return;
      }

      if (escapeSequence) {
        const escapeTiming = sequenceProgress(
          tickNow,
          escapeSequence.startedAt,
          3200,
        );
        const progress = escapeTiming.progress;
        const doorProgress = THREE.MathUtils.smoothstep(progress, 0.04, 0.55);
        if (exitPanel) exitPanel.position.y = doorProgress * 3.15;
        const passage = THREE.MathUtils.smoothstep(progress, 0.42, 0.94);
        player.lerpVectors(
          escapeSequence.playerStart,
          escapeSequence.playerEnd,
          passage,
        );
        yaw +=
          Math.atan2(
            Math.sin(exitOpening.yaw - yaw),
            Math.cos(exitOpening.yaw - yaw),
          ) * Math.min(1, delta * 2.8);
        pitch += (0 - pitch) * Math.min(1, delta * 2.8);
        playerMoving = passage > 0 && passage < 1;
        playerSprinting = false;
        playerCrouching = false;
        lastAppliedVelocity = { x: 0, z: 0 };
        if (escapeTiming.done) {
          escapeSequence = null;
          setGamePhase("escaped");
          setMessage(
            "La puerta se ha cerrado detrás de ti. El pasadizo sigue cambiando.",
          );
        }
        return;
      }

      if (!tabletRef.current) {
        if (ventTrip) {
          let ventMoved = 0;
          let terminalDirection = 0;
          for (const slice of inputSlices) {
            const ventAdvance = advanceVentTraversal(
              ventTrip.distanceAlong,
              ventTrip.totalDistance,
              slice.forward,
              slice.durationSeconds,
            );
            ventTrip.distanceAlong = ventAdvance.distance;
            ventMoved += ventAdvance.moved;
            if (slice.forward > 0 && ventAdvance.atDestination) {
              terminalDirection = 1;
            } else if (slice.forward < 0 && ventAdvance.atSource) {
              terminalDirection = -1;
            }
          }
          if (sampledInput.strafe !== 0) {
            yaw -= sampledInput.strafe * delta * 1.85;
          }
          const distanceAlong = ventTrip.distanceAlong;
          const progress = THREE.MathUtils.clamp(
            distanceAlong / Math.max(0.0001, ventTrip.totalDistance),
            0,
            1,
          );
          traveledDistance += ventMoved;
          let segment = 0;
          while (
            segment < ventTrip.cumulative.length - 2 &&
            ventTrip.cumulative[segment + 1] < distanceAlong
          ) {
            segment += 1;
          }
          const segmentStart = ventTrip.cumulative[segment];
          const segmentEnd = ventTrip.cumulative[segment + 1];
          const segmentProgress =
            (distanceAlong - segmentStart) /
            Math.max(0.0001, segmentEnd - segmentStart);
          player.lerpVectors(
            ventTrip.path[segment],
            ventTrip.path[segment + 1],
            THREE.MathUtils.clamp(segmentProgress, 0, 1),
          );
          player.y += Math.sin(distanceAlong * 8) * 0.018;
          const travelDirection = ventTrip.path[segment + 1]
            .clone()
            .sub(ventTrip.path[segment]);
          if (Math.hypot(travelDirection.x, travelDirection.z) > 0.1) {
            currentVentHeadingYaw =
              Math.atan2(travelDirection.x, travelDirection.z) + Math.PI;
          }
          if (tickNow - lastVentHudUpdate >= 90) {
            setVentProgress(Math.round(progress * 100));
            lastVentHudUpdate = tickNow;
          }
          if (sampledInput.forward === 0) {
            lastAppliedVelocity = { x: 0, z: 0 };
          } else {
            const horizontalLength = Math.hypot(
              travelDirection.x,
              travelDirection.z,
            );
            const directionScale =
              (sampledInput.forward * 1.72) /
              Math.max(0.0001, horizontalLength);
            lastAppliedVelocity = {
              x: travelDirection.x * directionScale,
              z: travelDirection.z * directionScale,
            };
          }
          playerMoving =
            sampledInput.forward !== 0 && ventMoved > 0.0001;
          playerSprinting = false;
          playerCrouching = true;
          previousSprintCell = null;
          latestSprintCell = null;
          if (playerMoving && tickNow >= nextNoisePulseAt) {
            emitNoise(
              "vent-rattle",
              progress < 0.5
                ? ventTrip.sourceCell
                : ventTrip.destinationCell,
              tickNow,
            );
            nextNoisePulseAt = tickNow + 560;
          }
          const leaveAtDestination =
            progress >= 1 && terminalDirection > 0;
          const leaveAtSource = progress <= 0 && terminalDirection < 0;
          if (leaveAtDestination || leaveAtSource) {
            const exitCellIndex = leaveAtDestination
              ? ventTrip.destinationCell
              : ventTrip.sourceCell;
            player.copy(ventTrip.to);
            if (leaveAtSource) {
              player.copy(cellCenter(ventTrip.sourceCell).setY(CROUCH_HEIGHT));
            }
            player.y = CROUCH_HEIGHT;
            capsuleState = createCapsuleState(
              capsuleWorld,
              { x: player.x, z: player.z },
              true,
            );
            if (ductRoutes[ventTrip.pairIndex]) {
              ductRoutes[ventTrip.pairIndex].visible = false;
            }
            ventTrip = null;
            setInVent(false);
            setVentProgress(0);
            setVentRoute("SIN RUTA");
            lastAppliedVelocity = { x: 0, z: 0 };
            emitNoise("vent-rattle", exitCellIndex, tickNow);
            setPrompt(
              leaveAtDestination
                ? "Has salido al otro lado. Algo ha oído la rejilla."
                : "Has retrocedido fuera del conducto.",
            );
          }
        } else {
          let moved = 0;
          for (const slice of inputSlices) {
            const sliceSprinting =
              !slice.crouch &&
              slice.sprint &&
              (slice.forward !== 0 || slice.strafe !== 0);
            const movementSpeed = slice.crouch
              ? 1.42
              : sliceSprinting
                ? 4.35
                : 2.75;
            const capsuleResult = applyPlayerMovement(
              slice.forward,
              slice.strafe,
              movementSpeed,
              slice.durationSeconds,
              slice.crouch,
            );
            playerCrouching = capsuleResult.state.crouching;
            moved += capsuleResult.moved;
          }
          playerMoving =
            sampledInput.forward !== 0 || sampledInput.strafe !== 0;
          playerSprinting =
            playerMoving && !sampledInput.crouch && sampledInput.sprint;
          if (!playerMoving) {
            lastAppliedVelocity = { x: 0, z: 0 };
            previousSprintCell = null;
            latestSprintCell = null;
          }
          if (moved > 0.0001) {
            const movementCell = positionCell(player);
            if (tickNow >= nextNoisePulseAt) {
              const noiseKind: NoiseKind = playerCrouching
                ? "crouch-step"
                : playerSprinting
                  ? "sprint-step"
                  : "walk-step";
              emitNoise(noiseKind, movementCell, tickNow);
              nextNoisePulseAt =
                tickNow +
                (playerCrouching ? 760 : playerSprinting ? 245 : 430);
              if (playerSprinting) {
                if (latestSprintCell !== movementCell) {
                  previousSprintCell = latestSprintCell;
                  latestSprintCell = movementCell;
                }
              } else {
                previousSprintCell = null;
                latestSprintCell = null;
              }
            }
            if (tickNow >= nextFootstep) {
              playStep();
              nextFootstep =
                tickNow +
                (playerCrouching ? 760 : playerSprinting ? 315 : 510);
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
        previousSprintCell = null;
        latestSprintCell = null;
        lastAppliedVelocity = { x: 0, z: 0 };
        cctvExposureMs += delta * 1000;
        const battery = drainCctvBattery(cctvPower, true, delta);
        cctvPower = battery.power;
        if (Math.ceil(cctvPower) !== lastReportedPower) {
          lastReportedPower = Math.ceil(cctvPower);
          setPower(lastReportedPower);
        }
        if (battery.depleted) {
          tabletRef.current = false;
          setTabletOpen(false);
          setPrompt("SIN ENERGÃA Â· red CCTV desconectada.");
        }
      }

      const enemyCell = positionCell(subject.position);
      const playerCell = positionCell(player);
      const routeToPlayer = mazePath(maze, enemyCell, playerCell);
      currentRouteDistance = Math.max(0, routeToPlayer.length - 1);
      currentPlayerDistance = subject.position.distanceTo(
        player.clone().setY(0),
      );
      const lineOfSight =
        !ventTrip &&
        currentPlayerDistance < 17 &&
        corridorLineOfSight(maze, enemyCell, playerCell);
      if (lineOfSight) {
        lastSeenAt = tickNow;
        lastSeenCell = playerCell;
      }
      acousticEvents = pruneAcousticEvents(acousticEvents, tickNow);
      const acousticDistances = mazeDistances(maze, enemyCell);
      acousticPerception = selectAcousticTarget(
        acousticEvents.map((event) => ({
          ...event,
          routeDistanceCells:
            acousticDistances[event.cell] ?? Number.POSITIVE_INFINITY,
        })),
        tickNow,
      );
      if (acousticPerception) {
        lastHeardAt = acousticPerception.event.emittedAt;
        lastHeardCell = acousticPerception.event.cell;
        lastHeardKind = acousticPerception.event.kind;
      }
      const heardNoise = Boolean(acousticPerception);
      const noiseDistance =
        acousticPerception?.routeDistanceCells ?? Number.POSITIVE_INFINITY;
      const predictedSprintTarget =
        lastHeardKind === "sprint-step" &&
        previousSprintCell !== null &&
        latestSprintCell !== null &&
        latestSprintCell === lastHeardCell
          ? extrapolateAcousticTrailCell(
              maze,
              previousSprintCell,
              latestSprintCell,
            )
          : lastHeardCell;
      predictedHeardCell = predictedSprintTarget;
      lastNoiseDistance = noiseDistance;
      const cctvSignalCell =
        cctvCells[cctvIndexRef.current] ?? cctvCells[0] ?? 0;
      const cctvSignalDistance =
        mazePath(maze, enemyCell, cctvSignalCell).length - 1;

      const modelPreviewActive = tickNow < modelPreviewUntil;
      const nextEnemyMode = modelPreviewActive
        ? modelPreviewState
        : decideEnemyState({
            distanceCells: currentRouteDistance,
            hasLure: Boolean(activeLure),
            heardNoise,
            noiseAgeMs: tickNow - lastHeardAt,
            noiseDistanceCells: noiseDistance,
            noiseConfidence: acousticPerception?.confidence ?? 0,
            playerInVent: Boolean(ventTrip),
            lastSeenAgeMs: tickNow - lastSeenAt,
            cctvExposureMs,
            cctvSignalDistanceCells: cctvSignalDistance,
            lineOfSight,
            currentState: currentEnemyMode,
          });
      if (nextEnemyMode !== currentEnemyMode) {
        currentEnemyMode = nextEnemyMode;
        setEnemyMode(nextEnemyMode);
        transitionEnemyAnimation(nextEnemyMode);
        if (
          nextEnemyMode === "investigate" &&
          lastHeardKind === "sprint-step"
        ) {
          setPrompt("TE HA OÍDO CORRER · está anticipando tu siguiente cruce");
        }
      }

      const patrolCells = spread.length ? spread : [exitCell, 0];
      let targetCell: number;
      if (activeLure) {
        targetCell = activeLure.cell;
      } else if (currentEnemyMode === "chase") {
        targetCell = lineOfSight
          ? playerCell
          : lastHeardAt > lastSeenAt
            ? predictedSprintTarget
            : lastSeenCell;
      } else if (
        currentEnemyMode === "vent-watch" ||
        currentEnemyMode === "ambush"
      ) {
        targetCell = ventTrip?.destinationCell ?? playerCell;
      } else if (
        currentEnemyMode === "listen" ||
        currentEnemyMode === "investigate"
      ) {
        targetCell =
          currentEnemyMode === "investigate" &&
          cctvExposureMs > 6000 &&
          !acousticPerception
            ? cctvSignalCell
            : predictedSprintTarget;
      } else if (currentEnemyMode === "search") {
        targetCell =
          lastHeardAt > lastSeenAt ? predictedSprintTarget : lastSeenCell;
      } else {
        targetCell = patrolCells[patrolCursor % patrolCells.length];
        if (enemyCell === targetCell) {
          patrolCursor = (patrolCursor + 1) % patrolCells.length;
          targetCell = patrolCells[patrolCursor];
        }
      }

      if (
        tickNow >= nextPathUpdate ||
        enemyPath[enemyPath.length - 1] !== targetCell
      ) {
        enemyPath = mazePath(maze, enemyCell, targetCell);
        nextPathUpdate = tickNow + 340;
      }
      const nextCell = enemyPath[1] ?? targetCell;
      const enemyTarget = cellCenter(nextCell);
      const direction = enemyTarget.sub(subject.position);
      direction.y = 0;
      const remaining = direction.length();
      const speeds: Record<EnemyState, number> = {
        patrol: 1.02,
        listen: 0.25,
        investigate: 1.42,
        search: 1.24,
        chase: 2.32,
        lure: 1.55,
        "vent-watch": 1.18,
        ambush: 1.92,
        recover: 0.78,
      };
      const sprintPressure =
        lastHeardKind === "sprint-step" && tickNow - lastHeardAt < 2600
          ? currentEnemyMode === "chase"
            ? 0.24
            : 0.16
          : 0;
      currentEnemySpeed = speeds[currentEnemyMode] + sprintPressure;
      if (!modelPreviewActive && remaining > 0.09) {
        direction.normalize();
        subject.position.addScaledVector(
          direction,
          Math.min(remaining, currentEnemySpeed * delta),
        );
        const targetYaw = Math.atan2(direction.x, direction.z) + Math.PI;
        subject.rotation.y +=
          Math.atan2(
            Math.sin(targetYaw - subject.rotation.y),
            Math.cos(targetYaw - subject.rotation.y),
          ) * Math.min(1, delta * 4.2);
      }

      if (
        tickNow >= nextEnemyStep &&
        remaining > 0.1 &&
        currentPlayerDistance < 22
      ) {
        playEnemyStep(currentPlayerDistance);
        nextEnemyStep =
          tickNow + (currentEnemyMode === "chase" ? 330 : 610);
      }
      if (currentPlayerDistance < 1.08) triggerCaught(tickNow);

      currentBpm = Math.round(
        THREE.MathUtils.clamp(
          42 + (20 - Math.min(currentRouteDistance, 20)) * 6.2,
          42,
          166,
        ),
      );
      if (tickNow >= nextHeartbeat && !tabletRef.current) {
        playPulse(0.025 + (currentBpm - 42) / 610);
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

    const cctvFrustum = new THREE.Frustum();
    const cctvProjection = new THREE.Matrix4();
    const enemyProbe = new THREE.Vector3();
    const audioForward = new THREE.Vector3();
    const audioUp = new THREE.Vector3();
    const enemyAudioForward = new THREE.Vector3();
    const frameTimes: number[] = [];
    let adaptivePixelRatio = Math.min(
      window.devicePixelRatio,
      graphics.pixelRatio,
    );
    let lastResolutionAdjust = 0;
    let fastFramesSince = 0;
    let fixedSteps = 0;
    let droppedCatchUps = 0;
    let frame = 0;
    let animation = 0;
    let wasPlaying = false;
    let lastQaUpdate = 0;
    let lastCctvFrame = Number.NEGATIVE_INFINITY;
    let spatialSourcesStarted = false;
    let lastRendererCalls = 0;
    let lastRendererTriangles = 0;
    let peakRendererCalls = 0;
    let peakRendererTriangles = 0;

    const renderFrame = (now: number) => {
      animation = requestAnimationFrame(renderFrame);
      const rawDelta = Math.max(0, (now - lastRenderTime) / 1000);
      const frameWasClamped = rawDelta > MAX_FRAME_DELTA;
      const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
      const playing = phaseRef.current === "playing";
      frameTimes.push(delta * 1000);
      if (frameTimes.length > 180) frameTimes.shift();
      if (
        playing &&
        !tabletRef.current &&
        now - lastResolutionAdjust > 2000 &&
        frameTimes.length >= 90
      ) {
        const sorted = [...frameTimes].sort(
          (first, second) => first - second,
        );
        const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
        const cap = Math.min(window.devicePixelRatio, graphics.pixelRatio);
        if (p95 > 22 && adaptivePixelRatio > 0.7) {
          adaptivePixelRatio = Math.max(0.7, adaptivePixelRatio - 0.1);
          renderer.setPixelRatio(adaptivePixelRatio);
          renderer.setSize(mount.clientWidth, mount.clientHeight);
          fastFramesSince = 0;
        } else if (p95 < 14 && adaptivePixelRatio < cap) {
          if (!fastFramesSince) fastFramesSince = now;
          if (now - fastFramesSince > 10000) {
            adaptivePixelRatio = Math.min(cap, adaptivePixelRatio + 0.1);
            renderer.setPixelRatio(adaptivePixelRatio);
            renderer.setSize(mount.clientWidth, mount.clientHeight);
            fastFramesSince = now;
          }
        } else {
          fastFramesSince = 0;
        }
        lastResolutionAdjust = now;
      }
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
        let catchUpSteps = 0;
        while (
          simulationAccumulator >= FIXED_DELTA &&
          catchUpSteps < MAX_CATCH_UP_STEPS
        ) {
          simulationTime += FIXED_DELTA * 1000;
          fixedUpdate(FIXED_DELTA, simulationTime);
          simulationAccumulator -= FIXED_DELTA;
          catchUpSteps += 1;
          fixedSteps += 1;
        }
        const catchUpWasCapped =
          catchUpSteps === MAX_CATCH_UP_STEPS &&
          simulationAccumulator >= FIXED_DELTA;
        if (frameWasClamped || catchUpWasCapped) {
          const synchronization = resynchronizeFixedClock(
            now,
            simulationTime,
            simulationAccumulator,
            FIXED_DELTA,
          );
          simulationTime = synchronization.simulationTimeMs;
          simulationAccumulator = synchronization.accumulatorSeconds;
          lastClockLagBeforeResyncMs =
            synchronization.lagBeforeResyncMs;
          clockResyncs += 1;
          droppedCatchUps += 1;
        }
      }
      if (now - lastQaUpdate > 500) {
        mount.dataset.qa = JSON.stringify(qaBridge.snapshot());
        lastQaUpdate = now;
      }

      runtimeEchoes.forEach((echo, index) => {
        if (echo.collected) return;
        echo.mesh.position.y = reducedMotion
          ? 0
          : Math.sin(now * 0.0015 + index) * 0.12;
        if (!reducedMotion) echo.mesh.rotation.y += delta * 0.36;
      });
      if (activeLure) {
        activeLure.mesh.position.y = reducedMotion
          ? 0
          : Math.sin(now * 0.005) * 0.12;
        if (!reducedMotion) activeLure.mesh.rotation.y += delta * 1.4;
      }

      dust.rotation.y = reducedMotion ? 0 : Math.sin(now * 0.00004) * 0.08;
      if (playing) {
        activeEnemyAction.timeScale = THREE.MathUtils.clamp(
          currentEnemySpeed / 1.1,
          0.28,
          1.9,
        ) * (reducedMotion ? 0.35 : 1);
        enemyMixer.update(delta);
        if (head) {
          const neutralModelPreview =
            simulationTime < modelPreviewUntil &&
            modelPreviewState === "listen";
          const threatTurn =
            neutralModelPreview
              ? 0
              : currentEnemyMode === "chase" ||
                  currentEnemyMode === "ambush"
              ? 1
              : currentEnemyMode === "listen"
                ? 0.45
                : THREE.MathUtils.clamp(
                    1 - currentPlayerDistance / 8,
                    0,
                    0.35,
                  );
          head.rotation.y +=
            (Math.PI * threatTurn - head.rotation.y) *
            Math.min(1, delta * 6);
          head.rotation.z =
            Math.sin(now * 0.002) * 0.1 * Math.max(0.2, threatTurn);
        }
        if (jaw) {
          const jawTarget =
            currentEnemyMode === "chase" ||
            currentEnemyMode === "ambush"
              ? 0.5 + Math.sin(now * 0.018) * 0.14
              : currentEnemyMode === "listen"
                ? 0.12
                : 0.02;
          jaw.rotation.x +=
            (jawTarget - jaw.rotation.x) * Math.min(1, delta * 10);
        }
        if (subjectHat) {
          subjectHat.position.y +=
            (subjectHatBaseY - subjectHat.position.y) *
            Math.min(1, delta * 5);
          subjectHat.rotation.z =
            Math.sin(now * 0.0014) *
            (currentEnemyMode === "ambush" ? 0.24 : 0.025);
        }
        const faceThreat =
          currentEnemyMode === "ambush"
            ? 1
            : currentEnemyMode === "chase"
              ? THREE.MathUtils.clamp(
                  1.15 - currentPlayerDistance / 8,
                  0.42,
                  0.92,
                )
              : currentEnemyMode === "listen"
                ? 0.12
                : 0;
        outerShellRetracted = faceThreat > 0.58;
        if (facePlateLeft && facePlateRight) {
          facePlateLeft.rotation.y +=
            (-faceThreat * 0.5 - facePlateLeft.rotation.y) *
            Math.min(1, delta * 8);
          facePlateRight.rotation.y +=
            (faceThreat * 0.5 - facePlateRight.rotation.y) *
            Math.min(1, delta * 8);
          facePlateLeft.rotation.z =
            -faceThreat * 0.12 + Math.sin(now * 0.006) * faceThreat * 0.025;
          facePlateRight.rotation.z =
            faceThreat * 0.12 - Math.sin(now * 0.006) * faceThreat * 0.025;
        }
        const servoIntensity =
          2.8 +
          faceThreat * 6.2 +
          Math.max(0, Math.sin(now * 0.012)) * (0.6 + faceThreat * 2.4);
        servoMaterials.forEach((surface) => {
          surface.emissiveIntensity = servoIntensity;
        });
        if (eyeGlowLeft && eyeGlowRight) {
          const eyeLightIntensity = 0.24 + faceThreat * 1.65;
          eyeGlowLeft.intensity = eyeLightIntensity;
          eyeGlowRight.intensity = eyeLightIntensity;
        }
        if (chestCore) {
          const reactorPulse =
            1 +
            Math.sin(now * (currentEnemyMode === "chase" ? 0.018 : 0.007)) *
              (currentEnemyMode === "chase" ? 0.055 : 0.02);
          chestCore.scale.setScalar(reactorPulse);
        }

        if (now - lastHudUpdate > 160) {
          const currentCell = positionCell(player);
          const row = Math.floor(currentCell / MAZE_SIZE);
          const column = currentCell % MAZE_SIZE;
          setDistance(Math.max(1, Math.round(currentPlayerDistance)));
          setTraveled(traveledDistance);
          setBpm(currentBpm);
          setSector(
            `${String.fromCharCode(65 + Math.floor(row / 4))}-${String(
              column + 1,
            ).padStart(2, "0")}`,
          );
          setMapPlayer({
            left: 4 + (column / Math.max(1, MAZE_SIZE - 1)) * 88,
            top: 4 + (row / Math.max(1, MAZE_SIZE - 1)) * 88,
          });
          const detailOrigin = tabletRef.current
            ? cellCenter(cctvCells[cctvIndexRef.current] ?? cctvCells[0])
            : player;
          decorGroups.forEach((group) => {
            group.visible =
              group.position.distanceToSquared(detailOrigin) < 28 * 28;
          });
          runtimeEchoes.forEach((echo) => {
            echo.mesh.visible =
              !echo.collected &&
              echo.mesh.position.distanceToSquared(detailOrigin) < 28 * 28;
          });
          ventMeshes.forEach((vent) => {
            vent.visible =
              Boolean(ventTrip) ||
              vent.position.distanceToSquared(detailOrigin) < 28 * 28;
          });

          const selectedCamera =
            cctvCameras[cctvIndexRef.current] ?? cctvCameras[0];
          const signalCycle =
            (now + cctvIndexRef.current * 977) % 11700;
          cctvSignalLost =
            tabletRef.current &&
            (signalCycle < 360 ||
              (currentPlayerDistance < 9 && now % 920 < 150));
          setSignalLost(cctvSignalLost);
          selectedCamera.updateWorldMatrix(true, false);
          cctvProjection.multiplyMatrices(
            selectedCamera.projectionMatrix,
            selectedCamera.matrixWorldInverse,
          );
          cctvFrustum.setFromProjectionMatrix(cctvProjection);
          enemyProbe.copy(subject.position).setY(1.4);
          setMotionDetected(
            !cctvSignalLost &&
              cctvFrustum.containsPoint(enemyProbe) &&
              corridorLineOfSight(
                maze,
                cctvCells[cctvIndexRef.current] ?? cctvCells[0],
                positionCell(subject.position),
              ),
          );

          const closeEcho = runtimeEchoes.some(
            (echo) =>
              !echo.collected &&
              echo.mesh.position.distanceTo(player.clone().setY(0)) < 1.5,
          );
          const closeVent = ventMeshes.some(
            (vent) =>
              vent.userData.cell === currentCell &&
              vent.position.distanceTo(
                player.clone().setY(vent.position.y),
              ) < 2.15,
          );
          const closeExit =
            cellCenter(exitCell).distanceTo(player.clone().setY(0)) < 1.55;
          if (ventTrip) {
            setPrompt("EN CONDUCTO · W/S RECORRE · A/D O RATÓN MIRA");
          } else if (closeEcho) setPrompt("E · ESTABILIZAR ECO ESPECTRAL");
          else if (closeVent) setPrompt("E · ENTRAR EN CONDUCTO");
          else if (closeExit) {
            setPrompt("E · ABRIR SALIDA DE EMERGENCIA");
          }
          lastHudUpdate = now;
        }
      }

      {
        if (caughtSequence) {
          const scareProgress = THREE.MathUtils.clamp(
            (simulationTime - caughtSequence.startedAt) /
              JUMPSCARE_DURATION_MS,
            0,
            1,
          );
          camera.position.copy(player);
          camera.lookAt(
            subject.position.x,
            2.25 + Math.sin(scareProgress * Math.PI * 8) * 0.08,
            subject.position.z,
          );
          camera.fov = 74 + Math.sin(scareProgress * Math.PI) * 24;
        } else {
          const bob =
            playing && playerMoving && !ventTrip && !reducedMotion
              ? Math.sin(now * 0.011 * (playerSprinting ? 1.45 : 1)) *
                (playerCrouching ? 0.012 : 0.035)
              : 0;
          camera.position.copy(player);
          camera.position.y += bob;
          camera.rotation.set(pitch, yaw, 0);
          camera.fov = escapeSequence ? 80 : 74;
        }
        camera.updateProjectionMatrix();
        flashlight.visible = flashlightEnabled;
      }

      const spatialAudio = audioRef.current;
      if (spatialAudio?.isUnlocked) {
        if (!spatialSourcesStarted) {
          spatialAudio.startBeds();
          ventMeshes.slice(0, 4).forEach((vent, index) => {
            spatialAudio.startFan(`vent-fan-${index}`, vent.position, {
              gain: 0.24,
              playbackRate: 0.88 + index * 0.07,
            });
          });
          spatialSourcesStarted = true;
        }
        camera.getWorldDirection(audioForward);
        audioUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
        subject.getWorldDirection(enemyAudioForward);
        const subjectVisibleByRoute = corridorLineOfSight(
          maze,
          positionCell(player),
          positionCell(subject.position),
        );
        spatialAudio.setListener({
          position: camera.position,
          forward: audioForward,
          up: audioUp,
        });
        spatialAudio.updateEmitter("subject-m", {
          position: subject.position,
          orientation: enemyAudioForward,
          occlusion: subjectVisibleByRoute ? 0 : 0.76,
        });
      }

      if (!playing) {
        const orbit = now * 0.00008;
        camera.position.set(
          start.x + Math.sin(orbit) * 1.4,
          1.6,
          start.z + Math.cos(orbit) * 1.4,
        );
        camera.lookAt(start.x, 1.4, start.z - 2);
      }

      // Cheap failing fluorescent effect.
      frame += 1;
      const chasePulse =
        currentEnemyMode === "chase"
          ? 0.22 + Math.sin(now * 0.012) * 0.16
          : 0;
      emergencyLight.color.setHex(
        currentEnemyMode === "chase" ? 0xff1d14 : 0x7f948b,
      );
      emergencyLight.intensity =
        frame % 217 < 5 ? 0.08 : 0.68 + chasePulse;

      renderer.info.reset();
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, mount.clientWidth, mount.clientHeight);
      renderer.setClearColor(0x020303, 1);
      renderer.clear();
      if (tabletRef.current && playing) {
        const opticalCamera =
          cctvCameras[cctvIndexRef.current] ?? cctvCameras[0];
        if (
          !cctvSignalLost &&
          now - lastCctvFrame >= 1000 / graphics.cctvFps
        ) {
          opticalCamera.aspect =
            cctvTarget.width / Math.max(1, cctvTarget.height);
          opticalCamera.updateProjectionMatrix();
          renderer.setRenderTarget(cctvTarget);
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, cctvTarget.width, cctvTarget.height);
          renderer.setClearColor(0x020503, 1);
          renderer.clear();
          renderer.render(scene, opticalCamera);
          renderer.setRenderTarget(null);
          lastCctvFrame = now;
        }
        const feedBounds = cctvFeedRef.current?.getBoundingClientRect();
        const canvasBounds = renderer.domElement.getBoundingClientRect();
        if (feedBounds && feedBounds.width > 2 && feedBounds.height > 2) {
          const viewportX = Math.max(
            0,
            feedBounds.left - canvasBounds.left,
          );
          const viewportY = Math.max(
            0,
            canvasBounds.bottom - feedBounds.bottom,
          );
          renderer.setViewport(
            viewportX,
            viewportY,
            feedBounds.width,
            feedBounds.height,
          );
          renderer.setScissor(
            viewportX,
            viewportY,
            feedBounds.width,
            feedBounds.height,
          );
          renderer.setScissorTest(true);
          renderer.render(cctvDisplayScene, cctvDisplayCamera);
          renderer.setScissorTest(false);
        }
      } else {
        renderer.render(scene, camera);
      }
      lastRendererCalls = renderer.info.render.calls;
      lastRendererTriangles = renderer.info.render.triangles;
      peakRendererCalls = Math.max(peakRendererCalls, lastRendererCalls);
      peakRendererTriangles = Math.max(
        peakRendererTriangles,
        lastRendererTriangles,
      );
    };

    const walkWindow = window as Window & {
      __M00NQA__?: {
        snapshot: () => Record<string, unknown>;
        stageEnemy: (
          distance?: number,
          state?: EnemyState,
          yawOffsetDegrees?: number,
          verticalOffset?: number,
        ) => boolean;
        stageVent: (pairIndex?: number) => boolean;
        openCctv: (cameraIndex?: number) => boolean;
      };
    };
    const qaBridge = {
      stageEnemy: (
        distance = 4.6,
        state: EnemyState = "listen",
        yawOffsetDegrees = 0,
        verticalOffset = 0,
      ) => {
        if (!new URLSearchParams(window.location.search).has("qa")) {
          return false;
        }
        const stagedDistance = THREE.MathUtils.clamp(distance, 1.8, 8);
        const stagedYawOffset = THREE.MathUtils.clamp(
          yawOffsetDegrees,
          -180,
          180,
        );
        const stagedVerticalOffset = THREE.MathUtils.clamp(
          verticalOffset,
          -2.4,
          1,
        );
        const viewDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          yaw,
        );
        subject.position
          .copy(player)
          .setY(stagedVerticalOffset)
          .addScaledVector(viewDirection, stagedDistance);
        const towardPlayer = player.clone().setY(0).sub(subject.position);
        subject.rotation.y =
          Math.atan2(towardPlayer.x, towardPlayer.z) +
          Math.PI +
          THREE.MathUtils.degToRad(stagedYawOffset);
        currentPlayerDistance = stagedDistance;
        currentRouteDistance = 1;
        modelPreviewUntil = Number.POSITIVE_INFINITY;
        modelPreviewState = state;
        qaEnemyStage = {
          distance: stagedDistance,
          state,
          yawOffsetDegrees: stagedYawOffset,
          verticalOffset: stagedVerticalOffset,
        };
        flashlight.visible = true;
        flashlight.intensity = qaNeutralLighting ? 12 : 132;
        bodyFill.intensity = qaNeutralLighting ? 2 : 7.5;
        qaSideLight.intensity = 7.5;
        qaSideLight.visible = qaNeutralLighting;
        currentEnemyMode = state;
        setEnemyMode(state);
        transitionEnemyAnimation(state);
        return true;
      },
      stageVent: stageVentForQa,
      openCctv: openCctvForQa,
      snapshot: () => {
        const sortedFrames = [...frameTimes].sort(
          (first, second) => first - second,
        );
        const percentile = (ratio: number) =>
          sortedFrames[
            Math.min(
              sortedFrames.length - 1,
              Math.floor(sortedFrames.length * ratio),
            )
          ] ?? 0;
        return {
          seed,
          phase: phaseRef.current,
          player: {
            x: player.x,
            y: player.y,
            z: player.z,
            cell: positionCell(player),
            traveled: traveledDistance,
            crouching: playerCrouching,
            sprinting: playerSprinting,
          },
          controller: {
            capsuleHeight: capsuleState.height,
            capsuleRadius: capsuleWorld.radius,
            collided: lastCapsuleCollided,
          },
          vent: {
            active: Boolean(ventTrip),
            progress: ventTrip
              ? ventTrip.distanceAlong /
                Math.max(0.0001, ventTrip.totalDistance)
              : 0,
            lookYaw: yaw,
            routeYaw: currentVentHeadingYaw,
            lookOffsetRadians: Math.atan2(
              Math.sin(yaw - currentVentHeadingYaw),
              Math.cos(yaw - currentVentHeadingYaw),
            ),
            pitch,
          },
          sequences: {
            escape: Boolean(escapeSequence),
            caught: Boolean(caughtSequence),
          },
          noiseObjects: {
            pooled: noiseObjects.length,
            active: noiseObjects.filter((object) => object.mesh.visible).length,
          },
          enemy: {
            x: subject.position.x,
            z: subject.position.z,
            cell: positionCell(subject.position),
            state: currentEnemyMode,
            routeDistance: currentRouteDistance,
            animation: activeEnemyAction.getClip().name,
            animationMixer: true,
            gltfRigLoaded,
            gltfRigFailed,
            lodLevel: subject.getCurrentLevel(),
            model: subject.userData.model ?? "procedural-fallback",
            detailMeshes: subject.userData.meshes ?? 0,
            faceMechanics: Boolean(facePlateLeft && facePlateRight),
            pbrMaterialsLoaded,
            pbrMaterialsFailed,
            pbrTextureVariant,
            pbrAppliedMaterials,
            outerShellRetracted,
            yawRadians: subject.rotation.y,
            yawDegrees: THREE.MathUtils.radToDeg(subject.rotation.y),
            qaStage: qaEnemyStage,
          },
          hearing: {
            queuedEvents: acousticEvents.length,
            heard: Boolean(acousticPerception),
            kind: lastHeardKind,
            sourceCell: lastHeardCell,
            predictedCell: predictedHeardCell,
            routeDistance: lastNoiseDistance,
            ageMs:
              lastHeardAt > Number.NEGATIVE_INFINITY
                ? Math.max(0, simulationTime - lastHeardAt)
                : null,
            confidence: acousticPerception?.confidence ?? 0,
          },
          input: {
            ...inputController.getSnapshot(),
            appliedVelocity: { ...lastAppliedVelocity },
            slices: lastInputSlices.map((slice) => ({ ...slice })),
          },
          cctv: {
            open: tabletRef.current,
            index: cctvIndexRef.current,
            power: cctvPower,
            width: cctvTarget.width,
            height: cctvTarget.height,
            fps: graphics.cctvFps,
            signalLost: cctvSignalLost,
            schematicSegments: schematic.length,
            encounter: cctvEncounterRef.current?.id ?? null,
            encounterPhase: cctvEncounterPhaseRef.current,
            visits: cctvVisitRef.current,
            quietVisits: cctvQuietVisitsRef.current,
          },
          simulation: {
            fixedSteps,
            droppedCatchUps,
            accumulator: simulationAccumulator,
            paused: simulationPaused,
            clockResyncs,
            lastClockLagBeforeResyncMs,
            clockOffsetMs: Math.max(
              0,
              lastRenderTime -
                (simulationTime + simulationAccumulator * 1000),
            ),
          },
          audio: audioRef.current?.getQaCounters() ?? {
            contextState: "uninitialized",
            activeNodes: 0,
            activeOneShots: 0,
            activePersistentSources: 0,
            mascotWarningsPlayed: 0,
            mascotScreamsPlayed: 0,
            mascotScreamsFailed: 0,
            lastMascotVariant: null,
          },
          renderer: {
            calls: lastRendererCalls,
            triangles: lastRendererTriangles,
            peakCalls: peakRendererCalls,
            peakTriangles: peakRendererTriangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            pixelRatio: adaptivePixelRatio,
            webgl2: renderer.capabilities.isWebGL2,
          },
          frames: {
            samples: sortedFrames.length,
            medianMs: percentile(0.5),
            p95Ms: percentile(0.95),
            p99Ms: percentile(0.99),
          },
        };
      },
    };
    walkWindow.__M00NQA__ = qaBridge;
    renderFrame(performance.now());

    return () => {
      cctvEncounterGenerationRef.current += 1;
      cctvEncounterTimersRef.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      cctvEncounterTimersRef.current.clear();
      inputController.reset(performance.now());
      mobilePointers.clear();
      cancelAnimationFrame(animation);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearFocusInput);
      document.removeEventListener("visibilitychange", clearHiddenInput);
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerlockchange", pointerLockChange);
      document.removeEventListener("pointerlockerror", pointerLockError);
      renderer.domElement.removeEventListener("click", canvasClick);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("lostpointercapture", pointerUp);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        contextRestored,
      );
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
      rigLoadCancelled = true;
      enemyMixer.stopAllAction();
      enemyMixer.uncacheRoot(subjectDetail);
      pbrTextures.forEach((texture) => texture.dispose());
      pbrTextures.clear();
      subjectEnvironmentTarget?.dispose();
      subjectEnvironmentTarget = null;
      scene.traverse((object) => {
        if (
          !(object instanceof THREE.Mesh) &&
          !(object instanceof THREE.Points)
        ) {
          return;
        }
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((item) => item.dispose());
      });
      concreteColor.dispose();
      concreteRelief.dispose();
      hazardTexture.dispose();
      cctvTarget.dispose();
      cctvDisplayGeometry.dispose();
      cctvDisplayMaterial.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      canvasRef.current = null;
      if (walkWindow.__M00NQA__ === qaBridge) {
        delete walkWindow.__M00NQA__;
      }
      delete mount.dataset.qa;
    };
  }, [
    clearCctvEncounter,
    quality,
    requestControl,
    seed,
    setGamePhase,
  ]);

  useEffect(() => {
    audioRef.current?.setLevels(audioLevels);
  }, [audioLevels]);

  useEffect(
    () => () => {
      if (!audioRef.current) return;
      void audioRef.current.cleanup();
      audioRef.current = null;
    },
    [],
  );

  const chooseCamera = (index: number, eventTimestamp: number) => {
    clearCctvEncounter();
    cctvIndexRef.current = index;
    setCctvIndex(index);
    void primeCctvAudio().then((running) => {
      if (running && tabletRef.current) {
        audioRef.current?.playCctvStatic({ duration: 0.22, gain: 0.14 });
      }
    });
    const now = eventTimestamp;
    const visitCount = cctvVisitRef.current + 1;
    cctvVisitRef.current = visitCount;
    const decision = decideCctvEncounter(
      seed,
      index,
      visitCount,
      cctvQuietVisitsRef.current,
      now - cctvLastEncounterAtRef.current,
      motionDetected,
    );
    if (!decision.trigger) {
      cctvQuietVisitsRef.current += 1;
      setPrompt(`${cameraNames[index]} · sin actividad confirmada.`);
      return;
    }

    cctvQuietVisitsRef.current = 0;
    cctvLastEncounterAtRef.current = now;
    const mascot = mascotForCamera(seed + visitCount * 13, index);
    const generation = cctvEncounterGenerationRef.current;
    setPrompt("Interferencia localizada. No apartes la vista.");

    const schedule = (delay: number, action: () => void) => {
      const timer = window.setTimeout(() => {
        cctvEncounterTimersRef.current.delete(timer);
        if (
          generation !== cctvEncounterGenerationRef.current ||
          !tabletRef.current
        ) {
          return;
        }
        action();
      }, delay);
      cctvEncounterTimersRef.current.add(timer);
    };

    schedule(decision.revealDelayMs, () => {
      cctvEncounterRef.current = mascot;
      cctvEncounterPhaseRef.current = "presence";
      setCctvEncounter(mascot);
      setCctvEncounterPhase("presence");
      setPrompt(`${mascot.cameraCode} · presencia no autorizada.`);
      const engine = audioRef.current;
      if (engine?.playMascotWarning(mascot.screamVariant)) return;
      void engine?.resume().then((running) => {
        if (
          running &&
          generation === cctvEncounterGenerationRef.current &&
          tabletRef.current
        ) {
          engine.playMascotWarning(mascot.screamVariant);
        }
      });
    });
    schedule(decision.revealDelayMs + 620, () => {
      cctvEncounterPhaseRef.current = "scream";
      setCctvEncounterPhase("scream");
      setPrompt(`${mascot.name} · ¡BAJA EL MONITOR!`);
      const engine = audioRef.current;
      if (engine?.playMascotScream(mascot.screamVariant, 1.18)) return;
      void engine?.resume().then((running) => {
        if (
          running &&
          generation === cctvEncounterGenerationRef.current &&
          tabletRef.current
        ) {
          engine.playMascotScream(mascot.screamVariant, 1.18);
        }
      });
    });
    schedule(
      decision.revealDelayMs + decision.visibleDurationMs,
      () => {
        cctvEncounterRef.current = null;
        cctvEncounterPhaseRef.current = "idle";
        setCctvEncounter(null);
        setCctvEncounterPhase("idle");
        setPrompt(`${cameraNames[index]} · la señal vuelve a estar vacía.`);
      },
    );
  };

  const pointerInputTimestamp = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const timestamp = event.timeStamp;
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return performance.now();
    }
    return timestamp > performance.timeOrigin
      ? timestamp - performance.timeOrigin
      : timestamp;
  };

  const beginMobileAction = (
    action: WalkInputAction,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (phaseRef.current !== "playing" || tabletRef.current) return;
    event.preventDefault();
    const timestamp = pointerInputTimestamp(event);
    const source = `touch:${event.pointerId}`;
    const previous = mobilePointersRef.current.get(event.pointerId);
    if (previous && previous.action !== action) {
      inputControllerRef.current?.release(
        previous.action,
        previous.source,
        timestamp,
      );
    }
    mobilePointersRef.current.set(event.pointerId, { action, source });
    inputControllerRef.current?.press(action, source, timestamp);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional; window cancellation still clears input.
    }
  };

  const endMobileAction = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const activePointer = mobilePointersRef.current.get(event.pointerId);
    if (!activePointer) return;
    event.preventDefault();
    inputControllerRef.current?.release(
      activePointer.action,
      activePointer.source,
      pointerInputTimestamp(event),
    );
    mobilePointersRef.current.delete(event.pointerId);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The browser may already have released a cancelled pointer.
    }
  };

  const updateAudioLevel = (key: keyof AudioLevels, value: number) => {
    setAudioLevels((levels) => ({ ...levels, [key]: value }));
  };

  return (
    <main className={`walk-game phase-${phase} enemy-${enemyMode}`}>
      <div ref={mountRef} className="walk-stage" aria-label="Laberinto tridimensional M00NW4LK.EXE" />
      <div className="walk-noise" aria-hidden="true" />
      <div className="walk-vignette" aria-hidden="true" />
      {activeJumpscare && (
        <div
          className={`mascot-jumpscare mascot-${activeJumpscare.id}`}
          aria-hidden="true"
        >
          <div
            className="mascot-jumpscare-face"
            style={{ backgroundImage: `url(${activeJumpscare.image})` }}
          />
          <div className="mascot-jumpscare-id">
            <span>ARCHIVO PARASITO · SCREAM FEED</span>
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
        <Link href="/" className="walk-back">← PREMIERE 22</Link>
        <div>
          <span className="rec-dot" />
          BODY CAM · M00NW4LK.EXE
        </div>
        <span>SEMILLA {seed}</span>
      </header>

      {phase === "playing" && (
        <>
          <section className="walk-hud" aria-label="Estado de la partida">
            <div className="hud-block heartbeat-block">
              <span>PROXIMIDAD</span>
              <strong>{bpm}<small>BPM</small></strong>
              <div className="heart-line">
                {Array.from({ length: 15 }, (_, index) => <i key={index} />)}
              </div>
            </div>
            <div className="hud-block">
              <span>SECTOR</span>
              <strong>{sector}</strong>
              <small>ESTADO IA · {enemyStateLabels[enemyMode]}</small>
              <small>RECORRIDO · {traveled.toFixed(1)} m</small>
              <small>SUJETO M · ~{distance} m</small>
            </div>
            <div className="hud-block echo-block">
              <span>ECOS DISPONIBLES</span>
              <strong>{String(echoes).padStart(2, "0")}</strong>
              <small>G · PROYECTAR SEÑUELO</small>
            </div>
          </section>

          <div className="crosshair" aria-hidden="true"><i /><i /></div>

          <aside className="objective-card">
            <span>OBJETIVO ACTUAL</span>
            <strong>ENCUENTRA LA SALIDA</strong>
            <p>{prompt}</p>
          </aside>

          <div className="controls-hint">
            <span><b>WASD</b> MOVER</span>
            <span><b>SHIFT</b> CORRER (RUIDO)</span>
            <span><b>CTRL</b> AGACHARSE</span>
            <span><b>E</b> INTERACTUAR</span>
            <span><b>G</b> SEÑUELO</span>
            <span><b>Q</b> LANZAR PIEZA</span>
            <span><b>TAB</b> CÁMARAS</span>
            <span><b>F</b> LINTERNA</span>
          </div>

          {pointerHelp && !tabletOpen && (
            <button
              className="pointer-help"
              type="button"
              onClick={requestControl}
            >
              <span>CONTROL ALTERNATIVO ACTIVO</span>
              CLIC PARA CAPTURAR · O WASD + ARRASTRAR
            </button>
          )}
        </>
      )}

      {inVent && !tabletOpen && (
        <div className="vent-overlay" role="status">
          <div className="vent-frame" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="vent-route-readout">
            <small>CONDUCTO DE MANTENIMIENTO · {ventRoute}</small>
            <strong>{String(ventProgress).padStart(2, "0")}%</strong>
            <div><i style={{ width: `${ventProgress}%` }} /></div>
            <span>W/S AVANZA O RETROCEDE · A/D O RATÓN GIRAN LA CÁMARA</span>
          </div>
        </div>
      )}

      {tabletOpen && phase === "playing" && (
        <section className="cctv-tablet" aria-label="Red de cámaras del laberinto">
          <div className="tablet-shell">
            <div
              ref={cctvFeedRef}
              className={`cctv-feed${signalLost ? " signal-lost" : ""}`}
            >
              <div className="cctv-scan" />
              {!signalLost && cctvEncounter && (
                <div
                  className={`cctv-intruder encounter-${cctvEncounterPhase}${
                    cctvEncounterPhase === "scream" ? " detected" : ""
                  }`}
                  style={{ backgroundImage: `url(${cctvEncounter.image})` }}
                  aria-hidden="true"
                >
                  <span>{cctvEncounter.cameraCode}</span>
                  <strong>{cctvEncounter.name}</strong>
                  <small>{cctvEncounter.role}</small>
                  <em>AUDIO · {cctvEncounter.signal}</em>
                </div>
              )}
              {signalLost && (
                <div className="cctv-signal-loss">
                  <strong>SIGNAL LOST</strong>
                  <span>RENEGOCIANDO ENLACE...</span>
                </div>
              )}
              <div className="cctv-feed-top">
                <span>● LIVE</span>
                <strong>{cameraNames[cctvIndex]}</strong>
                <span>12:{String(cctvIndex + 1).padStart(2, "0")} AM</span>
              </div>
              <div className="cctv-warning">
                <span>SEÑAL DE MOVIMIENTO</span>
                <b>
                  {signalLost
                    ? "SIN SEÑAL"
                    : cctvEncounterPhase === "scream"
                    ? "¡RETROCEDE!"
                    : cctvEncounter
                    ? "PRESENCIA PARÁSITA"
                    : motionDetected
                    ? "OBJETO NO IDENTIFICADO"
                    : "SIN ACTIVIDAD"}
                </b>
              </div>
            </div>
            <div className="cctv-panel">
              <div className="cctv-map">
                <svg
                  className="map-schematic"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {mapSegments.map((segment, index) => (
                    <line
                      key={`${segment.x1}-${segment.y1}-${index}`}
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                    />
                  ))}
                </svg>
                <span
                  className="map-office"
                  style={{
                    left: `${mapPlayer.left}%`,
                    top: `${mapPlayer.top}%`,
                  }}
                >
                  YOU
                </span>
                {cameraNames.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    className={cctvIndex === index ? "active" : ""}
                    onPointerDown={() => {
                      void primeCctvAudio();
                    }}
                    onClick={(event) => chooseCamera(index, event.timeStamp)}
                    style={{
                      left: `${cameraMapPositions[index]?.left ?? 12}%`,
                      top: `${cameraMapPositions[index]?.top ?? 12}%`,
                    }}
                  >
                    C{index + 1}
                  </button>
                ))}
              </div>
              <div className="cctv-power">
                <span>ENERGÍA DE RED</span>
                <div><i style={{ width: `${power}%` }} /></div>
                <strong>{power}%</strong>
              </div>
              <button
                className="tablet-close"
                type="button"
                onClick={() => {
                  tabletRef.current = false;
                  setTabletOpen(false);
                  clearCctvEncounter();
                  requestControl();
                }}
              >
                BAJAR MONITOR · TAB
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === "briefing" && (
        <section className="game-overlay briefing">
          <div className="briefing-kicker">
            <span>EXPERIENCIA 3D · PROCEDURAL</span>
            <span>ARCHIVO CLASIFICADO 22</span>
          </div>
          <h1>M00N<br /><strong>W4LK.EXE</strong></h1>
          <p>
            Los corredores cambian en cada incursión. Encuentra la salida,
            métete por los conductos y escucha tus latidos: cuanto más rápidos,
            más cerca está <b>SUJETO M</b>.
          </p>
          <div className="briefing-grid">
            <div>
              <span>ENTIDAD</span>
              <strong>ANIMATRÓNICO M-22</strong>
              <small>Memoria acústica · predice pasos · sprint audible</small>
            </div>
            <div>
              <span>RECURSO</span>
              <strong>ECOS ESPECTRALES</strong>
              <small>Encuéntralos con E · proyéctalos con G</small>
            </div>
            <div>
              <span>RUTA</span>
              <strong>GENERACIÓN ÚNICA</strong>
              <small>Pasillos, cruces, cámaras y conductos variables</small>
            </div>
          </div>
          <div className="briefing-roster" aria-label="Archivo de animatrónicos">
            <span className="briefing-roster-title">
              RED MASCOTA CORRUPTA · 4 SCREAMS PROCEDURALES
            </span>
            <div>
              {SCARE_ROSTER.map((mascot) => (
                <article key={mascot.id}>
                  <i
                    className="briefing-mascot-image"
                    style={{ backgroundImage: `url(${mascot.image})` }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{mascot.name}</strong>
                    <small>{mascot.role}</small>
                  </span>
                  <button
                    type="button"
                    onClick={() => previewMascotScream(mascot)}
                    aria-label={`Oír scream de ${mascot.name}`}
                  >
                    ▶ OÍR
                  </button>
                </article>
              ))}
            </div>
          </div>
          <div className="quality-picker" aria-label="Calidad gráfica">
            <span>PERFIL GRÁFICO</span>
            <div>
              {(["low", "medium", "high", "ultra"] as const).map(
                (profile) => (
                  <button
                    key={profile}
                    type="button"
                    className={quality === profile ? "active" : ""}
                    onClick={() => setQuality(profile)}
                  >
                    {profile === "low"
                      ? "BAJO"
                      : profile === "medium"
                        ? "MEDIO"
                        : profile === "high"
                          ? "ALTO"
                          : "ULTRA"}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="audio-mixer" aria-label="Mezclador de audio">
            {(
              [
                ["master", "GENERAL"],
                ["ambience", "AMBIENTE"],
                ["music", "MÚSICA"],
                ["sfx", "EFECTOS"],
                ["heartbeat", "LATIDO"],
                ["jumpscare", "JUMPSCARE"],
              ] as Array<[keyof AudioLevels, string]>
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioLevels[key]}
                  onChange={(event) =>
                    updateAudioLevel(key, Number(event.target.value))
                  }
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={beginGame}>
            ENTRAR EN EL PASADIZO <span>WASD →</span>
          </button>
          <small className="fiction-note">
            Parodia de terror completamente ficticia · Recomendado con auriculares y ordenador
          </small>
          <p className="system-message">{message}</p>
        </section>
      )}

      {phase === "caught" && (
        <section className="game-overlay result caught">
          <span className="result-code">ERROR_CERVICAL_180</span>
          <h2>TE HA<br />ENCONTRADO.</h2>
          <p>{message}</p>
          <button type="button" onClick={restart}>GENERAR OTRO LABERINTO</button>
          <Link href="/">ABANDONAR ARCHIVO</Link>
        </section>
      )}

      {phase === "escaped" && (
        <section className="game-overlay result escaped">
          <span className="result-code">SALIDA_DE_EMERGENCIA_ABIERTA</span>
          <h2>HAS SALIDO.<br /><strong>ÉL TAMBIÉN.</strong></h2>
          <p>{message}</p>
          <button type="button" onClick={restart}>ENTRAR EN OTRA RUTA</button>
          <Link href="/">VOLVER A LA PREMIERE</Link>
        </section>
      )}

      {phase === "playing" && (
        <div className="mobile-controls" aria-label="Controles táctiles">
          <div className="mobile-pad">
            <button
              type="button"
              onPointerDown={(event) => beginMobileAction("forward", event)}
              onPointerUp={endMobileAction}
              onPointerCancel={endMobileAction}
              onPointerLeave={endMobileAction}
              onLostPointerCapture={endMobileAction}
            >W</button>
            <button
              type="button"
              onPointerDown={(event) => beginMobileAction("left", event)}
              onPointerUp={endMobileAction}
              onPointerCancel={endMobileAction}
              onPointerLeave={endMobileAction}
              onLostPointerCapture={endMobileAction}
            >A</button>
            <button
              type="button"
              onPointerDown={(event) => beginMobileAction("backward", event)}
              onPointerUp={endMobileAction}
              onPointerCancel={endMobileAction}
              onPointerLeave={endMobileAction}
              onLostPointerCapture={endMobileAction}
            >S</button>
            <button
              type="button"
              onPointerDown={(event) => beginMobileAction("right", event)}
              onPointerUp={endMobileAction}
              onPointerCancel={endMobileAction}
              onPointerLeave={endMobileAction}
              onLostPointerCapture={endMobileAction}
            >D</button>
          </div>
          <div className="mobile-actions">
            <button
              type="button"
              onPointerDown={(event) => beginMobileAction("sprint", event)}
              onPointerUp={endMobileAction}
              onPointerCancel={endMobileAction}
              onPointerLeave={endMobileAction}
              onLostPointerCapture={endMobileAction}
            >
              RUN
            </button>
            <button
              type="button"
              onPointerDown={(event) => beginMobileAction("crouch", event)}
              onPointerUp={endMobileAction}
              onPointerCancel={endMobileAction}
              onPointerLeave={endMobileAction}
              onLostPointerCapture={endMobileAction}
            >
              CTRL
            </button>
            <button
              type="button"
              onClick={() => {
                if (power <= 0) return;
                void primeCctvAudio();
                tabletRef.current = !tabletRef.current;
                inputControllerRef.current?.reset(performance.now());
                mobilePointersRef.current.clear();
                setTabletOpen(tabletRef.current);
                if (tabletRef.current) {
                  void audioRef.current?.resume().then((running) => {
                    if (running && tabletRef.current) {
                      audioRef.current?.playCctvStatic();
                    }
                  });
                }
                if (tabletRef.current) document.exitPointerLock?.();
              }}
            >
              CAM
            </button>
            <button
              type="button"
              onClick={() => {
                interactQueuedRef.current = true;
              }}
            >
              E
            </button>
            <button
              type="button"
              onClick={() => {
                dropQueuedRef.current = true;
              }}
            >
              G
            </button>
            <button
              type="button"
              onClick={() => {
                objectQueuedRef.current = true;
              }}
            >
              Q
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
