// Energy economy client — tracks energy, regen, spending.

export class EnergyClient {
  private _current: number;
  private _max: number;
  private regenPerHour: number;
  private lastRegen: number;

  constructor(max = 1000, regenPerHour = 25) {
    this._max = max;
    this._current = max;
    this.regenPerHour = regenPerHour;
    this.lastRegen = Date.now();
  }

  tickRegen(): number {
    const now = Date.now();
    const elapsed = (now - this.lastRegen) / 1000 / 3600;
    this.lastRegen = now;
    const regen = Math.floor(elapsed * this.regenPerHour);
    this._current = Math.min(this._max, this._current + regen);
    return this._current;
  }

  trySpend(cost: number): boolean {
    if (this._current < cost) return false;
    this._current -= cost;
    return true;
  }

  getCurrent(): number { return this._current; }
  getMax(): number { return this._max; }
  percentage(): number { return (this._current / this._max) * 100; }
}
