import { BalanceState } from '../state/balanceState';
import { getEntityTexture } from '../constants';
import { matchesSearch, renderEmptySearchState } from '../ui/filter';
import { renderStatControl, attachInputListeners, toggleRow } from './controlHelpers';

export function renderBosses(
  state: BalanceState,
  onResetItem: (cat: 'bosses', id: string) => void,
  onFieldChange: (path: string, val: number) => void,
  onClearSearch: () => void
): void {
  const container = document.getElementById('bosses-list') || document.getElementById('bosses-grid');
  if (!container) return;
  container.innerHTML = '';

  const bosses = Object.values(state.draftBalance.bosses);
  const sort = state.tableSorts.bosses || { col: 'name', dir: 'asc' };

  bosses.sort((a, b) => {
    let val = 0;
    const isModA = Array.from(state.modifiedPaths).some((p) => p.startsWith(`bosses.${a.id}.`)) ? 1 : 0;
    const isModB = Array.from(state.modifiedPaths).some((p) => p.startsWith(`bosses.${b.id}.`)) ? 1 : 0;

    switch (sort.col) {
      case 'name':
        val = a.name.localeCompare(b.name, 'ru');
        break;
      case 'hp':
        val = a.hp - b.hp;
        break;
      case 'speed':
        val = a.speed - b.speed;
        break;
      case 'damage':
        val = a.damage - b.damage;
        break;
      case 'phases':
        val = (a.id === 'hydra' ? 3 : 2) - (b.id === 'hydra' ? 3 : 2);
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

  const filteredBosses = bosses.filter((b) => matchesSearch(b, state.searchFilter));

  if (filteredBosses.length === 0) {
    renderEmptySearchState(container, state.searchFilter, onClearSearch);
    return;
  }

  for (const b of filteredBosses) {
    const rowId = `bosses-${b.id}`;
    const isExpanded = state.expandedRows.has(rowId);
    const isModified = Array.from(state.modifiedPaths).some((p) => p.startsWith(`bosses.${b.id}.`));
    const textureUrl = getEntityTexture('bosses', b.id);

    const rowItem = document.createElement('div');
    rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
    rowItem.dataset.rowId = rowId;

    rowItem.innerHTML = `
      <div class="accordion-row-header bosses-table-cols">
        <div class="accordion-col-expand">
          <span class="chevron-arrow">›</span>
        </div>
        <div class="accordion-col-main">
          <img src="${textureUrl}" class="item-texture" alt="${b.name}" onerror="this.src='/textures/weapons/bullet_revolver.png'">
          <div class="item-identity">
            <span class="item-title">${b.name}</span>
            <span class="item-id-badge">${b.id}</span>
          </div>
        </div>
        <div class="accordion-col-stat" id="row-stat-hp-${b.id}">
          <span>${b.hp.toLocaleString()} HP</span>
        </div>
        <div class="accordion-col-stat" id="row-stat-speed-${b.id}">
          <span>${b.speed} м/с</span>
        </div>
        <div class="accordion-col-stat">
          <span class="stat-highlight" id="row-stat-damage-${b.id}">${b.damage}</span>
        </div>
        <div class="accordion-col-stat">
          <span style="color:var(--accent-warning); font-size:12px; font-weight:600;">Многофазный</span>
        </div>
        <div class="accordion-col-status">
          ${
            isModified
              ? '<span class="status-badge-chip badge-modified">Изменено</span>'
              : '<span class="status-badge-chip badge-default">Дефолт</span>'
          }
        </div>
        <div class="accordion-col-actions">
          <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${b.id}" title="Сбросить к исходным параметрам">↩</button>
          <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
        </div>
      </div>

      <div class="accordion-row-body">
        <div class="drawer-content">
          <div class="drawer-header-info">
            <div class="drawer-desc">${b.description || 'Эпический босс арены.'}</div>
            <div class="drawer-scaling-badge">Фазы боя: 2-3 фазы</div>
          </div>

          <div class="drawer-controls-grid">
            ${renderStatControl(state, 'bosses', b.id, 'hp', 'Базовое здоровье босса', b.hp, 1000, 100000, 200)}
            ${renderStatControl(state, 'bosses', b.id, 'speed', 'Скорость (м/с)', b.speed, 1.0, 8.0, 0.1)}
            ${renderStatControl(state, 'bosses', b.id, 'damage', 'Контактный урон', b.damage, 10, 300, 5)}
          </div>

          <div class="drawer-footer">
            <div></div>
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${b.id}">
              Сбросить босса
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
        const bid = (e.currentTarget as HTMLElement).dataset.id!;
        onResetItem('bosses', bid);
      });
    });

    container.appendChild(rowItem);
  }

  attachInputListeners(container, onFieldChange);
}
