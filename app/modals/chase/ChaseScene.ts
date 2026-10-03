import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SUBJECT_MATERIALS, SUBJECT_TEXTURE_SETS } from "../../walk-exe/subject-materials";

/**
 * EL PASADIZO M00NW4LK · escena 3D
 * The back corridor of an abandoned birthday pizzeria, rendered with three.js
 * and starring the real Subject M-22 model from the game. The mini-game in
 * MoonwalkChase.tsx owns the rules; this class only reads a frame
 * ({ run, threat, stage, status }) every animation frame and stages it:
 *   approach → back turned, moonwalking towards you
 *   hat      → the fedora is thrown at the camera
 *   head     → the head turns 180° to stare at you
 *   detached → face plates open, eyes burn, he turns round and lunges
 */

export type ChaseFrame = {
  run: number;
  threat: number;
  stage: "approach" | "hat" | "head" | "detached";
  status: "intro" | "run" | "won" | "caught";
};

const HALL_WIDTH = 4.6;
const HALL_HEIGHT = 3.3;
const HALL_START = 14;
const HALL_END = -52;
const HALL_LENGTH = HALL_START - HALL_END;
const EYE_HEIGHT = 1.62;
const SUBJECT_HEIGHT = 2.15;

// ── Procedural textures (canvas) ───────────────────────────────────────────
function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function grime(ctx: CanvasRenderingContext2D, size: number, amount: number, alpha: number) {
  for (let index = 0; index < amount; index += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 2 + Math.random() * size * 0.05;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(20, 14, 8, ${alpha * Math.random()})`);
    gradient.addColorStop(1, "rgba(20, 14, 8, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

/** Worn black-and-white pizzeria checkerboard. */
function checkerFloor() {
  return canvasTexture(512, (ctx, size) => {
    const tile = size / 4;
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const light = (row + column) % 2 === 0;
        const base = light ? 196 + Math.random() * 18 : 18 + Math.random() * 10;
        ctx.fillStyle = `rgb(${base}, ${base - 6}, ${base - 14})`;
        ctx.fillRect(column * tile, row * tile, tile, tile);
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 3;
    for (let line = 0; line <= 4; line += 1) {
      ctx.beginPath();
      ctx.moveTo(line * tile, 0);
      ctx.lineTo(line * tile, size);
      ctx.moveTo(0, line * tile);
      ctx.lineTo(size, line * tile);
      ctx.stroke();
    }
    grime(ctx, size, 120, 0.55);
    // Scuffs left by something heavy sliding backwards.
    ctx.strokeStyle = "rgba(30,20,12,0.35)";
    for (let scuff = 0; scuff < 14; scuff += 1) {
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      const x = Math.random() * size;
      ctx.moveTo(x, Math.random() * size);
      ctx.lineTo(x + (Math.random() - 0.5) * 30, Math.random() * size);
      ctx.stroke();
    }
  });
}

/** Cream plaster above, red/black tiles below, a stripe and a run of grime. */
function hallWall() {
  return canvasTexture(512, (ctx, size) => {
    const tileTop = size * 0.62;
    const plaster = ctx.createLinearGradient(0, 0, 0, tileTop);
    plaster.addColorStop(0, "#3d3a35");
    plaster.addColorStop(1, "#8a8170");
    ctx.fillStyle = plaster;
    ctx.fillRect(0, 0, size, tileTop);
    grime(ctx, size, 26, 0.32);
    // Water streaks.
    for (let streak = 0; streak < 18; streak += 1) {
      const x = Math.random() * size;
      const gradient = ctx.createLinearGradient(0, 0, 0, tileTop);
      gradient.addColorStop(0, "rgba(40,30,20,0.35)");
      gradient.addColorStop(1, "rgba(40,30,20,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, 0, 2 + Math.random() * 5, tileTop * (0.4 + Math.random() * 0.6));
    }
    // Party stripe.
    ctx.fillStyle = "#7a1414";
    ctx.fillRect(0, tileTop - 18, size, 12);
    ctx.fillStyle = "#c9a23a";
    ctx.fillRect(0, tileTop - 6, size, 6);
    // Red / black checker tiles.
    const tile = size / 16;
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 16; column += 1) {
        const red = (row + column) % 2 === 0;
        ctx.fillStyle = red ? `rgb(${110 + Math.random() * 30}, 18, 20)` : "#121010";
        ctx.fillRect(column * tile, tileTop + row * tile, tile - 1.5, tile - 1.5);
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, tileTop, size, size - tileTop);
  });
}

function ceilingTexture() {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = "#1a1b1c";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#0b0b0c";
    ctx.lineWidth = 4;
    for (let line = 0; line <= 4; line += 1) {
      ctx.beginPath();
      ctx.moveTo(line * (size / 4), 0);
      ctx.lineTo(line * (size / 4), size);
      ctx.moveTo(0, line * (size / 4));
      ctx.lineTo(size, line * (size / 4));
      ctx.stroke();
    }
    grime(ctx, size, 40, 0.6);
  });
}

function posterTexture(title: string, subtitle: string, background: string, accent: string) {
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = accent;
    for (let ray = 0; ray < 14; ray += 1) {
      ctx.beginPath();
      ctx.moveTo(size / 2, size * 0.42);
      const a1 = (ray / 14) * Math.PI * 2;
      const a2 = a1 + Math.PI / 14;
      ctx.lineTo(size / 2 + Math.cos(a1) * size, size * 0.42 + Math.sin(a1) * size);
      ctx.lineTo(size / 2 + Math.cos(a2) * size, size * 0.42 + Math.sin(a2) * size);
      ctx.closePath();
      ctx.globalAlpha = 0.18;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff6dc";
    ctx.font = "bold 92px Impact, 'Arial Black', sans-serif";
    ctx.fillText(title, size / 2, size * 0.5);
    ctx.font = "bold 34px 'Courier New', monospace";
    ctx.fillStyle = accent;
    ctx.fillText(subtitle, size / 2, size * 0.66);
    ctx.strokeStyle = "#fff6dc";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, size - 28, size - 28);
    grime(ctx, size, 60, 0.7);
    // Torn corner.
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(size - 90, 0);
    ctx.lineTo(size, 110);
    ctx.fill();
  }, true);
}

function signTexture(text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0b0d0d";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = color;
    ctx.font = "bold 54px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 66);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ── The scene ──────────────────────────────────────────────────────────────
type Fluorescent = { light: THREE.PointLight; tube: THREE.Mesh; base: number; phase: number; broken: boolean };

export class ChaseScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private fluorescents: Fluorescent[] = [];
  private emergency: THREE.SpotLight;
  private emergencyPivot = new THREE.Object3D();
  private cameraLight: THREE.SpotLight;
  private dust: THREE.Points;
  private subject = new THREE.Group();
  private subjectFallback: THREE.Group;
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Record<string, THREE.AnimationAction> = {};
  private activeAction: THREE.AnimationAction | null = null;
  private head: THREE.Object3D | null = null;
  private jaw: THREE.Object3D | null = null;
  private hat: THREE.Object3D | null = null;
  private hatFlight: { velocity: THREE.Vector3; spin: THREE.Vector3; landed: boolean } | null = null;
  private hatHome: { parent: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 } | null = null;
  private facePlateLeft: THREE.Object3D | null = null;
  private facePlateRight: THREE.Object3D | null = null;
  private eyeGlows: THREE.PointLight[] = [];
  private servoMaterials: THREE.MeshStandardMaterial[] = [];
  private environment: THREE.WebGLRenderTarget | null = null;
  private textures: THREE.Texture[] = [];
  private lastRun = 0;
  private bob = 0;
  private turn = 0;
  private caughtAt = 0;
  private wonAt = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private readFrame: () => ChaseFrame,
    private onReady: (modelLoaded: boolean) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.05, 90);
    this.camera.position.set(0, EYE_HEIGHT, 0);
    this.scene.background = new THREE.Color(0x050608);
    this.scene.fog = new THREE.FogExp2(0x07090b, 0.045);
    this.scene.add(new THREE.HemisphereLight(0x6a7a8a, 0x140d07, 0.45));

    this.buildHall();
    this.buildDressing();

    // A phone light held by the person filming: it is what makes him visible.
    this.cameraLight = new THREE.SpotLight(0xdfeee6, 160, 26, 0.44, 0.6, 1.4);
    this.cameraLight.castShadow = true;
    this.cameraLight.shadow.mapSize.set(1024, 1024);
    this.camera.add(this.cameraLight);
    this.cameraLight.position.set(0.15, -0.12, 0);
    this.cameraLight.target.position.set(0, -0.15, -6);
    this.camera.add(this.cameraLight.target);
    this.scene.add(this.camera);

    // Rotating red emergency beacon at the far end.
    this.emergency = new THREE.SpotLight(0xff1a12, 260, 44, 0.5, 0.4, 1.2);
    this.emergencyPivot.position.set(0, HALL_HEIGHT - 0.2, HALL_END + 2);
    this.emergencyPivot.add(this.emergency);
    this.emergency.target.position.set(0, -1.4, 6);
    this.emergencyPivot.add(this.emergency.target);
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.28, 16),
      new THREE.MeshStandardMaterial({ color: 0xff2015, emissive: 0xff2015, emissiveIntensity: 2.5 }),
    );
    beacon.position.copy(this.emergencyPivot.position);
    this.scene.add(beacon, this.emergencyPivot);

    this.dust = this.buildDust();
    this.scene.add(this.dust);

    this.subjectFallback = this.buildFallbackSubject();
    this.subject.add(this.subjectFallback);
    this.subject.rotation.y = 0;
    this.scene.add(this.subject);

    this.loadSubject();
    this.resize();
    window.addEventListener("resize", this.resize);
    this.loop();
  }

  private track<T extends THREE.Texture>(texture: T) {
    this.textures.push(texture);
    return texture;
  }

  private buildHall() {
    const floorTexture = this.track(checkerFloor());
    floorTexture.repeat.set(HALL_WIDTH / 1.2, HALL_LENGTH / 1.2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_WIDTH, HALL_LENGTH),
      new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.32, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = (HALL_START + HALL_END) / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallTexture = this.track(hallWall());
    wallTexture.repeat.set(HALL_LENGTH / 3.3, 1);
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.86 });
    [-1, 1].forEach((side) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(HALL_LENGTH, HALL_HEIGHT), wallMaterial);
      wall.position.set((side * HALL_WIDTH) / 2, HALL_HEIGHT / 2, (HALL_START + HALL_END) / 2);
      wall.rotation.y = -side * Math.PI / 2;
      wall.receiveShadow = true;
      this.scene.add(wall);
    });

    const ceilingTex = this.track(ceilingTexture());
    ceilingTex.repeat.set(HALL_WIDTH / 1.2, HALL_LENGTH / 1.2);
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_WIDTH, HALL_LENGTH),
      new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.95 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, HALL_HEIGHT, (HALL_START + HALL_END) / 2);
    this.scene.add(ceiling);

    // Back wall: double doors "PARTS & SERVICE".
    const endWall = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_WIDTH, HALL_HEIGHT),
      new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.9 }),
    );
    endWall.position.set(0, HALL_HEIGHT / 2, HALL_END);
    this.scene.add(endWall);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.5, metalness: 0.6 });
    [-0.62, 0.62].forEach((x) => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 0.08), doorMaterial);
      door.position.set(x, 1.25, HALL_END + 0.05);
      this.scene.add(door);
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.34),
        new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0x550404, emissiveIntensity: 1.2 }),
      );
      pane.position.set(x, 1.75, HALL_END + 0.1);
      this.scene.add(pane);
    });
    this.addSign("PARTS & SERVICE", "#e8d9a8", 0, 2.75, HALL_END + 0.08, 0, 1.8);

    // Fluorescent tubes: one every 5 m, a couple of them broken.
    for (let z = 6, index = 0; z > HALL_END + 3; z -= 5, index += 1) {
      const broken = index === 3 || index === 7;
      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.06, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xd8f3e6, emissiveIntensity: broken ? 0.15 : 2.2 }),
      );
      tube.position.set(0, HALL_HEIGHT - 0.06, z);
      this.scene.add(tube);
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.05, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x2a2c2d, roughness: 0.6, metalness: 0.4 }),
      );
      housing.position.set(0, HALL_HEIGHT - 0.02, z);
      this.scene.add(housing);
      const light = new THREE.PointLight(0xcfeee0, broken ? 2 : 32, 10, 1.7);
      light.position.set(0, HALL_HEIGHT - 0.35, z);
      this.scene.add(light);
      this.fluorescents.push({ light, tube, base: broken ? 2 : 32, phase: Math.random() * 10, broken });
    }
  }

  private addSign(text: string, color: string, x: number, y: number, z: number, rotationY: number, width = 1.4) {
    const texture = this.track(signTexture(text, color));
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(width, width / 4),
      new THREE.MeshStandardMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.35 }),
    );
    sign.position.set(x, y, z);
    sign.rotation.y = rotationY;
    this.scene.add(sign);
  }

  private buildDressing() {
    const posters: Array<[string, string, string, string, number, number]> = [
      ["CELEBRATE!", "FELIZ 22", "#7d0f1a", "#ffd34d", -1, -6],
      ["22", "RAÚL GARCÍA", "#132b5e", "#7ec6ff", 1, -11],
      ["LET'S EAT", "PIZZA · PARTY · FUN", "#3d1a5e", "#ff8bd1", -1, -19],
      ["M00NW4LK", "NO CORRAS", "#111", "#ff2a2a", 1, -26],
      ["HEE-HEE", "SHOW A LAS 22:00", "#5e3d0f", "#ffc96e", -1, -33],
    ];
    posters.forEach(([title, subtitle, background, accent, side, z]) => {
      const texture = this.track(posterTexture(title, subtitle, background, accent));
      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.4),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }),
      );
      poster.position.set(side * (HALL_WIDTH / 2 - 0.02), 2.05, z);
      poster.rotation.y = -side * Math.PI / 2;
      poster.rotation.z = (Math.random() - 0.5) * 0.08;
      this.scene.add(poster);
    });

    // Side doors with service signs.
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 0.55, metalness: 0.5 });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3c3e, roughness: 0.4, metalness: 0.7 });
    ([[1, -3, "EMPLOYEES ONLY"], [-1, -14, "BACKSTAGE"], [1, -22, "OFICINA 22"], [-1, -40, "SAFE ROOM"]] as const).forEach(([side, z, label]) => {
      const x = side * (HALL_WIDTH / 2 - 0.04);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 1.1), doorMaterial);
      door.position.set(x, 1.1, z);
      this.scene.add(door);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.35, 1.3), frameMaterial);
      frame.position.set(x + side * 0.01, 1.17, z);
      this.scene.add(frame);
      this.addSign(label, "#c9d7cf", side * (HALL_WIDTH / 2 - 0.08), 2.55, z, -side * Math.PI / 2, 1.2);
    });

    // Party pennants zig-zagging across the ceiling.
    const pennantGeometry = new THREE.ConeGeometry(0.11, 0.26, 3);
    const colors = [0xd8262f, 0xf2c14e, 0x2d6cff, 0x35c46b, 0xff7ac8];
    const pennantCount = 60;
    const pennants = new THREE.InstancedMesh(
      pennantGeometry,
      new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      pennantCount,
    );
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let index = 0; index < pennantCount; index += 1) {
      const string = Math.floor(index / 12);
      const t = (index % 12) / 11;
      const z = -4 - string * 9 + (t - 0.5) * 2;
      const x = (t - 0.5) * (HALL_WIDTH - 0.4);
      const sag = Math.sin(t * Math.PI) * 0.35;
      dummy.position.set(x, HALL_HEIGHT - 0.3 - sag, z);
      dummy.rotation.set(Math.PI, Math.random() * 0.6, (Math.random() - 0.5) * 0.3);
      dummy.updateMatrix();
      pennants.setMatrixAt(index, dummy.matrix);
      pennants.setColorAt(index, color.setHex(colors[index % colors.length]));
    }
    this.scene.add(pennants);

    // A deflated balloon, a toppled chair and a party hat on the floor.
    const balloon = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xb3141c, roughness: 0.35 }),
    );
    balloon.scale.set(1, 0.45, 1);
    balloon.position.set(-1.6, 0.1, -8.5);
    this.scene.add(balloon);
    const chair = new THREE.Group();
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x5e1a1a, roughness: 0.6 });
    const add = (geometry: THREE.BufferGeometry, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, chairMaterial);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      chair.add(mesh);
    };
    add(new THREE.BoxGeometry(0.5, 0.06, 0.5), 0, 0.45, 0);
    add(new THREE.BoxGeometry(0.5, 0.5, 0.06), 0, 0.72, -0.22);
    [-0.2, 0.2].forEach((x) => [-0.2, 0.2].forEach((z) => add(new THREE.BoxGeometry(0.05, 0.45, 0.05), x, 0.22, z)));
    chair.rotation.set(0, 0.6, Math.PI / 2);
    chair.position.set(1.55, 0.25, -16);
    this.scene.add(chair);
    const partyHat = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.3, 16),
      new THREE.MeshStandardMaterial({ color: 0x2d6cff, roughness: 0.5 }),
    );
    partyHat.rotation.z = Math.PI / 2.2;
    partyHat.position.set(0.9, 0.08, -4.5);
    this.scene.add(partyHat);
  }

  private buildDust() {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * HALL_WIDTH;
      positions[index * 3 + 1] = Math.random() * HALL_HEIGHT;
      positions[index * 3 + 2] = HALL_END + Math.random() * HALL_LENGTH;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xcfd8d0, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false }),
    );
  }

  /** A simple silhouette shown until (or instead of) the real model. */
  private buildFallbackSubject() {
    const group = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.1, 6, 12), dark);
    body.position.y = 1.15;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), dark);
    headMesh.position.y = 1.95;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 20), dark);
    brim.position.y = 2.12;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.2, 20), dark);
    crown.position.y = 2.22;
    group.add(body, headMesh, brim, crown);
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    return group;
  }

  private loadSubject() {
    const timeout = window.setTimeout(() => this.onReady(false), 12000);
    new GLTFLoader().load(
      "/models/subject-m22.glb",
      (gltf) => {
        window.clearTimeout(timeout);
        if (this.disposed) return;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const height = Math.max(0.01, box.max.y - box.min.y);
        const scale = SUBJECT_HEIGHT / height;
        model.scale.setScalar(scale);
        model.position.y = -box.min.y * scale;
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            const surfaces = Array.isArray(object.material) ? object.material : [object.material];
            surfaces.forEach((surface) => {
              if (surface instanceof THREE.MeshStandardMaterial && surface.name === "RED_SERVO_EMISSION") {
                this.servoMaterials.push(surface);
              }
            });
          }
        });
        this.head = model.getObjectByName("head") ?? null;
        this.jaw = model.getObjectByName("jaw") ?? null;
        this.hat = model.getObjectByName("hat") ?? null;
        if (this.hat?.parent) {
          this.hatHome = {
            parent: this.hat.parent,
            position: this.hat.position.clone(),
            quaternion: this.hat.quaternion.clone(),
            scale: this.hat.scale.clone(),
          };
        }
        this.facePlateLeft = model.getObjectByName("facePlateLeft") ?? null;
        this.facePlateRight = model.getObjectByName("facePlateRight") ?? null;
        ["eyeGlowLeft", "eyeGlowRight"].forEach((name) => {
          const glow = model.getObjectByName(name);
          if (glow instanceof THREE.PointLight) this.eyeGlows.push(glow);
        });
        this.subject.remove(this.subjectFallback);
        this.subject.add(model);
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
          const action = this.mixer!.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
          this.actions[clip.name] = action;
        });
        this.playAction("moonwalk");
        void this.applyMaterials(model);
        this.onReady(true);
      },
      undefined,
      () => {
        window.clearTimeout(timeout);
        this.onReady(false);
      },
    );
  }

  private async applyMaterials(model: THREE.Object3D) {
    const loader = new THREE.TextureLoader();
    const sets = SUBJECT_TEXTURE_SETS.low;
    const load = (url: string, color: boolean, repeat: readonly [number, number]) =>
      new Promise<THREE.Texture | null>((resolve) => {
        loader.load(
          url,
          (texture) => {
            texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(repeat[0], repeat[1]);
            this.track(texture);
            resolve(texture);
          },
          undefined,
          () => resolve(null),
        );
      });
    const bundles = new Map<string, { map: THREE.Texture | null; normal: THREE.Texture | null; rm: THREE.Texture | null }>();
    await Promise.all(
      (Object.keys(sets) as Array<keyof typeof sets>).map(async (name) => {
        const set = sets[name];
        const [map, normal, rm] = await Promise.all([
          load(set.baseColor, true, set.repeat),
          load(set.normal, false, set.repeat),
          set.rm ? load(set.rm, false, set.repeat) : Promise.resolve(null),
        ]);
        bundles.set(name, { map, normal, rm });
      }),
    );
    if (this.disposed) return;
    if (!this.environment) {
      const generator = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.environment = generator.fromScene(room, 0.04);
      room.dispose();
      generator.dispose();
    }
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const surfaces = Array.isArray(object.material) ? object.material : [object.material];
      surfaces.forEach((surface) => {
        if (!(surface instanceof THREE.MeshStandardMaterial)) return;
        const definition = SUBJECT_MATERIALS[surface.name as keyof typeof SUBJECT_MATERIALS];
        if (!definition) return;
        const bundle = bundles.get(definition.textureSet);
        if (bundle?.map && (!("useBaseColor" in definition) || definition.useBaseColor !== false)) {
          surface.map = bundle.map;
          surface.color.setHex(definition.tint);
        }
        if (bundle?.normal) {
          surface.normalMap = bundle.normal;
          surface.normalScale.setScalar(definition.normalScale);
        }
        if (bundle?.rm) {
          surface.roughnessMap = bundle.rm;
          surface.metalnessMap = bundle.rm;
          surface.roughness = 1;
          surface.metalness = 1;
        }
        if ("environmentIntensity" in definition && definition.environmentIntensity && this.environment) {
          surface.envMap = this.environment.texture;
          surface.envMapIntensity = definition.environmentIntensity;
        }
        surface.needsUpdate = true;
      });
    });
  }

  private playAction(name: string, fade = 0.35) {
    const next = this.actions[name];
    if (!next || next === this.activeAction) return;
    next.reset().play();
    if (this.activeAction) next.crossFadeFrom(this.activeAction, fade, true);
    this.activeAction = next;
  }

  private resize = () => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  };

  private loop = () => {
    if (this.disposed) return;
    this.frameId = window.requestAnimationFrame(this.loop);
    const delta = Math.min(0.05, this.clock.getDelta());
    const time = this.clock.elapsedTime;
    const frame = this.readFrame();
    this.update(frame, delta, time);
    this.renderer.render(this.scene, this.camera);
  };

  private update(frame: ChaseFrame, delta: number, time: number) {
    const { run, threat, stage, status } = frame;
    const ease = (from: number, to: number, speed: number) => from + (to - from) * Math.min(1, delta * speed);

    // Camera: you retreat backwards down the hall, filming him.
    const cameraZ = run * 12;
    const stepped = run - this.lastRun;
    this.lastRun = run;
    if (stepped > 0) this.bob += stepped * 40;
    const shake = status === "caught" ? 0.06 : stage === "detached" ? 0.02 : threat * 0.006;
    this.camera.position.set(
      Math.sin(this.bob * 0.5) * 0.04 + (Math.random() - 0.5) * shake,
      EYE_HEIGHT + Math.abs(Math.sin(this.bob)) * 0.05 + (Math.random() - 0.5) * shake,
      cameraZ,
    );

    // Subject M: distance shrinks as the threat grows.
    const lunge = Math.max(0, (threat - 0.93) / 0.07);
    let distance = 1.25 + (1 - threat) * 22;
    if (status === "caught") {
      if (!this.caughtAt) this.caughtAt = time;
      distance = Math.max(0.55, 1.25 - (time - this.caughtAt) * 6);
    }
    if (status === "won") {
      if (!this.wonAt) this.wonAt = time;
      distance = 1.25 + (1 - threat) * 22 + (time - this.wonAt) * 4;
    }
    this.subject.position.set(Math.sin(time * 1.4) * 0.18 * (1 - lunge), 0, cameraZ - distance);

    // Back turned while he moonwalks; he turns round for the lunge.
    const facingCamera = stage === "detached" && threat > 0.9;
    const targetTurn = facingCamera || status === "caught" ? 1 : 0;
    this.turn = ease(this.turn, targetTurn, 3.2);
    // The model's front is -Z: 0 = back turned to the camera, PI = facing it.
    this.subject.rotation.y = Math.PI * this.turn;
    if (this.mixer) {
      if (status === "caught" || facingCamera) this.playAction("chase", 0.2);
      else if (status === "intro") this.playAction("idle");
      else this.playAction("moonwalk");
      this.mixer.timeScale = status === "won" ? 0.15 : 0.9 + threat * 0.9;
      this.mixer.update(delta);
    }

    // Head: turns 180° to stare over his shoulder, then back when he faces you.
    if (this.head) {
      const headTarget = stage === "head" || (stage === "detached" && !facingCamera) ? Math.PI : 0;
      this.head.rotation.y = ease(this.head.rotation.y, headTarget, 2.4);
      this.head.rotation.z = Math.sin(time * 2.2) * 0.08 * threat;
    }
    if (this.jaw) {
      const jawTarget = stage === "detached" || status === "caught" ? 0.45 + Math.sin(time * 18) * 0.14 : 0.04;
      this.jaw.rotation.x = ease(this.jaw.rotation.x, jawTarget, 10);
    }
    const faceOpen = stage === "detached" || status === "caught" ? 1 : stage === "head" ? 0.25 : 0;
    if (this.facePlateLeft && this.facePlateRight) {
      this.facePlateLeft.rotation.y = ease(this.facePlateLeft.rotation.y, -faceOpen * 0.55, 6);
      this.facePlateRight.rotation.y = ease(this.facePlateRight.rotation.y, faceOpen * 0.55, 6);
    }
    const servo = 2.6 + faceOpen * 7 + Math.max(0, Math.sin(time * 9)) * (0.5 + faceOpen * 3);
    this.servoMaterials.forEach((surface) => {
      surface.emissiveIntensity = servo;
    });
    this.eyeGlows.forEach((glow) => {
      glow.intensity = 0.3 + faceOpen * 2.4 + threat * 0.6;
    });

    // The fedora is thrown at the camera.
    if (this.hat && (stage === "hat" || stage === "head" || stage === "detached") && !this.hatFlight) {
      this.scene.attach(this.hat);
      const toCamera = this.camera.position.clone().sub(this.hat.getWorldPosition(new THREE.Vector3())).normalize();
      this.hatFlight = {
        velocity: toCamera.multiplyScalar(9).add(new THREE.Vector3(0.6, 2.4, 0)),
        spin: new THREE.Vector3(6, 14, 3),
        landed: false,
      };
    }
    if (this.hat && this.hatFlight && !this.hatFlight.landed) {
      this.hatFlight.velocity.y -= 9.8 * delta;
      this.hat.position.addScaledVector(this.hatFlight.velocity, delta);
      this.hat.rotation.x += this.hatFlight.spin.x * delta;
      this.hat.rotation.y += this.hatFlight.spin.y * delta;
      if (this.hat.position.y < 0.08) {
        this.hat.position.y = 0.08;
        this.hatFlight.landed = true;
      }
    }

    // Lights: flicker harder as he closes in; red takeover at the end.
    this.fluorescents.forEach((tube, index) => {
      const flickerChance = tube.broken ? 0.4 : 0.015 + threat * 0.22;
      const flicker = Math.random() < flickerChance ? Math.random() * 0.2 : 1;
      const off = status === "won" || (status === "caught" && index % 2 === 0);
      const intensity = off ? 0 : tube.base * flicker * (1 - threat * 0.45);
      tube.light.intensity = intensity;
      (tube.tube.material as THREE.MeshStandardMaterial).emissiveIntensity = off ? 0.05 : (intensity / tube.base) * 2.2;
      tube.light.color.setRGB(0.81 + threat * 0.19, 0.93 - threat * 0.6, 0.88 - threat * 0.7);
    });
    this.emergencyPivot.rotation.y = time * (2 + threat * 5);
    this.emergency.intensity = 200 + threat * 320 + (status === "won" ? 200 : 0);
    this.cameraLight.intensity = status === "won" ? 30 : 150 + Math.sin(time * 40) * threat * 40;
    (this.scene.fog as THREE.FogExp2).density = 0.042 + threat * 0.018;

    this.dust.rotation.y = Math.sin(time * 0.05) * 0.02;
    this.camera.lookAt(
      this.subject.position.x * 0.4,
      EYE_HEIGHT - 0.05 + threat * 0.2,
      this.subject.position.z,
    );
  }

  /** A new take: the fedora goes back on his head and the clocks restart. */
  reset() {
    this.caughtAt = 0;
    this.wonAt = 0;
    this.lastRun = 0;
    this.turn = 0;
    this.hatFlight = null;
    if (this.hat && this.hatHome) {
      this.hatHome.parent.add(this.hat);
      this.hat.position.copy(this.hatHome.position);
      this.hat.quaternion.copy(this.hatHome.quaternion);
      this.hat.scale.copy(this.hatHome.scale);
    }
    if (this.head) this.head.rotation.set(0, 0, 0);
  }

  dispose() {
    this.disposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.resize);
    this.mixer?.stopAllAction();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.InstancedMesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.textures.forEach((texture) => texture.dispose());
    this.environment?.dispose();
    this.renderer.dispose();
  }
}
