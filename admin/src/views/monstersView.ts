import { BalanceState } from '../state/balanceState';
import { getEntityTexture } from '../constants';
import { matchesSearch, renderEmptySearchState } from '../ui/filter';
import { renderStatControl, attachInputListeners, toggleRow } from './controlHelpers';

export function renderMonsters(
  state: BalanceState,
  onResetItem: (cat: 'monsters', id: string) => void,
  onFieldChange: (path: string, val: number) => void,
  onClearSearch: () => void
): void {
  const container = document.getElementById('monsters-list') || document.getElementById('monsters-grid');
  if (!container) return;
  container.innerHTML = '';

  const monsters = Object.values(state.draftBalance.monsters);
  const sort = state.tableSorts.monsters || { col: 'name', dir: 'asc' };

  monsters.sort((a, b) => {
    let val = 0;
    const isModA = Array.from(state.modifiedPaths).some((p) => p.startsWith(`monsters.${a.id}.`)) ? 1 : 0;
    const isModB = Array.from(state.modifiedPaths).some((p) => p.startsWith(`monsters.${b.id}.`)) ? 1 : 0;

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
      case 'gem':
        val = (a.gemType || '').localeCompare(b.gemType || '', 'ru');
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

  const filteredMonsters = monsters.filter((m) => matchesSearch(m, state.searchFilter));

  if (filteredMonsters.length === 0) {
    renderEmptySearchState(container, state.searchFilter, onClearSearch);
    return;
  }

  for (const m of filteredMonsters) {
    const rowId = `monsters-${m.id}`;
    const isExpanded = state.expandedRows.has(rowId);
    const isModified = Array.from(state.modifiedPaths).some((p) => p.startsWith(`monsters.${m.id}.`));
    const textureUrl = getEntityTexture('monsters', m.id);

    const rowItem = document.createElement('div');
    rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
    rowItem.dataset.rowId = rowId;

    rowItem.innerHTML = `
      <div class="accordion-row-header monsters-table-cols">
        <div class="accordion-col-expand">
          <span class="chevron-arrow">›</span>
        </div>
        <div class="accordion-col-main">
          <img src="${textureUrl}" class="item-texture" alt="${m.name}" onerror="this.src='/textures/bullet_revolver.png'">
          <div class="item-identity">
            <span class="item-title">${m.name}</span>
            <span class="item-id-badge">${m.id}</span>
          </div>
        </div>
        <div class="accordion-col-stat" id="row-stat-hp-${m.id}">
          <span>${m.hp} HP</span>
        </div>
        <div class="accordion-col-stat" id="row-stat-speed-${m.id}">
          <span>${m.speed} м/с</span>
        </div>
        <div class="accordion-col-stat">
          <span class="stat-highlight" id="row-stat-damage-${m.id}">${m.damage}</span>
        </div>
        <div class="accordion-col-stat">
          <span style="color:var(--accent-primary); font-size:12px; font-weight:600;">${m.gemType || 'blue'} gem</span>
        </div>
        <div class="accordion-col-status">
          ${
            isModified
              ? '<span class="status-badge-chip badge-modified">Изменено</span>'
              : '<span class="status-badge-chip badge-default">Дефолт</span>'
          }
        </div>
        <div class="accordion-col-actions">
          <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${m.id}" title="Сбросить к исходным параметрам">↩</button>
          <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
        </div>
      </div>

      <div class="accordion-row-body">
        <div class="drawer-content">
          <div class="drawer-header-info">
            <div class="drawer-desc">${m.description || 'Рядовой противник волны.'}</div>
            <div class="drawer-scaling-badge">Дроп: ${m.gemType || 'blue'} gem</div>
          </div>

          <div class="drawer-controls-grid">
            ${renderStatControl(state, 'monsters', m.id, 'hp', 'Здоровье (HP 0-мин)', m.hp, 10, 2000, 2)}
            ${renderStatControl(state, 'monsters', m.id, 'speed', 'Скорость (м/с)', m.speed, 1.0, 10.0, 0.1)}
            ${renderStatControl(state, 'monsters', m.id, 'damage', 'Урон за удар', m.damage, 1, 100, 1)}
          </div>

          <div class="drawer-footer">
            <div></div>
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${m.id}">
              Сбросить монстра
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
        const mid = (e.currentTarget as HTMLElement).dataset.id!;
        onResetItem('monsters', mid);
      });
    });

    container.appendChild(rowItem);
  }

  attachInputListeners(container, onFieldChange);
}
