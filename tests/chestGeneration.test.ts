import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { ChestManager } from '../game/src/world/ChestManager';
import { SeededRNG } from '../game/src/core/SeededRNG';

test('Chest Generation - Stage 1 produces exactly 4 large chests and 11 small chests across multiple seeds', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const seeds = [1, 42, 999, 1337, 12345, 987654];
  for (const seed of seeds) {
    const placed = chestManager.generateStageChests(0, 0, 15, 1, new SeededRNG(seed));
    assert.equal(placed.length, 15, `Seed ${seed} must place 15 chests`);
    assert.equal(chestManager.chests.length, 15);

    const largeChests = chestManager.chests.filter((c) => c.tier === 'large');
    const smallChests = chestManager.chests.filter((c) => c.tier === 'small');
    const legendaryChests = chestManager.chests.filter((c) => c.tier === 'legendary');

    assert.equal(largeChests.length, 4, `Seed ${seed} must have exactly 4 large chests`);
    assert.equal(smallChests.length, 11, `Seed ${seed} must have exactly 11 small chests`);
    assert.equal(legendaryChests.length, 0, `Seed ${seed} must have 0 legendary chests`);
  }
});

test('Chest Generation - Stage 2 produces exactly 5 large chests and 10 small chests across multiple seeds', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const seeds = [1, 42, 999, 1337, 12345, 987654];
  for (const seed of seeds) {
    const placed = chestManager.generateStageChests(0, 0, 15, 2, new SeededRNG(seed));
    assert.equal(placed.length, 15, `Seed ${seed} must place 15 chests`);
    assert.equal(chestManager.chests.length, 15);

    const largeChests = chestManager.chests.filter((c) => c.tier === 'large');
    const smallChests = chestManager.chests.filter((c) => c.tier === 'small');
    const legendaryChests = chestManager.chests.filter((c) => c.tier === 'legendary');

    assert.equal(largeChests.length, 5, `Seed ${seed} must have exactly 5 large chests`);
    assert.equal(smallChests.length, 10, `Seed ${seed} must have exactly 10 small chests`);
    assert.equal(legendaryChests.length, 0, `Seed ${seed} must have 0 legendary chests`);
  }
});

test('Chest Generation - Stage 3 produces exactly 11 large chests and 4 legendary chests across multiple seeds', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const seeds = [1, 42, 999, 1337, 12345, 987654];
  for (const seed of seeds) {
    const placed = chestManager.generateStageChests(0, 0, 15, 3, new SeededRNG(seed));
    assert.equal(placed.length, 15, `Seed ${seed} must place 15 chests`);
    assert.equal(chestManager.chests.length, 15);

    const largeChests = chestManager.chests.filter((c) => c.tier === 'large');
    const smallChests = chestManager.chests.filter((c) => c.tier === 'small');
    const legendaryChests = chestManager.chests.filter((c) => c.tier === 'legendary');

    assert.equal(largeChests.length, 11, `Seed ${seed} must have exactly 11 large chests`);
    assert.equal(legendaryChests.length, 4, `Seed ${seed} must have exactly 4 legendary chests`);
    assert.equal(smallChests.length, 0, `Seed ${seed} must have 0 small chests`);
  }
});

test('Chest Generation - Stage 4 produces exactly 11 legendary chests and 4 large chests across multiple seeds', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const seeds = [1, 42, 999, 1337, 12345, 987654];
  for (const seed of seeds) {
    const placed = chestManager.generateStageChests(0, 0, 15, 4, new SeededRNG(seed));
    assert.equal(placed.length, 15, `Seed ${seed} must place 15 chests`);
    assert.equal(chestManager.chests.length, 15);

    const largeChests = chestManager.chests.filter((c) => c.tier === 'large');
    const smallChests = chestManager.chests.filter((c) => c.tier === 'small');
    const legendaryChests = chestManager.chests.filter((c) => c.tier === 'legendary');

    assert.equal(legendaryChests.length, 11, `Seed ${seed} must have exactly 11 legendary chests`);
    assert.equal(largeChests.length, 4, `Seed ${seed} must have exactly 4 large chests`);
    assert.equal(smallChests.length, 0, `Seed ${seed} must have 0 small chests`);
  }
});

test('Chest Generation - Stage 5+ clamps to stage 4 rules (11 legendary and 4 large)', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const tiers5 = ChestManager.getStageChestTiers(5, 15, new SeededRNG(555));
  const legendaryCount = tiers5.filter((t) => t === 'legendary').length;
  const largeCount = tiers5.filter((t) => t === 'large').length;
  const smallCount = tiers5.filter((t) => t === 'small').length;

  assert.equal(legendaryCount, 11);
  assert.equal(largeCount, 4);
  assert.equal(smallCount, 0);
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
