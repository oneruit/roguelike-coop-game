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
    critTier = 1
  ) {
    if (!DamageNumberManager.damageEnabled) return;
    const el = document.createElement('div');
    const tierClass = isCrit ? (critTier >= 3 ? 'dmg-crit-t3' : (critTier === 2 ? 'dmg-crit-t2' : 'dmg-crit-t1')) : '';
    el.className = `dmg-number ${isCrit ? `dmg-crit ${tierClass}` : ''} ${isBleed ? 'dmg-bleed' : ''}`;
    let suffix = '';
    if (isCrit) {
      if (critTier >= 3) {
        suffix = `!x${critTier}`;
      } else if (critTier === 2) {
        suffix = '!!';
      } else {
        suffix = '!';
      }
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
