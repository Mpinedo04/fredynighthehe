import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

class NodeFileReader {
  result = null;
  onloadend = null;

  readAsArrayBuffer(blob) {
    void blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }

  readAsDataURL(blob) {
    void blob.arrayBuffer().then((result) => {
      const mime = blob.type || "application/octet-stream";
      this.result = `data:${mime};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
}

globalThis.FileReader ??= NodeFileReader;

const outputPath = path.resolve("public/models/subject-m22.glb");

const materials = {
  ivory: new THREE.MeshPhysicalMaterial({
    name: "AGED_IVORY_SUIT",
    color: 0x3d3c38,
    roughness: 0.82,
    metalness: 0.04,
    clearcoat: 0.05,
  }),
  ivoryEdge: new THREE.MeshStandardMaterial({
    name: "IVORY_WORN_EDGES",
    color: 0x58564f,
    roughness: 0.92,
    metalness: 0.03,
  }),
  blackFabric: new THREE.MeshPhysicalMaterial({
    name: "BLACK_PLEATED_FABRIC",
    color: 0x090a0c,
    roughness: 0.68,
    metalness: 0.08,
    sheen: 0.65,
    sheenColor: new THREE.Color(0x32333b),
    sheenRoughness: 0.72,
  }),
  lacquer: new THREE.MeshPhysicalMaterial({
    name: "BLACK_LACQUER",
    color: 0x060709,
    roughness: 0.2,
    metalness: 0.44,
    clearcoat: 0.82,
    clearcoatRoughness: 0.16,
  }),
  chrome: new THREE.MeshPhysicalMaterial({
    name: "BRUSHED_ENDOSKELETON",
    color: 0x697178,
    roughness: 0.23,
    metalness: 0.96,
    clearcoat: 0.3,
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    name: "GREASED_GUNMETAL",
    color: 0x171b1d,
    roughness: 0.38,
    metalness: 0.92,
  }),
  copper: new THREE.MeshStandardMaterial({
    name: "AGED_COPPER",
    color: 0x76412b,
    roughness: 0.36,
    metalness: 0.88,
  }),
  silicone: new THREE.MeshPhysicalMaterial({
    name: "CRACKED_SILICONE_MASK",
    color: 0x8f8c86,
    roughness: 0.7,
    metalness: 0.01,
    clearcoat: 0.16,
    clearcoatRoughness: 0.74,
  }),
  siliconeShadow: new THREE.MeshStandardMaterial({
    name: "MASK_PLATE_SEAMS",
    color: 0x383735,
    roughness: 0.88,
    metalness: 0.08,
  }),
  glove: new THREE.MeshPhysicalMaterial({
    name: "CRYSTAL_PERFORMANCE_GLOVE",
    color: 0xb5b2a9,
    roughness: 0.28,
    metalness: 0.3,
    clearcoat: 0.86,
    clearcoatRoughness: 0.15,
  }),
  tooth: new THREE.MeshStandardMaterial({
    name: "AGED_CERAMIC_TEETH",
    color: 0xd5d0bc,
    roughness: 0.58,
    metalness: 0.02,
  }),
  eyeSocket: new THREE.MeshPhysicalMaterial({
    name: "BLACK_GLASS_EYE_SOCKET",
    color: 0x010102,
    roughness: 0.08,
    metalness: 0.55,
    clearcoat: 1,
  }),
  red: new THREE.MeshStandardMaterial({
    name: "RED_SERVO_EMISSION",
    color: 0x210000,
    emissive: 0xff1108,
    emissiveIntensity: 5.8,
    roughness: 0.25,
    metalness: 0.46,
  }),
  faceDecal: new THREE.MeshBasicMaterial({
    name: "FACE_DECAL_PLACEHOLDER",
    color: 0x111111,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  performanceSkin: new THREE.MeshBasicMaterial({
    name: "PERFORMANCE_SKIN_PLACEHOLDER",
    color: 0x111111,
    transparent: true,
    opacity: 0,
    side: THREE.FrontSide,
    depthWrite: false,
  }),
};

const root = new THREE.Group();
root.name = "SUJETO_M22";
root.position.y = 0.22;

function mesh(
  parent,
  name,
  geometry,
  surface,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
) {
  const object = new THREE.Mesh(geometry, surface);
  object.name = name;
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function group(parent, name, position = [0, 0, 0]) {
  const object = new THREE.Group();
  object.name = name;
  object.position.set(...position);
  parent.add(object);
  return object;
}

function cable(
  parent,
  name,
  points,
  radius = 0.012,
  surface = materials.copper,
  tubularSegments = 14,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
  );
  return mesh(
    parent,
    name,
    new THREE.TubeGeometry(curve, tubularSegments, radius, 5, false),
    surface,
    [0, 0, 0],
  );
}

function extrudedPanel(parent, name, points, surface, z = -0.39) {
  const panelShape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) panelShape.moveTo(x, y);
    else panelShape.lineTo(x, y);
  });
  panelShape.closePath();
  return mesh(
    parent,
    name,
    new THREE.ExtrudeGeometry(panelShape, {
      depth: 0.11,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.022,
      bevelThickness: 0.018,
      curveSegments: 6,
    }),
    surface,
    [0, 0, z],
  );
}

function bearing(parent, name, position, radius = 0.17) {
  const assembly = group(parent, name, position);
  mesh(
    assembly,
    `${name}_outer`,
    new THREE.TorusGeometry(radius, radius * 0.18, 8, 24),
    materials.chrome,
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
  );
  mesh(
    assembly,
    `${name}_inner`,
    new THREE.SphereGeometry(radius * 0.66, 16, 10),
    materials.darkMetal,
    [0, 0, 0],
  );
  mesh(
    assembly,
    `${name}_axis`,
    new THREE.CylinderGeometry(
      radius * 0.24,
      radius * 0.24,
      radius * 2.3,
      10,
    ),
    materials.copper,
    [0, 0, 0],
    [0, 0, Math.PI / 2],
  );
  return assembly;
}

function piston(parent, name, position, length, radius = 0.045) {
  const assembly = group(parent, name, position);
  mesh(
    assembly,
    `${name}_housing`,
    new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, length * 0.56, 10),
    materials.darkMetal,
    [0, length * 0.16, 0],
  );
  mesh(
    assembly,
    `${name}_rod`,
    new THREE.CylinderGeometry(radius, radius, length * 0.62, 10),
    materials.chrome,
    [0, -length * 0.26, 0],
  );
  return assembly;
}

const hips = group(root, "hips", [0, 1.78, 0]);

// Pelvic endoskeleton and tailored lower jacket.
mesh(
  hips,
  "pelvis_core",
  new RoundedBoxGeometry(0.66, 0.34, 0.38, 4, 0.07),
  materials.darkMetal,
  [0, -0.12, 0.02],
);
bearing(hips, "hip_bearing_left", [-0.26, -0.26, 0.01], 0.14);
bearing(hips, "hip_bearing_right", [0.26, -0.26, 0.01], 0.14);

const torso = group(hips, "torso", [0, 0.28, 0]);
mesh(
  torso,
  "torso_endocage",
  new RoundedBoxGeometry(0.72, 1.12, 0.38, 5, 0.11),
  materials.darkMetal,
  [0, 0.18, 0.03],
  [0, 0, 0],
  [1.08, 1, 1],
);

for (let rib = -2; rib <= 2; rib += 1) {
  mesh(
    torso,
    `rib_${rib + 3}`,
    new THREE.TorusGeometry(0.35 - Math.abs(rib) * 0.022, 0.025, 7, 22, Math.PI),
    materials.chrome,
    [0, 0.17 + rib * 0.145, 0.02],
    [Math.PI / 2, 0, 0],
  );
}

mesh(
  torso,
  "jacket_back",
  new RoundedBoxGeometry(0.92, 1.22, 0.16, 5, 0.065),
  materials.ivory,
  [0, 0.16, 0.2],
);
extrudedPanel(
  torso,
  "jacket_panel_left",
  [
    [-0.43, 0.62],
    [-0.16, 0.58],
    [-0.12, -0.36],
    [-0.23, -0.49],
    [-0.39, -0.4],
  ],
  materials.ivory,
);
extrudedPanel(
  torso,
  "jacket_panel_right",
  [
    [0.16, 0.58],
    [0.43, 0.62],
    [0.39, -0.4],
    [0.23, -0.49],
    [0.12, -0.36],
  ],
  materials.ivory,
);
mesh(
  torso,
  "shirt",
  new RoundedBoxGeometry(0.32, 1.03, 0.08, 4, 0.025),
  materials.blackFabric,
  [0, 0.18, -0.435],
);
for (let pleat = -3; pleat <= 3; pleat += 1) {
  mesh(
    torso,
    `shirt_pleat_${pleat + 4}`,
    new THREE.BoxGeometry(0.012, 0.86, 0.016),
    pleat % 2 === 0 ? materials.chrome : materials.lacquer,
    [pleat * 0.035, 0.21, -0.484],
  );
}

// Angular lapels and pocket details establish the stage-showman silhouette.
mesh(
  torso,
  "lapel_left",
  new THREE.BoxGeometry(0.22, 0.76, 0.055),
  materials.ivoryEdge,
  [-0.16, 0.34, -0.425],
  [0.03, -0.06, -0.34],
);
mesh(
  torso,
  "lapel_right",
  new THREE.BoxGeometry(0.22, 0.76, 0.055),
  materials.ivoryEdge,
  [0.16, 0.34, -0.425],
  [0.03, 0.06, 0.34],
);
mesh(
  torso,
  "pocket",
  new THREE.BoxGeometry(0.19, 0.055, 0.035),
  materials.ivoryEdge,
  [0.31, 0.43, -0.31],
  [0, 0, 0.06],
);
mesh(
  torso,
  "pocket_square",
  new THREE.ConeGeometry(0.075, 0.15, 3),
  materials.blackFabric,
  [0.31, 0.505, -0.327],
  [0, 0, Math.PI],
);

const chestCore = group(torso, "chestCore", [0, 0.09, -0.36]);
mesh(
  chestCore,
  "sternum_frame",
  new RoundedBoxGeometry(0.22, 0.46, 0.09, 4, 0.025),
  materials.darkMetal,
  [0, 0, 0],
);
mesh(
  chestCore,
  "sternum_void",
  new RoundedBoxGeometry(0.15, 0.36, 0.06, 4, 0.02),
  materials.eyeSocket,
  [0, 0, -0.055],
);
for (let cell = -1; cell <= 1; cell += 1) {
  mesh(
    chestCore,
    `reactor_cell_${cell + 2}`,
    new THREE.CylinderGeometry(0.035, 0.035, 0.1, 12),
    materials.red,
    [0, cell * 0.105, -0.103],
    [Math.PI / 2, 0, 0],
  );
}
for (let side = -1; side <= 1; side += 2) {
  cable(
    torso,
    `chest_cable_${side}`,
    [
      [side * 0.08, -0.1, -0.38],
      [side * 0.18, 0.02, -0.42],
      [side * 0.16, 0.29, -0.38],
    ],
    0.011,
    side < 0 ? materials.copper : materials.chrome,
  );
}

for (let button = 0; button < 3; button += 1) {
  mesh(
    torso,
    `jacket_button_${button}`,
    new THREE.CylinderGeometry(0.027, 0.027, 0.018, 12),
    materials.darkMetal,
    [0.24, 0.13 - button * 0.16, -0.337],
    [Math.PI / 2, 0, 0],
  );
}

mesh(
  hips,
  "jacket_tail_left",
  new RoundedBoxGeometry(0.38, 0.86, 0.09, 4, 0.035),
  materials.ivory,
  [-0.24, -0.55, 0.13],
  [0.08, 0, 0.05],
);
mesh(
  hips,
  "jacket_tail_right",
  new RoundedBoxGeometry(0.38, 0.92, 0.09, 4, 0.035),
  materials.ivory,
  [0.24, -0.58, 0.13],
  [-0.08, 0, -0.05],
);

// Telescopic neck with servo rings and tendons.
const neck = group(hips, "neck", [0, 0.92, 0]);
for (let ring = 0; ring < 5; ring += 1) {
  mesh(
    neck,
    `neck_ring_${ring}`,
    new THREE.TorusGeometry(0.15 - ring * 0.005, 0.025, 8, 22),
    ring % 2 === 0 ? materials.chrome : materials.darkMetal,
    [0, ring * 0.075, 0],
    [Math.PI / 2, 0, 0],
  );
}
for (let side = -1; side <= 1; side += 2) {
  piston(neck, `neck_piston_${side}`, [side * 0.09, 0.14, 0.015], 0.32, 0.022);
  cable(
    neck,
    `neck_tendon_${side}`,
    [
      [side * 0.12, -0.02, 0.05],
      [side * 0.16, 0.16, 0.07],
      [side * 0.1, 0.36, 0.02],
    ],
    0.014,
    materials.copper,
  );
}

const head = group(hips, "head", [0, 1.18, 0]);
mesh(
  head,
  "endo_skull",
  new THREE.SphereGeometry(0.35, 28, 20),
  materials.darkMetal,
  [0, 0.31, -0.005],
  [0, 0, 0],
  [0.82, 1.08, 0.9],
);

// Facial plates are separate named pieces so the game can mechanically open them.
const foreheadPlate = group(head, "foreheadPlate", [0, 0, 0]);
mesh(
  foreheadPlate,
  "forehead_shell",
  new THREE.SphereGeometry(
    0.365,
    30,
    16,
    0,
    Math.PI * 2,
    0.1,
    Math.PI * 0.44,
  ),
  materials.silicone,
  [0, 0.36, -0.03],
  [0, 0, 0],
  [0.82, 1.02, 0.91],
);

const facePlateLeft = group(head, "facePlateLeft", [-0.145, 0.285, -0.285]);
mesh(
  facePlateLeft,
  "left_cheek_plate",
  new RoundedBoxGeometry(0.24, 0.37, 0.075, 5, 0.06),
  materials.silicone,
  [0, -0.035, 0],
  [-0.1, -0.1, 0.08],
);
const facePlateRight = group(head, "facePlateRight", [0.145, 0.285, -0.285]);
mesh(
  facePlateRight,
  "right_cheek_plate",
  new RoundedBoxGeometry(0.24, 0.37, 0.075, 5, 0.06),
  materials.silicone,
  [0, -0.035, 0],
  [-0.1, 0.1, -0.08],
);

for (let side = -1; side <= 1; side += 2) {
  const socket = group(
    head,
    side < 0 ? "eyeSocketLeft" : "eyeSocketRight",
    [side * 0.122, 0.37, -0.318],
  );
  mesh(
    socket,
    side < 0 ? "eye_left_black" : "eye_right_black",
    new THREE.SphereGeometry(0.095, 20, 12),
    materials.eyeSocket,
    [0, 0, 0],
    [0, 0, 0],
    [1.08, 0.74, 0.48],
  );
  mesh(
    socket,
    side < 0 ? "pupilLeft" : "pupilRight",
    new THREE.SphereGeometry(0.026, 14, 10),
    materials.red,
    [0, -0.004, -0.046],
  );
  mesh(
    head,
    side < 0 ? "brow_left" : "brow_right",
    new RoundedBoxGeometry(0.15, 0.028, 0.035, 3, 0.01),
    materials.siliconeShadow,
    [side * 0.125, 0.465, -0.343],
    [0, side * 0.1, side * -0.12],
  );
}

mesh(
  head,
  "nose_bridge",
  new THREE.ConeGeometry(0.06, 0.22, 12),
  materials.silicone,
  [0, 0.27, -0.39],
  [Math.PI / 2, 0, 0],
);
mesh(
  head,
  "philtrum_plate",
  new RoundedBoxGeometry(0.15, 0.11, 0.04, 4, 0.025),
  materials.silicone,
  [0, 0.125, -0.35],
);

for (let side = -1; side <= 1; side += 2) {
  mesh(
    head,
    `ear_bearing_${side}`,
    new THREE.TorusGeometry(0.09, 0.025, 8, 20),
    materials.chrome,
    [side * 0.315, 0.3, -0.005],
    [0, Math.PI / 2, 0],
  );
  cable(
    head,
    `face_tendon_${side}`,
    [
      [side * 0.26, 0.17, -0.11],
      [side * 0.3, 0.27, -0.21],
      [side * 0.23, 0.42, -0.25],
    ],
    0.01,
    materials.copper,
  );
}

// Dark face seams sell the segmented silicone construction.
for (let seam = -1; seam <= 1; seam += 2) {
  mesh(
    head,
    `face_seam_${seam}`,
    new THREE.BoxGeometry(0.012, 0.37, 0.012),
    materials.siliconeShadow,
    [seam * 0.17, 0.265, -0.353],
    [-0.05, 0, seam * 0.28],
  );
}
mesh(
  head,
  "forehead_seam",
  new THREE.BoxGeometry(0.32, 0.012, 0.012),
  materials.siliconeShadow,
  [0, 0.52, -0.34],
  [0, 0, 0.08],
);

const jaw = group(head, "jaw", [0, 0.04, -0.305]);
mesh(
  jaw,
  "jaw_endoskeleton",
  new RoundedBoxGeometry(0.34, 0.16, 0.14, 4, 0.035),
  materials.chrome,
  [0, -0.02, 0],
);
mesh(
  jaw,
  "chin_plate",
  new RoundedBoxGeometry(0.29, 0.13, 0.075, 5, 0.04),
  materials.silicone,
  [0, -0.09, -0.08],
);
for (let tooth = -3; tooth <= 3; tooth += 1) {
  mesh(
    jaw,
    `lower_tooth_${tooth + 4}`,
    new THREE.BoxGeometry(0.032, 0.068, 0.028),
    materials.tooth,
    [tooth * 0.047, 0.025, -0.09],
  );
  mesh(
    head,
    `upper_tooth_${tooth + 4}`,
    new THREE.BoxGeometry(0.032, 0.065, 0.028),
    materials.tooth,
    [tooth * 0.047, 0.115, -0.402],
  );
}

const faceDecal = mesh(
  head,
  "faceDecal",
  new THREE.PlaneGeometry(0.68, 0.79, 8, 10),
  materials.faceDecal,
  [0, 0.32, -0.465],
  [0, Math.PI, 0],
);
faceDecal.renderOrder = 8;

// Layered curls are individually modeled tubes rather than a smooth black cap.
for (let curl = 0; curl < 15; curl += 1) {
  const angle = (curl / 15) * Math.PI * 2;
  const radius = 0.27 + (curl % 3) * 0.018;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius * 0.76 + 0.03;
  mesh(
    head,
    `hair_curl_${curl}`,
    new THREE.TorusGeometry(0.085 + (curl % 2) * 0.015, 0.022, 7, 16, Math.PI * 1.35),
    materials.lacquer,
    [x, 0.55 + (curl % 4) * 0.035, z],
    [Math.PI / 2 + angle * 0.12, angle, angle * 0.3],
  );
}

const hat = group(head, "hat", [0, 0.75, -0.005]);
hat.rotation.z = -0.085;
mesh(
  hat,
  "fedora_brim",
  new THREE.CylinderGeometry(0.48, 0.49, 0.045, 36),
  materials.lacquer,
  [0, 0, 0],
  [0.03, 0, 0],
  [1, 1, 0.8],
);
mesh(
  hat,
  "fedora_crown",
  new THREE.CylinderGeometry(0.28, 0.35, 0.37, 28),
  materials.blackFabric,
  [0, 0.19, 0.01],
  [0, 0, 0],
  [1, 1, 0.9],
);
mesh(
  hat,
  "fedora_dent",
  new THREE.SphereGeometry(0.19, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  materials.lacquer,
  [0, 0.39, -0.02],
  [Math.PI, 0, 0],
  [1, 0.22, 0.72],
);
mesh(
  hat,
  "fedora_band",
  new THREE.CylinderGeometry(0.355, 0.355, 0.055, 30),
  materials.ivory,
  [0, 0.09, 0],
);

function buildHand(parent, side, gloved) {
  const hand = group(parent, side < 0 ? "handLeft" : "handRight", [
    0,
    -0.74,
    0,
  ]);
  const handSurface = gloved ? materials.glove : materials.chrome;
  mesh(
    hand,
    "palm",
    new RoundedBoxGeometry(0.22, 0.28, 0.11, 4, 0.045),
    handSurface,
    [0, 0, 0],
    [0, 0, side * 0.04],
  );
  for (let finger = -2; finger <= 2; finger += 1) {
    const fingerLength = 0.18 - Math.abs(finger) * 0.018;
    const fingerObject = mesh(
      hand,
      `finger_${finger + 3}`,
      new THREE.CapsuleGeometry(0.022, fingerLength, 3, 7),
      handSurface,
      [finger * 0.045, -0.19 - Math.abs(finger) * 0.008, -0.025],
      [0.08, 0, finger * 0.06],
    );
    fingerObject.scale.z = 0.74;
  }
  mesh(
    hand,
    "thumb",
    new THREE.CapsuleGeometry(0.028, 0.15, 3, 7),
    handSurface,
    [side * 0.14, -0.06, -0.01],
    [0.08, 0, side * -0.68],
  );
  if (gloved) {
    for (let crystal = 0; crystal < 9; crystal += 1) {
      const cx = ((crystal % 3) - 1) * 0.065;
      const cy = Math.floor(crystal / 3) * 0.065 - 0.07;
      mesh(
        hand,
        `glove_crystal_${crystal}`,
        new THREE.OctahedronGeometry(0.018, 0),
        materials.chrome,
        [cx, cy, -0.07],
      );
    }
  }
  return hand;
}

function buildArm(side, jacketSleeve) {
  const arm = group(
    hips,
    side < 0 ? "armLeft" : "armRight",
    [side * 0.58, 0.66, 0],
  );
  bearing(arm, "shoulder_bearing", [0, 0, 0], 0.18);

  if (jacketSleeve) {
    mesh(
      arm,
      "upper_sleeve",
      new THREE.CapsuleGeometry(0.16, 0.5, 7, 12),
      materials.ivory,
      [0, -0.39, 0],
    );
    mesh(
      arm,
      "sleeve_seam",
      new THREE.BoxGeometry(0.018, 0.55, 0.022),
      materials.ivoryEdge,
      [side * 0.16, -0.39, -0.04],
    );
  } else {
    for (let rail = -1; rail <= 1; rail += 2) {
      const upperRail = piston(
        arm,
        `upper_arm_piston_${rail}`,
        [rail * 0.07, -0.36, 0],
        0.58,
        0.034,
      );
      upperRail.rotation.z = rail * 0.04;
    }
    cable(
      arm,
      "upper_arm_cable",
      [
        [side * 0.06, -0.08, 0.07],
        [0, -0.38, 0.11],
        [side * -0.05, -0.69, 0.04],
      ],
      0.015,
      materials.copper,
    );
  }

  bearing(arm, "elbow_bearing", [0, -0.79, 0], 0.13);
  const forearm = group(arm, side < 0 ? "forearmLeft" : "forearmRight", [
    0,
    -0.8,
    0,
  ]);
  if (jacketSleeve) {
    mesh(
      forearm,
      "lower_sleeve",
      new THREE.CapsuleGeometry(0.135, 0.46, 7, 12),
      materials.ivory,
      [0, -0.34, 0],
    );
    mesh(
      forearm,
      "cuff",
      new THREE.CylinderGeometry(0.15, 0.13, 0.11, 16),
      materials.blackFabric,
      [0, -0.68, 0],
    );
  } else {
    for (let rail = -1; rail <= 1; rail += 2) {
      piston(
        forearm,
        `forearm_piston_${rail}`,
        [rail * 0.065, -0.32, 0],
        0.5,
        0.03,
      );
    }
    mesh(
      forearm,
      "forearm_cage",
      new THREE.CylinderGeometry(0.12, 0.1, 0.58, 8, 1, true),
      materials.chrome,
      [0, -0.33, 0],
    );
  }
  buildHand(forearm, side, side < 0);
  return arm;
}

buildArm(-1, true);
buildArm(1, false);

function buildLeg(side) {
  const leg = group(
    hips,
    side < 0 ? "legLeft" : "legRight",
    [side * 0.245, -0.28, 0],
  );
  mesh(
    leg,
    "upper_trouser",
    new THREE.CapsuleGeometry(0.18, 0.68, 7, 13),
    materials.blackFabric,
    [0, -0.46, 0],
  );
  mesh(
    leg,
    "trouser_press",
    new THREE.BoxGeometry(0.016, 0.72, 0.02),
    materials.lacquer,
    [0, -0.46, -0.18],
  );
  bearing(leg, "knee_bearing", [0, -0.89, 0], 0.145);

  const shin = group(leg, side < 0 ? "shinLeft" : "shinRight", [0, -0.9, 0]);
  mesh(
    shin,
    "lower_trouser",
    new THREE.CapsuleGeometry(0.145, 0.61, 7, 13),
    materials.blackFabric,
    [0, -0.42, 0],
  );
  for (let rail = -1; rail <= 1; rail += 2) {
    const anklePiston = piston(
      shin,
      `ankle_piston_${rail}`,
      [rail * 0.07, -0.79, 0],
      0.26,
      0.025,
    );
    anklePiston.rotation.z = rail * 0.08;
  }
  mesh(
    shin,
    "white_spat",
    new RoundedBoxGeometry(0.29, 0.2, 0.34, 4, 0.04),
    materials.glove,
    [0, -0.82, -0.055],
  );
  mesh(
    shin,
    "loafer",
    new RoundedBoxGeometry(0.36, 0.18, 0.67, 5, 0.07),
    materials.lacquer,
    [0, -0.96, -0.16],
  );
  mesh(
    shin,
    "heel",
    new RoundedBoxGeometry(0.29, 0.12, 0.2, 4, 0.04),
    materials.darkMetal,
    [0, -1.04, 0.08],
  );
  return leg;
}

buildLeg(-1);
buildLeg(1);

const performanceSkin = mesh(
  root,
  "performanceSkin",
  new THREE.PlaneGeometry(1.49, 4.12, 10, 24),
  materials.performanceSkin,
  [0, 1.9, -0.58],
  [0, Math.PI, 0],
);
performanceSkin.renderOrder = 7;

// Compact, named spotlight lenses enhance the red-eyed silhouette in dark corridors.
const eyeGlowLeft = new THREE.PointLight(0xff1308, 0.42, 2.2, 2);
eyeGlowLeft.name = "eyeGlowLeft";
eyeGlowLeft.position.set(-0.122, 0.37, -0.42);
head.add(eyeGlowLeft);
const eyeGlowRight = eyeGlowLeft.clone();
eyeGlowRight.name = "eyeGlowRight";
eyeGlowRight.position.x = 0.122;
head.add(eyeGlowRight);

root.scale.setScalar(0.92);

function cyclic(name, duration, legSwing, armSwing, hipsTravel) {
  const times = [
    0,
    duration * 0.25,
    duration * 0.5,
    duration * 0.75,
    duration,
  ];
  const quaternionValues = (angles, axis = "x") =>
    angles.flatMap((angle) => {
      const euler =
        axis === "z"
          ? new THREE.Euler(0, 0, angle)
          : new THREE.Euler(angle, 0, 0);
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      return quaternion.toArray();
    });
  return new THREE.AnimationClip(name, duration, [
    new THREE.QuaternionKeyframeTrack(
      "legLeft.quaternion",
      times,
      quaternionValues([0, legSwing, 0, -legSwing, 0]),
    ),
    new THREE.QuaternionKeyframeTrack(
      "legRight.quaternion",
      times,
      quaternionValues([0, -legSwing, 0, legSwing, 0]),
    ),
    new THREE.QuaternionKeyframeTrack(
      "armLeft.quaternion",
      times,
      quaternionValues([0, -armSwing, 0, armSwing, 0]),
    ),
    new THREE.QuaternionKeyframeTrack(
      "armRight.quaternion",
      times,
      quaternionValues([0, armSwing, 0, -armSwing, 0]),
    ),
    new THREE.VectorKeyframeTrack(
      "hips.position",
      [0, duration * 0.5, duration],
      [0, 1.78, 0, 0, 1.78, hipsTravel, 0, 1.78, 0],
    ),
    new THREE.QuaternionKeyframeTrack(
      "torso.quaternion",
      times,
      quaternionValues(
        [0, -armSwing * 0.08, 0, armSwing * 0.08, 0],
        "z",
      ),
    ),
  ]);
}

const animations = [
  cyclic("idle", 2.4, 0.025, 0.02, 0.012),
  cyclic("moonwalk", 1.18, 0.42, 0.2, -0.12),
  cyclic("investigate", 0.92, 0.3, 0.18, -0.06),
  cyclic("chase", 0.54, 0.62, 0.48, -0.08),
];

const exporter = new GLTFExporter();
const arrayBuffer = await new Promise((resolve, reject) => {
  exporter.parse(
    root,
    resolve,
    reject,
    {
      binary: true,
      animations,
      includeCustomExtensions: false,
      onlyVisible: false,
      trs: true,
    },
  );
});

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

const stats = await fs.stat(outputPath);
console.log(
  JSON.stringify({
    output: outputPath,
    bytes: stats.size,
    meshes: root.getObjectsByProperty("isMesh", true).length,
    materials: Object.keys(materials).length,
    animations: animations.map((clip) => clip.name),
  }),
);
