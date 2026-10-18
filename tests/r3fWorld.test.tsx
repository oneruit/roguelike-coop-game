import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';

// Setup DOM for Node.js test environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="game-container"></div></body></html>', {
  url: 'http://localhost'
});
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;

const dummyCtx = new Proxy({
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  measureText: () => ({ width: 50 }),
  getImageData: () => ({ data: new Uint8ClampedArray(4) })
}, {
  get(target, prop) {
    if (prop in target) return (target as any)[prop];
    return () => {};
  }
});
dom.window.HTMLCanvasElement.prototype.getContext = (() => dummyCtx) as any;

import { Scene, Vector3, Group } from 'three';
import { ChunkManager } from '../game/src/world/ChunkManager';
import { AltarManager } from '../game/src/world/AltarManager';
import { Altar } from '../game/src/world/Altar';
import { ObstacleManager } from '../game/src/world/ObstacleManager';
import { ChestManager } from '../game/src/world/ChestManager';
import { WorldChunks } from '../game/src/ui/react/r3f/world/WorldChunks';
import { AltarsRenderer } from '../game/src/ui/react/r3f/world/AltarsRenderer';
import { ChestsRenderer } from '../game/src/ui/react/r3f/world/ChestsRenderer';
import { VfxEnvironment } from '../game/src/ui/react/r3f/world/VfxEnvironment';

test('R3F World - ChunkManager declarative rendering mode isolates scene from duplicate additions', () => {
  const scene = new Scene();
  const altarManager = new AltarManager(scene);
  const obstacleManager = new ObstacleManager();
  const chunkManager = new ChunkManager(scene, altarManager, obstacleManager);

  let chunkEvents: { action: string; key?: string }[] = [];
  chunkManager.addChunkListener((action, key) => {
    chunkEvents.push({ action, key });
  });

  // Enable declarative mode before generation
  chunkManager.setDeclarative(true);
  assert.equal(chunkManager.isDeclarative, true);

  chunkManager.generateMap(42);

  // In declarative mode, chunks must NOT be directly attached to Three.js scene
  const activeChunks = chunkManager.getActiveChunks();
  assert.ok(activeChunks.size > 0, 'Active chunks should be populated');

  for (const group of activeChunks.values()) {
    assert.equal(group.parent, null, 'Chunk group must NOT have scene as parent in declarative mode');
  }

  // Verify chunk events were emitted for all chunks (reset followed by add)
  assert.ok(chunkEvents.length >= activeChunks.size);
  assert.equal(chunkEvents[0].action, 'reset');
  assert.equal(chunkEvents[1].action, 'add');

  // Toggle declarative mode to false -> attaches all to scene
  chunkManager.setDeclarative(false);
  for (const group of activeChunks.values()) {
    assert.equal(group.parent, scene, 'Chunk group must be attached to scene when declarative is false');
  }

  // Toggle declarative mode back to true -> detaches all from scene
  chunkManager.setDeclarative(true);
  for (const group of activeChunks.values()) {
    assert.equal(group.parent, null, 'Chunk group must be detached from scene when declarative is true');
  }

  // Clean up
  chunkManager.clear();
  assert.equal(chunkManager.getActiveChunks().size, 0);
});

test('R3F World - AltarManager declarative mode isolates altar meshes from scene', () => {
  const scene = new Scene();
  const altarManager = new AltarManager(scene);

  const altarEvents: string[] = [];
  altarManager.addAltarListener((action) => {
    altarEvents.push(action);
  });

  altarManager.setDeclarative(true);
  assert.equal(altarManager.isDeclarative, true);

  const altar = new Altar('damage', new Vector3(10, 0, 10));
  altarManager.registerAltar(altar);

  // In declarative mode, altar.mesh must not be attached to scene
  assert.equal(altar.mesh.parent, null, 'Altar mesh must not be attached to scene in declarative mode');
  assert.ok(altarEvents.includes('add'));

  // Toggle to false
  altarManager.setDeclarative(false);
  assert.equal(altar.mesh.parent, scene);

  // Toggle back to true
  altarManager.setDeclarative(true);
  assert.equal(altar.mesh.parent, null);

  altarManager.clear();
  assert.equal(altarManager.altars.length, 0);
  assert.ok(altarEvents.includes('reset'));
});

test('R3F World - ChestManager declarative mode isolates chest meshes from scene', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  const chestEvents: string[] = [];
  chestManager.addChestListener((action) => {
    chestEvents.push(action);
  });

  chestManager.setDeclarative(true);
  assert.equal(chestManager.isDeclarative, true);

  const chest = chestManager.spawnChest('small', 5, 0, 5, 100);
  assert.equal(chest.mesh.parent, null, 'Chest mesh must not be attached to scene in declarative mode');
  assert.ok(chestEvents.includes('add'));

  chestManager.setDeclarative(false);
  assert.equal(chest.mesh.parent, scene);

  chestManager.setDeclarative(true);
  assert.equal(chest.mesh.parent, null);

  chestManager.clear();
  assert.equal(chestManager.chests.length, 0);
  assert.ok(chestEvents.includes('reset'));
});

test('R3F World - Declarative components instantiate properly', () => {
  const scene = new Scene();
  const altarManager = new AltarManager(scene);
  const obstacleManager = new ObstacleManager();
  const chunkManager = new ChunkManager(scene, altarManager, obstacleManager);
  const chestManager = new ChestManager(scene);

  const chunksEl = <WorldChunks chunkManager={chunkManager} />;
  assert.equal(chunksEl.type, WorldChunks);
  assert.equal(chunksEl.props.chunkManager, chunkManager);

  const altarsEl = <AltarsRenderer altarManager={altarManager} />;
  assert.equal(altarsEl.type, AltarsRenderer);
  assert.equal(altarsEl.props.altarManager, altarManager);

  const chestsEl = <ChestsRenderer chestManager={chestManager} />;
  assert.equal(chestsEl.type, ChestsRenderer);
  assert.equal(chestsEl.props.chestManager, chestManager);

  const vfxEl = <VfxEnvironment particleCount={80} portalPosition={new Vector3(50, 0, 50)} />;
  assert.equal(vfxEl.type, VfxEnvironment);
  assert.equal(vfxEl.props.particleCount, 80);
});
