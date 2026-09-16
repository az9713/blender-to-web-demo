import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import {
  BAND_NAMES,
  BandSpring,
  PULSE_DELAYS,
  SCROLL_OFFSETS,
  pulseEnvelope,
  rotationVectorToQuaternion,
  smoothstep01
} from './interaction.js';

const canvas = document.querySelector('#scene');
const statusEl = document.querySelector('#status');
const diagnosticsEl = document.querySelector('#diagnostics');
const pauseButton = document.querySelector('#pause');
const resetButton = document.querySelector('#reset');
const pulseButton = document.querySelector('#pulse');
const wireButton = document.querySelector('#wire');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3f6f8);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
camera.position.set(1.5, 3.8, 19.8);
camera.lookAt(1.5, 0, 0);

const key = new THREE.DirectionalLight(0xffffff, 3.1);
key.position.set(4, 6, 7);
scene.add(key);
const fill = new THREE.HemisphereLight(0xf5fcff, 0x52606a, 3.25);
scene.add(fill);
const rim = new THREE.PointLight(0x7ddff2, 28, 14);
rim.position.set(-3.5, 2.5, 4);
scene.add(rim);
const face = new THREE.DirectionalLight(0xffffff, 1.65);
face.position.set(-3, 1.8, 6);
scene.add(face);

const assembly = new THREE.Group();
assembly.name = 'RuntimeAssembly';
assembly.position.set(2.85, -0.22, 0);
scene.add(assembly);

const bands = {};
const springs = {};
const materialBases = new Map();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const rayHit = new THREE.Vector3();
const coreTarget = new THREE.Vector3();
const coreOffset = new THREE.Vector3();
const q = new THREE.Quaternion();

const state = {
  mx: 0,
  my: 0,
  hasPointer: false,
  paused: false,
  wireframe: false,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  clickTime: -1,
  time: 0,
  accumulator: 0,
  last: performance.now(),
  loaded: false,
  scroll: 0,
  frameTimes: []
};

function setStatus(text) {
  statusEl.textContent = text;
}

function findRequired(root, name) {
  const obj = root.getObjectByName(name);
  if (!obj) throw new Error(`Missing GLB node: ${name}`);
  return obj;
}

function rememberMaterial(mesh) {
  mesh.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat || materialBases.has(mat.uuid)) continue;
      materialBases.set(mat.uuid, {
        material: mat,
        emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
        intensity: mat.emissiveIntensity || 0
      });
    }
  });
}

function tuneImportedMaterials(root) {
  const settings = {
    MAT_Outer: { color: 0x062a54, metalness: 1, roughness: 0.24, emissive: 0x001328, emissiveIntensity: 0.18 },
    MAT_Middle: { color: 0xf1e5ca, metalness: 0.38, roughness: 0.22, emissive: 0x6a5635, emissiveIntensity: 0.48 },
    MAT_Inner: { color: 0x101315, metalness: 0.86, roughness: 0.26, emissive: 0x005e66, emissiveIntensity: 0.36 },
    MAT_Core: { color: 0xb8fbff, metalness: 0, roughness: 0.12, emissive: 0x8dffff, emissiveIntensity: 2.3 },
    MAT_Node: { color: 0x71f2ff, metalness: 0.2, roughness: 0.2, emissive: 0x49dfff, emissiveIntensity: 0.9 }
  };
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      const next = settings[mat.name];
      if (!next) continue;
      mat.color.setHex(next.color);
      mat.metalness = next.metalness;
      mat.roughness = next.roughness;
      mat.emissive.setHex(next.emissive);
      mat.emissiveIntensity = next.emissiveIntensity;
      mat.needsUpdate = true;
    }
  });
}

function installGltf(gltf) {
  const root = gltf.scene;
  const exportRoot = root.getObjectByName('EnergySculpture') || root;
  tuneImportedMaterials(exportRoot);
  assembly.add(exportRoot);
  exportRoot.position.set(0, 0, 0);
  exportRoot.rotation.set(0, 0, 0);
  exportRoot.scale.set(1, 1, 1);

  for (const name of BAND_NAMES) {
    const mesh = findRequired(exportRoot, name);
    const pivot = new THREE.Group();
    pivot.name = `${name.replace('Band', '')}Pivot`;
    assembly.add(pivot);
    pivot.add(mesh);
    bands[name] = { mesh, pivot };
    springs[name] = new BandSpring(name);
    rememberMaterial(mesh);
  }

  const core = findRequired(exportRoot, 'CoreSphere');
  bands.CoreSphere = { mesh: core, pivot: core };
  rememberMaterial(core);

  exportRoot.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });

  state.loaded = true;
  setStatus('Loaded GLB: three independent bands, core, and optional nodes.');
  updateDiagnostics();
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
  }
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
  const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  state.mx = Math.max(-1, Math.min(1, 2 * x / rect.width - 1));
  state.my = Math.max(-1, Math.min(1, 1 - 2 * y / rect.height));
  state.hasPointer = true;
  pointerNdc.set(state.mx, state.my);
}

function updateCoreTarget() {
  if (!state.hasPointer || !bands.CoreSphere) {
    coreTarget.set(0, 0, 0);
    return;
  }
  raycaster.setFromCamera(pointerNdc, camera);
  interactionPlane.normal.copy(camera.getWorldDirection(new THREE.Vector3())).negate();
  interactionPlane.constant = 0;
  if (raycaster.ray.intersectPlane(interactionPlane, rayHit)) {
    coreTarget.copy(rayHit).multiplyScalar(0.08);
    if (coreTarget.length() > 0.12) coreTarget.setLength(0.12);
  }
}

function updateScroll() {
  const section = document.querySelector('.stage');
  const rect = section.getBoundingClientRect();
  const denom = Math.max(1, rect.height - window.innerHeight);
  state.scroll = rect.height > window.innerHeight ? smoothstep01(-rect.top / denom) : 0;
}

function updateSprings(dt) {
  const mx = state.hasPointer ? state.mx : 0;
  const my = state.hasPointer ? state.my : 0;
  for (const name of BAND_NAMES) {
    springs[name].setTarget(mx, my);
    springs[name].step(dt);
  }
}

function applyTransforms() {
  updateScroll();
  updateCoreTarget();
  const coreAlpha = 1 - Math.exp(-10 * (1 / 120));
  coreOffset.lerp(coreTarget, coreAlpha);

  for (const name of BAND_NAMES) {
    const band = bands[name];
    if (!band) continue;
    rotationVectorToQuaternion(springs[name].theta, q);
    band.pivot.quaternion.copy(q);
    band.pivot.position.copy(SCROLL_OFFSETS[name]).multiplyScalar(state.scroll);
  }

  if (bands.CoreSphere) bands.CoreSphere.mesh.position.copy(coreOffset);

  const corePulse = pulseEnvelope(state.time, state.clickTime, PULSE_DELAYS.CoreSphere);
  const gains = { CoreSphere: 2.0, InnerBand: 0.8, MiddleBand: 0.6, OuterBand: 0.4 };
  const scales = { CoreSphere: 0.05, InnerBand: 0.012, MiddleBand: 0.01, OuterBand: 0.008 };
  for (const [keyName, delay] of Object.entries(PULSE_DELAYS)) {
    const p = pulseEnvelope(state.time, state.clickTime, delay);
    const target = bands[keyName];
    if (target) target.pivot.scale.setScalar(1 + (scales[keyName] || 0) * p);
  }
  for (const base of materialBases.values()) {
    base.material.emissive.copy(base.emissive);
    base.material.emissiveIntensity = base.intensity;
  }
  for (const name of Object.keys(PULSE_DELAYS)) {
    const p = name === 'CoreSphere' ? corePulse : pulseEnvelope(state.time, state.clickTime, PULSE_DELAYS[name]);
    const target = bands[name];
    if (!target) continue;
    target.mesh.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat.emissive) continue;
        mat.emissive.lerp(new THREE.Color(0x83f7ff), Math.min(1, 0.35 * p));
        mat.emissiveIntensity = (mat.emissiveIntensity || 0) + (gains[name] || 0) * p;
      }
    });
  }
}

function updateDiagnostics() {
  if (!state.loaded) return;
  const rotations = {};
  for (const name of BAND_NAMES) {
    rotations[name] = springs[name].theta.toArray().map((v) => Number(v.toFixed(4)));
  }
  const frame = state.frameTimes.length ? state.frameTimes.reduce((a, b) => a + b, 0) / state.frameTimes.length : 0;
  const text = {
    pointer: [Number(state.mx.toFixed(3)), Number(state.my.toFixed(3))],
    scroll: Number(state.scroll.toFixed(3)),
    rotations,
    paused: state.paused,
    wireframe: state.wireframe,
    averageFrameMs: Number(frame.toFixed(2))
  };
  diagnosticsEl.textContent = JSON.stringify(text, null, 2);
  window.energyDemoDiagnostics = text;
}

function animate(now) {
  requestAnimationFrame(animate);
  resize();
  const rawDt = Math.min(0.12, Math.max(0, (now - state.last) / 1000));
  state.last = now;
  if (!state.paused && state.loaded && !document.hidden) {
    state.accumulator += rawDt;
    const step = 1 / 120;
    let steps = 0;
    while (state.accumulator >= step && steps < 6) {
      state.time += step;
      if (!state.reducedMotion) updateSprings(step);
      state.accumulator -= step;
      steps += 1;
    }
    if (steps === 6 && state.accumulator > step) state.accumulator = 0;
    applyTransforms();
  }
  const start = performance.now();
  renderer.render(scene, camera);
  state.frameTimes.push(performance.now() - start);
  if (state.frameTimes.length > 90) state.frameTimes.shift();
  if (Math.floor(now / 250) !== Math.floor((now - rawDt * 1000) / 250)) updateDiagnostics();
}

function reset() {
  state.clickTime = -1;
  state.mx = 0;
  state.my = 0;
  state.hasPointer = false;
  coreOffset.set(0, 0, 0);
  coreTarget.set(0, 0, 0);
  for (const spring of Object.values(springs)) spring.reset();
  applyTransforms();
  updateDiagnostics();
}

canvas.addEventListener('pointermove', updatePointer);
canvas.addEventListener('pointerenter', updatePointer);
canvas.addEventListener('pointerleave', () => { state.hasPointer = false; });
canvas.addEventListener('click', () => { state.clickTime = state.time; });
window.addEventListener('resize', resize);
window.addEventListener('scroll', updateScroll, { passive: true });
document.addEventListener('visibilitychange', () => { state.last = performance.now(); state.accumulator = 0; });

pauseButton.addEventListener('click', () => {
  state.paused = !state.paused;
  pauseButton.setAttribute('aria-pressed', String(state.paused));
  pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  updateDiagnostics();
});
resetButton.addEventListener('click', reset);
pulseButton.addEventListener('click', () => { state.clickTime = state.time; });
wireButton.addEventListener('click', () => {
  state.wireframe = !state.wireframe;
  wireButton.setAttribute('aria-pressed', String(state.wireframe));
  assembly.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) mat.wireframe = state.wireframe;
  });
  updateDiagnostics();
});

if (!renderer.capabilities.isWebGL2 && !renderer.capabilities.isWebGL) {
  setStatus('WebGL is unavailable. Showing the static fallback image.');
  document.body.classList.add('fallback');
} else {
  setStatus('Loading generated GLB...');
  new GLTFLoader().load(
    './models/energy-sculpture.glb',
    installGltf,
    (event) => {
      if (event.total) setStatus(`Loading generated GLB... ${Math.round(100 * event.loaded / event.total)}%`);
    },
    (error) => {
      console.error(error);
      setStatus('Could not load the GLB. Showing the static fallback image.');
      document.body.classList.add('fallback');
    }
  );
  requestAnimationFrame(animate);
}
