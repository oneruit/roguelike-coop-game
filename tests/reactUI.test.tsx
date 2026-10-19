import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';

// Setup DOM environment for testing React components
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="react-ui-root"></div></body></html>', {
  url: 'http://localhost'
});
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 16);
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);

import { render, fireEvent } from '@testing-library/react';
import { useGameStore, usePlayerStore, useUIModalStore } from '../game/src/ui/stores';
import { FeatureFlags } from '../game/src/core/FeatureFlags';
import { HUDOverlay } from '../game/src/ui/react/hud/HUDOverlay';
import { LevelUpModal } from '../game/src/ui/react/modals/LevelUpModal';
import { ReactUIRoot } from '../game/src/ui/react/ReactUIRoot';

test('React UI - HUDOverlay renders player vitals when PLAYING', () => {
  useGameStore.getState().setGameState('PLAYING');
  usePlayerStore.setState({ hp: 75, maxHp: 100, xp: 50, maxXp: 100, level: 3 });
  useGameStore.getState().setGameTime(125); // 02:05

  const { container } = render(<HUDOverlay />);

  assert.ok(container.textContent?.includes('02:05'), 'Timer should display 02:05');
  assert.ok(container.textContent?.includes('LVL 3'), 'Level should display LVL 3');
});

test('React UI - LevelUpModal renders cards and triggers select callback', () => {
  let selectedOptionId = '';
  const testOption = {
    id: 'weapon_bow',
    name: 'Longbow',
    description: 'Piercing arrows',
    type: 'new_weapon' as const,
    rarity: 'rare' as const
  };

  useUIModalStore.getState().openLevelUp([testOption]);

  const { container, getByText } = render(
    <LevelUpModal
      onSelectOption={(opt) => {
        selectedOptionId = opt.id;
      }}
    />
  );

  assert.ok(container.textContent?.includes('Longbow'), 'Should show card title');
  assert.ok(container.textContent?.includes('Piercing arrows'), 'Should show card description');

  const cardElement = getByText('Longbow').closest('div[role="button"]');
  assert.ok(cardElement, 'Card button should exist');
  fireEvent.click(cardElement!);

  assert.equal(selectedOptionId, 'weapon_bow', 'Selection callback should receive option');
  assert.equal(useUIModalStore.getState().isLevelUpOpen, false, 'Modal should close after selection');
});

test('React UI - ReactUIRoot respects FeatureFlags', () => {
  FeatureFlags.resetInstance();
  const flags = FeatureFlags.getInstance();

  flags.setFlag('react_hud', false, false);
  flags.setFlag('react_main_menu', false, false);
  flags.setFlag('react_modals', false, false);

  useGameStore.getState().setGameState('PLAYING');

  const { container, rerender } = render(<ReactUIRoot />);
  assert.equal(container.querySelector('.react-hud-overlay'), null, 'HUD should be hidden when flag is off');

  // Turn react_hud flag on
  flags.setFlag('react_hud', true, false);
  rerender(<ReactUIRoot />);

  assert.ok(container.querySelector('.react-hud-overlay'), 'HUD should render when flag is on');
});
