"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const MAZE_SIZE = 17;
const CELL_SIZE = 4.2;
const WALL_HEIGHT = 3.8;
const PLAYER_HEIGHT = 1.58;
const PLAYER_RADIUS = 0.34;

type Direction = "n" | "e" | "s" | "w";
type GamePhase = "briefing" | "playing" | "caught" | "escaped";

type MazeCell = {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
};

type RuntimeEcho = {
  mesh: THREE.Group;
  cell: number;
  collected: boolean;
};

type VentTrip = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  startedAt: number;
  duration: number;
};

type ActiveLure = {
  mesh: THREE.Group;
  cell: number;
  expiresAt: number;
};

const directions: Array<[Direction, number, number, Direction]> = [
  ["n", 0, -1, "s"],
  ["e", 1, 0, "w"],
  ["s", 0, 1, "n"],
  ["w", -1, 0, "e"],
];

const cameraNames = [
  "CAM 01 · GALERÍA OESTE",
  "CAM 02 · CUARTO DE FIESTA",
  "CAM 03 · CONDUCTOS",
  "CAM 04 · PASO DE SERVICIO",
  "CAM 05 · ARCHIVO 22",
  "CAM 06 · SALIDA",
];

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createMaze(seed: number) {
  const random = seededRandom(seed);
  const cells: MazeCell[] = Array.from({ length: MAZE_SIZE * MAZE_SIZE }, () => ({
    n: false,
    e: false,
    s: false,
    w: false,
  }));
  const visited = new Set<number>([0]);
  const stack = [0];

  while (stack.length) {
    const current = stack[stack.length - 1];
    const row = Math.floor(current / MAZE_SIZE);
    const column = current % MAZE_SIZE;
    const options = directions
      .map(([direction, dx, dz, opposite]) => ({
        direction,
        opposite,
        column: column + dx,
        row: row + dz,
      }))
      .filter(
        (option) =>
          option.column >= 0 &&
          option.column < MAZE_SIZE &&
          option.row >= 0 &&
          option.row < MAZE_SIZE &&
          !visited.has(option.row * MAZE_SIZE + option.column),
      );

    if (!options.length) {
      stack.pop();
      continue;
    }

    const next = options[Math.floor(random() * options.length)];
    const nextIndex = next.row * MAZE_SIZE + next.column;
    cells[current][next.direction] = true;
    cells[nextIndex][next.opposite] = true;
    visited.add(nextIndex);
    stack.push(nextIndex);
  }

  // A few deliberate loops stop the maze feeling like one perfect tree.
  for (let index = 0; index < MAZE_SIZE * 2; index += 1) {
    const row = 1 + Math.floor(random() * (MAZE_SIZE - 2));
    const column = 1 + Math.floor(random() * (MAZE_SIZE - 2));
    const cellIndex = row * MAZE_SIZE + column;
    if (random() > 0.5) {
      cells[cellIndex].e = true;
      cells[cellIndex + 1].w = true;
    } else {
      cells[cellIndex].s = true;
      cells[cellIndex + MAZE_SIZE].n = true;
    }
  }

  return cells;
}

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
  const half = (MAZE_SIZE * CELL_SIZE) / 2;
  const column = Math.max(
    0,
    Math.min(MAZE_SIZE - 1, Math.floor((position.x + half) / CELL_SIZE)),
  );
  const row = Math.max(
    0,
    Math.min(MAZE_SIZE - 1, Math.floor((position.z + half) / CELL_SIZE)),
  );
  return row * MAZE_SIZE + column;
}

function mazePath(cells: MazeCell[], start: number, target: number) {
  if (start === target) return [start];
  const queue = [start];
  const previous = new Map<number, number>();
  const visited = new Set<number>([start]);

  while (queue.length) {
    const current = queue.shift()!;
    const row = Math.floor(current / MAZE_SIZE);
    const column = current % MAZE_SIZE;
    for (const [direction, dx, dz] of directions) {
      if (!cells[current][direction]) continue;
      const nextRow = row + dz;
      const nextColumn = column + dx;
      const next = nextRow * MAZE_SIZE + nextColumn;
      if (visited.has(next)) continue;
      visited.add(next);
      previous.set(next, current);
      if (next === target) {
        const path = [target];
        let cursor = target;
        while (cursor !== start) {
          cursor = previous.get(cursor)!;
          path.unshift(cursor);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [start];
}

function farthestCell(cells: MazeCell[], start: number) {
  let farthest = start;
  let longest = 0;
  for (let index = 0; index < cells.length; index += 1) {
    const length = mazePath(cells, start, index).length;
    if (length > longest) {
      farthest = index;
      longest = length;
    }
  }
  return farthest;
}

function chooseSpreadCells(cells: MazeCell[], seed: number, count: number) {
  const random = seededRandom(seed * 41 + 22);
  const candidates = cells
    .map((_, index) => index)
    .filter((index) => mazePath(cells, 0, index).length > MAZE_SIZE / 2);
  const chosen: number[] = [];
  while (candidates.length && chosen.length < count) {
    const candidateIndex = Math.floor(random() * candidates.length);
    chosen.push(candidates.splice(candidateIndex, 1)[0]);
  }
  return chosen;
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
  const skin = material(0x8b695f, 0.76, 0.04);
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
  addMesh(headPivot, new THREE.BoxGeometry(0.31, 0.13, 0.08), chrome, [0, 0.06, -0.37]);
  for (let tooth = -2; tooth <= 2; tooth += 1) {
    addMesh(headPivot, new THREE.BoxGeometry(0.035, 0.08, 0.035), white, [tooth * 0.06, 0.06, -0.425]);
  }

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
  const light = new THREE.PointLight(color, 1.25, 4);
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
  const audioRef = useRef<{
    context: AudioContext;
    hum: OscillatorNode;
    humGain: GainNode;
  } | null>(null);
  const [phase, setPhase] = useState<GamePhase>("briefing");
  const [seed, setSeed] = useState(220722);
  const [echoes, setEchoes] = useState(0);
  const [bpm, setBpm] = useState(48);
  const [distance, setDistance] = useState(99);
  const [sector, setSector] = useState("A-01");
  const [tabletOpen, setTabletOpen] = useState(false);
  const [cctvIndex, setCctvIndex] = useState(0);
  const [power, setPower] = useState(96);
  const [inVent, setInVent] = useState(false);
  const [pointerHelp, setPointerHelp] = useState(false);
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
    const hum = context.createOscillator();
    const humGain = context.createGain();
    hum.type = "sawtooth";
    hum.frequency.value = 42;
    humGain.gain.value = 0.011;
    hum.connect(humGain);
    humGain.connect(context.destination);
    hum.start();
    audioRef.current = { context, hum, humGain };
  }, []);

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
      void canvas.requestPointerLock().catch(() => setPointerHelp(true));
    } catch {
      setPointerHelp(true);
    }
  }, []);

  const beginGame = useCallback(() => {
    startAudio();
    setGamePhase("playing");
    setPointerHelp(false);
    setMessage("Encuentra la puerta de emergencia. TAB abre la red CCTV.");
    // Pointer lock must be requested synchronously inside the user's click.
    requestControl();
  }, [requestControl, setGamePhase, startAudio]);

  const restart = useCallback(() => {
    document.exitPointerLock?.();
    setEchoes(0);
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
    const random = seededRandom(seed * 7 + 22);
    const exitCell = farthestCell(maze, 0);
    const spread = chooseSpreadCells(maze, seed, 14);
    const enemyStart = spread[0] ?? exitCell;
    const echoCells = spread.slice(1, 8);
    const ventCells = spread.slice(8, 12);
    const cctvCells = [0, ...spread.slice(2, 6), exitCell].slice(0, 6);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020303);
    scene.fog = new THREE.FogExp2(0x020303, 0.092);

    const camera = new THREE.PerspectiveCamera(
      74,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.05,
      90,
    );
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.72;
    renderer.domElement.className = "walk-canvas";
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    const start = cellCenter(0);
    const player = new THREE.Vector3(start.x, PLAYER_HEIGHT, start.z);
    let yaw = Math.PI;
    let pitch = 0;
    let echoesHeld = 0;
    let nextHeartbeat = 0;
    let nextFootstep = 0;
    let nextPathUpdate = 0;
    let lastHudUpdate = 0;
    let cctvPower = 96;
    let lastPowerUpdate = performance.now();
    let enemyPath = mazePath(maze, enemyStart, 0);
    let ventTrip: VentTrip | null = null;
    let activeLure: ActiveLure | null = null;
    let flashlightEnabled = true;
    let caught = false;
    let escaped = false;

    const world = new THREE.Group();
    scene.add(world);
    scene.add(new THREE.HemisphereLight(0x82908d, 0x080808, 0.32));
    const emergencyLight = new THREE.DirectionalLight(0x6d7d77, 0.25);
    emergencyLight.position.set(4, 12, 2);
    scene.add(emergencyLight);

    const concrete = new THREE.MeshStandardMaterial({
      color: 0x171a18,
      roughness: 0.92,
      metalness: 0.05,
      bumpScale: 0.3,
    });
    const dampConcrete = new THREE.MeshStandardMaterial({
      color: 0x0b0f0d,
      roughness: 0.82,
      metalness: 0.18,
    });
    const metal = material(0x282d2c, 0.36, 0.88);
    const half = (MAZE_SIZE * CELL_SIZE) / 2;

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

    const horizontalWall = new THREE.BoxGeometry(CELL_SIZE + 0.18, WALL_HEIGHT, 0.22);
    const verticalWall = new THREE.BoxGeometry(0.22, WALL_HEIGHT, CELL_SIZE + 0.18);
    const wallEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, 0.23));
    const edgeSurface = new THREE.LineBasicMaterial({ color: 0x29332e, transparent: true, opacity: 0.3 });

    maze.forEach((cell, index) => {
      const center = cellCenter(index);
      const row = Math.floor(index / MAZE_SIZE);
      const column = index % MAZE_SIZE;
      const placeWall = (geometry: THREE.BufferGeometry, x: number, z: number) => {
        const wall = addMesh(world, geometry, concrete, [x, WALL_HEIGHT / 2, z]);
        wall.castShadow = false;
        wall.receiveShadow = true;
      };
      if (!cell.n) placeWall(horizontalWall, center.x, center.z - CELL_SIZE / 2);
      if (!cell.w) placeWall(verticalWall, center.x - CELL_SIZE / 2, center.z);
      if (row === MAZE_SIZE - 1 && !cell.s) {
        placeWall(horizontalWall, center.x, center.z + CELL_SIZE / 2);
      }
      if (column === MAZE_SIZE - 1 && !cell.e) {
        placeWall(verticalWall, center.x + CELL_SIZE / 2, center.z);
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

      if (index % 23 === 0) {
        const lampSurface = new THREE.MeshStandardMaterial({
          color: 0x8f9381,
          emissive: random() > 0.3 ? 0xb3c2a1 : 0x2a1010,
          emissiveIntensity: 1.8,
        });
        addMesh(world, new THREE.BoxGeometry(0.16, 0.08, 1.15), lampSurface, [center.x, 3.69, center.z]);
        const light = new THREE.PointLight(
          random() > 0.25 ? 0xa9b7a0 : 0xc01b17,
          1.05,
          8,
          2.1,
        );
        light.position.set(center.x, 3.5, center.z);
        light.castShadow = index % 46 === 0;
        scene.add(light);
      }
    });

    // Physical surveillance cameras make the maze itself part of the CCTV network.
    cctvCells.forEach((cellIndex, index) => {
      const center = cellCenter(cellIndex);
      const securityCamera = createSecurityCamera();
      securityCamera.position.set(center.x + 1.45, 3.05, center.z + 1.45);
      securityCamera.rotation.set(-0.24, Math.PI * (0.25 + (index % 2)), 0);
      world.add(securityCamera);
    });

    const exit = createExitDoor();
    const exitPosition = cellCenter(exitCell);
    exit.position.copy(exitPosition);
    exit.position.y = 0;
    exit.rotation.y = Math.PI;
    world.add(exit);
    const exitLight = new THREE.PointLight(0xff1717, 2.5, 8);
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

    const subject = createSubjectM();
    const enemyPosition = cellCenter(enemyStart);
    subject.position.set(enemyPosition.x, 0, enemyPosition.z);
    world.add(subject);
    const head = subject.getObjectByName("head");
    const leftLeg = subject.getObjectByName("legLeft");
    const rightLeg = subject.getObjectByName("legRight");
    const leftArm = subject.getObjectByName("armLeft");
    const rightArm = subject.getObjectByName("armRight");

    const flashlight = new THREE.SpotLight(0xe8f4e9, 5.2, 16, Math.PI / 6.5, 0.55, 1.4);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(512, 512);
    camera.add(flashlight);
    flashlight.position.set(0, -0.1, 0);
    flashlight.target.position.set(0, -0.1, -1);
    camera.add(flashlight.target);
    scene.add(camera);

    const cctvViews = cctvCells.map((cell, index) => {
      const center = cellCenter(cell);
      const nextCell = mazePath(maze, cell, exitCell)[1] ?? cell;
      const target = cellCenter(nextCell);
      return {
        position: center.clone().add(new THREE.Vector3(index % 2 ? -1.3 : 1.3, 2.85, index % 2 ? 1.3 : -1.3)),
        target: target.clone().setY(1.2),
      };
    });

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
        gain.connect(system.context.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
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
      gain.connect(system.context.destination);
      osc.start();
      osc.stop(now + 0.12);
    };

    const triggerCaught = () => {
      if (caught || escaped) return;
      caught = true;
      document.exitPointerLock?.();
      setMessage("SUJETO M ha interceptado la señal.");
      setGamePhase("caught");
      const scream = new Audio("/audio/fnaf-jumpscare-scream.mp3");
      scream.volume = 0.58;
      scream.playbackRate = 0.78;
      void scream.play();
    };

    const tryMoveAxis = (axis: "x" | "z", delta: number) => {
      if (!delta) return;
      const currentCell = positionCell(player);
      const row = Math.floor(currentCell / MAZE_SIZE);
      const column = currentCell % MAZE_SIZE;
      const next = player.clone();
      next[axis] += delta;
      const nextCell = positionCell(next);

      if (nextCell !== currentCell) {
        const nextRow = Math.floor(nextCell / MAZE_SIZE);
        const nextColumn = nextCell % MAZE_SIZE;
        let allowed = false;
        if (nextColumn > column) allowed = maze[currentCell].e;
        if (nextColumn < column) allowed = maze[currentCell].w;
        if (nextRow > row) allowed = maze[currentCell].s;
        if (nextRow < row) allowed = maze[currentCell].n;
        if (!allowed) return;
      }

      const center = cellCenter(positionCell(next));
      const localX = Math.abs(next.x - center.x);
      const localZ = Math.abs(next.z - center.z);
      if (
        localX > CELL_SIZE / 2 - PLAYER_RADIUS ||
        localZ > CELL_SIZE / 2 - PLAYER_RADIUS
      ) {
        const candidateCell = positionCell(next);
        const candidate = maze[candidateCell];
        if (axis === "x" && localZ > CELL_SIZE / 2 - PLAYER_RADIUS) {
          const towardSouth = next.z > center.z;
          if (!(towardSouth ? candidate.s : candidate.n)) return;
        }
        if (axis === "z" && localX > CELL_SIZE / 2 - PLAYER_RADIUS) {
          const towardEast = next.x > center.x;
          if (!(towardEast ? candidate.e : candidate.w)) return;
        }
      }
      player[axis] = next[axis];
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
        ventTrip = {
          from: player.clone(),
          to: destination.clone().setY(0.72),
          startedAt: now,
          duration: 3300,
        };
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

    const keyDown = (event: KeyboardEvent) => {
      keysRef.current[event.code] = true;
      if (event.code === "KeyE") interactQueuedRef.current = true;
      if (event.code === "KeyG") dropQueuedRef.current = true;
      if (event.code === "Tab" && phaseRef.current === "playing" && cctvPower > 0) {
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
              .catch(() => setPointerHelp(true));
          } catch {
            setPointerHelp(true);
          }
        }
      }
      if (event.code === "KeyF") {
        flashlightEnabled = !flashlightEnabled;
        flashlight.visible = flashlightEnabled;
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };
    const mouseMove = (event: MouseEvent) => {
      if (
        document.pointerLockElement !== renderer.domElement ||
        tabletRef.current ||
        phaseRef.current !== "playing"
      ) {
        return;
      }
      yaw -= event.movementX * 0.0021;
      pitch -= event.movementY * 0.0018;
      pitch = Math.max(-1.02, Math.min(1.02, pitch));
    };
    const canvasClick = () => {
      if (phaseRef.current === "playing" && !tabletRef.current) {
        renderer.domElement.focus({ preventScroll: true });
        try {
          void renderer.domElement
            .requestPointerLock()
            .catch(() => setPointerHelp(true));
        } catch {
          setPointerHelp(true);
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
    const pointerLockError = () => setPointerHelp(true);

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("pointerlockchange", pointerLockChange);
    document.addEventListener("pointerlockerror", pointerLockError);
    renderer.domElement.addEventListener("click", canvasClick);

    const resize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const clock = new THREE.Clock();
    let frame = 0;
    let animation = 0;

    const renderFrame = (now: number) => {
      animation = requestAnimationFrame(renderFrame);
      const delta = Math.min(clock.getDelta(), 0.035);
      const playing = phaseRef.current === "playing";

      runtimeEchoes.forEach((echo, index) => {
        if (echo.collected) return;
        echo.mesh.position.y = Math.sin(now * 0.0015 + index) * 0.12;
        echo.mesh.rotation.y += delta * 0.36;
      });
      if (activeLure) {
        activeLure.mesh.position.y = Math.sin(now * 0.005) * 0.12;
        activeLure.mesh.rotation.y += delta * 1.4;
        if (now >= activeLure.expiresAt) {
          world.remove(activeLure.mesh);
          activeLure = null;
          setPrompt("La proyección se ha desvanecido.");
        }
      }

      if (playing && !tabletRef.current) {
        if (ventTrip) {
          const progress = Math.min(1, (now - ventTrip.startedAt) / ventTrip.duration);
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          player.lerpVectors(ventTrip.from, ventTrip.to, eased);
          player.y = 0.68 + Math.sin(progress * Math.PI * 8) * 0.045;
          yaw += delta * 0.08;
          if (progress >= 1) {
            player.copy(ventTrip.to);
            player.y = PLAYER_HEIGHT;
            ventTrip = null;
            setInVent(false);
            setPrompt("Has salido al otro lado. Algo ha oído la rejilla.");
          }
        } else {
          const forward = Number(keysRef.current.KeyW || keysRef.current.ArrowUp) -
            Number(keysRef.current.KeyS || keysRef.current.ArrowDown);
          const strafe = Number(keysRef.current.KeyD || keysRef.current.ArrowRight) -
            Number(keysRef.current.KeyA || keysRef.current.ArrowLeft);
          const moving = forward !== 0 || strafe !== 0;
          const sprinting = Boolean(keysRef.current.ShiftLeft || keysRef.current.ShiftRight);
          const speed = sprinting ? 3.75 : 2.35;
          if (moving) {
            const length = Math.hypot(forward, strafe) || 1;
            const forwardX = -Math.sin(yaw);
            const forwardZ = -Math.cos(yaw);
            const rightX = Math.cos(yaw);
            const rightZ = -Math.sin(yaw);
            const moveX = ((forward / length) * forwardX + (strafe / length) * rightX) * speed * delta;
            const moveZ = ((forward / length) * forwardZ + (strafe / length) * rightZ) * speed * delta;
            tryMoveAxis("x", moveX);
            tryMoveAxis("z", moveZ);
            player.y = PLAYER_HEIGHT + Math.sin(now * 0.011 * (sprinting ? 1.45 : 1)) * 0.035;
            if (now > nextFootstep) {
              playStep();
              nextFootstep = now + (sprinting ? 315 : 510);
            }
          } else {
            player.y += (PLAYER_HEIGHT - player.y) * 0.12;
          }
        }

        if (interactQueuedRef.current) {
          interactQueuedRef.current = false;
          interact(now);
        }
        if (dropQueuedRef.current) {
          dropQueuedRef.current = false;
          dropEcho(now);
        }
      }

      if (playing && !ventTrip) {
        const enemyCell = positionCell(subject.position);
        const targetCell = activeLure ? activeLure.cell : positionCell(player);
        if (now >= nextPathUpdate || enemyPath[enemyPath.length - 1] !== targetCell) {
          enemyPath = mazePath(maze, enemyCell, targetCell);
          nextPathUpdate = now + 420;
        }
        const nextCell = enemyPath[1] ?? targetCell;
        const enemyTarget = cellCenter(nextCell);
        const direction = enemyTarget.sub(subject.position);
        direction.y = 0;
        const remaining = direction.length();
        const playerDistance = subject.position.distanceTo(player.clone().setY(0));
        const speed = activeLure ? 1.58 : playerDistance < 12 ? 2.05 : 1.15;
        if (remaining > 0.09) {
          direction.normalize();
          subject.position.addScaledVector(direction, Math.min(remaining, speed * delta));
          // The body faces away from its direction of travel: a mechanical moonwalk.
          const targetYaw = Math.atan2(direction.x, direction.z) + Math.PI;
          subject.rotation.y += Math.atan2(
            Math.sin(targetYaw - subject.rotation.y),
            Math.cos(targetYaw - subject.rotation.y),
          ) * Math.min(1, delta * 4);
        }

        const gait = now * 0.0065 * (speed / 1.15);
        if (leftLeg) leftLeg.rotation.x = Math.sin(gait) * 0.38;
        if (rightLeg) rightLeg.rotation.x = Math.sin(gait + Math.PI) * 0.38;
        if (leftArm) leftArm.rotation.x = Math.sin(gait + Math.PI) * 0.24;
        if (rightArm) rightArm.rotation.x = Math.sin(gait) * 0.24;
        if (head) {
          const turn = THREE.MathUtils.clamp(1 - playerDistance / 8, 0, 1);
          head.rotation.y = Math.PI * turn;
          head.rotation.z = Math.sin(now * 0.002) * 0.1 * turn;
        }

        if (activeLure && subject.position.distanceTo(activeLure.mesh.position) < 1.25) {
          nextPathUpdate = now + 1600;
          subject.rotation.y += Math.sin(now * 0.02) * 0.04;
        }

        if (playerDistance < 1.08 && !tabletRef.current) triggerCaught();

        const routeDistance = mazePath(maze, enemyCell, positionCell(player)).length;
        const currentBpm = Math.round(
          THREE.MathUtils.clamp(42 + (20 - Math.min(routeDistance, 20)) * 6.2, 42, 166),
        );
        if (now >= nextHeartbeat && !tabletRef.current) {
          playPulse(0.025 + (currentBpm - 42) / 610);
          nextHeartbeat = now + 60000 / currentBpm;
        }

        if (now - lastHudUpdate > 160) {
          const currentCell = positionCell(player);
          const row = Math.floor(currentCell / MAZE_SIZE);
          const column = currentCell % MAZE_SIZE;
          setDistance(Math.max(1, Math.round(playerDistance)));
          setBpm(currentBpm);
          setSector(`${String.fromCharCode(65 + Math.floor(row / 4))}-${String(column + 1).padStart(2, "0")}`);

          const closeEcho = runtimeEchoes.some(
            (echo) =>
              !echo.collected &&
              echo.mesh.position.distanceTo(player.clone().setY(0)) < 1.5,
          );
          const closeVent = ventMeshes.some(
            (vent) =>
              vent.userData.cell === currentCell &&
              vent.position.distanceTo(player.clone().setY(vent.position.y)) < 2.15,
          );
          const closeExit = cellCenter(exitCell).distanceTo(player.clone().setY(0)) < 1.55;
          if (closeEcho) setPrompt("E · ESTABILIZAR ECO ESPECTRAL");
          else if (closeVent) setPrompt("E · ENTRAR EN CONDUCTO");
          else if (closeExit) setPrompt("E · ABRIR SALIDA DE EMERGENCIA");
          lastHudUpdate = now;
        }
      }

      if (tabletRef.current && playing) {
        const view = cctvViews[cctvIndexRef.current] ?? cctvViews[0];
        camera.position.copy(view.position);
        camera.lookAt(view.target);
        flashlight.visible = false;
        if (now - lastPowerUpdate > 1000) {
          cctvPower = Math.max(0, cctvPower - 1);
          lastPowerUpdate = now;
          setPower(cctvPower);
          if (cctvPower <= 0) {
            tabletRef.current = false;
            setTabletOpen(false);
            setPrompt("SIN ENERGÍA · red CCTV desconectada.");
          }
        }
      } else {
        camera.position.copy(player);
        camera.rotation.set(pitch, yaw, 0);
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
      emergencyLight.intensity = frame % 217 < 5 ? 0.03 : 0.25;
      renderer.render(scene, camera);
    };

    renderFrame(performance.now());

    return () => {
      cancelAnimationFrame(animation);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("pointerlockchange", pointerLockChange);
      document.removeEventListener("pointerlockerror", pointerLockError);
      renderer.domElement.removeEventListener("click", canvasClick);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
      renderer.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((item) => item.dispose());
      });
      mount.removeChild(renderer.domElement);
      canvasRef.current = null;
    };
  }, [seed, setGamePhase]);

  useEffect(
    () => () => {
      if (!audioRef.current) return;
      audioRef.current.hum.stop();
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

  return (
    <main className={`walk-game phase-${phase}`}>
      <div ref={mountRef} className="walk-stage" aria-label="Laberinto tridimensional M00NW4LK.EXE" />
      <div className="walk-noise" aria-hidden="true" />
      <div className="walk-vignette" aria-hidden="true" />

      <header className="walk-topbar">
        <a href="/" className="walk-back">← PREMIERE 22</a>
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
              <span>CONTROL SIN CAPTURAR</span>
              HAZ CLIC AQUÍ PARA ACTIVAR RATÓN + WASD
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
            <div className="cctv-feed">
              <div className="cctv-scan" />
              <div className="cctv-feed-top">
                <span>● LIVE</span>
                <strong>{cameraNames[cctvIndex]}</strong>
                <span>12:{String(cctvIndex + 1).padStart(2, "0")} AM</span>
              </div>
              <div className="cctv-warning">
                <span>SEÑAL DE MOVIMIENTO</span>
                <b>{distance < 12 ? "OBJETO NO IDENTIFICADO" : "SIN ACTIVIDAD"}</b>
              </div>
            </div>
            <div className="cctv-panel">
              <div className="cctv-map">
                <span className="map-office">YOU</span>
                {cameraNames.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    className={cctvIndex === index ? "active" : ""}
                    onClick={() => chooseCamera(index)}
                    style={{
                      left: `${12 + ((index * 29) % 68)}%`,
                      top: `${12 + ((index * 41) % 68)}%`,
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
          <a href="/">ABANDONAR ARCHIVO</a>
        </section>
      )}

      {phase === "escaped" && (
        <section className="game-overlay result escaped">
          <span className="result-code">SALIDA_DE_EMERGENCIA_ABIERTA</span>
          <h2>HAS SALIDO.<br /><strong>ÉL TAMBIÉN.</strong></h2>
          <p>{message}</p>
          <button type="button" onClick={restart}>ENTRAR EN OTRA RUTA</button>
          <a href="/">VOLVER A LA PREMIERE</a>
        </section>
      )}

      {phase === "playing" && (
        <div className="mobile-controls" aria-label="Controles táctiles">
          <div className="mobile-pad">
            <button
              type="button"
              onPointerDown={() => setKey("KeyW", true)}
              onPointerUp={() => setKey("KeyW", false)}
              onPointerLeave={() => setKey("KeyW", false)}
            >W</button>
            <button
              type="button"
              onPointerDown={() => setKey("KeyA", true)}
              onPointerUp={() => setKey("KeyA", false)}
              onPointerLeave={() => setKey("KeyA", false)}
            >A</button>
            <button
              type="button"
              onPointerDown={() => setKey("KeyS", true)}
              onPointerUp={() => setKey("KeyS", false)}
              onPointerLeave={() => setKey("KeyS", false)}
            >S</button>
            <button
              type="button"
              onPointerDown={() => setKey("KeyD", true)}
              onPointerUp={() => setKey("KeyD", false)}
              onPointerLeave={() => setKey("KeyD", false)}
            >D</button>
          </div>
          <button type="button" onClick={() => { interactQueuedRef.current = true; }}>E</button>
          <button type="button" onClick={() => { dropQueuedRef.current = true; }}>G</button>
        </div>
      )}
    </main>
  );
}
