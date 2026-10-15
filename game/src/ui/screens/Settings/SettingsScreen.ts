import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { SoundManager } from '../../../core/SoundManager';
import { Projectile } from '../../../combat/Projectile';
import { FireRingWeapon } from '../../../combat/Weapon';
import { DamageNumberManager } from '../../../combat/DamageNumberManager';
import { ProgressionManager } from '../../../core/ProgressionManager';
import { AuthManager } from '../../../auth/AuthManager';

export interface SettingsScreenOptions {
  container?: HTMLElement | null;
  settingsModal?: HTMLElement | null;
  pauseModal: HTMLElement;
  perfOverlay: HTMLElement | null;
  hideMainMenu: () => void;
  showMainMenu: () => void;
  showPause: () => void;
  isPaused: () => boolean;
  getMenuStack: () => string[];
  setMenuStack: (stack: string[]) => void;
  pushMenu: (menu: string) => void;
  removeMenu: (menu: string) => void;
}

/**
 * Modular Settings Screen.
 * Manages Graphics, Audio, HUD preferences, Controls, and Stored game data.
 */
export class SettingsScreen extends Screen {
  protected ctx: SettingsScreenOptions;
  public settingsFromPause: boolean = false;
  public isAutoLevelUp: boolean = false;
  public isPerfOverlayEnabled: boolean = true;

  public onResolutionScaleChanged?: (scale: number) => void;
  public onShadowQualityChanged?: (quality: number) => void;
  public onTimeOfDayChanged?: (mode: 'day' | 'night') => void;
  public onOpenAuth?: () => void;

  constructor(options: SettingsScreenOptions) {
    const existingModal = options.container || options.settingsModal || SafeDOM.getElementById('settings-modal');
    super('settings', existingModal);
    this.ctx = options;

    this.bindElements();
    this.bindEvents();
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {}

  protected bindEvents(): void {
    const volumeSlider = SafeDOM.query<HTMLInputElement>(this.container, '#settings-volume');
    const volumeVal = SafeDOM.query(this.container, '#settings-volume-val');
    const muteCheckbox = SafeDOM.query<HTMLInputElement>(this.container, '#settings-mute');
    const testSoundBtn = SafeDOM.query(this.container, '#settings-btn-test-sound');
    const dmgNumbersCheckbox = SafeDOM.query<HTMLInputElement>(this.container, '#settings-damage-numbers');
    const xpNumbersCheckbox = SafeDOM.query<HTMLInputElement>(this.container, '#settings-xp-numbers');
    const autoLevelupCheckbox = SafeDOM.query<HTMLInputElement>(this.container, '#settings-auto-levelup');
    const vfxOpacitySlider = SafeDOM.query<HTMLInputElement>(this.container, '#settings-vfx-opacity');
    const vfxOpacityVal = SafeDOM.query(this.container, '#settings-vfx-opacity-val');
    const mapOpacitySlider = SafeDOM.query<HTMLInputElement>(this.container, '#settings-map-opacity');
    const mapOpacityVal = SafeDOM.query(this.container, '#settings-map-opacity-val');
    const perfOverlayCheckbox = SafeDOM.query<HTMLInputElement>(this.container, '#settings-perf-overlay');
    const fullscreenBtn = SafeDOM.query(this.container, '#settings-btn-fullscreen');
    const resolutionSelect = SafeDOM.query<HTMLSelectElement>(this.container, '#settings-resolution');
    const shadowQualitySelect = SafeDOM.query<HTMLSelectElement>(this.container, '#settings-shadow-quality');
    const clearDataBtn = SafeDOM.query<HTMLButtonElement>(this.container, '#settings-btn-clear-data');
    const settingsBackBtn = SafeDOM.query(this.container, '#settings-btn-back');

    // 1. Volume
    if (volumeSlider) {
      const savedVolume = localStorage.getItem('rift_volume');
      const initialVol = savedVolume !== null ? parseInt(savedVolume, 10) : 80;
      volumeSlider.value = String(initialVol);
      if (volumeVal) volumeVal.textContent = `${initialVol}%`;
      SoundManager.setVolume(initialVol / 100);

      volumeSlider.addEventListener('input', () => {
        const val = parseInt(volumeSlider.value, 10);
        if (volumeVal) volumeVal.textContent = `${val}%`;
        SoundManager.setVolume(val / 100);
        localStorage.setItem('rift_volume', String(val));
      });
    }

    // 2. Mute
    if (muteCheckbox) {
      const savedMute = localStorage.getItem('rift_muted');
      const initialMute = savedMute === 'true';
      muteCheckbox.checked = initialMute;
      SoundManager.setMuted(initialMute);

      muteCheckbox.addEventListener('change', () => {
        SoundManager.setMuted(muteCheckbox.checked);
        localStorage.setItem('rift_muted', muteCheckbox.checked ? 'true' : 'false');
      });
    }

    // 3. Test sound
    testSoundBtn?.addEventListener('click', () => {
      SoundManager.playSlash();
      setTimeout(() => SoundManager.playGem(), 120);
    });

    // 4. VFX Opacity
    if (vfxOpacitySlider) {
      const savedVfx = localStorage.getItem('rift_vfx_opacity') ?? localStorage.getItem('wildwest_vfx_opacity');
      const initialVfx = savedVfx !== null ? parseInt(savedVfx, 10) : 100;
      vfxOpacitySlider.value = String(initialVfx);
      if (vfxOpacityVal) vfxOpacityVal.textContent = `${initialVfx}%`;
      const normVal = initialVfx / 100;
      Projectile.setVfxOpacity(normVal);
      FireRingWeapon.setVfxOpacity(normVal);

      vfxOpacitySlider.addEventListener('input', () => {
        const val = parseInt(vfxOpacitySlider.value, 10);
        if (vfxOpacityVal) vfxOpacityVal.textContent = `${val}%`;
        const nVal = val / 100;
        Projectile.setVfxOpacity(nVal);
        FireRingWeapon.setVfxOpacity(nVal);
        localStorage.setItem('rift_vfx_opacity', String(val));
      });
    }

    // 5. Damage numbers
    if (dmgNumbersCheckbox) {
      const savedDmg = localStorage.getItem('rift_show_damage') ?? localStorage.getItem('wildwest_show_damage');
      const dmgEnabled = savedDmg !== 'false';
      dmgNumbersCheckbox.checked = dmgEnabled;
      DamageNumberManager.damageEnabled = dmgEnabled;
      dmgNumbersCheckbox.addEventListener('change', () => {
        DamageNumberManager.damageEnabled = dmgNumbersCheckbox.checked;
        localStorage.setItem('rift_show_damage', dmgNumbersCheckbox.checked ? 'true' : 'false');
      });
    }

    // 6. XP numbers
    if (xpNumbersCheckbox) {
      const savedXp = localStorage.getItem('rift_show_xp') ?? localStorage.getItem('wildwest_show_xp');
      const xpEnabled = savedXp !== 'false';
      xpNumbersCheckbox.checked = xpEnabled;
      DamageNumberManager.xpEnabled = xpEnabled;
      xpNumbersCheckbox.addEventListener('change', () => {
        DamageNumberManager.xpEnabled = xpNumbersCheckbox.checked;
        localStorage.setItem('rift_show_xp', xpNumbersCheckbox.checked ? 'true' : 'false');
      });
    }

    // 7. Auto level-up
    if (autoLevelupCheckbox) {
      const savedAuto = localStorage.getItem('rift_auto_levelup') ?? localStorage.getItem('wildwest_auto_levelup');
      this.isAutoLevelUp = savedAuto === 'true';
      autoLevelupCheckbox.checked = this.isAutoLevelUp;
      autoLevelupCheckbox.addEventListener('change', () => {
        this.isAutoLevelUp = autoLevelupCheckbox.checked;
        localStorage.setItem('rift_auto_levelup', this.isAutoLevelUp ? 'true' : 'false');
      });
    }

    // 8. Map opacity
    if (mapOpacitySlider) {
      const savedMapOpacity = localStorage.getItem('rift_map_opacity') ?? localStorage.getItem('wildwest_map_opacity');
      const initialMapOpacity = savedMapOpacity !== null ? parseInt(savedMapOpacity, 10) : 65;
      mapOpacitySlider.value = String(initialMapOpacity);
      if (mapOpacityVal) mapOpacityVal.textContent = `${initialMapOpacity}%`;
      document.documentElement.style.setProperty('--map-overlay-opacity', String(initialMapOpacity / 100));

      mapOpacitySlider.addEventListener('input', () => {
        const val = parseInt(mapOpacitySlider.value, 10);
        if (mapOpacityVal) mapOpacityVal.textContent = `${val}%`;
        localStorage.setItem('rift_map_opacity', String(val));
        document.documentElement.style.setProperty('--map-overlay-opacity', String(val / 100));
      });
    }

    // 9. Performance overlay
    if (perfOverlayCheckbox) {
      const saved = localStorage.getItem('rift_show_perf') ?? localStorage.getItem('wildwest_show_perf');
      this.isPerfOverlayEnabled = saved !== 'false';
      perfOverlayCheckbox.checked = this.isPerfOverlayEnabled;
      if (this.ctx.perfOverlay) {
        this.ctx.perfOverlay.style.display = this.isPerfOverlayEnabled ? 'flex' : 'none';
      }
      perfOverlayCheckbox.addEventListener('change', () => {
        this.isPerfOverlayEnabled = perfOverlayCheckbox.checked;
        localStorage.setItem('rift_show_perf', this.isPerfOverlayEnabled ? 'true' : 'false');
        if (this.ctx.perfOverlay) {
          this.ctx.perfOverlay.style.display = this.isPerfOverlayEnabled ? 'flex' : 'none';
        }
      });
    }

    // 10. Fullscreen
    fullscreenBtn?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        fullscreenBtn.textContent = 'Оконный режим';
      } else {
        document.exitFullscreen().catch(() => {});
        fullscreenBtn.textContent = 'Полный экран';
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (fullscreenBtn) {
        fullscreenBtn.textContent = document.fullscreenElement ? 'Оконный режим' : 'Полный экран';
      }
    });

    // 11. Tabs
    const settingsTabBtns = SafeDOM.queryAll<HTMLButtonElement>(this.container, '.settings-tab-btn');
    settingsTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as 'video' | 'audio' | 'ui' | 'controls' | 'data' | null;
        if (tab) {
          this.activateSettingsTab(tab);
        }
      });
    });

    // 12. Resolution Select
    if (resolutionSelect) {
      resolutionSelect.addEventListener('change', () => {
        const scale = parseFloat(resolutionSelect.value) || 1;
        if (this.onResolutionScaleChanged) {
          this.onResolutionScaleChanged(scale);
        }
      });
    }

    // 13. Shadow Quality Select
    if (shadowQualitySelect) {
      const savedQuality = localStorage.getItem('rift_shadow_quality') || localStorage.getItem('wildwest_shadow_quality') || '1024';
      shadowQualitySelect.value = savedQuality;
      shadowQualitySelect.addEventListener('change', () => {
        const val = parseInt(shadowQualitySelect.value, 10);
        localStorage.setItem('rift_shadow_quality', String(val));
        if (this.onShadowQualityChanged) {
          this.onShadowQualityChanged(val);
        }
      });
    }

    // 14. Clear Data
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => {
        const confirmClear = window.confirm(
          'Вы действительно хотите удалить все сохранённые данные игры?\n\n' +
          'Это действие безвозвратно сбросит уровень аккаунта, открытых героев, золото, выполненные квесты и настройки.'
        );
        if (confirmClear) {
          try {
            ProgressionManager.getInstance().resetAllProgress();
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.error('Failed to clear storage:', e);
          }
          window.location.reload();
        }
      });
    }

    // 14b. Open Auth Modal button
    SafeDOM.query(this.container, '#settings-btn-open-auth')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.onOpenAuth?.();
    });

    // 15. Back button
    settingsBackBtn?.addEventListener('click', () => {
      this.hideSettings();
      if (this.settingsFromPause) {
        this.ctx.showPause();
      } else {
        this.ctx.showMainMenu();
      }
    });
  }

  public showSettings(from: 'main' | 'pause' = 'main'): void {
    this.settingsFromPause = (from === 'pause') || this.ctx.isPaused() || this.ctx.getMenuStack().includes('pause');
    if (this.settingsFromPause) {
      this.ctx.pauseModal.classList.add('hidden');
      if (!this.ctx.getMenuStack().includes('pause')) {
        this.ctx.pushMenu('pause');
      }
      const stack = this.ctx.getMenuStack();
      if (stack[stack.length - 1] !== 'settings') {
        this.ctx.pushMenu('settings');
      }
    } else {
      this.ctx.hideMainMenu();
      this.ctx.setMenuStack(['settings']);
    }

    const backBtn = SafeDOM.query(this.container, '#settings-btn-back');
    if (backBtn) {
      backBtn.textContent = this.settingsFromPause ? '← Назад в меню паузы' : '← Назад в главное меню';
    }

    const authDesc = SafeDOM.query(this.container, '#settings-auth-status-desc');
    if (authDesc) {
      const user = AuthManager.getInstance().getUser();
      if (user.isGuest) {
        authDesc.textContent = `Текущий режим: Гость (${user.name}) — данные сохраняются локально.`;
      } else {
        authDesc.textContent = `Текущий режим: Email (${user.email}) — сессия активна на 1 месяц.`;
      }
    }

    this.activateSettingsTab('video');
    this.show();
  }

  public hideSettings(): void {
    this.hide();
    this.ctx.removeMenu('settings');
  }

  public activateSettingsTab(tabName: 'video' | 'audio' | 'ui' | 'controls' | 'data'): void {
    const tabs: ('video' | 'audio' | 'ui' | 'controls' | 'data')[] = ['video', 'audio', 'ui', 'controls', 'data'];
    for (const t of tabs) {
      const btn = SafeDOM.query(this.container, `#settings-tab-btn-${t}`);
      const pane = SafeDOM.query(this.container, `#settings-tab-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
      if (pane) {
        if (t === tabName) {
          pane.classList.remove('hidden');
        } else {
          pane.classList.add('hidden');
        }
      }
    }
  }
}
