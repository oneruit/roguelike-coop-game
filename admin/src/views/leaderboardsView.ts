import { BalanceState } from '../state/balanceState';
import { SupabaseService } from '../api/supabaseService';
import { LeaderboardEntry } from '../types';
import { HERO_NAMES, getEntityTexture } from '../constants';
import { showToast } from '../ui/toast';

export function renderLeaderboards(
  state: BalanceState,
  supabase: SupabaseService,
  onRefresh: () => void
): void {
  const container = document.getElementById('leaderboards-list');
  if (!container) return;

  const entries = [...state.leaderboardEntries];

  // Update summary KPIs
  const totalCountEl = document.getElementById('kpi-lb-total-count');
  const highScoreEl = document.getElementById('kpi-lb-high-score');
  const victoriesEl = document.getElementById('kpi-lb-victories');
  const sidebarCountEl = document.getElementById('sidebar-leaderboards-count');

  const total = entries.length;
  const highScore = total > 0 ? Math.max(...entries.map((e) => e.score || 0)) : 0;
  const victories = entries.filter((e) => e.isVictory).length;
  const victoryRate = total > 0 ? Math.round((victories / total) * 100) : 0;

  if (totalCountEl) totalCountEl.innerText = String(total);
  if (highScoreEl) highScoreEl.innerText = highScore.toLocaleString('ru-RU');
  if (victoriesEl) victoriesEl.innerText = `${victories} (${victoryRate}%)`;
  if (sidebarCountEl) sidebarCountEl.innerText = String(total);

  // Sorting
  const sort = state.tableSorts.leaderboards || { col: 'score', dir: 'desc' };
  entries.sort((a, b) => {
    let diff = 0;
    switch (sort.col) {
      case 'player':
        diff = a.playerName.localeCompare(b.playerName, 'ru');
        break;
      case 'hero':
        diff = (a.heroId || '').localeCompare(b.heroId || '', 'ru');
        break;
      case 'stage':
        diff = a.stage - b.stage;
        break;
      case 'time':
        diff = a.survivalTimeSec - b.survivalTimeSec;
        break;
      case 'kills':
        diff = a.kills - b.kills;
        break;
      case 'credits':
        diff = a.credits - b.credits;
        break;
      case 'victory':
        diff = (a.isVictory ? 1 : 0) - (b.isVictory ? 1 : 0);
        break;
      case 'date':
        diff = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        break;
      case 'score':
      default:
        diff = a.score - b.score;
        break;
    }
    return sort.dir === 'asc' ? diff : -diff;
  });

  // Filtering
  const heroFilter = state.leaderboardHeroFilter || 'all';
  const victoryFilter = state.leaderboardVictoryFilter || 'all';
  const searchFilter = (state.searchFilter || '').trim().toLowerCase();

  const filtered = entries.filter((e) => {
    if (heroFilter !== 'all' && e.heroId !== heroFilter) return false;
    if (victoryFilter === 'victory' && !e.isVictory) return false;
    if (victoryFilter === 'defeat' && e.isVictory) return false;
    if (searchFilter) {
      const matchName = e.playerName.toLowerCase().includes(searchFilter);
      const matchId = (e.playerId || '').toLowerCase().includes(searchFilter);
      const matchHero = (HERO_NAMES[e.heroId] || e.heroId).toLowerCase().includes(searchFilter);
      if (!matchName && !matchId && !matchHero) return false;
    }
    return true;
  });

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding:48px 24px; text-align:center; background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-sm);">
        <div style="font-size:36px; margin-bottom:12px;">🏆</div>
        <h3 style="font-size:16px; font-weight:700; color:var(--text-heading); margin-bottom:6px;">Записи лидеров не найдены</h3>
        <p style="font-size:13px; color:var(--text-muted); max-width:440px; margin:0 auto 16px;">
          ${total === 0 ? 'Таблица лидеров пуста. Ожидаются результаты игровых сессий из базы данных.' : 'По заданным параметрам поиска и фильтров нет подходящих результатов.'}
        </p>
        <div style="display:flex; justify-content:center; gap:8px;">
          ${total === 0 ? '<button id="btn-empty-refresh" class="btn btn-sm btn-primary">🔄 Синхронизировать с БД</button>' : '<button id="btn-reset-filters" class="btn btn-sm btn-outline">Сбросить фильтры</button>'}
        </div>
      </div>
    `;

    document.getElementById('btn-empty-refresh')?.addEventListener('click', async () => {
      await supabase.fetchLeaderboards();
      showToast('Синхронизация с базой данных завершена.', 'success');
      onRefresh();
    });

    document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
      state.leaderboardHeroFilter = 'all';
      state.leaderboardVictoryFilter = 'all';
      state.searchFilter = '';
      const heroSelect = document.getElementById('filter-leaderboard-hero') as HTMLSelectElement | null;
      const victorySelect = document.getElementById('filter-leaderboard-victory') as HTMLSelectElement | null;
      if (heroSelect) heroSelect.value = 'all';
      if (victorySelect) victorySelect.value = 'all';
      onRefresh();
    });

    return;
  }

  // Render rows
  filtered.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.className = 'accordion-item';
    row.style.cursor = 'default';

    const rank = idx + 1;
    let rankBadge = `<span class="rank-badge">${rank}</span>`;
    if (rank === 1) {
      rankBadge = `<span class="rank-badge rank-1" style="background:#fef08a; color:#854d0e; font-weight:800; border:1px solid #eab308;">🥇 1</span>`;
    } else if (rank === 2) {
      rankBadge = `<span class="rank-badge rank-2" style="background:#e2e8f0; color:#334155; font-weight:800; border:1px solid #94a3b8;">🥈 2</span>`;
    } else if (rank === 3) {
      rankBadge = `<span class="rank-badge rank-3" style="background:#fed7aa; color:#9a3412; font-weight:800; border:1px solid #f97316;">🥉 3</span>`;
    }

    const heroTexture = getEntityTexture('heroes', entry.heroId);
    const heroTitle = HERO_NAMES[entry.heroId] || entry.heroId;

    const mins = Math.floor(entry.survivalTimeSec / 60);
    const secs = Math.floor(entry.survivalTimeSec % 60);
    const timeFormatted = `${mins}:${String(secs).padStart(2, '0')}`;

    const dateFormatted = entry.createdAt
      ? new Date(entry.createdAt).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '—';

    const victoryBadge = entry.isVictory
      ? '<span class="status-badge-chip pill-success" style="background:rgba(34,197,94,0.15); color:#16a34a; border:1px solid #22c55e; font-weight:600;">Победа 👑</span>'
      : '<span class="status-badge-chip" style="background:rgba(100,116,139,0.15); color:#64748b; border:1px solid #94a3b8; font-weight:600;">Поражение</span>';

    row.innerHTML = `
      <div class="accordion-row-header leaderboards-table-cols">
        <!-- Col 1: Rank -->
        <div style="display:flex; align-items:center; justify-content:center;">
          ${rankBadge}
        </div>

        <!-- Col 2: Player & ID -->
        <div class="accordion-col-main" style="min-width:0;">
          <div class="item-identity" style="overflow:hidden;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="item-title" style="font-weight:700; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${escapeHtml(entry.playerName)}</span>
            </div>
            <span class="item-id-badge" style="font-size:10px; opacity:0.85; max-width:180px; text-overflow:ellipsis; overflow:hidden;" title="${escapeHtml(entry.playerId)}">${escapeHtml(entry.playerId)}</span>
          </div>
        </div>

        <!-- Col 3: Hero -->
        <div class="accordion-col-stat" style="display:flex; align-items:center; gap:8px;">
          <img src="${heroTexture}" style="width:28px; height:28px; object-fit:contain; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-subtle); flex-shrink:0;" alt="">
          <span style="font-size:12px; font-weight:600; color:var(--text-heading);">${heroTitle}</span>
        </div>

        <!-- Col 4: Score -->
        <div class="accordion-col-stat">
          <span class="stat-highlight-gold" style="font-weight:800; font-size:14px; color:#d97706;">${(entry.score || 0).toLocaleString('ru-RU')}</span>
        </div>

        <!-- Col 5: Stage -->
        <div class="accordion-col-stat">
          <span class="status-badge-chip" style="background:rgba(59,130,246,0.12); color:#2563eb; border:1px solid #3b82f6; font-weight:700;">Этап ${entry.stage}</span>
        </div>

        <!-- Col 6: Time -->
        <div class="accordion-col-stat">
          <span style="font-size:12px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--text-secondary);">⏱️ ${timeFormatted}</span>
        </div>

        <!-- Col 7: Kills -->
        <div class="accordion-col-stat">
          <span style="font-size:12px; font-weight:600; color:var(--text-secondary);">💀 ${(entry.kills || 0).toLocaleString('ru-RU')}</span>
        </div>

        <!-- Col 8: Credits -->
        <div class="accordion-col-stat">
          <span style="font-size:12px; font-weight:600; color:#ca8a04;">🪙 ${(entry.credits || 0).toLocaleString('ru-RU')}</span>
        </div>

        <!-- Col 9: Result -->
        <div class="accordion-col-stat">
          ${victoryBadge}
        </div>

        <!-- Col 10: Date -->
        <div class="accordion-col-stat" style="font-size:11px; color:var(--text-muted); font-variant-numeric:tabular-nums;">
          ${dateFormatted}
        </div>

        <!-- Col 11: Actions -->
        <div class="accordion-col-actions" style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
          <button class="btn btn-xs btn-outline btn-edit-entry" title="Редактировать запись" data-id="${entry.id || ''}" data-player="${entry.playerId}">✏️</button>
          <button class="btn btn-xs btn-outline-danger btn-delete-entry" title="Удалить запись" data-id="${entry.id || ''}" data-player="${entry.playerId}" data-name="${escapeHtml(entry.playerName)}">🗑️</button>
        </div>
      </div>
    `;

    // Bind row action buttons
    const deleteBtn = row.querySelector('.btn-delete-entry');
    deleteBtn?.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const playerName = (ev.currentTarget as HTMLElement).dataset.name || 'этого игрока';
      const id = (ev.currentTarget as HTMLElement).dataset.id;
      const playerId = (ev.currentTarget as HTMLElement).dataset.player;

      if (confirm(`Вы уверены, что хотите удалить рекорд игрока "${playerName}" из таблицы лидеров?`)) {
        const deleted = await supabase.deleteLeaderboardEntry(id, playerId);
        if (deleted) {
          showToast(`Рекорд игрока "${playerName}" успешно удален.`, 'info');
        } else {
          showToast(`Запись удалена из локального хранилища.`, 'info');
        }
        onRefresh();
      }
    });

    const editBtn = row.querySelector('.btn-edit-entry');
    editBtn?.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const id = (ev.currentTarget as HTMLElement).dataset.id || '';
      const playerId = (ev.currentTarget as HTMLElement).dataset.player || '';
      const currentEntry = filtered.find((e) => (id && e.id === id) || e.playerId === playerId);
      if (!currentEntry) return;

      const newName = prompt('Новое имя игрока:', currentEntry.playerName);
      if (newName === null) return;
      const newScoreStr = prompt('Новый счет (очки):', String(currentEntry.score));
      if (newScoreStr === null) return;
      const newScore = parseInt(newScoreStr, 10);
      if (isNaN(newScore)) {
        showToast('Некорректное значение счета!', 'error');
        return;
      }

      await supabase.updateLeaderboardEntry(currentEntry.id || '', {
        playerId: currentEntry.playerId,
        playerName: newName.trim() || currentEntry.playerName,
        score: newScore
      });

      showToast(`Рекорд игрока "${newName.trim()}" обновлен.`, 'success');
      onRefresh();
    });

    container.appendChild(row);
  });
}

/**
 * Exports current leaderboard entries as a formatted JSON file.
 */
export function exportLeaderboardJson(entries: LeaderboardEntry[]): void {
  try {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `leaderboards_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Таблица лидеров успешно экспортирована в JSON.', 'success');
  } catch (err) {
    showToast(`Ошибка экспорта: ${err}`, 'error');
  }
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
