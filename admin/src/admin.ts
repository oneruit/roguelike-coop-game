import { BalanceState } from './state/balanceState';
import { SupabaseService } from './api/supabaseService';
import { ModalManager } from './ui/modal';
import { showToast } from './ui/toast';
import { ProgressionView } from './views/progressionView';
import { SimulationView } from './views/simulationView';
import { renderDashboard, updateOverviewStats } from './views/dashboardView';
import { renderWeapons } from './views/weaponsView';
import { renderHeroes } from './views/heroesView';
import { renderMonsters } from './views/monstersView';
import { renderBosses } from './views/bossesView';
import { renderPassives } from './views/passivesView';
import { renderItems } from './views/itemsView';
import { renderTalents } from './views/talentsView';
import { renderMerchant } from './views/merchantView';
import { renderGlobal } from './views/globalView';
import { renderLeaderboards, exportLeaderboardJson } from './views/leaderboardsView';
import { DEFAULT_BALANCE } from '../../game/src/balance/defaultBalance';

export class AdminController {
  public state: BalanceState;
  public supabase: SupabaseService;
  public modal: ModalManager;
  public progression: ProgressionView;
  public simulation: SimulationView;
  public selectedTalentsBranchFilter: string = 'all';

  constructor() {
    this.state = new BalanceState();
    this.supabase = new SupabaseService(this.state, () => {
      this.renderAll();
      updateOverviewStats(this.state);
    });
    this.modal = new ModalManager(this.state, () => this.supabase.deploy());
    this.progression = new ProgressionView(this.state);
    this.simulation = new SimulationView(this.state);

    this.bindDOM();
  }

  public async init(): Promise<void> {
    await this.supabase.loadConfig();
    await this.supabase.connect();
    await this.supabase.fetchLeaderboards();
    this.renderAll();
    updateOverviewStats(this.state);
  }

  private bindDOM(): void {
    // Navigation Tabs
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

        const current = this.state.tableSorts[table] || { col: 'name', dir: 'asc' };
        let newDir: 'asc' | 'desc' = 'asc';
        if (current.col === sortKey) {
          newDir = current.dir === 'asc' ? 'desc' : 'asc';
        }
        this.state.tableSorts[table] = { col: sortKey, dir: newDir };
        this.updateSortHeaderUI(table);

        if (table === 'weapons') this.renderWeapons();
        else if (table === 'heroes') this.renderHeroes();
        else if (table === 'monsters') this.renderMonsters();
        else if (table === 'bosses') this.renderBosses();
        else if (table === 'passives') this.renderPassives();
        else if (table === 'items') this.renderItems();
        else if (table === 'talents') this.renderTalents();
        else if (table === 'leaderboards') this.renderLeaderboards();
      });
    });

    // Global Search Bar in Topbar
    const searchInput = document.getElementById('global-search') as HTMLInputElement;
    const clearBtn = document.getElementById('btn-clear-search');

    const sanitizeSearchAutofill = () => {
      if (!searchInput) return;
      const val = searchInput.value.trim();
      if (
        val.startsWith('http://') ||
        val.startsWith('https://') ||
        (this.supabase.config.url && val === this.supabase.config.url)
      ) {
        searchInput.value = '';
        this.state.searchFilter = '';
        clearBtn?.classList.add('hidden');
        this.applyFilter();
      }
    };

    if (searchInput) {
      sanitizeSearchAutofill();
      setTimeout(sanitizeSearchAutofill, 100);
      setTimeout(sanitizeSearchAutofill, 500);
      setTimeout(sanitizeSearchAutofill, 1500);

      searchInput.addEventListener('input', (e) => {
        const raw = (e.target as HTMLInputElement).value;
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
          searchInput.value = '';
          this.state.searchFilter = '';
          clearBtn?.classList.add('hidden');
          this.applyFilter();
          return;
        }
        this.state.searchFilter = raw.toLowerCase().trim();
        if (clearBtn) {
          clearBtn.classList.toggle('hidden', !this.state.searchFilter);
        }
        this.applyFilter();
      });
    }

    if (clearBtn && searchInput) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.state.searchFilter = '';
        clearBtn.classList.add('hidden');
        this.applyFilter();
        searchInput.focus();
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

    // Top action buttons
    document.getElementById('btn-save')?.addEventListener('click', () => {
      this.modal.openReviewModal(Boolean(this.supabase.config.adminKey));
    });
    document.getElementById('banner-review-btn')?.addEventListener('click', () => {
      this.modal.openReviewModal(Boolean(this.supabase.config.adminKey));
    });
    document.getElementById('btn-discard')?.addEventListener('click', () => {
      if (confirm('Сбросить все несохраненные изменения черновика?')) {
        this.state.discardDraft();
        this.renderAll();
        updateOverviewStats(this.state);
        showToast('Черновик сброшен к исходным значениям.', 'info');
      }
    });

    // Help link jumps to connection tab
    document.getElementById('btn-help-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchTab('connection');
    });

    // Reset All Category buttons
    document.getElementById('btn-reset-weapons-all')?.addEventListener('click', () => {
      if (confirm('Сбросить параметры всех видов оружия к значениям по умолчанию?')) {
        this.state.draftBalance.weapons = JSON.parse(JSON.stringify(DEFAULT_BALANCE.weapons));
        this.state.checkAllCategoryChanges('weapons');
        this.renderWeapons();
        updateOverviewStats(this.state);
      }
    });

    document.getElementById('btn-reset-heroes-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех героев к defaults?')) {
        this.state.draftBalance.heroes = JSON.parse(JSON.stringify(DEFAULT_BALANCE.heroes));
        this.state.checkAllCategoryChanges('heroes');
        this.renderHeroes();
        updateOverviewStats(this.state);
      }
    });

    document.getElementById('btn-reset-monsters-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех монстров к defaults?')) {
        this.state.draftBalance.monsters = JSON.parse(JSON.stringify(DEFAULT_BALANCE.monsters));
        this.state.checkAllCategoryChanges('monsters');
        this.renderMonsters();
        updateOverviewStats(this.state);
      }
    });

    document.getElementById('btn-reset-bosses-all')?.addEventListener('click', () => {
      if (confirm('Сбросить всех боссов к defaults?')) {
        this.state.draftBalance.bosses = JSON.parse(JSON.stringify(DEFAULT_BALANCE.bosses));
        this.state.checkAllCategoryChanges('bosses');
        this.renderBosses();
        updateOverviewStats(this.state);
      }
    });

    document.getElementById('btn-reset-passives-all')?.addEventListener('click', () => {
      if (confirm('Сбросить все пассивки к defaults?')) {
        this.state.draftBalance.passives = JSON.parse(JSON.stringify(DEFAULT_BALANCE.passives));
        this.state.checkAllCategoryChanges('passives');
        this.renderPassives();
        updateOverviewStats(this.state);
      }
    });

    document.getElementById('btn-reset-items-all')?.addEventListener('click', () => {
      if (confirm('Сбросить все предметы к defaults?')) {
        this.state.draftBalance.items = JSON.parse(JSON.stringify(DEFAULT_BALANCE.items));
        this.state.checkAllCategoryChanges('items');
        this.renderItems();
        updateOverviewStats(this.state);
      }
    });

    document.getElementById('btn-reset-talents-all')?.addEventListener('click', () => {
      if (confirm('Сбросить все таланты к значениям по умолчанию?')) {
        this.state.draftBalance.talents = JSON.parse(JSON.stringify(DEFAULT_BALANCE.talents));
        this.state.checkAllCategoryChanges('talents');
        this.renderTalents();
        updateOverviewStats(this.state);
      }
    });

    document.querySelectorAll('[data-talent-branch]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const branch = (e.currentTarget as HTMLElement).dataset.talentBranch || 'all';
        this.selectedTalentsBranchFilter = branch;
        document.querySelectorAll('[data-talent-branch]').forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.renderTalents();
      });
    });

    document.getElementById('btn-reset-global-all')?.addEventListener('click', () => {
      if (confirm('Сбросить глобальные настройки к defaults?')) {
        this.state.draftBalance.global = JSON.parse(JSON.stringify(DEFAULT_BALANCE.global));
        this.state.checkAllCategoryChanges('global');
        this.renderGlobal();
        updateOverviewStats(this.state);
      }
    });

    document.getElementById('btn-reset-merchant-all')?.addEventListener('click', () => {
      if (confirm('Сбросить параметры торговца к значениям по умолчанию?')) {
        const def = DEFAULT_BALANCE.global;
        this.state.draftBalance.global.merchantSpawnInterval = def.merchantSpawnInterval;
        this.state.draftBalance.global.merchantStayDuration = def.merchantStayDuration;
        this.state.draftBalance.global.merchantPriceCommon = def.merchantPriceCommon;
        this.state.draftBalance.global.merchantPriceUncommon = def.merchantPriceUncommon;
        this.state.draftBalance.global.merchantPriceRare = def.merchantPriceRare;
        this.state.draftBalance.global.merchantPriceLegendary = def.merchantPriceLegendary;
        this.state.draftBalance.global.merchantPriceBoss = def.merchantPriceBoss;
        this.state.draftBalance.global.merchantPriceWeaponUpgrade = def.merchantPriceWeaponUpgrade;
        this.state.checkAllCategoryChanges('global');
        this.renderMerchant();
        updateOverviewStats(this.state);
      }
    });

    // Leaderboard Toolbar buttons & filters
    document.getElementById('btn-refresh-leaderboards')?.addEventListener('click', async () => {
      await this.supabase.fetchLeaderboards();
      this.renderLeaderboards();
      showToast('Таблица лидеров успешно обновлена.', 'success');
    });

    document.getElementById('btn-export-leaderboards')?.addEventListener('click', () => {
      exportLeaderboardJson(this.state.leaderboardEntries);
    });

    document.getElementById('btn-reset-leaderboards-all')?.addEventListener('click', async () => {
      if (confirm('Вы уверены, что хотите сбросить ВСЮ таблицу лидеров? Все рекорды будут удалены безвозвратно!')) {
        await this.supabase.resetAllLeaderboards();
        this.renderLeaderboards();
        showToast('Таблица лидеров полностью очищена.', 'info');
      }
    });

    document.getElementById('filter-leaderboard-hero')?.addEventListener('change', (e) => {
      this.state.leaderboardHeroFilter = (e.target as HTMLSelectElement).value;
      this.renderLeaderboards();
    });

    document.getElementById('filter-leaderboard-victory')?.addEventListener('change', (e) => {
      this.state.leaderboardVictoryFilter = (e.target as HTMLSelectElement).value;
      this.renderLeaderboards();
    });

    // Connection Form & buttons
    document.getElementById('btn-save-conn')?.addEventListener('click', () => {
      this.supabase.saveConnectionSettings();
    });
    const connForm = document.getElementById('connection-form');
    connForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.supabase.saveConnectionSettings();
    });

    document.getElementById('btn-test-conn')?.addEventListener('click', () => this.supabase.testConnection());
    document.getElementById('btn-seed-db')?.addEventListener('click', () => this.supabase.seedDatabase());

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
      showToast('SQL скопирован в буфер обмена!', 'success');
    });
  }

  public switchTab(target: string): void {
    this.state.activeTab = target;
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach((t) => {
      t.classList.toggle('active', (t as HTMLElement).dataset.tab === target);
    });
    document.querySelectorAll('.tab-pane').forEach((p) => {
      p.classList.toggle('active', p.id === `tab-${target}`);
    });

    const pageTitleEl = document.querySelector('.page-title') as HTMLElement | null;
    const pageSubtitleEl = document.querySelector('.page-subtitle') as HTMLElement | null;
    const tabHeaders: Record<string, { title: string; subtitle: string }> = {
      dashboard: {
        title: 'Главная панель',
        subtitle: 'Обзор ключевых показателей игры, быстрый переход к разделам и статус синхронизации'
      },
      weapons: {
        title: 'Арсенал оружия',
        subtitle: 'Параметры базового урона, кулдаунов и DPS оружия'
      },
      heroes: {
        title: 'Герои и персонажи',
        subtitle: 'Характеристики выживаемости, скорости и классовых способностей'
      },
      monsters: {
        title: 'Обычные монстры',
        subtitle: 'Базовые характеристики здоровья, скорости и урона рядовых противников'
      },
      bosses: {
        title: 'Эпические боссы',
        subtitle: 'Боссы арен с фазами ярости и особыми способностями'
      },
      passives: {
        title: 'Пассивные навыки',
        subtitle: 'Бонусы к характеристикам и прокачка пассивок'
      },
      items: {
        title: 'Предметы Разлома',
        subtitle: 'Артефакты, свитки и экипируемые предметы'
      },
      talents: {
        title: 'Мета-прокачка (Таланты)',
        subtitle: 'Улучшения за Кристаллы Разлома: 3 ветки по 10 талантов (до 5 рангов)'
      },
      merchant: {
        title: 'Торговец Разлома',
        subtitle: 'Настройка интервалов визита, времени стоянки и ценовой политики товаров'
      },
      progression: {
        title: 'Скейлинг волн',
        subtitle: 'Динамика сложности, множители характеристик и тайминги волн'
      },
      simulation: {
        title: 'Симулятор DPS',
        subtitle: 'Моделирование урона комбинаций оружия и пассивок'
      },
      global: {
        title: 'Глобальные настройки',
        subtitle: 'Общие коэффициенты и системные константы'
      },
      leaderboards: {
        title: 'Таблица лидеров',
        subtitle: 'Рейтинг выживших игроков, персональные рекорды и управление базой'
      },
      connection: {
        title: 'Подключение к Supabase',
        subtitle: 'Настройки доступа и статус синхронизации базы данных'
      }
    };
    if (tabHeaders[target]) {
      if (pageTitleEl) pageTitleEl.innerText = tabHeaders[target].title;
      if (pageSubtitleEl) pageSubtitleEl.innerText = tabHeaders[target].subtitle;
    }

    try {
      if (target === 'dashboard') renderDashboard(this.state);
      else if (target === 'progression') this.progression.render();
      else if (target === 'simulation') this.simulation.render();
      else if (target === 'weapons') this.renderWeapons();
      else if (target === 'heroes') this.renderHeroes();
      else if (target === 'monsters') this.renderMonsters();
      else if (target === 'bosses') this.renderBosses();
      else if (target === 'passives') this.renderPassives();
      else if (target === 'items') this.renderItems();
      else if (target === 'talents') this.renderTalents();
      else if (target === 'merchant') this.renderMerchant();
      else if (target === 'global') this.renderGlobal();
      else if (target === 'leaderboards') this.renderLeaderboards();
    } catch (err) {
      console.error(`Ошибка при отрисовке раздела ${target}:`, err);
    }
  }

  public applyFilter(): void {
    if (this.state.activeTab === 'weapons') this.renderWeapons();
    else if (this.state.activeTab === 'heroes') this.renderHeroes();
    else if (this.state.activeTab === 'monsters') this.renderMonsters();
    else if (this.state.activeTab === 'bosses') this.renderBosses();
    else if (this.state.activeTab === 'passives') this.renderPassives();
    else if (this.state.activeTab === 'items') this.renderItems();
    else if (this.state.activeTab === 'talents') this.renderTalents();
    else if (this.state.activeTab === 'merchant') this.renderMerchant();
    else if (this.state.activeTab === 'leaderboards') this.renderLeaderboards();
    else if (this.state.activeTab === 'dashboard') {
      // If user is searching on dashboard, jump to weapons to show results
      if (this.state.searchFilter) {
        this.switchTab('weapons');
      }
    }
  }

  public clearSearch(): void {
    const searchInput = document.getElementById('global-search') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
    this.state.searchFilter = '';
    document.getElementById('btn-clear-search')?.classList.add('hidden');
    this.applyFilter();
  }

  public expandAllCurrentTab(): void {
    const tab = this.state.activeTab;
    if (tab === 'weapons') {
      Object.keys(this.state.draftBalance.weapons).forEach((k) => this.state.expandedRows.add(`weapons-${k}`));
      this.renderWeapons();
    } else if (tab === 'heroes') {
      Object.keys(this.state.draftBalance.heroes).forEach((k) => this.state.expandedRows.add(`heroes-${k}`));
      this.renderHeroes();
    } else if (tab === 'monsters') {
      Object.keys(this.state.draftBalance.monsters).forEach((k) => this.state.expandedRows.add(`monsters-${k}`));
      this.renderMonsters();
    } else if (tab === 'bosses') {
      Object.keys(this.state.draftBalance.bosses).forEach((k) => this.state.expandedRows.add(`bosses-${k}`));
      this.renderBosses();
    } else if (tab === 'passives') {
      Object.keys(this.state.draftBalance.passives || {}).forEach((k) => this.state.expandedRows.add(`passives-${k}`));
      this.renderPassives();
    } else if (tab === 'items') {
      Object.keys(this.state.draftBalance.items || {}).forEach((k) => this.state.expandedRows.add(`items-${k}`));
      this.renderItems();
    }
  }

  public collapseAllCurrentTab(): void {
    const tab = this.state.activeTab;
    if (tab === 'weapons') {
      Object.keys(this.state.draftBalance.weapons).forEach((k) => this.state.expandedRows.delete(`weapons-${k}`));
      this.renderWeapons();
    } else if (tab === 'heroes') {
      Object.keys(this.state.draftBalance.heroes).forEach((k) => this.state.expandedRows.delete(`heroes-${k}`));
      this.renderHeroes();
    } else if (tab === 'monsters') {
      Object.keys(this.state.draftBalance.monsters).forEach((k) => this.state.expandedRows.delete(`monsters-${k}`));
      this.renderMonsters();
    } else if (tab === 'bosses') {
      Object.keys(this.state.draftBalance.bosses).forEach((k) => this.state.expandedRows.delete(`bosses-${k}`));
      this.renderBosses();
    } else if (tab === 'passives') {
      Object.keys(this.state.draftBalance.passives || {}).forEach((k) => this.state.expandedRows.delete(`passives-${k}`));
      this.renderPassives();
    } else if (tab === 'items') {
      Object.keys(this.state.draftBalance.items || {}).forEach((k) => this.state.expandedRows.delete(`items-${k}`));
      this.renderItems();
    }
  }

  private updateSortHeaderUI(table: string): void {
    const sort = this.state.tableSorts[table];
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

  public handleFieldChange(path: string, val: number): void {
    this.state.applyFieldChange(path, val);
    updateOverviewStats(this.state);

    // Live update UI element inputs matching this path
    const allMatching = document.querySelectorAll<HTMLInputElement>(`[data-path="${path}"]`);
    allMatching.forEach((el) => {
      if (el.value !== String(val)) el.value = String(val);
      if (el.classList.contains('stat-input')) {
        const origVal = this.state.getOriginalValue(path);
        el.classList.toggle('is-changed', origVal !== val);
      }
      const statField = el.closest('.stat-field');
      if (statField) {
        const origVal = this.state.getOriginalValue(path);
        const isChanged = origVal !== undefined && origVal !== val;
        const currentBadge = statField.querySelector<HTMLElement>('.stat-val-current') || statField.querySelector<HTMLElement>('.stat-val-badge');
        if (currentBadge) {
          currentBadge.textContent = String(val);
          currentBadge.classList.toggle('val-changed', isChanged);
        }
        const origBadge = statField.querySelector<HTMLElement>('.stat-val-orig');
        if (origBadge) {
          origBadge.style.display = isChanged ? '' : 'none';
          if (origVal !== undefined) origBadge.textContent = String(origVal);
        }
      }
    });

    // Update weapon metrics live if applicable
    const parts = path.split('.');
    const category = parts[0];
    const entityId = parts[1];
    const field = parts[2];

    if (category === 'weapons') {
      const weapon = this.state.draftBalance.weapons[entityId];
      if (weapon) {
        const cd = weapon.cooldown > 0 ? weapon.cooldown : 0.4;
        const count = weapon.count || 1;
        const baseDps = ((weapon.damage * count) / cd).toFixed(1);
        const l12Dmg = weapon.damage + 11 * weapon.damagePerLevel;
        const l12Dps = ((l12Dmg * count) / cd).toFixed(1);

        const elBase = document.getElementById(`dps-${entityId}-base`);
        const elL12 = document.getElementById(`dps-${entityId}-l12`);
        const elRowDps1 = document.getElementById(`row-stat-dps1-${entityId}`);
        const elRowDps12 = document.getElementById(`row-stat-dps12-${entityId}`);
        const elRowDmg = document.getElementById(`row-stat-damage-${entityId}`);
        const elRowCd = document.getElementById(`row-stat-cooldown-${entityId}`);

        if (elBase) elBase.innerText = baseDps;
        if (elL12) elL12.innerText = l12Dps;
        if (elRowDps1) elRowDps1.innerText = baseDps;
        if (elRowDps12) elRowDps12.innerText = l12Dps;
        if (elRowDmg) elRowDmg.innerHTML = `<span>${weapon.damage}</span>`;
        if (elRowCd) elRowCd.innerHTML = `<span>${weapon.cooldown}с</span>`;
      }
    } else if (category === 'heroes') {
      const hero = this.state.draftBalance.heroes[entityId];
      if (hero) {
        if (field === 'maxHp') {
          const el = document.getElementById(`row-stat-hp-${entityId}`);
          if (el) el.innerHTML = `<span>${hero.maxHp} HP</span>`;
        } else if (field === 'baseSpeed') {
          const el = document.getElementById(`row-stat-speed-${entityId}`);
          if (el) el.innerHTML = `<span>${hero.baseSpeed} м/с</span>`;
        } else if (field === 'damageMultiplier') {
          const el = document.getElementById(`row-stat-dmgmult-${entityId}`);
          if (el) el.innerText = `${hero.damageMultiplier}x`;
        }
      }
    } else if (category === 'monsters') {
      const monster = this.state.draftBalance.monsters[entityId];
      if (monster) {
        if (field === 'hp') {
          const el = document.getElementById(`row-stat-hp-${entityId}`);
          if (el) el.innerHTML = `<span>${monster.hp} HP</span>`;
        } else if (field === 'speed') {
          const el = document.getElementById(`row-stat-speed-${entityId}`);
          if (el) el.innerHTML = `<span>${monster.speed} м/с</span>`;
        } else if (field === 'damage') {
          const el = document.getElementById(`row-stat-damage-${entityId}`);
          if (el) el.innerText = `${monster.damage}`;
        }
      }
    } else if (category === 'bosses') {
      const boss = this.state.draftBalance.bosses[entityId];
      if (boss) {
        if (field === 'hp') {
          const el = document.getElementById(`row-stat-hp-${entityId}`);
          if (el) el.innerHTML = `<span>${boss.hp.toLocaleString()} HP</span>`;
        } else if (field === 'speed') {
          const el = document.getElementById(`row-stat-speed-${entityId}`);
          if (el) el.innerHTML = `<span>${boss.speed} м/с</span>`;
        } else if (field === 'damage') {
          const el = document.getElementById(`row-stat-damage-${entityId}`);
          if (el) el.innerText = `${boss.damage}`;
        }
      }
    } else if (category === 'passives') {
      const passive = this.state.draftBalance.passives[entityId];
      if (passive) {
        if (field === 'baseValue') {
          const el = document.getElementById(`row-stat-base-${entityId}`);
          if (el) el.innerHTML = `<span class="stat-highlight">${passive.baseValue}</span>`;
        } else if (field === 'perStackValue') {
          const el = document.getElementById(`row-stat-stack-${entityId}`);
          if (el) el.innerHTML = `<span>+${passive.perStackValue} / стак</span>`;
        } else if (field === 'maxValue') {
          const el = document.getElementById(`row-stat-cap-${entityId}`);
          if (el) el.innerHTML = `<span>${passive.maxValue !== undefined ? passive.maxValue : '∞'}</span>`;
        }
      }
    } else if (category === 'items') {
      const item = this.state.draftBalance.items[entityId];
      if (item) {
        if (field === 'baseValue') {
          const el = document.getElementById(`row-stat-base-${entityId}`);
          if (el) el.innerHTML = `<span class="stat-highlight">${item.baseValue !== undefined ? item.baseValue : '—'}</span>`;
        }
      }
    } else if (category === 'talents') {
      const talent = this.state.draftBalance.talents[entityId];
      if (talent) {
        if (field === 'bonusPerLevel') {
          const el = document.getElementById(`row-stat-bonus-${entityId}`);
          if (el) {
            const bonusDisplay = talent.unit === '%' ? `+${(talent.bonusPerLevel * 100).toFixed(1)}%` : `+${talent.bonusPerLevel} ${talent.unit || ''}`;
            el.innerHTML = `<span class="stat-highlight">${bonusDisplay}</span><span style="font-size:10px; color:var(--text-secondary); margin-left:4px;">/ ранг</span>`;
          }
        } else if (field === 'maxLevel') {
          const el = document.getElementById(`row-stat-maxlevel-${entityId}`);
          if (el) el.innerText = String(talent.maxLevel);
        }
      }
    }

    if (category && entityId) {
      const rowItem = document.querySelector(`[data-row-id="${category}-${entityId}"]`);
      if (rowItem) {
        const hasItemMods = Array.from(this.state.modifiedPaths).some((p) => p.startsWith(`${category}.${entityId}.`));
        rowItem.classList.toggle('is-modified', hasItemMods);
        const statusBadge = rowItem.querySelector('.accordion-col-status');
        if (statusBadge) {
          statusBadge.innerHTML = hasItemMods
            ? '<span class="status-badge-chip badge-modified">Изменено</span>'
            : '<span class="status-badge-chip badge-default">Дефолт</span>';
        }
      }
    }
  }

  public renderWeapons(): void {
    renderWeapons(
      this.state,
      (cat, id) => {
        this.state.resetSingleItem(cat, id);
        this.renderWeapons();
        updateOverviewStats(this.state);
      },
      (path, val) => this.handleFieldChange(path, val),
      () => this.clearSearch()
    );
  }

  public renderHeroes(): void {
    renderHeroes(
      this.state,
      (cat, id) => {
        this.state.resetSingleItem(cat, id);
        this.renderHeroes();
        updateOverviewStats(this.state);
      },
      (path, val) => this.handleFieldChange(path, val),
      () => this.clearSearch()
    );
  }

  public renderMonsters(): void {
    renderMonsters(
      this.state,
      (cat, id) => {
        this.state.resetSingleItem(cat, id);
        this.renderMonsters();
        updateOverviewStats(this.state);
      },
      (path, val) => this.handleFieldChange(path, val),
      () => this.clearSearch()
    );
  }

  public renderBosses(): void {
    renderBosses(
      this.state,
      (cat, id) => {
        this.state.resetSingleItem(cat, id);
        this.renderBosses();
        updateOverviewStats(this.state);
      },
      (path, val) => this.handleFieldChange(path, val),
      () => this.clearSearch()
    );
  }

  public renderPassives(): void {
    renderPassives(
      this.state,
      (cat, id) => {
        this.state.resetSingleItem(cat, id);
        this.renderPassives();
        updateOverviewStats(this.state);
      },
      (path, val) => this.handleFieldChange(path, val),
      () => this.clearSearch()
    );
  }

  public renderItems(): void {
    renderItems(
      this.state,
      (cat, id) => {
        this.state.resetSingleItem(cat, id);
        this.renderItems();
        updateOverviewStats(this.state);
      },
      (path, val) => this.handleFieldChange(path, val),
      () => this.clearSearch()
    );
  }

  public renderTalents(): void {
    renderTalents(
      this.state,
      (cat, id) => {
        this.state.resetSingleItem(cat, id);
        this.renderTalents();
        updateOverviewStats(this.state);
      },
      (path, val) => this.handleFieldChange(path, val),
      () => this.clearSearch(),
      this.selectedTalentsBranchFilter
    );
  }

  public renderMerchant(): void {
    try {
      renderMerchant(this.state, (path, val) => this.handleFieldChange(path, val));
    } catch (err) {
      console.error('Error rendering merchant view:', err);
    }
  }

  public renderGlobal(): void {
    renderGlobal(this.state, (path, val) => this.handleFieldChange(path, val));
  }

  public renderLeaderboards(): void {
    try {
      renderLeaderboards(this.state, this.supabase, () => this.renderLeaderboards());
    } catch (err) {
      console.error('Error rendering leaderboards view:', err);
    }
  }

  public renderAll(): void {
    renderDashboard(this.state);
    this.renderWeapons();
    this.renderHeroes();
    this.renderMonsters();
    this.renderBosses();
    this.renderPassives();
    this.renderItems();
    this.renderTalents();
    this.renderMerchant();
    this.renderGlobal();
    this.renderLeaderboards();
    this.progression.render();
    this.simulation.render();
  }
}

// Start Admin Controller on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const admin = new AdminController();
  admin.init().catch(console.error);
});
