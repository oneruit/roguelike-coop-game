export type ObstacleType = 'cactus' | 'tree' | 'boulder' | 'altar' | 'landmark';

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
  type: ObstacleType;
}

export interface SimPoint2D {
  x: number;
  z: number;
}

export class ObstacleManager {
  // Integer hash keyed map for zero GC allocations during collision queries
  private chunkObstacles = new Map<number, Obstacle[]>();

  private static toHash(cx: number, cz: number): number {
    return ((cx + 10000) * 20000) + (cz + 10000);
  }

  private static parseKey(chunkKey: string): number {
    const comma = chunkKey.indexOf(',');
    const cx = parseInt(chunkKey.substring(0, comma), 10);
    const cz = parseInt(chunkKey.substring(comma + 1), 10);
    return ObstacleManager.toHash(cx, cz);
  }

  /**
   * Registers an obstacle under a chunk key.
   */
  public addObstacle(chunkKey: string, obstacle: Obstacle) {
    const hash = ObstacleManager.parseKey(chunkKey);
    let list = this.chunkObstacles.get(hash);
    if (!list) {
      list = [];
      this.chunkObstacles.set(hash, list);
    }
    list.push(obstacle);
  }

  /**
   * Removes all obstacles belonging to an unloaded chunk.
   */
  public removeChunkObstacles(chunkKey: string) {
    const hash = ObstacleManager.parseKey(chunkKey);
    this.chunkObstacles.delete(hash);
  }

  /**
   * Returns list of obstacles registered for a chunk key.
   */
  public getObstaclesForChunkKey(chunkKey: string): Obstacle[] | undefined {
    const hash = ObstacleManager.parseKey(chunkKey);
    return this.chunkObstacles.get(hash);
  }

  /**
   * Clears all obstacles (for game restart).
   */
  public clear() {
    this.chunkObstacles.clear();
  }

  /**
   * High performance zero-allocation collision resolution.
   */
  public resolveEntityCollision(
    position: SimPoint2D,
    entityRadius: number,
    iterations = 1
  ): boolean {
    let hadCollision = false;
    const cx = Math.floor(position.x / 50);
    const cz = Math.floor(position.z / 50);

    for (let iter = 0; iter < iterations; iter++) {
      for (let dx = -1; dx <= 1; dx++) {
        const curX = cx + dx;
        for (let dz = -1; dz <= 1; dz++) {
          const curZ = cz + dz;
          const hash = ObstacleManager.toHash(curX, curZ);
          const obstacles = this.chunkObstacles.get(hash);
          if (!obstacles) continue;

          for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const diffX = position.x - obs.x;
            const diffZ = position.z - obs.z;
            const minDist = entityRadius + obs.radius;
            const distSq = diffX * diffX + diffZ * diffZ;

            if (distSq < minDist * minDist) {
              hadCollision = true;
              if (distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const push = minDist - dist;
                position.x += (diffX / dist) * push;
                position.z += (diffZ / dist) * push;
              } else {
                position.x += minDist;
              }
            }
          }
        }
      }
    }

    return hadCollision;
  }
}
