import { BalanceState } from '../state/balanceState';
import { getEntityTexture } from '../constants';

export function renderDashboard(state: BalanceState): void {
  // 1. Top 5 Weapons by L12 DPS
  const topContainer = document.getElementById('dashboard-top-weapons-container');
  if (topContainer) {
    // Only standalone selectable weapons (exclude internal invoker sub-spells)
    const weapons = Object.values(state.draftBalance.weapons).filter(
      (w) => !w.id.startsWith('invoker_') || w.id === 'invoker_invoke'
    );

    const getWeaponDps = (w: typeof weapons[0], level: number) => {
      const dmg = w.damage + (level - 1) * w.damagePerLevel;
      const cd = w.cooldown > 0 ? w.cooldown : 0.4;
      const count = w.count || 1;
      return (dmg * count) / cd;
    };

    weapons.sort((a, b) => getWeaponDps(b, 12) - getWeaponDps(a, 12));

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
            <th>DPS (L12)</th>
          </tr>
        </thead>
        <tbody>
    `;

    top5.forEach((w, idx) => {
      const baseDps = getWeaponDps(w, 1).toFixed(1);
      const l12Dps = getWeaponDps(w, 12).toFixed(1);
      const cdStr = w.cooldown > 0 ? `${w.cooldown}с` : '0.4с';
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
          <td>${w.damage}${w.count && w.count > 1 ? ` (x${w.count})` : ''}</td>
          <td>${cdStr}</td>
          <td><span class="stat-highlight">${baseDps}</span></td>
          <td><span class="stat-highlight-gold" style="font-weight:700;">${l12Dps}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    topContainer.innerHTML = html;
  }

  // 2. System Status / Scaling Container (0 - 120 minutes)
  const sysContainer = document.getElementById('dashboard-system-status-container');
  if (sysContainer) {
    const calcHpMult = (m: number) => {
      const base = 1 + (m * 0.35 + Math.pow(m / 4.0, 1.8) * 0.45) * 1.5;
      const mPost = Math.max(0, m - 15);
      const post = Math.pow(mPost / 3.5, 2.3) * 3.5 * (1 + mPost * 0.15);
      return (base + post).toFixed(1);
    };
    const calcDmgMult = (m: number) => {
      const base = 1 + (m * 0.15 + Math.pow(m / 6.0, 1.5) * 0.30) * 1.5;
      const mPost = Math.max(0, m - 15);
      const post = Math.pow(mPost / 4.0, 2.0) * 1.8 * (1 + mPost * 0.10);
      return (base + post).toFixed(1);
    };
    const calcSpdMult = (m: number) => {
      const mPost = Math.max(0, m - 15);
      return Math.min(1.65, 1 + m * 0.012 * 1.5 + mPost * 0.01).toFixed(2);
    };

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
            <td><span style="color:var(--accent-warning); font-weight:600;">👹 Ранняя фаза</span></td>
            <td><strong>${calcHpMult(5)}x</strong></td>
            <td>${calcDmgMult(5)}x</td>
            <td>${calcSpdMult(5)}x</td>
          </tr>
          <tr>
            <td><strong>15 мин</strong></td>
            <td><span style="color:var(--accent-warning); font-weight:700;">🔥 Точка перелома (старт скейлинга)</span></td>
            <td><strong style="color:var(--accent-warning);">${calcHpMult(15)}x</strong></td>
            <td>${calcDmgMult(15)}x</td>
            <td>${calcSpdMult(15)}x</td>
          </tr>
          <tr>
            <td><strong>30 мин</strong></td>
            <td><span style="color:var(--accent-primary); font-weight:700;">⚡ Нарастание штурма</span></td>
            <td><strong style="color:var(--accent-primary);">${calcHpMult(30)}x</strong></td>
            <td>${calcDmgMult(30)}x</td>
            <td>${calcSpdMult(30)}x</td>
          </tr>
          <tr>
            <td><strong>45 мин</strong></td>
            <td><span style="color:var(--accent-danger); font-weight:700;">💀 Тяжелый штурм</span></td>
            <td><strong style="color:var(--accent-danger);">${calcHpMult(45)}x</strong></td>
            <td>${calcDmgMult(45)}x</td>
            <td>${calcSpdMult(45)}x</td>
          </tr>
          <tr>
            <td><strong>60 мин</strong></td>
            <td><span style="color:#9333ea; font-weight:700;">☠️ Экстремальный натиск</span></td>
            <td><strong style="color:#9333ea;">${calcHpMult(60)}x</strong></td>
            <td>${calcDmgMult(60)}x</td>
            <td>${calcSpdMult(60)}x</td>
          </tr>
          <tr>
            <td><strong>90 мин</strong></td>
            <td><span style="color:#c026d3; font-weight:700;">🌌 Апокалиптический натиск</span></td>
            <td><strong style="color:#c026d3;">${calcHpMult(90)}x</strong></td>
            <td>${calcDmgMult(90)}x</td>
            <td>${calcSpdMult(90)}x</td>
          </tr>
          <tr>
            <td><strong>120 мин</strong></td>
            <td><span style="color:#dc2626; font-weight:700;">🏆 Глубокий лейт-гейм (120 мин)</span></td>
            <td><strong style="color:#dc2626;">${calcHpMult(120)}x</strong></td>
            <td>${calcDmgMult(120)}x</td>
            <td>${calcSpdMult(120)}x</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

export function updateOverviewStats(state: BalanceState): void {
  const weaponCount = Object.keys(state.draftBalance.weapons).length;
  const heroCount = Object.keys(state.draftBalance.heroes).length;
  const monsterCount = Object.keys(state.draftBalance.monsters).length;
  const bossCount = Object.keys(state.draftBalance.bosses).length;
  const passiveCount = Object.keys(state.draftBalance.passives || {}).length;
  const itemCount = Object.keys(state.draftBalance.items || {}).length;
  const talentCount = Object.keys(state.draftBalance.talents || {}).length;
  const opponentsCount = monsterCount + bossCount;

  const kpiCount = document.getElementById('kpi-weapons-count');
  if (kpiCount) kpiCount.innerText = `${weaponCount}`;

  const kpiHeroes = document.getElementById('kpi-heroes-count');
  if (kpiHeroes) kpiHeroes.innerText = `${heroCount}`;

  const kpiOpponents = document.getElementById('kpi-opponents-count');
  if (kpiOpponents) kpiOpponents.innerText = `${opponentsCount} видов`;

  const kpiOpponentsDesc = document.getElementById('kpi-opponents-desc');
  if (kpiOpponentsDesc) kpiOpponentsDesc.innerText = `${monsterCount} крипов + ${bossCount} босса`;

  // Sidebar pills
  const sideW = document.getElementById('sidebar-weapons-count');
  if (sideW) sideW.innerText = `${weaponCount}`;
  const sideH = document.getElementById('sidebar-heroes-count');
  if (sideH) sideH.innerText = `${heroCount}`;
  const sideM = document.getElementById('sidebar-monsters-count');
  if (sideM) sideM.innerText = `${monsterCount}`;
  const sideB = document.getElementById('sidebar-bosses-count');
  if (sideB) sideB.innerText = `${bossCount}`;
  const sideP = document.getElementById('sidebar-passives-count');
  if (sideP) sideP.innerText = `${passiveCount}`;
  const sideI = document.getElementById('sidebar-items-count');
  if (sideI) sideI.innerText = `${itemCount}`;
  const sideT = document.getElementById('sidebar-talents-count');
  if (sideT) sideT.innerText = `${talentCount}`;

  // Quick navigation count badges
  const qnavW = document.getElementById('qnav-weapons-count');
  if (qnavW) qnavW.innerText = `${weaponCount} видов`;
  const qnavH = document.getElementById('qnav-heroes-count');
  if (qnavH) qnavH.innerText = `${heroCount} героев`;
  const qnavM = document.getElementById('qnav-monsters-count');
  if (qnavM) qnavM.innerText = `${monsterCount} видов`;
  const qnavB = document.getElementById('qnav-bosses-count');
  if (qnavB) qnavB.innerText = `${bossCount} босса`;
  const qnavP = document.getElementById('qnav-passives-count');
  if (qnavP) qnavP.innerText = `${passiveCount} пассивок`;
  const qnavI = document.getElementById('qnav-items-count');
  if (qnavI) qnavI.innerText = `${itemCount} предметов`;
  const qnavT = document.getElementById('qnav-talents-count');
  if (qnavT) qnavT.innerText = `${talentCount} талантов`;

  const kpiAvgDps = document.getElementById('kpi-avg-dps');
  if (kpiAvgDps) {
    const weapons = Object.values(state.draftBalance.weapons).filter(
      (w) => !w.id.startsWith('invoker_') || w.id === 'invoker_invoke'
    );
    let totalDps = 0;
    for (const w of weapons) {
      const cd = w.cooldown > 0 ? w.cooldown : 0.4;
      const count = w.count || 1;
      totalDps += (w.damage * count) / cd;
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
