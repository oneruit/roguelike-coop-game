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
import { renderGlobal } from './views/globalView';
import { DEFAULT_BALANCE } from '../../game/src/balance/defaultBalance';

export class AdminController {
  public state: BalanceState;
  public supabase: SupabaseService;
  public modal: ModalManager;
  public progression: ProgressionView;
  public simulation: SimulationView;

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

    // Expand All / Collapse All buttons
    document.getElementById('btn-expand-all')?.addEventListener('click', () => {
      this.expandAllCurrentTab();
    });
    document.getElementById('btn-collapse-all')?.addEventListener('click', () => {
      this.collapseAllCurrentTab();
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
      if (confirm('Сбросить параметры всех 13 видов оружия к значениям из BALANCE_REFERENCE.md?')) {
        for (const key of Object.keys(DEFAULT_BALANCE.weapons)) {
          this.state.draftBalance.weapons[key] = JSON.parse(JSON.stringify(DEFAULT_BALANCE.weapons[key]));
        }
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

    document.getElementById('btn-reset-global-all')?.addEventListener('click', () => {
      if (confirm('Сбросить глобальные настройки к defaults?')) {
        this.state.draftBalance.global = JSON.parse(JSON.stringify(DEFAULT_BALANCE.global));
        this.state.checkAllCategoryChanges('global');
        this.renderGlobal();
        updateOverviewStats(this.state);
      }
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

    if (target === 'dashboard') renderDashboard(this.state);
    else if (target === 'progression') this.progression.render();
    else if (target === 'simulation') this.simulation.render();
    else if (target === 'weapons') this.renderWeapons();
    else if (target === 'heroes') this.renderHeroes();
    else if (target === 'monsters') this.renderMonsters();
    else if (target === 'bosses') this.renderBosses();
    else if (target === 'global') this.renderGlobal();
  }

  public applyFilter(): void {
    if (this.state.activeTab === 'weapons') this.renderWeapons();
    else if (this.state.activeTab === 'heroes') this.renderHeroes();
    else if (this.state.activeTab === 'monsters') this.renderMonsters();
    else if (this.state.activeTab === 'bosses') this.renderBosses();
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
    });

    // Update weapon metrics live if applicable
    const parts = path.split('.');
    if (parts[0] === 'weapons') {
      const wid = parts[1];
      const weapon = this.state.draftBalance.weapons[wid];
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

    const category = parts[0];
    const entityId = parts[1];
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

  public renderGlobal(): void {
    renderGlobal(this.state, (path, val) => this.handleFieldChange(path, val));
  }

  public renderAll(): void {
    renderDashboard(this.state);
    this.renderWeapons();
    this.renderHeroes();
    this.renderMonsters();
    this.renderBosses();
    this.renderGlobal();
    this.progression.render();
    this.simulation.render();
  }
}

// Start Admin Controller on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const admin = new AdminController();
  admin.init().catch(console.error);
});
