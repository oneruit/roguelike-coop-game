import { Vector3, MathUtils } from 'three';

export interface NetworkPlayerSnapshot {
  timestamp: number;
  position: Vector3;
  dir?: string;
  isDowned?: boolean;
}

/**
 * Dedicated client-side network jitter buffer for co-op remote players.
 * Targets a smooth ~100 ms buffer delay to eliminate teleportation and packet jitter.
 */
export class NetworkInterpolationBuffer {
  private snapshots: NetworkPlayerSnapshot[] = [];
  public targetDelayMs: number;

  constructor(targetDelayMs = 100) {
    this.targetDelayMs = targetDelayMs;
  }

  /**
   * Pushes a new timestamped snapshot from a network packet.
   */
  public pushSnapshot(timestamp: number, position: Vector3, dir?: string, isDowned?: boolean): void {
    const clonePos = position.clone();
    this.snapshots.push({ timestamp, position: clonePos, dir, isDowned });

    // Ensure chronological order
    if (this.snapshots.length > 1 && this.snapshots[this.snapshots.length - 2].timestamp > timestamp) {
      this.snapshots.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Prune snapshots older than 1.5 seconds
    const pruneThreshold = timestamp - 1500;
    while (this.snapshots.length > 2 && this.snapshots[0].timestamp < pruneThreshold) {
      this.snapshots.shift();
    }
  }

  /**
   * Calculates interpolated position at given render timestamp (typically currentTime - targetDelayMs).
   */
  public getInterpolatedPosition(
    renderTime: number,
    outTarget: Vector3
  ): { position: Vector3; dir?: string; isDowned?: boolean } | null {
    if (this.snapshots.length === 0) return null;

    if (this.snapshots.length === 1) {
      outTarget.copy(this.snapshots[0].position);
      return {
        position: outTarget,
        dir: this.snapshots[0].dir,
        isDowned: this.snapshots[0].isDowned
      };
    }

    // Before first snapshot
    if (renderTime <= this.snapshots[0].timestamp) {
      outTarget.copy(this.snapshots[0].position);
      return {
        position: outTarget,
        dir: this.snapshots[0].dir,
        isDowned: this.snapshots[0].isDowned
      };
    }

    // After latest snapshot
    const last = this.snapshots[this.snapshots.length - 1];
    if (renderTime >= last.timestamp) {
      outTarget.copy(last.position);
      return {
        position: outTarget,
        dir: last.dir,
        isDowned: last.isDowned
      };
    }

    // Find bounding pair
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      const s0 = this.snapshots[i];
      const s1 = this.snapshots[i + 1];

      if (s0.timestamp <= renderTime && renderTime <= s1.timestamp) {
        const span = s1.timestamp - s0.timestamp;
        const alpha = span > 0 ? MathUtils.clamp((renderTime - s0.timestamp) / span, 0, 1) : 0;

        outTarget.lerpVectors(s0.position, s1.position, alpha);
        return {
          position: outTarget,
          dir: alpha > 0.5 ? s1.dir : s0.dir,
          isDowned: s1.isDowned
        };
      }
    }

    outTarget.copy(last.position);
    return { position: outTarget, dir: last.dir, isDowned: last.isDowned };
  }

  public getSnapshotCount(): number {
    return this.snapshots.length;
  }

  public clear(): void {
    this.snapshots = [];
  }
}
