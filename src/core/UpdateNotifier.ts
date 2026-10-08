export interface VersionInfo {
  version: string;
  buildTime: number;
  buildTimeIso?: string;
  buildId?: string;
}

export type UpdateListener = (newVersion: VersionInfo, currentVersion: VersionInfo) => void;

/**
 * UpdateNotifier checks for new client builds/patches deployed to the host.
 * Emits non-intrusive notifications when an update is available without disrupting active gameplay.
 */
export class UpdateNotifier {
  private static instance: UpdateNotifier | null = null;

  public readonly currentVersion: VersionInfo;
  private newVersion: VersionInfo | null = null;
  private isUpdateAvailable: boolean = false;
  private listeners: Set<UpdateListener> = new Set();
  private pollIntervalId: number | null = null;
  private isChecking: boolean = false;
  private lastCheckTime: number = 0;
  private isInitialized: boolean = false;

  private constructor() {
    const rawVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
    const rawBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : Date.now();
    const rawBuildId = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : `v${rawVersion}-${rawBuildTime}`;

    this.currentVersion = {
      version: rawVersion,
      buildTime: rawBuildTime,
      buildTimeIso: new Date(rawBuildTime).toISOString(),
      buildId: rawBuildId,
    };
  }

  public static getInstance(): UpdateNotifier {
    if (!UpdateNotifier.instance) {
      UpdateNotifier.instance = new UpdateNotifier();
    }
    return UpdateNotifier.instance;
  }

  /**
   * Initializes polling and listeners.
   */
  public init(pollIntervalMs: number = 60000): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Initial check after 5 seconds
    window.setTimeout(() => {
      this.checkForUpdate();
    }, 5000);

    // Periodic check
    this.pollIntervalId = window.setInterval(() => {
      this.checkForUpdate();
    }, pollIntervalMs);

    // Tab visibility check
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - this.lastCheckTime > 30000) {
          this.checkForUpdate();
        }
      }
    });

    // Expose testing helper in window for debugging / verification
    (window as any).__checkGameUpdate = () => this.checkForUpdate();
    (window as any).__simulateGameUpdate = (ver?: string) => this.simulateUpdate(ver);
  }

  public addListener(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    if (this.isUpdateAvailable && this.newVersion) {
      try {
        listener(this.newVersion, this.currentVersion);
      } catch (err) {
        console.warn('[UpdateNotifier] Error in listener invocation:', err);
      }
    }
    return () => this.listeners.delete(listener);
  }

  public async checkForUpdate(): Promise<boolean> {
    if (this.isChecking) return this.isUpdateAvailable;
    this.isChecking = true;
    this.lastCheckTime = Date.now();

    try {
      const baseUrl = import.meta.env.BASE_URL || './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const url = `${cleanBase}version.json?_t=${Date.now()}`;

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        return this.isUpdateAvailable;
      }

      const remote: VersionInfo = await response.json();

      if (this.isNewerVersion(remote, this.currentVersion)) {
        this.notifyUpdate(remote);
        return true;
      }
    } catch {
      // Gracefully ignore fetch/network errors (offline, etc.)
    } finally {
      this.isChecking = false;
    }

    return this.isUpdateAvailable;
  }

  private isNewerVersion(remote: VersionInfo, local: VersionInfo): boolean {
    if (!remote) return false;

    // Check if remote build timestamp is newer (with 1 second threshold)
    if (remote.buildTime && local.buildTime && remote.buildTime > local.buildTime + 1000) {
      return true;
    }

    // Check if semver version string is strictly newer
    if (remote.version && local.version && remote.version !== local.version) {
      if (this.compareSemver(remote.version, local.version) > 0) {
        return true;
      }
    }

    return false;
  }

  private compareSemver(a: string, b: string): number {
    const cleanA = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
    const cleanB = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(cleanA.length, cleanB.length); i++) {
      const valA = cleanA[i] || 0;
      const valB = cleanB[i] || 0;
      if (valA > valB) return 1;
      if (valA < valB) return -1;
    }
    return 0;
  }

  private notifyUpdate(remote: VersionInfo): void {
    if (this.isUpdateAvailable && this.newVersion?.buildTime === remote.buildTime) {
      return;
    }

    this.isUpdateAvailable = true;
    this.newVersion = remote;
    console.info(
      `[UpdateNotifier] Update available! Local: ${this.currentVersion.version} (${this.currentVersion.buildTimeIso}), Remote: ${remote.version} (${remote.buildTimeIso})`
    );

    for (const listener of this.listeners) {
      try {
        listener(remote, this.currentVersion);
      } catch (err) {
        console.warn('[UpdateNotifier] Error notifying update listener:', err);
      }
    }
  }

  /**
   * Simulates an update event (useful for UI testing and verification in Dev mode).
   */
  public simulateUpdate(testVersion: string = '1.0.1'): void {
    const fakeRemote: VersionInfo = {
      version: testVersion,
      buildTime: Date.now() + 100000,
      buildTimeIso: new Date(Date.now() + 100000).toISOString(),
      buildId: `v${testVersion}-simulated-${Date.now()}`,
    };
    this.notifyUpdate(fakeRemote);
  }

  /**
   * Applies update by clearing caches and reloading page.
   */
  public async applyUpdate(): Promise<void> {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore cache clearing errors
    }
    window.location.reload();
  }

  public getUpdateAvailable(): boolean {
    return this.isUpdateAvailable;
  }

  public getNewVersion(): VersionInfo | null {
    return this.newVersion;
  }

  public destroy(): void {
    if (this.pollIntervalId !== null) {
      window.clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}
