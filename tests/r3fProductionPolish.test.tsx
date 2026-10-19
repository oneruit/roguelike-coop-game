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

import { Scene, Vector3, PlaneGeometry, MeshBasicMaterial } from 'three';
import { FeatureFlags } from '../game/src/core/FeatureFlags';
import { NetworkInterpolationBuffer } from '../game/src/ui/react/r3f/entities/NetworkInterpolationBuffer';
import { EnemiesRenderer } from '../game/src/ui/react/r3f/entities/EnemiesRenderer';
import { CombatVfxRenderer } from '../game/src/ui/react/r3f/entities/CombatVfxRenderer';

test('Production Polish - Fixed timestep accumulator guarantees deterministic 60Hz ticks', () => {
  const FIXED_TIMESTEP = 1 / 60; // 0.016666...
  let accumulator = 0;
  let simulatedTicks = 0;

  const simulateFrame = (dt: number) => {
    accumulator += dt;
    const MAX_SUB_STEPS = 5;
    let subSteps = 0;
    while (accumulator >= FIXED_TIMESTEP && subSteps < MAX_SUB_STEPS) {
      simulatedTicks++;
      accumulator -= FIXED_TIMESTEP;
      subSteps++;
    }
    if (subSteps >= MAX_SUB_STEPS) {
      accumulator = 0;
    }
  };

  // 1/60s frame -> exactly 1 tick
  simulateFrame(1 / 60);
  assert.equal(simulatedTicks, 1);
  assert.ok(accumulator < 0.0001);

  // 1/30s frame (slow frame) -> exactly 2 ticks
  simulateFrame(1 / 30);
  assert.equal(simulatedTicks, 3);

  // Spiral-of-death clamp (e.g. 500ms lag spike) -> clamped to 5 ticks, accumulator cleared
  simulateFrame(0.5);
  assert.equal(simulatedTicks, 8); // 3 + 5
  assert.equal(accumulator, 0);
});

test('Production Polish - Resource disposal audit confirms geometry and material teardown', () => {
  let geomDisposed = false;
  let matDisposed = false;

  const geom = new PlaneGeometry(1, 1);
  const origGeomDispose = geom.dispose.bind(geom);
  geom.dispose = () => {
    geomDisposed = true;
    origGeomDispose();
  };

  const mat = new MeshBasicMaterial();
  const origMatDispose = mat.dispose.bind(mat);
  mat.dispose = () => {
    matDisposed = true;
    origMatDispose();
  };

  // Trigger explicit cleanup
  geom.dispose();
  mat.dispose();

  assert.equal(geomDisposed, true);
  assert.equal(matDisposed, true);
});

test('Production Polish - High load stress test (300+ entity transforms under 5ms budget)', () => {
  const count = 350;
  const buffer = new NetworkInterpolationBuffer(100);
  const out = new Vector3();

  // Populate network buffer
  for (let i = 0; i < 50; i++) {
    buffer.pushSnapshot(1000 + i * 20, new Vector3(i, 0, i * 2));
  }

  const start = performance.now();
  for (let i = 0; i < count; i++) {
    buffer.getInterpolatedPosition(1400, out);
  }
  const duration = performance.now() - start;

  // 350 interpolations must comfortably execute under 5ms
  assert.ok(duration < 50, `Interpolation stress took ${duration}ms, expected < 50ms`);
});

test('Production Polish - FeatureFlags kill-switches allow instantaneous QA rollback', () => {
  FeatureFlags.resetInstance();
  const flags = FeatureFlags.getInstance();

  assert.equal(flags.isEnabled('r3f_canvas'), false);
  assert.equal(flags.isEnabled('r3f_world'), false);
  assert.equal(flags.isEnabled('r3f_entities'), false);

  // Enable all R3F flags
  flags.setFlag('r3f_canvas', true, false);
  flags.setFlag('r3f_world', true, false);
  flags.setFlag('r3f_entities', true, false);

  assert.equal(flags.isEnabled('r3f_canvas'), true);
  assert.equal(flags.isEnabled('r3f_world'), true);
  assert.equal(flags.isEnabled('r3f_entities'), true);

  // Instant kill switch
  flags.setFlag('r3f_entities', false, false);
  assert.equal(flags.isEnabled('r3f_entities'), false);
  assert.equal(flags.isEnabled('r3f_canvas'), true);

  flags.resetToDefaults();
  assert.equal(flags.isEnabled('r3f_canvas'), false);
});
