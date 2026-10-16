import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { CharacterType } from '../../../entities/Player';
import { PlayerStats } from '../../../net/NetworkManager';
import { Weapon } from '../../../combat/Weapon';
import { SoundManager } from '../../../core/SoundManager';
import {
  BattlePassManager,
  BP_MAX_LEVEL,
  BP_POINTS_PER_LEVEL
} from '../../../core/BattlePassManager';
import { getWeaponIconUrl } from '../../modules/HeroUIHelpers';

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

export interface GameOverScreenOptions {
  container?: HTMLElement | null;
}

export class GameOverScreen extends Screen {
  private gameOverCard: HTMLElement | null = null;
  private victoryBadge: HTMLElement | null = null;
  private gameOverTitle: HTMLElement | null = null;
  private gameOverSubtitle: HTMLElement | null = null;
  private victoryStatsPrompt: HTMLElement | null = null;
  private arsenalItemsList: HTMLElement | null = null;
  private soloGameOverStats: HTMLElement | null = null;
  private coopGameOverStats: HTMLElement | null = null;
  private finalTime: HTMLElement | null = null;
  private finalKills: HTMLElement | null = null;
  private finalDamage: HTMLElement | null = null;
  private finalLevel: HTMLElement | null = null;
  private coopFinalTime: HTMLElement | null = null;
  private coopP1Kills: HTMLElement | null = null;
  private coopP2Kills: HTMLElement | null = null;
  private coopP1Damage: HTMLElement | null = null;
  private coopP2Damage: HTMLElement | null = null;
  private coopP1Level: HTMLElement | null = null;
  private coopP2Level: HTMLElement | null = null;
  private coopP1Revives: HTMLElement | null = null;
  private coopP2Revives: HTMLElement | null = null;
  private coopTotalKills: HTMLElement | null = null;
  private coopStatsThead: HTMLElement | null = null;
  private coopStatsTbody: HTMLElement | null = null;
  private btnRestart: HTMLElement | null = null;
  private btnGameOverMenu: HTMLElement | null = null;
  private btnLeaderboard: HTMLElement | null = null;

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
  public onLeaderboardClicked?: () => void;

  constructor(options?: GameOverScreenOptions) {
    const existingModal = options?.container || SafeDOM.getElementById('game-over-modal');
    super('game-over', existingModal);

    this.bindElements();
    this.bindEvents();
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {
    this.gameOverCard = SafeDOM.query(this.container, '#game-over-card');
    this.victoryBadge = SafeDOM.query(this.container, '#victory-badge');
    this.gameOverTitle = SafeDOM.query(this.container, '#game-over-title');
    this.gameOverSubtitle = SafeDOM.query(this.container, '#game-over-subtitle');
    this.victoryStatsPrompt = SafeDOM.query(this.container, '#victory-stats-prompt');
    this.arsenalItemsList = SafeDOM.query(this.container, '#arsenal-items-list');
    this.soloGameOverStats = SafeDOM.query(this.container, '#solo-game-over-stats');
    this.coopGameOverStats = SafeDOM.query(this.container, '#coop-game-over-stats');
    this.finalTime = SafeDOM.query(this.container, '#final-time');
    this.finalKills = SafeDOM.query(this.container, '#final-kills');
    this.finalDamage = SafeDOM.query(this.container, '#final-damage');
    this.finalLevel = SafeDOM.query(this.container, '#final-level');
    this.coopFinalTime = SafeDOM.query(this.container, '#coop-final-time');
    this.coopP1Kills = SafeDOM.query(this.container, '#coop-p1-kills');
    this.coopP2Kills = SafeDOM.query(this.container, '#coop-p2-kills');
    this.coopP1Damage = SafeDOM.query(this.container, '#coop-p1-damage');
    this.coopP2Damage = SafeDOM.query(this.container, '#coop-p2-damage');
    this.coopP1Level = SafeDOM.query(this.container, '#coop-p1-level');
    this.coopP2Level = SafeDOM.query(this.container, '#coop-p2-level');
    this.coopP1Revives = SafeDOM.query(this.container, '#coop-p1-revives');
    this.coopP2Revives = SafeDOM.query(this.container, '#coop-p2-revives');
    this.coopTotalKills = SafeDOM.query(this.container, '#coop-total-kills');
    this.coopStatsThead = SafeDOM.query(this.container, '#coop-stats-thead');
    this.coopStatsTbody = SafeDOM.query(this.container, '#coop-stats-tbody');
    this.btnRestart = SafeDOM.query(this.container, '#btn-restart');
    this.btnGameOverMenu = SafeDOM.query(this.container, '#btn-gameover-menu');
    this.btnLeaderboard = SafeDOM.query(this.container, '#btn-gameover-leaderboard');

    this.gameOverBpBox = SafeDOM.query(this.container, '#game-over-battle-pass');
    this.gameOverBpPointsGained = SafeDOM.query(this.container, '#game-over-bp-points-gained');
    this.gameOverBpReason = SafeDOM.query(this.container, '#game-over-bp-reason');
    this.gameOverBpLevelBadge = SafeDOM.query(this.container, '#game-over-bp-level-badge');
    this.gameOverBpBarFill = SafeDOM.query(this.container, '#game-over-bp-bar-fill');
    this.gameOverBpXpText = SafeDOM.query(this.container, '#game-over-bp-xp-text');
    this.gameOverBpLevelup = SafeDOM.query(this.container, '#game-over-bp-levelup');
  }

  protected bindEvents(): void {
    this.btnRestart?.addEventListener('click', () => this.onRestartClicked?.());
    this.btnGameOverMenu?.addEventListener('click', () => this.onMenuClicked?.());
    this.btnLeaderboard?.addEventListener('click', () => this.onLeaderboardClicked?.());
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
      this.gameOverCard?.classList.add('victory-mode');
      this.victoryBadge?.classList.remove('hidden');
      this.victoryStatsPrompt?.classList.remove('hidden');
      if (this.gameOverTitle) {
        this.gameOverTitle.innerText = 'ВЫ ПОБЕДИЛИ!';
        this.gameOverTitle.className = 'death-title modern-menu-title victory-title';
      }
      if (this.gameOverSubtitle) {
        this.gameOverSubtitle.innerText =
          'Вы покорили беспощадный Разлом! Легенда о вашей победе будет жить вечно!';
        this.gameOverSubtitle.className = 'death-subtitle menu-tagline-modern victory-subtitle';
      }
      if (this.btnRestart) {
        this.btnRestart.innerText = 'Начать новую экспедицию';
      }
    } else {
      SoundManager.playGameOver();
      this.gameOverCard?.classList.remove('victory-mode');
      this.victoryBadge?.classList.add('hidden');
      this.victoryStatsPrompt?.classList.add('hidden');
      if (this.gameOverTitle) {
        this.gameOverTitle.innerText = 'ВЫ ПОГИБЛИ';
        this.gameOverTitle.className = 'death-title modern-menu-title';
      }
      if (this.gameOverSubtitle) {
        this.gameOverSubtitle.innerText = 'Разлом не прощает ошибок...';
        this.gameOverSubtitle.className = 'death-subtitle menu-tagline-modern';
      }
      if (this.btnRestart) {
        this.btnRestart.innerText = 'Возродиться';
      }
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
      this.soloGameOverStats?.classList.add('hidden');
      this.coopGameOverStats?.classList.remove('hidden');
      if (this.coopFinalTime) {
        this.coopFinalTime.innerText = timeStr;
      }

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
        if (this.coopP1Kills) this.coopP1Kills.innerText = `${playerStats.kills}`;
        if (this.coopP2Kills) this.coopP2Kills.innerText = `${partnerStats.kills}`;
        if (this.coopP1Damage) this.coopP1Damage.innerText = `${Math.round(playerStats.damageDealt)}`;
        if (this.coopP2Damage) this.coopP2Damage.innerText = `${Math.round(partnerStats.damageDealt)}`;
        if (this.coopP1Level) this.coopP1Level.innerText = `${playerStats.level}`;
        if (this.coopP2Level) this.coopP2Level.innerText = `${partnerStats.level}`;
        if (this.coopP1Revives) this.coopP1Revives.innerText = `${playerStats.revives}`;
        if (this.coopP2Revives) this.coopP2Revives.innerText = `${partnerStats.revives}`;
        if (this.coopTotalKills) this.coopTotalKills.innerText = `${playerStats.kills + partnerStats.kills}`;
      }
    } else {
      this.soloGameOverStats?.classList.remove('hidden');
      this.coopGameOverStats?.classList.add('hidden');

      if (this.finalTime) this.finalTime.innerText = timeStr;
      if (this.finalKills) this.finalKills.innerText = `${playerStats.kills}`;
      if (this.finalDamage) this.finalDamage.innerText = `${Math.round(playerStats.damageDealt)}`;
      if (this.finalLevel) this.finalLevel.innerText = `${playerStats.level}`;
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

    this.show();
  }

  public hideGameOver(): void {
    this.hide();
  }
}
