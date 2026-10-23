import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { InputBuffer } from '../game/src/core/InputBuffer';
import { InputManager } from '../game/src/core/InputManager';

describe('HUD Real-Time DPS Meter & KeyQ Integration', () => {
  test('InputBuffer queues and consumes toggle_dps_meter action', () => {
    InputBuffer.resetInstance();
    const buffer = InputBuffer.getInstance();

    assert.equal(buffer.hasAction('toggle_dps_meter'), false);
    buffer.queueAction('toggle_dps_meter');
    assert.equal(buffer.hasAction('toggle_dps_meter'), true);

    const action = buffer.consumeAction('toggle_dps_meter');
    assert.ok(action);
    assert.equal(action.type, 'toggle_dps_meter');
    assert.equal(buffer.hasAction('toggle_dps_meter'), false);
  });

  test('InputManager dispatches onToggleDpsMeter on KeyQ', () => {
    InputBuffer.resetInstance();

    let toggleTriggered = false;
    let windowListeners: Record<string, (e: any) => void> = {};

    const origAddEventListener = (globalThis as any).window?.addEventListener;
    (globalThis as any).window = {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: (type: string, fn: any) => {
        windowListeners[type] = fn;
      },
      removeEventListener: () => {}
    };

    const input = new InputManager();
    input.onToggleDpsMeter = () => {
      toggleTriggered = true;
    };

    // Simulate KeyQ
    windowListeners['keydown']({
      code: 'KeyQ',
      target: { tagName: 'BODY' }
    });

    assert.equal(toggleTriggered, true);
    assert.equal(InputBuffer.getInstance().hasAction('toggle_dps_meter'), true);

    // Simulate KeyQ inside an input field - should NOT trigger
    toggleTriggered = false;
    InputBuffer.resetInstance();
    windowListeners['keydown']({
      code: 'KeyQ',
      target: { tagName: 'INPUT' }
    });

    assert.equal(toggleTriggered, false);
    assert.equal(InputBuffer.getInstance().hasAction('toggle_dps_meter'), false);
  });
});
