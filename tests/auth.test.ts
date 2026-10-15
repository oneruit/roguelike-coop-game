import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthManager, ONE_MONTH_MS, AuthUser } from '../game/src/auth/AuthManager';

// Mock localStorage for node:test environment if not provided
class LocalStorageMock {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new LocalStorageMock();
}

test('AuthManager - Guest Mode Initialization and Persistence', () => {
  localStorage.clear();
  const auth = AuthManager.getInstance();
  const user = auth.getUser();

  assert.ok(user, 'Auth user should exist');
  assert.equal(user.authType, 'guest', 'Initial authType must be guest');
  assert.equal(user.isGuest, true, 'isGuest must be true');
  assert.ok(user.id.startsWith('guest_'), 'Guest ID must start with guest_');
  assert.ok(user.name.startsWith('Гость #'), 'Default name should start with "Гость #"');
  assert.equal(auth.isGuest(), true, 'auth.isGuest() must be true');
  assert.equal(auth.isAuthenticated(), false, 'auth.isAuthenticated() must be false for guest');

  // Verify persistence in localStorage
  const raw = localStorage.getItem('rift_guest_profile_v1');
  assert.ok(raw, 'Guest profile must be saved in localStorage under rift_guest_profile_v1');
  const parsed = JSON.parse(raw!);
  assert.equal(parsed.id, user.id, 'Stored guest ID must match');
});

test('AuthManager - Custom Guest Name Updating', () => {
  const auth = AuthManager.getInstance();
  auth.setGuestName('RiftHunter99');

  const user = auth.getUser();
  assert.equal(user.name, 'RiftHunter99', 'Guest name must be updated');

  const raw = localStorage.getItem('rift_guest_profile_v1');
  const parsed = JSON.parse(raw!);
  assert.equal(parsed.name, 'RiftHunter99', 'Updated guest name must be saved in localStorage');
});

test('AuthManager - Session duration is 1 month (30 days)', () => {
  assert.equal(
    ONE_MONTH_MS,
    30 * 24 * 60 * 60 * 1000,
    'ONE_MONTH_MS must equal exactly 30 days in milliseconds'
  );
  assert.equal(ONE_MONTH_MS, 2592000000, 'ONE_MONTH_MS is 2,592,000,000 ms');
});

test('AuthManager - Email validation for OTP request', async () => {
  const auth = AuthManager.getInstance();

  // Invalid email checks
  const res1 = await auth.sendOtp('');
  assert.equal(res1.success, false, 'Empty email should fail');

  const res2 = await auth.sendOtp('not-an-email');
  assert.equal(res2.success, false, 'Invalid email format should fail');

  const res3 = await auth.sendOtp('test@domain');
  assert.equal(res3.success, false, 'Email without TLD should fail');
});

test('AuthManager - OTP code verification format validation', async () => {
  const auth = AuthManager.getInstance();

  const res1 = await auth.verifyOtp('test@example.com', '');
  assert.equal(res1.success, false, 'Empty OTP code must fail');

  const res2 = await auth.verifyOtp('test@example.com', '123');
  assert.equal(res2.success, false, 'Short OTP code (< 6 digits) must fail');
});

test('AuthManager - Sign out reverts cleanly to Guest mode', async () => {
  const auth = AuthManager.getInstance();

  // Simulate an authenticated email user saved in localStorage
  const expiresAt = Date.now() + ONE_MONTH_MS;
  const mockEmailUser: AuthUser = {
    id: 'user_uuid_12345',
    email: 'player@example.com',
    name: 'player',
    authType: 'email',
    isGuest: false,
    sessionExpiresAt: expiresAt,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem('rift_auth_state_v1', JSON.stringify(mockEmailUser));

  // Initialize from storage
  await auth.init();

  // Sign out
  await auth.signOut();

  const userAfterSignOut = auth.getUser();
  assert.equal(userAfterSignOut.isGuest, true, 'User must be guest after signing out');
  assert.equal(userAfterSignOut.authType, 'guest', 'authType must revert to guest');
  assert.equal(localStorage.getItem('rift_auth_state_v1'), null, 'Email auth state must be cleared');
});

test('AuthManager - Session auto-expiration after 1 month', async () => {
  const auth = AuthManager.getInstance();

  // Simulate an expired email user (expiresAt in the past)
  const expiredMockUser: AuthUser = {
    id: 'user_uuid_expired',
    email: 'old@example.com',
    name: 'old',
    authType: 'email',
    isGuest: false,
    sessionExpiresAt: Date.now() - 10000, // expired 10 seconds ago
    createdAt: new Date(Date.now() - ONE_MONTH_MS - 20000).toISOString()
  };
  localStorage.setItem('rift_auth_state_v1', JSON.stringify(expiredMockUser));

  // Trigger init check
  (auth as any).isInitialized = false;
  await auth.init();

  const user = auth.getUser();
  assert.equal(user.isGuest, true, 'Expired session must revert to guest mode');
  assert.equal(localStorage.getItem('rift_auth_state_v1'), null, 'Expired state must be cleaned up');
});

test('AuthManager - onAuthStateChanged listener notification', () => {
  const auth = AuthManager.getInstance();
  let notifiedUser: AuthUser | null = null;

  const unsubscribe = auth.onAuthStateChanged((u) => {
    notifiedUser = u;
  });

  auth.setGuestName('TestedGuest');
  assert.ok(notifiedUser, 'Listener must be called when name changes');
  assert.equal((notifiedUser as unknown as AuthUser).name, 'TestedGuest', 'Listener receives updated user');

  unsubscribe();
});

test('AuthManager - Google OAuth signInWithGoogle error handling without Supabase config', async () => {
  const auth = AuthManager.getInstance();
  const res = await auth.signInWithGoogle();
  assert.equal(res.success, false);
  assert.ok(res.error, 'Error message should be returned when Supabase is unconfigured');
});

test('AuthManager - Google authenticated user restoration and persistence', async () => {
  const auth = AuthManager.getInstance();
  const expiresAt = Date.now() + ONE_MONTH_MS;
  const mockGoogleUser: AuthUser = {
    id: 'google_user_sub_9988',
    email: 'gamer@gmail.com',
    name: 'ProGamer',
    avatarUrl: 'https://lh3.googleusercontent.com/a/mock',
    authType: 'google',
    isGuest: false,
    sessionExpiresAt: expiresAt,
    createdAt: new Date().toISOString()
  };

  localStorage.setItem('rift_auth_state_v1', JSON.stringify(mockGoogleUser));

  (auth as any).isInitialized = false;
  await auth.init();

  const user = auth.getUser();
  assert.equal(user.isGuest, false, 'User must not be guest');
  assert.equal(user.authType, 'google', 'authType must be google');
  assert.equal(user.email, 'gamer@gmail.com');
  assert.equal(user.name, 'ProGamer');
  assert.equal(user.avatarUrl, 'https://lh3.googleusercontent.com/a/mock');
  assert.equal(auth.isAuthenticated(), true, 'auth.isAuthenticated() must be true');

  // Sign out reverts to guest
  await auth.signOut();
  assert.equal(auth.isGuest(), true, 'Reverts to guest upon signout');
  assert.equal(localStorage.getItem('rift_auth_state_v1'), null);
});

