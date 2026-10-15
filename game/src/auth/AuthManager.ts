import { getAuthSupabaseClient } from '../balance/supabaseClient';

export type AuthType = 'guest' | 'google' | 'email';

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  avatarUrl?: string;
  authType: AuthType;
  isGuest: boolean;
  sessionExpiresAt?: number;
  createdAt: string;
}

export type AuthListener = (user: AuthUser) => void;

const AUTH_STATE_KEY = 'rift_auth_state_v1';
const GUEST_PROFILE_KEY = 'rift_guest_profile_v1';
export const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days session duration

/**
 * Authentication Manager for The Rift.
 * Handles local Guest mode and Supabase Google OAuth / Email OTP with 1-month session persistence.
 */
export class AuthManager {
  private static instance: AuthManager;
  private currentUser: AuthUser | null = null;
  private listeners: Set<AuthListener> = new Set();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Try to restore saved state and verify 1-month session validity
    const savedState = this.loadSavedAuthState();
    const now = Date.now();

    if (savedState && !savedState.isGuest) {
      const expiresAt = savedState.sessionExpiresAt || now;
      if (now > expiresAt) {
        console.info('[AuthManager] Session expired after 1 month. Cleaning up...');
        this.clearSavedAuthState();
        const client = getAuthSupabaseClient();
        if (client) {
          try {
            await client.auth.signOut();
          } catch {
            // ignore
          }
        }
        this.currentUser = this.getOrCreateGuestProfile();
        this.notify();
        return;
      }
      this.currentUser = savedState;
    } else {
      this.currentUser = this.getOrCreateGuestProfile();
    }

    const supabase = getAuthSupabaseClient();
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user) {
          // Verify 1 month session validity
          let expiresAt = savedState?.sessionExpiresAt;
          if (!expiresAt) {
            expiresAt = now + ONE_MONTH_MS;
          }

          if (now > expiresAt) {
            console.info('[AuthManager] Session expired after 1 month. Signing out...');
            await supabase.auth.signOut();
            this.clearSavedAuthState();
            this.currentUser = this.getOrCreateGuestProfile();
          } else {
            const email = session.user.email || '';
            const metadata = (session.user.user_metadata || {}) as Record<string, any>;
            const displayName = metadata.full_name || metadata.name || email.split('@')[0] || 'Игрок';
            const avatarUrl = metadata.avatar_url || metadata.picture || undefined;
            const provider = session.user.app_metadata?.provider;
            const authType: AuthType = provider === 'google' ? 'google' : (savedState?.authType || 'google');

            this.currentUser = {
              id: session.user.id,
              email,
              name: displayName,
              avatarUrl,
              authType,
              isGuest: false,
              sessionExpiresAt: expiresAt,
              createdAt: session.user.created_at || new Date().toISOString()
            };
            this.saveAuthState(this.currentUser);
            this.cleanUrlAfterOAuth();
          }
        } else {
          // No active session, use guest
          this.currentUser = this.getOrCreateGuestProfile();
        }

        // Listen for session changes (OAuth redirect, magic links, refresh, logout)
        supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (newSession && newSession.user) {
            const email = newSession.user.email || '';
            const metadata = (newSession.user.user_metadata || {}) as Record<string, any>;
            const displayName = metadata.full_name || metadata.name || email.split('@')[0] || 'Игрок';
            const avatarUrl = metadata.avatar_url || metadata.picture || undefined;
            const provider = newSession.user.app_metadata?.provider;
            const authType: AuthType = provider === 'google' ? 'google' : 'google';
            const expiresAt = Date.now() + ONE_MONTH_MS;

            this.currentUser = {
              id: newSession.user.id,
              email,
              name: displayName,
              avatarUrl,
              authType,
              isGuest: false,
              sessionExpiresAt: expiresAt,
              createdAt: newSession.user.created_at || new Date().toISOString()
            };
            this.saveAuthState(this.currentUser);
            this.cleanUrlAfterOAuth();
            this.notify();
          } else if (event === 'SIGNED_OUT') {
            this.clearSavedAuthState();
            this.currentUser = this.getOrCreateGuestProfile();
            this.notify();
          }
        });
      } catch (err) {
        console.warn('[AuthManager] Supabase auth check failed:', err);
        if (!this.currentUser) {
          this.currentUser = this.getOrCreateGuestProfile();
        }
      }
    } else {
      // Supabase is not configured yet or offline, use saved state or guest mode
      if (!this.currentUser) {
        this.currentUser = this.getOrCreateGuestProfile();
      }
    }

    this.notify();
  }

  public getUser(): AuthUser {
    if (!this.currentUser) {
      this.currentUser = this.getOrCreateGuestProfile();
    }
    return this.currentUser;
  }

  public isGuest(): boolean {
    return this.getUser().isGuest;
  }

  public isAuthenticated(): boolean {
    return !this.isGuest();
  }

  /**
   * Initiates Google OAuth sign-in via Supabase.
   * Redirects the player to the Google account consent screen.
   */
  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    const supabase = getAuthSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase не подключен. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.'
      };
    }

    try {
      const redirectTo = typeof window !== 'undefined' && window.location
        ? window.location.origin + window.location.pathname
        : undefined;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.url && typeof window !== 'undefined') {
        window.location.href = data.url;
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Request a one-time OTP code or magic link to be sent to the player's email.
   */
  public async sendOtp(email: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { success: false, error: 'Пожалуйста, укажите корректный адрес электронной почты.' };
    }

    const supabase = getAuthSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase не подключен. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.'
      };
    }

    try {
      const emailRedirectTo = typeof window !== 'undefined' && window.location
        ? window.location.origin + window.location.pathname
        : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Verify the 6-digit OTP code received by the player via email.
   * On success, establishes a session persisted for 1 month.
   */
  public async verifyOtp(email: string, token: string): Promise<{ success: boolean; error?: string }> {
    const trimmedEmail = email.trim();
    const cleanToken = token.trim().replace(/\s+/g, '');

    if (!cleanToken || cleanToken.length < 6) {
      return { success: false, error: 'Введите 6-значный код подтверждения из письма.' };
    }

    const supabase = getAuthSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase клиент недоступен.' };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: cleanToken,
        type: 'email'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.session && data.session.user) {
        const expiresAt = Date.now() + ONE_MONTH_MS;
        const userEmail = data.session.user.email || trimmedEmail;
        this.currentUser = {
          id: data.session.user.id,
          email: userEmail,
          name: userEmail.split('@')[0] || 'Игрок',
          authType: 'email',
          isGuest: false,
          sessionExpiresAt: expiresAt,
          createdAt: data.session.user.created_at || new Date().toISOString()
        };
        this.saveAuthState(this.currentUser);
        this.notify();
        return { success: true };
      }

      return { success: false, error: 'Не удалось активировать сессию пользователя.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Log in / switch to Guest mode. All data is saved locally on device.
   */
  public loginAsGuest(guestName?: string): AuthUser {
    const profile = this.getOrCreateGuestProfile();
    if (guestName && guestName.trim()) {
      profile.name = guestName.trim();
      this.saveGuestProfile(profile);
    }
    this.currentUser = profile;
    this.clearSavedAuthState();
    this.notify();
    return profile;
  }

  /**
   * Update the display name for the guest user.
   */
  public setGuestName(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const profile = this.getOrCreateGuestProfile();
    profile.name = trimmed;
    this.saveGuestProfile(profile);
    if (this.currentUser && this.currentUser.isGuest) {
      this.currentUser.name = trimmed;
      this.notify();
    }
  }

  /**
   * Sign out from the current account. Automatically reverts to Guest mode.
   */
  public async signOut(): Promise<void> {
    const supabase = getAuthSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthManager] Sign out error:', err);
      }
    }
    this.clearSavedAuthState();
    this.currentUser = this.getOrCreateGuestProfile();
    this.notify();
  }

  public onAuthStateChanged(listener: AuthListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current state
    if (this.currentUser) {
      listener(this.currentUser);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const user = this.getUser();
    for (const listener of this.listeners) {
      try {
        listener(user);
      } catch (err) {
        console.error('[AuthManager] Listener error:', err);
      }
    }
  }

  private getOrCreateGuestProfile(): AuthUser {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(GUEST_PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id && parsed.isGuest) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestUser: AuthUser = {
      id: `guest_${Math.random().toString(36).substring(2, 10)}`,
      name: `Гость #${randomSuffix}`,
      authType: 'guest',
      isGuest: true,
      createdAt: new Date().toISOString()
    };

    this.saveGuestProfile(guestUser);
    return guestUser;
  }

  private saveGuestProfile(user: AuthUser): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('[AuthManager] Failed to save guest profile to localStorage:', e);
    }
  }

  private loadSavedAuthState(): AuthUser | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(AUTH_STATE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  }

  private saveAuthState(user: AuthUser): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('[AuthManager] Failed to save auth state to localStorage:', e);
    }
  }

  private clearSavedAuthState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(AUTH_STATE_KEY);
    } catch {
      // ignore
    }
  }

  private cleanUrlAfterOAuth(): void {
    if (typeof window !== 'undefined' && window.history && window.location) {
      try {
        if (window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error='))) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        if (window.location.search && (window.location.search.includes('code=') || window.location.search.includes('error='))) {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('error');
          url.searchParams.delete('error_description');
          url.searchParams.delete('error_code');
          window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
        }
      } catch {
        // ignore history errors in tests or restricted sandboxes
      }
    }
  }
}
