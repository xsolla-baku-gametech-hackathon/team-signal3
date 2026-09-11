export type HealthStats = { hp: number; shield: number };

const MAX_HP = 100;
const MAX_SHIELD = 100;

export class HealthSystem {
  private hp = MAX_HP;
  private shield = MAX_SHIELD;

  getStats(): HealthStats {
    return { hp: this.hp, shield: this.shield };
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  applyDamage(amount: number): void {
    if (this.isDead()) {
      return;
    }

    let remaining = amount;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }

    if (remaining > 0) {
      this.hp = Math.max(0, this.hp - remaining);
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(MAX_HP, this.hp + amount);
  }
}
