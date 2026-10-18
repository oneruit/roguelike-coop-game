import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { BalanceRow } from '../../../game/src/balance/BalanceTypes';
import { DEFAULT_BALANCE } from '../../../game/src/balance/defaultBalance';
import { AdminConfig, LeaderboardEntry } from '../types';
import { BalanceState } from '../state/balanceState';
import { showToast } from '../ui/toast';
import { toSingularCategory, DEFAULT_DEMO_LEADERBOARDS } from '../constants';

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  public config: AdminConfig = {
    url: '',
    anonKey: '',
    serviceRoleKey: '',
    adminKey: ''
  };

  private state: BalanceState;
  private onDataChanged: () => void;

  constructor(state: BalanceState, onDataChanged: () => void) {
    this.state = state;
    this.onDataChanged = onDataChanged;
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public async loadConfig(): Promise<void> {
    try {
      const res = await fetch('/api/admin/env');
      if (res.ok) {
        const data = await res.json();
        this.config.url = data.url || localStorage.getItem('outlaw_supabase_url') || '';
        this.config.anonKey = data.anonKey || localStorage.getItem('outlaw_supabase_anon_key') || '';
        this.config.serviceRoleKey =
          data.serviceRoleKey || localStorage.getItem('outlaw_supabase_service_role_key') || '';
        this.config.adminKey = data.adminKey || localStorage.getItem('outlaw_admin_passcode') || '';
      }
    } catch {
      this.config.url = localStorage.getItem('outlaw_supabase_url') || '';
      this.config.anonKey = localStorage.getItem('outlaw_supabase_anon_key') || '';
      this.config.serviceRoleKey = localStorage.getItem('outlaw_supabase_service_role_key') || '';
      this.config.adminKey = localStorage.getItem('outlaw_admin_passcode') || '';
    }

    const setVal = (id: string, val: string) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = val;
    };

    setVal('cfg-supabase-url', this.config.url);
    setVal('cfg-supabase-anon', this.config.anonKey);
    setVal('cfg-supabase-service', this.config.serviceRoleKey);
    setVal('cfg-admin-passcode', this.config.adminKey);
  }

  public async connect(): Promise<void> {
    const statusEl = document.getElementById('status-connection');
    const sidebarBadge = document.getElementById('sidebar-db-status-badge');

    if (!this.config.url || (!this.config.serviceRoleKey && !this.config.anonKey)) {
      if (statusEl) {
        statusEl.className = 'status-pill status-error';
        statusEl.innerHTML = '<span class="status-dot"></span><span>Supabase не настроен</span>';
      }
      if (sidebarBadge) {
        sidebarBadge.className = 'tab-pill';
        sidebarBadge.innerText = 'OFFLINE';
      }
      showToast('Supabase не настроен. Перейдите во вкладку «Настройки БД».', 'info');
      return;
    }

    if (statusEl) {
      statusEl.className = 'status-pill status-connecting';
      statusEl.innerHTML = '<span class="status-dot"></span><span>Подключение...</span>';
    }

    try {
      const authKey = this.config.serviceRoleKey || this.config.anonKey;
      this.client = createClient(this.config.url, authKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const { data, error } = await this.client.from('game_balance').select('*');

      if (error) {
        console.warn('[Admin] Supabase error:', error.message);
        if (statusEl) {
          statusEl.className = 'status-pill status-error';
          statusEl.innerHTML = `<span class="status-dot"></span><span>Ошибка: ${error.message.substring(0, 20)}...</span>`;
        }
        if (sidebarBadge) {
          sidebarBadge.className = 'tab-pill';
          sidebarBadge.innerText = 'ERR';
        }
        showToast(`Ошибка таблицы: ${error.message}. Возможно таблица еще не создана.`, 'error');
        return;
      }

      if (this.config.serviceRoleKey) {
        if (statusEl) {
          statusEl.className = 'status-pill status-connected';
          statusEl.innerHTML = '<span class="status-dot"></span><span>Supabase (Запись активна)</span>';
        }
        if (sidebarBadge) {
          sidebarBadge.className = 'tab-pill pill-success';
          sidebarBadge.innerText = 'WRITE';
        }
      } else {
        if (statusEl) {
          statusEl.className = 'status-pill status-connecting';
          statusEl.innerHTML = '<span class="status-dot"></span><span title="Для записи укажите Service Role Key в настройках">Supabase (Только чтение)</span>';
        }
        if (sidebarBadge) {
          sidebarBadge.className = 'tab-pill pill-danger';
          sidebarBadge.innerText = 'READ ONLY';
        }
      }

      if (data && data.length > 0) {
        for (const row of data as BalanceRow[]) {
          this.state.mergeRemoteRow(row);
        }
        this.state.draftBalance = JSON.parse(JSON.stringify(this.state.originalBalance));
        this.state.modifiedPaths.clear();
        this.onDataChanged();
        showToast(`Загружено ${data.length} записей баланса из Supabase.`, 'success');
      } else {
        showToast('Таблица game_balance пуста. Нажмите «Инициализировать БД».', 'info');
      }

      this.setupRealtime();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (statusEl) {
        statusEl.className = 'status-pill status-error';
        statusEl.innerHTML = '<span class="status-dot"></span><span>Ошибка связи</span>';
      }
      showToast(`Ошибка подключения: ${msg}`, 'error');
    }
  }

  public setupRealtime(): void {
    if (!this.client) return;
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = this.client
      .channel('admin_game_balance_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_balance' },
        (payload) => {
          console.log('[Admin Realtime] Event:', payload);
          const row = (payload.new || payload.old) as BalanceRow | undefined;
          if (row && row.category && row.key) {
            this.state.mergeRemoteRow(row);
            if (this.state.modifiedPaths.size === 0) {
              this.state.draftBalance = JSON.parse(JSON.stringify(this.state.originalBalance));
            }
            this.onDataChanged();
          }
        }
      )
      .subscribe();
  }

  public async saveConnectionSettings(): Promise<void> {
    this.config.url = (document.getElementById('cfg-supabase-url') as HTMLInputElement).value.trim();
    this.config.anonKey = (document.getElementById('cfg-supabase-anon') as HTMLInputElement).value.trim();
    this.config.serviceRoleKey = (
      document.getElementById('cfg-supabase-service') as HTMLInputElement
    ).value.trim();
    this.config.adminKey = (
      document.getElementById('cfg-admin-passcode') as HTMLInputElement
    ).value.trim();

    localStorage.setItem('outlaw_supabase_url', this.config.url);
    localStorage.setItem('outlaw_supabase_anon_key', this.config.anonKey);
    localStorage.setItem('outlaw_supabase_service_role_key', this.config.serviceRoleKey);
    localStorage.setItem('outlaw_admin_passcode', this.config.adminKey);

    try {
      await fetch('/api/admin/save-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });
    } catch {
      // ignore
    }

    showToast('Настройки сохранены локально!', 'success');
    await this.connect();
  }

  public async testConnection(): Promise<void> {
    const url = (document.getElementById('cfg-supabase-url') as HTMLInputElement).value.trim();
    const key = (
      (document.getElementById('cfg-supabase-service') as HTMLInputElement).value ||
      (document.getElementById('cfg-supabase-anon') as HTMLInputElement).value
    ).trim();

    if (!url || !key) {
      showToast('Укажите URL и ключ для проверки!', 'error');
      return;
    }

    try {
      const start = performance.now();
      const testClient = createClient(url, key);
      const { error } = await testClient.from('game_balance').select('count').limit(1);
      const elapsed = Math.round(performance.now() - start);

      if (error) {
        showToast(`Подключение неудачно: ${error.message}`, 'error');
      } else {
        showToast(`✅ Связь с Supabase установлена! Пинг: ${elapsed}ms`, 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка соединения: ${msg}`, 'error');
    }
  }

  public async seedDatabase(): Promise<void> {
    if (!this.client) {
      showToast('Сначала подключитесь к Supabase!', 'error');
      return;
    }

    if (!this.config.serviceRoleKey) {
      showToast(
        '⚠️ Для инициализации БД требуется Service Role Key! Публичный Anon-ключ защищён политикой RLS только для чтения. Вставьте Service Role Key в поле ниже и нажмите «Сохранить локально».',
        'error'
      );
      const tabBtn = document.querySelector('[data-tab="connection"]') as HTMLElement;
      tabBtn?.click();
      const serviceInput = document.getElementById('cfg-supabase-service') as HTMLInputElement;
      serviceInput?.focus();
      return;
    }

    if (
      !confirm(
        'Сбросить все записи таблицы game_balance к значениям по умолчанию?'
      )
    ) {
      return;
    }

    const rows: BalanceRow[] = [];

    // 13 Weapons
    for (const [key, w] of Object.entries(DEFAULT_BALANCE.weapons)) {
      rows.push({
        id: `weapon:${key}`,
        category: 'weapon',
        key,
        name: w.name,
        description: w.notes,
        data: w,
        version: 1,
        updated_at: new Date().toISOString()
      });
    }

    // 6 Heroes
    for (const [key, h] of Object.entries(DEFAULT_BALANCE.heroes)) {
      rows.push({
        id: `hero:${key}`,
        category: 'hero',
        key,
        name: h.name,
        description: h.role,
        data: h,
        version: 1,
        updated_at: new Date().toISOString()
      });
    }

    // 8 Monsters
    for (const [key, m] of Object.entries(DEFAULT_BALANCE.monsters)) {
      rows.push({
        id: `monster:${key}`,
        category: 'monster',
        key,
        name: m.name,
        description: m.description,
        data: m,
        version: 1,
        updated_at: new Date().toISOString()
      });
    }

    // 2 Bosses
    for (const [key, b] of Object.entries(DEFAULT_BALANCE.bosses)) {
      rows.push({
        id: `boss:${key}`,
        category: 'boss',
        key,
        name: b.name,
        description: b.description,
        data: b,
        version: 1,
        updated_at: new Date().toISOString()
      });
    }

    // 7 Passives
    for (const [key, p] of Object.entries(DEFAULT_BALANCE.passives)) {
      rows.push({
        id: `passive:${key}`,
        category: 'passive',
        key,
        name: p.name,
        description: p.description,
        data: p,
        version: 1,
        updated_at: new Date().toISOString()
      });
    }

    // 21 Items
    for (const [key, item] of Object.entries(DEFAULT_BALANCE.items)) {
      rows.push({
        id: `item:${key}`,
        category: 'item',
        key,
        name: item.name,
        description: item.description,
        data: item,
        version: 1,
        updated_at: new Date().toISOString()
      });
    }

    // 30 Talents
    for (const [key, talent] of Object.entries(DEFAULT_BALANCE.talents)) {
      rows.push({
        id: `talent:${key}`,
        category: 'talent',
        key,
        name: talent.name,
        description: talent.description,
        data: talent,
        version: 1,
        updated_at: new Date().toISOString()
      });
    }

    // Global
    rows.push({
      id: 'global:combat',
      category: 'global',
      key: 'combat',
      name: 'Глобальные боевые параметры',
      description: 'Рывок, криты, радиус магнита',
      data: DEFAULT_BALANCE.global,
      version: 1,
      updated_at: new Date().toISOString()
    });

    try {
      const { error } = await this.client.from('game_balance').upsert(rows);
      if (error) {
        throw new Error(error.message);
      }

      this.state.originalBalance = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
      this.state.draftBalance = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
      this.state.modifiedPaths.clear();
      this.onDataChanged();

      showToast(
        `🌱 База данных Supabase успешно сброшена к значениям по умолчанию (${rows.length} записей)!`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('row-level security') || msg.includes('violates row-level security policy')) {
        showToast(
          '❌ Ошибка RLS: таблица защищена от неавторизованной записи. Проверьте, что в поле «Service Role Key» вставлен секретный service_role ключ (Supabase -> Settings -> API).',
          'error'
        );
      } else {
        showToast(`Ошибка инициализации БД: ${msg}`, 'error');
      }
    }
  }

  public async deploy(): Promise<void> {
    if (!this.client) {
      showToast('Supabase не подключен!', 'error');
      return;
    }

    if (!this.config.serviceRoleKey) {
      showToast(
        '⚠️ Для записи в Supabase требуется Service Role Key! Публичный Anon-ключ имеет доступ только на чтение (защита RLS). Перейдите во вкладку «Настройки БД» и вставьте Service Role Key.',
        'error'
      );
      const tabBtn = document.querySelector('[data-tab="connection"]') as HTMLElement;
      tabBtn?.click();
      const serviceInput = document.getElementById('cfg-supabase-service') as HTMLInputElement;
      serviceInput?.focus();
      return;
    }

    if (this.config.adminKey) {
      const inputPass = (document.getElementById('input-confirm-passcode') as HTMLInputElement)?.value;
      const errEl = document.getElementById('passcode-error');
      if (inputPass !== this.config.adminKey) {
        if (errEl) errEl.classList.remove('hidden');
        return;
      }
      if (errEl) errEl.classList.add('hidden');
    }

    const deployBtn = document.getElementById('btn-confirm-deploy') as HTMLButtonElement;
    if (deployBtn) {
      deployBtn.disabled = true;
      deployBtn.innerText = 'Отправка в Supabase...';
    }

    try {
      const affectedCategories = new Set<string>();
      for (const p of this.state.modifiedPaths) {
        const parts = p.split('.');
        if (parts[0] === 'global') affectedCategories.add('global:combat');
        else affectedCategories.add(`${parts[0]}:${parts[1]}`);
      }

      const rowsToUpsert: BalanceRow[] = [];

      for (const entityKey of affectedCategories) {
        const [cat, key] = entityKey.split(':');
        let dataPayload: any = {};
        let name = key;

        if (cat === 'weapons') {
          dataPayload = this.state.draftBalance.weapons[key];
          name = dataPayload.name || key;
        } else if (cat === 'heroes') {
          dataPayload = this.state.draftBalance.heroes[key];
          name = dataPayload.name || key;
        } else if (cat === 'monsters') {
          dataPayload = this.state.draftBalance.monsters[key];
          name = dataPayload.name || key;
        } else if (cat === 'bosses') {
          dataPayload = this.state.draftBalance.bosses[key];
          name = dataPayload.name || key;
        } else if (cat === 'passives') {
          dataPayload = this.state.draftBalance.passives[key];
          name = dataPayload.name || key;
        } else if (cat === 'items') {
          dataPayload = this.state.draftBalance.items[key];
          name = dataPayload.name || key;
        } else if (cat === 'talents') {
          dataPayload = this.state.draftBalance.talents[key];
          name = dataPayload.name || key;
        } else if (cat === 'global') {
          dataPayload = this.state.draftBalance.global;
          name = 'Глобальные боевые параметры';
        }

        const singularCat = toSingularCategory(cat);

        rowsToUpsert.push({
          id: `${singularCat}:${key}`,
          category: singularCat as any,
          key,
          name,
          data: dataPayload,
          version: 1,
          updated_at: new Date().toISOString()
        });
      }

      console.info('[Admin] Upserting to Supabase table "game_balance":', rowsToUpsert);
      const { error } = await this.client.from('game_balance').upsert(rowsToUpsert);

      if (error) {
        throw new Error(error.message);
      }

      this.state.originalBalance = JSON.parse(JSON.stringify(this.state.draftBalance));
      this.state.modifiedPaths.clear();
      this.onDataChanged();

      const modalReview = document.getElementById('modal-review');
      if (modalReview) modalReview.classList.add('hidden');

      showToast(
        `✅ Успешно обновлено ${rowsToUpsert.length} записей в Supabase! Игра синхронизирована.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('row-level security') || msg.includes('violates row-level security policy')) {
        showToast(
          '❌ Ошибка RLS: таблица game_balance защищена от неавторизованной записи. Для сохранения изменений требуется secret service_role ключ из Supabase (Settings -> API).',
          'error'
        );
      } else {
        showToast(`Ошибка отправки в Supabase: ${msg}`, 'error');
      }
    } finally {
      if (deployBtn) {
        deployBtn.disabled = false;
        deployBtn.innerText = '🚀 Подтвердить и отправить в Supabase';
      }
    }
  }

  // =========================================================================
  // LEADERBOARDS MANAGEMENT API
  // =========================================================================

  public async fetchLeaderboards(limit: number = 100): Promise<LeaderboardEntry[]> {
    const LOCAL_KEY = 'outlaw_local_leaderboards';
    let entries: LeaderboardEntry[] = [];

    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('leaderboards')
          .select('*')
          .order('score', { ascending: false })
          .limit(limit);

        if (!error && data) {
          entries = data.map((d: any) => ({
            id: d.id,
            playerId: d.player_id || d.user_id || d.id,
            playerName: d.player_name || d.display_name || 'Странник',
            heroId: d.hero_id || d.hero || 'ronin',
            stage: Number(d.stage ?? d.stage_reached ?? 1),
            survivalTimeSec: Number(d.survival_time_sec ?? d.survival_time ?? 0),
            kills: Number(d.kills ?? 0),
            credits: Number(d.credits ?? d.crystals_collected ?? 0),
            score: Number(d.score ?? 0),
            isVictory: Boolean(d.is_victory ?? ((d.stage ?? d.stage_reached ?? 1) >= 4)),
            createdAt: d.created_at
          }));
        } else if (error) {
          console.warn('[Admin] Failed to fetch leaderboards from Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[Admin] Failed to fetch leaderboards from Supabase:', err);
      }
    }

    // Fallback to local storage if no DB records found or offline
    if (entries.length === 0 && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          entries = JSON.parse(raw);
        }
      } catch {
        // ignore
      }
    }

    // Deduplicate by playerId keeping highest score
    const map = new Map<string, LeaderboardEntry>();
    for (const e of entries) {
      const key = e.playerId || e.playerName;
      const prev = map.get(key);
      if (!prev || e.score > prev.score) {
        map.set(key, e);
      }
    }

    this.state.leaderboardEntries = Array.from(map.values()).sort((a, b) => b.score - a.score);
    return this.state.leaderboardEntries;
  }

  public async deleteLeaderboardEntry(id?: string, playerId?: string): Promise<boolean> {
    const LOCAL_KEY = 'outlaw_local_leaderboards';
    let success = false;

    if (this.client && (id || playerId)) {
      try {
        let query = this.client.from('leaderboards').delete();
        if (id) {
          query = query.eq('id', id);
        } else if (playerId) {
          query = query.eq('player_id', playerId);
        }
        const { error } = await query;
        if (!error) {
          success = true;
        } else {
          console.warn('[Admin] Supabase delete error:', error.message);
        }
      } catch (err) {
        console.warn('[Admin] Delete leaderboard exception:', err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          let list: LeaderboardEntry[] = JSON.parse(raw);
          list = list.filter((e) => (id ? e.id !== id : true) && (playerId ? e.playerId !== playerId : true));
          localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
          success = true;
        }
      } catch {
        // ignore
      }
    }

    this.state.leaderboardEntries = this.state.leaderboardEntries.filter(
      (e) => (id ? e.id !== id : true) && (playerId ? e.playerId !== playerId : true)
    );

    return success;
  }

  public async resetAllLeaderboards(): Promise<boolean> {
    const LOCAL_KEY = 'outlaw_local_leaderboards';
    let success = false;

    if (this.client) {
      try {
        const { error } = await this.client
          .from('leaderboards')
          .delete()
          .gte('score', -1);

        if (!error) {
          success = true;
        } else {
          console.warn('[Admin] Supabase reset error:', error.message);
        }
      } catch (err) {
        console.warn('[Admin] Reset leaderboards exception:', err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_KEY);
      success = true;
    }

    this.state.leaderboardEntries = [];
    return success;
  }

  public async seedDemoLeaderboards(): Promise<boolean> {
    const LOCAL_KEY = 'outlaw_local_leaderboards';
    const demo = JSON.parse(JSON.stringify(DEFAULT_DEMO_LEADERBOARDS)) as LeaderboardEntry[];

    if (this.client) {
      try {
        const rows = demo.map((e) => ({
          player_id: e.playerId,
          player_name: e.playerName,
          hero_id: e.heroId,
          stage: e.stage,
          survival_time_sec: e.survivalTimeSec,
          kills: e.kills,
          credits: e.credits,
          score: e.score,
          is_victory: e.isVictory ?? false
        }));

        const { error } = await this.client.from('leaderboards').insert(rows);
        if (error) {
          console.warn('[Admin] Supabase seed demo warning:', error.message);
        }
      } catch (err) {
        console.warn('[Admin] Seed demo leaderboards exception:', err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(demo));
    }

    this.state.leaderboardEntries = demo;
    return true;
  }

  public async updateLeaderboardEntry(id: string, updates: Partial<LeaderboardEntry>): Promise<boolean> {
    const LOCAL_KEY = 'outlaw_local_leaderboards';
    let success = false;

    if (this.client && id) {
      try {
        const dbUpdates: any = {};
        if (updates.playerName !== undefined) dbUpdates.player_name = updates.playerName;
        if (updates.score !== undefined) dbUpdates.score = updates.score;
        if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
        if (updates.kills !== undefined) dbUpdates.kills = updates.kills;
        if (updates.heroId !== undefined) dbUpdates.hero_id = updates.heroId;
        if (updates.credits !== undefined) dbUpdates.credits = updates.credits;
        if (updates.survivalTimeSec !== undefined) dbUpdates.survival_time_sec = updates.survivalTimeSec;
        if (updates.isVictory !== undefined) dbUpdates.is_victory = updates.isVictory;

        const { error } = await this.client.from('leaderboards').update(dbUpdates).eq('id', id);
        if (!error) success = true;
      } catch (err) {
        console.warn('[Admin] Update entry error:', err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const list: LeaderboardEntry[] = JSON.parse(raw);
          const idx = list.findIndex((e) => e.id === id || (updates.playerId && e.playerId === updates.playerId));
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates };
            localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
            success = true;
          }
        }
      } catch {
        // ignore
      }
    }

    const inMemIdx = this.state.leaderboardEntries.findIndex((e) => e.id === id || (updates.playerId && e.playerId === updates.playerId));
    if (inMemIdx !== -1) {
      this.state.leaderboardEntries[inMemIdx] = { ...this.state.leaderboardEntries[inMemIdx], ...updates };
    }

    return success;
  }
}

