import { BalanceState } from '../state/balanceState';
import { getEntityTexture } from '../constants';
import { matchesSearch, renderEmptySearchState } from '../ui/filter';
import { renderStatControl, attachInputListeners, toggleRow } from './controlHelpers';

export function renderHeroes(
  state: BalanceState,
  onResetItem: (cat: 'heroes', id: string) => void,
  onFieldChange: (path: string, val: number) => void,
  onClearSearch: () => void
): void {
  const container = document.getElementById('heroes-list') || document.getElementById('heroes-grid');
  if (!container) return;
  container.innerHTML = '';

  const heroes = Object.values(state.draftBalance.heroes);
  const sort = state.tableSorts.heroes || { col: 'name', dir: 'asc' };

  heroes.sort((a, b) => {
    let val = 0;
    const isModA = Array.from(state.modifiedPaths).some((p) => p.startsWith(`heroes.${a.id}.`)) ? 1 : 0;
    const isModB = Array.from(state.modifiedPaths).some((p) => p.startsWith(`heroes.${b.id}.`)) ? 1 : 0;

    switch (sort.col) {
      case 'name':
        val = a.name.localeCompare(b.name, 'ru');
        break;
      case 'hp':
        val = a.maxHp - b.maxHp;
        break;
      case 'speed':
        val = a.baseSpeed - b.baseSpeed;
        break;
      case 'dmgmult':
        val = a.damageMultiplier - b.damageMultiplier;
        break;
      case 'weapon':
        val = (a.startingWeapon || '').localeCompare(b.startingWeapon || '', 'ru');
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

  const filteredHeroes = heroes.filter((h) => matchesSearch(h, state.searchFilter));

  if (filteredHeroes.length === 0) {
    renderEmptySearchState(container, state.searchFilter, onClearSearch);
    return;
  }

  for (const h of filteredHeroes) {
    const rowId = `heroes-${h.id}`;
    const isExpanded = state.expandedRows.has(rowId);
    const isModified = Array.from(state.modifiedPaths).some((p) => p.startsWith(`heroes.${h.id}.`));
    const textureUrl = getEntityTexture('heroes', h.id);

    const rowItem = document.createElement('div');
    rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
    rowItem.dataset.rowId = rowId;

    rowItem.innerHTML = `
      <div class="accordion-row-header heroes-table-cols">
        <div class="accordion-col-expand">
          <span class="chevron-arrow">›</span>
        </div>
        <div class="accordion-col-main">
          <img src="${textureUrl}" class="item-texture" alt="${h.name}" onerror="this.src='/textures/weapons/bullet_revolver.png'">
          <div class="item-identity">
            <span class="item-title">${h.name}</span>
            <span class="item-id-badge">${h.id}</span>
          </div>
        </div>
        <div class="accordion-col-stat" id="row-stat-hp-${h.id}">
          <span>${h.maxHp} HP</span>
        </div>
        <div class="accordion-col-stat" id="row-stat-speed-${h.id}">
          <span>${h.baseSpeed} м/с</span>
        </div>
        <div class="accordion-col-stat">
          <span class="stat-highlight" id="row-stat-dmgmult-${h.id}">${h.damageMultiplier}x</span>
        </div>
        <div class="accordion-col-stat">
          <span style="color:var(--text-muted); font-size:12px;">${h.startingWeapon}</span>
        </div>
        <div class="accordion-col-status">
          ${
            isModified
              ? '<span class="status-badge-chip badge-modified">Изменено</span>'
              : '<span class="status-badge-chip badge-default">Дефолт</span>'
          }
        </div>
        <div class="accordion-col-actions">
          <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${h.id}" title="Сбросить к исходным параметрам">↩</button>
          <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
        </div>
      </div>

      <div class="accordion-row-body">
        <div class="drawer-content">
          <div class="drawer-header-info">
            <div class="drawer-desc">${h.role || 'Ковбой Дикого Запада.'}</div>
            <div class="drawer-scaling-badge">Стартовое снаряжение: ${h.startingWeapon}</div>
          </div>

          <div class="drawer-controls-grid">
            ${renderStatControl(state, 'heroes', h.id, 'maxHp', 'Базовое здоровье (HP)', h.maxHp, 50, 300, 5)}
            ${renderStatControl(state, 'heroes', h.id, 'baseSpeed', 'Скорость бега (м/с)', h.baseSpeed, 4.0, 15.0, 0.1)}
            ${renderStatControl(state, 'heroes', h.id, 'damageMultiplier', 'Множитель урона', h.damageMultiplier, 0.5, 3.0, 0.05)}
          </div>

          <div class="drawer-footer">
            <div></div>
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${h.id}">
              Сбросить героя
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
        const hid = (e.currentTarget as HTMLElement).dataset.id!;
        onResetItem('heroes', hid);
      });
    });

    container.appendChild(rowItem);
  }

  attachInputListeners(container, onFieldChange);
}
