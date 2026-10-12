export class PlayerStatusManager {
  public burnTimer = 0;
  private burnTickTimer = 0;
  public shockTimer = 0;
  public slowTimer = 0;
  public slowFactor = 1.0;

  public applyBurn(duration = 3.0): void {
    this.burnTimer = Math.max(this.burnTimer, duration);
  }

  public applyShock(duration = 5.0): void {
    this.shockTimer = Math.max(this.shockTimer, duration);
  }

  public applySlow(factor: number, duration: number): void {
    const clampedFactor = Math.max(0.1, Math.min(1.0, factor));
    this.slowTimer = Math.max(this.slowTimer, duration);
    this.slowFactor = Math.min(this.slowFactor, clampedFactor);
  }

  public get isBurning(): boolean {
    return this.burnTimer > 0;
  }

  public get isShocked(): boolean {
    return this.shockTimer > 0;
  }

  public get isSlowed(): boolean {
    return this.slowTimer > 0;
  }

  public get movementMultiplier(): number {
    return this.isSlowed ? this.slowFactor : 1.0;
  }

  public get incomingDamageMultiplier(): number {
    return this.isShocked ? 1.10 : 1.0;
  }

  public update(dt: number, onBurnTick: (damage: number) => void, maxHp: number): void {
    if (this.burnTimer > 0) {
      this.burnTimer = Math.max(0, this.burnTimer - dt);
      this.burnTickTimer += dt;
      while (this.burnTickTimer >= 1.0) {
        this.burnTickTimer -= 1.0;
        const tickDmg = Math.max(1, Math.round(maxHp * 0.02));
        onBurnTick(tickDmg);
      }
    } else {
      this.burnTickTimer = 0;
    }

    if (this.shockTimer > 0) {
      this.shockTimer = Math.max(0, this.shockTimer - dt);
    }

    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer === 0) {
        this.slowFactor = 1.0;
      }
    }
  }

  public reset(): void {
    this.burnTimer = 0;
    this.burnTickTimer = 0;
    this.shockTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 1.0;
  }
}
