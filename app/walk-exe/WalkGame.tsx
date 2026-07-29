"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import {
  CELL_SIZE,
  CROUCH_HEIGHT,
  MAZE_SIZE,
  PLAYER_HEIGHT,
  WALL_HEIGHT,
  WALL_THICKNESS,
  chooseSpreadCells,
  corridorLineOfSight,
  createMaze,
  createZoneMap,
  decideEnemyState,
  farthestCell,
  mazePath,
  openingDirection,
  positionCell2D,
  resolveGridMovement,
  seededRandom,
  uniqueReachableCells,
  type EnemyState,
} from "./game-core";

type GamePhase = "briefing" | "playing" | "caught" | "escaped";
type QualityProfile = "low" | "medium" | "high" | "ultra";
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
  from: THREE.Vector3;
  to: THREE.Vector3;
  destinationCell: number;
  pairIndex: number;
  path: THREE.Vector3[];
  cumulative: number[];
  totalDistance: number;
  startedAt: number;
  duration: number;
};

type ActiveLure = {
  mesh: THREE.Group;
  cell: number;
  expiresAt: number;
};

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
    localLights: 5,
    shadows: false,
    cctvWidth: 480,
    cctvFps: 10,
  },
  medium: {
    pixelRatio: 1,
    dust: 360,
    localLights: 8,
    shadows: false,
    cctvWidth: 640,
    cctvFps: 12,
  },
  high: {
    pixelRatio: 1.25,
    dust: 620,
    localLights: 12,
    shadows: false,
    cctvWidth: 640,
    cctvFps: 12,
  },
  ultra: {
    pixelRatio: 1.55,
    dust: 900,
    localLights: 16,
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
  hat.position.set(0, 0.77, -0.01);
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
  addMesh(door, new THREE.BoxGeometry(2.4, 3.25, 0.24), steel, [0, 1.62, 0]);
  addMesh(door, new THREE.BoxGeometry(1.72, 2.45, 0.12), material(0x090909, 0.8, 0.3), [0, 1.48, -0.18]);
  addMesh(door, new THREE.BoxGeometry(1.6, 0.14, 0.1), red, [0, 2.88, -0.28]);
  addMesh(door, new THREE.BoxGeometry(0.22, 0.55, 0.18), red, [0.69, 1.52, -0.28]);
  return door;
}

export default function WalkExe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<GamePhase>("briefing");
  const keysRef = useRef<Record<string, boolean>>({});
  const interactQueuedRef = useRef(false);
  const dropQueuedRef = useRef(false);
  const tabletRef = useRef(false);
  const cctvIndexRef = useRef(0);
  const cctvFeedRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<{
    context: AudioContext;
    hum: OscillatorNode;
    drone: OscillatorNode;
    lfo: OscillatorNode;
    humGain: GainNode;
    master: GainNode;
    ambience: GainNode;
    music: GainNode;
    sfx: GainNode;
    heartbeat: GainNode;
    jumpscare: GainNode;
  } | null>(null);
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
  const [pointerHelp, setPointerHelp] = useState(false);
  const [enemyMode, setEnemyMode] = useState<EnemyState>("patrol");
  const [quality, setQuality] = useState<QualityProfile>("high");
  const [motionDetected, setMotionDetected] = useState(false);
  const [mapPlayer, setMapPlayer] = useState({ left: 3, top: 3 });
  const [cameraMapPositions, setCameraMapPositions] = useState<
    Array<{ left: number; top: number }>
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

  const startAudio = useCallback(() => {
    if (audioRef.current) {
      void audioRef.current.context.resume();
      return;
    }
    const context = new AudioContext();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const ambience = context.createGain();
    const music = context.createGain();
    const sfx = context.createGain();
    const heartbeat = context.createGain();
    const jumpscare = context.createGain();
    const hum = context.createOscillator();
    const drone = context.createOscillator();
    const lfo = context.createOscillator();
    const humGain = context.createGain();
    const droneGain = context.createGain();
    const lfoGain = context.createGain();
    const droneFilter = context.createBiquadFilter();
    hum.type = "sawtooth";
    hum.frequency.value = 42;
    humGain.gain.value = 0.011;
    hum.connect(humGain);
    humGain.connect(ambience);
    drone.type = "triangle";
    drone.frequency.value = 54;
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 185;
    droneFilter.Q.value = 5.4;
    droneGain.gain.value = 0.045;
    lfo.type = "sine";
    lfo.frequency.value = 0.17;
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(droneGain.gain);
    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(music);
    ambience.gain.value = audioLevels.ambience;
    music.gain.value = audioLevels.music;
    sfx.gain.value = audioLevels.sfx;
    heartbeat.gain.value = audioLevels.heartbeat;
    jumpscare.gain.value = audioLevels.jumpscare;
    master.gain.value = audioLevels.master;
    ambience.connect(master);
    music.connect(master);
    sfx.connect(master);
    heartbeat.connect(master);
    jumpscare.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);
    hum.start();
    drone.start();
    lfo.start();
    audioRef.current = {
      context,
      hum,
      drone,
      lfo,
      humGain,
      master,
      ambience,
      music,
      sfx,
      heartbeat,
      jumpscare,
    };
  }, [audioLevels]);

  const setGamePhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const requestControl = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.focus({ preventScroll: true });
    try {
      void canvas.requestPointerLock().catch(() => {
        setPointerHelp(true);
        setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
      });
    } catch {
      setPointerHelp(true);
      setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
    }
  }, []);

  const beginGame = useCallback(() => {
    startAudio();
    setGamePhase("playing");
    setPointerHelp(false);
    setPrompt("Sigue las marcas del suelo. WASD mueve; arrastra para mirar.");
    setMessage("Encuentra la puerta de emergencia. TAB abre la red CCTV.");
    // Pointer lock must be requested synchronously inside the user's click.
    requestControl();
  }, [requestControl, setGamePhase, startAudio]);

  const restart = useCallback(() => {
    document.exitPointerLock?.();
    setEchoes(0);
    setTraveled(0);
    setPower(96);
    setTabletOpen(false);
    tabletRef.current = false;
    setSeed(Math.floor(100000 + Math.random() * 899999));
    setGamePhase("briefing");
    setMessage("El sistema ha destruido el mapa anterior.");
  }, [setGamePhase]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const maze = createMaze(seed);
    const zones = createZoneMap(maze, seed);
    const random = seededRandom(seed * 7 + 22);
    const graphics = qualitySettings[quality];
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
    let yaw = startOpening.yaw;
    let pitch = 0;
    let traveledDistance = 0;
    let echoesHeld = 0;
    let nextHeartbeat = 0;
    let nextFootstep = 0;
    let nextEnemyStep = 0;
    let nextPathUpdate = 0;
    let lastHudUpdate = 0;
    let cctvPower = 96;
    let lastReportedPower = 96;
    let enemyPath = mazePath(maze, enemyStart, 0);
    let ventTrip: VentTrip | null = null;
    let activeLure: ActiveLure | null = null;
    let flashlightEnabled = true;
    let caught = false;
    let escaped = false;
    let draggingLook = false;
    let simulationPaused = document.hidden;
    let simulationTime = performance.now();
    let simulationAccumulator = 0;
    let lastRenderTime = performance.now();
    let currentEnemyMode: EnemyState = "patrol";
    let currentEnemySpeed = 1.05;
    let currentPlayerDistance = 99;
    let currentRouteDistance = 99;
    let currentBpm = 42;
    let lastNoiseAt = Number.NEGATIVE_INFINITY;
    let lastNoiseCell = 0;
    let lastNoiseRadius = 0;
    let lastSeenAt = Number.NEGATIVE_INFINITY;
    let lastSeenCell = 0;
    let cctvExposureMs = 0;
    let patrolCursor = 0;
    let playerMoving = false;
    let playerSprinting = false;
    let playerCrouching = false;
    const keyPulseUntil: Record<string, number> = {};

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
    exit.position.copy(exitPosition);
    exit.position.y = 0;
    exit.rotation.y = Math.PI;
    world.add(exit);
    const exitLight = new THREE.PointLight(0xff1717, 34, 10, 1.8);
    exitLight.position.copy(exitPosition).add(new THREE.Vector3(0, 2.4, 0));
    scene.add(exitLight);

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

    const subject = createSubjectM();
    const enemyPosition = cellCenter(enemyStart);
    subject.position.set(enemyPosition.x, 0, enemyPosition.z);
    world.add(subject);
    const head = subject.getObjectByName("head");
    const jaw = subject.getObjectByName("jaw");
    const subjectHat = subject.getObjectByName("hat");
    const leftLeg = subject.getObjectByName("legLeft");
    const rightLeg = subject.getObjectByName("legRight");
    const leftArm = subject.getObjectByName("armLeft");
    const rightArm = subject.getObjectByName("armRight");

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
    scene.add(camera);

    const playPulse = (strength: number) => {
      const system = audioRef.current;
      if (!system) return;
      const now = system.context.currentTime;
      [0, 0.13].forEach((offset, index) => {
        const osc = system.context.createOscillator();
        const gain = system.context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(index ? 43 : 52, now + offset);
        osc.frequency.exponentialRampToValueAtTime(34, now + offset + 0.1);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.01, strength * (index ? 0.55 : 1)), now + offset + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.13);
        osc.connect(gain);
        gain.connect(system.heartbeat);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
        osc.addEventListener(
          "ended",
          () => {
            osc.disconnect();
            gain.disconnect();
          },
          { once: true },
        );
      });
    };

    const playStep = () => {
      const system = audioRef.current;
      if (!system) return;
      const now = system.context.currentTime;
      const osc = system.context.createOscillator();
      const gain = system.context.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      osc.connect(gain);
      gain.connect(system.sfx);
      osc.start();
      osc.stop(now + 0.12);
      osc.addEventListener(
        "ended",
        () => {
          osc.disconnect();
          gain.disconnect();
        },
        { once: true },
      );
    };

    const playEnemyStep = (distanceToPlayer: number) => {
      const system = audioRef.current;
      if (!system) return;
      const now = system.context.currentTime;
      const oscillator = system.context.createOscillator();
      const gain = system.context.createGain();
      const pan = system.context.createStereoPanner();
      const relative = subject.position.clone().sub(player);
      const facingRight = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      pan.pan.value = THREE.MathUtils.clamp(
        relative.normalize().dot(facingRight),
        -0.92,
        0.92,
      );
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(96, now);
      oscillator.frequency.exponentialRampToValueAtTime(31, now + 0.14);
      gain.gain.setValueAtTime(
        THREE.MathUtils.clamp(
          0.12 / Math.max(1, distanceToPlayer * 0.3),
          0.008,
          0.09,
        ),
        now,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      oscillator.connect(gain);
      gain.connect(pan);
      pan.connect(system.sfx);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      oscillator.addEventListener(
        "ended",
        () => {
          oscillator.disconnect();
          gain.disconnect();
          pan.disconnect();
        },
        { once: true },
      );
    };

    const playMechanicalScream = () => {
      const system = audioRef.current;
      if (!system) return;
      const audioNow = system.context.currentTime;
      const duration = 0.82;
      const sampleRate = system.context.sampleRate;
      const buffer = system.context.createBuffer(
        1,
        Math.ceil(sampleRate * duration),
        sampleRate,
      );
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        const time = index / sampleRate;
        const envelope = Math.pow(1 - time / duration, 0.7);
        samples[index] =
          (Math.random() * 2 - 1) *
          envelope *
          (0.55 + Math.sin(time * 1130) * 0.24);
      }
      const noise = system.context.createBufferSource();
      const filter = system.context.createBiquadFilter();
      const gain = system.context.createGain();
      const low = system.context.createOscillator();
      const lowGain = system.context.createGain();
      noise.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2700, audioNow);
      filter.frequency.exponentialRampToValueAtTime(620, audioNow + duration);
      filter.Q.value = 4.2;
      gain.gain.setValueAtTime(0.0001, audioNow);
      gain.gain.exponentialRampToValueAtTime(0.42, audioNow + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioNow + duration);
      low.type = "sawtooth";
      low.frequency.setValueAtTime(118, audioNow);
      low.frequency.exponentialRampToValueAtTime(34, audioNow + 0.58);
      lowGain.gain.setValueAtTime(0.16, audioNow);
      lowGain.gain.exponentialRampToValueAtTime(0.0001, audioNow + 0.62);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(system.jumpscare);
      low.connect(lowGain);
      lowGain.connect(system.jumpscare);
      noise.start(audioNow);
      low.start(audioNow);
      noise.stop(audioNow + duration);
      low.stop(audioNow + 0.64);
      noise.addEventListener(
        "ended",
        () => {
          noise.disconnect();
          filter.disconnect();
          gain.disconnect();
        },
        { once: true },
      );
      low.addEventListener(
        "ended",
        () => {
          low.disconnect();
          lowGain.disconnect();
        },
        { once: true },
      );
    };

    const triggerCaught = () => {
      if (caught || escaped) return;
      caught = true;
      document.exitPointerLock?.();
      setMessage("SUJETO M ha interceptado la señal.");
      setGamePhase("caught");
      playMechanicalScream();
    };

    const applyPlayerMovement = (
      forward: number,
      strafe: number,
      distanceToMove: number,
    ) => {
      if (!forward && !strafe) return 0;
      const length = Math.hypot(forward, strafe) || 1;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      const moveX =
        ((forward / length) * forwardX + (strafe / length) * rightX) *
        distanceToMove;
      const moveZ =
        ((forward / length) * forwardZ + (strafe / length) * rightZ) *
        distanceToMove;
      const resolved = resolveGridMovement(
        maze,
        { x: player.x, z: player.z },
        { x: moveX, z: moveZ },
      );
      player.x = resolved.x;
      player.z = resolved.z;
      traveledDistance += resolved.moved;
      return resolved.moved;
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
          player.clone(),
          sourceVent.position.clone().setY(0.72),
          sourceVent.position.clone().setY(ductHeight),
          destinationVent.position.clone().setY(ductHeight),
          destinationVent.position.clone().setY(0.72),
          destination.clone().setY(0.72),
        ];
        const cumulative = [0];
        for (let index = 1; index < path.length; index += 1) {
          cumulative[index] =
            cumulative[index - 1] +
            path[index - 1].distanceTo(path[index]);
        }
        const totalDistance = cumulative[cumulative.length - 1];
        if (ductRoutes[pairIndex]) ductRoutes[pairIndex].visible = true;
        ventTrip = {
          from: player.clone(),
          to: destination.clone().setY(0.72),
          destinationCell: pairedCell,
          pairIndex,
          path,
          cumulative,
          totalDistance,
          startedAt: now,
          duration: THREE.MathUtils.clamp(
            (totalDistance / 4.2) * 1000,
            4800,
            12000,
          ),
        };
        lastNoiseAt = now;
        lastNoiseCell = currentCell;
        lastNoiseRadius = 13;
        setInVent(true);
        setPrompt("Dentro del conducto. No hagas ruido.");
        return;
      }

      if (cellCenter(exitCell).distanceTo(player.clone().setY(0)) < 1.55) {
        escaped = true;
        document.exitPointerLock?.();
        setGamePhase("escaped");
        setMessage("La puerta se ha cerrado detrás de ti. El pasadizo sigue cambiando.");
      }
    };

    const normalizedKeyCode = (event: KeyboardEvent) => {
      if (event.code) return event.code;
      const upper = event.key.toUpperCase();
      if (upper === "W" || upper === "A" || upper === "S" || upper === "D") {
        return `Key${upper}`;
      }
      return event.key;
    };
    const keyDown = (event: KeyboardEvent) => {
      const code = normalizedKeyCode(event);
      keysRef.current[code] = true;
      if (
        code === "KeyW" ||
        code === "KeyS" ||
        code === "KeyA" ||
        code === "KeyD" ||
        code.startsWith("Arrow")
      ) {
        keyPulseUntil[code] = performance.now() + 90;
        event.preventDefault();
      }
      if (code === "KeyE") interactQueuedRef.current = true;
      if (code === "KeyG") dropQueuedRef.current = true;
      if (code === "Tab" && phaseRef.current === "playing" && cctvPower > 0) {
        event.preventDefault();
        tabletRef.current = !tabletRef.current;
        setTabletOpen(tabletRef.current);
        setPrompt(
          tabletRef.current
            ? "Red CCTV activa. El consumo de energía aumenta."
            : "Cámara corporal restaurada.",
        );
        if (tabletRef.current) document.exitPointerLock?.();
        else {
          renderer.domElement.focus({ preventScroll: true });
          try {
            void renderer.domElement
              .requestPointerLock()
              .catch(() => {
                setPointerHelp(true);
                setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
              });
          } catch {
            setPointerHelp(true);
            setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
          }
        }
      }
      if (code === "KeyF") {
        flashlightEnabled = !flashlightEnabled;
        flashlight.visible = flashlightEnabled;
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      const code = normalizedKeyCode(event);
      keysRef.current[code] = false;
      if (event.key.length === 1) {
        keysRef.current[`Key${event.key.toUpperCase()}`] = false;
      }
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
      yaw -= event.movementX * 0.0021;
      pitch -= event.movementY * 0.0018;
      pitch = Math.max(-1.02, Math.min(1.02, pitch));
    };
    const pointerDown = (event: PointerEvent) => {
      if (
        event.button === 0 &&
        phaseRef.current === "playing" &&
        !tabletRef.current
      ) {
        draggingLook = true;
        renderer.domElement.focus({ preventScroll: true });
      }
    };
    const pointerUp = () => {
      draggingLook = false;
    };
    const canvasClick = () => {
      if (phaseRef.current === "playing" && !tabletRef.current) {
        renderer.domElement.focus({ preventScroll: true });
        try {
          void renderer.domElement
            .requestPointerLock()
            .catch(() => {
              setPointerHelp(true);
              setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
            });
        } catch {
          setPointerHelp(true);
          setPrompt("Modo alternativo: mantén WASD y arrastra para mirar.");
        }
      }
    };
    const pointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
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
    const clearHiddenInput = () => {
      keysRef.current = {};
      Object.keys(keyPulseUntil).forEach((code) => {
        keyPulseUntil[code] = 0;
      });
      draggingLook = false;
      simulationPaused = document.hidden;
      simulationAccumulator = 0;
      lastRenderTime = performance.now();
      if (document.hidden) {
        void audioRef.current?.context.suspend();
      } else if (phaseRef.current === "playing") {
        void audioRef.current?.context.resume();
      }
    };
    const clearFocusInput = () => {
      keysRef.current = {};
      draggingLook = false;
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
    window.addEventListener("pointerup", pointerUp);

    const fixedUpdate = (delta: number, tickNow: number) => {
      if (phaseRef.current !== "playing" || simulationPaused) return;

      const active = (code: string) =>
        Boolean(keysRef.current[code]) ||
        (keyPulseUntil[code] ?? 0) > tickNow;

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

      if (!tabletRef.current) {
        if (ventTrip) {
          const progress = Math.min(
            1,
            (tickNow - ventTrip.startedAt) / ventTrip.duration,
          );
          const eased =
            progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          const distanceAlong = eased * ventTrip.totalDistance;
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
          player.y += Math.sin(progress * Math.PI * 18) * 0.025;
          const travelDirection = ventTrip.path[segment + 1]
            .clone()
            .sub(ventTrip.path[segment]);
          if (Math.hypot(travelDirection.x, travelDirection.z) > 0.1) {
            const ductYaw =
              Math.atan2(travelDirection.x, travelDirection.z) + Math.PI;
            yaw +=
              Math.atan2(
                Math.sin(ductYaw - yaw),
                Math.cos(ductYaw - yaw),
              ) * Math.min(1, delta * 2.6);
          }
          playerMoving = true;
          playerSprinting = false;
          playerCrouching = true;
          if (progress >= 1) {
            player.copy(ventTrip.to);
            player.y = CROUCH_HEIGHT;
            if (ductRoutes[ventTrip.pairIndex]) {
              ductRoutes[ventTrip.pairIndex].visible = false;
            }
            ventTrip = null;
            setInVent(false);
            setPrompt("Has salido al otro lado. Algo ha oÃ­do la rejilla.");
          }
        } else {
          const forward =
            Number(active("KeyW") || active("ArrowUp")) -
            Number(active("KeyS") || active("ArrowDown"));
          const strafe =
            Number(active("KeyD") || active("ArrowRight")) -
            Number(active("KeyA") || active("ArrowLeft"));
          playerCrouching =
            active("ControlLeft") || active("ControlRight");
          playerSprinting =
            !playerCrouching &&
            (active("ShiftLeft") || active("ShiftRight"));
          playerMoving = forward !== 0 || strafe !== 0;
          const movementSpeed = playerCrouching
            ? 1.42
            : playerSprinting
              ? 4.35
              : 2.75;
          const moved = playerMoving
            ? applyPlayerMovement(
                forward,
                strafe,
                movementSpeed * delta,
              )
            : 0;
          const targetHeight = playerCrouching
            ? CROUCH_HEIGHT
            : PLAYER_HEIGHT;
          player.y += (targetHeight - player.y) * Math.min(1, delta * 13);
          if (moved > 0.0001) {
            lastNoiseAt = tickNow;
            lastNoiseCell = positionCell(player);
            lastNoiseRadius = playerCrouching
              ? 3
              : playerSprinting
                ? 12
                : 6;
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
        cctvExposureMs = Math.max(0, cctvExposureMs - delta * 650);
      } else {
        cctvExposureMs += delta * 1000;
        cctvPower = Math.max(0, cctvPower - delta);
        if (Math.ceil(cctvPower) !== lastReportedPower) {
          lastReportedPower = Math.ceil(cctvPower);
          setPower(lastReportedPower);
        }
        if (cctvPower <= 0) {
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
      const noiseDistance =
        lastNoiseAt > Number.NEGATIVE_INFINITY
          ? mazePath(maze, enemyCell, lastNoiseCell).length - 1
          : Number.POSITIVE_INFINITY;
      const heardNoise =
        tickNow - lastNoiseAt < 2300 && noiseDistance <= lastNoiseRadius;

      const nextEnemyMode = decideEnemyState({
        distanceCells: currentRouteDistance,
        hasLure: Boolean(activeLure),
        heardNoise,
        noiseAgeMs: tickNow - lastNoiseAt,
        playerInVent: Boolean(ventTrip),
        lastSeenAgeMs: tickNow - lastSeenAt,
        cctvExposureMs,
        lineOfSight,
      });
      if (nextEnemyMode !== currentEnemyMode) {
        currentEnemyMode = nextEnemyMode;
        setEnemyMode(nextEnemyMode);
      }

      const patrolCells = spread.length ? spread : [exitCell, 0];
      let targetCell: number;
      if (activeLure) {
        targetCell = activeLure.cell;
      } else if (currentEnemyMode === "chase") {
        targetCell = playerCell;
      } else if (
        currentEnemyMode === "vent-watch" ||
        currentEnemyMode === "ambush"
      ) {
        targetCell = ventTrip?.destinationCell ?? playerCell;
      } else if (
        currentEnemyMode === "listen" ||
        currentEnemyMode === "investigate"
      ) {
        targetCell = lastNoiseCell;
      } else if (currentEnemyMode === "search") {
        targetCell = lastSeenCell;
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
      currentEnemySpeed = speeds[currentEnemyMode];
      if (remaining > 0.09) {
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
      if (currentPlayerDistance < 1.08) triggerCaught();

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

    const FIXED_DELTA = 1 / 60;
    const cctvFrustum = new THREE.Frustum();
    const cctvProjection = new THREE.Matrix4();
    const enemyProbe = new THREE.Vector3();
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

    const renderFrame = (now: number) => {
      animation = requestAnimationFrame(renderFrame);
      const delta = Math.min((now - lastRenderTime) / 1000, 0.25);
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
          catchUpSteps < 15
        ) {
          simulationTime += FIXED_DELTA * 1000;
          fixedUpdate(FIXED_DELTA, simulationTime);
          simulationAccumulator -= FIXED_DELTA;
          catchUpSteps += 1;
          fixedSteps += 1;
        }
        if (catchUpSteps === 15) {
          simulationAccumulator = 0;
          droppedCatchUps += 1;
        }
      }
      if (now - lastQaUpdate > 500) {
        mount.dataset.qa = JSON.stringify(qaBridge.snapshot());
        lastQaUpdate = now;
      }

      runtimeEchoes.forEach((echo, index) => {
        if (echo.collected) return;
        echo.mesh.position.y = Math.sin(now * 0.0015 + index) * 0.12;
        echo.mesh.rotation.y += delta * 0.36;
      });
      if (activeLure) {
        activeLure.mesh.position.y = Math.sin(now * 0.005) * 0.12;
        activeLure.mesh.rotation.y += delta * 1.4;
      }

      dust.rotation.y = Math.sin(now * 0.00004) * 0.08;
      if (playing) {
        const gait = now * 0.0065 * (currentEnemySpeed / 1.15);
        if (leftLeg) leftLeg.rotation.x = Math.sin(gait) * 0.38;
        if (rightLeg) {
          rightLeg.rotation.x = Math.sin(gait + Math.PI) * 0.38;
        }
        if (leftArm) {
          leftArm.rotation.x = Math.sin(gait + Math.PI) * 0.24;
        }
        if (rightArm) rightArm.rotation.x = Math.sin(gait) * 0.24;
        if (head) {
          const threatTurn =
            currentEnemyMode === "chase" || currentEnemyMode === "ambush"
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
            currentEnemyMode === "chase"
              ? 0.42 + Math.sin(now * 0.018) * 0.12
              : currentEnemyMode === "listen"
                ? 0.12
                : 0.02;
          jaw.rotation.x +=
            (jawTarget - jaw.rotation.x) * Math.min(1, delta * 10);
        }
        if (subjectHat) {
          const hatLift =
            currentEnemyMode === "ambush"
              ? 0.24
              : currentEnemyMode === "listen"
                ? 0.08
                : 0;
          subjectHat.position.y +=
            (0.77 + hatLift - subjectHat.position.y) *
            Math.min(1, delta * 5);
          subjectHat.rotation.z =
            Math.sin(now * 0.0014) *
            (currentEnemyMode === "ambush" ? 0.24 : 0.025);
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
          selectedCamera.updateWorldMatrix(true, false);
          cctvProjection.multiplyMatrices(
            selectedCamera.projectionMatrix,
            selectedCamera.matrixWorldInverse,
          );
          cctvFrustum.setFromProjectionMatrix(cctvProjection);
          enemyProbe.copy(subject.position).setY(1.4);
          setMotionDetected(
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
          if (closeEcho) setPrompt("E · ESTABILIZAR ECO ESPECTRAL");
          else if (closeVent) setPrompt("E · ENTRAR EN CONDUCTO");
          else if (closeExit) {
            setPrompt("E · ABRIR SALIDA DE EMERGENCIA");
          }
          lastHudUpdate = now;
        }
      }

      {
        const bob =
          playing && playerMoving && !ventTrip
            ? Math.sin(now * 0.011 * (playerSprinting ? 1.45 : 1)) *
              (playerCrouching ? 0.012 : 0.035)
            : 0;
        camera.position.copy(player);
        camera.position.y += bob;
        camera.rotation.set(pitch, yaw, 0);
        camera.fov = 74;
        camera.updateProjectionMatrix();
        flashlight.visible = flashlightEnabled;
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

      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, mount.clientWidth, mount.clientHeight);
      renderer.setClearColor(0x020303, 1);
      renderer.clear();
      if (tabletRef.current && playing) {
        const opticalCamera =
          cctvCameras[cctvIndexRef.current] ?? cctvCameras[0];
        if (now - lastCctvFrame >= 1000 / graphics.cctvFps) {
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
    };

    const walkWindow = window as Window & {
      __M00NQA__?: {
        snapshot: () => Record<string, unknown>;
      };
    };
    const qaBridge = {
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
          enemy: {
            x: subject.position.x,
            z: subject.position.z,
            cell: positionCell(subject.position),
            state: currentEnemyMode,
            routeDistance: currentRouteDistance,
          },
          input: { ...keysRef.current },
          cctv: {
            open: tabletRef.current,
            index: cctvIndexRef.current,
            power: cctvPower,
            width: cctvTarget.width,
            height: cctvTarget.height,
            fps: graphics.cctvFps,
          },
          simulation: {
            fixedSteps,
            droppedCatchUps,
            accumulator: simulationAccumulator,
            paused: simulationPaused,
          },
          renderer: {
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            pixelRatio: adaptivePixelRatio,
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
      window.removeEventListener("pointerup", pointerUp);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
      renderer.dispose();
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
      mount.removeChild(renderer.domElement);
      canvasRef.current = null;
      if (walkWindow.__M00NQA__ === qaBridge) {
        delete walkWindow.__M00NQA__;
      }
      delete mount.dataset.qa;
    };
  }, [quality, seed, setGamePhase]);

  useEffect(() => {
    const system = audioRef.current;
    if (!system) return;
    const now = system.context.currentTime;
    const update = (node: GainNode, value: number) => {
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(value, now, 0.045);
    };
    update(system.master, audioLevels.master);
    update(system.ambience, audioLevels.ambience);
    update(system.music, audioLevels.music);
    update(system.sfx, audioLevels.sfx);
    update(system.heartbeat, audioLevels.heartbeat);
    update(system.jumpscare, audioLevels.jumpscare);
  }, [audioLevels]);

  useEffect(
    () => () => {
      if (!audioRef.current) return;
      audioRef.current.hum.stop();
      audioRef.current.drone.stop();
      audioRef.current.lfo.stop();
      void audioRef.current.context.close();
      audioRef.current = null;
    },
    [],
  );

  const chooseCamera = (index: number) => {
    cctvIndexRef.current = index;
    setCctvIndex(index);
  };

  const setKey = (code: string, active: boolean) => {
    keysRef.current[code] = active;
  };

  const updateAudioLevel = (key: keyof AudioLevels, value: number) => {
    setAudioLevels((levels) => ({ ...levels, [key]: value }));
  };

  return (
    <main className={`walk-game phase-${phase} enemy-${enemyMode}`}>
      <div ref={mountRef} className="walk-stage" aria-label="Laberinto tridimensional M00NW4LK.EXE" />
      <div className="walk-noise" aria-hidden="true" />
      <div className="walk-vignette" aria-hidden="true" />

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
            <span><b>SHIFT</b> CORRER</span>
            <span><b>CTRL</b> AGACHARSE</span>
            <span><b>E</b> INTERACTUAR</span>
            <span><b>G</b> SEÑUELO</span>
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

      {inVent && (
        <div className="vent-overlay" role="status">
          <div className="vent-bars" aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
          </div>
          <strong>CONDUCTO DE MANTENIMIENTO</strong>
          <span>ARRASTRÁNDOTE · NO HAGAS RUIDO</span>
        </div>
      )}

      {tabletOpen && phase === "playing" && (
        <section className="cctv-tablet" aria-label="Red de cámaras del laberinto">
          <div className="tablet-shell">
            <div ref={cctvFeedRef} className="cctv-feed">
              <div className="cctv-scan" />
              <div className="cctv-feed-top">
                <span>● LIVE</span>
                <strong>{cameraNames[cctvIndex]}</strong>
                <span>12:{String(cctvIndex + 1).padStart(2, "0")} AM</span>
              </div>
              <div className="cctv-warning">
                <span>SEÑAL DE MOVIMIENTO</span>
                <b>
                  {motionDetected
                    ? "OBJETO NO IDENTIFICADO"
                    : "SIN ACTIVIDAD"}
                </b>
              </div>
            </div>
            <div className="cctv-panel">
              <div className="cctv-map">
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
                    onClick={() => chooseCamera(index)}
                    style={{
                      left: `${cameraMapPositions[index]?.left ?? 12}%`,
                      top: `${cameraMapPositions[index]?.top ?? 12}%`,
                    }}
                  >
                    C{index + 1}
                  </button>
                ))}
                <i className="map-route route-a" />
                <i className="map-route route-b" />
                <i className="map-route route-c" />
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
              <small>Movimiento inverso · giro cervical · oído sensible</small>
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
          <div className="caught-face" aria-hidden="true">
            <i className="caught-hat" />
            <i className="caught-eye left" />
            <i className="caught-eye right" />
            <b>22</b>
          </div>
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
              onPointerDown={() => setKey("KeyW", true)}
              onPointerUp={() => setKey("KeyW", false)}
              onPointerCancel={() => setKey("KeyW", false)}
              onPointerLeave={() => setKey("KeyW", false)}
            >W</button>
            <button
              type="button"
              onPointerDown={() => setKey("KeyA", true)}
              onPointerUp={() => setKey("KeyA", false)}
              onPointerCancel={() => setKey("KeyA", false)}
              onPointerLeave={() => setKey("KeyA", false)}
            >A</button>
            <button
              type="button"
              onPointerDown={() => setKey("KeyS", true)}
              onPointerUp={() => setKey("KeyS", false)}
              onPointerCancel={() => setKey("KeyS", false)}
              onPointerLeave={() => setKey("KeyS", false)}
            >S</button>
            <button
              type="button"
              onPointerDown={() => setKey("KeyD", true)}
              onPointerUp={() => setKey("KeyD", false)}
              onPointerCancel={() => setKey("KeyD", false)}
              onPointerLeave={() => setKey("KeyD", false)}
            >D</button>
          </div>
          <div className="mobile-actions">
            <button
              type="button"
              onPointerDown={() => setKey("ShiftLeft", true)}
              onPointerUp={() => setKey("ShiftLeft", false)}
              onPointerCancel={() => setKey("ShiftLeft", false)}
              onPointerLeave={() => setKey("ShiftLeft", false)}
            >
              RUN
            </button>
            <button
              type="button"
              onPointerDown={() => setKey("ControlLeft", true)}
              onPointerUp={() => setKey("ControlLeft", false)}
              onPointerCancel={() => setKey("ControlLeft", false)}
              onPointerLeave={() => setKey("ControlLeft", false)}
            >
              CTRL
            </button>
            <button
              type="button"
              onClick={() => {
                if (power <= 0) return;
                tabletRef.current = !tabletRef.current;
                setTabletOpen(tabletRef.current);
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
          </div>
        </div>
      )}
    </main>
  );
}
