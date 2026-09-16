import * as THREE from 'three';

export const BAND_NAMES = ['OuterBand', 'MiddleBand', 'InnerBand'];

const A = {
  OuterBand: [
    [0, 0.10, 0],
    [0.55, 0, 0],
    [0, 0, 0.08]
  ],
  MiddleBand: [
    [0, 0.48, 0],
    [-0.18, 0, 0],
    [0.12, 0, 0]
  ],
  InnerBand: [
    [0, -0.34, 0],
    [-0.38, 0, 0],
    [0.20, -0.20, 0]
  ]
};

const SPRINGS = {
  OuterBand: { omega: 3.2, zeta: 0.92 },
  MiddleBand: { omega: 4.8, zeta: 0.82 },
  InnerBand: { omega: 6.4, zeta: 0.72 }
};

const POINTER_GAIN = 2.35;

export const SCROLL_OFFSETS = {
  OuterBand: new THREE.Vector3(-0.1125, 0.0375, 0.05),
  MiddleBand: new THREE.Vector3(0.0875, -0.05, 0.07),
  InnerBand: new THREE.Vector3(0.02, 0.09, -0.045)
};

export const PULSE_DELAYS = {
  CoreSphere: 0,
  InnerBand: 0.08,
  MiddleBand: 0.18,
  OuterBand: 0.28
};

export function pointerToTarget(mx, my, bandName) {
  const sx = Math.tanh(1.2 * mx);
  const sy = Math.tanh(1.2 * my);
  const z = [sx, sy, sx * sy];
  const m = A[bandName];
  return new THREE.Vector3(
    m[0][0] * z[0] + m[0][1] * z[1] + m[0][2] * z[2],
    m[1][0] * z[0] + m[1][1] * z[1] + m[1][2] * z[2],
    m[2][0] * z[0] + m[2][1] * z[1] + m[2][2] * z[2]
  ).multiplyScalar(POINTER_GAIN);
}

export function rotationVectorToQuaternion(v, out = new THREE.Quaternion()) {
  const r = v.length();
  if (r < 1e-8) {
    out.set(v.x * 0.5, v.y * 0.5, v.z * 0.5, 1).normalize();
    return out;
  }
  const s = Math.sin(r * 0.5) / r;
  out.set(v.x * s, v.y * s, v.z * s, Math.cos(r * 0.5)).normalize();
  return out;
}

export function pulseEnvelope(t, clickTime, delay, sigma = 0.14) {
  if (clickTime < 0) return 0;
  const a = t - clickTime - delay;
  if (a < 0) return 0;
  const x = a / sigma;
  return x * x * Math.exp(2 * (1 - x));
}

export function smoothstep01(x) {
  const s = Math.min(1, Math.max(0, x));
  return s * s * (3 - 2 * s);
}

export class BandSpring {
  constructor(name) {
    this.name = name;
    this.theta = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.target = new THREE.Vector3();
  }

  reset() {
    this.theta.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.target.set(0, 0, 0);
  }

  setTarget(mx, my) {
    this.target.copy(pointerToTarget(mx, my, this.name));
  }

  step(dt) {
    const { omega, zeta } = SPRINGS[this.name];
    const accel = this.target.clone()
      .sub(this.theta)
      .multiplyScalar(omega * omega)
      .addScaledVector(this.velocity, -2 * zeta * omega);
    this.velocity.addScaledVector(accel, dt);
    this.theta.addScaledVector(this.velocity, dt);
  }
}
