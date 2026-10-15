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
        // Query existing entry to prevent duplicates and update record on higher score
        const { data: existingRows } = await supabase
          .from('leaderboards')
          .select('id, score')
          .eq('player_id', entry.playerId)
          .limit(1);

        const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

        if (existing) {
          // Player already exists in leaderboard: only update if new record is higher!
          if (entry.score > existing.score) {
            const { error: updateError } = await supabase
              .from('leaderboards')
              .update({
                player_name: entry.playerName,
                hero_id: entry.heroId,
                stage: entry.stage,
                survival_time_sec: entry.survivalTimeSec,
                kills: entry.kills,
                credits: entry.credits,
                score: entry.score,
                is_victory: entry.isVictory,
                created_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (updateError) {
              console.warn('[LeaderboardManager] Supabase update warning:', updateError.message);
            }
          }
        } else {
          // New player: insert initial record
          const { error: insertError } = await supabase.from('leaderboards').insert([{
            player_id: entry.playerId,
            player_name: entry.playerName,
            hero_id: entry.heroId,
            stage: entry.stage,
            survival_time_sec: entry.survivalTimeSec,
            kills: entry.kills,
            credits: entry.credits,
            score: entry.score,
            is_victory: entry.isVictory
          }]);

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

        if (!error && data && data.length > 0) {
          // Client-side deduplication ensuring each player only appears once
          const map = new Map<string, LeaderboardEntry>();
          for (const d of data) {
            const item: LeaderboardEntry = {
              id: d.id,
              playerId: d.player_id,
              playerName: d.player_name,
              heroId: d.hero_id,
              stage: d.stage,
              survivalTimeSec: Number(d.survival_time_sec),
              kills: d.kills,
              credits: d.credits,
              score: d.score,
              isVictory: d.is_victory,
              createdAt: d.created_at
            };
            const prev = map.get(item.playerId);
            if (!prev || item.score > prev.score) {
              map.set(item.playerId, item);
            }
          }

          return Array.from(map.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        }
      }
    } catch (err) {
      console.warn('[LeaderboardManager] Supabase fetch failed, using local/default:', err);
    }

    return this.getLocalEntries(limit);
  }

  public static getLocalEntries(limit: number = 20): LeaderboardEntry[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return this.getDefaultEntries();
    }
    try {
      const raw = window.localStorage.getItem(LOCAL_LEADERBOARD_KEY);
      const entries: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
      if (entries.length === 0) {
        return this.getDefaultEntries();
      }

      // Ensure deduplication by playerId, keeping highest score
      const map = new Map<string, LeaderboardEntry>();
      for (const e of entries) {
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
      return this.getDefaultEntries();
    }
  }

  private static saveLocalEntry(entry: LeaderboardEntry): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(LOCAL_LEADERBOARD_KEY);
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
      window.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
    } catch {
      // ignore
    }
  }

  public static getDefaultEntries(): LeaderboardEntry[] {
    return [
      { playerId: 'p1', playerName: 'ShadowBlade', heroId: 'ronin', stage: 4, survivalTimeSec: 1845, kills: 1420, credits: 4800, score: 28450, isVictory: true },
      { playerId: 'p2', playerName: 'StarCaller', heroId: 'invoker', stage: 4, survivalTimeSec: 1620, kills: 1250, credits: 3950, score: 23900, isVictory: true },
      { playerId: 'p3', playerName: 'IronReaper', heroId: 'reaper', stage: 3, survivalTimeSec: 1205, kills: 890, credits: 2400, score: 15300, isVictory: false },
      { playerId: 'p4', playerName: 'CactusJack', heroId: 'outlaw', stage: 2, survivalTimeSec: 720, kills: 510, credits: 1100, score: 9800, isVictory: false }
    ];
  }
}
