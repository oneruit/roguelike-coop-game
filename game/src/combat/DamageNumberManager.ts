import { Vector3, type Camera } from 'three';

export class DamageNumberManager {
  public static damageEnabled = true;
  public static xpEnabled = true;

  // Backward compatibility alias
  public static get enabled(): boolean {
    return DamageNumberManager.damageEnabled;
  }
  public static set enabled(val: boolean) {
    DamageNumberManager.damageEnabled = val;
  }

  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('damage-numbers-layer') || document.body;
  }

  public spawnDamage(
    worldPos: Vector3,
    amount: number,
    isCrit = false,
    camera?: Camera,
    isBleed = false,
    critTier = 1,
    critMultiplier = 1.5
  ) {
    if (!DamageNumberManager.damageEnabled) return;
    const el = document.createElement('div');
    const tierClass = isCrit ? (critTier >= 3 ? 'dmg-crit-t3' : (critTier === 2 ? 'dmg-crit-t2' : 'dmg-crit-t1')) : '';
    el.className = `dmg-number ${isCrit ? `dmg-crit ${tierClass}` : ''} ${isBleed ? 'dmg-bleed' : ''}`;
    let suffix = '';
    if (isCrit) {
      const critPercent = critMultiplier * 100;
      let critColor = '#ef4444';
      let shadowColor = '#991b1b';

      if (critPercent <= 200) {
        suffix = '!';
        critColor = '#ef4444'; // Red
        shadowColor = '#991b1b';
      } else if (critPercent <= 400) {
        suffix = '!!';
        critColor = '#dc2626'; // Red
        shadowColor = '#7f1d1d';
      } else if (critPercent <= 600) {
        suffix = '!';
        critColor = '#f97316'; // Orange
        shadowColor = '#c2410c';
      } else if (critPercent <= 800) {
        suffix = '!!';
        critColor = '#ea580c'; // Deep Orange
        shadowColor = '#9a3412';
      } else {
        suffix = '!';
        critColor = '#a855f7'; // Purple
        shadowColor = '#6b21a8';
      }

      el.style.color = critColor;
      el.style.textShadow = `0 0 10px ${shadowColor}, 0 2px 4px rgba(0, 0, 0, 0.85)`;
      el.style.fontWeight = '900';
    } else if (isBleed) {
      suffix = '🩸';
    }
    el.innerText = `${Math.round(amount)}${suffix}`;
    if (isBleed) {
      el.style.color = '#f87171';
      el.style.textShadow = '0 0 6px #991b1b, 0 1px 2px #000';
      el.style.fontWeight = '800';
    }

    if (camera) {
      const v = worldPos.clone().add(new Vector3(
        (Math.random() - 0.5) * 0.6,
        1.2 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.6
      ));
      v.project(camera);
      // Cull if behind camera or off-screen
      if (v.z < -1 || v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) {
        return;
      }
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    } else {
      el.style.left = '50%';
      el.style.top = '50%';
    }

    if (this.container.childElementCount > 32) {
      this.container.firstElementChild?.remove();
    }
    this.container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 750);
  }

  public spawnXp(worldPos: Vector3, amount: number, camera?: Camera) {
    if (!DamageNumberManager.xpEnabled) return;
    const el = document.createElement('div');
    el.className = 'dmg-number dmg-xp';
    el.innerText = `+${amount} XP`;

    if (camera) {
      const v = worldPos.clone().add(new Vector3(
        (Math.random() - 0.5) * 0.4,
        1.3 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.4
      ));
      v.project(camera);
      // Cull if behind camera or off-screen
      if (v.z < -1 || v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) {
        return;
      }
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    } else {
      el.style.left = '50%';
      el.style.top = '40%';
    }

    if (this.container.childElementCount > 36) {
      this.container.firstElementChild?.remove();
    }
    this.container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 850);
  }

  public spawnLevelUp(worldPos: Vector3, level: number, camera?: Camera) {
    if (!DamageNumberManager.enabled) return;
    const el = document.createElement('div');
    el.className = 'dmg-number dmg-levelup';
    el.innerText = `LEVEL UP! [${level}]`;

    if (camera) {
      const v = worldPos.clone().add(new Vector3(0, 1.8, 0));
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    } else {
      el.style.left = '50%';
      el.style.top = '35%';
    }

    this.container.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 1300);
  }

  public spawnPassiveBuff(worldPos: Vector3, text: string, camera?: Camera) {
    if (!DamageNumberManager.enabled) return;
    const el = document.createElement('div');
    el.className = 'dmg-number dmg-passive-buff';
    el.innerText = text;

    if (camera) {
      const v = worldPos.clone().add(new Vector3(0, 1.6, 0));
      v.project(camera);
      if (v.z < -1 || v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) {
        return;
      }
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    } else {
      el.style.left = '50%';
      el.style.top = '40%';
    }

    this.container.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 1350);
  }
}
