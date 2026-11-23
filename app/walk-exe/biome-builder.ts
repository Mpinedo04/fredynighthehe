import * as THREE from "three";
import {
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS,
  cellCenter2D,
  seededRandom,
  type MazeCell,
} from "./game-core";
import {
  STUDIO_BIOME_ATMOSPHERE,
  STUDIO_BIOME_IDS,
  STUDIO_WINGS,
  type StudioBiomeId,
  type StudioLayout,
} from "./studio-layout";

export type BuiltBiomes = {
  propCount: number;
  wallMeshCount: number;
  dispose: () => void;
};

type TransformSpec = {
  pos: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  color?: number;
};

type WallPanelSpec = {
  x: number;
  z: number;
  biome: StudioBiomeId;
  halfThin: boolean;
};

function createCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 256,
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function addGrime(
  ctx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
  strength = 1,
) {
  // Top ceiling shadow & bottom floor dampness
  const topGrad = ctx.createLinearGradient(0, 0, 0, size * 0.16);
  topGrad.addColorStop(0, `rgba(0,0,0,${0.55 * strength})`);
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, size, size * 0.16);

  const botGrad = ctx.createLinearGradient(0, size * 0.78, 0, size);
  botGrad.addColorStop(0, "rgba(0,0,0,0)");
  botGrad.addColorStop(1, `rgba(0,0,0,${0.62 * strength})`);
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, size * 0.78, size, size * 0.22);

  // Subtle vertical water streaks & grime patches
  for (let i = 0; i < 24; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${(0.06 + rand() * 0.1) * strength})`;
    ctx.fillRect(rand() * size, rand() * size * 0.4, 2 + rand() * 6, 25 + rand() * 85);
  }
  for (let i = 0; i < 42; i += 1) {
    ctx.fillStyle =
      rand() > 0.5
        ? `rgba(0,0,0,${0.08 * strength})`
        : `rgba(255,255,255,${0.03 * strength})`;
    ctx.fillRect(rand() * size, rand() * size, 6 + rand() * 20, 4 + rand() * 14);
  }
}

function makeWallTexture(biome: StudioBiomeId, seed: number) {
  const rand = seededRandom(seed + biome.length * 131);
  return createCanvasTexture((ctx, s) => {
    if (biome === "booth") {
      // Industrial dark teal-slate projection studio panels + cinema hazard stripe
      ctx.fillStyle = "#293331";
      ctx.fillRect(0, 0, s, s);
      // Vertical steel panel seams & rivets
      for (let x = 0; x < s; x += 64) {
        ctx.fillStyle = "#181f1e";
        ctx.fillRect(x, 0, 3, s);
        ctx.fillStyle = "#3c4a47";
        ctx.fillRect(x + 3, 0, 2, s);
        for (let y = 16; y < s; y += 44) {
          ctx.fillStyle = "#4d5e5a";
          ctx.fillRect(x + 9, y, 3, 3);
        }
      }
      // Upper ventilation louver slots
      ctx.fillStyle = "#141a19";
      for (let i = 0; i < 5; i += 1) {
        ctx.fillRect(28, 34 + i * 8, 72, 3);
        ctx.fillRect(156, 34 + i * 8, 72, 3);
      }
      // Waist-level yellow/black cinema caution dado band
      ctx.fillStyle = "#141716";
      ctx.fillRect(0, s * 0.58, s, 26);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, s * 0.58 + 3, s, 20);
      ctx.clip();
      ctx.fillStyle = "#bfa03c";
      ctx.fillRect(0, s * 0.58 + 3, s, 20);
      ctx.fillStyle = "#141716";
      for (let x = -32; x < s + 32; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, s * 0.58 + 24);
        ctx.lineTo(x + 12, s * 0.58 + 24);
        ctx.lineTo(x + 24, s * 0.58 + 2);
        ctx.lineTo(x + 12, s * 0.58 + 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // Dark lower metal dado
      ctx.fillStyle = "#1c2221";
      ctx.fillRect(0, s * 0.69, s, s * 0.31);
      addGrime(ctx, s, rand, 0.9);
      return;
    }

    if (biome === "neverland") {
      // Midnight theatrical velvet drapes + tarnished gold rail + ebony wainscoting
      ctx.fillStyle = "#131b30";
      ctx.fillRect(0, 0, s, s * 0.65);
      // Draped vertical curtain pleats
      for (let x = 0; x < s; x += 24) {
        const g = ctx.createLinearGradient(x, 0, x + 24, 0);
        g.addColorStop(0, "#0b1020");
        g.addColorStop(0.45, "#233359");
        g.addColorStop(0.75, "#16213d");
        g.addColorStop(1, "#0a0e1c");
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 24, s * 0.65);
      }
      // Gold theater trim rail
      ctx.fillStyle = "#b59142";
      ctx.fillRect(0, s * 0.64, s, 7);
      ctx.fillStyle = "#6c521d";
      ctx.fillRect(0, s * 0.64 + 7, s, 3);
      // Dark lacquered theater wainscoting with recessed panels
      ctx.fillStyle = "#141621";
      ctx.fillRect(0, s * 0.68, s, s * 0.32);
      ctx.strokeStyle = "#313b54";
      ctx.lineWidth = 3;
      ctx.strokeRect(14, s * 0.72, 102, 54);
      ctx.strokeRect(140, s * 0.72, 102, 54);
      addGrime(ctx, s, rand, 0.85);
      return;
    }

    if (biome === "crypt") {
      // Gothic cathedral ashlar stonework + pointed blind arch + candle soot
      ctx.fillStyle = "#16121c";
      ctx.fillRect(0, 0, s, s);
      const rows = 8;
      const rowH = s / rows;
      for (let r = 0; r < rows; r += 1) {
        const cols = 4;
        const colW = s / cols;
        const offset = (r % 2) * (colW * 0.5);
        for (let c = -1; c <= cols; c += 1) {
          const shade = 34 + Math.floor(rand() * 20);
          const purpleTint = Math.floor(rand() * 14);
          ctx.fillStyle = `rgb(${shade + purpleTint}, ${shade - 4}, ${shade + 12 + purpleTint})`;
          ctx.fillRect(c * colW + offset + 2, r * rowH + 2, colW - 4, rowH - 4);
        }
      }
      // Carved gothic pointed arch niche in center
      ctx.strokeStyle = "rgba(183, 107, 255, 0.28)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(46, s * 0.86);
      ctx.lineTo(46, s * 0.36);
      ctx.quadraticCurveTo(46, s * 0.14, s * 0.5, s * 0.08);
      ctx.quadraticCurveTo(s - 46, s * 0.14, s - 46, s * 0.36);
      ctx.lineTo(s - 46, s * 0.86);
      ctx.stroke();
      // Subtle crimson/violet damp creeping from bottom
      const damp = ctx.createLinearGradient(0, s * 0.7, 0, s);
      damp.addColorStop(0, "rgba(74, 18, 84, 0)");
      damp.addColorStop(1, "rgba(56, 12, 48, 0.55)");
      ctx.fillStyle = damp;
      ctx.fillRect(0, s * 0.7, s, s * 0.3);
      addGrime(ctx, s, rand, 1.0);
      return;
    }

    if (biome === "acoustic") {
      // Studio acoustic wedge foam + copper patch conduit + walnut slat dado
      ctx.fillStyle = "#1c1a18";
      ctx.fillRect(0, 0, s, s * 0.62);
      const tile = 32;
      for (let y = 0; y < s * 0.6; y += tile) {
        for (let x = 0; x < s; x += tile) {
          const flip = ((x + y) / tile) % 2 === 0;
          ctx.fillStyle = "#262320";
          ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
          ctx.fillStyle = "#141210";
          for (let k = 3; k < tile - 2; k += 6) {
            if (flip) ctx.fillRect(x + k, y + 2, 2, tile - 4);
            else ctx.fillRect(x + 2, y + k, tile - 4, 2);
          }
        }
      }
      // Copper cable rail + amber microtonal LED ticks
      ctx.fillStyle = "#5c3b1e";
      ctx.fillRect(0, s * 0.6, s, 14);
      ctx.fillStyle = "#d9923b";
      ctx.fillRect(0, s * 0.6 + 2, s, 2);
      for (let x = 14; x < s; x += 28) {
        ctx.fillStyle = x % 56 === 14 ? "#ffb347" : "#44d47c";
        ctx.fillRect(x, s * 0.6 + 6, 8, 3);
      }
      // Walnut wood studio slats on lower wall
      ctx.fillStyle = "#2b1e14";
      ctx.fillRect(0, s * 0.66, s, s * 0.34);
      for (let x = 0; x < s; x += 12) {
        ctx.fillStyle = "#160e09";
        ctx.fillRect(x, s * 0.66, 3, s * 0.34);
      }
      addGrime(ctx, s, rand, 0.85);
      return;
    }

    if (biome === "fazbear") {
      // Iconic FNAF pizzeria wall: grimy olive-cream upper, red + B&W checker midband, dark scuffed dado
      ctx.fillStyle = "#626052";
      ctx.fillRect(0, 0, s, s * 0.44);
      // Water-stained plaster texture on upper wall
      for (let i = 0; i < 36; i += 1) {
        ctx.fillStyle = `rgba(38, 36, 28, ${0.08 + rand() * 0.14})`;
        ctx.fillRect(rand() * s, rand() * s * 0.44, 10 + rand() * 34, 8 + rand() * 24);
      }
      // Red top trim
      ctx.fillStyle = "#962020";
      ctx.fillRect(0, s * 0.44, s, 9);
      // 2-row black & white pizzeria checkerboard stripe
      const sq = 16;
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < s / sq; col += 1) {
          ctx.fillStyle = (row + col) % 2 === 0 ? "#d7d3c4" : "#151517";
          ctx.fillRect(col * sq, s * 0.44 + 9 + row * sq, sq, sq);
        }
      }
      // Red bottom trim
      ctx.fillStyle = "#8a1b1b";
      ctx.fillRect(0, s * 0.44 + 41, s, 9);
      // Dark scuffed lower pizzeria dado with scratch marks
      ctx.fillStyle = "#282b2a";
      ctx.fillRect(0, s * 0.44 + 50, s, s);
      ctx.strokeStyle = "rgba(180, 188, 175, 0.22)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i += 1) {
        const sx = 35 + i * 44;
        ctx.beginPath();
        ctx.moveTo(sx, s * 0.72);
        ctx.lineTo(sx + 10, s * 0.88);
        ctx.stroke();
      }
      addGrime(ctx, s, rand, 1.05);
      return;
    }

    // "archive": Darkroom concrete bricks, rusted horizontal conduits, crimson warning band
    ctx.fillStyle = "#2c2224";
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 22) {
      const off = (Math.floor(y / 22) % 2) * 26;
      for (let x = -26; x < s + 26; x += 52) {
        const v = 38 + Math.floor(rand() * 14);
        ctx.fillStyle = `rgb(${v + 12}, ${v}, ${v + 2})`;
        ctx.fillRect(x + off + 1, y + 1, 50, 20);
      }
    }
    // Crimson darkroom stripe
    ctx.fillStyle = "#8c1726";
    ctx.fillRect(0, s * 0.56, s, 16);
    ctx.fillStyle = "#24070c";
    ctx.fillRect(0, s * 0.56 + 16, s, 4);
    // Rusted metallic horizontal stain
    ctx.fillStyle = "rgba(116, 46, 26, 0.45)";
    ctx.fillRect(0, s * 0.22, s, 10);
    addGrime(ctx, s, rand, 1.1);
  });
}

function makeFloorTexture(biome: StudioBiomeId, seed: number) {
  const rand = seededRandom(seed + biome.length * 257);
  return createCanvasTexture((ctx, s) => {
    if (biome === "neverland") {
      // Cracked black & ivory theatrical checkerboard stage floor
      const sq = s / 4;
      for (let r = 0; r < 4; r += 1) {
        for (let c = 0; c < 4; c += 1) {
          ctx.fillStyle = (r + c) % 2 === 0 ? "#8d8a80" : "#151822";
          ctx.fillRect(c * sq, r * sq, sq, sq);
        }
      }
      // Hairline cracks
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 40);
      ctx.lineTo(96, 118);
      ctx.lineTo(148, 184);
      ctx.stroke();
      addGrime(ctx, s, rand, 0.7);
      return;
    }

    if (biome === "fazbear") {
      // Grimy FNAF black-and-white checkered linoleum + confetti flecks
      const sq = s / 6;
      for (let r = 0; r < 6; r += 1) {
        for (let c = 0; c < 6; c += 1) {
          ctx.fillStyle = (r + c) % 2 === 0 ? "#7a786d" : "#181a1b";
          ctx.fillRect(c * sq, r * sq, sq, sq);
        }
      }
      for (let i = 0; i < 18; i += 1) {
        ctx.fillStyle = i % 3 === 0 ? "#8f2222" : "#3a5a8c";
        ctx.fillRect(rand() * s, rand() * s, 4, 4);
      }
      addGrime(ctx, s, rand, 0.85);
      return;
    }

    if (biome === "crypt") {
      // Ancient mossy cathedral flagstones + candle wax drops
      ctx.fillStyle = "#120f17";
      ctx.fillRect(0, 0, s, s);
      const step = 64;
      for (let r = 0; r < 4; r += 1) {
        for (let c = 0; c < 4; c += 1) {
          const v = 30 + Math.floor(rand() * 14);
          ctx.fillStyle = `rgb(${v + 4}, ${v}, ${v + 12})`;
          ctx.fillRect(c * step + 3, r * step + 3, step - 6, step - 6);
        }
      }
      for (let i = 0; i < 14; i += 1) {
        ctx.fillStyle = "rgba(220, 200, 175, 0.16)";
        ctx.beginPath();
        ctx.arc(rand() * s, rand() * s, 2 + rand() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      addGrime(ctx, s, rand, 0.75);
      return;
    }

    if (biome === "acoustic") {
      // Dark recording studio wood parquet planks + gaffer tape
      ctx.fillStyle = "#241b13";
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 16) {
        const v = 34 + Math.floor(rand() * 16);
        ctx.fillStyle = `rgb(${v + 14}, ${v + 4}, ${v - 4})`;
        ctx.fillRect(0, y + 1, s, 14);
      }
      // Cross gaffer tape holding studio cables
      ctx.fillStyle = "#111112";
      ctx.fillRect(s * 0.42, 0, 18, s);
      addGrime(ctx, s, rand, 0.65);
      return;
    }

    if (biome === "archive") {
      // Wet stained darkroom concrete slabs + floor drain
      ctx.fillStyle = "#1e1819";
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "#100c0d";
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, s - 4, s - 4);
      ctx.fillStyle = "rgba(74, 12, 18, 0.35)";
      ctx.beginPath();
      ctx.arc(s * 0.6, s * 0.45, 42, 0, Math.PI * 2);
      ctx.fill();
      addGrime(ctx, s, rand, 0.9);
      return;
    }

    // "booth": dark ribbed studio rubber matting with subtle cable channel
    ctx.fillStyle = "#1e2423";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#141918";
    for (let y = 0; y < s; y += 12) {
      ctx.fillRect(0, y, s, 3);
    }
    ctx.fillStyle = "rgba(191, 160, 60, 0.22)";
    ctx.fillRect(0, 6, s, 4);
    ctx.fillRect(0, s - 10, s, 4);
    addGrime(ctx, s, rand, 0.7);
  });
}

/**
 * Builds the entire 13×13 studio complex with 6 distinct architectural biomes
 * (walls, double-sided boundary walls, floors, colored ceiling lamps, biome
 * threshold beams, arches, pipes, cables, and 150+ wall-hugging instanced
 * corridor furniture & horror props) at minimal draw calls for 60+ FPS.
 */
export function buildBiomeComplex(
  world: THREE.Group,
  maze: readonly MazeCell[],
  layout: StudioLayout,
  seed: number,
): BuiltBiomes {
  const rand = seededRandom(seed * 19 + 409);
  const GRID = layout.size;
  const boardSpan = GRID * CELL_SIZE;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const getBiome = (cellIndex: number): StudioBiomeId => {
    const w = layout.cellWings[cellIndex];
    return w && w !== "corridor" ? w : "booth";
  };

  const cellPos = (cellIndex: number) => cellCenter2D(cellIndex, GRID, CELL_SIZE);

  // ── 1. Ceiling Plane (1 draw call) ────────────────────────────────────────
  const ceilingMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.96, metalness: 0.05 }),
  );
  const ceiling = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(boardSpan, boardSpan)), ceilingMat);
  ceiling.position.set(0, WALL_HEIGHT, 0);
  ceiling.rotation.x = Math.PI / 2;
  world.add(ceiling);

  // ── 2. Per-Biome Walls (with clean two-sided faces on biome borders!) & Floors ──
  const wallMaterials: Record<StudioBiomeId, THREE.MeshStandardMaterial> = {} as Record<
    StudioBiomeId,
    THREE.MeshStandardMaterial
  >;
  const floorMaterials: Record<StudioBiomeId, THREE.MeshStandardMaterial> = {} as Record<
    StudioBiomeId,
    THREE.MeshStandardMaterial
  >;

  for (const biome of STUDIO_BIOME_IDS) {
    const wTex = makeWallTexture(biome, seed);
    const fTex = makeFloorTexture(biome, seed);
    textures.push(wTex, fTex);
    wallMaterials[biome] = trackMat(
      new THREE.MeshStandardMaterial({
        map: wTex,
        roughness: biome === "neverland" ? 0.78 : biome === "crypt" ? 0.94 : 0.86,
        metalness: biome === "booth" || biome === "archive" ? 0.16 : 0.06,
      }),
    );
    floorMaterials[biome] = trackMat(
      new THREE.MeshStandardMaterial({
        map: fTex,
        roughness: biome === "neverland" || biome === "archive" ? 0.56 : 0.78,
        metalness: biome === "archive" ? 0.22 : 0.1,
      }),
    );
  }

  const hWallsByBiome: Record<StudioBiomeId, WallPanelSpec[]> = {
    booth: [],
    neverland: [],
    crypt: [],
    acoustic: [],
    fazbear: [],
    archive: [],
  };
  const vWallsByBiome: Record<StudioBiomeId, WallPanelSpec[]> = {
    booth: [],
    neverland: [],
    crypt: [],
    acoustic: [],
    fazbear: [],
    archive: [],
  };
  const floorsByBiome: Record<StudioBiomeId, Array<[number, number]>> = {
    booth: [],
    neverland: [],
    crypt: [],
    acoustic: [],
    fazbear: [],
    archive: [],
  };
  const lampSpecs: Array<{ x: number; z: number; color: number }> = [];
  const thresholdSpecs: TransformSpec[] = [];

  const halfWallOffset = WALL_THICKNESS * 0.26;

  maze.forEach((cell, index) => {
    const center = cellPos(index);
    const row = Math.floor(index / GRID);
    const col = index % GRID;
    const biome = getBiome(index);

    floorsByBiome[biome].push([center.x, center.z]);

    if (index % 5 === 0 || layout.wingCenters[biome] === index) {
      lampSpecs.push({
        x: center.x,
        z: center.z,
        color: STUDIO_BIOME_ATMOSPHERE[biome].lampHex,
      });
    }

    // North wall (or biome doorway threshold if open!)
    if (!cell.n) {
      const northNeighbor = row > 0 ? (row - 1) * GRID + col : -1;
      const northBiome = northNeighbor >= 0 ? getBiome(northNeighbor) : biome;
      if (northNeighbor >= 0 && northBiome !== biome) {
        hWallsByBiome[biome].push({
          x: center.x,
          z: center.z - CELL_SIZE / 2 + halfWallOffset,
          biome,
          halfThin: true,
        });
        hWallsByBiome[northBiome].push({
          x: center.x,
          z: center.z - CELL_SIZE / 2 - halfWallOffset,
          biome: northBiome,
          halfThin: true,
        });
      } else {
        hWallsByBiome[biome].push({
          x: center.x,
          z: center.z - CELL_SIZE / 2,
          biome,
          halfThin: false,
        });
      }
    } else if (row > 0) {
      const northBiome = getBiome((row - 1) * GRID + col);
      if (northBiome !== biome) {
        thresholdSpecs.push({
          pos: [center.x, WALL_HEIGHT - 0.34, center.z - CELL_SIZE / 2],
          scale: [CELL_SIZE - 0.5, 0.14, 0.22],
          color: STUDIO_WINGS[northBiome].accentHex,
        });
      }
    }

    // West wall (or biome doorway threshold if open!)
    if (!cell.w) {
      const westNeighbor = col > 0 ? row * GRID + (col - 1) : -1;
      const westBiome = westNeighbor >= 0 ? getBiome(westNeighbor) : biome;
      if (westNeighbor >= 0 && westBiome !== biome) {
        vWallsByBiome[biome].push({
          x: center.x - CELL_SIZE / 2 + halfWallOffset,
          z: center.z,
          biome,
          halfThin: true,
        });
        vWallsByBiome[westBiome].push({
          x: center.x - CELL_SIZE / 2 - halfWallOffset,
          z: center.z,
          biome: westBiome,
          halfThin: true,
        });
      } else {
        vWallsByBiome[biome].push({
          x: center.x - CELL_SIZE / 2,
          z: center.z,
          biome,
          halfThin: false,
        });
      }
    } else if (col > 0) {
      const westBiome = getBiome(row * GRID + (col - 1));
      if (westBiome !== biome) {
        thresholdSpecs.push({
          pos: [center.x - CELL_SIZE / 2, WALL_HEIGHT - 0.34, center.z],
          scale: [0.22, 0.14, CELL_SIZE - 0.5],
          color: STUDIO_WINGS[westBiome].accentHex,
        });
      }
    }

    // Outer South & East perimeter walls
    if (row === GRID - 1 && !cell.s) {
      hWallsByBiome[biome].push({
        x: center.x,
        z: center.z + CELL_SIZE / 2,
        biome,
        halfThin: false,
      });
    }
    if (col === GRID - 1 && !cell.e) {
      vWallsByBiome[biome].push({
        x: center.x + CELL_SIZE / 2,
        z: center.z,
        biome,
        halfThin: false,
      });
    }
  });

  const hWallGeo = trackGeo(new THREE.BoxGeometry(CELL_SIZE + 0.16, WALL_HEIGHT, WALL_THICKNESS));
  const vWallGeo = trackGeo(new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE + 0.16));
  const floorTileGeo = trackGeo(new THREE.PlaneGeometry(CELL_SIZE + 0.02, CELL_SIZE + 0.02));
  floorTileGeo.rotateX(-Math.PI / 2);

  let wallMeshCount = 0;
  const dummy = new THREE.Object3D();

  const addWallBatch = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    specs: WallPanelSpec[],
    horizontal: boolean,
  ) => {
    if (specs.length === 0) return;
    const inst = new THREE.InstancedMesh(geo, mat, specs.length);
    specs.forEach((sp, i) => {
      dummy.position.set(sp.x, WALL_HEIGHT / 2, sp.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(
        !horizontal && sp.halfThin ? 0.5 : 1,
        1,
        horizontal && sp.halfThin ? 0.5 : 1,
      );
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    inst.instanceMatrix.needsUpdate = true;
    world.add(inst);
    wallMeshCount += 1;
  };

  for (const biome of STUDIO_BIOME_IDS) {
    addWallBatch(hWallGeo, wallMaterials[biome], hWallsByBiome[biome], true);
    addWallBatch(vWallGeo, wallMaterials[biome], vWallsByBiome[biome], false);
    const floors = floorsByBiome[biome];
    if (floors.length > 0) {
      const fInst = new THREE.InstancedMesh(floorTileGeo, floorMaterials[biome], floors.length);
      floors.forEach(([x, z], i) => {
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        fInst.setMatrixAt(i, dummy.matrix);
      });
      fInst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      fInst.instanceMatrix.needsUpdate = true;
      world.add(fInst);
    }
  }

  // Colored ceiling light strips per biome (1 draw call!)
  if (lampSpecs.length > 0) {
    const lampMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const lampGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.06, 1.15));
    const lampInst = new THREE.InstancedMesh(lampGeo, lampMat, lampSpecs.length);
    const tmpColor = new THREE.Color();
    lampSpecs.forEach((sp, i) => {
      dummy.position.set(sp.x, WALL_HEIGHT - 0.05, sp.z);
      dummy.rotation.set(0, (i % 2) * (Math.PI / 2), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lampInst.setMatrixAt(i, dummy.matrix);
      lampInst.setColorAt(i, tmpColor.setHex(sp.color));
    });
    lampInst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    lampInst.instanceMatrix.needsUpdate = true;
    if (lampInst.instanceColor) lampInst.instanceColor.needsUpdate = true;
    world.add(lampInst);
  }

  // Biome doorway threshold header glow bars (1 draw call!)
  const pushInstancedBox = (
    specs: TransformSpec[],
    material: THREE.Material,
    baseGeo?: THREE.BufferGeometry,
  ) => {
    if (specs.length === 0) return;
    const geo = baseGeo ?? trackGeo(new THREE.BoxGeometry(1, 1, 1));
    const inst = new THREE.InstancedMesh(geo, material, specs.length);
    const tmpColor = new THREE.Color();
    let hasColors = false;
    specs.forEach((sp, i) => {
      dummy.position.set(...sp.pos);
      dummy.rotation.set(...(sp.rot ?? [0, 0, 0]));
      dummy.scale.set(...(sp.scale ?? [1, 1, 1]));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      if (sp.color !== undefined) {
        inst.setColorAt(i, tmpColor.setHex(sp.color));
        hasColors = true;
      }
    });
    inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    inst.instanceMatrix.needsUpdate = true;
    if (hasColors && inst.instanceColor) inst.instanceColor.needsUpdate = true;
    world.add(inst);
  };

  if (thresholdSpecs.length > 0) {
    const threshMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    pushInstancedBox(thresholdSpecs, threshMat);
  }

  // ── 3. Wall-Hugging Instanced Furniture & Environmental Storytelling ─────
  // Skip centerpiece cells, tapes, exit, and vents so furniture never collides with pickups!
  const reserved = new Set<number>([
    layout.boothCell,
    layout.exitCell,
    ...Object.values(layout.wingCenters),
    ...layout.tapeCells,
    ...layout.ventPairs.flat(),
  ]);

  // Shared instanced prop buckets (each bucket = 1 draw call for the whole map!)
  const darkMetalSpecs: TransformSpec[] = [];
  const rustPipeSpecs: TransformSpec[] = [];
  const darkWoodSpecs: TransformSpec[] = [];
  const stoneColumnSpecs: TransformSpec[] = [];
  const velvetFabricSpecs: TransformSpec[] = [];
  const cardboardSpecs: TransformSpec[] = [];
  const whiteClothSpecs: TransformSpec[] = [];
  const redTrimSpecs: TransformSpec[] = [];
  const emissiveGlowSpecs: TransformSpec[] = [];
  const cylinderPropSpecs: TransformSpec[] = [];
  const puddleSpecs: TransformSpec[] = [];

  let propCount = 0;

  type WallSide = {
    dir: keyof MazeCell;
    nx: number; // inward normal X (from wall toward center)
    nz: number; // inward normal Z
    rotY: number; // faces inward into the corridor
    wallX: number;
    wallZ: number;
  };

  const WALL_INSET = CELL_SIZE / 2 - WALL_THICKNESS / 2;

  maze.forEach((cell, index) => {
    const center = cellPos(index);
    const biome = getBiome(index);

    const closedWalls: WallSide[] = [];
    if (!cell.n) {
      closedWalls.push({ dir: "n", nx: 0, nz: 1, rotY: 0, wallX: center.x, wallZ: center.z - WALL_INSET });
    }
    if (!cell.s) {
      closedWalls.push({ dir: "s", nx: 0, nz: -1, rotY: Math.PI, wallX: center.x, wallZ: center.z + WALL_INSET });
    }
    if (!cell.w) {
      closedWalls.push({ dir: "w", nx: 1, nz: 0, rotY: Math.PI / 2, wallX: center.x - WALL_INSET, wallZ: center.z });
    }
    if (!cell.e) {
      closedWalls.push({ dir: "e", nx: -1, nz: 0, rotY: -Math.PI / 2, wallX: center.x + WALL_INSET, wallZ: center.z });
    }

    // Overhead structural framing (applies cleanly even in reserved/corridor cells!)
    if (biome === "crypt" && index % 2 === 0) {
      // Gothic overhead stone arch beam spanning corridor
      const spanX = !cell.e || !cell.w;
      stoneColumnSpecs.push({
        pos: [center.x, WALL_HEIGHT - 0.22, center.z],
        rot: [0, spanX ? 0 : Math.PI / 2, 0],
        scale: [CELL_SIZE - 0.35, 0.34, 0.28],
      });
      // Corner gothic ribs on closed walls (skip centerpiece cells so the rose window stays clear!)
      if (!reserved.has(index)) {
        for (const w of closedWalls.slice(0, 2)) {
          stoneColumnSpecs.push({
            pos: [w.wallX + w.nx * 0.14, WALL_HEIGHT / 2, w.wallZ + w.nz * 0.14],
            rot: [0, w.rotY, 0],
            scale: [0.34, WALL_HEIGHT, 0.28],
          });
        }
      }
      propCount += 1;
    } else if (biome === "neverland" && index % 2 === 0) {
      // Overhead black stage lighting truss
      darkMetalSpecs.push({
        pos: [center.x, WALL_HEIGHT - 0.26, center.z],
        rot: [0, (index % 4 === 0 ? 0 : Math.PI / 2), 0],
        scale: [CELL_SIZE - 0.4, 0.18, 0.18],
      });
      propCount += 1;
    } else if (biome === "acoustic" && index % 2 === 0) {
      // Suspended ceiling acoustic cloud baffle
      darkWoodSpecs.push({
        pos: [center.x, WALL_HEIGHT - 0.28, center.z],
        rot: [0, (index % 4 === 0 ? 0 : Math.PI / 2), 0],
        scale: [1.65, 0.1, 0.95],
      });
      propCount += 1;
    } else if (biome === "archive" && closedWalls.length > 0) {
      // Rusted overhead horizontal industrial wall pipe
      const w = closedWalls[0];
      rustPipeSpecs.push({
        pos: [w.wallX + w.nx * 0.14, WALL_HEIGHT - 0.65, w.wallZ + w.nz * 0.14],
        rot: [0, w.rotY, 0],
        scale: [CELL_SIZE - 0.4, 0.12, 0.12],
      });
      propCount += 1;
    } else if (biome === "fazbear" && index % 2 === 1) {
      // Overhead party pennant wire + festive crimson/amber triangles
      redTrimSpecs.push({
        pos: [center.x, WALL_HEIGHT - 0.45, center.z],
        rot: [0, (index % 4 === 1 ? 0 : Math.PI / 2), 0],
        scale: [CELL_SIZE - 0.5, 0.05, 0.05],
      });
      for (let b = -1; b <= 1; b += 1) {
        const horiz = index % 4 === 1;
        redTrimSpecs.push({
          pos: [
            center.x + (horiz ? b * 0.95 : 0),
            WALL_HEIGHT - 0.62,
            center.z + (horiz ? 0 : b * 0.95),
          ],
          rot: [0, horiz ? 0 : Math.PI / 2, Math.PI / 4],
          scale: [0.22, 0.22, 0.04],
          color: b === 0 ? 0xd9a83c : 0xa81c22,
        });
      }
      propCount += 1;
    }

    if (reserved.has(index) || closedWalls.length === 0) return;

    // Pick 1 (or 2 on dead-ends) closed walls to place rich wall-hugging furniture!
    const wall = closedWalls[Math.floor(rand() * closedWalls.length)];
    const alongX = -wall.nz;
    const alongZ = wall.nx;
    const slide = (rand() - 0.5) * 1.1; // subtle offset along wall so it feels natural
    const baseX = wall.wallX + alongX * slide;
    const baseZ = wall.wallZ + alongZ * slide;
    const placeAt = (inset: number, y: number, extraAlong = 0): [number, number, number] => [
      baseX + wall.nx * inset + alongX * extraAlong,
      y,
      baseZ + wall.nz * inset + alongZ * extraAlong,
    ];

    const roll = rand();

    if (biome === "booth") {
      // Flight-case trunks + stacked 35mm film canisters
      darkMetalSpecs.push({
        pos: placeAt(0.32, 0.34),
        rot: [0, wall.rotY + (rand() - 0.5) * 0.14, 0],
        scale: [0.95, 0.68, 0.52],
      });
      emissiveGlowSpecs.push({
        pos: placeAt(0.58, 0.56),
        rot: [0, wall.rotY, 0],
        scale: [0.85, 0.04, 0.03],
        color: 0xb99a3c,
      });
      cylinderPropSpecs.push({
        pos: placeAt(0.32, 0.74, 0.18),
        scale: [0.22, 0.1, 0.22],
        color: 0x626b68,
      });
      propCount += 2;
    } else if (biome === "neverland") {
      if (roll < 0.52) {
        // Cinema Fresnel Spotlight on tripod tucked against wall
        darkMetalSpecs.push({
          pos: placeAt(0.36, 0.78),
          rot: [0, wall.rotY, 0],
          scale: [0.06, 1.56, 0.06],
        });
        darkMetalSpecs.push({
          pos: placeAt(0.36, 0.12),
          rot: [0, wall.rotY + 0.5, 0],
          scale: [0.55, 0.06, 0.55],
        });
        cylinderPropSpecs.push({
          pos: placeAt(0.42, 1.62),
          rot: [Math.PI / 2, 0, wall.rotY],
          scale: [0.18, 0.36, 0.18],
          color: 0x161a24,
        });
        emissiveGlowSpecs.push({
          pos: placeAt(0.6, 1.62),
          rot: [0, wall.rotY, 0],
          scale: [0.22, 0.22, 0.04],
          color: 0x6db8ff,
        });
        propCount += 2;
      } else {
        // Theatrical velvet drape curtain + flight-case gear box
        velvetFabricSpecs.push({
          pos: placeAt(0.12, 1.85),
          rot: [0, wall.rotY, 0],
          scale: [1.15, 3.1, 0.12],
          color: 0x19254a,
        });
        darkMetalSpecs.push({
          pos: placeAt(0.34, 0.3, 0.55),
          rot: [0, wall.rotY + 0.12, 0],
          scale: [0.72, 0.6, 0.48],
        });
        propCount += 2;
      }
    } else if (biome === "crypt") {
      if (roll < 0.48) {
        // Gothic Cathedral Pew pushed flush against wall (slightly crooked)
        const tilt = (rand() - 0.5) * 0.12;
        darkWoodSpecs.push({
          pos: placeAt(0.34, 0.28),
          rot: [0, wall.rotY + tilt, 0],
          scale: [1.55, 0.1, 0.44],
        });
        darkWoodSpecs.push({
          pos: placeAt(0.16, 0.64),
          rot: [0, wall.rotY + tilt, 0],
          scale: [1.55, 0.62, 0.08],
        });
        darkWoodSpecs.push({
          pos: placeAt(0.34, 0.16, -0.68),
          rot: [0, wall.rotY + tilt, 0],
          scale: [0.09, 0.32, 0.42],
        });
        darkWoodSpecs.push({
          pos: placeAt(0.34, 0.16, 0.68),
          rot: [0, wall.rotY + tilt, 0],
          scale: [0.09, 0.32, 0.42],
        });
        propCount += 1;
      } else {
        // Tall wrought-iron Gothic Candelabra + violet cathedral banner
        darkMetalSpecs.push({
          pos: placeAt(0.3, 0.72),
          rot: [0, wall.rotY, 0],
          scale: [0.07, 1.44, 0.07],
        });
        darkMetalSpecs.push({
          pos: placeAt(0.3, 1.44),
          rot: [0, wall.rotY, 0],
          scale: [0.46, 0.05, 0.08],
        });
        for (const cOff of [-0.18, 0, 0.18]) {
          cylinderPropSpecs.push({
            pos: placeAt(0.3, 1.56, cOff),
            scale: [0.04, 0.22, 0.04],
            color: 0xe2dac4,
          });
          emissiveGlowSpecs.push({
            pos: placeAt(0.3, 1.72, cOff),
            scale: [0.05, 0.09, 0.05],
            color: 0xffb347,
          });
        }
        velvetFabricSpecs.push({
          pos: placeAt(0.08, 2.2, 0.65),
          rot: [0, wall.rotY, 0],
          scale: [0.68, 2.2, 0.05],
          color: 0x3b1654,
        });
        propCount += 2;
      }
    } else if (biome === "acoustic") {
      if (roll < 0.55) {
        // 19-inch Studio Audio Rack Cabinet with glowing amber/green VU meter LEDs
        darkMetalSpecs.push({
          pos: placeAt(0.34, 0.88),
          rot: [0, wall.rotY, 0],
          scale: [0.76, 1.76, 0.54],
        });
        for (let rowLed = 0; rowLed < 4; rowLed += 1) {
          emissiveGlowSpecs.push({
            pos: placeAt(0.62, 0.68 + rowLed * 0.28),
            rot: [0, wall.rotY, 0],
            scale: [0.54, 0.05, 0.03],
            color: rowLed % 2 === 0 ? 0xffb347 : 0x52ff8b,
          });
        }
        propCount += 2;
      } else {
        // Studio Monitor Speaker Stack + flat floor XLR cable channel
        darkWoodSpecs.push({
          pos: placeAt(0.32, 0.52),
          rot: [0, wall.rotY + 0.24, 0],
          scale: [0.52, 1.04, 0.44],
        });
        cylinderPropSpecs.push({
          pos: placeAt(0.54, 0.68),
          rot: [Math.PI / 2, 0, wall.rotY + 0.24],
          scale: [0.16, 0.05, 0.16],
          color: 0x9c6e2c,
        });
        // Floor cable ramp across hallway (flat y = 0.02, walkable!)
        darkMetalSpecs.push({
          pos: [center.x, 0.02, center.z],
          rot: [0, wall.rotY + Math.PI / 2, 0],
          scale: [0.22, 0.04, CELL_SIZE - 0.6],
        });
        propCount += 2;
      }
    } else if (biome === "fazbear") {
      if (roll < 0.55) {
        // Pizzeria Birthday Party Table + red runner + stacked grease pizza boxes!
        whiteClothSpecs.push({
          pos: placeAt(0.36, 0.72),
          rot: [0, wall.rotY, 0],
          scale: [1.36, 0.16, 0.62],
        });
        redTrimSpecs.push({
          pos: placeAt(0.36, 0.81),
          rot: [0, wall.rotY, 0],
          scale: [1.38, 0.03, 0.22],
          color: 0xb01f24,
        });
        // Table legs
        darkMetalSpecs.push({
          pos: placeAt(0.36, 0.34, -0.56),
          rot: [0, wall.rotY, 0],
          scale: [0.06, 0.68, 0.48],
        });
        darkMetalSpecs.push({
          pos: placeAt(0.36, 0.34, 0.56),
          rot: [0, wall.rotY, 0],
          scale: [0.06, 0.68, 0.48],
        });
        // Stacked pizza boxes on top of table
        cardboardSpecs.push({
          pos: placeAt(0.36, 0.87, -0.22),
          rot: [0, wall.rotY + 0.18, 0],
          scale: [0.42, 0.07, 0.42],
        });
        cardboardSpecs.push({
          pos: placeAt(0.36, 0.94, -0.2),
          rot: [0, wall.rotY - 0.14, 0],
          scale: [0.42, 0.07, 0.42],
        });
        // Red party cup
        cylinderPropSpecs.push({
          pos: placeAt(0.4, 0.89, 0.32),
          scale: [0.055, 0.14, 0.055],
          color: 0xc92222,
        });
        propCount += 3;
      } else {
        // Wall-mounted retro CRT security monitor + tipped metal party chair
        darkMetalSpecs.push({
          pos: placeAt(0.28, 2.52),
          rot: [0.22, wall.rotY, 0],
          scale: [0.48, 0.38, 0.38],
        });
        emissiveGlowSpecs.push({
          pos: placeAt(0.48, 2.48),
          rot: [0.22, wall.rotY, 0],
          scale: [0.36, 0.26, 0.03],
          color: 0x3b8f54,
        });
        // Tipped chair hugging base of wall
        darkMetalSpecs.push({
          pos: placeAt(0.36, 0.24, 0.45),
          rot: [0.3, wall.rotY + 0.4, 1.35],
          scale: [0.44, 0.46, 0.42],
        });
        propCount += 2;
      }
    } else {
      // "archive": Rusted metal filing cabinets, stacked archive boxes, glossy darkroom spills
      if (roll < 0.56) {
        darkMetalSpecs.push({
          pos: placeAt(0.32, 0.82),
          rot: [0, wall.rotY + (rand() - 0.5) * 0.08, 0],
          scale: [0.64, 1.64, 0.54],
        });
        // Slightly pulled-out filing drawer!
        rustPipeSpecs.push({
          pos: placeAt(0.46, 1.12),
          rot: [0, wall.rotY, 0],
          scale: [0.54, 0.34, 0.46],
        });
        cardboardSpecs.push({
          pos: placeAt(0.32, 0.24, 0.62),
          rot: [0, wall.rotY + 0.25, 0],
          scale: [0.48, 0.48, 0.44],
        });
        cardboardSpecs.push({
          pos: placeAt(0.32, 0.68, 0.6),
          rot: [0, wall.rotY - 0.18, 0],
          scale: [0.42, 0.4, 0.4],
        });
        propCount += 3;
      } else {
        // Darkroom chemical floor puddle + crate stack
        puddleSpecs.push({
          pos: [center.x + (rand() - 0.5) * 0.9, 0.015, center.z + (rand() - 0.5) * 0.9],
          rot: [-Math.PI / 2, 0, rand() * Math.PI],
          scale: [0.85 + rand() * 0.6, 0.7 + rand() * 0.5, 1],
        });
        cardboardSpecs.push({
          pos: placeAt(0.34, 0.32),
          rot: [0, wall.rotY + 0.12, 0],
          scale: [0.64, 0.64, 0.52],
        });
        propCount += 2;
      }
    }
  });

  // ── 4. Flush All Instanced Prop Buckets (only ~11 draw calls for 150+ props!) ──
  pushInstancedBox(
    darkMetalSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x202528, roughness: 0.46, metalness: 0.78 })),
  );
  pushInstancedBox(
    rustPipeSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x52342a, roughness: 0.68, metalness: 0.64 })),
  );
  pushInstancedBox(
    darkWoodSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x38251a, roughness: 0.82, metalness: 0.08 })),
  );
  pushInstancedBox(
    stoneColumnSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x282130, roughness: 0.92, metalness: 0.06 })),
  );
  pushInstancedBox(
    velvetFabricSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.04 })),
  );
  pushInstancedBox(
    cardboardSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x7c6244, roughness: 0.88, metalness: 0.04 })),
  );
  pushInstancedBox(
    whiteClothSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0xccc9be, roughness: 0.84, metalness: 0.04 })),
  );
  pushInstancedBox(
    redTrimSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0.12 })),
  );
  pushInstancedBox(
    emissiveGlowSpecs,
    trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff })),
  );
  pushInstancedBox(
    cylinderPropSpecs,
    trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48, metalness: 0.35 })),
    trackGeo(new THREE.CylinderGeometry(1, 1, 1, 10)),
  );
  pushInstancedBox(
    puddleSpecs,
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2a070d,
        roughness: 0.12,
        metalness: 0.85,
        transparent: true,
        opacity: 0.82,
      }),
    ),
    trackGeo(new THREE.CircleGeometry(0.6, 12)),
  );

  return {
    propCount,
    wallMeshCount,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
