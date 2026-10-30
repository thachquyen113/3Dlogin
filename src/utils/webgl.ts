import * as THREE from 'three';

/**
 * Detect software WebGL (SwiftShader, llvmpipe, softpipe, WARP) from the GPU renderer string
 * and immediately release the temporary context probe.
 */
export const isSoftwareGl: boolean = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

export const POND_CENTER_X = -3.35;
export const POND_CENTER_Z = 1.45;
export const POND_RADIUS_X = 2.05;
export const POND_RADIUS_Z = 1.5;
export const POND_WATER_Y = -0.34;

/**
 * Deterministic terrain elevation shared across terrain mesh, trees, flowers,
 * stones, lanterns, and ground animals so every prop sits flush on the surface.
 */
export function groundHeightAt(x: number, z: number): number {
  // Gentle rolling botanical hills on the left & distant horizon
  const rolling =
    Math.sin(x * 0.28 + 0.4) * Math.cos(z * 0.25 - 0.2) * 0.34 +
    Math.sin(x * 0.62 - z * 0.48) * 0.11;

  // Distant backdrop ridge behind the sanctuary
  const backRidge = z < -3.5 ? Math.pow(Math.min(12, -3.5 - z), 1.32) * 0.14 : 0;

  // Natural gentle rise on the far left garden knoll (where the hero blossom tree stands)
  const treeKnollDist = Math.hypot(x - -5.2, z - -1.7);
  const treeKnoll = Math.exp(-(treeKnollDist * treeKnollDist) / 7.5) * 0.58;

  // Carve smooth pond basin around (POND_CENTER_X, POND_CENTER_Z)
  const dx = (x - POND_CENTER_X) / POND_RADIUS_X;
  const dz = (z - POND_CENTER_Z) / POND_RADIUS_Z;
  const pondNormDistSq = dx * dx + dz * dz;
  const pondBasin = Math.exp(-pondNormDistSq * 1.65) * -0.92;

  // Right side gently dips so the 3D particle system behind the login card reads cleanly
  const rightClearance = x > 1.0 ? -Math.min(0.65, (x - 1.0) * 0.1) : 0;

  return rolling + backRidge + treeKnoll + pondBasin + rightClearance - 0.18;
}

/**
 * Procedural soft radial contact shadow texture (zero external dependencies).
 */
let _contactShadowTex: THREE.CanvasTexture | null = null;
export function getContactShadowTexture(): THREE.CanvasTexture {
  if (_contactShadowTex) return _contactShadowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.06,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(8, 20, 16, 0.65)');
  grad.addColorStop(0.45, 'rgba(8, 20, 16, 0.28)');
  grad.addColorStop(1, 'rgba(8, 20, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _contactShadowTex = tex;
  return tex;
}

/**
 * Procedural soft luminous halo sprite texture with crisp bright core and smooth falloff.
 */
let _haloTex: THREE.CanvasTexture | null = null;
export function getGlowHaloTexture(): THREE.CanvasTexture {
  if (_haloTex) return _haloTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.18, 'rgba(255, 255, 255, 0.92)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _haloTex = tex;
  return tex;
}

/**
 * Procedural 4-point + diagonal 8-ray celestial star-shine diffraction flare texture.
 */
let _starShineTex: THREE.CanvasTexture | null = null;
export function getStarShineTexture(): THREE.CanvasTexture {
  if (_starShineTex) return _starShineTex;
  const size = 256;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Soft outer glow
  const coreGlow = ctx.createRadialGradient(half, half, 0, half, half, half * 0.72);
  coreGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
  coreGlow.addColorStop(0.14, 'rgba(255, 255, 255, 0.85)');
  coreGlow.addColorStop(0.38, 'rgba(225, 240, 255, 0.22)');
  coreGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, size, size);

  const drawRay = (angleRad: number, lengthFactor: number, widthPx: number, alpha: number) => {
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(angleRad);
    const len = half * lengthFactor;
    const g = ctx.createLinearGradient(-len, 0, len, 0);
    g.addColorStop(0, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.35, `rgba(255, 255, 255, ${alpha * 0.45})`);
    g.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
    g.addColorStop(0.65, `rgba(255, 255, 255, ${alpha * 0.45})`);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(0, -widthPx, len, 0);
    ctx.quadraticCurveTo(0, widthPx, -len, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Primary vertical & horizontal star-shine diffraction spikes
  drawRay(0, 0.96, 5.2, 0.98);
  drawRay(Math.PI / 2, 0.96, 5.2, 0.98);
  // Secondary diagonal rays
  drawRay(Math.PI / 4, 0.56, 3.0, 0.62);
  drawRay(-Math.PI / 4, 0.56, 3.0, 0.62);

  // Pinpoint brilliant center
  const centerDot = ctx.createRadialGradient(half, half, 0, half, half, half * 0.16);
  centerDot.addColorStop(0, 'rgba(255, 255, 255, 1)');
  centerDot.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = centerDot;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.16, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _starShineTex = tex;
  return tex;
}

/**
 * Procedural Lunar Albedo & Bump textures with realistic maria & crater rings.
 */
let _moonTextures: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;
export function getMoonTextures(maxAnisotropy = 4) {
  if (_moonTextures) return _moonTextures;
  const w = 512;
  const h = 256;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base lunar regolith
  cCtx.fillStyle = '#e7edf8';
  cCtx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, w, h);

  // Deterministic pseudo-random helper
  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Soft dark lunar maria patches
  for (let i = 0; i < 18; i++) {
    const cx = rand() * w;
    const cy = h * (0.2 + rand() * 0.6);
    const r = 24 + rand() * 58;
    const g = cCtx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, 'rgba(152, 168, 196, 0.55)');
    g.addColorStop(0.65, 'rgba(172, 186, 212, 0.28)');
    g.addColorStop(1, 'rgba(231, 237, 248, 0)');
    cCtx.fillStyle = g;
    cCtx.beginPath();
    cCtx.arc(cx, cy, r, 0, Math.PI * 2);
    cCtx.fill();
  }

  // Impact craters with bright ejecta rims and depressed basins
  for (let i = 0; i < 95; i++) {
    const cx = rand() * w;
    const cy = h * (0.1 + rand() * 0.8);
    const r = 2.5 + Math.pow(rand(), 2.2) * 20;

    // Color crater subtle shading
    const cg = cCtx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.15);
    cg.addColorStop(0, 'rgba(168, 180, 204, 0.42)');
    cg.addColorStop(0.78, 'rgba(250, 252, 255, 0.5)');
    cg.addColorStop(1, 'rgba(231, 237, 248, 0)');
    cCtx.fillStyle = cg;
    cCtx.beginPath();
    cCtx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    cCtx.fill();

    // Bump crater rim + bowl
    const bg = bCtx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.15);
    bg.addColorStop(0, '#444444');
    bg.addColorStop(0.75, '#dadada');
    bg.addColorStop(1, '#808080');
    bCtx.fillStyle = bg;
    bCtx.beginPath();
    bCtx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    bCtx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  _moonTextures = { map, bumpMap };
  return _moonTextures;
}

/**
 * Procedural Botanical Petal/Foliage Striation Roughness Map (linear space).
 */
let _petalRoughnessTex: THREE.CanvasTexture | null = null;
export function getPetalRoughnessTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (_petalRoughnessTex) return _petalRoughnessTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#a8a8a8';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(65, 65, 65, 0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 36; i++) {
    const x = (i / 35) * size;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size);
    ctx.quadraticCurveTo(x, size * 0.5, x, 0);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _petalRoughnessTex = tex;
  return tex;
}
