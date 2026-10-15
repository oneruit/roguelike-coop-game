import { BalanceState } from '../state/balanceState';
import { renderStatControl, attachInputListeners } from './controlHelpers';

export function renderGlobal(
  state: BalanceState,
  onFieldChange: (path: string, val: number) => void
): void {
  const container = document.getElementById('global-form-container');
  if (!container) return;

  const g = state.draftBalance.global;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
      <div>
        <h4 style="margin-bottom: 14px; color: var(--accent-primary); font-size:14px; font-weight:700;">Тактический рывок (Dash)</h4>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${renderStatControl(state, 'global', '', 'dashCooldown', 'Кулдаун рывка (сек)', g.dashCooldown, 0.5, 6.0, 0.1)}
          ${renderStatControl(state, 'global', '', 'dashDuration', 'Длительность рывка (сек)', g.dashDuration, 0.1, 1.0, 0.02)}
        </div>
      </div>

      <div>
        <h4 style="margin-bottom: 14px; color: var(--accent-primary); font-size:14px; font-weight:700;">Критический урон</h4>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${renderStatControl(state, 'global', '', 'baseCritChance', 'Базовый шанс крита', g.baseCritChance, 0.0, 1.0, 0.01)}
          ${renderStatControl(state, 'global', '', 'baseCritDamageMult', 'Множитель крит. урона', g.baseCritDamageMult, 1.2, 5.0, 0.1)}
        </div>
      </div>

      <div>
        <h4 style="margin-bottom: 14px; color: var(--accent-primary); font-size:14px; font-weight:700;">Подбор и броня</h4>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${renderStatControl(state, 'global', '', 'basePickupRadius', 'Радиус магнита (м)', g.basePickupRadius, 1.0, 25.0, 0.5)}
          ${renderStatControl(state, 'global', '', 'maxArmorReduction', 'Макс. снижение урона (Cap)', g.maxArmorReduction, 0.3, 0.95, 0.05)}
        </div>
      </div>
    </div>
  `;

  attachInputListeners(container, onFieldChange);
}
