import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { SessionDirector, GameState } from '../game/src/core/SessionDirector';
import { Player } from '../game/src/entities/Player';
import { DevManager } from '../game/src/ui/DevManager';
import { GameNetworkCoordinator } from '../game/src/net/GameNetworkCoordinator';
import { ProgressionManager } from '../game/src/core/ProgressionManager';
import { SoundManager } from '../game/src/core/SoundManager';

// Only external UI/rendering/storage are replaced. XP arithmetic, chest interaction,
// dev reward handlers, and the selection lifecycle use the production methods.
SoundManager.playChestOpen = () => {};
SoundManager.playHit = () => {};
ProgressionManager.getInstance = () => ({ recordResourceGather() {} }) as any;

function fixture(isCoop = false) {
  const player = Object.assign(Object.create(Player.prototype), {
    xp: 0, level: 1, xpToNextLevel: 10, isCoop, isAlive: true, isDowned: false,
    credits: 100, position: new Vector3(), buffs: [], items: [],
    addBuff(buff: unknown) { this.buffs.push(buff); },
    addRiftItem(item: unknown) { this.items.push(item); }
  });
  const levelChoices: Array<() => void> = [];
  const chestChoices: Array<(item: any) => void> = [];
  let merchantOpens = 0;
  let merchantCanInteract = false;
  const hud = {
    showLevelUp(_player: Player, done: () => void) { levelChoices.push(done); },
    showChestChoice(_items: unknown, _player: Player, done: (item: any) => void) { chestChoices.push(done); },
    resetLevelUpState() {}, triggerAltarNotification() {},
    showMerchant(_merchant: any, _player: Player) { merchantOpens++; },
    hideMerchant() {}
  };
  const item = { id: 'test_relic', name: 'Relic', description: '', icon: '', color: '' };
  let opens = 0;
  const chestManager = {
    getClosestInteractableChest: () => ({ cost: 1, chest: { id: 'chest', position: new Vector3() } }),
    openChest: () => { opens++; return [item, item]; }
  };
  const merchantManager = {
    getInteraction: () => ({ canInteract: merchantCanInteract, prompt: 'Торговец' }),
    buyItem: (itemDef: any, p: any) => {
      if (p.credits < itemDef.price) return { success: false, error: 'Недостаточно кредитов' };
      p.credits -= itemDef.price;
      p.addRiftItem(itemDef);
      return { success: true };
    },
    reset: () => {}
  };
  const coordinator = Object.assign(Object.create(GameNetworkCoordinator.prototype), {
    player, pendingNetworkEvents: []
  });
  const dependencies = [
    { camera: {} }, player, { enemies: [] }, { attractAllGemsTo() {} },
    { spawnDamage() {} }, hud, {}, {}, { role: 'solo' }, { stageNumber: 1 },
    chestManager, { getInteraction: () => ({ canInteract: false }) }, {}, {},
    coordinator, new Map(), merchantManager
  ] as unknown as ConstructorParameters<typeof SessionDirector>;
  const session = new SessionDirector(...dependencies);
  session.gameState = GameState.PLAYING;
  function chooseAll() {
    for (let index = 0; session.isLevelUpActive; index++) {
      assert.ok(index < 50, 'reward queue must terminate');
      levelChoices[index]();
    }
  }
  return {
    player,
    session,
    coordinator,
    levelChoices,
    chestChoices,
    item,
    chooseAll,
    opens: () => opens,
    merchantManager,
    merchantOpens: () => merchantOpens,
    setMerchantCanInteract: (val: boolean) => { merchantCanInteract = val; }
  };
}

test('one earned level opens exactly one upgrade choice', () => {
  const f = fixture();
  assert.equal(f.player.gainXp(10), 1);
  assert.equal(f.session.pendingLevelUps, 0);
  assert.equal(f.levelChoices.length, 1);
  assert.equal(f.session.gameState, GameState.LEVEL_UP);
  f.chooseAll();
  assert.equal(f.levelChoices.length, 1);
  assert.equal(f.session.gameState, GameState.PLAYING);
});

test('XP spanning multiple levels keeps pause until the final choice', () => {
  const f = fixture();
  const gained = f.player.gainXp(100);
  assert.ok(gained > 1);
  for (let i = 0; i < gained; i++) {
    assert.equal(f.session.gameState, GameState.LEVEL_UP);
    f.levelChoices[i]();
    assert.equal(f.session.gameState, i === gained - 1 ? GameState.PLAYING : GameState.LEVEL_UP);
  }
  assert.equal(f.levelChoices.length, gained);
  assert.equal(f.session.pendingLevelUps, 0);
});

test('chest XP queues upgrades behind the relic and keeps pause through all choices', () => {
  const f = fixture();
  f.player.xp = 9;
  f.session.handleInteract();
  f.player.gainXp(1); // The chest's 30 XP plus this gem crosses two level thresholds.
  assert.equal(f.player.level, 3);
  assert.equal(f.session.gameState, GameState.LEVEL_UP);
  assert.equal(f.session.isRewardChoiceActive, true);
  assert.equal(f.levelChoices.length, 0, 'no overlapping skill modal');
  assert.equal(f.chestChoices.length, 1);
  assert.equal(f.session.pendingLevelUps, f.player.level - 1);
  f.session.triggerLevelUp();
  assert.equal(f.levelChoices.length, 0, 'render-loop trigger must wait for the chest');
  f.chestChoices[0](f.item);
  assert.equal(f.session.gameState, GameState.LEVEL_UP);
  assert.equal(f.player.items.length, 1);
  f.chooseAll();
  assert.equal(f.levelChoices.length, f.player.level - 1);
  assert.equal(f.session.gameState, GameState.PLAYING);
});

test('chest without a gained level resumes after choosing its relic', () => {
  const f = fixture();
  f.player.level = 20;
  f.player.xpToNextLevel = 1000;
  f.session.handleInteract();
  assert.equal(f.session.gameState, GameState.LEVEL_UP);
  f.chestChoices[0](f.item);
  assert.equal(f.levelChoices.length, 0);
  assert.equal(f.session.isRewardChoiceActive, false);
  assert.equal(f.session.gameState, GameState.PLAYING);
});

test('co-op serializes chest and upgrades without pausing the shared world', () => {
  const f = fixture(true);
  f.session.handleInteract();
  f.session.handleInteract();
  assert.equal(f.opens(), 1, 'cannot interact again during a reward choice');
  assert.equal(f.levelChoices.length, 0);
  assert.equal(f.session.gameState, GameState.PLAYING);
  // Gems can arrive while the chest is open in co-op.
  f.player.gainXp(100);
  f.chestChoices[0](f.item);
  assert.equal(f.session.gameState, GameState.PLAYING);
  f.chooseAll();
  assert.equal(f.levelChoices.length, f.player.level - 1);
  assert.ok(f.player.buffs.length >= 2, 'preserves selection shields');
});

test('duplicate callbacks cannot consume another level or resume early', () => {
  const f = fixture();
  f.session.handleInteract();
  f.player.gainXp(100);
  f.chestChoices[0](f.item);
  f.chestChoices[0](f.item);
  assert.equal(f.player.items.length, 1);
  const first = f.levelChoices[0];
  first();
  const remaining = f.session.pendingLevelUps;
  first();
  assert.equal(f.session.pendingLevelUps, remaining);
  assert.equal(f.session.isLevelUpActive, true);
  assert.equal(f.session.gameState, GameState.LEVEL_UP);
});

test('stale auto-choice callback cannot change a new session', () => {
  const f = fixture();
  f.player.gainXp(10);
  const oldCallback = f.levelChoices[0];
  // Use the production cleanup shared by restart, main menu, and game over.
  (f.session as any).resetRewardChoices();
  f.session.gameState = GameState.PLAYING;
  f.player.gainXp(f.player.xpToNextLevel);
  oldCallback();
  assert.equal(f.session.gameState, GameState.LEVEL_UP);
  assert.equal(f.session.isLevelUpActive, true);
});

test('warping and pause defer upgrades until play resumes', () => {
  const f = fixture();
  f.session.isWarping = true;
  f.player.gainXp(10);
  f.session.triggerLevelUp();
  assert.equal(f.levelChoices.length, 0);
  f.session.isWarping = false;
  f.session.gameState = GameState.PAUSED;
  f.session.triggerLevelUp();
  assert.equal(f.levelChoices.length, 0);
  f.session.gameState = GameState.PLAYING;
  f.session.triggerLevelUp();
  assert.equal(f.levelChoices.length, 1);
});

test('network XP dev action offers one upgrade per level', () => {
  const f = fixture(true);
  f.coordinator.handleClientDevAction('xp_1000', 1000);
  f.chooseAll();
  assert.equal(f.levelChoices.length, f.player.level - 1);
});

test('training XP button offers one upgrade per level; direct level button still works', () => {
  const buttons = new Map<string, EventTarget>([
    ['dev-btn-xp1000', new EventTarget()], ['dev-btn-lvl1', new EventTarget()]
  ]);
  const originalDocument = globalThis.document;
  (globalThis as any).document = {
    getElementById: (id: string) => buttons.get(id) ?? null,
    querySelectorAll: () => []
  };
  try {
    const f = fixture();
    new DevManager(f.player, {} as any, {} as any, {} as any, {} as any, (count = 1) => {
      f.session.pendingLevelUps += count;
      f.session.triggerLevelUp();
    });
    buttons.get('dev-btn-xp1000')!.dispatchEvent(new Event('click'));
    f.chooseAll();
    assert.equal(f.levelChoices.length, f.player.level - 1);
    const before = f.levelChoices.length;
    buttons.get('dev-btn-lvl1')!.dispatchEvent(new Event('click'));
    assert.equal(f.levelChoices.length, before + 1);
    f.levelChoices[before]();
    assert.equal(f.session.gameState, GameState.PLAYING);
  } finally {
    (globalThis as any).document = originalDocument;
  }
});

test('merchant interaction in solo pauses the game and displays merchant modal', () => {
  const f = fixture(false);
  f.setMerchantCanInteract(true);
  f.session.handleInteract();
  assert.equal(f.merchantOpens(), 1);
  assert.equal(f.session.gameState, GameState.PAUSED);
});

test('merchant interaction in co-op preserves world simulation and shields the player', () => {
  const f = fixture(true);
  f.setMerchantCanInteract(true);
  f.session.handleInteract();
  assert.equal(f.merchantOpens(), 1);
  assert.equal(f.session.gameState, GameState.PLAYING);
  assert.ok(f.player.buffs.some((b: any) => b.type === 'invulnerable' && b.name === 'Щит торговли'));
});

test('merchant purchase accounts for credits and deducts them', () => {
  const f = fixture();
  f.player.credits = 120;
  const itemToBuy = { id: 'test_item', name: 'Item', price: 80 };
  const res = f.merchantManager.buyItem(itemToBuy, f.player);
  assert.equal(res.success, true);
  assert.equal(f.player.credits, 40);
  assert.equal(f.player.items.length, 1);

  const tooExpensive = { id: 'pricey', name: 'Pricey', price: 100 };
  const failRes = f.merchantManager.buyItem(tooExpensive, f.player);
  assert.equal(failRes.success, false);
  assert.equal(f.player.credits, 40);
});

test('dev credits button and coordinator grant 500 credits', () => {
  const buttons = new Map<string, EventTarget>([
    ['dev-btn-credits', new EventTarget()]
  ]);
  const originalDocument = globalThis.document;
  (globalThis as any).document = {
    getElementById: (id: string) => buttons.get(id) ?? null,
    querySelectorAll: () => []
  };
  try {
    const f = fixture(true);
    const initialCredits = f.player.credits;
    new DevManager(f.player, {} as any, {} as any, {} as any, {} as any, () => {});
    buttons.get('dev-btn-credits')!.dispatchEvent(new Event('click'));
    assert.equal(f.player.credits, initialCredits + 500);

    f.coordinator.handleClientDevAction('credits_500', 500);
    assert.equal(f.player.credits, initialCredits + 1000);
  } finally {
    (globalThis as any).document = originalDocument;
  }
});

