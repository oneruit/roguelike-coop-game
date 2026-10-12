import { BalanceState } from '../state/balanceState';
import { matchesSearch, renderEmptySearchState } from '../ui/filter';
import { renderStatControl, attachInputListeners, toggleRow } from './controlHelpers';

export function renderPassives(
  state: BalanceState,
  onResetItem: (cat: 'passives', id: string) => void,
  onFieldChange: (path: string, val: number) => void,
  onClearSearch: () => void
): void {
  const container = document.getElementById('passives-list');
  if (!container) return;
  container.innerHTML = '';

  const passives = Object.values(state.draftBalance.passives || {});
  const sort = state.tableSorts.passives || { col: 'name', dir: 'asc' };

  passives.sort((a, b) => {
    let val = 0;
    const isModA = Array.from(state.modifiedPaths).some((p) => p.startsWith(`passives.${a.id}.`)) ? 1 : 0;
    const isModB = Array.from(state.modifiedPaths).some((p) => p.startsWith(`passives.${b.id}.`)) ? 1 : 0;

    switch (sort.col) {
      case 'name':
        val = a.name.localeCompare(b.name, 'ru');
        break;
      case 'base':
        val = a.baseValue - b.baseValue;
        break;
      case 'stack':
        val = a.perStackValue - b.perStackValue;
        break;
      case 'cap':
        val = (a.maxValue ?? 9999) - (b.maxValue ?? 9999);
        break;
      case 'scaling':
        val = (a.scalingType || '').localeCompare(b.scalingType || '');
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

  const filteredPassives = passives.filter((p) => matchesSearch(p, state.searchFilter));

  if (filteredPassives.length === 0) {
    renderEmptySearchState(container, state.searchFilter, onClearSearch);
    return;
  }

  const scalingLabels: Record<string, string> = {
    additive: 'Аддитивный (+)',
    multiplicative: 'Мультипликативный (×)',
    diminishing: 'Угасающий (diminishing)'
  };

  for (const p of filteredPassives) {
    const rowId = `passives-${p.id}`;
    const isExpanded = state.expandedRows.has(rowId);
    const isModified = Array.from(state.modifiedPaths).some((path) => path.startsWith(`passives.${p.id}.`));

    const rowItem = document.createElement('div');
    rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
    rowItem.dataset.rowId = rowId;

    const capText = p.maxValue !== undefined ? `${p.maxValue}` : '∞';
    const scalingText = scalingLabels[p.scalingType || 'additive'] || p.scalingType || 'Аддитивный';

    rowItem.innerHTML = `
      <div class="accordion-row-header passives-table-cols">
        <div class="accordion-col-expand">
          <span class="chevron-arrow">›</span>
        </div>
        <div class="accordion-col-main">
          <span class="item-icon-emoji" style="font-size:22px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background:var(--bg-card); border-radius:6px; border:1px solid var(--border-subtle); flex-shrink:0;">${p.icon || '⭐'}</span>
          <div class="item-identity">
            <span class="item-title">${p.name}</span>
            <span class="item-id-badge">${p.id}</span>
          </div>
        </div>
        <div class="accordion-col-stat" id="row-stat-base-${p.id}">
          <span class="stat-highlight">${p.baseValue}</span>
        </div>
        <div class="accordion-col-stat" id="row-stat-stack-${p.id}">
          <span>+${p.perStackValue} / стак</span>
        </div>
        <div class="accordion-col-stat" id="row-stat-cap-${p.id}">
          <span>${capText}</span>
        </div>
        <div class="accordion-col-stat">
          <span style="font-size:11px; color:var(--text-secondary);">${scalingText}</span>
        </div>
        <div class="accordion-col-status">
          ${
            isModified
              ? '<span class="status-badge-chip badge-modified">Изменено</span>'
              : '<span class="status-badge-chip badge-default">Дефолт</span>'
          }
        </div>
        <div class="accordion-col-actions">
          <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${p.id}" title="Сбросить к исходным параметрам">↩</button>
          <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
        </div>
      </div>

      <div class="accordion-row-body">
        <div class="drawer-content">
          <div class="drawer-header-info">
            <div class="drawer-desc">${p.description || ''}</div>
            <div class="drawer-scaling-badge">${p.notes || 'Пассивное свойство'}</div>
          </div>

          <div class="drawer-controls-grid">
            ${renderStatControl(state, 'passives', p.id, 'baseValue', 'Базовый эффект', p.baseValue, 0.5, 100, 0.5)}
            ${renderStatControl(state, 'passives', p.id, 'perStackValue', 'Прирост за стак', p.perStackValue, 0.5, 100, 0.5)}
            ${p.maxValue !== undefined ? renderStatControl(state, 'passives', p.id, 'maxValue', 'Максимальный лимит (кап)', p.maxValue, 1, 300, 1) : ''}
          </div>

          <div class="drawer-footer">
            <div></div>
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${p.id}">
              Сбросить пассивку
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
        const pid = (e.currentTarget as HTMLElement).dataset.id!;
        onResetItem('passives', pid);
      });
    });

    container.appendChild(rowItem);
  }

  attachInputListeners(container, onFieldChange);
}
