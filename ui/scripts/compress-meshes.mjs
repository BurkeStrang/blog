#!/usr/bin/env node
// Draco-compress the GLTF meshes IN PLACE.
// Backs originals to *.original.{gltf,bin} on first run.
// Skips texture handling — textures are already compressed WebP.

import { NodeIO } from "@gltf-transform/core";
import { draco, dedup, prune, weld, simplify } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";
import { readFile, writeFile, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, basename, join } from "node:path";

// Per-model simplification ratio: keep N% of triangles. 1.0 = no decimation.
// The sphere is used as a small navigation overlay; full geometric detail isn't
// visible at its on-screen size. The cube is also small but has hard edges, so
// keep more of its detail.
const TARGETS = [
  { gltf: "src/assets/models/sphere/scene.gltf", ratio: 0.04 },
  { gltf: "src/assets/models/rubikscube/scene.gltf", ratio: 0.1 },
];

const io = new NodeIO().registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "draco3d.encoder": await draco3d.createEncoderModule(),
});

async function totalSize(gltfPath) {
  // Stat the .gltf + sibling .bin files. Avoids re-parsing the gltf, which
  // can fail after Draco compression if the decoder extension isn't loaded.
  const dir = dirname(gltfPath);
  const name = basename(gltfPath, ".gltf");
  let total = (await stat(gltfPath)).size;
  const binPath = join(dir, `${name}.bin`);
  if (existsSync(binPath)) total += (await stat(binPath)).size;
  return total;
}

for (const { gltf: target, ratio } of TARGETS) {
  if (!existsSync(target)) {
    console.warn(`⏭  Missing: ${target}`);
    continue;
  }
  const dir = dirname(target);
  const name = basename(target, ".gltf");

  // Back up originals on first run, then always work from a fresh copy of the
  // pristine source so re-runs are deterministic.
  const backupGltf = join(dir, `${name}.original.gltf`);
  const currentBin = join(dir, `${name}.bin`);
  const backupBin = join(dir, `${name}.original.bin`);
  if (!existsSync(backupGltf)) {
    await copyFile(target, backupGltf);
    if (existsSync(currentBin)) await copyFile(currentBin, backupBin);
    console.log(`📦 Backed up ${name}`);
  }
  // Restore pristine state before reading, so io.read finds matching .gltf/.bin.
  await copyFile(backupGltf, target);
  if (existsSync(backupBin)) await copyFile(backupBin, currentBin);

  const before = await totalSize(target);
  const doc = await io.read(target);

  await doc.transform(
    dedup(),
    weld({ tolerance: 0.0001 }),
    prune(),
    // Decimate to `ratio` of original triangle count; lockBorder=true keeps
    // visible silhouettes clean (otherwise spheres get pinched poles).
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: true }),
    draco({
      method: "edgebreaker",
      quantizationBits: {
        POSITION: 14,
        NORMAL: 10,
        COLOR: 8,
        TEX_COORD: 12,
        GENERIC: 12,
      },
      quantizationVolume: "mesh",
    })
  );

  await io.write(target, doc);
  const after = await totalSize(target);
  const pct = ((1 - after / before) * 100).toFixed(1);
  console.log(`✅ ${name}: ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB (${pct}% smaller)`);
}
