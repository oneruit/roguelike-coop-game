import test from 'node:test';
import assert from 'node:assert/strict';
import { InputBuffer } from '../game/src/core/InputBuffer';

test('InputBuffer - Action queuing and consumption at tick boundary', () => {
  InputBuffer.resetInstance();
  const buffer = InputBuffer.getInstance();

  buffer.queueAction('dash');
  buffer.queueAction('interact', { targetId: 'chest_1' });

  assert.equal(buffer.hasAction('dash'), true);
  assert.equal(buffer.hasAction('interact'), true);
  assert.equal(buffer.hasAction('toggle_inventory'), false);

  const consumed = buffer.consumeActions();
  assert.equal(consumed.length, 2);
  assert.equal(consumed[0].type, 'dash');
  assert.equal(consumed[1].type, 'interact');
  assert.equal(consumed[1].payload?.targetId, 'chest_1');

  // Queue should be empty now
  assert.equal(buffer.consumeActions().length, 0);
  assert.equal(buffer.hasAction('dash'), false);
});

test('InputBuffer - Single action consumption', () => {
  InputBuffer.resetInstance();
  const buffer = InputBuffer.getInstance();

  buffer.queueAction('cast_ability_1');
  buffer.queueAction('dash');

  const action = buffer.consumeAction('dash');
  assert.ok(action);
  assert.equal(action.type, 'dash');

  // Ability 1 remains in queue
  assert.equal(buffer.hasAction('cast_ability_1'), true);
  assert.equal(buffer.hasAction('dash'), false);
});

test('InputBuffer - Continuous vector polling', () => {
  InputBuffer.resetInstance();
  const buffer = InputBuffer.getInstance();

  buffer.setMoveVector(0.707, -0.707);
  buffer.setAimPosition(15.5, 22.0);

  const move = buffer.getMoveVector();
  const aim = buffer.getAimPosition();

  assert.equal(move.x, 0.707);
  assert.equal(move.z, -0.707);
  assert.equal(aim.x, 15.5);
  assert.equal(aim.z, 22.0);

  buffer.clear();
  assert.equal(buffer.getMoveVector().x, 0);
  assert.equal(buffer.getAimPosition().x, 0);
});

test('InputBuffer - Queues and consumes toggle_dps_meter', () => {
  InputBuffer.resetInstance();
  const buffer = InputBuffer.getInstance();

  buffer.queueAction('toggle_dps_meter');
  assert.equal(buffer.hasAction('toggle_dps_meter'), true);

  const action = buffer.consumeAction('toggle_dps_meter');
  assert.ok(action);
  assert.equal(action.type, 'toggle_dps_meter');
  assert.equal(buffer.hasAction('toggle_dps_meter'), false);
});
