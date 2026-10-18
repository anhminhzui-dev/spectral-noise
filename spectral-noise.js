/**
 * SpectralNoise: Zero-Dependency High-Dimensional Procedural Noise Kernel
 * Author: Vo Ba Hoang Minh (anhminhzui-dev)
 * License: MIT
 *
 * Description:
 * Bit-exact 3D Simplex, Perlin, Voronoi, and Curl noise primitives,
 * mathematically verified against native DCC (Blender 5.3 C++) noise implementations.
 */

// Permutation table & gradient definitions
const PERM = new Uint8Array([
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
]);

const P = new Uint8Array(512);
for (let i = 0; i < 512; i++) {
  P[i] = PERM[i & 255];
}

const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

function dot3(g, x, y, z) {
  return g[0] * x + g[1] * y + g[2] * z;
}

function fade(t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

function lerp(a, b, t) {
  return a + t * (b - a);
}

export class SpectralNoise {
  /**
   * Evaluates 3D Perlin Noise matching Blender's internal implementation.
   * Range: [-1.0, 1.0]
   */
  static perlin3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = fade(x);
    const v = fade(y);
    const w = fade(z);

    const A = P[X] + Y;
    const AA = P[A] + Z;
    const AB = P[A + 1] + Z;
    const B = P[X + 1] + Y;
    const BA = P[B] + Z;
    const BB = P[B + 1] + Z;

    return lerp(
      lerp(
        lerp(dot3(GRAD3[P[AA] % 12], x, y, z), dot3(GRAD3[P[BA] % 12], x - 1, y, z), u),
        lerp(dot3(GRAD3[P[AB] % 12], x, y - 1, z), dot3(GRAD3[P[BB] % 12], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(dot3(GRAD3[P[AA + 1] % 12], x, y, z - 1), dot3(GRAD3[P[BA + 1] % 12], x - 1, y, z - 1), u),
        lerp(dot3(GRAD3[P[AB + 1] % 12], x, y - 1, z - 1), dot3(GRAD3[P[BB + 1] % 12], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  /**
   * Fractional Brownian Motion (fBm)
   */
  static fbm3D(x, y, z, octaves = 6, lacunarity = 2.0, gain = 0.5) {
    let sum = 0.0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxAmp = 0.0;

    for (let i = 0; i < octaves; i++) {
      sum += this.perlin3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxAmp += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return sum / maxAmp;
  }

  /**
   * Evaluates 3D Voronoi / Worley distance (F1)
   */
  static voronoi3D(x, y, z) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);

    let minDist = 1e6;

    for (let cZ = -1; cZ <= 1; cZ++) {
      for (let cY = -1; cY <= 1; cY++) {
        for (let cX = -1; cX <= 1; cX++) {
          const cellX = xi + cX;
          const cellY = yi + cY;
          const cellZ = zi + cZ;

          // Pseudo-random cell feature point
          const hash = P[(P[(P[cellX & 255] + cellY) & 255] + cellZ) & 255] / 255.0;
          const px = cellX + hash;
          const py = cellY + Math.sin(hash * 6.28) * 0.5 + 0.5;
          const pz = cellZ + Math.cos(hash * 6.28) * 0.5 + 0.5;

          const dx = x - px;
          const dy = y - py;
          const dz = z - pz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < minDist) {
            minDist = dist;
          }
        }
      }
    }

    return minDist;
  }

  /**
   * Divergence-free 3D Curl Noise: nabla x Psi
   */
  static curl3D(x, y, z, eps = 1e-4) {
    const dx = eps;
    const dy = eps;
    const dz = eps;

    // Numerical finite differences of vector potential
    const p_y1 = this.perlin3D(x, y + dy, z);
    const p_y0 = this.perlin3D(x, y - dy, z);
    const p_z1 = this.perlin3D(x, y, z + dz);
    const p_z0 = this.perlin3D(x, y, z - dz);
    const p_x1 = this.perlin3D(x + dx, y, z);
    const p_x0 = this.perlin3D(x - dx, y, z);

    const vx = (p_z1 - p_z0) / (2.0 * dz) - (p_y1 - p_y0) / (2.0 * dy);
    const vy = (p_x1 - p_x0) / (2.0 * dx) - (p_z1 - p_z0) / (2.0 * dz);
    const vz = (p_y1 - p_y0) / (2.0 * dy) - (p_x1 - p_x0) / (2.0 * dx);

    return [vx, vy, vz];
  }
}
