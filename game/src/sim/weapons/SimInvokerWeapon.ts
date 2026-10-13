import {
  INVOKER_SPELL_IDS,
  INVOKER_SPELLS,
  INVOKE_BASE_DAMAGE,
  INVOKE_COOLDOWN_FACTOR,
  invokerWeaponId,
  type InvokerSpellId,
  type InvokerSpellCast,
  type SpellControl
} from '../../shared/InvokerSpells';
import { InvokerSpellRuntime, type SpellContext } from '../../shared/InvokerSpellRuntime';
import { DEFAULT_BALANCE } from '../../balance/defaultBalance';
import { SimVec3 } from '../math/SimVector';
import {
  SimWeapon,
  SimProjectileData,
  SimPlayerRef,
  SimEnemyRef,
  findClosestSimEnemies
} from './SimWeaponBase';

export class SimInvokerWeapon extends SimWeapon {
  private runtime = new InvokerSpellRuntime<SimEnemyRef>();
  private invokeSource?: SimInvokerWeapon;

  public setInvokeSource(invoke?: SimInvokerWeapon): void {
    this.invokeSource = invoke?.spell === null ? invoke : undefined;
  }

  public get spellLevel(): number {
    return Math.min(12, this.level + (this.spell ? (this.invokeSource?.level ?? 1) - 1 : 0));
  }

  public onSpellControl?: (enemy: SimEnemyRef, control: SpellControl) => void;
  public onSpellBuff?: (spell: 'ghost_walk' | 'alacrity', level: number) => void;
  public onSpellCast?: (cast: InvokerSpellCast) => void;
  public random: () => number = Math.random;
  public lastSpell: InvokerSpellId | null = null;
  private baseDamage: number;
  private baseCooldown: number;
  private damagePerLevel: number;

  constructor(public readonly spell: InvokerSpellId | null = null) {
    const id = spell ? invokerWeaponId(spell) : 'invoker_invoke';
    const config = DEFAULT_BALANCE.weapons[id];
    super(id, config.name, config.icon, config.cooldown, config.damage);
    this.baseDamage = config.damage;
    this.baseCooldown = config.cooldown;
    this.damagePerLevel = config.damagePerLevel;
  }

  public override get effectiveCooldown(): number {
    const cooldown = super.effectiveCooldown * (this.spell
      ? Math.pow(INVOKE_COOLDOWN_FACTOR, (this.invokeSource?.level ?? 1) - 1) : 1);
    return this.spell === 'ghost_walk'
      ? Math.max(INVOKER_SPELLS.ghost_walk.duration + 1.5, cooldown)
      : Math.max(0.08, cooldown);
  }

  public update(
    dt: number, player: SimPlayerRef, enemies: SimEnemyRef[],
    _spawn: (p: SimProjectileData) => void,
    damage: (enemyId: string, damage: number, source: SimVec3, knockback?: number) => void,
    triggerAnim?: (duration: number) => void,
    emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ): void {
    if (this.spell && !this.invokeSource) {
      this.runtime.clear();
      return;
    }
    const context: SpellContext<SimEnemyRef> = {
      position: player.position, enemies,
      damage: (enemy, amount, source) => damage(
        enemy.id, amount * player.damageMultiplier, new SimVec3(source.x, source.y, source.z), 0
      ),
      control: (enemy, control) => this.onSpellControl?.(enemy, control),
      buff: (spell, level) => this.onSpellBuff?.(spell, level),
      visual: cast => this.onSpellCast?.(cast)
    };
    this.runtime.update(dt, context);
    this.timer += dt;
    if (this.timer < this.effectiveCooldown) return;
    const target = findClosestSimEnemies(enemies, player.position, 1, 22 * 22)[0];
    if (!target) return;
    const index = Math.max(0, Math.min(9, Math.floor(this.random() * INVOKER_SPELL_IDS.length)));
    const spell = this.spell ?? INVOKER_SPELL_IDS[index];
    this.timer = 0;
    this.lastSpell = spell;
    this.runtime.cast(
      spell, this.spellLevel,
      this.spell ? this.damage * (this.invokeSource!.damage / INVOKE_BASE_DAMAGE)
        : INVOKER_SPELLS[spell].damage * (this.damage / INVOKE_BASE_DAMAGE),
      target, context
    );
    triggerAnim?.(0.5);
    emitSound?.('magic');
  }

  public upgrade(): void {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage = this.baseDamage + (this.level - 1) * this.damagePerLevel;
    this.cooldown = Math.max(0.5, this.baseCooldown * Math.pow(this.spell ? 0.975 : INVOKE_COOLDOWN_FACTOR, this.level - 1));
  }

  public getNextUpgradeDescription(): string {
    return this.spell ? 'Усиливает заклинание; −2.5% перезарядки' : '+25% базового урона заклинаний; −4% перезарядки; сильнее область, контроль и усиления';
  }
}
