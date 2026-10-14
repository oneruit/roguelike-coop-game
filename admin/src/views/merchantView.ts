import { BalanceState } from '../state/balanceState';
import { renderStatControl, attachInputListeners } from './controlHelpers';

export function renderMerchant(
  state: BalanceState,
  onFieldChange: (path: string, val: number) => void
): void {
  const container = document.getElementById('merchant-form-container');
  if (!container) return;

  const g = state.draftBalance.global;

  const baseCommon = g.merchantPriceCommon ?? 400;
  const baseUncommon = g.merchantPriceUncommon ?? 800;
  const baseRare = g.merchantPriceRare ?? 1500;
  const baseLegendary = g.merchantPriceLegendary ?? 3000;
  const baseBoss = g.merchantPriceBoss ?? 5000;
  const baseUpgrade = g.merchantPriceWeaponUpgrade ?? 500;

  const getEscalated = (base: number, purchaseIndex: number) =>
    Math.round(base * Math.pow(1.4, purchaseIndex));

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
      <!-- Card 1: Spawn & Stay Timing -->
      <div class="card-surface" style="padding: 20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom: 16px;">
          <div style="font-size:24px;">⏳</div>
          <div>
            <h4 style="margin:0; color: #f59e0b; font-size:15px; font-weight:700;">Тайминги появления Торговца</h4>
            <span style="font-size:12px; color:var(--text-muted);">Цикл визитов и стоянки Торговца в Разломе</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${renderStatControl(state, 'global', '', 'merchantSpawnInterval', 'Интервал появления (сек)', g.merchantSpawnInterval ?? 180, 30, 600, 10)}
          ${renderStatControl(state, 'global', '', 'merchantStayDuration', 'Время стоянки в мире (сек)', g.merchantStayDuration ?? 120, 20, 300, 10)}
        </div>
        <div style="margin-top:16px; padding:12px; background:rgba(245, 158, 11, 0.08); border-left:3px solid #f59e0b; border-radius:4px; font-size:12px; color:var(--text-secondary); line-height:1.5;">
          <strong>Цикличность:</strong> Торговец материализуется в локации каждые <strong>${g.merchantSpawnInterval ?? 180}с</strong> (${((g.merchantSpawnInterval ?? 180)/60).toFixed(1)} мин) и остается доступен для покупок в течение <strong>${g.merchantStayDuration ?? 120}с</strong>.
        </div>
      </div>

      <!-- Card 2: Base Item Prices -->
      <div class="card-surface" style="padding: 20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom: 16px;">
          <div style="font-size:24px;">💎</div>
          <div>
            <h4 style="margin:0; color: #f59e0b; font-size:15px; font-weight:700;">Базовые цены за предметы (Осколки ⬡)</h4>
            <span style="font-size:12px; color:var(--text-muted);">Стартовая стоимость покупки по грейдам качества</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${renderStatControl(state, 'global', '', 'merchantPriceCommon', 'Обычный (Common) ⬡', baseCommon, 50, 5000, 50)}
          ${renderStatControl(state, 'global', '', 'merchantPriceUncommon', 'Необычный (Uncommon) ⬡', baseUncommon, 100, 10000, 100)}
          ${renderStatControl(state, 'global', '', 'merchantPriceRare', 'Редкий (Rare) ⬡', baseRare, 200, 20000, 100)}
          ${renderStatControl(state, 'global', '', 'merchantPriceLegendary', 'Легендарный (Legendary) ⬡', baseLegendary, 500, 50000, 250)}
          ${renderStatControl(state, 'global', '', 'merchantPriceBoss', 'Босс-артефакт (Boss) ⬡', baseBoss, 1000, 100000, 500)}
          ${renderStatControl(state, 'global', '', 'merchantPriceWeaponUpgrade', 'Улучшение оружия (Кузница) ⬡', baseUpgrade, 50, 10000, 50)}
        </div>
      </div>

      <!-- Card 3: Price Escalation Table -->
      <div class="card-surface" style="padding: 20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom: 16px;">
          <div style="font-size:24px;">📈</div>
          <div>
            <h4 style="margin:0; color: #3b82f6; font-size:15px; font-weight:700;">Эскалация цен в забеге</h4>
            <span style="font-size:12px; color:var(--text-muted);">Формула: Цена = Базовая × 1.4^N (N = число покупок)</span>
          </div>
        </div>
        <table class="mini-ranking-table">
          <thead>
            <tr>
              <th>Покупка</th>
              <th>Множитель</th>
              <th>Обычный</th>
              <th>Редкий</th>
              <th>Легенд.</th>
              <th>Кузница</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1-я (N=0)</strong></td>
              <td>1.00x</td>
              <td>${baseCommon} ⬡</td>
              <td>${baseRare} ⬡</td>
              <td>${baseLegendary} ⬡</td>
              <td>${baseUpgrade} ⬡</td>
            </tr>
            <tr>
              <td><strong>2-я (N=1)</strong></td>
              <td>1.40x</td>
              <td>${getEscalated(baseCommon, 1)} ⬡</td>
              <td>${getEscalated(baseRare, 1)} ⬡</td>
              <td>${getEscalated(baseLegendary, 1)} ⬡</td>
              <td>${getEscalated(baseUpgrade, 1)} ⬡</td>
            </tr>
            <tr>
              <td><strong>3-я (N=2)</strong></td>
              <td>1.96x</td>
              <td>${getEscalated(baseCommon, 2)} ⬡</td>
              <td>${getEscalated(baseRare, 2)} ⬡</td>
              <td>${getEscalated(baseLegendary, 2)} ⬡</td>
              <td>${getEscalated(baseUpgrade, 2)} ⬡</td>
            </tr>
            <tr>
              <td><strong>4-я (N=3)</strong></td>
              <td>2.74x</td>
              <td>${getEscalated(baseCommon, 3)} ⬡</td>
              <td>${getEscalated(baseRare, 3)} ⬡</td>
              <td>${getEscalated(baseLegendary, 3)} ⬡</td>
              <td>${getEscalated(baseUpgrade, 3)} ⬡</td>
            </tr>
            <tr>
              <td><strong>5-я (N=4)</strong></td>
              <td>3.84x</td>
              <td>${getEscalated(baseCommon, 4)} ⬡</td>
              <td>${getEscalated(baseRare, 4)} ⬡</td>
              <td>${getEscalated(baseLegendary, 4)} ⬡</td>
              <td>${getEscalated(baseUpgrade, 4)} ⬡</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:16px; font-size:12px; color:var(--text-muted); line-height:1.4;">
          💡 Коэффициент эскалации 1.4x стимулирует взвешенный выбор покупок и балансирует избыток осколков на поздних стадиях игры.
        </div>
      </div>
    </div>
  `;

  attachInputListeners(container, onFieldChange);
}
