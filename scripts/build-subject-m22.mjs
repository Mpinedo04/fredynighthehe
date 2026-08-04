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

const outputDirectoryArgument = process.argv.find((argument) =>
  argument.startsWith("--out-dir="),
);
const outputDirectory = path.resolve(
  outputDirectoryArgument?.slice("--out-dir=".length) || "public/models",
);
const outputPath = path.join(outputDirectory, "subject-m22.glb");

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
  lip: new THREE.MeshPhysicalMaterial({
    name: "AGED_SYNTHETIC_LIP",
    color: 0x4d3635,
    roughness: 0.58,
    metalness: 0.01,
    clearcoat: 0.2,
    clearcoatRoughness: 0.54,
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
    roughness: 0.42,
    metalness: 0.14,
    clearcoat: 0.26,
    clearcoatRoughness: 0.38,
  }),
  red: new THREE.MeshStandardMaterial({
    name: "RED_SERVO_EMISSION",
    color: 0x210000,
    emissive: 0xff1108,
    emissiveIntensity: 5.8,
    roughness: 0.25,
    metalness: 0.46,
  }),
};

const root = new THREE.Group();
root.name = "SUJETO_M22";
root.position.y = 0;

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

function extrudedPanel(
  parent,
  name,
  points,
  surface,
  z = -0.39,
  depth = 0.11,
  bevelSize = 0.022,
) {
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
      depth,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize,
      bevelThickness: Math.min(0.018, depth * 0.42),
      curveSegments: 6,
    }),
    surface,
    [0, 0, z],
  );
}

function curvedFacePlateGeometry(
  points,
  {
    depth = 0.065,
    bulge = 0.035,
    pivotX = 0,
    pivotY = 0,
    sideRecession = 0.052,
    cheekProjection = 0.028,
  } = {},
) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 2,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    curveSegments: 8,
  });
  const position = geometry.attributes.position;
  const bounds = new THREE.Box3().setFromBufferAttribute(position);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    if (vertex.z < depth * 0.45) continue;
    const normalizedX = (vertex.x - center.x) / Math.max(0.001, size.x * 0.5);
    const normalizedY = (vertex.y - center.y) / Math.max(0.001, size.y * 0.5);
    const falloff = Math.max(
      0,
      1 - normalizedX * normalizedX * 0.72 - normalizedY * normalizedY * 0.36,
    );
    // The plate is rotated by PI around Y when mounted, so positive local Z
    // becomes projection towards the viewer. Recessing the outer edge makes the
    // mask wrap around the skull instead of reading as a vertical slab in profile.
    const faceX = pivotX - vertex.x;
    const faceY = pivotY + vertex.y;
    const lateral = Math.min(1, Math.abs(faceX) / 0.275);
    const cheekCenter = Math.exp(
      -Math.pow((Math.abs(faceX) - 0.155) / 0.075, 2) -
        Math.pow((faceY - 0.235) / 0.17, 2),
    );
    const projection =
      bulge * falloff +
      cheekProjection * cheekCenter -
      sideRecession * Math.pow(lateral, 1.75);
    position.setZ(index, vertex.z + projection);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function almondShape(width, height) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.bezierCurveTo(
    -width * 0.22,
    halfHeight,
    width * 0.22,
    halfHeight,
    halfWidth,
    0,
  );
  shape.bezierCurveTo(
    width * 0.22,
    -halfHeight,
    -width * 0.22,
    -halfHeight,
    -halfWidth,
    0,
  );
  return shape;
}

function almondGeometry(width, height, depth = 0.035) {
  return new THREE.ExtrudeGeometry(almondShape(width, height), {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.006,
    bevelThickness: 0.005,
    curveSegments: 14,
  });
}

function almondRingGeometry(
  width,
  height,
  rim = 0.018,
  depth = 0.04,
) {
  const shape = almondShape(width, height);
  const hole = almondShape(width - rim * 2, height - rim * 1.65);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.005,
    bevelThickness: 0.004,
    curveSegments: 14,
  });
}

function taperedCapsuleGeometry(
  radius,
  length,
  topScale = 1,
  bottomScale = 0.78,
  capSegments = 7,
  radialSegments = 13,
) {
  const geometry = new THREE.CapsuleGeometry(
    radius,
    length,
    capSegments,
    radialSegments,
  );
  const position = geometry.attributes.position;
  const bounds = new THREE.Box3().setFromBufferAttribute(position);
  const span = Math.max(0.001, bounds.max.y - bounds.min.y);
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    const t = THREE.MathUtils.clamp((y - bounds.min.y) / span, 0, 1);
    const taper = THREE.MathUtils.lerp(bottomScale, topScale, t);
    position.setX(index, position.getX(index) * taper);
    position.setZ(index, position.getZ(index) * taper);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function tailoredJacketGeometry() {
  const geometry = new RoundedBoxGeometry(0.86, 1.7, 0.17, 7, 0.065);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    const shoulder = THREE.MathUtils.smoothstep(y, 0.25, 0.7);
    const waist = Math.exp(-Math.pow((y + 0.12) / 0.28, 2));
    const hem = 1 - THREE.MathUtils.smoothstep(y, -0.72, -0.38);
    const widthScale = 0.94 + shoulder * 0.13 - waist * 0.16 + hem * 0.07;
    position.setX(index, position.getX(index) * widthScale);
    if (y > 0.38) {
      const shoulderDrop = Math.pow(
        Math.abs(position.getX(index)) / 0.46,
        2.2,
      );
      position.setY(index, y - shoulderDrop * 0.075);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function organicLapelGeometry(side) {
  const shape = new THREE.Shape();
  shape.moveTo(side * 0.085, 0.61);
  shape.bezierCurveTo(
    side * 0.17,
    0.62,
    side * 0.27,
    0.59,
    side * 0.32,
    0.53,
  );
  shape.bezierCurveTo(
    side * 0.3,
    0.38,
    side * 0.22,
    0.18,
    side * 0.045,
    -0.02,
  );
  shape.bezierCurveTo(
    side * 0.12,
    0.05,
    side * 0.15,
    0.26,
    side * 0.12,
    0.42,
  );
  shape.bezierCurveTo(
    side * 0.105,
    0.51,
    side * 0.09,
    0.57,
    side * 0.085,
    0.61,
  );
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.008,
    bevelThickness: 0.007,
    curveSegments: 14,
  });
}

function trouserLegGeometry(length, upperWidth, lowerWidth, upperDepth, lowerDepth) {
  const geometry = new THREE.CylinderGeometry(1, 1, length, 18, 10, false);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    const t = THREE.MathUtils.clamp(y / length + 0.5, 0, 1);
    const anatomicalEase = t * t * (3 - 2 * t);
    const width = THREE.MathUtils.lerp(lowerWidth, upperWidth, anatomicalEase);
    const depth = THREE.MathUtils.lerp(lowerDepth, upperDepth, anatomicalEase);
    position.setX(index, position.getX(index) * width);
    position.setZ(index, position.getZ(index) * depth);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function projectFaceUvs(faceRoot, faceMeshes) {
  root.updateMatrixWorld(true);
  faceRoot.updateMatrixWorld(true);
  const inverseHeadMatrix = faceRoot.matrixWorld.clone().invert();
  const vertex = new THREE.Vector3();
  for (const faceMesh of faceMeshes) {
    faceMesh.updateMatrixWorld(true);
    const positions = faceMesh.geometry.attributes.position;
    const uvs = new Float32Array(positions.count * 2);
    for (let index = 0; index < positions.count; index += 1) {
      vertex
        .fromBufferAttribute(positions, index)
        .applyMatrix4(faceMesh.matrixWorld)
        .applyMatrix4(inverseHeadMatrix);
      // Leave a narrow atlas gutter around the now-taller face. Keeping every
      // vertex away from the clamp boundaries also prevents the forehead and
      // chin rows from collapsing into degenerate UV triangles.
      uvs[index * 2] = THREE.MathUtils.clamp((vertex.x + 0.34) / 0.68, 0, 1);
      uvs[index * 2 + 1] = THREE.MathUtils.clamp(
        (vertex.y + 0.24) / 1.04,
        0,
        1,
      );
    }
    faceMesh.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  }
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

// Keep the longer, human-proportioned legs above the world floor. The loafer
// sole now lands at y≈0 when the subject root is staged at y=0.
const hips = group(root, "hips", [0, 2.38, 0]);

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
mesh(
  hips,
  "trouser_waist",
  new RoundedBoxGeometry(0.51, 0.34, 0.3, 6, 0.07),
  materials.blackFabric,
  [0, -0.25, 0],
);

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
  tailoredJacketGeometry(),
  materials.ivory,
  [0, -0.05, 0.2],
);
extrudedPanel(
  torso,
  "jacket_panel_left",
  [
    [-0.43, 0.65],
    [-0.13, 0.59],
    [-0.055, 0.08],
    [-0.075, -0.92],
    [-0.38, -0.9],
    [-0.34, -0.15],
    [-0.39, 0.3],
  ],
  materials.ivory,
  -0.445,
  0.075,
  0.016,
);
extrudedPanel(
  torso,
  "jacket_panel_right",
  [
    [0.13, 0.59],
    [0.43, 0.65],
    [0.39, 0.3],
    [0.34, -0.15],
    [0.38, -0.9],
    [0.075, -0.92],
    [0.055, 0.08],
  ],
  materials.ivory,
  -0.445,
  0.075,
  0.016,
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

// Bezier lapels curve from collar to waist instead of forming hard prisms.
mesh(
  torso,
  "lapel_left",
  organicLapelGeometry(-1),
  materials.ivoryEdge,
  [0, 0, -0.49],
);
mesh(
  torso,
  "lapel_right",
  organicLapelGeometry(1),
  materials.ivoryEdge,
  [0, 0, -0.49],
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

extrudedPanel(
  hips,
  "jacket_tail_left",
  [
    [-0.4, 0.18],
    [-0.02, 0.12],
    [-0.035, -0.68],
    [-0.35, -0.65],
  ],
  materials.ivory,
  0.08,
  0.11,
  0.018,
);
extrudedPanel(
  hips,
  "jacket_tail_right",
  [
    [0.02, 0.12],
    [0.4, 0.18],
    [0.35, -0.65],
    [0.035, -0.68],
  ],
  materials.ivory,
  0.08,
  0.11,
  0.018,
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
  [0, 0.3, 0.005],
  [0, 0, 0],
  [0.76, 1.2, 0.88],
);

// Facial plates are separate, thick volumes so the game can mechanically open
// them without revealing a flat photographic card.
const texturedFaceMeshes = [];
const foreheadPlate = group(head, "foreheadPlate", [0, 0, 0]);
const foreheadShell = mesh(
  foreheadPlate,
  "forehead_shell",
  new THREE.SphereGeometry(
    0.365,
    30,
    16,
    0,
    Math.PI * 2,
    0.1,
    Math.PI * 0.49,
  ),
  materials.silicone,
  [0, 0.38, -0.018],
  [0, 0, 0],
  [0.74, 1.08, 0.88],
);
texturedFaceMeshes.push(foreheadShell);

const facePlateLeft = group(head, "facePlateLeft", [-0.135, 0.29, -0.285]);
const leftCheekPlate = mesh(
  facePlateLeft,
  "left_cheek_plate",
  curvedFacePlateGeometry(
    [
      [-0.135, 0.15],
      [0.105, 0.145],
      [0.14, 0.055],
      [0.115, -0.2],
      [0.055, -0.275],
      [-0.075, -0.235],
      [-0.15, -0.095],
    ],
    {
      depth: 0.075,
      bulge: 0.052,
      pivotX: -0.135,
      pivotY: 0.29,
      sideRecession: 0.072,
      cheekProjection: 0.042,
    },
  ),
  [materials.silicone, materials.siliconeShadow],
  [0, -0.015, -0.055],
  [0, Math.PI, 0.018],
);
texturedFaceMeshes.push(leftCheekPlate);
const leftMalar = mesh(
  facePlateLeft,
  "left_malar_volume",
  new THREE.SphereGeometry(0.1, 20, 14),
  materials.silicone,
  [-0.005, -0.055, -0.178],
  [0.04, 0.16, 0.05],
  [1.12, 0.72, 0.62],
);
texturedFaceMeshes.push(leftMalar);
const facePlateRight = group(head, "facePlateRight", [0.135, 0.29, -0.285]);
const rightCheekPlate = mesh(
  facePlateRight,
  "right_cheek_plate",
  curvedFacePlateGeometry(
    [
      [-0.105, 0.145],
      [0.135, 0.15],
      [0.15, -0.095],
      [0.075, -0.235],
      [-0.055, -0.275],
      [-0.115, -0.2],
      [-0.14, 0.055],
    ],
    {
      depth: 0.075,
      bulge: 0.052,
      pivotX: 0.135,
      pivotY: 0.29,
      sideRecession: 0.072,
      cheekProjection: 0.042,
    },
  ),
  [materials.silicone, materials.siliconeShadow],
  [0, -0.015, -0.055],
  [0, Math.PI, -0.018],
);
texturedFaceMeshes.push(rightCheekPlate);
const rightMalar = mesh(
  facePlateRight,
  "right_malar_volume",
  new THREE.SphereGeometry(0.1, 20, 14),
  materials.silicone,
  [0.005, -0.055, -0.178],
  [0.04, -0.16, -0.05],
  [1.12, 0.72, 0.62],
);
texturedFaceMeshes.push(rightMalar);

for (const [side, plate] of [
  [-1, facePlateLeft],
  [1, facePlateRight],
]) {
  const innerX = side < 0 ? 0.105 : -0.105;
  const outerX = side < 0 ? -0.115 : 0.115;
  cable(
    plate,
    side < 0 ? "face_plate_inner_edge_left" : "face_plate_inner_edge_right",
    [
      [innerX, 0.105, -0.18],
      [innerX + side * 0.012, -0.04, -0.202],
      [innerX - side * 0.028, -0.19, -0.172],
    ],
    0.007,
    materials.siliconeShadow,
    22,
  );
  cable(
    plate,
    side < 0 ? "face_plate_outer_edge_left" : "face_plate_outer_edge_right",
    [
      [outerX, 0.09, -0.085],
      [outerX + side * 0.008, -0.05, -0.105],
      [outerX - side * 0.025, -0.205, -0.09],
    ],
    0.009,
    materials.darkMetal,
    22,
  );
  mesh(
    plate,
    side < 0 ? "face_hinge_left" : "face_hinge_right",
    new THREE.CylinderGeometry(0.026, 0.026, 0.19, 12),
    materials.darkMetal,
    [outerX + side * 0.016, -0.015, 0.004],
  );
  for (let hingePin = -1; hingePin <= 1; hingePin += 2) {
    mesh(
      plate,
      `${side < 0 ? "face_hinge_left" : "face_hinge_right"}_pin_${hingePin}`,
      new THREE.TorusGeometry(0.029, 0.006, 6, 14),
      materials.copper,
      [outerX + side * 0.016, hingePin * 0.078 - 0.015, 0.004],
      [Math.PI / 2, 0, 0],
    );
  }
  const nasolabialFold = mesh(
    plate,
    side < 0 ? "nasolabial_fold_left" : "nasolabial_fold_right",
    new THREE.CapsuleGeometry(0.009, 0.12, 5, 9),
    materials.siliconeShadow,
    [side < 0 ? 0.066 : -0.066, -0.175, -0.2],
    [-0.06, 0, side * 0.23],
    [1, 1, 0.68],
  );
  texturedFaceMeshes.push(nasolabialFold);
}

for (let side = -1; side <= 1; side += 2) {
  const socket = group(
    head,
    side < 0 ? "eyeSocketLeft" : "eyeSocketRight",
    [side * 0.112, 0.405, -0.425],
  );
  mesh(
    socket,
    side < 0 ? "eye_left_black" : "eye_right_black",
    almondGeometry(0.17, 0.082, 0.032),
    materials.eyeSocket,
    [0, 0, 0],
    [0, 0, side * -0.055],
  );
  mesh(
    socket,
    side < 0 ? "pupilLeft" : "pupilRight",
    new THREE.SphereGeometry(0.035, 16, 12),
    materials.red,
    [0, -0.002, -0.014],
    [0, 0, 0],
    [0.82, 1, 0.48],
  );
  const lowerOrbit = mesh(
    head,
    side < 0 ? "lower_orbit_left" : "lower_orbit_right",
    almondRingGeometry(0.205, 0.118, 0.02, 0.042),
    materials.silicone,
    [side * 0.112, 0.405, -0.45],
    [0, 0, side * -0.055],
  );
  texturedFaceMeshes.push(lowerOrbit);
  cable(
    head,
    side < 0 ? "brow_left" : "brow_right",
    [
      [side * 0.19, 0.493, -0.425],
      [side * 0.112, 0.515, -0.46],
      [side * 0.04, 0.5, -0.445],
    ],
    0.011,
    materials.siliconeShadow,
    20,
  );
}

const noseBridge = mesh(
  head,
  "nose_bridge",
  new THREE.CapsuleGeometry(0.047, 0.205, 9, 18),
  materials.silicone,
  [0, 0.292, -0.435],
  [-0.08, 0, 0],
  [0.7, 1, 0.78],
);
const noseTip = mesh(
  head,
  "nose_tip",
  new THREE.SphereGeometry(0.075, 24, 16),
  materials.silicone,
  [0, 0.157, -0.49],
  [0, 0, 0],
  [0.86, 0.65, 0.92],
);
texturedFaceMeshes.push(noseBridge, noseTip);
for (let side = -1; side <= 1; side += 2) {
  const noseWing = mesh(
    head,
    side < 0 ? "nose_wing_left" : "nose_wing_right",
    new THREE.SphereGeometry(0.038, 18, 12),
    materials.silicone,
    [side * 0.047, 0.15, -0.474],
    [0, 0, 0],
    [1, 0.62, 0.72],
  );
  texturedFaceMeshes.push(noseWing);
  mesh(
    head,
    side < 0 ? "nostril_left" : "nostril_right",
    new THREE.SphereGeometry(0.014, 12, 8),
    materials.eyeSocket,
    [side * 0.036, 0.142, -0.515],
    [0, 0, 0],
    [1.1, 0.46, 0.35],
  );
}
const philtrumPlate = mesh(
  head,
  "philtrum_plate",
  new THREE.CapsuleGeometry(0.034, 0.085, 6, 12),
  materials.silicone,
  [0, 0.083, -0.446],
  [0, 0, 0],
  [1.55, 1, 0.68],
);
texturedFaceMeshes.push(philtrumPlate);

for (let side = -1; side <= 1; side += 2) {
  const philtrumRidge = mesh(
    head,
    side < 0 ? "philtrum_ridge_left" : "philtrum_ridge_right",
    new THREE.CapsuleGeometry(0.008, 0.065, 4, 8),
    materials.siliconeShadow,
    [side * 0.018, 0.086, -0.484],
    [0.05, 0, side * -0.1],
  );
  texturedFaceMeshes.push(philtrumRidge);
}

mesh(
  head,
  "oral_cavity",
  almondGeometry(0.19, 0.042, 0.02),
  materials.eyeSocket,
  [0, 0.026, -0.477],
);

mesh(
  head,
  "upper_lip_left",
  new THREE.CapsuleGeometry(0.018, 0.085, 5, 12),
  materials.lip,
  [-0.042, 0.045, -0.502],
  [0, 0, Math.PI / 2 - 0.12],
  [1.1, 1, 0.78],
);
mesh(
  head,
  "upper_lip_right",
  new THREE.CapsuleGeometry(0.018, 0.085, 5, 12),
  materials.lip,
  [0.042, 0.045, -0.502],
  [0, 0, Math.PI / 2 + 0.12],
  [1.1, 1, 0.78],
);
mesh(
  head,
  "lower_lip",
  new THREE.CapsuleGeometry(0.024, 0.155, 6, 16),
  materials.lip,
  [0, 0.007, -0.499],
  [0, 0, Math.PI / 2],
  [1.08, 1, 0.8],
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
  cable(
    head,
    `face_seam_${seam}`,
    [
      [seam * 0.205, 0.44, -0.414],
      [seam * 0.235, 0.31, -0.408],
      [seam * 0.225, 0.16, -0.405],
      [seam * 0.18, 0.035, -0.432],
    ],
    0.006,
    materials.siliconeShadow,
    24,
  );
}
cable(
  head,
  "forehead_seam",
  [
    [-0.19, 0.54, -0.382],
    [-0.07, 0.565, -0.42],
    [0.07, 0.565, -0.42],
    [0.19, 0.54, -0.382],
  ],
  0.006,
  materials.siliconeShadow,
  24,
);

const jaw = group(head, "jaw", [0, 0.025, -0.305]);
mesh(
  jaw,
  "jaw_endoskeleton",
  new RoundedBoxGeometry(0.31, 0.14, 0.13, 5, 0.035),
  materials.chrome,
  [0, -0.035, 0],
);
const chinPlate = mesh(
  jaw,
  "chin_plate",
  new THREE.SphereGeometry(0.155, 24, 16),
  materials.silicone,
  [0, -0.12, -0.17],
  [0.04, 0, 0],
  [1, 0.62, 0.6],
);
texturedFaceMeshes.push(chinPlate);
for (let side = -1; side <= 1; side += 2) {
  const jawSide = mesh(
    jaw,
    side < 0 ? "jawline_left" : "jawline_right",
    new THREE.CapsuleGeometry(0.047, 0.17, 6, 12),
    materials.silicone,
    [side * 0.105, -0.065, -0.155],
    [0.02, 0, side * -0.43],
    [1, 1, 0.72],
  );
  texturedFaceMeshes.push(jawSide);
}
const chinGroove = mesh(
  jaw,
  "chin_groove",
  new THREE.CapsuleGeometry(0.008, 0.095, 4, 9),
  materials.siliconeShadow,
  [0, -0.055, -0.267],
  [0, 0, Math.PI / 2],
);
texturedFaceMeshes.push(chinGroove);
for (let tooth = -3; tooth <= 3; tooth += 1) {
  mesh(
    jaw,
    `lower_tooth_${tooth + 4}`,
    new THREE.BoxGeometry(0.032, 0.068, 0.028),
    materials.tooth,
    [tooth * 0.042, -0.015, -0.13],
  );
  mesh(
    head,
    `upper_tooth_${tooth + 4}`,
    new THREE.BoxGeometry(0.032, 0.065, 0.028),
    materials.tooth,
    [tooth * 0.042, 0.018, -0.455],
  );
}

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

const hat = group(head, "hat", [0, 0.64, -0.005]);
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
    [side * 0.52, 0.68, 0],
  );
  bearing(arm, "shoulder_bearing", [0, 0, 0], 0.16);

  if (jacketSleeve) {
    mesh(
      arm,
      "upper_sleeve",
      taperedCapsuleGeometry(0.145, 0.57, 1.13, 0.8, 7, 12),
      materials.ivory,
      [0, -0.42, 0],
    );
    mesh(
      arm,
      "sleeve_seam",
      new THREE.BoxGeometry(0.018, 0.55, 0.022),
      materials.ivoryEdge,
      [side * 0.145, -0.42, -0.04],
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

  bearing(arm, "elbow_bearing", [0, -0.86, 0], 0.12);
  const forearm = group(arm, side < 0 ? "forearmLeft" : "forearmRight", [
    0,
    -0.87,
    0,
  ]);
  if (jacketSleeve) {
    mesh(
      forearm,
      "lower_sleeve",
      taperedCapsuleGeometry(0.122, 0.52, 1.05, 0.78, 7, 12),
      materials.ivory,
      [0, -0.37, 0],
    );
    mesh(
      forearm,
      "cuff",
      new THREE.CylinderGeometry(0.132, 0.112, 0.1, 16),
      materials.blackFabric,
      [0, -0.73, 0],
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
    [side * 0.218, -0.28, 0],
  );
  mesh(
    leg,
    "upper_trouser",
    trouserLegGeometry(0.82, 0.19, 0.125, 0.135, 0.105),
    materials.blackFabric,
    [0, -0.55, 0],
  );
  mesh(
    leg,
    "trouser_press",
    new THREE.BoxGeometry(0.016, 0.72, 0.02),
    materials.lacquer,
    [0, -0.55, -0.137],
  );
  bearing(leg, "knee_bearing", [0, -1.01, 0], 0.13);

  const shin = group(leg, side < 0 ? "shinLeft" : "shinRight", [0, -1.02, 0]);
  mesh(
    shin,
    "lower_trouser",
    trouserLegGeometry(0.74, 0.13, 0.09, 0.11, 0.085),
    materials.blackFabric,
    [0, -0.48, 0],
  );
  mesh(
    shin,
    "lower_trouser_press",
    new THREE.BoxGeometry(0.012, 0.68, 0.012),
    materials.lacquer,
    [0, -0.48, -0.112],
  );
  for (let rail = -1; rail <= 1; rail += 2) {
    const anklePiston = piston(
      shin,
      `ankle_piston_${rail}`,
      [rail * 0.062, -0.9, 0],
      0.26,
      0.025,
    );
    anklePiston.rotation.z = rail * 0.08;
  }
  mesh(
    shin,
    "white_spat",
    new RoundedBoxGeometry(0.255, 0.17, 0.38, 4, 0.038),
    materials.glove,
    [0, -0.84, -0.07],
  );
  mesh(
    shin,
    "loafer",
    new RoundedBoxGeometry(0.315, 0.145, 0.78, 6, 0.06),
    materials.lacquer,
    [0, -0.96, -0.23],
  );
  mesh(
    shin,
    "heel",
    new RoundedBoxGeometry(0.255, 0.1, 0.2, 4, 0.035),
    materials.darkMetal,
    [0, -1.03, 0.07],
  );
  return leg;
}

buildLeg(-1);
buildLeg(1);

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
projectFaceUvs(head, texturedFaceMeshes);

// Parametric deformation and non-uniform tailoring can leave normals a few
// ulps away from unit length. Normalize every exported primitive explicitly so
// GLTFExporter never has to synthesize replacement normal accessors.
let triangleCount = 0;
root.traverse((object) => {
  if (!object.isMesh) return;
  const geometry = object.geometry;
  if (geometry.attributes.normal) {
    const normal = geometry.attributes.normal;
    const vector = new THREE.Vector3();
    for (let index = 0; index < normal.count; index += 1) {
      vector.fromBufferAttribute(normal, index);
      if (vector.lengthSq() < 1e-12) vector.set(1, 0, 0);
      else vector.normalize();
      normal.setXYZ(index, vector.x, vector.y, vector.z);
    }
    normal.needsUpdate = true;
  }
  triangleCount += geometry.index
    ? geometry.index.count / 3
    : geometry.attributes.position.count / 3;
});

function cyclic(name, duration, legSwing, armSwing, hipsTravel) {
  const hipsRestHeight = hips.position.y;
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
      [
        0,
        hipsRestHeight,
        0,
        0,
        hipsRestHeight,
        hipsTravel,
        0,
        hipsRestHeight,
        0,
      ],
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
    triangles: Math.round(triangleCount),
    materials: Object.keys(materials).length,
    animations: animations.map((clip) => clip.name),
  }),
);
