import { Player } from '../../entities/Player';
import { Weapon } from '../../combat/Weapon';
import { RIFT_ITEMS } from '../../items/RiftItemSystem';

export class InventoryUI {
  private inventoryModal: HTMLElement;
  private inventoryBackdrop: HTMLElement | null;
  private btnCloseInventory: HTMLElement | null;
  private btnOpenInventory: HTMLElement | null;
  private inventoryHeroTitle: HTMLElement | null;
  private inventoryStatsList: HTMLElement | null;
  private inventoryPassivesList: HTMLElement | null;
  private inventoryWeaponsList: HTMLElement | null;
  private inventoryItemsList: HTMLElement | null;

  public cachedPlayer: Player | null = null;
  public onInventoryToggle?: (isOpen: boolean) => void;
  public onMenuPush?: (menu: string) => void;
  public onMenuRemove?: (menu: string) => void;

  constructor() {
    this.inventoryModal = document.getElementById('inventory-modal')!;
    this.inventoryBackdrop = document.getElementById('inventory-backdrop');
    this.btnCloseInventory = document.getElementById('btn-close-inventory');
    this.btnOpenInventory = document.getElementById('btn-open-inventory');
    this.inventoryHeroTitle = document.getElementById('inventory-hero-title');
    this.inventoryStatsList = document.getElementById('inventory-stats-list');
    this.inventoryPassivesList = document.getElementById('inventory-passives-list');
    this.inventoryWeaponsList = document.getElementById('inventory-weapons-list');
    this.inventoryItemsList = document.getElementById('inventory-items-list');

    this.btnCloseInventory?.addEventListener('click', () => this.hideInventory());
    this.inventoryBackdrop?.addEventListener('click', () => this.hideInventory());
    this.btnOpenInventory?.addEventListener('click', () => {
      if (this.cachedPlayer) this.toggleInventory(this.cachedPlayer);
    });
  }

  public isInventoryOpen(): boolean {
    return !this.inventoryModal.classList.contains('hidden');
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
    this.inventoryModal.classList.remove('hidden');
    this.onMenuPush?.('inventory');
    this.onInventoryToggle?.(true);
  }

  public hideInventory(): void {
    if (!this.inventoryModal) return;
    this.inventoryModal.classList.add('hidden');
    this.onMenuRemove?.('inventory');
    this.onInventoryToggle?.(false);
  }

  public renderInventory(player: Player): void {
    const heroName = player.displayName || player.charType || 'Странник Прерии';
    if (this.inventoryHeroTitle) {
      this.inventoryHeroTitle.innerText = `${heroName.toUpperCase()} • УРОВЕНЬ ${player.level}`;
    }

    // 1. Stats Table
    if (this.inventoryStatsList) {
      const startMult = player.getDamageMultiplier(player.startingWeaponId);
      const genMult = player.getDamageMultiplier();
      const critPct = (player.critChance * 100).toFixed(1);
      const critDmgPct = (player.critDamage * 100).toFixed(1);
      const cdrPct = Math.round((1 - player.passiveCooldownMultiplier) * 100);
      const armorPct = Math.round(player.passiveDamageReduction * 100);

      this.inventoryStatsList.innerHTML = `
        <div class="inv-stat-row">
          <span class="inv-stat-label">❤️ Здоровье</span>
          <span class="inv-stat-value">${Math.round(player.hp)} / ${player.maxHp}</span>
        </div>
        <div class="inv-stat-row">
          <span class="inv-stat-label">🛡️ Энергощит</span>
          <span class="inv-stat-value">${Math.round(player.shield)} / ${player.maxShield}</span>
        </div>
        <div class="inv-stat-row">
          <span class="inv-stat-label">💖 Регенерация HP</span>
          <span class="inv-stat-value">+${player.passiveHpRegen.toFixed(1)} / с</span>
        </div>
        <div class="inv-stat-row">
          <span class="inv-stat-label">👟 Скорость</span>
          <span class="inv-stat-value">${player.speed.toFixed(1)} (x${player.passiveSpeedMultiplier.toFixed(2)})</span>
        </div>
        <div class="inv-stat-row">
          <span class="inv-stat-label">🦺 Снижение урона (Броня)</span>
          <span class="inv-stat-value">-${armorPct}%</span>
        </div>
        <div class="inv-stat-row" title="Начальные бонусы героя применяются только к его стартовому оружию">
          <span class="inv-stat-label">🎯 Урон стартового оружия</span>
          <span class="inv-stat-value text-accent">+${Math.round((startMult - 1) * 100)}%</span>
        </div>
        <div class="inv-stat-row" title="Общие бонусы урона (пассивки, предметы, алтари)">
          <span class="inv-stat-label">⚔️ Общий множитель урона</span>
          <span class="inv-stat-value">+${Math.round((genMult - 1) * 100)}%</span>
        </div>
        <div class="inv-stat-row" title="Шанс критического удара (максимум 100%)">
          <span class="inv-stat-label">🎯 Шанс крит. урона</span>
          <span class="inv-stat-value text-crit">${critPct}%</span>
        </div>
        <div class="inv-stat-row" title="Множитель критического урона (максимум 1000%)">
          <span class="inv-stat-label">💥 Крит. урон</span>
          <span class="inv-stat-value text-crit-dmg">+${critDmgPct}%</span>
        </div>
        <div class="inv-stat-row">
          <span class="inv-stat-label">⏱️ Снижение перезарядки</span>
          <span class="inv-stat-value">-${cdrPct}%</span>
        </div>
        <div class="inv-stat-row">
          <span class="inv-stat-label">🧲 Радиус сбора</span>
          <span class="inv-stat-value">${player.pickupRadius.toFixed(1)}м</span>
        </div>
        <div class="inv-stat-row">
          <span class="inv-stat-label">⬡ Кредиты Разлома</span>
          <span class="inv-stat-value text-yellow">${player.credits}</span>
        </div>
        <div class="inv-stat-row">
          <span class="inv-stat-label">💀 Убийств</span>
          <span class="inv-stat-value">${player.kills}</span>
        </div>
      `;
    }

    // 2. Passives List
    if (this.inventoryPassivesList) {
      const passivesList = [
        {
          id: 'stat_sheriff_star',
          icon: '⭐',
          count: player.sheriffStarCount,
          title: 'Звезда Шерифа',
          desc: `+${player.sheriffStarCount * 2}% к урону всех оружий (складывается, x${player.passiveDamageMultiplier.toFixed(2)})`
        },
        {
          id: 'stat_spurs',
          icon: '👢',
          count: player.spursCount,
          title: 'Шпоры Скорохода',
          desc: `+${player.spursCount * 3}% к скорости бега (x${player.passiveSpeedMultiplier.toFixed(2)}, макс. 2.5x)`
        },
        {
          id: 'stat_flask',
          icon: '🍶',
          count: player.flaskCount,
          title: 'Фляга с Виски',
          desc: `+${player.flaskCount * 30} к макс HP (${player.maxHp} HP)`
        },
        {
          id: 'stat_lasso',
          icon: '➰',
          count: player.lassoCount,
          title: 'Магнитное Лассо',
          desc: `${player.pickupRadius.toFixed(1)}м радиус магнита (макс. 25м)`
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
          desc: `-${Math.round(player.passiveDamageReduction * 100)}% получаемого урона (макс. 70%)`
        },
        {
          id: 'stat_watch',
          icon: '⏱️',
          count: player.watchCount,
          title: 'Карманные Часы',
          desc: `-${Math.round((1 - player.passiveCooldownMultiplier) * 100)}% к перезарядке (макс. 25%)`
        }
      ];

      const active = passivesList.filter((p) => p.count > 0);
      if (active.length === 0) {
        this.inventoryPassivesList.innerHTML = `<div class="inv-empty-hint">Пассивные усиления ещё не получены</div>`;
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

    // 3. Weapons with Upgrade History & Extended Stats
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
            const gradeLevel = (weapon.awakenedGrade ?? 0) + 1;
            const gradeLabel = gradeLevel === 1 ? 'ГРЕЙД I' : gradeLevel === 2 ? 'ГРЕЙД II' : 'ГРЕЙД III';
            const badgeClass = `badge-grade${Math.min(3, gradeLevel)}`;

            const historyHtml = (weapon.upgradeHistory || [])
              .map(
                (grade, idx) => `
            <span class="inv-grade-chip grade-${grade}">#${idx + 1} ${gradeNames[grade] || grade}</span>
          `
              )
              .join('');

            const stats = this.getWeaponDetailedInventoryStats(weapon);
            const statChipsHtml = stats
              .map(
                (s) => `
            <span class="inv-weapon-stat-chip">${s.label}: <strong>${s.value}</strong></span>
          `
              )
              .join('');

            return `
            <div class="inv-weapon-card">
              <div class="inv-weapon-top">
                <span class="inv-weapon-icon">${weapon.icon}</span>
                <div class="inv-weapon-title-box">
                  <div class="inv-weapon-name-row">
                    <span class="inv-weapon-name">${weapon.name}</span>
                    <span class="inv-weapon-grade-badge ${badgeClass}">${gradeLabel}</span>
                    ${isStart ? '<span class="inv-tag-start">НАЧАЛЬНОЕ</span>' : ''}
                    <span class="inv-tag-lvl">Ур. ${weapon.level}/${weapon.maxLevel}</span>
                  </div>
                  <div class="inv-weapon-stat-badges" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
                    ${statChipsHtml}
                  </div>
                </div>
              </div>
              <div class="inv-weapon-history-row">
                <span class="inv-history-label">Грейды улучшений:</span>
                <div class="inv-history-chips">
                  ${historyHtml || '<span class="inv-history-none">Базовое состояние (без улучшений)</span>'}
                </div>
              </div>
            </div>
          `;
          })
          .join('');
      }
    }

    // 4. Rift Items
    if (this.inventoryItemsList) {
      const itemEntries = Array.from(player.riftItems.entries());
      if (itemEntries.length === 0) {
        this.inventoryItemsList.innerHTML = `<div class="inv-empty-hint">Сундуки Разлома ещё не открыты. Найдите контейнер в прерии!</div>`;
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

        this.inventoryItemsList.innerHTML = itemEntries
          .map(([id, count]) => {
            const def = RIFT_ITEMS[id];
            if (!def) return '';
            const rarityLabel = rarityLabels[def.rarity] || def.rarity;

            return `
            <div class="inv-item-card grade-${def.rarity}">
              <div class="inv-item-card-top">
                <span class="inv-item-icon" style="color: ${def.color}">${def.icon}</span>
                <span class="grade-badge grade-${def.rarity}">${rarityLabel.toUpperCase()}</span>
                <span class="inv-item-count">x${count}</span>
              </div>
              <div class="inv-item-name" style="color: ${def.color}">${def.name}</div>
              <div class="inv-item-desc">${def.description}</div>
            </div>
          `;
          })
          .join('');
      }
    }
  }

  public getWeaponDetailedInventoryStats(weapon: Weapon): { label: string; value: string }[] {
    const dps = Math.round(weapon.damage / Math.max(0.08, weapon.effectiveCooldown));
    const stats: { label: string; value: string }[] = [
      { label: 'Урон', value: `${Math.round(weapon.damage)}` },
      { label: 'КД', value: `${weapon.effectiveCooldown.toFixed(2)}с` },
      { label: 'DPS', value: `${dps}` }
    ];

    if (weapon.bonusDamage > 0) {
      stats.push({ label: 'Бонус урона', value: `+${Math.round(weapon.bonusDamage * 100)}%` });
    }

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
