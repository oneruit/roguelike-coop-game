import * as THREE from 'three';

/**
 * Procedural Terrain Elevation Generator.
 * Provides deterministic, continuous, multi-octave height and analytical normals
 * for the 500x500 meter game world.
 */
export class TerrainElevation {
  private seed: number = 1337;

  // Harmonized wave frequencies and amplitudes derived from seed
  private freq1X = 0.016;
  private freq1Z = 0.012;
  private phi1 = 0;
  private amp1 = 2.4;

  private freq2X = 0.034;
  private freq2Z = 0.028;
  private phi2 = 0;
  private amp2 = 1.2;

  private freq3X = 0.068;
  private freq3Z = 0.055;
  private phi3 = 0;
  private amp3 = 0.45;

  private rotCos = 1;
  private rotSin = 0;

  constructor(seed: number = 1337) {
    this.setSeed(seed);
  }

  /**
   * Reconfigures harmonic parameters based on seed for varied topography per stage.
   */
  public setSeed(seed: number) {
    this.seed = seed >>> 0 || 1337;

    // Fast deterministic LCG pseudo-random generator
    let s = (this.seed ^ 0x5bf03635) >>> 0;
    const nextRng = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return (s >>> 0) / 4294967296;
    };

    const angle = nextRng() * Math.PI * 2;
    this.rotCos = Math.cos(angle);
    this.rotSin = Math.sin(angle);

    this.phi1 = nextRng() * Math.PI * 2;
    this.phi2 = nextRng() * Math.PI * 2;
    this.phi3 = nextRng() * Math.PI * 2;

    this.freq1X = 0.014 + nextRng() * 0.006;
    this.freq1Z = 0.012 + nextRng() * 0.006;
    this.freq2X = 0.030 + nextRng() * 0.010;
    this.freq2Z = 0.026 + nextRng() * 0.010;
    this.freq3X = 0.060 + nextRng() * 0.020;
    this.freq3Z = 0.050 + nextRng() * 0.020;

    this.amp1 = 2.2 + nextRng() * 0.7; // ~2.2 - 2.9m
    this.amp2 = 1.0 + nextRng() * 0.45; // ~1.0 - 1.45m
    this.amp3 = 0.35 + nextRng() * 0.25; // ~0.35 - 0.6m
  }

  /**
   * Calculates the terrain elevation Y in meters at world coordinates (x, z).
   * Spatially smooth, continuous, and level around origin spawn.
   */
  public getElevation(x: number, z: number): number {
    // Coordinate rotation for seed-based ridge alignment
    const rx = x * this.rotCos - z * this.rotSin;
    const rz = x * this.rotSin + z * this.rotCos;

    // Multi-octave natural undulating hills
    const w1 = Math.sin(rx * this.freq1X + this.phi1) * Math.cos(rz * this.freq1Z + this.phi1 * 0.7) * this.amp1;
    const w2 = Math.cos(rx * this.freq2X - rz * this.freq2Z + this.phi2) * this.amp2;
    const w3 = Math.sin(rx * this.freq3X + rz * this.freq3Z * 1.3 + this.phi3) * this.amp3;

    let h = w1 + w2 + w3;

    // Smooth level clearing around world spawn (0, 0) for safe player footing
    const distSq = x * x + z * z;
    if (distSq < 1600) { // < 40m radius
      const dist = Math.sqrt(distSq);
      if (dist < 15) {
        h = 0;
      } else {
        const t = (dist - 15) / 25; // 0 to 1
        const s = t * t * (3 - 2 * t); // smoothstep
        h *= s;
      }
    }

    // Outer perimeter ridge rise along map borders
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    if (edgeDist > 215) {
      const et = Math.min(1, (edgeDist - 215) / 30);
      h += et * et * 5.0;
    }

    return h;
  }

  /**
   * Calculates the analytical surface normal at (x, z) using central differences.
   * Guarantees zero normal cracks across chunk boundaries.
   */
  public getNormal(x: number, z: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const eps = 0.25;
    const hL = this.getElevation(x - eps, z);
    const hR = this.getElevation(x + eps, z);
    const hD = this.getElevation(x, z - eps);
    const hU = this.getElevation(x, z + eps);

    const dhdx = (hR - hL) / (2 * eps);
    const dhdz = (hU - hD) / (2 * eps);

    target.set(-dhdx, 1, -dhdz).normalize();
    return target;
  }
}
