import test from 'node:test';
import assert from 'node:assert/strict';
import { FeatureFlags, FEATURE_FLAG_DEFINITIONS, type FeatureFlagKey } from '../game/src/core/FeatureFlags';

test('FeatureFlags - Default values match definitions', () => {
  FeatureFlags.resetInstance();
  const flags = FeatureFlags.getInstance();

  for (const [key, def] of Object.entries(FEATURE_FLAG_DEFINITIONS)) {
    assert.equal(
      flags.isEnabled(key as FeatureFlagKey),
      def.defaultValue,
      `Flag ${key} should match its default definition`
    );
  }
});

test('FeatureFlags - setFlag overrides default value and notifies listeners', () => {
  FeatureFlags.resetInstance();
  const flags = FeatureFlags.getInstance();

  let listenerNotified = false;
  let receivedKey: string | null = null;
  let receivedVal: boolean | null = null;

  const unsubscribe = flags.addListener((key, val) => {
    listenerNotified = true;
    receivedKey = key;
    receivedVal = val;
  });

  assert.equal(flags.isEnabled('react_hud'), false);
  flags.setFlag('react_hud', true, false);

  assert.equal(flags.isEnabled('react_hud'), true);
  assert.equal(listenerNotified, true);
  assert.equal(receivedKey, 'react_hud');
  assert.equal(receivedVal, true);

  unsubscribe();
});

test('FeatureFlags - clearFlag restores default value', () => {
  FeatureFlags.resetInstance();
  const flags = FeatureFlags.getInstance();

  flags.setFlag('r3f_canvas', true, false);
  assert.equal(flags.isEnabled('r3f_canvas'), true);

  flags.clearFlag('r3f_canvas');
  assert.equal(flags.isEnabled('r3f_canvas'), false);
});

test('FeatureFlags - resetToDefaults clears all active overrides', () => {
  FeatureFlags.resetInstance();
  const flags = FeatureFlags.getInstance();

  flags.setFlag('react_main_menu', true, false);
  flags.setFlag('r3f_entities', true, false);
  assert.equal(flags.isEnabled('react_main_menu'), true);
  assert.equal(flags.isEnabled('r3f_entities'), true);

  flags.resetToDefaults();
  assert.equal(flags.isEnabled('react_main_menu'), false);
  assert.equal(flags.isEnabled('r3f_entities'), false);
});

test('FeatureFlags - getAllFlags returns snapshot of all flags', () => {
  FeatureFlags.resetInstance();
  const flags = FeatureFlags.getInstance();

  flags.setFlag('react_modals', true, false);
  const snapshot = flags.getAllFlags();

  assert.equal(snapshot.react_modals, true);
  assert.equal(snapshot.react_hud, false);
  assert.equal(snapshot.r3f_canvas, false);
});
