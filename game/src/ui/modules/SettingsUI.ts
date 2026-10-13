import { SoundManager } from '../../core/SoundManager';
import { Projectile } from '../../combat/Projectile';
import { HolyAuraWeapon } from '../../combat/Weapon';
import { DamageNumberManager } from '../../combat/DamageNumberManager';

export interface SettingsUIContext {
  settingsModal: HTMLElement;
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

export class SettingsUI {
  private ctx: SettingsUIContext;
  public settingsFromPause: boolean = false;
  public isAutoLevelUp: boolean = false;
  public isPerfOverlayEnabled: boolean = true;

  public onResolutionScaleChanged?: (scale: number) => void;
  public onShadowQualityChanged?: (quality: number) => void;
  public onTimeOfDayChanged?: (mode: 'day' | 'night') => void;

  constructor(ctx: SettingsUIContext) {
    this.ctx = ctx;
    this.initEventListeners();
  }

  private initEventListeners() {
    const volumeSlider = document.getElementById('settings-volume') as HTMLInputElement | null;
    const volumeVal = document.getElementById('settings-volume-val');
    const muteCheckbox = document.getElementById('settings-mute') as HTMLInputElement | null;
    const testSoundBtn = document.getElementById('settings-btn-test-sound');
    const dmgNumbersCheckbox = document.getElementById('settings-damage-numbers') as HTMLInputElement | null;
    const xpNumbersCheckbox = document.getElementById('settings-xp-numbers') as HTMLInputElement | null;
    const autoLevelupCheckbox = document.getElementById('settings-auto-levelup') as HTMLInputElement | null;
    const vfxOpacitySlider = document.getElementById('settings-vfx-opacity') as HTMLInputElement | null;
    const vfxOpacityVal = document.getElementById('settings-vfx-opacity-val');
    const fullscreenBtn = document.getElementById('settings-btn-fullscreen');
    const settingsBackBtn = document.getElementById('settings-btn-back');

    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        const val = parseInt(volumeSlider.value, 10);
        if (volumeVal) volumeVal.innerText = `${val}%`;
        SoundManager.setVolume(val / 100);
      });
    }

    if (muteCheckbox) {
      muteCheckbox.addEventListener('change', () => {
        SoundManager.setMuted(muteCheckbox.checked);
      });
    }

    testSoundBtn?.addEventListener('click', () => {
      SoundManager.playSlash();
      setTimeout(() => SoundManager.playGem(), 120);
    });

    if (vfxOpacitySlider) {
      const savedVfx = localStorage.getItem('rift_vfx_opacity') || localStorage.getItem('wildwest_vfx_opacity');
      const initialVfx = savedVfx !== null ? parseInt(savedVfx, 10) : 100;
      vfxOpacitySlider.value = String(initialVfx);
      if (vfxOpacityVal) vfxOpacityVal.innerText = `${initialVfx}%`;
      const normVal = initialVfx / 100;
      Projectile.setVfxOpacity(normVal);
      HolyAuraWeapon.setVfxOpacity(normVal);

      vfxOpacitySlider.addEventListener('input', () => {
        const val = parseInt(vfxOpacitySlider.value, 10);
        if (vfxOpacityVal) vfxOpacityVal.innerText = `${val}%`;
        const nVal = val / 100;
        Projectile.setVfxOpacity(nVal);
        HolyAuraWeapon.setVfxOpacity(nVal);
        localStorage.setItem('rift_vfx_opacity', String(val));
      });
    }

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

    if (autoLevelupCheckbox) {
      const savedAuto = localStorage.getItem('rift_auto_levelup') || localStorage.getItem('wildwest_auto_levelup');
      this.isAutoLevelUp = savedAuto === 'true';
      autoLevelupCheckbox.checked = this.isAutoLevelUp;
      autoLevelupCheckbox.addEventListener('change', () => {
        this.isAutoLevelUp = autoLevelupCheckbox.checked;
        localStorage.setItem('rift_auto_levelup', this.isAutoLevelUp ? 'true' : 'false');
      });
    }

    const mapOpacitySlider = document.getElementById('settings-map-opacity') as HTMLInputElement | null;
    const mapOpacityVal = document.getElementById('settings-map-opacity-val');
    if (mapOpacitySlider) {
      const savedMapOpacity = localStorage.getItem('rift_map_opacity') || localStorage.getItem('wildwest_map_opacity');
      const initialMapOpacity = savedMapOpacity !== null ? parseInt(savedMapOpacity, 10) : 65;
      mapOpacitySlider.value = String(initialMapOpacity);
      if (mapOpacityVal) mapOpacityVal.innerText = `${initialMapOpacity}%`;
      document.documentElement.style.setProperty('--map-overlay-opacity', String(initialMapOpacity / 100));

      mapOpacitySlider.addEventListener('input', () => {
        const val = parseInt(mapOpacitySlider.value, 10);
        if (mapOpacityVal) mapOpacityVal.innerText = `${val}%`;
        localStorage.setItem('rift_map_opacity', String(val));
        document.documentElement.style.setProperty('--map-overlay-opacity', String(val / 100));
      });
    }

    const perfOverlayCheckbox = document.getElementById('settings-perf-overlay') as HTMLInputElement | null;
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

    fullscreenBtn?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        fullscreenBtn.innerText = 'Оконный режим';
      } else {
        document.exitFullscreen().catch(() => {});
        fullscreenBtn.innerText = 'Полный экран';
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (fullscreenBtn) {
        fullscreenBtn.innerText = document.fullscreenElement ? 'Оконный режим' : 'Полный экран';
      }
    });

    const settingsTabBtns = document.querySelectorAll<HTMLButtonElement>('.settings-tab-btn');
    settingsTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as 'video' | 'audio' | 'ui' | 'controls' | 'data' | null;
        if (tab) {
          this.activateSettingsTab(tab);
        }
      });
    });

    const resolutionSelect = document.getElementById('settings-resolution') as HTMLSelectElement | null;
    if (resolutionSelect) {
      resolutionSelect.addEventListener('change', () => {
        const scale = parseFloat(resolutionSelect.value) || 1;
        if (this.onResolutionScaleChanged) {
          this.onResolutionScaleChanged(scale);
        }
      });
    }

    const shadowQualitySelect = document.getElementById('settings-shadow-quality') as HTMLSelectElement | null;
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

    const clearDataBtn = document.getElementById('settings-btn-clear-data') as HTMLButtonElement | null;
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => {
        const confirmClear = window.confirm(
          'Вы действительно хотите удалить все сохранённые данные игры?\n\n' +
          'Это действие безвозвратно сбросит уровень аккаунта, открытых героев, золото, выполненные квесты и настройки.'
        );
        if (confirmClear) {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.error('Failed to clear storage:', e);
          }
          window.location.reload();
        }
      });
    }

    settingsBackBtn?.addEventListener('click', () => {
      this.hideSettings();
      if (this.settingsFromPause) {
        this.ctx.showPause();
      } else {
        this.ctx.showMainMenu();
      }
    });
  }

  public showSettings(from: 'main' | 'pause' = 'main') {
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

    const backBtn = document.getElementById('settings-btn-back');
    if (backBtn) {
      backBtn.innerText = this.settingsFromPause ? '← Назад в меню паузы' : '← Назад в главное меню';
    }

    this.activateSettingsTab('video');
    this.ctx.settingsModal.classList.remove('hidden');
  }

  public hideSettings() {
    this.ctx.settingsModal.classList.add('hidden');
    this.ctx.removeMenu('settings');
  }

  public activateSettingsTab(tabName: 'video' | 'audio' | 'ui' | 'controls' | 'data') {
    const tabs: ('video' | 'audio' | 'ui' | 'controls' | 'data')[] = ['video', 'audio', 'ui', 'controls', 'data'];
    for (const t of tabs) {
      const btn = document.getElementById(`settings-tab-btn-${t}`);
      const pane = document.getElementById(`settings-tab-${t}`);
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
