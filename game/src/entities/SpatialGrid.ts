import { Enemy } from './Enemy';

/**
 * High-performance 2D Spatial Hash Grid for entity collisions, separation,
 * and projectile hit-testing.
 *
 * Replaces O(N^2) double-loops with O(N) localized neighborhood searches,
 * eliminating CPU stutter when monster counts scale up to hundreds of entities.
 */
export class SpatialGrid {
  private cellSize: number;
  private invCellSize: number;
  private cells = new Map<number, Enemy[]>();
  private activeCellKeys: number[] = [];
  private pool: Enemy[][] = [];

  constructor(cellSize: number = 4.0) {
    this.cellSize = cellSize;
    this.invCellSize = 1.0 / cellSize;
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  private static toKey(cx: number, cz: number): number {
    return (cx + 10000) * 20000 + (cz + 10000);
  }

  public clear() {
    for (let i = 0; i < this.activeCellKeys.length; i++) {
      const list = this.cells.get(this.activeCellKeys[i]);
      if (list) {
        list.length = 0;
        this.pool.push(list);
      }
    }
    this.cells.clear();
    this.activeCellKeys.length = 0;
  }

  public insert(enemy: Enemy) {
    if (!enemy.isAlive) return;
    const cx = Math.floor(enemy.position.x * this.invCellSize);
    const cz = Math.floor(enemy.position.z * this.invCellSize);
    const key = SpatialGrid.toKey(cx, cz);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = this.pool.pop() || [];
      this.cells.set(key, cell);
      this.activeCellKeys.push(key);
    }
    cell.push(enemy);
  }

  public insertAll(enemies: Enemy[]) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.isAlive) {
        this.insert(e);
      }
    }
  }

  /**
   * O(N) soft separation using cell neighborhood pairs.
   * Every potentially overlapping pair is evaluated exactly once without allocations.
   */
  public resolveSeparation() {
    for (let k = 0; k < this.activeCellKeys.length; k++) {
      const key = this.activeCellKeys[k];
      const cell = this.cells.get(key);
      if (!cell || cell.length === 0) continue;

      const cz = (key % 20000) - 10000;
      const cx = Math.floor(key / 20000) - 10000;

      const len = cell.length;
      // 1. Pairs within the same cell
      for (let i = 0; i < len; i++) {
        const e1 = cell[i];
        if (e1.type === 'ghost') continue;

        for (let j = i + 1; j < len; j++) {
          const e2 = cell[j];
          if (e2.type === 'ghost') continue;

          this.separatePair(e1, e2);
        }
      }

      // 2. Pairs between current cell and 4 unique directional neighbors:
      // (cx+1, cz), (cx+1, cz+1), (cx, cz+1), (cx-1, cz+1)
      this.separateCellPair(cell, cx + 1, cz);
      this.separateCellPair(cell, cx + 1, cz + 1);
      this.separateCellPair(cell, cx, cz + 1);
      this.separateCellPair(cell, cx - 1, cz + 1);
    }
  }

  private separateCellPair(cellA: Enemy[], cxB: number, czB: number) {
    const keyB = SpatialGrid.toKey(cxB, czB);
    const cellB = this.cells.get(keyB);
    if (!cellB || cellB.length === 0) return;

    const lenA = cellA.length;
    const lenB = cellB.length;
    for (let i = 0; i < lenA; i++) {
      const e1 = cellA[i];
      if (e1.type === 'ghost') continue;

      for (let j = 0; j < lenB; j++) {
        const e2 = cellB[j];
        if (e2.type === 'ghost') continue;

        this.separatePair(e1, e2);
      }
    }
  }

  private separatePair(e1: Enemy, e2: Enemy) {
    const minDist = (e1.width + e2.width) * 0.32;
    const dx = e1.position.x - e2.position.x;
    if (Math.abs(dx) > minDist) return;
    const dz = e1.position.z - e2.position.z;
    if (Math.abs(dz) > minDist) return;

    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = (minDist - dist) * 0.5;
      const pushX = (dx / dist) * overlap;
      const pushZ = (dz / dist) * overlap;
      e1.position.x += pushX;
      e1.position.z += pushZ;
      e2.position.x -= pushX;
      e2.position.z -= pushZ;
    }
  }

  /**
   * Fast query for nearby enemies within a circular radius.
   * Reuses an output array to eliminate GC pressure.
   */
  public queryRadius(x: number, z: number, radius: number, out: Enemy[] = []): Enemy[] {
    out.length = 0;
    const radSq = radius * radius;
    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCz = Math.floor((z - radius) * this.invCellSize);
    const maxCz = Math.floor((z + radius) * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = SpatialGrid.toKey(cx, cz);
        const cell = this.cells.get(key);
        if (!cell) continue;

        for (let i = 0; i < cell.length; i++) {
          const e = cell[i];
          if (!e.isAlive) continue;
          const dx = e.position.x - x;
          const dz = e.position.z - z;
          if (dx * dx + dz * dz <= radSq) {
            out.push(e);
          }
        }
      }
    }
    return out;
  }
}
