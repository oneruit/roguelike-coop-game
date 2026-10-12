import { BalanceState } from '../state/balanceState';
import { matchesSearch, renderEmptySearchState } from '../ui/filter';
import { renderStatControl, attachInputListeners, toggleRow } from './controlHelpers';

export function renderItems(
  state: BalanceState,
  onResetItem: (cat: 'items', id: string) => void,
  onFieldChange: (path: string, val: number) => void,
  onClearSearch: () => void
): void {
  const container = document.getElementById('items-list');
  if (!container) return;
  container.innerHTML = '';

  const items = Object.values(state.draftBalance.items || {});
  const sort = state.tableSorts.items || { col: 'name', dir: 'asc' };

  const rarityRank: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    legendary: 4,
    boss: 5
  };

  items.sort((a, b) => {
    let val = 0;
    const isModA = Array.from(state.modifiedPaths).some((p) => p.startsWith(`items.${a.id}.`)) ? 1 : 0;
    const isModB = Array.from(state.modifiedPaths).some((p) => p.startsWith(`items.${b.id}.`)) ? 1 : 0;

    switch (sort.col) {
      case 'name':
        val = a.name.localeCompare(b.name, 'ru');
        break;
      case 'rarity':
        val = (rarityRank[a.rarity] || 0) - (rarityRank[b.rarity] || 0);
        break;
      case 'base':
        val = (a.baseValue ?? 0) - (b.baseValue ?? 0);
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

  const filteredItems = items.filter((item) => matchesSearch(item, state.searchFilter));

  if (filteredItems.length === 0) {
    renderEmptySearchState(container, state.searchFilter, onClearSearch);
    return;
  }

  const rarityLabels: Record<string, { label: string; color: string; bg: string }> = {
    common: { label: 'Обычный', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
    uncommon: { label: 'Необычный', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
    rare: { label: 'Редкий', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    legendary: { label: 'Легендарный', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' },
    boss: { label: 'Босс', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' }
  };

  for (const item of filteredItems) {
    const rowId = `items-${item.id}`;
    const isExpanded = state.expandedRows.has(rowId);
    const isModified = Array.from(state.modifiedPaths).some((path) => path.startsWith(`items.${item.id}.`));

    const rowItem = document.createElement('div');
    rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
    rowItem.dataset.rowId = rowId;

    const rInfo = rarityLabels[item.rarity] || { label: item.rarity, color: item.color || '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };

    rowItem.innerHTML = `
      <div class="accordion-row-header items-table-cols">
        <div class="accordion-col-expand">
          <span class="chevron-arrow">›</span>
        </div>
        <div class="accordion-col-main">
          <span class="item-icon-emoji" style="font-size:22px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background:var(--bg-card); border-radius:6px; border:1px solid var(--border-subtle); flex-shrink:0;">${item.icon || '🎁'}</span>
          <div class="item-identity">
            <span class="item-title">${item.name}</span>
            <span class="item-id-badge">${item.id}</span>
          </div>
        </div>
        <div class="accordion-col-stat">
          <span class="status-badge-chip" style="color:${rInfo.color}; background:${rInfo.bg}; border:1px solid ${rInfo.color}; font-weight:600;">${rInfo.label}</span>
        </div>
        <div class="accordion-col-stat" id="row-stat-base-${item.id}">
          <span class="stat-highlight">${item.baseValue !== undefined ? item.baseValue : '—'}</span>
        </div>
        <div class="accordion-col-stat">
          <span style="font-size:12px; color:var(--text-secondary);">${item.stackText || item.scaling || '—'}</span>
        </div>
        <div class="accordion-col-status">
          ${
            isModified
              ? '<span class="status-badge-chip badge-modified">Изменено</span>'
              : '<span class="status-badge-chip badge-default">Дефолт</span>'
          }
        </div>
        <div class="accordion-col-actions">
          <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${item.id}" title="Сбросить к исходным параметрам">↩</button>
          <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
        </div>
      </div>

      <div class="accordion-row-body">
        <div class="drawer-content">
          <div class="drawer-header-info">
            <div class="drawer-desc">${item.description || ''}</div>
            <div class="drawer-scaling-badge">Масштабирование: ${item.scaling || item.stackText || 'Базовое'}</div>
          </div>

          <div class="drawer-controls-grid">
            ${item.baseValue !== undefined ? renderStatControl(state, 'items', item.id, 'baseValue', 'Базовое значение эффекта', item.baseValue, 0.5, 1000, 0.5) : '<div style="color:var(--text-muted); font-size:12px;">Специальный предмет со сложной механикой. Параметры фиксированы.</div>'}
          </div>

          <div class="drawer-footer">
            <div></div>
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${item.id}">
              Сбросить предмет
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
        const iid = (e.currentTarget as HTMLElement).dataset.id!;
        onResetItem('items', iid);
      });
    });

    container.appendChild(rowItem);
  }

  attachInputListeners(container, onFieldChange);
}
