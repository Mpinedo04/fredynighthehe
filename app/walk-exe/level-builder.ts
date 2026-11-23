import * as THREE from "three";
import {
  CELL_SIZE,
  cellCenter2D,
  type MazeCell,
} from "./game-core";
import type { VirtualLightSource } from "./light-pool";
import {
  STUDIO_WINGS,
  type StudioEggId,
  type StudioLayout,
} from "./studio-layout";

export type RuntimeStudioEgg = {
  id: StudioEggId;
  cell: number;
  mesh: THREE.Group;
  position: THREE.Vector3;
  used: boolean;
  reusable: boolean;
  cooldownUntil: number;
};

export type BuiltStudioEnvironment = {
  decorGroups: THREE.Group[];
  eggs: RuntimeStudioEgg[];
  virtualLights: VirtualLightSource[];
  animatedFlames: THREE.Mesh[];
  waterGlassRipples: THREE.Mesh | null;
  deskFanBlades: THREE.Object3D | null;
  neverlandTiles: THREE.MeshStandardMaterial[];
  dispose: () => void;
};

function makeMat(
  color: THREE.ColorRepresentation,
  roughness = 0.72,
  metalness = 0.14,
  emissive?: THREE.ColorRepresentation,
  emissiveIntensity = 0,
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    ...(emissive !== undefined ? { emissive, emissiveIntensity } : {}),
  });
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

function createSignTexture(
  kicker: string,
  title: string,
  subtitle: string,
  accent: string,
  bg = "#0a0c10",
  extra?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 236);

    if (extra) extra(ctx, 512, 256);

    ctx.fillStyle = accent;
    ctx.font = "bold 22px monospace";
    ctx.fillText(kicker, 30, 54);

    ctx.fillStyle = "#f2f4f0";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText(title, 30, 128);

    ctx.fillStyle = "#a2aca6";
    ctx.font = "20px monospace";
    ctx.fillText(subtitle, 30, 186);

    // Subtle analog scanlines
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < 256; y += 6) {
      ctx.fillRect(0, y, 512, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoseWindowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#08050d";
    ctx.fillRect(0, 0, 256, 256);
    const cx = 128;
    const cy = 128;
    for (let i = 0; i < 12; i += 1) {
      const a0 = (i / 12) * Math.PI * 2;
      const a1 = ((i + 1) / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 114, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i % 3 === 0 ? "#7a1632" : i % 3 === 1 ? "#4b1f82" : "#b88628";
      ctx.fill();
      ctx.strokeStyle = "#07050a";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fillStyle = "#160a24";
    ctx.fill();
    ctx.strokeStyle = "#e8b84d";
    ctx.lineWidth = 5;
    ctx.stroke();

    // Cross motif
    ctx.fillStyle = "#e8b84d";
    ctx.fillRect(cx - 5, cy - 34, 10, 68);
    ctx.fillRect(cx - 24, cy - 10, 48, 9);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Finds a closed wall direction inside a cell so signs/altars mount cleanly without blocking doors. */
function wallMountOffset(cell: MazeCell) {
  const wallDist = CELL_SIZE / 2 - 0.17;
  if (!cell.n) return { x: 0, z: -wallDist, rotY: 0 };
  if (!cell.s) return { x: 0, z: wallDist, rotY: Math.PI };
  if (!cell.e) return { x: wallDist, z: 0, rotY: -Math.PI / 2 };
  if (!cell.w) return { x: -wallDist, z: 0, rotY: Math.PI / 2 };
  return { x: 0, z: -wallDist + 0.5, rotY: 0 };
}

/**
 * Builds the 5 themed horror wings + Starting Projection Booth + 5 interactive
 * easter egg set pieces with ZERO individual PointLights (all lights feed the
 * 3-light pool for steady 60 FPS).
 */
export function buildThemedStudio(
  world: THREE.Group,
  maze: readonly MazeCell[],
  layout: StudioLayout,
): BuiltStudioEnvironment {
  const textures: THREE.Texture[] = [];
  const decorGroups: THREE.Group[] = [];
  const eggs: RuntimeStudioEgg[] = [];
  const virtualLights: VirtualLightSource[] = [];
  const animatedFlames: THREE.Mesh[] = [];
  const neverlandTiles: THREE.MeshStandardMaterial[] = [];
  let waterGlassRipples: THREE.Mesh | null = null;
  let deskFanBlades: THREE.Object3D | null = null;

  const steel = makeMat(0x22272a, 0.4, 0.82);
  const darkWood = makeMat(0x241712, 0.8, 0.08);
  const obsidian = makeMat(0x110c18, 0.35, 0.45);
  const gold = makeMat(0xe5b85c, 0.28, 0.8, 0xc98a22, 0.85);
  const crimsonGlow = makeMat(0x4a0812, 0.3, 0.2, 0xff1e38, 2.2);
  const greenGlow = makeMat(0x0b2615, 0.3, 0.2, 0x3eff86, 1.8);
  const violetGlow = makeMat(0x2a104a, 0.3, 0.2, 0xb566ff, 1.9);
  const amberGlow = makeMat(0x3a2006, 0.3, 0.2, 0xffaa33, 2.0);
  const blueGlow = makeMat(0x0c2142, 0.28, 0.2, 0x5aaeff, 1.8);

  const cellPos = (cellIndex: number) => {
    const c = cellCenter2D(cellIndex, layout.size, CELL_SIZE);
    return new THREE.Vector3(c.x, 0, c.z);
  };

  const mountSign = (
    room: THREE.Group,
    cell: MazeCell,
    kicker: string,
    title: string,
    subtitle: string,
    accent: string,
    extra?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ) => {
    const tex = createSignTexture(kicker, title, subtitle, accent, "#080a0e", extra);
    textures.push(tex);
    const mount = wallMountOffset(cell);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 1.05),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    sign.position.set(mount.x, 2.25, mount.z);
    sign.rotation.y = mount.rotY;
    room.add(sign);
    return mount;
  };

  // ── 0. PROJECTION BOOTH (START) ─────────────────────────────────────────
  {
    const center = cellPos(layout.boothCell);
    const room = new THREE.Group();
    room.position.copy(center);
    mountSign(
      room,
      maze[layout.boothCell],
      "CABINA 00 · 02:22 AM",
      "ESTUDIOS PLATÓ 22",
      "RECUPERA 3 CINTAS · NO HAGAS RUIDO",
      "#94c2a3",
    );
    // Vintage 35mm projector silhouette in corner
    addBox(room, 0.65, 1.0, 0.55, steel, [-1.35, 0.5, -1.3]);
    addBox(room, 0.42, 0.36, 0.55, obsidian, [-1.35, 1.18, -1.3]);
    const reelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 14);
    const reel1 = new THREE.Mesh(reelGeo, gold);
    reel1.position.set(-1.35, 1.54, -1.45);
    reel1.rotation.z = Math.PI / 2;
    room.add(reel1);
    const reel2 = new THREE.Mesh(reelGeo, steel);
    reel2.position.set(-1.35, 1.54, -1.12);
    reel2.rotation.z = Math.PI / 2;
    room.add(reel2);
    // Overhead illuminated corridor marquee right ahead of spawn
    const openEast = Boolean(maze[layout.boothCell]?.e);
    const marqueeTex = createSignTexture(
      "PLATÓ 22 · ACCESO DE SERVICIO",
      "02:22 AM · SILENCIO",
      "SIGUE EL RASTREADOR VHS",
      "#94c2a3",
      "#070b0a",
    );
    textures.push(marqueeTex);
    const marqueeGeo = new THREE.PlaneGeometry(1.9, 0.56);
    const marqueeMat = new THREE.MeshBasicMaterial({ map: marqueeTex, side: THREE.FrontSide });
    const marqueeGroup = new THREE.Group();
    const frontFace = new THREE.Mesh(marqueeGeo, marqueeMat);
    frontFace.position.z = 0.025;
    const backFace = new THREE.Mesh(marqueeGeo, marqueeMat);
    backFace.position.z = -0.025;
    backFace.rotation.y = Math.PI;
    marqueeGroup.add(frontFace, backFace);
    if (openEast) {
      marqueeGroup.position.set(1.65, 3.05, 0);
      marqueeGroup.rotation.y = -Math.PI / 2;
    } else {
      marqueeGroup.position.set(0, 3.05, 1.65);
      marqueeGroup.rotation.y = Math.PI;
    }
    room.add(marqueeGroup);
    world.add(room);
    decorGroups.push(room);
    virtualLights.push({
      id: "wing-booth",
      x: center.x,
      y: 3.1,
      z: center.z,
      color: STUDIO_WINGS.booth.accentHex,
      intensity: 14,
      distance: 11,
      priority: 1.1,
    });
  }

  // ── 1. PLATÓ NEVERLAND (MJ HORROR) ──────────────────────────────────────
  {
    const cell = layout.wingCenters.neverland;
    const center = cellPos(cell);
    const room = new THREE.Group();
    room.position.copy(center);
    mountSign(
      room,
      maze[cell],
      "ALA 01 · TOMA 19",
      "PLATÓ NEVERLAND",
      "SI CAMINA HACIA ATRÁS, CORRE",
      "#5ca4ff",
    );
    // Illuminated checkered Billie Jean horror tiles
    const tileGeo = new THREE.PlaneGeometry(0.76, 0.76);
    for (let gx = -1; gx <= 1; gx += 1) {
      for (let gz = -1; gz <= 1; gz += 1) {
        const isLit = (gx + gz) % 2 === 0;
        const tileMat = isLit
          ? makeMat(0x162944, 0.25, 0.2, 0x3f8cff, 0.75)
          : makeMat(0x0a0c10, 0.85, 0.1);
        if (isLit) neverlandTiles.push(tileMat);
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(gx * 0.82, 0.02, gz * 0.82);
        room.add(tile);
      }
    }
    // Vitrine Easter Egg: Lone crystal glove + dark fedora under glass
    const eggGroup = new THREE.Group();
    eggGroup.position.set(center.x, 0, center.z);
    addBox(eggGroup, 0.72, 0.92, 0.72, obsidian, [0, 0.46, 0]);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.68, 0.66),
      new THREE.MeshBasicMaterial({
        color: 0x7ec2ff,
        transparent: true,
        opacity: 0.18,
        wireframe: false,
      }),
    );
    glass.position.y = 1.26;
    eggGroup.add(glass);
    // Glowing crystal glove silhouette inside
    const glove = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.34, 0.1),
      makeMat(0xf5f7ff, 0.15, 0.7, 0x99ccff, 1.5),
    );
    glove.position.set(0, 1.15, 0);
    glove.rotation.z = -0.18;
    eggGroup.add(glove);
    // Glowing blue base rim
    addBox(eggGroup, 0.78, 0.05, 0.78, blueGlow, [0, 0.93, 0]);
    world.add(eggGroup);
    world.add(room);
    decorGroups.push(room);
    eggs.push({
      id: "neverland-vitrine",
      cell,
      mesh: eggGroup,
      position: center.clone(),
      used: false,
      reusable: false,
      cooldownUntil: 0,
    });
    virtualLights.push({
      id: "wing-neverland",
      x: center.x,
      y: 3.0,
      z: center.z,
      color: 0x5ca4ff,
      intensity: 16,
      distance: 11,
      priority: 1.25,
    });
  }

  // ── 2. CRIPTA DEL CLERO · GHOST (1969 OCCULT HORROR) ────────────────────
  {
    const cell = layout.wingCenters.crypt;
    const center = cellPos(cell);
    const room = new THREE.Group();
    room.position.copy(center);
    const mount = wallMountOffset(maze[cell]);
    // Glowing stained-glass gothic rose window on the wall!
    const roseTex = createRoseWindowTexture();
    textures.push(roseTex);
    const roseMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 24),
      new THREE.MeshBasicMaterial({ map: roseTex }),
    );
    roseMesh.position.set(mount.x, 2.3, mount.z);
    roseMesh.rotation.y = mount.rotY;
    room.add(roseMesh);

    // Obsidian altar + 3 flickering candles + 7-inch 1969 vinyl
    const eggGroup = new THREE.Group();
    eggGroup.position.set(center.x, 0, center.z);
    addBox(eggGroup, 1.35, 0.86, 0.68, obsidian, [0, 0.43, 0]);
    addBox(eggGroup, 1.42, 0.06, 0.74, gold, [0, 0.88, 0]);
    const candleGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.34, 8);
    const waxMat = makeMat(0xddd2be, 0.85, 0.02);
    const flameGeo = new THREE.ConeGeometry(0.045, 0.14, 7);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc855 });
    [-0.48, 0.48, 0.34].forEach((offsetX, idx) => {
      const zOff = idx === 2 ? -0.18 : 0.14;
      const candle = new THREE.Mesh(candleGeo, waxMat);
      candle.position.set(offsetX, 1.07, zOff);
      eggGroup.add(candle);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(offsetX, 1.31, zOff);
      eggGroup.add(flame);
      animatedFlames.push(flame);
    });
    // Floating 7" Vinyl: Seven Inches of Satanic Panic (1969)
    const vinylBody = new THREE.Group();
    vinylBody.position.y = 1.35;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.028, 22),
      obsidian,
    );
    disc.rotation.x = Math.PI / 2;
    vinylBody.add(disc);
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.036, 16),
      gold,
    );
    label.rotation.x = Math.PI / 2;
    vinylBody.add(label);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.41, 0.02, 6, 22),
      violetGlow,
    );
    vinylBody.add(ring);
    eggGroup.add(vinylBody);
    eggGroup.userData.spinBody = vinylBody;

    world.add(eggGroup);
    world.add(room);
    decorGroups.push(room);
    eggs.push({
      id: "ghost-vinyl",
      cell,
      mesh: eggGroup,
      position: center.clone(),
      used: false,
      reusable: false,
      cooldownUntil: 0,
    });
    virtualLights.push({
      id: "wing-crypt",
      x: center.x,
      y: 2.8,
      z: center.z,
      color: 0xb76bff,
      intensity: 18,
      distance: 12,
      priority: 1.4,
    });
  }

  // ── 3. CÁMARA ACÚSTICA 24 TET / SPIELBERG ───────────────────────────────
  {
    const cell = layout.wingCenters.acoustic;
    const center = cellPos(cell);
    const room = new THREE.Group();
    room.position.copy(center);
    mountSign(
      room,
      maze[cell],
      "ALA 03 · 24 TET / SPIELBERG",
      "CÁMARA ACÚSTICA",
      "RE · MI · DO · DO · SOL · SEÑAL",
      "#ffb347",
    );
    const eggGroup = new THREE.Group();
    eggGroup.position.set(center.x, 0, center.z);
    // Sound mixing console
    addBox(eggGroup, 1.5, 0.88, 0.72, steel, [0, 0.44, 0]);
    for (let bar = -2; bar <= 2; bar += 1) {
      addBox(
        eggGroup,
        0.16,
        0.16 + Math.abs(bar) * 0.04,
        0.08,
        bar === 0 ? amberGlow : blueGlow,
        [bar * 0.24, 0.98, -0.1],
      );
    }
    // Jurassic Park trembling glass of water on console!
    const glassCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.075, 0.22, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xbfe7ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    );
    glassCup.position.set(0.52, 1.0, 0.15);
    eggGroup.add(glassCup);
    const ripple = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.075, 14),
      new THREE.MeshBasicMaterial({ color: 0x8be2ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(0.52, 1.04, 0.15);
    eggGroup.add(ripple);
    waterGlassRipples = ripple;

    world.add(eggGroup);
    world.add(room);
    decorGroups.push(room);
    eggs.push({
      id: "acoustic-signal",
      cell,
      mesh: eggGroup,
      position: center.clone(),
      used: false,
      reusable: true,
      cooldownUntil: 0,
    });
    virtualLights.push({
      id: "wing-acoustic",
      x: center.x,
      y: 2.9,
      z: center.z,
      color: 0xffb347,
      intensity: 15,
      distance: 11,
      priority: 1.25,
    });
  }

  // ── 4. OFICINA FAZBEAR (FNAF 1987 HORROR + HONK POSTER + CCTV CHARGER) ──
  {
    const cell = layout.wingCenters.fazbear;
    const center = cellPos(cell);
    const room = new THREE.Group();
    room.position.copy(center);
    mountSign(
      room,
      maze[cell],
      "ALA 04 · TURNO DE NOCHE",
      "CELEBRATE! 22",
      "PULSA [E] · GENERADOR CCTV 100%",
      "#5eff8a",
      (ctx) => {
        // Subtle spooky silhouette + red nose dot inside poster
        ctx.fillStyle = "rgba(94, 255, 138, 0.08)";
        ctx.beginPath();
        ctx.arc(415, 128, 66, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff2b2b";
        ctx.beginPath();
        ctx.arc(415, 132, 11, 0, Math.PI * 2);
        ctx.fill();
      },
    );
    const eggGroup = new THREE.Group();
    eggGroup.position.set(center.x, 0, center.z);
    // Classic FNAF security desk + spinning fan + green CCTV battery bank
    addBox(eggGroup, 1.55, 0.84, 0.68, steel, [0, 0.42, 0]);
    addBox(eggGroup, 0.42, 0.34, 0.3, greenGlow, [-0.46, 1.02, -0.05]);
    // Desk fan
    addBox(eggGroup, 0.14, 0.24, 0.14, obsidian, [0.42, 0.96, 0.04]);
    const fanHub = new THREE.Group();
    fanHub.position.set(0.42, 1.14, 0.12);
    addBox(fanHub, 0.34, 0.06, 0.02, steel, [0, 0, 0]);
    addBox(fanHub, 0.06, 0.34, 0.02, steel, [0, 0, 0]);
    eggGroup.add(fanHub);
    deskFanBlades = fanHub;

    world.add(eggGroup);
    world.add(room);
    decorGroups.push(room);
    eggs.push({
      id: "fazbear-honk",
      cell,
      mesh: eggGroup,
      position: center.clone(),
      used: false,
      reusable: true,
      cooldownUntil: 0,
    });
    virtualLights.push({
      id: "wing-fazbear",
      x: center.x,
      y: 2.9,
      z: center.z,
      color: 0x5eff8a,
      intensity: 15,
      distance: 11,
      priority: 1.25,
    });
  }

  // ── 5. ARCHIVO MUERTO · CATERING (EL PAN TA' DURO HORROR TWIST) ──────────
  {
    const cell = layout.wingCenters.archive;
    const center = cellPos(cell);
    const room = new THREE.Group();
    room.position.copy(center);
    mountSign(
      room,
      maze[cell],
      "ALA 05 · FINAL_FINAL_v22.drp",
      "ARCHIVO MUERTO",
      "RELIQUIA P01 · EL PAN TA' DURO",
      "#ff475e",
    );
    // Darkroom shelving
    addBox(room, 0.38, 2.4, 1.6, darkWood, [-1.55, 1.2, 0]);
    addBox(room, 1.2, 0.07, 0.12, crimsonGlow, [0, 3.65, 0]);

    const eggGroup = new THREE.Group();
    eggGroup.position.set(center.x, 0, center.z);
    // Rusted catering pedestal + petrified concrete-hard loaf
    addBox(eggGroup, 0.9, 0.82, 0.56, steel, [0, 0.41, 0]);
    const loaf = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.46, 5, 10),
      makeMat(0xc98b44, 0.9, 0.12, 0x5c2b0a, 0.5),
    );
    loaf.rotation.z = Math.PI / 2;
    loaf.position.set(0, 0.94, 0);
    eggGroup.add(loaf);
    eggGroup.userData.loaf = loaf;

    world.add(eggGroup);
    world.add(room);
    decorGroups.push(room);
    eggs.push({
      id: "hard-bread",
      cell,
      mesh: eggGroup,
      position: center.clone(),
      used: false,
      reusable: false,
      cooldownUntil: 0,
    });
    virtualLights.push({
      id: "wing-archive",
      x: center.x,
      y: 3.1,
      z: center.z,
      color: 0xff3b52,
      intensity: 16,
      distance: 11,
      priority: 1.25,
    });
  }

  return {
    decorGroups,
    eggs,
    virtualLights,
    animatedFlames,
    waterGlassRipples,
    deskFanBlades,
    neverlandTiles,
    dispose: () => {
      textures.forEach((t) => t.dispose());
    },
  };
}
