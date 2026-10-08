import { createClient, SupabaseClient } from '@supabase/supabase-js';

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('outlaw_supabase_url');
    if (stored) return stored.trim();
  }
  return (import.meta.env.VITE_SUPABASE_URL || '').trim();
}

export function getSupabaseAnonKey(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('outlaw_supabase_anon_key');
    if (stored) return stored.trim();
  }
  return (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
}

export function getSupabaseServiceRoleKey(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('outlaw_supabase_service_role_key');
    if (stored) return stored.trim();
  }
  // Optional environment fallback if injected by Vite
  return (
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();
}

export function getAdminPasscode(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('outlaw_admin_passcode');
    if (stored) return stored.trim();
  }
  return (import.meta.env.VITE_ADMIN_SECRET_KEY || import.meta.env.ADMIN_SECRET_KEY || '').trim();
}

/**
 * Returns read-only (anon) Supabase client for game clients.
 */
export function getPublicSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey || url.includes('YOUR_SUPABASE') || anonKey.includes('YOUR_KEY')) {
    return null;
  }

  if (!publicClient) {
    publicClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }

  return publicClient;
}

/**
 * Returns read-write (service_role) Supabase client for the local admin panel.
 * Protected: Should only be used locally.
 */
export function getAdminSupabaseClient(explicitServiceKey?: string): SupabaseClient | null {
  const url = getSupabaseUrl();
  const serviceKey = explicitServiceKey || getSupabaseServiceRoleKey() || getSupabaseAnonKey();

  if (!url || !serviceKey || url.includes('YOUR_SUPABASE')) {
    return null;
  }

  adminClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return adminClient;
}

export function resetSupabaseClients(): void {
  publicClient = null;
  adminClient = null;
}
