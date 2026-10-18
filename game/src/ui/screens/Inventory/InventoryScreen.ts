import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { Player } from '../../../entities/Player';
import { Weapon } from '../../../combat/Weapon';
import { RIFT_ITEMS } from '../../../items/RiftItemSystem';
import { getHeroDetails, getHeroName } from '../../modules/HeroUIHelpers';

export interface InventoryScreenOptions {
  container?: HTMLElement | null;
}

export class InventoryScreen extends Screen {
  private inventoryBackdrop: HTMLElement | null = null;
  private btnCloseInventory: HTMLElement | null = null;
  private btnOpenInventory: HTMLElement | null = null;
  private inventoryHeroTitle: HTMLElement | null = null;
  private inventoryHeroPortraitImg: HTMLImageElement | null = null;
  private inventoryHeroName: HTMLElement | null = null;
  private inventoryHeroLevelBadge: HTMLElement | null = null;
  private inventoryHeroSubtitleText: HTMLElement | null = null;
  private inventoryHeroXpFill: HTMLElement | null = null;
  private inventoryHeroXpText: HTMLElement | null = null;
  private inventoryStatsList: HTMLElement | null = null;
  private inventoryPassivesList: HTMLElement | null = null;
  private inventoryWeaponsList: HTMLElement | null = null;
  private inventoryItemsList: HTMLElement | null = null;
  private btnToggleStatMode: HTMLElement | null = null;
  private statModeLabel: HTMLElement | null = null;

  public cachedPlayer: Player | null = null;
  public statDisplayMode: 'split' | 'total' = 'split';
  public onInventoryToggle?: (isOpen: boolean) => void;
  public onMenuPush?: (menu: string) => void;
  public onMenuRemove?: (menu: string) => void;

  constructor(options?: InventoryScreenOptions) {
    const existingModal = options?.container || SafeDOM.getElementById('inventory-modal');
    super('inventory', existingModal);

    this.bindElements();
    this.bindEvents();
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {
    this.inventoryBackdrop = SafeDOM.query(this.container, '#inventory-backdrop');
    this.btnCloseInventory = SafeDOM.query(this.container, '#btn-close-inventory');
    this.btnOpenInventory = SafeDOM.getElementById('btn-open-inventory');
    this.inventoryHeroTitle = SafeDOM.query(this.container, '#inventory-hero-title');
    this.inventoryHeroPortraitImg = SafeDOM.query<HTMLImageElement>(this.container, '#inventory-hero-portrait-img');
    this.inventoryHeroName = SafeDOM.query(this.container, '#inventory-hero-name');
    this.inventoryHeroLevelBadge = SafeDOM.query(this.container, '#inventory-hero-level-badge');
    this.inventoryHeroSubtitleText = SafeDOM.query(this.container, '#inventory-hero-subtitle-text');
    this.inventoryHeroXpFill = SafeDOM.query(this.container, '#inventory-hero-xp-fill');
    this.inventoryHeroXpText = SafeDOM.query(this.container, '#inventory-hero-xp-text');
    this.inventoryStatsList = SafeDOM.query(this.container, '#inventory-stats-list');
    this.inventoryPassivesList = SafeDOM.query(this.container, '#inventory-passives-list');
    this.inventoryWeaponsList = SafeDOM.query(this.container, '#inventory-weapons-list');
    this.inventoryItemsList = SafeDOM.query(this.container, '#inventory-items-list');
    this.btnToggleStatMode = SafeDOM.query(this.container, '#btn-inventory-toggle-stat-mode');
    this.statModeLabel = SafeDOM.query(this.container, '#inventory-stat-mode-label');
  }

  protected bindEvents(): void {
    this.btnCloseInventory?.addEventListener('click', () => this.hideInventory());
    this.inventoryBackdrop?.addEventListener('click', () => this.hideInventory());
    this.btnOpenInventory?.addEventListener('click', () => {
      if (this.cachedPlayer) this.toggleInventory(this.cachedPlayer);
    });

    this.btnToggleStatMode?.addEventListener('click', () => {
      this.toggleStatDisplayMode();
    });
  }

  public toggleStatDisplayMode(): void {
    this.statDisplayMode = this.statDisplayMode === 'split' ? 'total' : 'split';
    if (this.statModeLabel) {
      this.statModeLabel.textContent = this.statDisplayMode === 'split' ? 'Режим: Базовый (+бонус)' : 'Режим: Общий';
    }
    if (this.cachedPlayer) {
      this.renderInventory(this.cachedPlayer);
    }
  }

  public isInventoryOpen(): boolean {
    return !this.container.classList.contains('hidden');
  }

  public toggleInventory(player?: Player): void {
    const targetPlayer = player || this.cachedPlayer;
    if (!targetPlayer) return;

    if (this.isInventoryOpen()) {
      this.hideInventory();
    } else {
      this.showInventory(targetPlayer);
    }
  }

  public showInventory(player: Player): void {
    this.cachedPlayer = player;
    this.renderInventory(player);
    this.show();
    this.onMenuPush?.('inventory');
    this.onInventoryToggle?.(true);
  }

  public hideInventory(): void {
    this.hide();
    this.onMenuRemove?.('inventory');
    this.onInventoryToggle?.(false);
  }

  public renderInventory(player: Player): void {
    const rawHeroName = player.displayName || getHeroName(player.charType) || player.charType || 'Странник Прерии';
    const heroName = rawHeroName.toUpperCase();

    if (this.inventoryHeroTitle) {
      this.inventoryHeroTitle.textContent = `${heroName} • УРОВЕНЬ ${player.level}`;
    }
    if (this.inventoryHeroName) {
      this.inventoryHeroName.textContent = heroName;
    }
    if (this.inventoryHeroLevelBadge) {
      this.inventoryHeroLevelBadge.textContent = `УР. ${player.level}`;
    }
    if (this.inventoryHeroPortraitImg) {
      this.inventoryHeroPortraitImg.src = `/textures/heroes/${player.charType}/portrait.png`;
      this.inventoryHeroPortraitImg.alt = heroName;
    }
    if (this.inventoryHeroSubtitleText) {
      const details = getHeroDetails(player.charType);
      const roleText = details?.role ? `${details.role} • Странник Разлома` : '«Адепт Разлома» • Странник Бездны';
      this.inventoryHeroSubtitleText.textContent = roleText;
    }
    if (this.inventoryHeroXpFill && this.inventoryHeroXpText) {
      const xpNeeded = player.xpToNextLevel || 100;
      const currentXp = player.xp || 0;
      const xpPercent = Math.min(100, Math.max(0, Math.round((currentXp / Math.max(1, xpNeeded)) * 100)));
      this.inventoryHeroXpFill.style.width = `${xpPercent}%`;
      this.inventoryHeroXpText.textContent = `${Math.round(currentXp)} / ${Math.round(xpNeeded)} XP`;
    }

    if (this.statModeLabel) {
      this.statModeLabel.textContent = this.statDisplayMode === 'split' ? 'Режим: Базовый (+бонус)' : 'Режим: Общий';
    }

    // 1. Stats Table
    if (this.inventoryStatsList) {
      const critPct = (player.critChance * 100).toFixed(1);
      const critDmgPct = (player.critDamage * 100).toFixed(1);
      const cdrPct = Math.round((1 - player.passiveCooldownMultiplier) * 100);
      const naniteReduction = player.getNaniteDamageReduction();
      const totalArmorPct = Math.round((1 - (1 - player.passiveDamageReduction) * (1 - naniteReduction)) * 100);

      // HP display & gauge fill
      const baseMaxHp = player.baseMaxHp || 100;
      const hpBonus = Math.max(0, player.maxHp - baseMaxHp);
      const hpRatio = Math.min(100, Math.max(0, Math.round((player.hp / Math.max(1, player.maxHp)) * 100)));
      const hpValue = this.statDisplayMode === 'split' && hpBonus > 0
        ? `<span style="color: #f8fafc;">${Math.round(player.hp)} / ${baseMaxHp}</span> <span class="val-green">(+${hpBonus})</span>`
        : `<span style="color: #f8fafc;">${Math.round(player.hp)} / ${player.maxHp}</span>`;

      // Shield gauge fill
      const shieldRatio = player.maxShield > 0 ? Math.min(100, Math.max(0, Math.round((player.shield / player.maxShield) * 100))) : 0;

      // Weapon damage calculations across all currently equipped weapons
      const activeWeapons = player.weapons.length > 0 ? player.weapons : [];
      let totalBaseDamage = 0;
      let totalEffectiveDamage = 0;
      let totalBaseDps = 0;
      let totalDps = 0;

      if (activeWeapons.length > 0) {
        for (const w of activeWeapons) {
          const mult = player.getDamageMultiplier(w.id);
          const effDmg = w.damage * mult;
          totalBaseDamage += w.baseDamage;
          totalEffectiveDamage += effDmg;
          const cd = Math.max(0.08, w.effectiveCooldown || 1.0);
          totalBaseDps += w.baseDamage / cd;
          totalDps += effDmg / cd;
        }
      } else {
        const mult = player.getDamageMultiplier(player.startingWeaponId);
        totalBaseDamage = 15;
        totalEffectiveDamage = 15 * mult;
        totalBaseDps = 15;
        totalDps = totalEffectiveDamage;
      }

      const totalBonusDmg = Math.max(0, Math.round(totalEffectiveDamage - totalBaseDamage));
      const totalBonusDps = Math.max(0, Math.round(totalDps - totalBaseDps));

      const dpsValue = this.statDisplayMode === 'split' && totalBonusDps > 0
        ? `<span class="val-dps">(${Math.round(totalBaseDps)} <span style="color: #4ade80;">(+${totalBonusDps})</span> DPS)</span>`
        : `<span class="val-dps">(${Math.round(totalDps)} DPS)</span>`;

      const weaponsDmgValue = this.statDisplayMode === 'split' && totalBonusDmg > 0
        ? `<span style="color: #f8fafc;">${Math.round(totalBaseDamage)}</span> <span class="val-green">(+${totalBonusDmg})</span> ${dpsValue}`
        : `<span style="color: #f8fafc;">${Math.round(totalEffectiveDamage)}</span> ${dpsValue}`;

      // Speed display
      const spdBonus = Number((player.speed - player.baseSpeed).toFixed(1));
      const spdValue = this.statDisplayMode === 'split' && spdBonus > 0
        ? `<span style="color: #f8fafc;">${player.baseSpeed.toFixed(1)}</span> <span class="val-green">(+${spdBonus})</span> <span style="color: #94a3b8; font-size: 10px;">(x${player.passiveSpeedMultiplier.toFixed(2)})</span>`
        : `<span style="color: #f8fafc;">${player.speed.toFixed(1)}</span> <span style="color: #94a3b8; font-size: 10px;">(x${player.passiveSpeedMultiplier.toFixed(2)})</span>`;

      this.inventoryStatsList.innerHTML = `
        <!-- Subgroup: Survivability -->
        <div class="stat-subgroup-title">Выживаемость</div>

        <div class="stat-row-plate">
          <div class="stat-gauge-fill gauge-hp" style="width: ${hpRatio}%;"></div>
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">❤️</span>
            <span class="stat-name">Здоровье</span>
          </div>
          <div class="stat-val-wrap">${hpValue}</div>
        </div>

        <div class="stat-row-plate">
          <div class="stat-gauge-fill gauge-shield" style="width: ${shieldRatio}%;"></div>
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">🛡️</span>
            <span class="stat-name">Энергощит</span>
          </div>
          <div class="stat-val-wrap" style="color: #38bdf8;">${Math.round(player.shield)} / ${player.maxShield}</div>
        </div>

        <div class="stat-row-plate">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">💖</span>
            <span class="stat-name">Регенерация HP</span>
          </div>
          <div class="stat-val-wrap val-green">+${player.passiveHpRegen.toFixed(1)} / с</div>
        </div>

        <div class="stat-row-plate">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">🦺</span>
            <span class="stat-name">Броня (Снижение урона)</span>
          </div>
          <div class="stat-val-wrap">-${totalArmorPct}%</div>
        </div>

        <!-- Subgroup: Combat -->
        <div class="stat-subgroup-title">Боевая Мощь</div>

        <div class="stat-row-plate" title="Суммарный базовый или эффективный урон (+бонус) и общий DPS всех экипированных оружий">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">⚔️</span>
            <span class="stat-name">Урон оружий</span>
          </div>
          <div class="stat-val-wrap">${weaponsDmgValue}</div>
        </div>

        ${player.mightElixirCount > 0 ? `
        <div class="stat-row-plate" title="Бонус урона от Эликсира Могущества (+1% за каждый заряд)">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">⚡</span>
            <span class="stat-name">Эликсир Могущества</span>
          </div>
          <div class="stat-val-wrap val-amber">+${player.mightElixirCount * 1}% <span class="val-dps">(x${player.mightElixirCount})</span></div>
        </div>` : ''}

        <div class="stat-row-plate" title="Шанс критического удара (максимум 100%)">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">🎯</span>
            <span class="stat-name">Шанс крит. урона</span>
          </div>
          <div class="stat-val-wrap val-crit">${critPct}%</div>
        </div>

        <div class="stat-row-plate" title="Множитель критического урона (максимум 1000%)">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">💥</span>
            <span class="stat-name">Крит. урон</span>
          </div>
          <div class="stat-val-wrap val-crit-dmg">+${critDmgPct}%</div>
        </div>

        <div class="stat-row-plate" title="Ускорение перезарядки">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">⏱️</span>
            <span class="stat-name">Ускорение перезарядки</span>
          </div>
          <div class="stat-val-wrap val-purple">+${cdrPct}%</div>
        </div>

        <!-- Subgroup: Expedition & Rift -->
        <div class="stat-subgroup-title">Экспедиция и Разлом</div>

        <div class="stat-row-plate">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">👟</span>
            <span class="stat-name">Скорость</span>
          </div>
          <div class="stat-val-wrap val-cyan">${spdValue}</div>
        </div>

        <div class="stat-row-plate" title="Радиус сбора кристаллов">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">🧲</span>
            <span class="stat-name">Радиус сбора</span>
          </div>
          <div class="stat-val-wrap">${player.pickupRadius.toFixed(1)}м</div>
        </div>

        <div class="stat-row-plate">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">⬡</span>
            <span class="stat-name">Кредиты Разлома</span>
          </div>
          <div class="stat-val-wrap val-amber">${player.credits} ◈</div>
        </div>

        <div class="stat-row-plate">
          <div class="stat-left-wrap">
            <span class="stat-icon-glyph">💀</span>
            <span class="stat-name">Убийств</span>
          </div>
          <div class="stat-val-wrap" style="color: #cbd5e1;">${player.kills}</div>
        </div>
      `;
    }

    // 2. Passives List
    if (this.inventoryPassivesList) {
      const passivesList = [
        {
          id: 'stat_amplifier',
          icon: '⭐',
          count: player.amplifierCount,
          title: 'Усилитель',
          desc: `+${player.amplifierCount * 2}% к урону всех оружий (складывается, x${player.passiveDamageMultiplier.toFixed(2)})`
        },
        {
          id: 'stat_speed_boots',
          icon: '🥾',
          count: player.speedBootsCount,
          title: 'Ботинки Скорости',
          desc: `+${player.speedBootsCount * 3}% к скорости бега (x${player.passiveSpeedMultiplier.toFixed(2)}, макс. 3.0x)`
        },
        {
          id: 'stat_flask',
          icon: '🍶',
          count: player.flaskCount,
          title: 'Фляга с Виски',
          desc: `+${player.flaskCount * 30} к макс HP (${player.maxHp} HP)`
        },
        {
          id: 'stat_magnet',
          icon: '🧲',
          count: player.magnetCount,
          title: 'Магнит',
          desc: `${player.pickupRadius.toFixed(1)}м радиус магнита (макс. 50м)`
        },
        {
          id: 'stat_amulet',
          icon: '🧿',
          count: player.amuletCount,
          title: 'Охотничий Амулет',
          desc: `+${player.amuletCount * 1} HP/с регенерации (всего +${player.passiveHpRegen.toFixed(1)} HP/с, без лимита)`
        },
        {
          id: 'stat_vest',
          icon: '🦺',
          count: player.vestCount,
          title: 'Кожаный Жилет',
          desc: `-${(player.passiveDamageReduction * 100).toFixed(1)}% получаемого урона (макс. 70%)`
        },
        {
          id: 'stat_watch',
          icon: '⏱️',
          count: player.watchCount,
          title: 'Карманные Часы',
          desc: `+${Math.round((1 - player.passiveCooldownMultiplier) * 100)}% к ускорению перезарядки (макс. 30%)`
        },
        {
          id: 'stat_might_elixir',
          icon: '⚡',
          count: player.mightElixirCount,
          title: 'Эликсир Могущества',
          desc: `+${player.mightElixirCount * 1}% к общему урону героя (складывается)`
        }
      ];

      const active = passivesList.filter((p) => p.count > 0);
      if (active.length === 0) {
        this.inventoryPassivesList.innerHTML = `
          <div class="passives-sockets-row">
            <div class="passive-socket-item"><span class="passive-empty-symbol">ᚱ</span></div>
            <div class="passive-socket-item"><span class="passive-empty-symbol">ᛟ</span></div>
            <div class="passive-socket-item"><span class="passive-empty-symbol">ᛉ</span></div>
            <div class="passive-socket-item"><span class="passive-empty-symbol">ᚦ</span></div>
            <div class="passive-socket-item"><span class="passive-empty-symbol">ᚷ</span></div>
            <div class="passive-socket-item"><span class="passive-empty-symbol">ᚹ</span></div>
          </div>
          <div class="passives-empty-hint">Древние руны безмолвствуют. Пассивные дары откроются при получении уровней!</div>
        `;
      } else {
        this.inventoryPassivesList.innerHTML = active
          .map(
            (p) => `
          <div class="inv-passive-card">
            <span class="inv-passive-icon">${p.icon}</span>
            <div class="inv-passive-body">
              <div class="inv-passive-head">
                <span class="inv-passive-title">${p.title}</span>
                <span class="inv-passive-stacks">x${p.count}</span>
              </div>
              <div class="inv-passive-desc">${p.desc}</div>
            </div>
          </div>
        `
          )
          .join('');
      }
    }

    // 3. Weapons with Upgrade History, Metrics & Evolution Line
    if (this.inventoryWeaponsList) {
      if (player.weapons.length === 0) {
        this.inventoryWeaponsList.innerHTML = `<div class="inv-empty-hint">Оружие пока не получено</div>`;
      } else {
        const gradeNames: Record<string, string> = {
          common: 'Обычный',
          uncommon: 'Необычный',
          rare: 'Редкий',
          legendary: 'Легендарный'
        };

        this.inventoryWeaponsList.innerHTML = player.weapons
          .map((weapon) => {
            const isStart = weapon.id === player.startingWeaponId;
            const tier = (weapon.awakenedGrade ?? 0) >= 2 ? 1 : (weapon.awakenedGrade ?? 0) === 1 ? 2 : 3;
            const gradeLabel = `ТИР ${tier}`;
            const badgeClass = `badge-tier${tier}`;

            const historyHtml = (weapon.upgradeHistory || [])
              .map(
                (grade, idx) => `
            <span class="inv-grade-chip grade-${grade}">#${idx + 1} ${gradeNames[grade] || grade}</span>
          `
              )
              .join('');

            const pipsHtml = Array.from({ length: 12 }, (_, i) => `<div class="weapon-pip ${i < weapon.level ? 'active' : ''}"></div>`).join('');

            const anyW = weapon as any;
            const dps = Math.round(weapon.damage / Math.max(0.08, weapon.effectiveCooldown));
            const dmgNum = Math.round(weapon.damage);
            const projCount = typeof anyW.projectileCount === 'number' ? anyW.projectileCount : typeof anyW.orbCount === 'number' ? anyW.orbCount : 1;
            const projSpeed = typeof anyW.projectileSpeed === 'number' ? `${anyW.projectileSpeed} м/с` : typeof anyW.radius === 'number' ? `${anyW.radius}м` : '16 м/с';
            const dealt = Math.round(weapon.damageDealt || 0).toLocaleString('ru-RU');

            return `
            <div class="weapon-card-gothic">
              <div class="weapon-card-top-row">
                <div class="weapon-socket-art">
                  <img src="${weapon.iconImage || `/textures/weapons/weapon_${weapon.id}.png`}" class="weapon-sprite-img" alt="${weapon.name}" onerror="this.style.display='none'; if(this.nextElementSibling) (this.nextElementSibling as HTMLElement).style.display='inline';" />
                  <span class="inv-weapon-fallback-icon" style="display: none;">${weapon.icon}</span>
                </div>
                <div class="weapon-details-col">
                  <div class="weapon-title-line">
                    <span class="weapon-main-name">${weapon.name}</span>
                    <span class="badge-tier-plaque ${badgeClass}">${gradeLabel}</span>
                    ${isStart ? '<span class="badge-tag-start">НАЧАЛЬНОЕ</span>' : ''}
                    <span class="badge-tag-lvl">УР. ${weapon.level} / ${weapon.maxLevel}</span>
                  </div>
                  <div class="weapon-pips-track">
                    ${pipsHtml}
                  </div>
                </div>
              </div>

              <div class="weapon-metrics-grid">
                <div class="metric-tile">
                  <span class="metric-lbl">Урон</span>
                  <span class="metric-num" style="color: #fb923c;">${dmgNum}</span>
                </div>
                <div class="metric-tile">
                  <span class="metric-lbl">Кулдаун</span>
                  <span class="metric-num">${weapon.effectiveCooldown.toFixed(2)}с</span>
                </div>
                <div class="metric-tile">
                  <span class="metric-lbl">DPS</span>
                  <span class="metric-num" style="color: #f59e0b;">${dps}</span>
                </div>
                <div class="metric-tile">
                  <span class="metric-lbl">Снаряды</span>
                  <span class="metric-num" style="color: #38bdf8;">${projCount}</span>
                </div>
                <div class="metric-tile">
                  <span class="metric-lbl">Скорость</span>
                  <span class="metric-num">${projSpeed} м/с</span>
                </div>
                <div class="metric-tile">
                  <span class="metric-lbl">Нанесено</span>
                  <span class="metric-num" style="color: #cbd5e1;">${dealt}</span>
                </div>
              </div>

              <div class="weapon-evolution-track">
                <span class="evo-header-lbl">Линия Эволюции Оружия:</span>
                <div class="evo-nodes-wrap">
                  <div class="evo-node ${tier >= 3 ? 'active' : 'locked'}">
                    <span>◈</span>
                    <span>Тир III (Базовый)</span>
                  </div>
                  <span class="evo-arrow">➔</span>
                  <div class="evo-node ${tier <= 2 ? 'active' : 'locked'}">
                    <span>${tier <= 2 ? '◈' : '🔒'}</span>
                    <span>Тир II (Закалённый)</span>
                  </div>
                  <span class="evo-arrow">➔</span>
                  <div class="evo-node ${tier === 1 ? 'active' : 'locked'}">
                    <span>${tier === 1 ? '◈' : '🔒'}</span>
                    <span>Тир I (Пробуждённый)</span>
                  </div>
                </div>
              </div>

              ${historyHtml ? `
              <div class="inv-weapon-history-row" style="margin-top: 8px;">
                <span class="inv-history-label">Тиры улучшений:</span>
                <div class="inv-history-chips">
                  ${historyHtml}
                </div>
              </div>` : ''}
            </div>
          `;
          })
          .join('');
      }
    }

    // 4. Rift Items / Relics
    if (this.inventoryItemsList) {
      const itemEntries = Array.from(player.riftItems.entries());
      if (itemEntries.length === 0) {
        this.inventoryItemsList.innerHTML = `
          <div class="relics-sockets-grid">
            ${Array.from({ length: 8 }, (_, i) => `
              <div class="relic-socket-cell">
                <span class="relic-rune-watermark">✧</span>
                <span class="relic-socket-hint">Слот ${i + 1}</span>
              </div>
            `).join('')}
          </div>
          <div class="relic-empty-banner">
            <span>🗝️</span>
            <span>Сундуки Разлома ещё не открыты. Отыщите реликварий в прерии!</span>
          </div>
        `;
      } else {
        const rarityOrder: Record<string, number> = {
          boss: 5,
          legendary: 4,
          rare: 3,
          uncommon: 2,
          common: 1
        };
        itemEntries.sort((a, b) => {
          const defA = RIFT_ITEMS[a[0]];
          const defB = RIFT_ITEMS[b[0]];
          const rA = rarityOrder[defA?.rarity || 'common'] || 0;
          const rB = rarityOrder[defB?.rarity || 'common'] || 0;
          return rB - rA;
        });

        const rarityLabels: Record<string, string> = {
          common: 'Обычный',
          uncommon: 'Необычный',
          rare: 'Редкий',
          legendary: 'Легендарный',
          boss: 'Босс'
        };

        this.inventoryItemsList.innerHTML = `
          <div class="relics-items-populated-grid">
            ${itemEntries
              .map(([id, count]) => {
                const def = RIFT_ITEMS[id];
                if (!def) return '';
                const rarityLabel = rarityLabels[def.rarity] || def.rarity;

                const itemDesc = id === 'nanite_plating'
                  ? `Снижает входящий урон на ${(player.getNaniteDamageReduction() * 100).toFixed(1)}% (макс. 60% на 20 ур.).`
                  : def.description;

                return `
                <div class="inv-item-card grade-${def.rarity}">
                  <div class="inv-item-card-top">
                    <span class="inv-item-icon" style="color: ${def.color};">${def.icon}</span>
                    <span class="grade-badge grade-${def.rarity}">${rarityLabel.toUpperCase()}</span>
                    <span class="inv-item-count">x${count}</span>
                  </div>
                  <div class="inv-item-name" style="color: ${def.color};">${def.name}</div>
                  <div class="inv-item-desc">${itemDesc}</div>
                </div>
              `;
              })
              .join('')}
          </div>
        `;
      }
    }
  }

  public getWeaponDetailedInventoryStats(weapon: Weapon): { label: string; value: string }[] {
    const baseDmg = Math.round(weapon.baseDamage + (weapon.level - 1) * weapon.damagePerLevel * weapon.gradeStatMultiplier);
    const bonusDmg = Math.round(weapon.bonusDamage);
    const totalDmg = Math.round(weapon.damage);

    let dmgDisplay = '';
    if (this.statDisplayMode === 'split') {
      if (bonusDmg > 0) {
        dmgDisplay = `<span style="color: #f1f5f9;">${baseDmg}</span> <span style="color: #22c55e; font-weight: 800;">(+${bonusDmg})</span>`;
      } else {
        dmgDisplay = `<span style="color: #f1f5f9;">${baseDmg}</span>`;
      }
    } else {
      dmgDisplay = `<span style="color: #f1f5f9;">${totalDmg}</span>`;
    }

    const dps = Math.round(weapon.damage / Math.max(0.08, weapon.effectiveCooldown));
    const baseDps = Math.round(baseDmg / Math.max(0.08, weapon.effectiveCooldown));
    const bonusDps = Math.max(0, dps - baseDps);

    let dpsDisplay = '';
    if (this.statDisplayMode === 'split' && bonusDps > 0) {
      dpsDisplay = `<span style="color: #f1f5f9;">${baseDps}</span> <span style="color: #22c55e; font-weight: 800;">(+${bonusDps})</span>`;
    } else {
      dpsDisplay = `<span style="color: #f1f5f9;">${dps}</span>`;
    }

    const stats: { label: string; value: string }[] = [
      { label: 'Урон', value: dmgDisplay },
      { label: 'КД', value: `${weapon.effectiveCooldown.toFixed(2)}с` },
      { label: 'DPS', value: dpsDisplay },
      { label: 'Нанесено урона', value: `${Math.round(weapon.damageDealt || 0).toLocaleString('ru-RU')}` }
    ];

    const anyW = weapon as any;
    if (typeof anyW.radius === 'number') {
      stats.push({ label: 'Радиус', value: `${anyW.radius}м` });
    } else if (typeof anyW.slashRadius === 'number') {
      stats.push({ label: 'Радиус', value: `${anyW.slashRadius}м` });
    } else if (typeof anyW.orbitRadius === 'number') {
      stats.push({ label: 'Радиус орбиты', value: `${anyW.orbitRadius}м` });
    } else if (typeof anyW.explosionRadius === 'number') {
      stats.push({ label: 'Радиус взрыва', value: `${anyW.explosionRadius}м` });
    } else if (typeof anyW.strikeRadius === 'number') {
      stats.push({ label: 'Радиус удара', value: `${anyW.strikeRadius}м` });
    }

    if (typeof anyW.projectileCount === 'number') {
      stats.push({ label: 'Снаряды', value: `${anyW.projectileCount}` });
    } else if (typeof anyW.orbCount === 'number') {
      stats.push({ label: 'Сферы', value: `${anyW.orbCount}` });
    } else if (typeof anyW.strikeCount === 'number') {
      stats.push({ label: 'Удары', value: `${anyW.strikeCount}` });
    } else if (typeof anyW.burstCount === 'number') {
      stats.push({ label: 'Очередь', value: `${anyW.burstCount}` });
    }

    if (typeof anyW.pierce === 'number') {
      stats.push({ label: 'Пробивание', value: `${anyW.pierce}` });
    }

    if (typeof anyW.projectileSpeed === 'number') {
      stats.push({ label: 'Скорость', value: `${anyW.projectileSpeed} м/с` });
    } else if (typeof anyW.orbitSpeed === 'number') {
      stats.push({ label: 'Скорость орбиты', value: `${anyW.orbitSpeed}` });
    }

    if (typeof anyW.bleedDps === 'number') {
      stats.push({ label: 'Кровотечение', value: `${anyW.bleedDps}/с` });
    } else if (typeof anyW.burnDps === 'number') {
      stats.push({ label: 'Горение', value: `${anyW.burnDps}/с` });
    }

    return stats;
  }
}
