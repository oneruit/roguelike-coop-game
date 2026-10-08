import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { BalanceRow } from '../../../src/balance/BalanceTypes';
import { DEFAULT_BALANCE } from '../../../src/balance/defaultBalance';
import { AdminConfig } from '../types';
import { BalanceState } from '../state/balanceState';
import { showToast } from '../ui/toast';

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
        'Инициализировать / перезаписать все записи таблицы game_balance эталонными значениями из BALANCE_REFERENCE.md?'
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
        `🌱 База данных Supabase успешно инициализирована (${rows.length} записей)!`,
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
        } else if (cat === 'global') {
          dataPayload = this.state.draftBalance.global;
          name = 'Глобальные боевые параметры';
        }

        rowsToUpsert.push({
          id: `${cat.slice(0, -1)}:${key}`,
          category: cat.slice(0, -1) as any,
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
}
