import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Group, RGBADepthPacking } from 'three';
import { TreeManager, BIOME_TREE_CONFIGS } from '../game/src/world/TreeManager';
import { ObstacleManager } from '../game/src/world/ObstacleManager';
import { SeededRNG } from '../game/src/core/SeededRNG';
import { OccupiedArea } from '../game/src/world/ChunkManager';

test('TreeManager - all biome tree configs have existing texture assets on disk', () => {
  const biomes = ['ashen_wastes', 'derelict_sector', 'bioluminescent_wilds', 'volcanic_caldera', 'primordial_ruins', 'rift_core'];

  for (const biomeId of biomes) {
    const config = BIOME_TREE_CONFIGS[biomeId];
    assert.ok(config, `Missing tree config for biome ${biomeId}`);

    // Relative path to public
    const cleanPath = config.texturePath.replace(/^\//, '');
    const fullPath = path.resolve(process.cwd(), 'public', cleanPath.replace(/^public\//, ''));
    assert.ok(
      fs.existsSync(fullPath),
      `Tree texture file does not exist: ${fullPath} (configured: ${config.texturePath})`
    );
  }
});

test('TreeManager - createTreeMesh creates mesh with correct pseudo-3D tilt and shadow mapping', () => {
  const config = BIOME_TREE_CONFIGS.ashen_wastes;
  const mesh = TreeManager.createTreeMesh('ashen_wastes', config);

  assert.equal(mesh.castShadow, true, 'Tree mesh must cast shadow');
  assert.equal(mesh.receiveShadow, false, 'Tree mesh should not receive shadow');
  assert.ok(
    Math.abs(mesh.rotation.x - (-Math.PI / 4.8)) < 0.0001,
    'Tree mesh must be tilted at -Math.PI / 4.8 matching player/enemy angle'
  );
  assert.ok(mesh.customDepthMaterial, 'Tree mesh must have customDepthMaterial for alpha-tested shadows');
  assert.equal(mesh.customDepthMaterial.depthPacking, RGBADepthPacking);
});

test('TreeManager - generateTreesForChunks populates trees and registers tree obstacles without overlapping occupied areas', () => {
  const rng = new SeededRNG(42);
  const activeChunks = new Map<string, Group>();
  const chunkKey = '0,0';
  const chunkGroup = new Group();
  activeChunks.set(chunkKey, chunkGroup);

  const occupied: OccupiedArea[] = [
    { x: 0, z: 0, radius: 10 } // clearance zone at center
  ];
  const obstacleManager = new ObstacleManager();

  TreeManager.generateTreesForChunks(
    'ashen_wastes',
    rng,
    activeChunks,
    occupied,
    obstacleManager,
    50,
    0,
    0
  );

  const obstacles = obstacleManager.getObstaclesForChunkKey(chunkKey);
  assert.ok(obstacles && obstacles.length > 0, 'Obstacles should be registered for chunk 0,0');
  
  for (const obs of obstacles) {
    assert.equal(obs.type, 'tree');
    // Verify distance from occupied center (0, 0) is greater than 10
    const dist = Math.hypot(obs.x, obs.z);
    assert.ok(dist >= 10, `Tree at (${obs.x}, ${obs.z}) should not be placed inside clearance radius 10`);
  }

  // Verify meshes were added to chunkGroup
  assert.equal(chunkGroup.children.length, obstacles.length);
});
