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
import { SvgChartRenderer, ChartSeries } from './chartUtils';

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

const WEAPON_COLORS: Record<string, string> = {
  fireball: '#ef4444',
  bow: '#10b981',
  kukri: '#f59e0b',
  orbiting_barrier: '#8b5cf6',
  holy_aura: '#f97316',
  katana_slash: '#ec4899',
  whirlwind_slash: '#dc2626',
  greatsword: '#6366f1',
  flail: '#78716c',
  astral_staff: '#a855f7',
  chakram: '#06b6d4',
  lightning_strike: '#eab308',
  ice_spike: '#3b82f6'
};

const MONSTER_COLORS: Record<string, string> = {
  coyote: '#94a3b8',
  crawler: '#10b981',
  cactus: '#84cc16',
  skeleton: '#cbd5e1',
  ghost: '#a78bfa',
  scorpion: '#f97316',
  brute: '#b45309',
  bison: '#ef4444',
  boss: '#dc2626',
  hydra: '#7c3aed'
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
  private activeTab: string = 'dashboard';

  // Table sorting states
  private tableSorts: Record<string, { col: string; dir: 'asc' | 'desc' }> = {
    weapons: { col: 'name', dir: 'asc' },
    heroes: { col: 'name', dir: 'asc' },
    monsters: { col: 'name', dir: 'asc' },
    bosses: { col: 'name', dir: 'asc' }
  };

  // Progression Charts State
  private progView: 'weapons' | 'monsters' | 'heroes' = 'weapons';
  private progWeaponMetric: 'damage' | 'dps' = 'damage';
  private progSelectedWeapons: Set<string> = new Set([
    'fireball',
    'bow',
    'greatsword',
    'lightning_strike',
    'katana_slash'
  ]);
  private progMonsterCategory: 'monsters' | 'bosses' = 'monsters';
  private progMonsterMetric: 'hp' | 'damage' | 'speed' = 'hp';
  private progSelectedMonsters: Set<string> = new Set(['coyote', 'crawler', 'scorpion', 'brute', 'bison']);
  private progSelectedBosses: Set<string> = new Set(['boss', 'hydra']);

  // Simulation State (DPS & Damage Modeler)
  private simSlots: Array<{ enabled: boolean; weaponId: string; level: number }> = [
    { enabled: true, weaponId: 'fireball', level: 10 },
    { enabled: true, weaponId: 'bow', level: 8 },
    { enabled: true, weaponId: 'lightning_strike', level: 6 },
    { enabled: false, weaponId: 'whirlwind_slash', level: 5 },
    { enabled: false, weaponId: 'holy_aura', level: 5 }
  ];
  private simHero: string = 'valkyrie';
  private simSheriff: number = 0;
  private simWatch: number = 0;
  private simInjector: number = 0;
  private simCritVisor: number = 0;
  private simTargets: number = 3;
  private simDamageRune: boolean = false;

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

      if (this.config.serviceRoleKey) {
        statusEl.className = 'status-pill status-connected';
        statusEl.innerHTML = '<span class="status-dot"></span><span>Supabase (Запись активна)</span>';
        if (sidebarBadge) {
          sidebarBadge.className = 'tab-pill pill-success';
          sidebarBadge.innerText = 'WRITE';
        }
      } else {
        statusEl.className = 'status-pill status-connecting';
        statusEl.innerHTML = '<span class="status-dot"></span><span title="Для записи укажите Service Role Key в настройках">Supabase (Только чтение)</span>';
        if (sidebarBadge) {
          sidebarBadge.className = 'tab-pill pill-danger';
          sidebarBadge.innerText = 'READ ONLY';
        }
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
        this.switchTab(target);
      });
    });

    // Quick Jump cards and buttons on Dashboard
    document.querySelectorAll('[data-jump-tab]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.jumpTab;
        if (!target) return;
        this.switchTab(target);
      });
    });

    // Table Sorting header clicks
    document.querySelectorAll('.sortable-col').forEach((el) => {
      el.addEventListener('click', (e) => {
        const header = e.currentTarget as HTMLElement;
        const table = header.dataset.table;
        const sortKey = header.dataset.sort;
        if (!table || !sortKey) return;

        const current = this.tableSorts[table] || { col: 'name', dir: 'asc' };
        let newDir: 'asc' | 'desc' = 'asc';
        if (current.col === sortKey) {
          newDir = current.dir === 'asc' ? 'desc' : 'asc';
        }
        this.tableSorts[table] = { col: sortKey, dir: newDir };
        this.updateSortHeaderUI(table);

        if (table === 'weapons') this.renderWeapons();
        else if (table === 'heroes') this.renderHeroes();
        else if (table === 'monsters') this.renderMonsters();
        else if (table === 'bosses') this.renderBosses();
      });
    });

    this.bindProgressionEvents();
    this.bindSimulationEvents();

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

  public switchTab(target: string): void {
    this.activeTab = target;
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach((t) => {
      t.classList.toggle('active', (t as HTMLElement).dataset.tab === target);
    });
    document.querySelectorAll('.tab-pane').forEach((p) => {
      p.classList.toggle('active', p.id === `tab-${target}`);
    });

    if (target === 'dashboard') this.renderDashboard();
    else if (target === 'progression') this.renderProgression();
    else if (target === 'simulation') this.renderSimulation();
    else if (target === 'weapons') this.renderWeapons();
    else if (target === 'heroes') this.renderHeroes();
    else if (target === 'monsters') this.renderMonsters();
    else if (target === 'bosses') this.renderBosses();
    else if (target === 'global') this.renderGlobal();
  }

  private updateSortHeaderUI(table: string): void {
    const sort = this.tableSorts[table];
    if (!sort) return;
    const headers = document.querySelectorAll(`.sortable-col[data-table="${table}"]`);
    headers.forEach((h) => {
      const colEl = h as HTMLElement;
      const isCurrent = colEl.dataset.sort === sort.col;
      colEl.classList.toggle('is-sorted', isCurrent);
      const icon = colEl.querySelector('.sort-icon');
      if (icon) {
        icon.textContent = isCurrent ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅';
      }
    });
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
    this.renderDashboard();
    this.renderWeapons();
    this.renderHeroes();
    this.renderMonsters();
    this.renderBosses();
    this.renderGlobal();
    this.renderProgression();
    this.renderSimulation();
  }

  // =========================================================================
  // TAB 1: WEAPONS (Accordion with Real Textures)
  // =========================================================================
  private renderWeapons(): void {
    const container = document.getElementById('weapons-list') || document.getElementById('weapons-grid');
    if (!container) return;
    container.innerHTML = '';

    const weapons = Object.values(this.draftBalance.weapons);
    const sort = this.tableSorts.weapons || { col: 'name', dir: 'asc' };
    weapons.sort((a, b) => {
      let val = 0;
      const baseDpsA = a.cooldown > 0 ? a.damage / a.cooldown : a.damage * 60;
      const baseDpsB = b.cooldown > 0 ? b.damage / b.cooldown : b.damage * 60;
      const l20DpsA =
        a.cooldown > 0
          ? (a.damage + 19 * a.damagePerLevel) / a.cooldown
          : (a.damage + 19 * a.damagePerLevel) * 60;
      const l20DpsB =
        b.cooldown > 0
          ? (b.damage + 19 * b.damagePerLevel) / b.cooldown
          : (b.damage + 19 * b.damagePerLevel) * 60;
      const isModA = Array.from(this.modifiedPaths).some((p) => p.startsWith(`weapons.${a.id}.`))
        ? 1
        : 0;
      const isModB = Array.from(this.modifiedPaths).some((p) => p.startsWith(`weapons.${b.id}.`))
        ? 1
        : 0;

      switch (sort.col) {
        case 'name':
          val = a.name.localeCompare(b.name, 'ru');
          break;
        case 'damage':
          val = a.damage - b.damage;
          break;
        case 'cooldown':
          val = a.cooldown - b.cooldown;
          break;
        case 'dps1':
          val = baseDpsA - baseDpsB;
          break;
        case 'dps20':
          val = l20DpsA - l20DpsB;
          break;
        case 'status':
          val = isModA - isModB;
          break;
        default:
          val = a.name.localeCompare(b.name, 'ru');
          break;
      }
      return sort.dir === 'asc' ? val : -val;
    });

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
    const sort = this.tableSorts.heroes || { col: 'name', dir: 'asc' };
    heroes.sort((a, b) => {
      let val = 0;
      const isModA = Array.from(this.modifiedPaths).some((p) => p.startsWith(`heroes.${a.id}.`))
        ? 1
        : 0;
      const isModB = Array.from(this.modifiedPaths).some((p) => p.startsWith(`heroes.${b.id}.`))
        ? 1
        : 0;

      switch (sort.col) {
        case 'name':
          val = a.name.localeCompare(b.name, 'ru');
          break;
        case 'hp':
          val = a.maxHp - b.maxHp;
          break;
        case 'speed':
          val = a.baseSpeed - b.baseSpeed;
          break;
        case 'dmgmult':
          val = a.damageMultiplier - b.damageMultiplier;
          break;
        case 'weapon':
          val = (a.startingWeapon || '').localeCompare(b.startingWeapon || '', 'ru');
          break;
        case 'status':
          val = isModA - isModB;
          break;
        default:
          val = a.name.localeCompare(b.name, 'ru');
          break;
      }
      return sort.dir === 'asc' ? val : -val;
    });

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
    const sort = this.tableSorts.monsters || { col: 'name', dir: 'asc' };
    monsters.sort((a, b) => {
      let val = 0;
      const isModA = Array.from(this.modifiedPaths).some((p) => p.startsWith(`monsters.${a.id}.`))
        ? 1
        : 0;
      const isModB = Array.from(this.modifiedPaths).some((p) => p.startsWith(`monsters.${b.id}.`))
        ? 1
        : 0;

      switch (sort.col) {
        case 'name':
          val = a.name.localeCompare(b.name, 'ru');
          break;
        case 'hp':
          val = a.hp - b.hp;
          break;
        case 'speed':
          val = a.speed - b.speed;
          break;
        case 'damage':
          val = a.damage - b.damage;
          break;
        case 'gem':
          val = (a.gemType || '').localeCompare(b.gemType || '', 'ru');
          break;
        case 'status':
          val = isModA - isModB;
          break;
        default:
          val = a.name.localeCompare(b.name, 'ru');
          break;
      }
      return sort.dir === 'asc' ? val : -val;
    });

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
    const sort = this.tableSorts.bosses || { col: 'name', dir: 'asc' };
    bosses.sort((a, b) => {
      let val = 0;
      const isModA = Array.from(this.modifiedPaths).some((p) => p.startsWith(`bosses.${a.id}.`))
        ? 1
        : 0;
      const isModB = Array.from(this.modifiedPaths).some((p) => p.startsWith(`bosses.${b.id}.`))
        ? 1
        : 0;

      switch (sort.col) {
        case 'name':
          val = a.name.localeCompare(b.name, 'ru');
          break;
        case 'hp':
          val = a.hp - b.hp;
          break;
        case 'speed':
          val = a.speed - b.speed;
          break;
        case 'damage':
          val = a.damage - b.damage;
          break;
        case 'phases':
          val = (a.id === 'hydra' ? 3 : 2) - (b.id === 'hydra' ? 3 : 2);
          break;
        case 'status':
          val = isModA - isModB;
          break;
        default:
          val = a.name.localeCompare(b.name, 'ru');
          break;
      }
      return sort.dir === 'asc' ? val : -val;
    });

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
    if (this.activeTab === 'progression') this.renderProgression();
    if (this.activeTab === 'simulation') this.renderSimulation();
    if (this.activeTab === 'dashboard') this.renderDashboard();
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

    if (!this.config.serviceRoleKey) {
      this.closeReviewModal();
      this.showToast(
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
      if (msg.includes('row-level security') || msg.includes('violates row-level security policy')) {
        this.showToast(
          '❌ Ошибка RLS: таблица game_balance защищена от неавторизованной записи. Для сохранения изменений требуется secret service_role ключ из Supabase (Settings -> API).',
          'error'
        );
      } else {
        this.showToast(`Ошибка отправки в Supabase: ${msg}`, 'error');
      }
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

    if (!this.config.serviceRoleKey) {
      this.showToast(
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
      if (msg.includes('row-level security') || msg.includes('violates row-level security policy')) {
        this.showToast(
          '❌ Ошибка RLS: таблица защищена от неавторизованной записи. Проверьте, что в поле «Service Role Key» вставлен секретный service_role ключ (Supabase -> Settings -> API).',
          'error'
        );
      } else {
        this.showToast(`Ошибка инициализации БД: ${msg}`, 'error');
      }
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

  // =========================================================================
  // DASHBOARD / HUB
  // =========================================================================
  private renderDashboard(): void {
    // 1. Top 5 Weapons by L20 DPS
    const topContainer = document.getElementById('dashboard-top-weapons-container');
    if (topContainer) {
      const weapons = Object.values(this.draftBalance.weapons);
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

  // =========================================================================
  // TAB: PROGRESSION (CHARTS)
  // =========================================================================
  private bindProgressionEvents(): void {
    const viewButtons = document.querySelectorAll('#progression-view-switcher .segmented-btn');
    viewButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetView = (e.currentTarget as HTMLElement).dataset.progView as
          | 'weapons'
          | 'monsters'
          | 'heroes'
          | undefined;
        if (!targetView) return;
        this.progView = targetView;
        viewButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');

        const elW = document.getElementById('prog-view-weapons');
        const elM = document.getElementById('prog-view-monsters');
        const elH = document.getElementById('prog-view-heroes');
        if (elW) elW.style.display = targetView === 'weapons' ? 'block' : 'none';
        if (elM) elM.style.display = targetView === 'monsters' ? 'block' : 'none';
        if (elH) elH.style.display = targetView === 'heroes' ? 'block' : 'none';

        this.renderProgression();
      });
    });

    const metricButtons = document.querySelectorAll('#prog-weapon-metric-toggle .segmented-btn');
    metricButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const metric = (e.currentTarget as HTMLElement).dataset.metric as 'damage' | 'dps' | undefined;
        if (!metric) return;
        this.progWeaponMetric = metric;
        metricButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');

        const title = document.getElementById('prog-weapons-chart-title');
        if (title) {
          title.textContent =
            metric === 'damage'
              ? 'Прогрессия урона оружия от Уровня 1 до Уровня 20'
              : 'Прогрессия боевого DPS оружия от Уровня 1 до Уровня 20';
        }

        this.renderWeaponsProgression();
      });
    });

    document.getElementById('btn-prog-weapons-select-all')?.addEventListener('click', () => {
      Object.keys(this.draftBalance.weapons).forEach((id) => this.progSelectedWeapons.add(id));
      this.renderWeaponsProgression();
    });

    document.getElementById('btn-prog-weapons-clear-all')?.addEventListener('click', () => {
      this.progSelectedWeapons.clear();
      const firstId = Object.keys(this.draftBalance.weapons)[0] || 'fireball';
      this.progSelectedWeapons.add(firstId);
      this.renderWeaponsProgression();
    });

    const monsterCatButtons = document.querySelectorAll('#prog-monster-category-toggle .segmented-btn');
    monsterCatButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const cat = (e.currentTarget as HTMLElement).dataset.cat as 'monsters' | 'bosses' | undefined;
        if (!cat) return;
        this.progMonsterCategory = cat;
        monsterCatButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.renderMonstersProgression();
      });
    });

    const monsterMetricButtons = document.querySelectorAll(
      '#prog-monster-metric-toggle .segmented-btn'
    );
    monsterMetricButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const metric = (e.currentTarget as HTMLElement).dataset.metric as
          | 'hp'
          | 'damage'
          | 'speed'
          | undefined;
        if (!metric) return;
        this.progMonsterMetric = metric;
        monsterMetricButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.renderMonstersProgression();
      });
    });
  }

  private renderProgression(): void {
    if (this.progView === 'weapons') {
      this.renderWeaponsProgression();
    } else if (this.progView === 'monsters') {
      this.renderMonstersProgression();
    } else if (this.progView === 'heroes') {
      this.renderHeroesProgression();
    }
  }

  private renderWeaponsProgression(): void {
    this.renderWeaponsProgressionChips();

    const chartContainer = document.getElementById('chart-weapons-progression');
    if (!chartContainer) return;

    const levels = Array.from({ length: 20 }, (_, i) => i + 1);
    const xLabels = levels.map((lvl) => `L${lvl}`);
    const isDps = this.progWeaponMetric === 'dps';

    const seriesList: ChartSeries[] = [];
    for (const wid of this.progSelectedWeapons) {
      const w = this.draftBalance.weapons[wid];
      if (!w) continue;

      const values = levels.map((lvl) => {
        const dmg = w.damage + (lvl - 1) * w.damagePerLevel;
        if (isDps) {
          const cd = w.cooldown > 0 ? w.cooldown : 1 / 60;
          return Number((dmg / cd).toFixed(1));
        }
        return dmg;
      });

      seriesList.push({
        id: wid,
        name: w.name,
        color: WEAPON_COLORS[wid] || '#2563eb',
        values,
        unit: isDps ? 'DPS' : 'урон'
      });
    }

    SvgChartRenderer.renderLineChart(chartContainer, seriesList, {
      xLabels,
      fillArea: false
    });
  }

  private renderWeaponsProgressionChips(): void {
    const container = document.getElementById('prog-weapons-chips');
    if (!container) return;
    container.innerHTML = '';

    const weapons = Object.values(this.draftBalance.weapons);
    for (const w of weapons) {
      const isSelected = this.progSelectedWeapons.has(w.id);
      const color = WEAPON_COLORS[w.id] || '#2563eb';

      const chip = document.createElement('div');
      chip.className = `filter-chip ${isSelected ? 'active' : ''}`;
      chip.dataset.id = w.id;
      chip.innerHTML = `
        <span class="chip-dot" style="background:${color};"></span>
        <span>${w.name}</span>
      `;

      chip.addEventListener('click', () => {
        if (this.progSelectedWeapons.has(w.id)) {
          if (this.progSelectedWeapons.size > 1) {
            this.progSelectedWeapons.delete(w.id);
          }
        } else {
          this.progSelectedWeapons.add(w.id);
        }
        this.renderWeaponsProgression();
      });

      container.appendChild(chip);
    }
  }

  private renderMonstersProgression(): void {
    this.renderMonstersProgressionChips();

    const chartContainer = document.getElementById('chart-monsters-progression');
    if (!chartContainer) return;

    const minutes = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    const xLabels = minutes.map((m) => `${m} мин`);

    const isBosses = this.progMonsterCategory === 'bosses';
    const entities = isBosses
      ? Object.values(this.draftBalance.bosses)
      : Object.values(this.draftBalance.monsters);
    const selectedSet = isBosses ? this.progSelectedBosses : this.progSelectedMonsters;
    const metric = this.progMonsterMetric;

    const seriesList: ChartSeries[] = [];
    for (const ent of entities) {
      if (!selectedSet.has(ent.id)) continue;

      const values = minutes.map((m) => {
        const hpMult = 1 + (m * 0.28 + Math.pow(m / 4.5, 1.7) * 0.4) * 1.5;
        const dmgMult = 1 + (m * 0.12 + Math.pow(m / 8, 1.4) * 0.25) * 1.5;
        const spdMult = Math.min(1.45, 1 + m * 0.012 * 1.5);

        if (metric === 'hp') {
          return Math.round(ent.hp * hpMult);
        } else if (metric === 'damage') {
          return Math.round(ent.damage * dmgMult);
        } else {
          return Number((ent.speed * spdMult).toFixed(2));
        }
      });

      const unit = metric === 'hp' ? 'HP' : metric === 'damage' ? 'урон' : 'м/с';
      seriesList.push({
        id: ent.id,
        name: ent.name,
        color: MONSTER_COLORS[ent.id] || '#64748b',
        values,
        unit
      });
    }

    SvgChartRenderer.renderLineChart(chartContainer, seriesList, {
      xLabels,
      fillArea: false
    });
  }

  private renderMonstersProgressionChips(): void {
    const container = document.getElementById('prog-monsters-chips');
    if (!container) return;
    container.innerHTML = '';

    const isBosses = this.progMonsterCategory === 'bosses';
    const entities = isBosses
      ? Object.values(this.draftBalance.bosses)
      : Object.values(this.draftBalance.monsters);
    const selectedSet = isBosses ? this.progSelectedBosses : this.progSelectedMonsters;

    for (const ent of entities) {
      const isSelected = selectedSet.has(ent.id);
      const color = MONSTER_COLORS[ent.id] || '#64748b';

      const chip = document.createElement('div');
      chip.className = `filter-chip ${isSelected ? 'active' : ''}`;
      chip.dataset.id = ent.id;
      chip.innerHTML = `
        <span class="chip-dot" style="background:${color};"></span>
        <span>${ent.name}</span>
      `;

      chip.addEventListener('click', () => {
        if (selectedSet.has(ent.id)) {
          if (selectedSet.size > 1) {
            selectedSet.delete(ent.id);
          }
        } else {
          selectedSet.add(ent.id);
        }
        this.renderMonstersProgression();
      });

      container.appendChild(chip);
    }
  }

  private renderHeroesProgression(): void {
    const chartContainer = document.getElementById('chart-heroes-progression');
    if (!chartContainer) return;

    const heroes = Object.values(this.draftBalance.heroes);
    const xLabels = heroes.map((h) => h.name);

    const seriesList: ChartSeries[] = [
      {
        id: 'hero-hp',
        name: 'Базовое здоровье (HP)',
        color: '#ef4444',
        values: heroes.map((h) => h.maxHp),
        unit: 'HP'
      },
      {
        id: 'hero-speed',
        name: 'Скорость перемещения (×10)',
        color: '#10b981',
        values: heroes.map((h) => Number((h.baseSpeed * 10).toFixed(1))),
        unit: 'x0.1 м/с'
      },
      {
        id: 'hero-dmgmult',
        name: 'Множитель урона (%)',
        color: '#8b5cf6',
        values: heroes.map((h) => Math.round(h.damageMultiplier * 100)),
        unit: '%'
      }
    ];

    SvgChartRenderer.renderLineChart(chartContainer, seriesList, {
      xLabels,
      fillArea: true
    });
  }

  // =========================================================================
  // TAB: SIMULATION (DPS & DAMAGE MODELER)
  // =========================================================================
  private bindSimulationEvents(): void {
    document.querySelectorAll('.preset-chip-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const preset = (e.currentTarget as HTMLElement).dataset.preset;
        if (preset) {
          this.applyPreset(preset);
        }
      });
    });

    const heroSelect = document.getElementById('sim-hero-select') as HTMLSelectElement;
    heroSelect?.addEventListener('change', (e) => {
      this.simHero = (e.target as HTMLSelectElement).value;
      this.renderSimulation();
    });

    const bindSyncInput = (
      sliderId: string,
      numId: string,
      onChange: (val: number) => void
    ) => {
      const slider = document.getElementById(sliderId) as HTMLInputElement;
      const num = document.getElementById(numId) as HTMLInputElement;
      if (!slider || !num) return;

      slider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value) || 0;
        num.value = String(val);
        onChange(val);
        this.renderSimulation();
      });

      num.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value) || 0;
        slider.value = String(val);
        onChange(val);
        this.renderSimulation();
      });
    };

    bindSyncInput('sim-slider-sheriff', 'sim-num-sheriff', (val) => {
      this.simSheriff = val;
      const badge = document.getElementById('sim-val-sheriff');
      if (badge) badge.innerText = `${val} стаков (+${val * 2}%)`;
    });

    bindSyncInput('sim-slider-watch', 'sim-num-watch', (val) => {
      this.simWatch = val;
      const badge = document.getElementById('sim-val-watch');
      if (badge) badge.innerText = `${val} стаков (-${Math.min(70, val * 8)}%)`;
    });

    bindSyncInput('sim-slider-injector', 'sim-num-injector', (val) => {
      this.simInjector = val;
      const badge = document.getElementById('sim-val-injector');
      if (badge) badge.innerText = `${val} стаков`;
    });

    bindSyncInput('sim-slider-critvisor', 'sim-num-critvisor', (val) => {
      this.simCritVisor = val;
      const badge = document.getElementById('sim-val-critvisor');
      const pct = Math.round((0.05 + val * 0.12) * 100);
      if (badge) badge.innerText = `${val} стаков (${pct}%)`;
    });

    bindSyncInput('sim-slider-targets', 'sim-num-targets', (val) => {
      this.simTargets = Math.max(1, Math.round(val));
      const badge = document.getElementById('sim-val-targets');
      if (badge) badge.innerText = `${this.simTargets} целей`;
    });

    const runeCheck = document.getElementById('sim-check-damagerune') as HTMLInputElement;
    runeCheck?.addEventListener('change', (e) => {
      this.simDamageRune = (e.target as HTMLInputElement).checked;
      this.renderSimulation();
    });

    const slotsContainer = document.getElementById('sim-weapon-slots-container');
    if (slotsContainer) {
      slotsContainer.addEventListener('change', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sim-slot-toggle')) {
          const idx = parseInt(target.dataset.slot || '0');
          if (this.simSlots[idx]) {
            this.simSlots[idx].enabled = (target as HTMLInputElement).checked;
            this.renderSimulation();
          }
        } else if (target.classList.contains('sim-slot-weapon')) {
          const idx = parseInt(target.dataset.slot || '0');
          if (this.simSlots[idx]) {
            this.simSlots[idx].weaponId = (target as HTMLSelectElement).value;
            this.renderSimulation();
          }
        }
      });

      slotsContainer.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;
        if (
          target.classList.contains('sim-slot-level-slider') ||
          target.classList.contains('sim-slot-level-input')
        ) {
          const idx = parseInt(target.dataset.slot || '0');
          if (this.simSlots[idx]) {
            const val = Math.max(1, Math.min(20, parseInt((target as HTMLInputElement).value) || 1));
            this.simSlots[idx].level = val;
            const card = target.closest('.weapon-slot-card');
            const slider = card?.querySelector('.sim-slot-level-slider') as HTMLInputElement;
            const num = card?.querySelector('.sim-slot-level-input') as HTMLInputElement;
            if (slider && slider !== target) slider.value = String(val);
            if (num && num !== target) num.value = String(val);

            this.renderSimulation();
          }
        }
      });
    }
  }

  private applyPreset(preset: string): void {
    if (preset === 'sniper') {
      this.simHero = 'archer';
      this.simSlots = [
        { enabled: true, weaponId: 'bow', level: 15 },
        { enabled: true, weaponId: 'chakram', level: 12 },
        { enabled: true, weaponId: 'ice_spike', level: 10 },
        { enabled: false, weaponId: 'astral_staff', level: 8 },
        { enabled: false, weaponId: 'fireball', level: 10 }
      ];
      this.simSheriff = 15;
      this.simWatch = 5;
      this.simInjector = 0;
      this.simCritVisor = 4;
      this.simTargets = 2;
      this.simDamageRune = false;
      this.showToast('Пресет «Снайпер дальнего боя» активирован.', 'info');
    } else if (preset === 'melee') {
      this.simHero = 'ronin';
      this.simSlots = [
        { enabled: true, weaponId: 'katana_slash', level: 18 },
        { enabled: true, weaponId: 'whirlwind_slash', level: 15 },
        { enabled: true, weaponId: 'greatsword', level: 12 },
        { enabled: true, weaponId: 'orbiting_barrier', level: 10 },
        { enabled: false, weaponId: 'flail', level: 8 }
      ];
      this.simSheriff = 20;
      this.simWatch = 6;
      this.simInjector = 1;
      this.simCritVisor = 2;
      this.simTargets = 6;
      this.simDamageRune = true;
      this.showToast('Пресет «Вихревой милишник» активирован.', 'info');
    } else if (preset === 'elemental') {
      this.simHero = 'sorceress';
      this.simSlots = [
        { enabled: true, weaponId: 'fireball', level: 20 },
        { enabled: true, weaponId: 'lightning_strike', level: 16 },
        { enabled: true, weaponId: 'holy_aura', level: 14 },
        { enabled: true, weaponId: 'ice_spike', level: 12 },
        { enabled: false, weaponId: 'astral_staff', level: 10 }
      ];
      this.simSheriff = 25;
      this.simWatch = 8;
      this.simInjector = 3;
      this.simCritVisor = 1;
      this.simTargets = 5;
      this.simDamageRune = true;
      this.showToast('Пресет «Стихийный маг» активирован.', 'info');
    } else if (preset === 'crit') {
      this.simHero = 'archer';
      this.simSlots = [
        { enabled: true, weaponId: 'bow', level: 18 },
        { enabled: true, weaponId: 'chakram', level: 16 },
        { enabled: true, weaponId: 'katana_slash', level: 14 },
        { enabled: true, weaponId: 'kukri', level: 12 },
        { enabled: false, weaponId: 'fireball', level: 10 }
      ];
      this.simSheriff = 15;
      this.simWatch = 5;
      this.simInjector = 0;
      this.simCritVisor = 8;
      this.simTargets = 3;
      this.simDamageRune = false;
      this.showToast('Пресет «Крит-мастер» активирован.', 'info');
    } else if (preset === 'starter') {
      this.simHero = 'valkyrie';
      this.simSlots = [
        { enabled: true, weaponId: 'bow', level: 1 },
        { enabled: true, weaponId: 'fireball', level: 1 },
        { enabled: false, weaponId: 'kukri', level: 1 },
        { enabled: false, weaponId: 'flail', level: 1 },
        { enabled: false, weaponId: 'holy_aura', level: 1 }
      ];
      this.simSheriff = 0;
      this.simWatch = 0;
      this.simInjector = 0;
      this.simCritVisor = 0;
      this.simTargets = 3;
      this.simDamageRune = false;
      this.showToast('Пресет «Стартовый набор» активирован.', 'info');
    } else if (preset === 'reset') {
      this.simHero = 'valkyrie';
      this.simSlots = [
        { enabled: true, weaponId: 'fireball', level: 1 },
        { enabled: false, weaponId: 'bow', level: 1 },
        { enabled: false, weaponId: 'kukri', level: 1 },
        { enabled: false, weaponId: 'flail', level: 1 },
        { enabled: false, weaponId: 'holy_aura', level: 1 }
      ];
      this.simSheriff = 0;
      this.simWatch = 0;
      this.simInjector = 0;
      this.simCritVisor = 0;
      this.simTargets = 3;
      this.simDamageRune = false;
      this.showToast('Параметры симулятора сброшены.', 'info');
    }

    this.updatePassiveUIValues();
    this.renderSimulation();
  }

  private updatePassiveUIValues(): void {
    const elHero = document.getElementById('sim-hero-select') as HTMLSelectElement;
    if (elHero) elHero.value = this.simHero;

    const setInputPair = (
      sliderId: string,
      numId: string,
      badgeId: string,
      val: number,
      badgeText: string
    ) => {
      const sl = document.getElementById(sliderId) as HTMLInputElement;
      const nm = document.getElementById(numId) as HTMLInputElement;
      const bg = document.getElementById(badgeId);
      if (sl) sl.value = String(val);
      if (nm) nm.value = String(val);
      if (bg) bg.innerText = badgeText;
    };

    setInputPair(
      'sim-slider-sheriff',
      'sim-num-sheriff',
      'sim-val-sheriff',
      this.simSheriff,
      `${this.simSheriff} стаков (+${this.simSheriff * 2}%)`
    );
    setInputPair(
      'sim-slider-watch',
      'sim-num-watch',
      'sim-val-watch',
      this.simWatch,
      `${this.simWatch} стаков (-${Math.min(70, this.simWatch * 8)}%)`
    );
    setInputPair(
      'sim-slider-injector',
      'sim-num-injector',
      'sim-val-injector',
      this.simInjector,
      `${this.simInjector} стаков`
    );
    const critPct = Math.round((0.05 + this.simCritVisor * 0.12) * 100);
    setInputPair(
      'sim-slider-critvisor',
      'sim-num-critvisor',
      'sim-val-critvisor',
      this.simCritVisor,
      `${this.simCritVisor} стаков (${critPct}%)`
    );
    setInputPair(
      'sim-slider-targets',
      'sim-num-targets',
      'sim-val-targets',
      this.simTargets,
      `${this.simTargets} целей`
    );

    const runeCheck = document.getElementById('sim-check-damagerune') as HTMLInputElement;
    if (runeCheck) runeCheck.checked = this.simDamageRune;
  }

  private calculateSlotStats(slot: { weaponId: string; level: number }): {
    singleTargetDps: number;
    totalDps: number;
    hitDamage: number;
    effectiveCooldown: number;
    weaponName: string;
    weaponColor: string;
  } {
    const w =
      this.draftBalance.weapons[slot.weaponId] ||
      DEFAULT_BALANCE.weapons[slot.weaponId] ||
      Object.values(this.draftBalance.weapons)[0];
    const heroCfg =
      this.draftBalance.heroes[this.simHero] ||
      DEFAULT_BALANCE.heroes[this.simHero] || { damageMultiplier: 1.0 };
    const heroMult = heroCfg.damageMultiplier || 1.0;
    const sheriffMult = 1 + this.simSheriff * 0.02;
    const runeMult = this.simDamageRune ? 1.3 : 1.0;

    const baseCritChance = this.draftBalance.global.baseCritChance ?? 0.05;
    const baseCritMult = this.draftBalance.global.baseCritDamageMult ?? 2.0;
    const effectiveCritChance = Math.min(1.0, baseCritChance + this.simCritVisor * 0.12);
    const expectedCritMult = 1 + effectiveCritChance * (baseCritMult - 1);

    const globalDmgMult = heroMult * sheriffMult * runeMult * expectedCritMult;
    const baseLvlDmg = w.damage + (slot.level - 1) * w.damagePerLevel;
    const hitDamage = baseLvlDmg * globalDmgMult;

    const watchReduction = Math.max(0.3, 1 - this.simWatch * 0.08);
    const injectorReduction = Math.pow(0.85, this.simInjector);
    const cdMult = Math.max(0.2, watchReduction * injectorReduction);

    const baseCd = w.cooldown > 0 ? w.cooldown : 1 / 60;
    const effectiveCooldown = Math.max(0.04, baseCd * cdMult);

    const singleTargetDps = hitDamage / effectiveCooldown;

    let cleaveFactor = 1;
    if (w.explosionRadius || w.splashRadius) {
      const radius = w.explosionRadius || w.splashRadius || 2.5;
      cleaveFactor = 1 + Math.min(this.simTargets - 1, Math.round(radius * 1.2));
    } else if (w.pierce) {
      cleaveFactor = Math.min(this.simTargets, w.pierce + 1);
    } else if (
      w.id === 'holy_aura' ||
      w.id === 'orbiting_barrier' ||
      w.id === 'whirlwind_slash' ||
      w.id === 'greatsword' ||
      w.id === 'flail'
    ) {
      cleaveFactor = Math.min(this.simTargets, 5);
    }

    const totalDps = singleTargetDps * cleaveFactor;

    return {
      singleTargetDps,
      totalDps,
      hitDamage,
      effectiveCooldown,
      weaponName: w.name,
      weaponColor: WEAPON_COLORS[w.id] || '#3b82f6'
    };
  }

  private renderSimulation(): void {
    this.renderSimulationWeaponSlots();

    const activeSlots = this.simSlots.filter((s) => s.enabled);
    let totalDps = 0;
    let singleTargetDps = 0;
    const slotStatsList: Array<{ name: string; value: number; color: string; pct: number }> = [];

    for (const slot of activeSlots) {
      const stats = this.calculateSlotStats(slot);
      totalDps += stats.totalDps;
      singleTargetDps += stats.singleTargetDps;
      slotStatsList.push({
        name: stats.weaponName,
        value: stats.totalDps,
        color: stats.weaponColor,
        pct: 0
      });
    }

    slotStatsList.forEach((s) => {
      s.pct = totalDps > 0 ? (s.value / totalDps) * 100 : 0;
    });

    const kpiTotal = document.getElementById('sim-kpi-total-dps');
    if (kpiTotal) kpiTotal.innerText = Math.round(totalDps).toLocaleString();

    const kpiSt = document.getElementById('sim-kpi-st-dps');
    if (kpiSt) kpiSt.innerText = Math.round(singleTargetDps).toLocaleString();

    const kpi60s = document.getElementById('sim-kpi-60s-dmg');
    if (kpi60s) kpi60s.innerText = Math.round(totalDps * 60).toLocaleString();

    const kpiCrit = document.getElementById('sim-kpi-crit');
    const kpiCritSub = document.getElementById('sim-kpi-crit-sub');
    const baseCritChance = this.draftBalance.global.baseCritChance ?? 0.05;
    const baseCritMult = this.draftBalance.global.baseCritDamageMult ?? 2.0;
    const effectiveCritChance = Math.min(1.0, baseCritChance + this.simCritVisor * 0.12);
    const expectedCritMult = 1 + effectiveCritChance * (baseCritMult - 1);

    if (kpiCrit) {
      kpiCrit.innerText = `${Math.round(effectiveCritChance * 100)}% / ${baseCritMult.toFixed(2)}x`;
    }
    if (kpiCritSub) {
      kpiCritSub.innerText = `средний множитель: ${expectedCritMult.toFixed(2)}x`;
    }

    const shareContainer = document.getElementById('sim-damage-share-container');
    if (shareContainer) {
      SvgChartRenderer.renderShareBars(shareContainer, slotStatsList);
    }

    const curveContainer = document.getElementById('sim-damage-curve-container');
    if (curveContainer) {
      const seconds = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
      const xLabels = seconds.map((s) => `${s}с`);

      const seriesList: ChartSeries[] = [];
      activeSlots.forEach((slot) => {
        const stats = this.calculateSlotStats(slot);
        seriesList.push({
          id: slot.weaponId,
          name: stats.weaponName,
          color: stats.weaponColor,
          values: seconds.map((s) => Math.round(stats.totalDps * s)),
          unit: 'урон'
        });
      });

      if (activeSlots.length > 1) {
        seriesList.push({
          id: 'total-build',
          name: 'Суммарный урон всего билда',
          color: '#2563eb',
          dashed: true,
          values: seconds.map((s) => Math.round(totalDps * s)),
          unit: 'урон'
        });
      }

      SvgChartRenderer.renderLineChart(curveContainer, seriesList, {
        xLabels,
        fillArea: true
      });
    }

    const levelCurveContainer = document.getElementById('sim-level-curve-container');
    if (levelCurveContainer) {
      const levels = Array.from({ length: 20 }, (_, i) => i + 1);
      const xLabels = levels.map((l) => `L${l}`);

      const seriesList: ChartSeries[] = [];
      activeSlots.forEach((slot) => {
        const w = this.draftBalance.weapons[slot.weaponId];
        const color = WEAPON_COLORS[slot.weaponId] || '#3b82f6';
        const values = levels.map((lvl) => {
          const stats = this.calculateSlotStats({ weaponId: slot.weaponId, level: lvl });
          return Math.round(stats.totalDps);
        });
        seriesList.push({
          id: slot.weaponId,
          name: w?.name || slot.weaponId,
          color,
          values,
          unit: 'DPS'
        });
      });

      if (activeSlots.length > 0) {
        const totalBuildValues = levels.map((lvl) => {
          let sum = 0;
          activeSlots.forEach((slot) => {
            const stats = this.calculateSlotStats({ weaponId: slot.weaponId, level: lvl });
            sum += stats.totalDps;
          });
          return Math.round(sum);
        });

        seriesList.push({
          id: 'total-build-level',
          name: 'Суммарный DPS билда (L1-L20)',
          color: '#1e293b',
          dashed: true,
          values: totalBuildValues,
          unit: 'DPS'
        });
      }

      SvgChartRenderer.renderLineChart(levelCurveContainer, seriesList, {
        xLabels,
        fillArea: false
      });
    }
  }

  private renderSimulationWeaponSlots(): void {
    const container = document.getElementById('sim-weapon-slots-container');
    if (!container) return;
    container.innerHTML = '';

    const weapons = Object.values(this.draftBalance.weapons);
    const activeCount = this.simSlots.filter((s) => s.enabled).length;
    const countBadge = document.getElementById('sim-active-slots-count');
    if (countBadge) countBadge.innerText = `Активно: ${activeCount} из 5`;

    this.simSlots.forEach((slot, idx) => {
      const w = this.draftBalance.weapons[slot.weaponId] || weapons[0];
      const stats = this.calculateSlotStats(slot);
      const texture = getEntityTexture('weapons', w.id);

      const card = document.createElement('div');
      card.className = `weapon-slot-card ${slot.enabled ? '' : 'disabled'}`;
      card.dataset.slotIndex = String(idx);

      const weaponOptions = weapons
        .map(
          (item) =>
            `<option value="${item.id}" ${item.id === slot.weaponId ? 'selected' : ''}>${item.icon || '⚔️'} ${item.name}</option>`
        )
        .join('');

      card.innerHTML = `
        <div class="slot-header">
          <label class="slot-toggle-label">
            <input type="checkbox" class="sim-slot-toggle" data-slot="${idx}" ${slot.enabled ? 'checked' : ''}>
            <span>Слот ${idx + 1}</span>
            <img src="${texture}" style="width:20px; height:20px; object-fit:contain; border-radius:4px; margin-left:4px;" alt="">
          </label>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:var(--text-muted);">${slot.enabled ? 'В бою' : 'Выключен'}</span>
            <span class="slot-stat-tag" style="font-weight:700; color:var(--accent-primary); font-size:13px;" id="sim-slot-dps-${idx}">
              ${slot.enabled ? `${Math.round(stats.totalDps).toLocaleString()} DPS` : '0 DPS'}
            </span>
          </div>
        </div>
        <div class="slot-controls-row">
          <select class="form-input sim-slot-weapon" data-slot="${idx}" ${slot.enabled ? '' : 'disabled'} style="font-weight:600;">
            ${weaponOptions}
          </select>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:12px; font-weight:600; color:var(--text-muted); white-space:nowrap;">Ур.</span>
            <input type="range" class="stat-slider sim-slot-level-slider" data-slot="${idx}" min="1" max="20" step="1" value="${slot.level}" ${slot.enabled ? '' : 'disabled'}>
            <input type="number" class="stat-input sim-slot-level-input" data-slot="${idx}" min="1" max="20" step="1" value="${slot.level}" style="width:48px;" ${slot.enabled ? '' : 'disabled'}>
          </div>
        </div>
        <div class="slot-stats-preview">
          <span>Залп: <strong id="sim-slot-dmg-${idx}">${Math.round(stats.hitDamage)}</strong></span>
          <span>Кулдаун: <strong id="sim-slot-cd-${idx}">${stats.effectiveCooldown.toFixed(2)}с</strong></span>
          <span>Фокус DPS: <strong>${Math.round(stats.singleTargetDps)}</strong></span>
        </div>
      `;

      container.appendChild(card);
    });
  }
}

// Start Admin Controller on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const admin = new AdminController();
  admin.init().catch(console.error);
});
