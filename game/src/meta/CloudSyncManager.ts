import { AuthManager, AuthUser } from '../auth/AuthManager';
import { getAuthSupabaseClient } from '../balance/supabaseClient';
import { MetaProgression } from './MetaProgression';
import { ProgressionManager } from '../core/ProgressionManager';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export interface PlayerProfileRow {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  crystals: number;
  lifetime_crystals: number;
  meta_upgrades: Record<string, number>;
  progression_data: any;
  updated_at?: string;
}

/**
 * Cloud Synchronization Manager for The Rift.
 * Bridges local client storage (MetaProgression & ProgressionManager)
 * with the player_profiles table in Supabase.
 */
export class CloudSyncManager {
  private static instance: CloudSyncManager | null = null;
  private isInitialized = false;
  private isSyncing = false;
  private saveTimeoutId: number | null = null;
  private syncStatus: SyncState = 'idle';
  private statusListeners: Set<(state: SyncState, message?: string) => void> = new Set();

  private constructor() {}

  public static getInstance(): CloudSyncManager {
    if (!CloudSyncManager.instance) {
      CloudSyncManager.instance = new CloudSyncManager();
    }
    return CloudSyncManager.instance;
  }

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to Auth State changes
    AuthManager.getInstance().onAuthStateChanged((user) => {
      if (!user.isGuest) {
        this.syncOnLogin(user).catch((err) => {
          console.warn('[CloudSyncManager] syncOnLogin error:', err);
        });
      }
    });

    // Listen to local progress changes to trigger auto-cloud saves
    MetaProgression.getInstance().onChange(() => {
      this.scheduleSave();
    });

    ProgressionManager.getInstance().onSave(() => {
      this.scheduleSave();
    });

    // Check if user is already authenticated on boot
    const currentUser = AuthManager.getInstance().getUser();
    if (currentUser && !currentUser.isGuest) {
      this.syncOnLogin(currentUser).catch((err) => {
        console.warn('[CloudSyncManager] Initial boot sync error:', err);
      });
    }
  }

  public getStatus(): SyncState {
    return this.syncStatus;
  }

  public onStatusChanged(listener: (state: SyncState, message?: string) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(state: SyncState, message?: string): void {
    this.syncStatus = state;
    for (const listener of this.statusListeners) {
      try {
        listener(state, message);
      } catch (e) {
        console.error('[CloudSyncManager] Listener error:', e);
      }
    }
  }

  /**
   * Called when a player logs in via Google/Email.
   * Pulls existing cloud save or uploads guest progress if cloud row is empty.
   */
  public async syncOnLogin(user: AuthUser): Promise<void> {
    if (user.isGuest || this.isSyncing) return;

    const supabase = getAuthSupabaseClient();
    if (!supabase) return;

    this.isSyncing = true;
    this.setStatus('syncing', 'Синхронизация с облаком...');

    try {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[CloudSyncManager] Error fetching player profile:', error);
        this.setStatus('error', error.message);
        this.isSyncing = false;
        return;
      }

      const meta = MetaProgression.getInstance();
      const prog = ProgressionManager.getInstance();

      if (!data) {
        // First login: cloud has no profile yet -> upload current local guest progress
        console.info('[CloudSyncManager] First time login, creating cloud profile...');
        const newProfile: PlayerProfileRow = {
          user_id: user.id,
          display_name: user.name,
          avatar_url: user.avatarUrl || null,
          crystals: meta.getCrystals(),
          lifetime_crystals: meta.getLifetimeCrystals(),
          meta_upgrades: meta.getUpgrades(),
          progression_data: prog.data,
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('player_profiles')
          .insert(newProfile);

        if (insertError) {
          console.warn('[CloudSyncManager] Failed to create cloud profile:', insertError);
          this.setStatus('error', insertError.message);
        } else {
          this.setStatus('synced', 'Прогресс сохранен в облаке!');
        }
      } else {
        // Cloud profile exists: merge with local state (taking maximums)
        console.info('[CloudSyncManager] Cloud profile found, merging progress...');
        const cloudCrystals = Number(data.crystals) || 0;
        const cloudLifetime = Number(data.lifetime_crystals) || 0;
        const cloudUpgrades = (data.meta_upgrades || {}) as Record<string, number>;

        const mergedCrystals = Math.max(cloudCrystals, meta.getCrystals());
        const mergedLifetime = Math.max(cloudLifetime, meta.getLifetimeCrystals(), mergedCrystals);

        const mergedUpgrades: Record<string, number> = { ...cloudUpgrades };
        for (const [id, lvl] of Object.entries(meta.getUpgrades())) {
          mergedUpgrades[id] = Math.max(mergedUpgrades[id] || 0, lvl || 0);
        }

        // Apply to local MetaProgression
        meta.loadExternalState({
          crystals: mergedCrystals,
          lifetimeCrystals: mergedLifetime,
          upgrades: mergedUpgrades
        });

        // Apply to local ProgressionManager
        if (data.progression_data && typeof data.progression_data === 'object') {
          prog.loadExternalData(data.progression_data);
        }

        // Update cloud with the merged state
        await supabase
          .from('player_profiles')
          .update({
            display_name: user.name,
            avatar_url: user.avatarUrl || null,
            crystals: mergedCrystals,
            lifetime_crystals: mergedLifetime,
            meta_upgrades: mergedUpgrades,
            progression_data: prog.data,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        this.setStatus('synced', 'Облачный прогресс синхронизирован!');
      }
    } catch (err: unknown) {
      console.error('[CloudSyncManager] Sync failed:', err);
      this.setStatus('error', String(err));
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Debounced cloud save after any local mutation.
   */
  public scheduleSave(): void {
    if (this.isSyncing) return;
    const user = AuthManager.getInstance().getUser();
    if (user.isGuest) return;

    if (this.saveTimeoutId !== null) {
      window.clearTimeout(this.saveTimeoutId);
    }

    this.saveTimeoutId = window.setTimeout(() => {
      this.saveTimeoutId = null;
      this.saveToCloud().catch((err) => {
        console.warn('[CloudSyncManager] Background save error:', err);
      });
    }, 1200);
  }

  /**
   * Directly uploads current local state to player_profiles in Supabase.
   */
  public async saveToCloud(): Promise<{ success: boolean; error?: string }> {
    const user = AuthManager.getInstance().getUser();
    if (user.isGuest) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const supabase = getAuthSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase не подключен' };
    }

    const meta = MetaProgression.getInstance();
    const prog = ProgressionManager.getInstance();

    try {
      const payload: PlayerProfileRow = {
        user_id: user.id,
        display_name: user.name,
        avatar_url: user.avatarUrl || null,
        crystals: meta.getCrystals(),
        lifetime_crystals: meta.getLifetimeCrystals(),
        meta_upgrades: meta.getUpgrades(),
        progression_data: prog.data,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('player_profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        this.setStatus('error', error.message);
        return { success: false, error: error.message };
      }

      this.setStatus('synced', 'Сохранено в облаке');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus('error', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Resets all game progress in local memory and in the cloud for the current account.
   */
  public async resetCloudProgress(): Promise<{ success: boolean; error?: string }> {
    this.isSyncing = true;
    this.setStatus('syncing', 'Сброс прогресса...');

    const meta = MetaProgression.getInstance();
    const prog = ProgressionManager.getInstance();

    meta.resetAllProgress();
    prog.resetAllProgress();

    const user = AuthManager.getInstance().getUser();
    if (!user.isGuest) {
      const supabase = getAuthSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from('player_profiles')
            .update({
              crystals: 0,
              lifetime_crystals: 0,
              meta_upgrades: {},
              progression_data: prog.getDefaultProgressionData(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (error) {
            console.warn('[CloudSyncManager] Reset cloud update error:', error);
          }
        } catch (e) {
          console.warn('[CloudSyncManager] Reset cloud error:', e);
        }
      }
    }

    this.isSyncing = false;
    this.setStatus('synced', 'Прогресс успешно сброшен!');
    return { success: true };
  }

  /**
   * Permanently deletes user profile data and unlinks account.
   */
  public async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    this.isSyncing = true;
    this.setStatus('syncing', 'Удаление профиля...');

    const user = AuthManager.getInstance().getUser();
    const supabase = getAuthSupabaseClient();

    if (supabase && !user.isGuest) {
      try {
        // 1. Delete player profile row
        await supabase.from('player_profiles').delete().eq('user_id', user.id);
      } catch (e) {
        console.warn('[CloudSyncManager] Profile delete error:', e);
      }

      try {
        // 2. Call optional delete_user_account RPC if defined in Supabase
        await supabase.rpc('delete_user_account');
      } catch {
        // ignore if RPC is not present
      }
    }

    // Reset local progress
    MetaProgression.getInstance().resetAllProgress();
    ProgressionManager.getInstance().resetAllProgress();

    // Sign out to guest
    await AuthManager.getInstance().signOut();

    this.isSyncing = false;
    this.setStatus('idle');
    return { success: true };
  }
}
