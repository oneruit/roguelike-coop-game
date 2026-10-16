import { Screen } from '../core/Screen';
import { SafeDOM } from '../core/SafeDOM';
import { LeaderboardManager, LeaderboardEntry } from '../../core/LeaderboardManager';
import { SoundManager } from '../../core/SoundManager';

export interface LeaderboardUIOptions {
  container?: HTMLElement | null;
  onClose?: () => void;
}

export class LeaderboardUI extends Screen {
  private modal: HTMLElement | null = null;
  private tbody: HTMLElement | null = null;
  private btnClose: HTMLElement | null = null;
  private btnBack: HTMLElement | null = null;
  private btnRefresh: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private onCloseCallback?: () => void;

  constructor(options?: LeaderboardUIOptions) {
    const el = options?.container || SafeDOM.getElementById('leaderboard-modal');
    super('leaderboard', el);
    this.modal = el;
    this.onCloseCallback = options?.onClose;

    this.bindElements();
    this.bindEvents();
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {
    if (!this.modal) {
      this.modal = SafeDOM.getElementById('leaderboard-modal');
    }
    this.tbody = SafeDOM.query(this.modal, '#leaderboard-tbody');
    this.btnClose = SafeDOM.query(this.modal, '#leaderboard-btn-close');
    this.btnBack = SafeDOM.query(this.modal, '#leaderboard-btn-back');
    this.btnRefresh = SafeDOM.query(this.modal, '#leaderboard-btn-refresh');
    this.backdrop = SafeDOM.query(this.modal, '#leaderboard-backdrop');
  }

  protected bindEvents(): void {
    const handleClose = () => {
      this.hide();
      this.onCloseCallback?.();
    };

    this.btnClose?.addEventListener('click', handleClose);
    this.btnBack?.addEventListener('click', handleClose);
    this.backdrop?.addEventListener('click', handleClose);

    this.btnRefresh?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.loadAndRender();
    });
  }

  public override show(): void {
    if (!this.modal) {
      this.modal = SafeDOM.getElementById('leaderboard-modal');
      this.bindElements();
    }
    if (this.modal) {
      this.modal.classList.remove('hidden');
    }
    SoundManager.playButtonClick?.();
    this.loadAndRender();
  }

  public override hide(): void {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
  }

  public async loadAndRender(): Promise<void> {
    if (!this.tbody) return;
    this.tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;">
          Загрузка зала славы...
        </td>
      </tr>
    `;

    try {
      const entries = await LeaderboardManager.fetchTopScores(25);
      this.renderTable(entries);
    } catch {
      this.renderTable([]);
    }
  }

  private renderTable(entries: LeaderboardEntry[]): void {
    if (!this.tbody) return;
    if (entries.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;">
            Пока нет записанных рекордов. Будьте первыми!
          </td>
        </tr>
      `;
      return;
    }

    const heroIcons: Record<string, string> = {
      ronin: '⚔️ Ронин',
      archer: '🏹 Лучник',
      reaper: '💀 Жнец',
      valkyrie: '🛡️ Валькирия',
      outlaw: '🤠 Разбойник',
      rocket: '🚀 Ракетчик',
      invoker: '✨ Инвокер',
      alchemist: '⚗️ Алхимик'
    };

    let html = '';
    entries.forEach((entry, idx) => {
      const rank = idx + 1;
      let rankDisplay = `#${rank}`;
      if (rank === 1) rankDisplay = '🥇 1';
      else if (rank === 2) rankDisplay = '🥈 2';
      else if (rank === 3) rankDisplay = '🥉 3';

      const minutes = Math.floor(entry.survivalTimeSec / 60);
      const seconds = Math.floor(entry.survivalTimeSec % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      const heroStr = heroIcons[entry.heroId] || entry.heroId;
      const outcomeBadge = entry.isVictory
        ? '<span style="color: #4ade80; font-size: 11px; background: rgba(34, 197, 94, 0.15); padding: 2px 6px; border-radius: 4px;">ПОБЕДА</span>'
        : '<span style="color: #94a3b8; font-size: 11px;">ПАЛ</span>';

      const rowBg = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.15)';
      const rankColor = rank <= 3 ? '#f59e0b' : '#cbd5e1';

      html += `
        <tr style="background: ${rowBg}; border-bottom: 1px solid rgba(255, 255, 255, 0.04);">
          <td style="padding: 10px 14px; font-weight: bold; color: ${rankColor};">${rankDisplay}</td>
          <td style="padding: 10px 14px; font-weight: 500; color: #f8fafc;">
            ${escapeHtml(entry.playerName)} ${outcomeBadge}
          </td>
          <td style="padding: 10px 14px; color: #cbd5e1;">${heroStr}</td>
          <td style="padding: 10px 14px; color: #38bdf8;">Этап ${entry.stage}</td>
          <td style="padding: 10px 14px; color: #e2e8f0;">${timeStr}</td>
          <td style="padding: 10px 14px; color: #f43f5e;">${entry.kills}</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: bold; color: #facc15;">${entry.score.toLocaleString()}</td>
        </tr>
      `;
    });

    this.tbody.innerHTML = html;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
