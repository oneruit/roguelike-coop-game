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

const TEXTURE_MAP: Record<string, string> = {
  // Weapons
  'weapon-fireball': '/textures/weapon_fireball.png',
  'weapon-bow': '/textures/weapon_bow.png',
  'weapon-kukri': '/textures/weapon_kukri.png',
  'weapon-orbiting_barrier': '/textures/weapon_reaper_scythe.png',
  'weapon-holy_aura': '/textures/weapon_holy_aura.png',
  'weapon-katana_slash': '/textures/weapon_katana_slash.png',
  'weapon-whirlwind_slash': '/textures/weapon_whirlwind_slash.png',
  'weapon-greatsword': '/textures/weapon_greatsword.png',
  'weapon-flail': '/textures/weapon_flail.png',
  'weapon-astral_staff': '/textures/weapon_astral_staff.png',
  'weapon-chakram': '/textures/weapon_chakram.png',
  'weapon-lightning_strike': '/textures/weapon_lightning_strike.png',
  'weapon-ice_spike': '/textures/weapon_ice_spike.png',

  // Heroes
  'hero-ronin': '/textures/hero_ronin_front.png',
  'hero-valkyrie': '/textures/hero_valkyrie_front.png',
  'hero-flail': '/textures/hero_flail_front.png',
  'hero-sorceress': '/textures/hero_sorceress_front.png',
  'hero-chakram': '/textures/hero_chakram_front.png',
  'hero-archer': '/textures/hero_archer_front.png',

  // Monsters
  'monster-coyote': '/textures/monster_coyote_front.png',
  'monster-crawler': '/textures/monster_crawler_front.png',
  'monster-scorpion': '/textures/monster_scorpion_front.png',
  'monster-skeleton': '/textures/monster_skeleton_front.png',
  'monster-ghost': '/textures/monster_ghost_front.png',
  'monster-cactus': '/textures/monster_cactus_front.png',
  'monster-brute': '/textures/monster_brute_front.png',
  'monster-bison': '/textures/monster_bison_front.png',

  // Bosses
  'boss-demon': '/textures/boss_demon_front.png',
  'boss-hydra': '/textures/boss_hydra_front.png',
  'boss-sheriff': '/textures/boss_sheriff_front.png'
};

function getEntityTexture(category: string, id: string): string {
  const singular = category.replace(/s$/, '');
  const key = `${singular}-${id}`;
  return TEXTURE_MAP[key] || '/textures/bullet_revolver.png';
}

class AdminController {
  private originalBalance: GameBalanceState = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
  private draftBalance: GameBalanceState = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
  private modifiedPaths: Set<string> = new Set();
  private expandedRows: Set<string> = new Set(['weapons-fireball']); // Default: fireball expanded for quick editing

  private supabase: SupabaseClient | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  private config = {
    url: '',
    anonKey: '',
    serviceRoleKey: '',
    adminKey: ''
  };

  private searchFilter: string = '';
  private activeTab: string = 'weapons';

  constructor() {
    this.bindDOM();
  }

  public async init(): Promise<void> {
    await this.loadConfig();
    await this.connectSupabase();
    this.renderAll();
    this.updateOverviewStats();
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
    const sidebarBadge = document.getElementById('sidebar-db-status-badge');
    if (!statusEl) return;

    if (!this.config.url || (!this.config.serviceRoleKey && !this.config.anonKey)) {
      statusEl.className = 'status-pill status-error';
      statusEl.innerHTML = '<span class="status-dot"></span><span>Supabase не настроен</span>';
      if (sidebarBadge) {
        sidebarBadge.className = 'tab-pill';
        sidebarBadge.innerText = 'OFFLINE';
      }
      this.showToast('Supabase не настроен. Перейдите во вкладку «Настройки БД».', 'info');
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
        statusEl.innerHTML = `<span class="status-dot"></span><span>Ошибка: ${error.message.substring(0, 20)}...</span>`;
        if (sidebarBadge) {
          sidebarBadge.className = 'tab-pill';
          sidebarBadge.innerText = 'ERR';
        }
        this.showToast(`Ошибка таблицы: ${error.message}. Возможно таблица еще не создана.`, 'error');
        return;
      }

      statusEl.className = 'status-pill status-connected';
      statusEl.innerHTML = '<span class="status-dot"></span><span>Supabase Online</span>';
      if (sidebarBadge) {
        sidebarBadge.className = 'tab-pill pill-success';
        sidebarBadge.innerText = 'LIVE';
      }

      if (data && data.length > 0) {
        for (const row of data as BalanceRow[]) {
          this.mergeRemoteRow(row);
        }
        this.draftBalance = JSON.parse(JSON.stringify(this.originalBalance));
        this.modifiedPaths.clear();
        this.updateStagedUI();
        this.updateOverviewStats();
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
            this.updateOverviewStats();
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
    // Navigation Tabs in Sidebar
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.tab;
        if (!target) return;
        this.activeTab = target;
        tabs.forEach((t) => t.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
        document.getElementById(`tab-${target}`)?.classList.add('active');
      });
    });

    // Global Search Bar in Topbar
    const searchInput = document.getElementById('global-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchFilter = (e.target as HTMLInputElement).value.toLowerCase().trim();
        this.applyFilter();
      });
    }

    // Keyboard shortcut: Ctrl+K or / focuses search
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput?.focus();
        searchInput?.select();
      }
    });

    // Expand All / Collapse All buttons
    document.getElementById('btn-expand-all')?.addEventListener('click', () => {
      this.expandAllCurrentTab();
    });
    document.getElementById('btn-collapse-all')?.addEventListener('click', () => {
      this.collapseAllCurrentTab();
    });

    // Top action buttons
    document.getElementById('btn-save')?.addEventListener('click', () => this.openReviewModal());
    document.getElementById('banner-review-btn')?.addEventListener('click', () => this.openReviewModal());
    document.getElementById('btn-discard')?.addEventListener('click', () => this.discardDraft());

    // Help link jumps to connection tab
    document.getElementById('btn-help-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      const tabBtn = document.querySelector('[data-tab="connection"]') as HTMLElement;
      tabBtn?.click();
    });

    // Reset All buttons
    document.getElementById('btn-reset-weapons-all')?.addEventListener('click', () => {
      if (confirm('Сбросить параметры всех 13 видов оружия к значениям из BALANCE_REFERENCE.md?')) {
        for (const key of Object.keys(DEFAULT_BALANCE.weapons)) {
          this.draftBalance.weapons[key] = JSON.parse(JSON.stringify(DEFAULT_BALANCE.weapons[key]));
          for (const prop of Object.keys(DEFAULT_BALANCE.weapons[key])) {
            if (typeof (DEFAULT_BALANCE.weapons[key] as any)[prop] !== 'number') continue;
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
        this.updateOverviewStats();
      }
    });

    document.getElementById('btn-reset-heroes-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех героев к defaults?')) {
        this.draftBalance.heroes = JSON.parse(JSON.stringify(DEFAULT_BALANCE.heroes));
        this.checkAllCategoryChanges('heroes');
        this.updateStagedUI();
        this.renderHeroes();
        this.updateOverviewStats();
      }
    });

    document.getElementById('btn-reset-monsters-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех монстров к defaults?')) {
        this.draftBalance.monsters = JSON.parse(JSON.stringify(DEFAULT_BALANCE.monsters));
        this.checkAllCategoryChanges('monsters');
        this.updateStagedUI();
        this.renderMonsters();
        this.updateOverviewStats();
      }
    });

    document.getElementById('btn-reset-bosses-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех боссов к defaults?')) {
        this.draftBalance.bosses = JSON.parse(JSON.stringify(DEFAULT_BALANCE.bosses));
        this.checkAllCategoryChanges('bosses');
        this.updateStagedUI();
        this.renderBosses();
        this.updateOverviewStats();
      }
    });

    document.getElementById('btn-reset-global-all')?.addEventListener('click', () => {
      if (confirm('Сбросить глобальные настройки к defaults?')) {
        this.draftBalance.global = JSON.parse(JSON.stringify(DEFAULT_BALANCE.global));
        this.checkAllCategoryChanges('global');
        this.updateStagedUI();
        this.renderGlobal();
        this.updateOverviewStats();
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

  private applyFilter(): void {
    if (this.activeTab === 'weapons') this.renderWeapons();
    else if (this.activeTab === 'heroes') this.renderHeroes();
    else if (this.activeTab === 'monsters') this.renderMonsters();
    else if (this.activeTab === 'bosses') this.renderBosses();
  }

  private expandAllCurrentTab(): void {
    if (this.activeTab === 'weapons') {
      Object.keys(this.draftBalance.weapons).forEach((k) => this.expandedRows.add(`weapons-${k}`));
      this.renderWeapons();
    } else if (this.activeTab === 'heroes') {
      Object.keys(this.draftBalance.heroes).forEach((k) => this.expandedRows.add(`heroes-${k}`));
      this.renderHeroes();
    } else if (this.activeTab === 'monsters') {
      Object.keys(this.draftBalance.monsters).forEach((k) => this.expandedRows.add(`monsters-${k}`));
      this.renderMonsters();
    } else if (this.activeTab === 'bosses') {
      Object.keys(this.draftBalance.bosses).forEach((k) => this.expandedRows.add(`bosses-${k}`));
      this.renderBosses();
    }
  }

  private collapseAllCurrentTab(): void {
    if (this.activeTab === 'weapons') {
      Object.keys(this.draftBalance.weapons).forEach((k) => this.expandedRows.delete(`weapons-${k}`));
      this.renderWeapons();
    } else if (this.activeTab === 'heroes') {
      Object.keys(this.draftBalance.heroes).forEach((k) => this.expandedRows.delete(`heroes-${k}`));
      this.renderHeroes();
    } else if (this.activeTab === 'monsters') {
      Object.keys(this.draftBalance.monsters).forEach((k) => this.expandedRows.delete(`monsters-${k}`));
      this.renderMonsters();
    } else if (this.activeTab === 'bosses') {
      Object.keys(this.draftBalance.bosses).forEach((k) => this.expandedRows.delete(`bosses-${k}`));
      this.renderBosses();
    }
  }

  private toggleRow(rowId: string, itemElement: HTMLElement): void {
    if (this.expandedRows.has(rowId)) {
      this.expandedRows.delete(rowId);
      itemElement.classList.remove('is-expanded');
      const toggleBtn = itemElement.querySelector('.btn-toggle-row');
      if (toggleBtn) toggleBtn.textContent = 'Развернуть';
    } else {
      this.expandedRows.add(rowId);
      itemElement.classList.add('is-expanded');
      const toggleBtn = itemElement.querySelector('.btn-toggle-row');
      if (toggleBtn) toggleBtn.textContent = 'Свернуть';
    }
  }

  private checkAllCategoryChanges(category: keyof GameBalanceState): void {
    if (category === 'global') {
      for (const prop of Object.keys(this.draftBalance.global)) {
        if (typeof (this.draftBalance.global as any)[prop] !== 'number') continue;
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
        // Crucial fix: Only compare numeric balance parameters, never strings like 'id', 'name', 'icon'
        if (typeof dict[key][prop] !== 'number') continue;
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

  // =========================================================================
  // TAB 1: WEAPONS (Accordion with Real Textures)
  // =========================================================================
  private renderWeapons(): void {
    const container = document.getElementById('weapons-list') || document.getElementById('weapons-grid');
    if (!container) return;
    container.innerHTML = '';

    const weapons = Object.values(this.draftBalance.weapons);
    for (const w of weapons) {
      if (
        this.searchFilter &&
        !w.name.toLowerCase().includes(this.searchFilter) &&
        !w.id.toLowerCase().includes(this.searchFilter) &&
        !(w.notes || '').toLowerCase().includes(this.searchFilter)
      ) {
        continue;
      }

      const rowId = `weapons-${w.id}`;
      const isExpanded = this.expandedRows.has(rowId);
      const isModified = Array.from(this.modifiedPaths).some((p) => p.startsWith(`weapons.${w.id}.`));

      const baseDps = w.cooldown > 0 ? (w.damage / w.cooldown).toFixed(1) : (w.damage * 60).toFixed(1);
      const l20Dmg = w.damage + 19 * w.damagePerLevel;
      const l20Dps = w.cooldown > 0 ? (l20Dmg / w.cooldown).toFixed(1) : (l20Dmg * 60).toFixed(1);
      const textureUrl = getEntityTexture('weapons', w.id);

      const rowItem = document.createElement('div');
      rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
      rowItem.dataset.rowId = rowId;

      rowItem.innerHTML = `
        <div class="accordion-row-header weapons-table-cols">
          <div class="accordion-col-expand">
            <span class="chevron-arrow">›</span>
          </div>
          <div class="accordion-col-main">
            <img src="${textureUrl}" class="item-texture" alt="${w.name}" onerror="this.src='/textures/bullet_revolver.png'">
            <div class="item-identity">
              <span class="item-title">${w.name}</span>
              <span class="item-id-badge">${w.id}</span>
            </div>
          </div>
          <div class="accordion-col-stat" id="row-stat-damage-${w.id}">
            <span>${w.damage}</span>
          </div>
          <div class="accordion-col-stat" id="row-stat-cooldown-${w.id}">
            <span>${w.cooldown}с</span>
          </div>
          <div class="accordion-col-stat">
            <span class="stat-highlight" id="row-stat-dps1-${w.id}">${baseDps}</span>
          </div>
          <div class="accordion-col-stat">
            <span class="stat-highlight-gold" id="row-stat-dps20-${w.id}">${l20Dps}</span>
          </div>
          <div class="accordion-col-status">
            ${
              isModified
                ? '<span class="status-badge-chip badge-modified">Изменено</span>'
                : '<span class="status-badge-chip badge-default">Дефолт</span>'
            }
          </div>
          <div class="accordion-col-actions">
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${w.id}" title="Сбросить к исходным параметрам">↩</button>
            <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
          </div>
        </div>

        <div class="accordion-row-body">
          <div class="drawer-content">
            <div class="drawer-header-info">
              <div class="drawer-desc">${w.notes || 'Боевое оружие персонажа.'}</div>
              <div class="drawer-scaling-badge">L20: ${w.damage} + 19×${w.damagePerLevel} = ${l20Dmg} dmg</div>
            </div>

            <div class="drawer-controls-grid">
              ${this.renderStatControl('weapons', w.id, 'damage', 'Базовый урон (Damage)', w.damage, 1, 300, 1)}
              ${this.renderStatControl('weapons', w.id, 'cooldown', 'Кулдаун атаки (сек)', w.cooldown, 0.05, 5.0, 0.05)}
              ${this.renderStatControl('weapons', w.id, 'damagePerLevel', 'Прирост за уровень', w.damagePerLevel, 1, 50, 1)}
              ${w.range !== undefined ? this.renderStatControl('weapons', w.id, 'range', 'Дальность атаки (м)', w.range, 5, 50, 1) : ''}
              ${w.explosionRadius !== undefined ? this.renderStatControl('weapons', w.id, 'explosionRadius', 'Радиус взрыва (м)', w.explosionRadius, 1, 10, 0.1) : ''}
              ${w.fallSpeed !== undefined ? this.renderStatControl('weapons', w.id, 'fallSpeed', 'Скорость падения (м/с)', w.fallSpeed, 5, 60, 1) : ''}
            </div>

            <div class="drawer-footer">
              <div class="dps-preview-box">
                <div class="dps-metric">
                  <span class="dps-label">Base DPS (L1)</span>
                  <span class="dps-value" id="dps-${w.id}-base">${baseDps}</span>
                </div>
                <div class="dps-metric">
                  <span class="dps-label">Max DPS (L20)</span>
                  <span class="dps-value" id="dps-${w.id}-l20">${l20Dps}</span>
                </div>
              </div>
              <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${w.id}">
                Сбросить оружие
              </button>
            </div>
          </div>
        </div>
      `;

      const headerEl = rowItem.querySelector('.accordion-row-header');
      headerEl?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-reset-item') || target.closest('.btn-toggle-row')) return;
        this.toggleRow(rowId, rowItem);
      });

      rowItem.querySelector('.btn-toggle-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRow(rowId, rowItem);
      });

      rowItem.querySelectorAll('.btn-reset-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wid = (e.currentTarget as HTMLElement).dataset.id!;
          this.resetSingleItem('weapons', wid);
        });
      });

      container.appendChild(rowItem);
    }

    this.attachInputListeners(container);
  }

  // =========================================================================
  // TAB 2: HEROES (Accordion with Real Hero Textures)
  // =========================================================================
  private renderHeroes(): void {
    const container = document.getElementById('heroes-list') || document.getElementById('heroes-grid');
    if (!container) return;
    container.innerHTML = '';

    const heroes = Object.values(this.draftBalance.heroes);
    for (const h of heroes) {
      if (
        this.searchFilter &&
        !h.name.toLowerCase().includes(this.searchFilter) &&
        !h.id.toLowerCase().includes(this.searchFilter) &&
        !(h.role || '').toLowerCase().includes(this.searchFilter)
      ) {
        continue;
      }

      const rowId = `heroes-${h.id}`;
      const isExpanded = this.expandedRows.has(rowId);
      const isModified = Array.from(this.modifiedPaths).some((p) => p.startsWith(`heroes.${h.id}.`));
      const textureUrl = getEntityTexture('heroes', h.id);

      const rowItem = document.createElement('div');
      rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
      rowItem.dataset.rowId = rowId;

      rowItem.innerHTML = `
        <div class="accordion-row-header heroes-table-cols">
          <div class="accordion-col-expand">
            <span class="chevron-arrow">›</span>
          </div>
          <div class="accordion-col-main">
            <img src="${textureUrl}" class="item-texture" alt="${h.name}" onerror="this.src='/textures/bullet_revolver.png'">
            <div class="item-identity">
              <span class="item-title">${h.name}</span>
              <span class="item-id-badge">${h.id}</span>
            </div>
          </div>
          <div class="accordion-col-stat" id="row-stat-hp-${h.id}">
            <span>${h.maxHp} HP</span>
          </div>
          <div class="accordion-col-stat" id="row-stat-speed-${h.id}">
            <span>${h.baseSpeed} м/с</span>
          </div>
          <div class="accordion-col-stat">
            <span class="stat-highlight" id="row-stat-dmgmult-${h.id}">${h.damageMultiplier}x</span>
          </div>
          <div class="accordion-col-stat">
            <span style="color:var(--text-muted); font-size:12px;">${h.startingWeapon}</span>
          </div>
          <div class="accordion-col-status">
            ${
              isModified
                ? '<span class="status-badge-chip badge-modified">Изменено</span>'
                : '<span class="status-badge-chip badge-default">Дефолт</span>'
            }
          </div>
          <div class="accordion-col-actions">
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${h.id}" title="Сбросить к исходным параметрам">↩</button>
            <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
          </div>
        </div>

        <div class="accordion-row-body">
          <div class="drawer-content">
            <div class="drawer-header-info">
              <div class="drawer-desc">${h.role || 'Ковбой Дикого Запада.'}</div>
              <div class="drawer-scaling-badge">Стартовое снаряжение: ${h.startingWeapon}</div>
            </div>

            <div class="drawer-controls-grid">
              ${this.renderStatControl('heroes', h.id, 'maxHp', 'Базовое здоровье (HP)', h.maxHp, 50, 300, 5)}
              ${this.renderStatControl('heroes', h.id, 'baseSpeed', 'Скорость бега (м/с)', h.baseSpeed, 4.0, 15.0, 0.1)}
              ${this.renderStatControl('heroes', h.id, 'damageMultiplier', 'Множитель урона', h.damageMultiplier, 0.5, 3.0, 0.05)}
            </div>

            <div class="drawer-footer">
              <div></div>
              <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${h.id}">
                Сбросить героя
              </button>
            </div>
          </div>
        </div>
      `;

      const headerEl = rowItem.querySelector('.accordion-row-header');
      headerEl?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-reset-item') || target.closest('.btn-toggle-row')) return;
        this.toggleRow(rowId, rowItem);
      });

      rowItem.querySelector('.btn-toggle-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRow(rowId, rowItem);
      });

      rowItem.querySelectorAll('.btn-reset-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const hid = (e.currentTarget as HTMLElement).dataset.id!;
          this.resetSingleItem('heroes', hid);
        });
      });

      container.appendChild(rowItem);
    }

    this.attachInputListeners(container);
  }

  // =========================================================================
  // TAB 3: MONSTERS (Accordion with Real Monster Textures)
  // =========================================================================
  private renderMonsters(): void {
    const container = document.getElementById('monsters-list') || document.getElementById('monsters-grid');
    if (!container) return;
    container.innerHTML = '';

    const monsters = Object.values(this.draftBalance.monsters);
    for (const m of monsters) {
      if (
        this.searchFilter &&
        !m.name.toLowerCase().includes(this.searchFilter) &&
        !m.id.toLowerCase().includes(this.searchFilter) &&
        !(m.description || '').toLowerCase().includes(this.searchFilter)
      ) {
        continue;
      }

      const rowId = `monsters-${m.id}`;
      const isExpanded = this.expandedRows.has(rowId);
      const isModified = Array.from(this.modifiedPaths).some((p) => p.startsWith(`monsters.${m.id}.`));
      const textureUrl = getEntityTexture('monsters', m.id);

      const rowItem = document.createElement('div');
      rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
      rowItem.dataset.rowId = rowId;

      rowItem.innerHTML = `
        <div class="accordion-row-header monsters-table-cols">
          <div class="accordion-col-expand">
            <span class="chevron-arrow">›</span>
          </div>
          <div class="accordion-col-main">
            <img src="${textureUrl}" class="item-texture" alt="${m.name}" onerror="this.src='/textures/bullet_revolver.png'">
            <div class="item-identity">
              <span class="item-title">${m.name}</span>
              <span class="item-id-badge">${m.id}</span>
            </div>
          </div>
          <div class="accordion-col-stat" id="row-stat-hp-${m.id}">
            <span>${m.hp} HP</span>
          </div>
          <div class="accordion-col-stat" id="row-stat-speed-${m.id}">
            <span>${m.speed} м/с</span>
          </div>
          <div class="accordion-col-stat">
            <span class="stat-highlight" id="row-stat-damage-${m.id}">${m.damage}</span>
          </div>
          <div class="accordion-col-stat">
            <span style="color:var(--accent-primary); font-size:12px; font-weight:600;">${m.gemType || 'blue'} gem</span>
          </div>
          <div class="accordion-col-status">
            ${
              isModified
                ? '<span class="status-badge-chip badge-modified">Изменено</span>'
                : '<span class="status-badge-chip badge-default">Дефолт</span>'
            }
          </div>
          <div class="accordion-col-actions">
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${m.id}" title="Сбросить к исходным параметрам">↩</button>
            <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
          </div>
        </div>

        <div class="accordion-row-body">
          <div class="drawer-content">
            <div class="drawer-header-info">
              <div class="drawer-desc">${m.description || 'Рядовой противник волны.'}</div>
              <div class="drawer-scaling-badge">Дроп: ${m.gemType || 'blue'} gem</div>
            </div>

            <div class="drawer-controls-grid">
              ${this.renderStatControl('monsters', m.id, 'hp', 'Здоровье (HP 0-мин)', m.hp, 10, 2000, 2)}
              ${this.renderStatControl('monsters', m.id, 'speed', 'Скорость (м/с)', m.speed, 1.0, 10.0, 0.1)}
              ${this.renderStatControl('monsters', m.id, 'damage', 'Урон за удар', m.damage, 1, 100, 1)}
            </div>

            <div class="drawer-footer">
              <div></div>
              <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${m.id}">
                Сбросить монстра
              </button>
            </div>
          </div>
        </div>
      `;

      const headerEl = rowItem.querySelector('.accordion-row-header');
      headerEl?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-reset-item') || target.closest('.btn-toggle-row')) return;
        this.toggleRow(rowId, rowItem);
      });

      rowItem.querySelector('.btn-toggle-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRow(rowId, rowItem);
      });

      rowItem.querySelectorAll('.btn-reset-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mid = (e.currentTarget as HTMLElement).dataset.id!;
          this.resetSingleItem('monsters', mid);
        });
      });

      container.appendChild(rowItem);
    }

    this.attachInputListeners(container);
  }

  // =========================================================================
  // TAB 4: BOSSES (Accordion with Real Boss Textures)
  // =========================================================================
  private renderBosses(): void {
    const container = document.getElementById('bosses-list') || document.getElementById('bosses-grid');
    if (!container) return;
    container.innerHTML = '';

    const bosses = Object.values(this.draftBalance.bosses);
    for (const b of bosses) {
      if (
        this.searchFilter &&
        !b.name.toLowerCase().includes(this.searchFilter) &&
        !b.id.toLowerCase().includes(this.searchFilter) &&
        !(b.description || '').toLowerCase().includes(this.searchFilter)
      ) {
        continue;
      }

      const rowId = `bosses-${b.id}`;
      const isExpanded = this.expandedRows.has(rowId);
      const isModified = Array.from(this.modifiedPaths).some((p) => p.startsWith(`bosses.${b.id}.`));
      const textureUrl = getEntityTexture('bosses', b.id);

      const rowItem = document.createElement('div');
      rowItem.className = `accordion-item ${isExpanded ? 'is-expanded' : ''} ${isModified ? 'is-modified' : ''}`;
      rowItem.dataset.rowId = rowId;

      rowItem.innerHTML = `
        <div class="accordion-row-header bosses-table-cols">
          <div class="accordion-col-expand">
            <span class="chevron-arrow">›</span>
          </div>
          <div class="accordion-col-main">
            <img src="${textureUrl}" class="item-texture" alt="${b.name}" onerror="this.src='/textures/bullet_revolver.png'">
            <div class="item-identity">
              <span class="item-title">${b.name}</span>
              <span class="item-id-badge">${b.id}</span>
            </div>
          </div>
          <div class="accordion-col-stat" id="row-stat-hp-${b.id}">
            <span>${b.hp.toLocaleString()} HP</span>
          </div>
          <div class="accordion-col-stat" id="row-stat-speed-${b.id}">
            <span>${b.speed} м/с</span>
          </div>
          <div class="accordion-col-stat">
            <span class="stat-highlight" id="row-stat-damage-${b.id}">${b.damage}</span>
          </div>
          <div class="accordion-col-stat">
            <span style="color:var(--accent-warning); font-size:12px; font-weight:600;">Многофазный</span>
          </div>
          <div class="accordion-col-status">
            ${
              isModified
                ? '<span class="status-badge-chip badge-modified">Изменено</span>'
                : '<span class="status-badge-chip badge-default">Дефолт</span>'
            }
          </div>
          <div class="accordion-col-actions">
            <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${b.id}" title="Сбросить к исходным параметрам">↩</button>
            <button class="btn btn-xs btn-ghost btn-toggle-row">${isExpanded ? 'Свернуть' : 'Развернуть'}</button>
          </div>
        </div>

        <div class="accordion-row-body">
          <div class="drawer-content">
            <div class="drawer-header-info">
              <div class="drawer-desc">${b.description || 'Эпический босс арены.'}</div>
              <div class="drawer-scaling-badge">Фазы боя: 2-3 фазы</div>
            </div>

            <div class="drawer-controls-grid">
              ${this.renderStatControl('bosses', b.id, 'hp', 'Базовое здоровье босса', b.hp, 1000, 100000, 200)}
              ${this.renderStatControl('bosses', b.id, 'speed', 'Скорость (м/с)', b.speed, 1.0, 8.0, 0.1)}
              ${this.renderStatControl('bosses', b.id, 'damage', 'Контактный урон', b.damage, 10, 300, 5)}
            </div>

            <div class="drawer-footer">
              <div></div>
              <button class="btn btn-xs btn-outline-danger btn-reset-item" data-id="${b.id}">
                Сбросить босса
              </button>
            </div>
          </div>
        </div>
      `;

      const headerEl = rowItem.querySelector('.accordion-row-header');
      headerEl?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-reset-item') || target.closest('.btn-toggle-row')) return;
        this.toggleRow(rowId, rowItem);
      });

      rowItem.querySelector('.btn-toggle-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRow(rowId, rowItem);
      });

      rowItem.querySelectorAll('.btn-reset-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const bid = (e.currentTarget as HTMLElement).dataset.id!;
          this.resetSingleItem('bosses', bid);
        });
      });

      container.appendChild(rowItem);
    }

    this.attachInputListeners(container);
  }

  // =========================================================================
  // TAB 5: GLOBAL
  // =========================================================================
  private renderGlobal(): void {
    const container = document.getElementById('global-form-container');
    if (!container) return;

    const g = this.draftBalance.global;

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
        <div>
          <h4 style="margin-bottom: 14px; color: var(--accent-primary); font-size:14px; font-weight:700;">Тактический рывок (Dash)</h4>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${this.renderStatControl('global', '', 'dashCooldown', 'Кулдаун рывка (сек)', g.dashCooldown, 0.5, 6.0, 0.1)}
            ${this.renderStatControl('global', '', 'dashDuration', 'Длительность рывка (сек)', g.dashDuration, 0.1, 1.0, 0.02)}
          </div>
        </div>

        <div>
          <h4 style="margin-bottom: 14px; color: var(--accent-primary); font-size:14px; font-weight:700;">Критический урон</h4>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${this.renderStatControl('global', '', 'baseCritChance', 'Базовый шанс крита', g.baseCritChance, 0.0, 1.0, 0.01)}
            ${this.renderStatControl('global', '', 'baseCritDamageMult', 'Множитель крит. урона', g.baseCritDamageMult, 1.2, 5.0, 0.1)}
          </div>
        </div>

        <div>
          <h4 style="margin-bottom: 14px; color: var(--accent-primary); font-size:14px; font-weight:700;">Подбор и броня</h4>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${this.renderStatControl('global', '', 'basePickupRadius', 'Радиус магнита (м)', g.basePickupRadius, 1.0, 25.0, 0.5)}
            ${this.renderStatControl('global', '', 'maxArmorReduction', 'Макс. снижение урона (Cap)', g.maxArmorReduction, 0.3, 0.95, 0.05)}
          </div>
        </div>
      </div>
    `;

    this.attachInputListeners(container);
  }

  // =========================================================================
  // STAT CONTROLS & REACTIVITY
  // =========================================================================
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

    // Synchronize slider and input pairs on screen
    const allMatching = document.querySelectorAll<HTMLInputElement>(`[data-path="${path}"]`);
    allMatching.forEach((el) => {
      if (el.value !== String(value)) {
        el.value = String(value);
      }
      if (el.classList.contains('stat-input')) {
        el.classList.toggle('is-changed', origVal !== value);
      }
    });

    // Update weapon metrics live in row header & drawer
    if (parts[0] === 'weapons') {
      const wid = parts[1];
      const weapon = this.draftBalance.weapons[wid];
      if (weapon) {
        const baseDps = weapon.cooldown > 0 ? (weapon.damage / weapon.cooldown).toFixed(1) : (weapon.damage * 60).toFixed(1);
        const l20Dmg = weapon.damage + 19 * weapon.damagePerLevel;
        const l20Dps = weapon.cooldown > 0 ? (l20Dmg / weapon.cooldown).toFixed(1) : (l20Dmg * 60).toFixed(1);

        const elBase = document.getElementById(`dps-${wid}-base`);
        const elL20 = document.getElementById(`dps-${wid}-l20`);
        const elRowDps1 = document.getElementById(`row-stat-dps1-${wid}`);
        const elRowDps20 = document.getElementById(`row-stat-dps20-${wid}`);
        const elRowDmg = document.getElementById(`row-stat-damage-${wid}`);
        const elRowCd = document.getElementById(`row-stat-cooldown-${wid}`);

        if (elBase) elBase.innerText = baseDps;
        if (elL20) elL20.innerText = l20Dps;
        if (elRowDps1) elRowDps1.innerText = baseDps;
        if (elRowDps20) elRowDps20.innerText = l20Dps;
        if (elRowDmg) elRowDmg.innerHTML = `<span>${weapon.damage}</span>`;
        if (elRowCd) elRowCd.innerHTML = `<span>${weapon.cooldown}с</span>`;
      }
    }

    // Update row item modified style
    const category = parts[0];
    const entityId = parts[1];
    if (category && entityId) {
      const rowItem = document.querySelector(`[data-row-id="${category}-${entityId}"]`);
      if (rowItem) {
        const hasItemMods = Array.from(this.modifiedPaths).some((p) => p.startsWith(`${category}.${entityId}.`));
        rowItem.classList.toggle('is-modified', hasItemMods);
        const statusBadge = rowItem.querySelector('.accordion-col-status');
        if (statusBadge) {
          statusBadge.innerHTML = hasItemMods
            ? '<span class="status-badge-chip badge-modified">Изменено</span>'
            : '<span class="status-badge-chip badge-default">Дефолт</span>';
        }
      }
    }

    this.updateStagedUI();
    this.updateOverviewStats();
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

  private updateOverviewStats(): void {
    // 1. Total weapons
    const totalWeaponsEl = document.getElementById('kpi-weapons-count');
    if (totalWeaponsEl) {
      totalWeaponsEl.innerText = String(Object.keys(this.draftBalance.weapons).length);
    }

    // 2. Average DPS
    const avgDpsEl = document.getElementById('kpi-avg-dps');
    if (avgDpsEl) {
      const weapons = Object.values(this.draftBalance.weapons);
      let sum = 0;
      for (const w of weapons) {
        sum += w.cooldown > 0 ? w.damage / w.cooldown : w.damage * 60;
      }
      const avg = weapons.length > 0 ? (sum / weapons.length).toFixed(1) : '0';
      avgDpsEl.innerText = avg;
    }

    // 3. Staged Draft Count & Delta
    const draftCountEl = document.getElementById('kpi-draft-count');
    const draftDeltaEl = document.getElementById('kpi-draft-delta');
    const draftDescEl = document.getElementById('kpi-draft-desc');
    const count = this.modifiedPaths.size;

    if (draftCountEl) draftCountEl.innerText = String(count);
    if (draftDeltaEl) {
      if (count > 0) {
        draftDeltaEl.className = 'trend-down';
        draftDeltaEl.innerText = `${count} в очереди ⚠️`;
      } else {
        draftDeltaEl.className = 'trend-neutral';
        draftDeltaEl.innerText = 'В синхроне';
      }
    }
    if (draftDescEl) {
      draftDescEl.innerText = count > 0 ? 'Требуется сохранение в Supabase' : 'готовность к деплою';
    }
  }

  // =========================================================================
  // RESET SINGLE ITEM (BUG FIX: Clear only modified paths for this entity)
  // =========================================================================
  private resetSingleItem(category: keyof GameBalanceState, id: string): void {
    const origItem = (this.originalBalance[category] as any)[id] || (DEFAULT_BALANCE[category] as any)[id];
    if (!origItem) return;

    // 1. Revert draft balance for this item back to original
    (this.draftBalance[category] as any)[id] = JSON.parse(JSON.stringify(origItem));

    // 2. Clear all modified paths for this item
    for (const p of Array.from(this.modifiedPaths)) {
      if (p.startsWith(`${category}.${id}.`)) {
        this.modifiedPaths.delete(p);
      }
    }

    // 3. Update UI
    this.updateStagedUI();
    this.updateOverviewStats();
    if (category === 'weapons') this.renderWeapons();
    else if (category === 'heroes') this.renderHeroes();
    else if (category === 'monsters') this.renderMonsters();
    else if (category === 'bosses') this.renderBosses();

    this.showToast(`Параметры "${origItem.name || id}" сброшены.`, 'info');
  }

  private discardDraft(): void {
    if (confirm('Сбросить все несохраненные изменения черновика?')) {
      this.draftBalance = JSON.parse(JSON.stringify(this.originalBalance));
      this.modifiedPaths.clear();
      this.updateStagedUI();
      this.updateOverviewStats();
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

      const oldVal = this.getOriginalValue(p);
      const newVal = parts.length === 3
        ? (this.draftBalance as any)[cat]?.[key]?.[field]
        : (this.draftBalance as any)[cat]?.[field];

      // Crucial bugfix: Only show real numeric diffs, avoid string NaN / 0 diffs
      if (typeof oldVal !== 'number' || typeof newVal !== 'number' || isNaN(oldVal) || isNaN(newVal)) {
        continue;
      }

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
      this.updateOverviewStats();
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
      this.updateOverviewStats();
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
