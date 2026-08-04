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
  "nose_tip",
  "lower_lip",
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
  const basicMaterials = new Set();
  let facialUvTriangles = 0;
  let facialUvTrianglesWithArea = 0;
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
    surfaces.forEach((surface) => {
      materialNames.add(surface.name);
      if (surface.isMeshBasicMaterial) basicMaterials.add(surface.name);
    });

    if (
      surfaces.some((surface) => surface.name === "CRACKED_SILICONE_MASK")
    ) {
      const uv = object.geometry.attributes.uv;
      assert.ok(uv, `${object.name} is missing projected facial UVs`);
      for (const coordinate of uv.array) {
        assert.ok(Number.isFinite(coordinate));
        assert.ok(coordinate >= 0 && coordinate <= 1);
      }
      const indices = object.geometry.index?.array;
      const triangleCount = indices
        ? indices.length / 3
        : object.geometry.attributes.position.count / 3;
      for (let triangle = 0; triangle < triangleCount; triangle += 1) {
        const ia = indices ? indices[triangle * 3] : triangle * 3;
        const ib = indices ? indices[triangle * 3 + 1] : triangle * 3 + 1;
        const ic = indices ? indices[triangle * 3 + 2] : triangle * 3 + 2;
        const ax = uv.getX(ia);
        const ay = uv.getY(ia);
        const area = Math.abs(
          (uv.getX(ib) - ax) * (uv.getY(ic) - ay) -
            (uv.getX(ic) - ax) * (uv.getY(ib) - ay),
        );
        facialUvTriangles += 1;
        if (area > 1e-8) facialUvTrianglesWithArea += 1;
      }
    }
  });

  assert.ok(meshes >= 150, `expected detailed model, received ${meshes} meshes`);
  assert.ok(triangles >= 30_000, `model is unexpectedly simple: ${triangles}`);
  assert.ok(triangles <= 180_000, `model exceeds the browser budget: ${triangles}`);
  assert.ok(materialNames.has("CRACKED_SILICONE_MASK"));
  assert.ok(materialNames.has("AGED_IVORY_SUIT"));
  assert.ok(materialNames.has("BRUSHED_ENDOSKELETON"));
  assert.ok(materialNames.has("CRYSTAL_PERFORMANCE_GLOVE"));
  assert.ok(materialNames.has("AGED_SYNTHETIC_LIP"));
  assert.deepEqual([...basicMaterials], []);
  assert.equal(gltf.scene.getObjectByName("faceDecal"), undefined);
  assert.equal(gltf.scene.getObjectByName("performanceSkin"), undefined);
  assert.ok(facialUvTriangles > 0);
  assert.ok(
    facialUvTrianglesWithArea / facialUvTriangles > 0.9,
    "projected facial UVs contain too many degenerate triangles",
  );
});

function pngDimensions(bytes) {
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("SUBJECT M-22 ships bounded high and low PBR texture sets", async () => {
  const textureNames = [
    "face-basecolor.png",
    "face-normal.png",
    "ivory-basecolor.png",
    "ivory-normal.png",
    "ivory-rm.png",
    "black-fabric-basecolor.png",
    "black-fabric-normal.png",
    "black-fabric-rm.png",
    "metal-basecolor.png",
    "metal-normal.png",
    "metal-rm.png",
  ];
  let highBytes = 0;
  for (const variant of ["high", "low"]) {
    for (const textureName of textureNames) {
      const texture = await readFile(
        `public/models/subject-m22-materials/${variant}/${textureName}`,
      );
      const { width, height } = pngDimensions(texture);
      const isFace = textureName.startsWith("face-");
      const expectedSize = isFace
        ? variant === "high"
          ? 1024
          : 512
        : variant === "high"
          ? 256
          : 128;
      assert.equal(width, expectedSize, textureName);
      assert.equal(height, expectedSize, textureName);
      if (variant === "high") highBytes += texture.byteLength;
    }
  }
  assert.ok(highBytes < 8 * 1024 * 1024, `PBR payload is ${highBytes} bytes`);
});
