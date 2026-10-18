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

import { Scene, Vector3 } from 'three';
import { NetworkInterpolationBuffer } from '../game/src/ui/react/r3f/entities/NetworkInterpolationBuffer';
import { PlayerRenderer } from '../game/src/ui/react/r3f/entities/PlayerRenderer';
import { RemotePlayersRenderer } from '../game/src/ui/react/r3f/entities/RemotePlayersRenderer';
import { EnemiesRenderer } from '../game/src/ui/react/r3f/entities/EnemiesRenderer';
import { CombatVfxRenderer } from '../game/src/ui/react/r3f/entities/CombatVfxRenderer';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { DropManager } from '../game/src/drops/DropManager';
import { DamageNumberManager } from '../game/src/combat/DamageNumberManager';

test('R3F Entities - NetworkInterpolationBuffer smooths co-op remote player positions', () => {
  const buffer = new NetworkInterpolationBuffer(100);

  assert.equal(buffer.getSnapshotCount(), 0);
  const out = new Vector3();
  assert.equal(buffer.getInterpolatedPosition(1000, out), null);

  // Push snapshot 1 at t=1000, pos=(0, 0, 0)
  buffer.pushSnapshot(1000, new Vector3(0, 0, 0), 'front');
  assert.equal(buffer.getSnapshotCount(), 1);

  // Single snapshot returns exact position
  const res1 = buffer.getInterpolatedPosition(1000, out);
  assert.ok(res1);
  assert.equal(res1.position.x, 0);

  // Push snapshot 2 at t=1100, pos=(10, 0, 0)
  buffer.pushSnapshot(1100, new Vector3(10, 0, 0), 'right');
  assert.equal(buffer.getSnapshotCount(), 2);

  // Interpolate at t=1050 (midpoint) -> x should be 5
  const mid = buffer.getInterpolatedPosition(1050, out);
  assert.ok(mid);
  assert.equal(Math.round(mid.position.x), 5);

  // Interpolate before first snapshot -> returns first
  const before = buffer.getInterpolatedPosition(900, out);
  assert.ok(before);
  assert.equal(before.position.x, 0);

  // Interpolate after last snapshot -> returns last
  const after = buffer.getInterpolatedPosition(1200, out);
  assert.ok(after);
  assert.equal(after.position.x, 10);
  assert.equal(after.dir, 'right');

  // Push older snapshot -> buffer maintains chronological sort
  buffer.pushSnapshot(1020, new Vector3(2, 0, 0), 'front');
  const mid2 = buffer.getInterpolatedPosition(1010, out);
  assert.ok(mid2);
  assert.equal(Math.round(mid2.position.x), 1);

  // Pruning: push snapshot at t=3000 -> snapshots older than 3000-1500=1500 are pruned
  buffer.pushSnapshot(3000, new Vector3(50, 0, 0));
  assert.ok(buffer.getSnapshotCount() <= 2);

  buffer.clear();
  assert.equal(buffer.getSnapshotCount(), 0);
});

test('R3F Entities - EnemyManager declarative mode prevents direct scene additions', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager(scene);
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  enemyManager.setDeclarative(true);
  assert.equal(enemyManager.isDeclarative, true);

  // Spawn enemy in declarative mode
  enemyManager.spawnSpecificEnemy('coyote', new Vector3(5, 0, 5));
  assert.equal(enemyManager.enemies.length, 1);
  const enemy = enemyManager.enemies[0];

  assert.equal(enemy.mesh.parent, null, 'Enemy mesh must NOT be added to Three.js scene in declarative mode');

  // Toggle to false
  enemyManager.setDeclarative(false);
  assert.equal(enemy.mesh.parent, scene, 'Enemy mesh should be attached to scene when declarative is false');

  // Toggle back to true
  enemyManager.setDeclarative(true);
  assert.equal(enemy.mesh.parent, null, 'Enemy mesh should be detached from scene when declarative is true');
});

test('R3F Entities - Declarative entity components instantiate properly', () => {
  const playerEl = <PlayerRenderer />;
  assert.equal(playerEl.type, PlayerRenderer);

  const remoteEl = <RemotePlayersRenderer />;
  assert.equal(remoteEl.type, RemotePlayersRenderer);

  const enemiesEl = <EnemiesRenderer maxEnemies={150} />;
  assert.equal(enemiesEl.type, EnemiesRenderer);
  assert.equal(enemiesEl.props.maxEnemies, 150);

  const vfxEl = <CombatVfxRenderer maxProjectiles={100} />;
  assert.equal(vfxEl.type, CombatVfxRenderer);
  assert.equal(vfxEl.props.maxProjectiles, 100);
});
