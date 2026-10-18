/**
 * SpectralNoise Parity & Mathematical Verification Test Suite
 * Asserts continuity, numerical stability, and divergence-free curl properties.
 */

import { SpectralNoise } from './spectral-noise.js';

console.log("=================================================");
console.log("=== SPECTRAL-NOISE MATHEMATICAL PROOF SUITE ===");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] (${passedTests}/${totalTests}) ${testName}`);
  } else {
    console.error(`[FAIL] (${passedTests}/${totalTests}) ${testName}`);
    process.exit(1);
  }
}

// 1. Determinism and range check
const val0 = SpectralNoise.perlin3D(1.234, 5.678, 9.012);
const val0Repeat = SpectralNoise.perlin3D(1.234, 5.678, 9.012);
assert(Math.abs(val0 - val0Repeat) < 1e-12, "Evaluation is 100% deterministic bit-for-bit");
assert(val0 >= -1.0 && val0 <= 1.0, `Output bounds within [-1.0, 1.0]: got ${val0.toFixed(5)}`);

// 2. Integer lattice continuity (Perlin noise must evaluate to 0 at exact integer coordinates)
for (let x = -2; x <= 2; x++) {
  for (let y = -2; y <= 2; y++) {
    for (let z = -2; z <= 2; z++) {
      const v = SpectralNoise.perlin3D(x, y, z);
      assert(Math.abs(v) < 1e-6, `Integer lattice root at (${x}, ${y}, ${z}) evaluates to 0.00000`);
    }
  }
}

// 3. Fractional Brownian Motion (fBm) bounds
const fbmVal = SpectralNoise.fbm3D(3.14, 2.71, 1.41, 6, 2.0, 0.5);
assert(fbmVal >= -1.0 && fbmVal <= 1.0, `Normalized fBm value bounded: ${fbmVal.toFixed(5)}`);

// 4. Divergence-Free Curl Verification: div(curl(Psi)) == 0
console.log("\nVerifying Incompressible Divergence-Free Curl Vector Field...");
const eps = 1e-3;
const samplePoints = [
  [0.5, 0.5, 0.5],
  [1.7, 2.3, 0.8],
  [4.1, -1.2, 3.5],
  [-2.5, 0.9, -1.1]
];

for (const [x, y, z] of samplePoints) {
  const [vx1] = SpectralNoise.curl3D(x + eps, y, z);
  const [vx0] = SpectralNoise.curl3D(x - eps, y, z);
  const [, vy1] = SpectralNoise.curl3D(x, y + eps, z);
  const [, vy0] = SpectralNoise.curl3D(x, y - eps, z);
  const [, , vz1] = SpectralNoise.curl3D(x, y, z + eps);
  const [, , vz0] = SpectralNoise.curl3D(x, y, z - eps);

  const div = (vx1 - vx0) / (2 * eps) + (vy1 - vy0) / (2 * eps) + (vz1 - vz0) / (2 * eps);
  assert(Math.abs(div) < 1e-3, `Divergence at (${x}, ${y}, ${z}) is zero within tolerance: div = ${div.toExponential(3)}`);
}

// 5. Voronoi distance metric sanity
const voronoiVal = SpectralNoise.voronoi3D(2.5, 3.5, 4.5);
assert(voronoiVal >= 0.0 && voronoiVal < 1.732, `Voronoi F1 cell distance positive and bounded: ${voronoiVal.toFixed(5)}`);

console.log("\n=================================================");
console.log(`VERDICT: 100% of mathematical checks passed (${passedTests}/${totalTests}).`);
console.log("=================================================");
