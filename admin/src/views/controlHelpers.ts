import { BalanceState } from '../state/balanceState';

export function renderStatControl(
  state: BalanceState,
  category: string,
  id: string,
  field: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number
): string {
  const path = id ? `${category}.${id}.${field}` : `${category}.${field}`;
  const origVal = state.getOriginalValue(path);
  const isChanged = origVal !== undefined && origVal !== value;

  return `
    <div class="stat-field">
      <div class="stat-field-header">
        <span class="stat-label">${label}</span>
        <div class="stat-val-wrapper">
          ${isChanged ? `<span class="stat-val-badge" style="text-decoration:line-through; opacity:0.6;">${origVal}</span>` : ''}
          <span class="stat-val-badge ${isChanged ? 'val-changed' : ''}">${value}</span>
        </div>
      </div>
      <div class="stat-controls">
        <input type="range" class="stat-slider" data-path="${path}" min="${min}" max="${max}" step="${step}" value="${value}">
        <input type="number" class="stat-input ${isChanged ? 'is-changed' : ''}" data-path="${path}" min="${min}" max="${max}" step="${step}" value="${value}">
      </div>
    </div>
  `;
}

export function attachInputListeners(
  container: HTMLElement,
  onFieldChange: (path: string, val: number) => void
): void {
  const inputs = container.querySelectorAll<HTMLInputElement>('.stat-slider, .stat-input');
  inputs.forEach((input) => {
    input.addEventListener('input', (e) => {
      const el = e.currentTarget as HTMLInputElement;
      const path = el.dataset.path!;
      const val = parseFloat(el.value);
      if (isNaN(val)) return;

      onFieldChange(path, val);
    });
  });
}

export function toggleRow(state: BalanceState, rowId: string, itemElement: HTMLElement): void {
  if (state.expandedRows.has(rowId)) {
    state.expandedRows.delete(rowId);
    itemElement.classList.remove('is-expanded');
    const toggleBtn = itemElement.querySelector('.btn-toggle-row');
    if (toggleBtn) toggleBtn.textContent = 'Развернуть';
  } else {
    state.expandedRows.add(rowId);
    itemElement.classList.add('is-expanded');
    const toggleBtn = itemElement.querySelector('.btn-toggle-row');
    if (toggleBtn) toggleBtn.textContent = 'Свернуть';
  }
}
