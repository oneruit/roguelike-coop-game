import { BalanceState } from '../state/balanceState';
import { getEntityTexture } from '../constants';
import { matchesSearch, renderEmptySearchState } from '../ui/filter';
import { renderStatControl, attachInputListeners, toggleRow } from './controlHelpers';

export function renderWeapons(
  state: BalanceState,
  onResetItem: (cat: 'weapons', id: string) => void,
  onFieldChange: (path: string, val: number) => void,
  onClearSearch: () => void
): void {
  const container = document.getElementById('weapons-list') || document.getElementById('weapons-grid');
  if (!container) return;
  container.innerHTML = '';

  const weapons = Object.values(state.draftBalance.weapons);
  const sort = state.tableSorts.weapons || { col: 'name', dir: 'asc' };

  weapons.sort((a, b) => {
    let val = 0;
    const baseDpsA = a.cooldown > 0 ? a.damage / a.cooldown : a.damage * 60;
    const baseDpsB = b.cooldown > 0 ? b.damage / b.cooldown : b.damage * 60;
    const l20DpsA =
      a.cooldown > 0
        ? (a.damage + 19 * a.damagePerLevel) / a.cooldown
        : (a.damage + 19 * a.damagePerLevel) * 60;
    const l20DpsB =
      b.cooldown > 0
        ? (b.damage + 19 * b.damagePerLevel) / b.cooldown
        : (b.damage + 19 * b.damagePerLevel) * 60;
    const isModA = Array.from(state.modifiedPaths).some((p) => p.startsWith(`weapons.${a.id}.`)) ? 1 : 0;
    const isModB = Array.from(state.modifiedPaths).some((p) => p.startsWith(`weapons.${b.id}.`)) ? 1 : 0;

    switch (sort.col) {
      case 'name':
        val = a.name.localeCompare(b.name, 'ru');
        break;
      case 'damage':
        val = a.damage - b.damage;
        break;
      case 'cooldown':
        val = a.cooldown - b.cooldown;
        break;
      case 'dps1':
        val = baseDpsA - baseDpsB;
        break;
      case 'dps20':
        val = l20DpsA - l20DpsB;
        break;
      case 'status':
        val = isModA - isModB;
        break;
      default:
        val = a.name.localeCompare(b.name, 'ru');
        break;
    }
    return sort.dir === 'asc' ? val : -val;
  });

  const filteredWeapons = weapons.filter((w) => matchesSearch(w, state.searchFilter));

  if (filteredWeapons.length === 0) {
    renderEmptySearchState(container, state.searchFilter, onClearSearch);
    return;
  }

  for (const w of filteredWeapons) {
    const rowId = `weapons-${w.id}`;
    const isExpanded = state.expandedRows.has(rowId);
    const isModified = Array.from(state.modifiedPaths).some((p) => p.startsWith(`weapons.${w.id}.`));

    const baseDps = w.cooldown > 0 ? (w.damage / w.cooldown).toFixed(1) : (w.damage * 60).toFixed(1);
    const l20Dmg = w.damage + 19 * w.damagePerLevel;
    const l20Dps = w.cooldown > 0 ? (l20Dmg / w.cooldown).toFixed(1) : (l20Dmg * 60).toFixed(1);
    const textureUrl = getEntityTexture('weapons', w.id);

    const rowItem = document.createElement('div');
    rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
    rowItem.dataset.rowId = rowId;

    rowItem.innerHTML = `
      <div class="accordion-row-header weapons-table-cols">
        <div class="accordion-col-expand">
          <span class="chevron-arrow">›</span>
        </div>
        <div class="accordion-col-main">
          <img src="${textureUrl}" class="item-texture" alt="${w.name}" onerror="this.src='/textures/weapons/bullet_revolver.png'">
          <div class="item-identity">
            <span class="item-title">${w.name}</span>
            <span class="item-id-badge">${w.id}</span>
          </div>
        </div>
        <div class="accordion-col-stat" id="row-stat-damage-${w.id}">
          <span>${w.damage}</span>
        </div>
        <div class="accordion-col-stat" id="row-stat-cooldown-${w.id}">
          <span>${w.cooldown}с</span>
        </div>
        <div class="accordion-col-stat">
          <span class="stat-highlight" id="row-stat-dps1-${w.id}">${baseDps}</span>
        </div>
        <div class="accordion-col-stat">
          <span class="stat-highlight-gold" id="row-stat-dps20-${w.id}">${l20Dps}</span>
        </div>
        <div class="accordion-col-status">
          ${
            isModified
              ? '<span class="status-badge-chip badge-modified">Изменено</span>'
              : '<span class="status-badge-chip badge-default">Дефолт</span>'
          }
        </div>
        <div class="accordion-col-actions">
          <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${w.id}" title="Сбросить к исходным параметрам">↩</button>
          <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
        </div>
      </div>

      <div class="accordion-row-body">
        <div class="drawer-content">
          <div class="drawer-header-info">
            <div class="drawer-desc">${w.notes || 'Боевое оружие персонажа.'}</div>
            <div class="drawer-scaling-badge">L20: ${w.damage} + 19×${w.damagePerLevel} = ${l20Dmg} dmg</div>
          </div>

          <div class="drawer-controls-grid">
            ${renderStatControl(state, 'weapons', w.id, 'damage', 'Базовый урон (Damage)', w.damage, 1, 300, 1)}
            ${renderStatControl(state, 'weapons', w.id, 'cooldown', 'Кулдаун атаки (сек)', w.cooldown, 0.05, 5.0, 0.05)}
            ${renderStatControl(state, 'weapons', w.id, 'damagePerLevel', 'Прирост за уровень', w.damagePerLevel, 1, 50, 1)}
            ${w.range !== undefined ? renderStatControl(state, 'weapons', w.id, 'range', 'Дальность атаки (м)', w.range, 5, 50, 1) : ''}
            ${w.explosionRadius !== undefined ? renderStatControl(state, 'weapons', w.id, 'explosionRadius', 'Радиус взрыва (м)', w.explosionRadius, 1, 10, 0.1) : ''}
            ${w.fallSpeed !== undefined ? renderStatControl(state, 'weapons', w.id, 'fallSpeed', 'Скорость падения (м/с)', w.fallSpeed, 5, 60, 1) : ''}
          </div>

          <div class="drawer-footer">
            <div class="dps-preview-box">
              <div class="dps-metric">
                <span class="dps-label">Base DPS (L1)</span>
                <span class="dps-value" id="dps-${w.id}-base">${baseDps}</span>
              </div>
              <div class="dps-metric">
                <span class="dps-label">Max DPS (L20)</span>
                <span class="dps-value" id="dps-${w.id}-l20">${l20Dps}</span>
              </div>
            </div>
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${w.id}">
              Сбросить оружие
            </button>
          </div>
        </div>
      </div>
    `;

    const headerEl = rowItem.querySelector('.accordion-row-header');
    headerEl?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.btn-reset-item') || target.closest('.btn-toggle-row')) return;
      toggleRow(state, rowId, rowItem);
    });

    rowItem.querySelector('.btn-toggle-row')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRow(state, rowId, rowItem);
    });

    rowItem.querySelectorAll('.btn-reset-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wid = (e.currentTarget as HTMLElement).dataset.id!;
        onResetItem('weapons', wid);
      });
    });

    container.appendChild(rowItem);
  }

  attachInputListeners(container, onFieldChange);
}
