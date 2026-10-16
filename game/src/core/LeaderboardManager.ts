import { getAuthSupabaseClient } from '../balance/supabaseClient';
import { AuthManager } from '../auth/AuthManager';

export interface LeaderboardEntry {
  id?: string;
  playerId: string;
  playerName: string;
  heroId: string;
  stage: number;
  survivalTimeSec: number;
  kills: number;
  credits: number;
  score: number;
  isVictory: boolean;
  createdAt?: string;
}

const LOCAL_LEADERBOARD_KEY = 'outlaw_local_leaderboards';

export class LeaderboardManager {
  public static calculateScore(data: {
    kills: number;
    survivalTimeSec: number;
    credits: number;
    stage: number;
    isVictory: boolean;
  }): number {
    return Math.max(0, Math.round(
      data.kills * 10 +
      data.survivalTimeSec * 4 +
      data.credits * 0.5 +
      (data.stage - 1) * 1500 +
      (data.isVictory ? 10000 : 0)
    ));
  }

  public static async submitScore(data: {
    heroId: string;
    stage: number;
    survivalTimeSec: number;
    kills: number;
    credits: number;
    isVictory: boolean;
    playerName?: string;
    playerId?: string;
  }): Promise<{ success: boolean; score: number }> {
    let playerId = data.playerId;
    let playerName = data.playerName;

    try {
      const authProfile = AuthManager.getInstance().getUser();
      if (!playerId && authProfile) {
        playerId = authProfile.id;
        playerName = authProfile.name;
      }
    } catch {
      // ignore
    }

    if (!playerId) {
      playerId = 'guest_' + Math.floor(Math.random() * 10000);
    }
    if (!playerName) {
      playerName = 'Странник Разлома';
    }

    const score = this.calculateScore(data);
    const entry: LeaderboardEntry = {
      playerId,
      playerName,
      heroId: data.heroId,
      stage: data.stage,
      survivalTimeSec: Number(data.survivalTimeSec.toFixed(1)),
      kills: data.kills,
      credits: data.credits,
      score,
      isVictory: data.isVictory,
      createdAt: new Date().toISOString()
    };

    // Save locally
    this.saveLocalEntry(entry);

    // Sync to Supabase if client available
    try {
      const supabase = getAuthSupabaseClient();
      if (supabase) {
        const payload = {
          user_id: entry.playerId,
          display_name: entry.playerName,
          hero: entry.heroId,
          stage_reached: entry.stage,
          survival_time: Math.round(entry.survivalTimeSec),
          kills: entry.kills,
          score: entry.score,
          crystals_collected: entry.credits
        };

        // Query existing entry for this user to check personal best
        const { data: existingRows } = await supabase
          .from('leaderboards')
          .select('id, score')
          .eq('user_id', entry.playerId)
          .order('score', { ascending: false })
          .limit(1);

        const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

        if (existing) {
          // Player already exists in leaderboard: only update if new record is higher!
          if (entry.score > existing.score) {
            const { error: updateError, data: updated } = await supabase
              .from('leaderboards')
              .update(payload)
              .eq('id', existing.id)
              .select();

            if (updateError || !updated || updated.length === 0) {
              await supabase.from('leaderboards').insert([payload]);
            }
          }
        } else {
          // New player: insert initial record
          const { error: insertError } = await supabase.from('leaderboards').insert([payload]);
          if (insertError) {
            console.warn('[LeaderboardManager] Supabase insert warning:', insertError.message);
          }
        }
      }
    } catch (err) {
      console.warn('[LeaderboardManager] Supabase sync error:', err);
    }

    return { success: true, score };
  }

  public static async fetchTopScores(limit: number = 20): Promise<LeaderboardEntry[]> {
    try {
      const supabase = getAuthSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('leaderboards')
          .select('*')
          .order('score', { ascending: false })
          .limit(limit * 2);

        if (!error && data) {
          if (data.length === 0) {
            return [];
          }

          // Client-side deduplication ensuring each player only appears once
          const map = new Map<string, LeaderboardEntry>();
          for (const d of data) {
            const item: LeaderboardEntry = {
              id: d.id,
              playerId: d.user_id || d.player_id || d.id,
              playerName: d.display_name || d.player_name || 'Странник',
              heroId: d.hero || d.hero_id || 'ronin',
              stage: Number(d.stage_reached ?? d.stage ?? 1),
              survivalTimeSec: Number(d.survival_time ?? d.survival_time_sec ?? 0),
              kills: Number(d.kills ?? 0),
              credits: Number(d.crystals_collected ?? d.credits ?? 0),
              score: Number(d.score ?? 0),
              isVictory: Boolean(d.is_victory ?? ((d.stage_reached ?? d.stage ?? 1) >= 4)),
              createdAt: d.created_at
            };
            const key = item.playerId || item.playerName;
            const prev = map.get(key);
            if (!prev || item.score > prev.score) {
              map.set(key, item);
            }
          }

          return Array.from(map.values())
            .filter((e) => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].includes(e.playerId))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        }
      }
    } catch (err) {
      console.warn('[LeaderboardManager] Supabase fetch failed, using local:', err);
    }

    return this.getLocalEntries(limit);
  }

  public static getLocalEntries(limit: number = 20): LeaderboardEntry[] {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null);
    if (!storage) {
      return [];
    }
    try {
      const raw = storage.getItem(LOCAL_LEADERBOARD_KEY);
      const entries: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
      if (entries.length === 0) {
        return [];
      }

      // Filter out demo entries
      const validEntries = entries.filter((e) => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].includes(e.playerId));

      // Ensure deduplication by playerId, keeping highest score
      const map = new Map<string, LeaderboardEntry>();
      for (const e of validEntries) {
        const key = e.playerId || e.playerName;
        const prev = map.get(key);
        if (!prev || e.score > prev.score) {
          map.set(key, e);
        }
      }

      return Array.from(map.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  private static saveLocalEntry(entry: LeaderboardEntry): void {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null);
    if (!storage) return;
    try {
      const raw = storage.getItem(LOCAL_LEADERBOARD_KEY);
      let entries: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];

      // A player cannot appear twice in the leaderboard.
      // If the player set a new record, update their entry; otherwise keep their highest score.
      const existingIdx = entries.findIndex(e => e.playerId === entry.playerId || (e.playerName === entry.playerName && entry.playerId.startsWith('guest_')));
      if (existingIdx !== -1) {
        if (entry.score > entries[existingIdx].score) {
          entries[existingIdx] = {
            ...entries[existingIdx],
            heroId: entry.heroId,
            stage: entry.stage,
            survivalTimeSec: entry.survivalTimeSec,
            kills: entry.kills,
            credits: entry.credits,
            score: entry.score,
            isVictory: entry.isVictory,
            createdAt: entry.createdAt || new Date().toISOString()
          };
        }
      } else {
        entries.push(entry);
      }

      entries.sort((a, b) => b.score - a.score);
      storage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
    } catch {
      // ignore
    }
  }

  public static getDefaultEntries(): LeaderboardEntry[] {
    return [];
  }
}
