import { CharacterType } from '../../entities/Player';
import { PlayerStats } from '../../net/NetworkManager';
import { Weapon } from '../../combat/Weapon';
import { SoundManager } from '../../core/SoundManager';
import {
  BattlePassManager,
  BP_MAX_LEVEL,
  BP_POINTS_PER_LEVEL
} from '../../core/BattlePassManager';
import { getWeaponIconUrl } from './HeroUIHelpers';

export interface DetailedPlayerResult {
  id: string;
  name: string;
  charType: CharacterType;
  colorCss: string;
  stats: PlayerStats;
  isLocal: boolean;
}

export interface BattlePassGameOverResult {
  pointsAwarded: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  oldPoints: number;
  newPoints: number;
}

export class GameOverUI {
  private gameOverModal: HTMLElement;
  private gameOverCard: HTMLElement;
  private victoryBadge: HTMLElement;
  private gameOverTitle: HTMLElement;
  private gameOverSubtitle: HTMLElement;
  private victoryStatsPrompt: HTMLElement;
  private arsenalItemsList: HTMLElement;
  private soloGameOverStats: HTMLElement;
  private coopGameOverStats: HTMLElement;
  private finalTime: HTMLElement;
  private finalKills: HTMLElement;
  private finalDamage: HTMLElement;
  private finalLevel: HTMLElement;
  private coopFinalTime: HTMLElement;
  private coopP1Kills: HTMLElement;
  private coopP2Kills: HTMLElement;
  private coopP1Damage: HTMLElement;
  private coopP2Damage: HTMLElement;
  private coopP1Level: HTMLElement;
  private coopP2Level: HTMLElement;
  private coopP1Revives: HTMLElement;
  private coopP2Revives: HTMLElement;
  private coopTotalKills: HTMLElement;
  private coopStatsThead: HTMLElement | null;
  private coopStatsTbody: HTMLElement | null;
  private btnRestart: HTMLElement;
  private btnGameOverMenu: HTMLElement;

  // Battle Pass elements
  private gameOverBpBox: HTMLElement | null = null;
  private gameOverBpPointsGained: HTMLElement | null = null;
  private gameOverBpReason: HTMLElement | null = null;
  private gameOverBpLevelBadge: HTMLElement | null = null;
  private gameOverBpBarFill: HTMLElement | null = null;
  private gameOverBpXpText: HTMLElement | null = null;
  private gameOverBpLevelup: HTMLElement | null = null;

  public onRestartClicked?: () => void;
  public onMenuClicked?: () => void;

  constructor() {
    this.gameOverModal = document.getElementById('game-over-modal')!;
    this.gameOverCard = document.getElementById('game-over-card')!;
    this.victoryBadge = document.getElementById('victory-badge')!;
    this.gameOverTitle = document.getElementById('game-over-title')!;
    this.gameOverSubtitle = document.getElementById('game-over-subtitle')!;
    this.victoryStatsPrompt = document.getElementById('victory-stats-prompt')!;
    this.arsenalItemsList = document.getElementById('arsenal-items-list')!;
    this.soloGameOverStats = document.getElementById('solo-game-over-stats')!;
    this.coopGameOverStats = document.getElementById('coop-game-over-stats')!;
    this.finalTime = document.getElementById('final-time')!;
    this.finalKills = document.getElementById('final-kills')!;
    this.finalDamage = document.getElementById('final-damage')!;
    this.finalLevel = document.getElementById('final-level')!;
    this.coopFinalTime = document.getElementById('coop-final-time')!;
    this.coopP1Kills = document.getElementById('coop-p1-kills')!;
    this.coopP2Kills = document.getElementById('coop-p2-kills')!;
    this.coopP1Damage = document.getElementById('coop-p1-damage')!;
    this.coopP2Damage = document.getElementById('coop-p2-damage')!;
    this.coopP1Level = document.getElementById('coop-p1-level')!;
    this.coopP2Level = document.getElementById('coop-p2-level')!;
    this.coopP1Revives = document.getElementById('coop-p1-revives')!;
    this.coopP2Revives = document.getElementById('coop-p2-revives')!;
    this.coopTotalKills = document.getElementById('coop-total-kills')!;
    this.coopStatsThead = document.getElementById('coop-stats-thead');
    this.coopStatsTbody = document.getElementById('coop-stats-tbody');
    this.btnRestart = document.getElementById('btn-restart')!;
    this.btnGameOverMenu = document.getElementById('btn-gameover-menu')!;

    this.gameOverBpBox = document.getElementById('game-over-battle-pass');
    this.gameOverBpPointsGained = document.getElementById('game-over-bp-points-gained');
    this.gameOverBpReason = document.getElementById('game-over-bp-reason');
    this.gameOverBpLevelBadge = document.getElementById('game-over-bp-level-badge');
    this.gameOverBpBarFill = document.getElementById('game-over-bp-bar-fill');
    this.gameOverBpXpText = document.getElementById('game-over-bp-xp-text');
    this.gameOverBpLevelup = document.getElementById('game-over-bp-levelup');

    this.btnRestart.addEventListener('click', () => this.onRestartClicked?.());
    this.btnGameOverMenu.addEventListener('click', () => this.onMenuClicked?.());
  }

  public showGameOver(
    timeStr: string,
    playerStats: PlayerStats,
    partnerStats?: PlayerStats | null,
    isCoop: boolean = false,
    isVictory: boolean = false,
    weapons?: Weapon[],
    allPlayersResults?: DetailedPlayerResult[],
    battlePassResult?: BattlePassGameOverResult
  ): void {
    if (isVictory) {
      SoundManager.playVictory();
      this.gameOverCard.classList.add('victory-mode');
      this.victoryBadge.classList.remove('hidden');
      this.victoryStatsPrompt.classList.remove('hidden');
      this.gameOverTitle.innerText = 'ВЫ ПОБЕДИЛИ!';
      this.gameOverTitle.className = 'death-title modern-menu-title victory-title';
      this.gameOverSubtitle.innerText =
        'Вы выдержали легендарные 30 минут в беспощадной пустыне! Бессмертный Жнец забрал вашу душу, но легенда о вас будет жить вечно!';
      this.gameOverSubtitle.className = 'death-subtitle menu-tagline-modern victory-subtitle';
      this.btnRestart.innerText = 'Начать новую экспедицию';
    } else {
      SoundManager.playGameOver();
      this.gameOverCard.classList.remove('victory-mode');
      this.victoryBadge.classList.add('hidden');
      this.victoryStatsPrompt.classList.add('hidden');
      this.gameOverTitle.innerText = 'ВЫ ПОГИБЛИ';
      this.gameOverTitle.className = 'death-title modern-menu-title';
      this.gameOverSubtitle.innerText = 'Пустыня не прощает ошибок...';
      this.gameOverSubtitle.className = 'death-subtitle menu-tagline-modern';
      this.btnRestart.innerText = 'Возродиться';
    }

    if (weapons && weapons.length > 0 && this.arsenalItemsList) {
      const sortedWeapons = [...weapons].sort((a, b) => (b.damageDealt || 0) - (a.damageDealt || 0));
      const totalWeaponDamage = sortedWeapons.reduce((sum, w) => sum + (w.damageDealt || 0), 0);

      this.arsenalItemsList.innerHTML = sortedWeapons
        .map((w, idx) => {
          const iconUrl = getWeaponIconUrl(w.id);
          const dmg = Math.round(w.damageDealt || 0);
          const pctNum = totalWeaponDamage > 0 ? (dmg / totalWeaponDamage) * 100 : 0;
          const pct = pctNum.toFixed(1);
          const isTop = idx === 0 && dmg > 0;
          const tier = (w.awakenedGrade ?? 0) >= 2 ? 1 : ((w.awakenedGrade ?? 0) === 1 ? 2 : 3);
          const gradeBadge = `<span class="tag-grade">Тир ${tier}</span>`;

          return `<div class="weapon-damage-item ${isTop ? 'top-damage' : ''}">
            <div class="weapon-damage-header">
              <div class="weapon-damage-identity">
                <img src="${iconUrl}" class="arsenal-icon-img" alt="${w.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'" />
                <span class="tag-icon" style="display:none">${w.icon}</span>
                <span class="weapon-damage-name">${w.name}</span>
                <span class="tag-lvl">Ур. ${w.level}</span>
                ${gradeBadge}
                ${isTop ? '<span class="weapon-stat-top-badge">ТОП УРОН</span>' : ''}
              </div>
              <div class="weapon-damage-numbers">
                <span class="weapon-damage-val">${dmg.toLocaleString('ru-RU')}</span>
                <span class="weapon-damage-pct">${pct}%</span>
              </div>
            </div>
            <div class="weapon-damage-bar-wrap">
              <div class="weapon-damage-bar-fill" style="width: ${pctNum}%;"></div>
            </div>
          </div>`;
        })
        .join('');
    } else if (this.arsenalItemsList) {
      this.arsenalItemsList.innerHTML = '<div class="weapon-damage-empty">Нет данных по оружию</div>';
    }

    if (isCoop && ((allPlayersResults && allPlayersResults.length > 0) || partnerStats)) {
      this.soloGameOverStats.classList.add('hidden');
      this.coopGameOverStats.classList.remove('hidden');
      this.coopFinalTime.innerText = timeStr;

      if (allPlayersResults && allPlayersResults.length > 0) {
        let maxKills = 0;
        let maxDamage = 0;
        let totalTeamKills = 0;
        for (const p of allPlayersResults) {
          if (p.stats.kills > maxKills) maxKills = p.stats.kills;
          if (p.stats.damageDealt > maxDamage) maxDamage = p.stats.damageDealt;
          totalTeamKills += p.stats.kills;
        }

        let theadHtml = '<tr><th>Параметр</th>';
        for (const p of allPlayersResults) {
          theadHtml += `<th style="color: ${p.colorCss};">${p.name}</th>`;
        }
        theadHtml += '</tr>';
        if (this.coopStatsThead) this.coopStatsThead.innerHTML = theadHtml;

        let tbodyHtml = '';

        // Row 1: Kills
        tbodyHtml += '<tr><td>Убийств</td>';
        for (const p of allPlayersResults) {
          const isMvp = p.stats.kills === maxKills && maxKills > 0;
          tbodyHtml += `<td class="${isMvp ? 'mvp-cell' : ''}">${p.stats.kills}${isMvp ? ' [MVP]' : ''}</td>`;
        }
        tbodyHtml += '</tr>';

        // Row 2: Damage
        tbodyHtml += '<tr><td>Урон</td>';
        for (const p of allPlayersResults) {
          const isMvp = p.stats.damageDealt === maxDamage && maxDamage > 0;
          tbodyHtml += `<td class="${isMvp ? 'mvp-cell' : ''}">${Math.round(p.stats.damageDealt)}${isMvp ? ' [MAX]' : ''}</td>`;
        }
        tbodyHtml += '</tr>';

        // Row 3: Level
        tbodyHtml += '<tr><td>Уровень</td>';
        for (const p of allPlayersResults) {
          tbodyHtml += `<td>${p.stats.level}</td>`;
        }
        tbodyHtml += '</tr>';

        // Row 4: Revives
        tbodyHtml += '<tr><td>Спасений</td>';
        for (const p of allPlayersResults) {
          tbodyHtml += `<td>${p.stats.revives}</td>`;
        }
        tbodyHtml += '</tr>';

        // Row 5: Total Team Kills
        tbodyHtml += `<tr class="total-row"><td>Врагов команды</td><td colspan="${allPlayersResults.length}">${totalTeamKills}</td></tr>`;

        if (this.coopStatsTbody) this.coopStatsTbody.innerHTML = tbodyHtml;
      } else if (partnerStats) {
        this.coopP1Kills.innerText = `${playerStats.kills}`;
        this.coopP2Kills.innerText = `${partnerStats.kills}`;
        this.coopP1Damage.innerText = `${Math.round(playerStats.damageDealt)}`;
        this.coopP2Damage.innerText = `${Math.round(partnerStats.damageDealt)}`;
        this.coopP1Level.innerText = `${playerStats.level}`;
        this.coopP2Level.innerText = `${partnerStats.level}`;
        this.coopP1Revives.innerText = `${playerStats.revives}`;
        this.coopP2Revives.innerText = `${partnerStats.revives}`;
        this.coopTotalKills.innerText = `${playerStats.kills + partnerStats.kills}`;
      }
    } else {
      this.soloGameOverStats.classList.remove('hidden');
      this.coopGameOverStats.classList.add('hidden');

      this.finalTime.innerText = timeStr;
      this.finalKills.innerText = `${playerStats.kills}`;
      this.finalDamage.innerText = `${Math.round(playerStats.damageDealt)}`;
      this.finalLevel.innerText = `${playerStats.level}`;
    }

    if (this.gameOverBpBox) {
      const bp = BattlePassManager.getInstance();
      const ptsAwarded = battlePassResult ? battlePassResult.pointsAwarded : 0;
      const currentLevel = battlePassResult ? battlePassResult.newLevel : bp.getLevel();
      const currentPtsInLvl = bp.getPointsInCurrentLevel();
      const fillPct = currentLevel >= BP_MAX_LEVEL ? 100 : (currentPtsInLvl / BP_POINTS_PER_LEVEL) * 100;

      if (this.gameOverBpPointsGained) {
        this.gameOverBpPointsGained.innerText = `+${ptsAwarded} ОП`;
      }
      if (this.gameOverBpReason) {
        let ruleHint = 'выживание в бою';
        if (ptsAwarded === 20) ruleHint = 'до 5 мин: +20 ОП';
        else if (ptsAwarded === 50) ruleHint = 'до 10 мин: +50 ОП';
        else if (ptsAwarded === 100) ruleHint = 'до 15 мин: +100 ОП';
        else if (ptsAwarded === 150) ruleHint = 'до 20 мин: +150 ОП';
        else if (ptsAwarded === 200) ruleHint = 'до 30 мин / победа: +200 ОП';
        this.gameOverBpReason.innerText = `Выживание: ${timeStr} (${ruleHint})`;
      }
      if (this.gameOverBpLevelBadge) {
        this.gameOverBpLevelBadge.innerText = currentLevel >= BP_MAX_LEVEL ? 'МАКС. УРОВЕНЬ' : `Ур. ${currentLevel}`;
      }
      if (this.gameOverBpBarFill) {
        this.gameOverBpBarFill.style.width = `${fillPct}%`;
      }
      if (this.gameOverBpXpText) {
        this.gameOverBpXpText.innerText =
          currentLevel >= BP_MAX_LEVEL
            ? `${BP_POINTS_PER_LEVEL} / ${BP_POINTS_PER_LEVEL} ОП (МАКС)`
            : `${currentPtsInLvl} / ${BP_POINTS_PER_LEVEL} ОП`;
      }
      if (this.gameOverBpLevelup) {
        if (battlePassResult && battlePassResult.leveledUp) {
          this.gameOverBpLevelup.classList.remove('hidden');
        } else {
          this.gameOverBpLevelup.classList.add('hidden');
        }
      }
      this.gameOverBpBox.classList.remove('hidden');
    }

    this.gameOverModal.classList.remove('hidden');
  }

  public hideGameOver(): void {
    this.gameOverModal.classList.add('hidden');
  }
}
