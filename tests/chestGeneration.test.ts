import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { ChestManager } from '../game/src/world/ChestManager';
import { SeededRNG } from '../game/src/core/SeededRNG';

test('Chest Generation - Stage 1 produces exactly 4 large chests and 11 small chests', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const placed = chestManager.generateStageChests(0, 0, 15, 1, new SeededRNG(1337));
  assert.equal(placed.length, 15, 'Should place 15 chests');
  assert.equal(chestManager.chests.length, 15, 'ChestManager should contain 15 chest instances');

  const largeChests = chestManager.chests.filter((c) => c.tier === 'large');
  const smallChests = chestManager.chests.filter((c) => c.tier === 'small');
  const legendaryChests = chestManager.chests.filter((c) => c.tier === 'legendary');

  assert.equal(largeChests.length, 4, 'Stage 1 must have exactly 4 large chests');
  assert.equal(smallChests.length, 11, 'Stage 1 must have exactly 11 small chests');
  assert.equal(legendaryChests.length, 0, 'Stage 1 must have 0 legendary chests');
});

test('Chest Generation - Stage 1 balance consistency across multiple random seeds', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const seeds = [1, 42, 999, 12345, 987654];
  for (const seed of seeds) {
    chestManager.generateStageChests(0, 0, 15, 1, new SeededRNG(seed));
    const largeChests = chestManager.chests.filter((c) => c.tier === 'large');
    const smallChests = chestManager.chests.filter((c) => c.tier === 'small');
    assert.equal(largeChests.length, 4, `Seed ${seed} must have exactly 4 large chests`);
    assert.equal(smallChests.length, 11, `Seed ${seed} must have exactly 11 small chests`);
  }
});

test('Chest Generation - Stage 2+ supports progression with legendary chests', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  let legendaryObserved = false;
  // Test across multiple seeds on stage 2
  for (let s = 1; s <= 10; s++) {
    chestManager.generateStageChests(0, 0, 15, 2, new SeededRNG(s * 100));
    if (chestManager.chests.some((c) => c.tier === 'legendary')) {
      legendaryObserved = true;
      break;
    }
  }
  assert.ok(legendaryObserved, 'Stage 2+ should produce legendary chests with appropriate RNG rolls');
});

test('Chest Visuals - Spawned chest contains contact shadow, volumetric depth mesh, and front sprite', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const chest = chestManager.spawnChest(10, 20, 'small');
  assert.ok(chest.contactShadowMesh, 'Chest must have contactShadowMesh for grounding AO shadow');
  assert.ok(chest.depthMesh, 'Chest must have depthMesh for 3D volumetric thickness');
  assert.ok(chest.spriteMesh, 'Chest must have spriteMesh');

  // Verify group hierarchy
  assert.ok(chest.mesh.children.includes(chest.contactShadowMesh), 'contactShadowMesh should be child of chest group');
  assert.ok(chest.mesh.children.includes(chest.depthMesh), 'depthMesh should be child of chest group');
  assert.ok(chest.mesh.children.includes(chest.spriteMesh), 'spriteMesh should be child of chest group');

  // Ground shadow orientation (geometry rotated to lie flat on ground, position at y=0.02)
  assert.equal(chest.contactShadowMesh.rotation.x, 0);
  assert.equal(chest.contactShadowMesh.position.y, 0.02);

  // Depth mesh volumetric offset behind sprite
  assert.equal(chest.depthMesh.position.z, -0.07);
  assert.equal(chest.depthMesh.position.y, 0.08);
});

test('Chest Animation - Depth texture frames sync with sprite texture frames during opening', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const chest = chestManager.spawnChest(0, 0, 'small');
  chestManager.openChest(chest, 1);
  assert.equal(chest.isOpened, true);
  assert.equal(chest.isAnimating, true);

  // Advance animation halfway
  chestManager.update(0.25);
  assert.ok(chest.spriteTexture);
  assert.ok(chest.depthTexture);
  assert.equal(chest.spriteTexture.offset.x, chest.depthTexture.offset.x, 'Depth frame must match sprite frame');

  // Complete animation
  chestManager.update(0.5);
  assert.equal(chest.isAnimating, false);
  assert.equal(chest.openProgress, 1);
  assert.equal(chest.spriteTexture.offset.x, 5 / 6, 'Sprite texture should be on last frame (opened)');
  assert.equal(chest.depthTexture.offset.x, 5 / 6, 'Depth texture should be on last frame (opened)');
});
