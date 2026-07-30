import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const requiredNodes = [
  "hips",
  "torso",
  "head",
  "jaw",
  "hat",
  "facePlateLeft",
  "facePlateRight",
  "faceDecal",
  "performanceSkin",
  "pupilLeft",
  "pupilRight",
  "chestCore",
  "armLeft",
  "armRight",
  "legLeft",
  "legRight",
];

async function loadSubjectModel() {
  const bytes = await readFile("public/models/subject-m22.glb");
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, "", resolve, reject);
  });
}

test("SUBJECT M-22 GLB contains the detailed rig and state animations", async () => {
  const gltf = await loadSubjectModel();
  for (const nodeName of requiredNodes) {
    assert.ok(
      gltf.scene.getObjectByName(nodeName),
      `missing required rig node ${nodeName}`,
    );
  }

  assert.deepEqual(
    gltf.animations.map((clip) => clip.name).sort(),
    ["chase", "idle", "investigate", "moonwalk"],
  );

  let meshes = 0;
  let triangles = 0;
  const materialNames = new Set();
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes += 1;
    const positionCount = object.geometry.attributes.position?.count ?? 0;
    triangles += object.geometry.index
      ? object.geometry.index.count / 3
      : positionCount / 3;
    const surfaces = Array.isArray(object.material)
      ? object.material
      : [object.material];
    surfaces.forEach((surface) => materialNames.add(surface.name));
  });

  assert.ok(meshes >= 150, `expected detailed model, received ${meshes} meshes`);
  assert.ok(triangles >= 30_000, `model is unexpectedly simple: ${triangles}`);
  assert.ok(triangles <= 180_000, `model exceeds the browser budget: ${triangles}`);
  assert.ok(materialNames.has("CRACKED_SILICONE_MASK"));
  assert.ok(materialNames.has("AGED_IVORY_SUIT"));
  assert.ok(materialNames.has("BRUSHED_ENDOSKELETON"));
  assert.ok(materialNames.has("CRYSTAL_PERFORMANCE_GLOVE"));
});

test("SUBJECT M-22 ships its high-resolution facial material", async () => {
  for (const asset of [
    "public/models/subject-m22-face-v2.png",
    "public/models/subject-m22-performance-skin.png",
  ]) {
    const texture = await readFile(asset);
    assert.ok(texture.byteLength > 500_000);
    assert.deepEqual(
      [...texture.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
  }
});
