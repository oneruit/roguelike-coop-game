import { BalanceState } from '../state/balanceState';
import { matchesSearch, renderEmptySearchState } from '../ui/filter';
import { renderStatControl, attachInputListeners, toggleRow } from './controlHelpers';

export function renderTalents(
  state: BalanceState,
  onResetItem: (cat: 'talents', id: string) => void,
  onFieldChange: (path: string, val: number) => void,
  onClearSearch: () => void,
  selectedBranchFilter: string = 'all'
): void {
  const container = document.getElementById('talents-list');
  if (!container) return;
  container.innerHTML = '';

  const talents = Object.values(state.draftBalance.talents || {});
  const sort = state.tableSorts.talents || { col: 'name', dir: 'asc' };

  talents.sort((a, b) => {
    let val = 0;
    const isModA = Array.from(state.modifiedPaths).some((p) => p.startsWith(`talents.${a.id}.`)) ? 1 : 0;
    const isModB = Array.from(state.modifiedPaths).some((p) => p.startsWith(`talents.${b.id}.`)) ? 1 : 0;

    switch (sort.col) {
      case 'name':
        val = a.name.localeCompare(b.name, 'ru');
        break;
      case 'branch':
        val = (a.branch || '').localeCompare(b.branch || '');
        break;
      case 'bonus':
        val = a.bonusPerLevel - b.bonusPerLevel;
        break;
      case 'maxLevel':
        val = a.maxLevel - b.maxLevel;
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

  const branchFiltered =
    selectedBranchFilter === 'all'
      ? talents
      : talents.filter((t) => t.branch === selectedBranchFilter);

  const filteredTalents = branchFiltered.filter((t) => matchesSearch(t, state.searchFilter));

  if (filteredTalents.length === 0) {
    renderEmptySearchState(container, state.searchFilter, onClearSearch);
    return;
  }

  const branchMeta: Record<string, { label: string; color: string; bg: string }> = {
    offense: { label: '⚔️ Могущество', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    defense: { label: '🛡️ Стойкость', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    utility: { label: '🔮 Мастерство', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' }
  };

  for (const t of filteredTalents) {
    const rowId = `talents-${t.id}`;
    const isExpanded = state.expandedRows.has(rowId);
    const isModified = Array.from(state.modifiedPaths).some((path) => path.startsWith(`talents.${t.id}.`));

    const rowItem = document.createElement('div');
    rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
    rowItem.dataset.rowId = rowId;

    const bInfo = branchMeta[t.branch] || { label: t.branch, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
    const costsStr = (t.costPerLevel || [15, 35, 75, 140, 240]).join(', ');
    const bonusDisplay = t.unit === '%' ? `+${(t.bonusPerLevel * 100).toFixed(1)}%` : `+${t.bonusPerLevel} ${t.unit || ''}`;

    rowItem.innerHTML = `
      <div class="accordion-row-header talents-table-cols">
        <div class="accordion-col-expand">
          <span class="chevron-arrow">›</span>
        </div>
        <div class="accordion-col-main">
          <span class="item-icon-emoji" style="font-size:22px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background:var(--bg-card); border-radius:6px; border:1px solid var(--border-subtle); flex-shrink:0;">${t.icon || '⭐'}</span>
          <div class="item-identity">
            <span class="item-title">${t.name}</span>
            <span class="item-id-badge">${t.id}</span>
          </div>
        </div>
        <div class="accordion-col-stat">
          <span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; color:${bInfo.color}; background:${bInfo.bg}; border:1px solid ${bInfo.color}40;">
            ${bInfo.label}
          </span>
        </div>
        <div class="accordion-col-stat" id="row-stat-bonus-${t.id}">
          <span class="stat-highlight">${bonusDisplay}</span>
          <span style="font-size:10px; color:var(--text-secondary); margin-left:4px;">/ ранг</span>
        </div>
        <div class="accordion-col-stat">
          <span class="stat-highlight-gold" id="row-stat-maxlevel-${t.id}" style="font-weight:700;">${t.maxLevel}</span>
        </div>
        <div class="accordion-col-stat">
          <span style="font-size:11px; color:var(--text-secondary); font-family:monospace;" title="Стоимость каждого ранга в кристаллах">[${costsStr}]</span>
        </div>
        <div class="accordion-col-status">
          ${
            isModified
              ? '<span class="status-badge-chip badge-modified">Изменено</span>'
              : '<span class="status-badge-chip badge-default">Дефолт</span>'
          }
        </div>
        <div class="accordion-col-actions">
          <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${t.id}" title="Сбросить к исходным параметрам">↩</button>
          <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
        </div>
      </div>

      <div class="accordion-row-body">
        <div class="drawer-content">
          <div class="drawer-header-info">
            <div class="drawer-desc">${t.description || ''}</div>
            <div class="drawer-scaling-badge" style="color:${bInfo.color}; border-color:${bInfo.color}40;">${bInfo.label} • ${t.notes || 'Мета-талант'}</div>
          </div>

          <div class="drawer-controls-grid">
            ${renderStatControl(state, 'talents', t.id, 'bonusPerLevel', `Бонус за ранг (${t.unit || 'ед.'})`, t.bonusPerLevel, 0.005, 100, 0.005)}
            ${renderStatControl(state, 'talents', t.id, 'maxLevel', 'Максимальный ранг (уровень)', t.maxLevel, 1, 10, 1)}
          </div>

          <div class="drawer-footer">
            <span style="font-size:11px; color:var(--text-secondary);">Ключ в характеристиках: <code>${t.statKey}</code></span>
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${t.id}">
              Сбросить талант
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
        const tid = (e.currentTarget as HTMLElement).dataset.id!;
        onResetItem('talents', tid);
      });
    });

    container.appendChild(rowItem);
  }

  attachInputListeners(container, onFieldChange);
}
