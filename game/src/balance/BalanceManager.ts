import {
  GameBalanceState,
  WeaponBalanceConfig,
  HeroBalanceConfig,
  MonsterBalanceConfig,
  BossBalanceConfig,
  GlobalBalanceConfig,
  BalanceRow,
  BalanceChangeEvent
} from './BalanceTypes';
import { DEFAULT_BALANCE } from './defaultBalance';
import { getPublicSupabaseClient } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

class BalanceManagerService {
  private currentBalance: GameBalanceState = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
  private listeners: Set<(event: BalanceChangeEvent) => void> = new Set();
  private realtimeChannel: RealtimeChannel | null = null;
  public isSyncedWithSupabase: boolean = false;
  public lastSyncTime: number = 0;
  private isInitializing: boolean = false;

  constructor() {
    // Current balance starts with default balance
  }

  public async init(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      const client = getPublicSupabaseClient();
      if (!client) {
        console.info(
          '[BalanceManager] Supabase credentials not found or placeholder used. Operating on local reference balance (BALANCE_REFERENCE.md).'
        );
        return;
      }

      console.info('[BalanceManager] Fetching active game balance from Supabase...');
      const { data, error } = await client.from('game_balance').select('*');

      if (error) {
        console.warn(
          '[BalanceManager] Failed to fetch balance from Supabase table "game_balance":',
          error.message,
          'Using default reference balance.'
        );
      } else if (data && data.length > 0) {
        console.info(`[BalanceManager] Loaded ${data.length} balance entries from Supabase.`);
        for (const row of data as BalanceRow[]) {
          this.applyRowInternal(row, false);
        }
        this.isSyncedWithSupabase = true;
        this.lastSyncTime = Date.now();
      } else {
        console.info(
          '[BalanceManager] Table "game_balance" is empty in Supabase. Using default balance.'
        );
      }

      this.subscribeRealtime(client);
    } catch (err) {
      console.warn('[BalanceManager] Initialization error:', err);
    } finally {
      this.isInitializing = false;
    }
  }

  private subscribeRealtime(client: ReturnType<typeof getPublicSupabaseClient>): void {
    if (!client) return;
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.unsubscribe();
      } catch {
        // ignore
      }
    }

    try {
      this.realtimeChannel = client
        .channel('game_balance_feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_balance' },
          (payload) => {
            console.log('[BalanceManager] Realtime balance event received:', payload.eventType, payload.new);
            const row = (payload.new || payload.old) as BalanceRow | undefined;
            if (row && row.category && row.key) {
              this.applyRowInternal(row, true);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.info('[BalanceManager] Realtime live balance subscription active.');
          }
        });
    } catch (e) {
      console.warn('[BalanceManager] Failed to setup realtime subscription:', e);
    }
  }

  public applyRow(row: BalanceRow): void {
    this.applyRowInternal(row, true);
  }

  private applyRowInternal(row: BalanceRow, notify: boolean): void {
    const { category, key, data, name } = row;
    if (!data) return;

    let desc = '';

    switch (category) {
      case 'weapon': {
        const existing = this.currentBalance.weapons[key] || DEFAULT_BALANCE.weapons[key];
        const updated = { ...existing, ...data } as WeaponBalanceConfig;
        this.currentBalance.weapons[key] = updated;
        desc = `Оружие «${updated.name || name || key}»: Урон ${updated.damage}, КД ${updated.cooldown}с`;
        break;
      }
      case 'hero': {
        const existing = this.currentBalance.heroes[key] || DEFAULT_BALANCE.heroes[key];
        const updated = { ...existing, ...data } as HeroBalanceConfig;
        this.currentBalance.heroes[key] = updated;
        desc = `Герой «${updated.name || name || key}»: HP ${updated.maxHp}, Скорость ${updated.baseSpeed}`;
        break;
      }
      case 'monster': {
        const existing = this.currentBalance.monsters[key] || DEFAULT_BALANCE.monsters[key];
        const updated = { ...existing, ...data } as MonsterBalanceConfig;
        this.currentBalance.monsters[key] = updated;
        desc = `Монстр «${updated.name || name || key}»: HP ${updated.hp}, Урон ${updated.damage}`;
        break;
      }
      case 'boss': {
        const existing = this.currentBalance.bosses[key] || DEFAULT_BALANCE.bosses[key];
        const updated = { ...existing, ...data } as BossBalanceConfig;
        this.currentBalance.bosses[key] = updated;
        desc = `Босс «${updated.name || name || key}»: HP ${updated.hp}, Урон ${updated.damage}`;
        break;
      }
      case 'global': {
        this.currentBalance.global = { ...this.currentBalance.global, ...data } as GlobalBalanceConfig;
        desc = 'Глобальные боевые параметры обновлены';
        break;
      }
    }

    this.isSyncedWithSupabase = true;
    this.lastSyncTime = Date.now();

    if (notify) {
      const event: BalanceChangeEvent = {
        category,
        key,
        name: name || key,
        description: desc,
        data,
        timestamp: Date.now()
      };
      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (err) {
          console.error('[BalanceManager] Error in balance change listener:', err);
        }
      }
    }
  }

  public getWeaponConfig(id: string): WeaponBalanceConfig {
    if (this.currentBalance.weapons[id]) {
      return this.currentBalance.weapons[id];
    }
    if (DEFAULT_BALANCE.weapons[id]) {
      return DEFAULT_BALANCE.weapons[id];
    }
    return {
      id,
      name: id,
      icon: '⚔️',
      damage: 20,
      cooldown: 0.8,
      damagePerLevel: 5,
      maxLevel: 12
    };
  }

  public getHeroConfig(id: string): HeroBalanceConfig {
    if (this.currentBalance.heroes[id]) {
      return this.currentBalance.heroes[id];
    }
    if (DEFAULT_BALANCE.heroes[id]) {
      return DEFAULT_BALANCE.heroes[id];
    }
    return {
      id,
      name: id,
      maxHp: 100,
      baseSpeed: 8.5,
      damageMultiplier: 1.0,
      startingWeapon: 'bow'
    };
  }

  public getEnemyConfig(type: string): MonsterBalanceConfig {
    if (this.currentBalance.monsters[type]) {
      return this.currentBalance.monsters[type];
    }
    if (DEFAULT_BALANCE.monsters[type]) {
      return DEFAULT_BALANCE.monsters[type];
    }
    return {
      id: type,
      name: type,
      hp: 50,
      speed: 4.0,
      damage: 10
    };
  }

  public getBossConfig(type: string): BossBalanceConfig {
    if (this.currentBalance.bosses[type]) {
      return this.currentBalance.bosses[type];
    }
    if (DEFAULT_BALANCE.bosses[type]) {
      return DEFAULT_BALANCE.bosses[type];
    }
    return {
      id: type,
      name: type,
      hp: 10000,
      speed: 2.5,
      damage: 50
    };
  }

  public getGlobalConfig(): GlobalBalanceConfig {
    return this.currentBalance.global;
  }

  public getAllBalance(): GameBalanceState {
    return JSON.parse(JSON.stringify(this.currentBalance));
  }

  public addListener(fn: (event: BalanceChangeEvent) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public cleanup(): void {
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.unsubscribe();
      } catch {
        // ignore
      }
      this.realtimeChannel = null;
    }
    this.listeners.clear();
  }
}

export const BalanceManager = new BalanceManagerService();
