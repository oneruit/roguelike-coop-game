import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { RiftTeleporter } from '../game/src/world/RiftTeleporter';

test('Rift Teleporter - Discovery lifecycle', () => {
  const scene = new Scene();
  const teleporter = new RiftTeleporter(scene, new Vector3(100, 0, 100));

  // 1. Initially hidden / not discovered
  assert.equal(teleporter.isDiscovered, false, 'Teleporter must be hidden/undiscovered initially');

  // 2. Player far away (at 0, 0 -> dist = ~141m > 45m)
  teleporter.update(0.1, [new Vector3(0, 0, 0)]);
  assert.equal(teleporter.isDiscovered, false, 'Teleporter remains undiscovered when player is far');

  // 3. Player approaches within discovery range (30m away)
  teleporter.update(0.1, [new Vector3(90, 0, 100)]);
  assert.equal(teleporter.isDiscovered, true, 'Teleporter becomes discovered when player is close');

  // 4. Player walks away: teleporter remains discovered for the stage
  teleporter.update(0.1, [new Vector3(0, 0, 0)]);
  assert.equal(teleporter.isDiscovered, true, 'Teleporter stays discovered once found');

  // 5. Stage reset: hides teleporter again for new biome/stage
  teleporter.resetForStage(new Vector3(-80, 0, 90));
  assert.equal(teleporter.isDiscovered, false, 'Teleporter resets to undiscovered on new stage');
});

test('Rift Teleporter - Activation and Snapshot synchronization', () => {
  const scene = new Scene();
  const teleporter = new RiftTeleporter(scene, new Vector3(50, 0, 50));
  assert.equal(teleporter.isDiscovered, false);

  // Activation automatically discovers
  teleporter.activate();
  assert.equal(teleporter.isDiscovered, true);

  // Snapshot contains discovery state
  const snapshot = teleporter.getSnapshot();
  assert.equal(snapshot.isDiscovered, true);

  // Remote client receives snapshot
  const remoteTeleporter = new RiftTeleporter(scene, new Vector3(50, 0, 50));
  assert.equal(remoteTeleporter.isDiscovered, false);
  remoteTeleporter.applySnapshot(snapshot);
  assert.equal(remoteTeleporter.isDiscovered, true);
});
