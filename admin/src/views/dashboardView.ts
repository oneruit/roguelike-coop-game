import { BalanceState } from '../state/balanceState';
import { getEntityTexture } from '../constants';

export function renderDashboard(state: BalanceState): void {
  // 1. Top 5 Weapons by L20 DPS
  const topContainer = document.getElementById('dashboard-top-weapons-container');
  if (topContainer) {
    const weapons = Object.values(state.draftBalance.weapons);
    weapons.sort((a, b) => {
      const l20A =
        a.cooldown > 0
          ? (a.damage + 19 * a.damagePerLevel) / a.cooldown
          : (a.damage + 19 * a.damagePerLevel) * 60;
      const l20B =
        b.cooldown > 0
          ? (b.damage + 19 * b.damagePerLevel) / b.cooldown
          : (b.damage + 19 * b.damagePerLevel) * 60;
      return l20B - l20A;
    });

    const top5 = weapons.slice(0, 5);
    let html = `
      <table class="mini-ranking-table">
        <thead>
          <tr>
            <th style="width:36px;">#</th>
            <th>Оружие</th>
            <th>Базовый урон</th>
            <th>Кулдаун</th>
            <th>DPS (L1)</th>
            <th>DPS (L20)</th>
          </tr>
        </thead>
        <tbody>
    `;

    top5.forEach((w, idx) => {
      const baseDps = w.cooldown > 0 ? (w.damage / w.cooldown).toFixed(1) : (w.damage * 60).toFixed(1);
      const l20Dmg = w.damage + 19 * w.damagePerLevel;
      const l20Dps = w.cooldown > 0 ? (l20Dmg / w.cooldown).toFixed(1) : (l20Dmg * 60).toFixed(1);
      const texture = getEntityTexture('weapons', w.id);
      const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';

      html += `
        <tr>
          <td><span class="rank-badge ${rankClass}">${idx + 1}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="${texture}" style="width:24px; height:24px; object-fit:contain; border-radius:4px;" alt="">
              <strong>${w.name}</strong>
            </div>
          </td>
          <td>${w.damage}</td>
          <td>${w.cooldown}с</td>
          <td><span class="stat-highlight">${baseDps}</span></td>
          <td><span class="stat-highlight-gold" style="font-weight:700;">${l20Dps}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    topContainer.innerHTML = html;
  }

  // 2. System Status / Scaling Container
  const sysContainer = document.getElementById('dashboard-system-status-container');
  if (sysContainer) {
    const calcHpMult = (m: number) =>
      (1 + (m * 0.28 + Math.pow(m / 4.5, 1.7) * 0.4) * 1.5).toFixed(1);
    const calcDmgMult = (m: number) =>
      (1 + (m * 0.12 + Math.pow(m / 8, 1.4) * 0.25) * 1.5).toFixed(1);
    const calcSpdMult = (m: number) => Math.min(1.45, 1 + m * 0.012 * 1.5).toFixed(2);

    sysContainer.innerHTML = `
      <table class="mini-ranking-table">
        <thead>
          <tr>
            <th>Время волны</th>
            <th>Событие</th>
            <th>Множитель HP</th>
            <th>Множитель урона</th>
            <th>Множитель скорости</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>0 мин</strong></td>
            <td><span style="color:var(--text-muted);">Старт выживания</span></td>
            <td>1.0x</td>
            <td>1.0x</td>
            <td>1.00x</td>
          </tr>
          <tr>
            <td><strong>5 мин</strong></td>
            <td><span style="color:var(--accent-warning); font-weight:600;">👹 Босс 1 (Демон)</span></td>
            <td><strong>${calcHpMult(5)}x</strong></td>
            <td>${calcDmgMult(5)}x</td>
            <td>${calcSpdMult(5)}x</td>
          </tr>
          <tr>
            <td><strong>15 мин</strong></td>
            <td><span style="color:var(--accent-primary); font-weight:600;">⚡ Середина боя</span></td>
            <td><strong style="color:var(--accent-danger);">${calcHpMult(15)}x</strong></td>
            <td>${calcDmgMult(15)}x</td>
            <td>${calcSpdMult(15)}x</td>
          </tr>
          <tr>
            <td><strong>25 мин</strong></td>
            <td><span style="color:var(--accent-danger); font-weight:600;">🐉 Босс 2 (Гидра)</span></td>
            <td><strong style="color:var(--accent-danger);">${calcHpMult(25)}x</strong></td>
            <td>${calcDmgMult(25)}x</td>
            <td>${calcSpdMult(25)}x</td>
          </tr>
          <tr>
            <td><strong>30 мин</strong></td>
            <td><span style="color:#7c3aed; font-weight:700;">🏆 Финал (Кап)</span></td>
            <td><strong style="color:#7c3aed;">${calcHpMult(30)}x</strong></td>
            <td>${calcDmgMult(30)}x</td>
            <td>${calcSpdMult(30)}x</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

export function updateOverviewStats(state: BalanceState): void {
  const kpiCount = document.getElementById('kpi-weapons-count');
  if (kpiCount) kpiCount.innerText = `${Object.keys(state.draftBalance.weapons).length}`;

  const kpiAvgDps = document.getElementById('kpi-avg-dps');
  if (kpiAvgDps) {
    const weapons = Object.values(state.draftBalance.weapons);
    let totalDps = 0;
    for (const w of weapons) {
      totalDps += w.cooldown > 0 ? w.damage / w.cooldown : w.damage * 60;
    }
    const avg = weapons.length > 0 ? (totalDps / weapons.length).toFixed(1) : '0';
    kpiAvgDps.innerText = avg;
  }

  const kpiDraftCount = document.getElementById('kpi-draft-count');
  const kpiDraftDelta = document.getElementById('kpi-draft-delta');
  const count = state.getModifiedCount();
  if (kpiDraftCount) kpiDraftCount.innerText = `${count}`;
  if (kpiDraftDelta) {
    if (count > 0) {
      kpiDraftDelta.className = 'trend-up';
      kpiDraftDelta.innerText = `+${count} правок`;
    } else {
      kpiDraftDelta.className = 'trend-neutral';
      kpiDraftDelta.innerText = 'В синхроне';
    }
  }

  const stagedBadge = document.getElementById('staged-badge');
  if (stagedBadge) stagedBadge.innerText = `${count}`;

  const btnDiscard = document.getElementById('btn-discard') as HTMLButtonElement | null;
  const btnSave = document.getElementById('btn-save') as HTMLButtonElement | null;
  if (btnDiscard) btnDiscard.disabled = count === 0;
  if (btnSave) btnSave.disabled = count === 0;

  const banner = document.getElementById('staged-alert-banner');
  const countText = document.getElementById('staged-count-text');
  if (banner && countText) {
    if (count > 0) {
      countText.innerText = `${count}`;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }
}
