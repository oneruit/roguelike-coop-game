import {
  GameBalanceState,
  WeaponBalanceConfig,
  HeroBalanceConfig,
  MonsterBalanceConfig,
  BossBalanceConfig,
  GlobalBalanceConfig,
  BalanceRow
} from '../../src/balance/BalanceTypes';
import { DEFAULT_BALANCE } from '../../src/balance/defaultBalance';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

class AdminController {
  private originalBalance: GameBalanceState = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
  private draftBalance: GameBalanceState = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
  private modifiedPaths: Set<string> = new Set();

  private supabase: SupabaseClient | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  private config = {
    url: '',
    anonKey: '',
    serviceRoleKey: '',
    adminKey: ''
  };

  private searchFilter: string = '';

  constructor() {
    this.bindDOM();
  }

  public async init(): Promise<void> {
    await this.loadConfig();
    await this.connectSupabase();
    this.renderAll();
  }

  private async loadConfig(): Promise<void> {
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

    (document.getElementById('cfg-supabase-url') as HTMLInputElement).value = this.config.url;
    (document.getElementById('cfg-supabase-anon') as HTMLInputElement).value = this.config.anonKey;
    (document.getElementById('cfg-supabase-service') as HTMLInputElement).value =
      this.config.serviceRoleKey;
    (document.getElementById('cfg-admin-passcode') as HTMLInputElement).value = this.config.adminKey;
  }

  private async connectSupabase(): Promise<void> {
    const statusEl = document.getElementById('status-connection');
    if (!statusEl) return;

    if (!this.config.url || (!this.config.serviceRoleKey && !this.config.anonKey)) {
      statusEl.className = 'status-pill status-error';
      statusEl.innerHTML = '<span class="status-dot"></span><span>Supabase не настроен</span>';
      this.showToast('Supabase не настроен. Перейдите во вкладку «Supabase & RLS».', 'info');
      return;
    }

    statusEl.className = 'status-pill status-connecting';
    statusEl.innerHTML = '<span class="status-dot"></span><span>Подключение...</span>';

    try {
      const authKey = this.config.serviceRoleKey || this.config.anonKey;
      this.supabase = createClient(this.config.url, authKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const { data, error } = await this.supabase.from('game_balance').select('*');

      if (error) {
        console.warn('[Admin] Supabase error:', error.message);
        statusEl.className = 'status-pill status-error';
        statusEl.innerHTML = `<span class="status-dot"></span><span>Ошибка: ${error.message.substring(0, 24)}...</span>`;
        this.showToast(`Ошибка таблицы: ${error.message}. Возможно таблица еще не создана.`, 'error');
        return;
      }

      statusEl.className = 'status-pill status-connected';
      statusEl.innerHTML = '<span class="status-dot"></span><span>Supabase Online</span>';

      if (data && data.length > 0) {
        for (const row of data as BalanceRow[]) {
          this.mergeRemoteRow(row);
        }
        this.draftBalance = JSON.parse(JSON.stringify(this.originalBalance));
        this.modifiedPaths.clear();
        this.updateStagedUI();
        this.showToast(`Загружено ${data.length} записей баланса из Supabase.`, 'success');
      } else {
        this.showToast('Таблица game_balance пуста. Нажмите «Инициализировать БД».', 'info');
      }

      this.setupRealtime();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      statusEl.className = 'status-pill status-error';
      statusEl.innerHTML = '<span class="status-dot"></span><span>Ошибка связи</span>';
      this.showToast(`Ошибка подключения: ${msg}`, 'error');
    }
  }

  private setupRealtime(): void {
    if (!this.supabase) return;
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = this.supabase
      .channel('admin_game_balance_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_balance' },
        (payload) => {
          console.log('[Admin Realtime] Event:', payload);
          const row = (payload.new || payload.old) as BalanceRow | undefined;
          if (row && row.category && row.key) {
            this.mergeRemoteRow(row);
            if (this.modifiedPaths.size === 0) {
              this.draftBalance = JSON.parse(JSON.stringify(this.originalBalance));
            }
            this.renderAll();
          }
        }
      )
      .subscribe();
  }

  private mergeRemoteRow(row: BalanceRow): void {
    const { category, key, data } = row;
    if (!data) return;

    if (category === 'weapon') {
      this.originalBalance.weapons[key] = {
        ...(this.originalBalance.weapons[key] || DEFAULT_BALANCE.weapons[key]),
        ...(data as unknown as WeaponBalanceConfig)
      };
    } else if (category === 'hero') {
      this.originalBalance.heroes[key] = {
        ...(this.originalBalance.heroes[key] || DEFAULT_BALANCE.heroes[key]),
        ...(data as unknown as HeroBalanceConfig)
      };
    } else if (category === 'monster') {
      this.originalBalance.monsters[key] = {
        ...(this.originalBalance.monsters[key] || DEFAULT_BALANCE.monsters[key]),
        ...(data as unknown as MonsterBalanceConfig)
      };
    } else if (category === 'boss') {
      this.originalBalance.bosses[key] = {
        ...(this.originalBalance.bosses[key] || DEFAULT_BALANCE.bosses[key]),
        ...(data as unknown as BossBalanceConfig)
      };
    } else if (category === 'global') {
      this.originalBalance.global = {
        ...this.originalBalance.global,
        ...(data as unknown as GlobalBalanceConfig)
      };
    }
  }

  private bindDOM(): void {
    // Tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.tab;
        if (!target) return;
        tabs.forEach((t) => t.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
        document.getElementById(`tab-${target}`)?.classList.add('active');
      });
    });

    // Weapon search
    const searchInput = document.getElementById('weapon-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchFilter = (e.target as HTMLInputElement).value.toLowerCase().trim();
        this.renderWeapons();
      });
    }

    // Top action buttons
    document.getElementById('btn-save')?.addEventListener('click', () => this.openReviewModal());
    document.getElementById('banner-review-btn')?.addEventListener('click', () => this.openReviewModal());
    document.getElementById('btn-discard')?.addEventListener('click', () => this.discardDraft());
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      const tabBtn = document.querySelector('[data-tab="connection"]') as HTMLElement;
      tabBtn?.click();
    });

    // Reset buttons
    document.getElementById('btn-reset-weapons-all')?.addEventListener('click', () => {
      if (confirm('Сбросить параметры всех 13 видов оружия к значениям из BALANCE_REFERENCE.md?')) {
        for (const key of Object.keys(DEFAULT_BALANCE.weapons)) {
          this.draftBalance.weapons[key] = JSON.parse(JSON.stringify(DEFAULT_BALANCE.weapons[key]));
          for (const prop of Object.keys(DEFAULT_BALANCE.weapons[key])) {
            const path = `weapons.${key}.${prop}`;
            const isOrigDiff =
              (this.draftBalance.weapons[key] as any)[prop] !==
              (this.originalBalance.weapons[key] as any)?.[prop];
            if (isOrigDiff) this.modifiedPaths.add(path);
            else this.modifiedPaths.delete(path);
          }
        }
        this.updateStagedUI();
        this.renderWeapons();
      }
    });

    document.getElementById('btn-reset-heroes-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех героев к defaults?')) {
        this.draftBalance.heroes = JSON.parse(JSON.stringify(DEFAULT_BALANCE.heroes));
        this.checkAllCategoryChanges('heroes');
        this.updateStagedUI();
        this.renderHeroes();
      }
    });

    document.getElementById('btn-reset-monsters-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех монстров к defaults?')) {
        this.draftBalance.monsters = JSON.parse(JSON.stringify(DEFAULT_BALANCE.monsters));
        this.checkAllCategoryChanges('monsters');
        this.updateStagedUI();
        this.renderMonsters();
      }
    });

    document.getElementById('btn-reset-bosses-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех боссов к defaults?')) {
        this.draftBalance.bosses = JSON.parse(JSON.stringify(DEFAULT_BALANCE.bosses));
        this.checkAllCategoryChanges('bosses');
        this.updateStagedUI();
        this.renderBosses();
      }
    });

    document.getElementById('btn-reset-global-all')?.addEventListener('click', () => {
      if (confirm('Сбросить глобальные настройки к defaults?')) {
        this.draftBalance.global = JSON.parse(JSON.stringify(DEFAULT_BALANCE.global));
        this.checkAllCategoryChanges('global');
        this.updateStagedUI();
        this.renderGlobal();
      }
    });

    // Modal events
    document.querySelectorAll('.modal-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.closeReviewModal());
    });
    document.getElementById('btn-cancel-deploy')?.addEventListener('click', () => this.closeReviewModal());
    document.getElementById('btn-confirm-deploy')?.addEventListener('click', () => this.deployToSupabase());

    // Connection Form
    const connForm = document.getElementById('connection-form');
    connForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConnectionSettings();
    });

    document.getElementById('btn-test-conn')?.addEventListener('click', () => this.testConnection());
    document.getElementById('btn-seed-db')?.addEventListener('click', () => this.seedDatabase());

    // Copy SQL button
    document.getElementById('btn-copy-sql')?.addEventListener('click', () => {
      const sql = `-- 1. Создание таблицы баланса с защитой RLS
CREATE TABLE IF NOT EXISTS game_balance (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  version INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE game_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON game_balance FOR SELECT USING (true);
CREATE POLICY "Allow service_role write" ON game_balance FOR ALL TO service_role USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE game_balance;`;
      navigator.clipboard.writeText(sql);
      this.showToast('SQL скопирован в буфер обмена!', 'success');
    });
  }

  private checkAllCategoryChanges(category: keyof GameBalanceState): void {
    if (category === 'global') {
      for (const prop of Object.keys(this.draftBalance.global)) {
        const path = `global.${prop}`;
        if ((this.draftBalance.global as any)[prop] !== (this.originalBalance.global as any)[prop]) {
          this.modifiedPaths.add(path);
        } else {
          this.modifiedPaths.delete(path);
        }
      }
      return;
    }

    const dict = this.draftBalance[category] as Record<string, any>;
    const origDict = this.originalBalance[category] as Record<string, any>;

    for (const key of Object.keys(dict)) {
      for (const prop of Object.keys(dict[key])) {
        const path = `${category}.${key}.${prop}`;
        if (dict[key][prop] !== origDict[key]?.[prop]) {
          this.modifiedPaths.add(path);
        } else {
          this.modifiedPaths.delete(path);
        }
      }
    }
  }

  private renderAll(): void {
    this.renderWeapons();
    this.renderHeroes();
    this.renderMonsters();
    this.renderBosses();
    this.renderGlobal();
  }

  private renderWeapons(): void {
    const container = document.getElementById('weapons-grid');
    if (!container) return;
    container.innerHTML = '';

    const weapons = Object.values(this.draftBalance.weapons);
    for (const w of weapons) {
      if (
        this.searchFilter &&
        !w.name.toLowerCase().includes(this.searchFilter) &&
        !w.id.toLowerCase().includes(this.searchFilter)
      ) {
        continue;
      }

      const isFireball = w.id === 'fireball';
      const isCardModified = Array.from(this.modifiedPaths).some((p) =>
        p.startsWith(`weapons.${w.id}.`)
      );

      const card = document.createElement('div');
      card.className = `card ${isFireball ? 'highlight-fireball' : ''} ${isCardModified ? 'is-modified' : ''}`;

      const baseDps = w.cooldown > 0 ? (w.damage / w.cooldown).toFixed(1) : (w.damage * 60).toFixed(1);
      const l20Dmg = w.damage + 19 * w.damagePerLevel;
      const l20Dps = w.cooldown > 0 ? (l20Dmg / w.cooldown).toFixed(1) : (l20Dmg * 60).toFixed(1);

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon">${w.icon}</span>
            <div>
              <div class="card-title">${w.name}</div>
              <div class="card-tag">ID: ${w.id}</div>
            </div>
          </div>
          ${isCardModified ? '<span class="card-badge badge-modified">Изменено</span>' : ''}
        </div>
        <div class="card-desc">${w.notes || 'Боевое оружие героя'}</div>

        <div class="stat-fields-list">
          ${this.renderStatControl('weapons', w.id, 'damage', 'Базовый урон (Damage)', w.damage, 1, 300, 1)}
          ${this.renderStatControl('weapons', w.id, 'cooldown', 'Кулдаун (сек)', w.cooldown, 0.05, 5.0, 0.05)}
          ${this.renderStatControl('weapons', w.id, 'damagePerLevel', 'Прирост за уровень', w.damagePerLevel, 1, 50, 1)}
          ${w.range !== undefined ? this.renderStatControl('weapons', w.id, 'range', 'Дальность атаки (м)', w.range, 5, 50, 1) : ''}
          ${w.explosionRadius !== undefined ? this.renderStatControl('weapons', w.id, 'explosionRadius', 'Радиус взрыва (м)', w.explosionRadius, 1, 10, 0.1) : ''}
          ${w.fallSpeed !== undefined ? this.renderStatControl('weapons', w.id, 'fallSpeed', 'Скорость падения (м/с)', w.fallSpeed, 5, 60, 1) : ''}
        </div>

        <div class="dps-preview-box">
          <div class="dps-metric">
            <span class="dps-label">Base DPS (L1)</span>
            <span class="dps-value" id="dps-${w.id}-base">${baseDps}</span>
          </div>
          <div class="dps-metric">
            <span class="dps-label">Level 20 DPS</span>
            <span class="dps-value" id="dps-${w.id}-l20">${l20Dps}</span>
          </div>
        </div>

        <div class="card-footer">
          <button class="btn btn-xs btn-secondary btn-reset-weapon" data-id="${w.id}" title="Сбросить к BALANCE_REFERENCE.md">
            Сбросить оружие
          </button>
        </div>
      `;

      // Reset single weapon listener
      card.querySelector('.btn-reset-weapon')?.addEventListener('click', (e) => {
        const wid = (e.currentTarget as HTMLElement).dataset.id!;
        this.resetSingleItem('weapons', wid);
      });

      container.appendChild(card);
    }

    this.attachInputListeners(container);
  }

  private renderHeroes(): void {
    const container = document.getElementById('heroes-grid');
    if (!container) return;
    container.innerHTML = '';

    const heroes = Object.values(this.draftBalance.heroes);
    for (const h of heroes) {
      const isCardModified = Array.from(this.modifiedPaths).some((p) =>
        p.startsWith(`heroes.${h.id}.`)
      );

      const card = document.createElement('div');
      card.className = `card ${isCardModified ? 'is-modified' : ''}`;
      card.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon">🤠</span>
            <div>
              <div class="card-title">${h.name}</div>
              <div class="card-tag">ID: ${h.id} | Оружие: ${h.startingWeapon}</div>
            </div>
          </div>
          ${isCardModified ? '<span class="card-badge badge-modified">Изменено</span>' : ''}
        </div>
        <div class="card-desc">${h.role || ''}</div>

        <div class="stat-fields-list">
          ${this.renderStatControl('heroes', h.id, 'maxHp', 'Базовое здоровье (HP)', h.maxHp, 50, 300, 5)}
          ${this.renderStatControl('heroes', h.id, 'baseSpeed', 'Скорость бега (м/с)', h.baseSpeed, 4.0, 15.0, 0.1)}
          ${this.renderStatControl('heroes', h.id, 'damageMultiplier', 'Множитель урона', h.damageMultiplier, 0.5, 3.0, 0.05)}
        </div>

        <div class="card-footer">
          <button class="btn btn-xs btn-secondary btn-reset-hero" data-id="${h.id}">Сбросить к default</button>
        </div>
      `;

      card.querySelector('.btn-reset-hero')?.addEventListener('click', (e) => {
        const hid = (e.currentTarget as HTMLElement).dataset.id!;
        this.resetSingleItem('heroes', hid);
      });

      container.appendChild(card);
    }

    this.attachInputListeners(container);
  }

  private renderMonsters(): void {
    const container = document.getElementById('monsters-grid');
    if (!container) return;
    container.innerHTML = '';

    const monsters = Object.values(this.draftBalance.monsters);
    for (const m of monsters) {
      const isCardModified = Array.from(this.modifiedPaths).some((p) =>
        p.startsWith(`monsters.${m.id}.`)
      );

      const card = document.createElement('div');
      card.className = `card ${isCardModified ? 'is-modified' : ''}`;
      card.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon">👹</span>
            <div>
              <div class="card-title">${m.name}</div>
              <div class="card-tag">ID: ${m.id} | Дроп: ${m.gemType || 'blue'} gem</div>
            </div>
          </div>
          ${isCardModified ? '<span class="card-badge badge-modified">Изменено</span>' : ''}
        </div>
        <div class="card-desc">${m.description || ''}</div>

        <div class="stat-fields-list">
          ${this.renderStatControl('monsters', m.id, 'hp', 'Здоровье (HP 0-мин)', m.hp, 10, 2000, 2)}
          ${this.renderStatControl('monsters', m.id, 'speed', 'Скорость (м/с)', m.speed, 1.0, 10.0, 0.1)}
          ${this.renderStatControl('monsters', m.id, 'damage', 'Урон за удар', m.damage, 1, 100, 1)}
        </div>

        <div class="card-footer">
          <button class="btn btn-xs btn-secondary btn-reset-monster" data-id="${m.id}">Сбросить к default</button>
        </div>
      `;

      card.querySelector('.btn-reset-monster')?.addEventListener('click', (e) => {
        const mid = (e.currentTarget as HTMLElement).dataset.id!;
        this.resetSingleItem('monsters', mid);
      });

      container.appendChild(card);
    }

    this.attachInputListeners(container);
  }

  private renderBosses(): void {
    const container = document.getElementById('bosses-grid');
    if (!container) return;
    container.innerHTML = '';

    const bosses = Object.values(this.draftBalance.bosses);
    for (const b of bosses) {
      const isCardModified = Array.from(this.modifiedPaths).some((p) =>
        p.startsWith(`bosses.${b.id}.`)
      );

      const card = document.createElement('div');
      card.className = `card ${isCardModified ? 'is-modified' : ''}`;
      card.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon">👑</span>
            <div>
              <div class="card-title">${b.name}</div>
              <div class="card-tag">ID: ${b.id}</div>
            </div>
          </div>
          ${isCardModified ? '<span class="card-badge badge-modified">Изменено</span>' : ''}
        </div>
        <div class="card-desc">${b.description || ''}</div>

        <div class="stat-fields-list">
          ${this.renderStatControl('bosses', b.id, 'hp', 'Базовое здоровье босса', b.hp, 1000, 100000, 200)}
          ${this.renderStatControl('bosses', b.id, 'speed', 'Скорость (м/с)', b.speed, 1.0, 8.0, 0.1)}
          ${this.renderStatControl('bosses', b.id, 'damage', 'Урон за удар', b.damage, 10, 300, 5)}
        </div>

        <div class="card-footer">
          <button class="btn btn-xs btn-secondary btn-reset-boss" data-id="${b.id}">Сбросить к default</button>
        </div>
      `;

      card.querySelector('.btn-reset-boss')?.addEventListener('click', (e) => {
        const bid = (e.currentTarget as HTMLElement).dataset.id!;
        this.resetSingleItem('bosses', bid);
      });

      container.appendChild(card);
    }

    this.attachInputListeners(container);
  }

  private renderGlobal(): void {
    const container = document.getElementById('global-form-container');
    if (!container) return;

    const g = this.draftBalance.global;

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
        <div>
          <h4 style="margin-bottom: 12px; color: var(--accent-gold);">Тактический рывок (Dash)</h4>
          ${this.renderStatControl('global', '', 'dashCooldown', 'Кулдаун рывка (сек)', g.dashCooldown, 0.5, 6.0, 0.1)}
          ${this.renderStatControl('global', '', 'dashDuration', 'Длительность рывка (сек)', g.dashDuration, 0.1, 1.0, 0.02)}
        </div>

        <div>
          <h4 style="margin-bottom: 12px; color: var(--accent-gold);">Критический урон</h4>
          ${this.renderStatControl('global', '', 'baseCritChance', 'Базовый шанс крита', g.baseCritChance, 0.0, 1.0, 0.01)}
          ${this.renderStatControl('global', '', 'baseCritDamageMult', 'Множитель крит. урона', g.baseCritDamageMult, 1.2, 5.0, 0.1)}
        </div>

        <div>
          <h4 style="margin-bottom: 12px; color: var(--accent-gold);">Подбор и броня</h4>
          ${this.renderStatControl('global', '', 'basePickupRadius', 'Радиус сбора (м)', g.basePickupRadius, 1.0, 25.0, 0.5)}
          ${this.renderStatControl('global', '', 'maxArmorReduction', 'Макс. снижение урона (Cap)', g.maxArmorReduction, 0.3, 0.95, 0.05)}
        </div>
      </div>
    `;

    this.attachInputListeners(container);
  }

  private renderStatControl(
    category: string,
    id: string,
    field: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number
  ): string {
    const path = id ? `${category}.${id}.${field}` : `${category}.${field}`;
    const origVal = this.getOriginalValue(path);
    const isChanged = origVal !== undefined && origVal !== value;

    return `
      <div class="stat-field">
        <div class="stat-field-header">
          <span class="stat-label">${label}</span>
          <div class="stat-val-wrapper">
            ${isChanged ? `<span class="stat-val-badge" style="text-decoration:line-through; opacity:0.6;">${origVal}</span>` : ''}
            <span class="stat-val-badge ${isChanged ? 'val-changed' : ''}">${value}</span>
          </div>
        </div>
        <div class="stat-controls">
          <input type="range" class="stat-slider" data-path="${path}" min="${min}" max="${max}" step="${step}" value="${value}">
          <input type="number" class="stat-input ${isChanged ? 'is-changed' : ''}" data-path="${path}" min="${min}" max="${max}" step="${step}" value="${value}">
        </div>
      </div>
    `;
  }

  private getOriginalValue(path: string): number | undefined {
    const parts = path.split('.');
    let cur: any = this.originalBalance;
    for (const p of parts) {
      if (cur === undefined) return undefined;
      cur = cur[p];
    }
    return typeof cur === 'number' ? cur : undefined;
  }

  private attachInputListeners(container: HTMLElement): void {
    const inputs = container.querySelectorAll<HTMLInputElement>('.stat-slider, .stat-input');
    inputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const el = e.currentTarget as HTMLInputElement;
        const path = el.dataset.path!;
        const val = parseFloat(el.value);
        if (isNaN(val)) return;

        this.applyFieldChange(path, val);
      });
    });
  }

  private applyFieldChange(path: string, value: number): void {
    const parts = path.split('.');
    let target: any = this.draftBalance;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    target[lastKey] = value;

    const origVal = this.getOriginalValue(path);
    if (origVal !== undefined && origVal !== value) {
      this.modifiedPaths.add(path);
    } else {
      this.modifiedPaths.delete(path);
    }

    // Synchronize slider and input pairs
    const allMatching = document.querySelectorAll<HTMLInputElement>(`[data-path="${path}"]`);
    allMatching.forEach((el) => {
      if (el.value !== String(value)) {
        el.value = String(value);
      }
      if (el.classList.contains('stat-input')) {
        el.classList.toggle('is-changed', origVal !== value);
      }
    });

    // Update weapon DPS if weapon
    if (parts[0] === 'weapons') {
      const wid = parts[1];
      const weapon = this.draftBalance.weapons[wid];
      if (weapon) {
        const baseDps = weapon.cooldown > 0 ? (weapon.damage / weapon.cooldown).toFixed(1) : (weapon.damage * 60).toFixed(1);
        const l20Dmg = weapon.damage + 19 * weapon.damagePerLevel;
        const l20Dps = weapon.cooldown > 0 ? (l20Dmg / weapon.cooldown).toFixed(1) : (l20Dmg * 60).toFixed(1);

        const elBase = document.getElementById(`dps-${wid}-base`);
        const elL20 = document.getElementById(`dps-${wid}-l20`);
        if (elBase) elBase.innerText = baseDps;
        if (elL20) elL20.innerText = l20Dps;
      }
    }

    this.updateStagedUI();
  }

  private updateStagedUI(): void {
    const count = this.modifiedPaths.size;
    const badge = document.getElementById('staged-badge');
    const saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
    const discardBtn = document.getElementById('btn-discard') as HTMLButtonElement;
    const banner = document.getElementById('staged-alert-banner');
    const bannerCountText = document.getElementById('staged-count-text');

    if (badge) badge.innerText = String(count);
    if (saveBtn) saveBtn.disabled = count === 0;
    if (discardBtn) discardBtn.disabled = count === 0;

    if (banner && bannerCountText) {
      bannerCountText.innerText = String(count);
      banner.classList.toggle('hidden', count === 0);
    }
  }

  private resetSingleItem(category: keyof GameBalanceState, id: string): void {
    const defaultItem = (DEFAULT_BALANCE[category] as any)[id];
    if (!defaultItem) return;

    (this.draftBalance[category] as any)[id] = JSON.parse(JSON.stringify(defaultItem));
    for (const prop of Object.keys(defaultItem)) {
      const path = `${category}.${id}.${prop}`;
      const origVal = this.getOriginalValue(path);
      if (defaultItem[prop] !== origVal) {
        this.modifiedPaths.add(path);
      } else {
        this.modifiedPaths.delete(path);
      }
    }

    this.updateStagedUI();
    if (category === 'weapons') this.renderWeapons();
    else if (category === 'heroes') this.renderHeroes();
    else if (category === 'monsters') this.renderMonsters();
    else if (category === 'bosses') this.renderBosses();
  }

  private discardDraft(): void {
    if (confirm('Сбросить все несохраненные изменения черновика?')) {
      this.draftBalance = JSON.parse(JSON.stringify(this.originalBalance));
      this.modifiedPaths.clear();
      this.updateStagedUI();
      this.renderAll();
      this.showToast('Черновик успешно сброшен.', 'info');
    }
  }

  private openReviewModal(): void {
    const modal = document.getElementById('modal-review');
    const tbody = document.getElementById('diff-table-body');
    const challenge = document.getElementById('admin-passcode-challenge');
    if (!modal || !tbody) return;

    tbody.innerHTML = '';

    const paths = Array.from(this.modifiedPaths);
    for (const p of paths) {
      const parts = p.split('.');
      const cat = parts[0];
      const key = parts.length === 3 ? parts[1] : '';
      const field = parts.length === 3 ? parts[2] : parts[1];

      let name = key;
      if (cat === 'weapons') name = this.draftBalance.weapons[key]?.name || key;
      else if (cat === 'heroes') name = this.draftBalance.heroes[key]?.name || key;
      else if (cat === 'monsters') name = this.draftBalance.monsters[key]?.name || key;
      else if (cat === 'bosses') name = this.draftBalance.bosses[key]?.name || key;
      else if (cat === 'global') name = 'Глобальные';

      const oldVal = this.getOriginalValue(p) ?? 0;
      let newVal = 0;
      if (parts.length === 3) newVal = (this.draftBalance as any)[cat][key][field];
      else newVal = (this.draftBalance as any)[cat][field];

      const diff = newVal - oldVal;
      const pct = oldVal !== 0 ? (((newVal - oldVal) / oldVal) * 100).toFixed(1) : '+100';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${name}</strong></td>
        <td><code>${field}</code></td>
        <td class="diff-row-old">${oldVal}</td>
        <td class="diff-row-new">${newVal}</td>
        <td>
          <span class="${diff >= 0 ? 'diff-tag-up' : 'diff-tag-down'}">
            ${diff > 0 ? '+' : ''}${diff.toFixed(2)} (${diff > 0 ? '+' : ''}${pct}%)
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    }

    if (challenge) {
      if (this.config.adminKey) {
        challenge.classList.remove('hidden');
        (document.getElementById('input-confirm-passcode') as HTMLInputElement).value = '';
      } else {
        challenge.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
  }

  private closeReviewModal(): void {
    document.getElementById('modal-review')?.classList.add('hidden');
  }

  private async deployToSupabase(): Promise<void> {
    if (!this.supabase) {
      this.showToast('Supabase не подключен!', 'error');
      return;
    }

    // Validate admin passcode challenge if required
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
      // Collect rows to update
      const affectedCategories = new Set<string>();
      for (const p of this.modifiedPaths) {
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
          dataPayload = this.draftBalance.weapons[key];
          name = dataPayload.name || key;
        } else if (cat === 'heroes') {
          dataPayload = this.draftBalance.heroes[key];
          name = dataPayload.name || key;
        } else if (cat === 'monsters') {
          dataPayload = this.draftBalance.monsters[key];
          name = dataPayload.name || key;
        } else if (cat === 'bosses') {
          dataPayload = this.draftBalance.bosses[key];
          name = dataPayload.name || key;
        } else if (cat === 'global') {
          dataPayload = this.draftBalance.global;
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
      const { error } = await this.supabase.from('game_balance').upsert(rowsToUpsert);

      if (error) {
        throw new Error(error.message);
      }

      this.originalBalance = JSON.parse(JSON.stringify(this.draftBalance));
      this.modifiedPaths.clear();
      this.updateStagedUI();
      this.closeReviewModal();
      this.renderAll();

      this.showToast(
        `✅ Успешно обновлено ${rowsToUpsert.length} записей в Supabase! Игра синхронизирована.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showToast(`Ошибка отправки в Supabase: ${msg}`, 'error');
    } finally {
      if (deployBtn) {
        deployBtn.disabled = false;
        deployBtn.innerText = '🚀 Подтвердить и отправить в Supabase';
      }
    }
  }

  private async saveConnectionSettings(): Promise<void> {
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

    // Save to local .env.local via Vite dev server middleware
    try {
      await fetch('/api/admin/save-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });
    } catch {
      // ignore if offline
    }

    this.showToast('Настройки сохранены локально!', 'success');
    await this.connectSupabase();
  }

  private async testConnection(): Promise<void> {
    const url = (document.getElementById('cfg-supabase-url') as HTMLInputElement).value.trim();
    const key = (
      (document.getElementById('cfg-supabase-service') as HTMLInputElement).value ||
      (document.getElementById('cfg-supabase-anon') as HTMLInputElement).value
    ).trim();

    if (!url || !key) {
      this.showToast('Укажите URL и ключ для проверки!', 'error');
      return;
    }

    try {
      const start = performance.now();
      const testClient = createClient(url, key);
      const { error } = await testClient.from('game_balance').select('count').limit(1);
      const elapsed = Math.round(performance.now() - start);

      if (error) {
        this.showToast(`Подключение неудачно: ${error.message}`, 'error');
      } else {
        this.showToast(`✅ Связь с Supabase установлена! Пинг: ${elapsed}ms`, 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showToast(`Ошибка соединения: ${msg}`, 'error');
    }
  }

  private async seedDatabase(): Promise<void> {
    if (!this.supabase) {
      this.showToast('Сначала подключитесь к Supabase!', 'error');
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
      const { error } = await this.supabase.from('game_balance').upsert(rows);
      if (error) {
        throw new Error(error.message);
      }

      this.originalBalance = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
      this.draftBalance = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
      this.modifiedPaths.clear();
      this.updateStagedUI();
      this.renderAll();

      this.showToast(
        `🌱 База данных Supabase успешно инициализирована (${rows.length} записей)!`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showToast(`Ошибка инициализации БД: ${msg}`, 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Start Admin Controller on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const admin = new AdminController();
  admin.init().catch(console.error);
});
