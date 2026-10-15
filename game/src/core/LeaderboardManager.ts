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
        const { error } = await supabase.from('leaderboards').insert([{
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
        if (error) {
          console.warn('[LeaderboardManager] Supabase insert warning:', error.message);
        }
      }
    } catch (err) {
      console.warn('[LeaderboardManager] Supabase insert error:', err);
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
          .limit(limit);

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
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
          }));
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
      return entries.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch {
      return this.getDefaultEntries();
    }
  }

  private static saveLocalEntry(entry: LeaderboardEntry): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(LOCAL_LEADERBOARD_KEY);
      const entries: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
      entries.push(entry);
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
