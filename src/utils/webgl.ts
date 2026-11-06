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

/**
 * Procedural Warm Oak Plank Floor Albedo Texture (SRGBColorSpace).
 */
let _woodFloorTex: THREE.CanvasTexture | null = null;
export function getWoodFloorTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (_woodFloorTex) return _woodFloorTex;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(0, 0, size, size);

  const plankCount = 8;
  const plankH = size / plankCount;
  const tones = ['#8f6240', '#7e5334', '#986a46', '#855939'];

  for (let row = 0; row < plankCount; row++) {
    const y = row * plankH;
    const stagger = (row % 2) * (size * 0.5);

    for (let col = -1; col < 2; col++) {
      const x = col * (size * 0.5) + stagger;
      ctx.fillStyle = tones[(row + Math.abs(col)) % tones.length];
      ctx.fillRect(x, y, size * 0.5, plankH);

      // Subtle wood grain fibers
      ctx.strokeStyle = 'rgba(54, 31, 16, 0.14)';
      ctx.lineWidth = 1.2;
      for (let g = 0; g < 10; g++) {
        const gy = y + ((g + 0.5) / 10) * plankH;
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(
          x + size * 0.16,
          gy + Math.sin(row + g) * 2.5,
          x + size * 0.34,
          gy - Math.cos(row + g) * 2.5,
          x + size * 0.5,
          gy,
        );
        ctx.stroke();
      }

      // Plank seam joint
      ctx.strokeStyle = 'rgba(42, 24, 12, 0.42)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size * 0.5, plankH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _woodFloorTex = tex;
  return tex;
}

/**
 * Procedural Woven Botanical Study Area Rug Texture (SRGBColorSpace).
 */
let _rugTex: THREE.CanvasTexture | null = null;
export function getRugPatternTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (_rugTex) return _rugTex;
  const w = 512;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Warm cream/linen woven field
  ctx.fillStyle = '#e7decb';
  ctx.fillRect(0, 0, w, h);

  // Outer sage-emerald & terracotta borders
  ctx.strokeStyle = '#2d5a48';
  ctx.lineWidth = 22;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.strokeStyle = '#9c4a35';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, w - 80, h - 80);

  ctx.strokeStyle = '#b58d47';
  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, w - 104, h - 104);

  // Center botanical medallion
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.fillStyle = 'rgba(45, 90, 72, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 110, 74, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2d5a48';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = 'rgba(156, 74, 53, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 56, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Subtle woven textile cross-hatch
  ctx.fillStyle = 'rgba(90, 75, 55, 0.05)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _rugTex = tex;
  return tex;
}

/**
 * Procedural Computer Monitor Display Screen Texture (SRGBColorSpace).
 */
let _monitorTex: THREE.CanvasTexture | null = null;
export function getMonitorScreenTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (_monitorTex) return _monitorTex;
  const w = 512;
  const h = 288;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Deep calm botanical studio workspace UI
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0f1f26');
  bg.addColorStop(1, '#162d36');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Left navigation rail
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(0, 0, 96, h);

  // Sidebar items
  const railColors = ['#4fd1b5', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.22)'];
  railColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(16, 28 + i * 26, 64, 10);
  });

  // Main manuscript & specimen chart cards
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(116, 24, 232, 152);
  ctx.fillRect(362, 24, 130, 152);
  ctx.fillRect(116, 190, 376, 74);

  // Glowing botanical waveform / growth curve on screen
  ctx.strokeStyle = '#5eead4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 132; x <= 332; x += 8) {
    const t = (x - 132) / 200;
    const py = 128 - Math.sin(t * Math.PI * 2.5) * 32 - t * 24;
    if (x === 132) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();

  // Warm accent ring in right panel
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(427, 100, 34, -Math.PI * 0.5, Math.PI * 1.15);
  ctx.stroke();

  // Simulated text lines
  ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';
  ctx.fillRect(132, 40, 110, 8);
  ctx.fillRect(132, 208, 180, 7);
  ctx.fillRect(132, 224, 280, 6);
  ctx.fillRect(132, 238, 230, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _monitorTex = tex;
  return tex;
}

/**
 * Procedural Open Hardcover Book Page Texture (SRGBColorSpace).
 */
let _bookPageTex: THREE.CanvasTexture | null = null;
export function getBookPageTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (_bookPageTex) return _bookPageTex;
  const w = 256;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fbf6e9';
  ctx.fillRect(0, 0, w, h);

  // Subtle spine inner shadow on left edge
  const spineGrad = ctx.createLinearGradient(0, 0, 32, 0);
  spineGrad.addColorStop(0, 'rgba(92, 68, 42, 0.25)');
  spineGrad.addColorStop(1, 'rgba(251, 246, 233, 0)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(0, 0, 32, h);

  // Chapter heading & illuminated drop cap
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(34, 34, 26, 28);
  ctx.fillStyle = '#44403c';
  ctx.fillRect(68, 38, 120, 7);
  ctx.fillRect(68, 52, 148, 5);

  // Printed serif paragraph lines
  ctx.fillStyle = 'rgba(41, 37, 36, 0.55)';
  for (let row = 0; row < 15; row++) {
    if (row === 7) continue; // Paragraph break
    const lineW = row === 6 || row === 14 ? 115 : 182;
    ctx.fillRect(34, 76 + row * 14, lineW, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _bookPageTex = tex;
  return tex;
}

/**
 * Procedural Solid Dark Midnight Navy Worsted Wool Suit Texture (SRGBColorSpace).
 * Matched to reference image: solid deep midnight navy tailored suit with microscopic twill weave (no pinstripes).
 */
let _navySuitTex: THREE.CanvasTexture | null = null;
export function getNavySuitTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (_navySuitTex) return _navySuitTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep rich midnight navy worsted wool base
  ctx.fillStyle = '#1c2637';
  ctx.fillRect(0, 0, size, size);

  // Microscopic twill weave texture with fine tonal variation
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const isDiagonal = (x + y) % 4 === 0;
      const noise = ((x * 37 + y * 73) % 17) / 17 - 0.5;
      const alpha = isDiagonal ? 0.045 + noise * 0.02 : 0.015 + noise * 0.01;
      ctx.fillStyle = alpha > 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${Math.abs(alpha)})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Soft diagonal worsted wool nap
  ctx.strokeStyle = 'rgba(25, 35, 50, 0.35)';
  ctx.lineWidth = 1;
  for (let i = -size; i < size * 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - size, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _navySuitTex = tex;
  return tex;
}

/**
 * Procedural Solid Crisp White Dress Shirt Poplin Texture (SRGBColorSpace).
 * Matched to reference image: pristine solid white dress shirt with subtle luxury oxford weave.
 */
let _crispWhiteShirtTex: THREE.CanvasTexture | null = null;
export function getCrispWhiteShirtTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (_crispWhiteShirtTex) return _crispWhiteShirtTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Crisp pristine white cotton poplin base
  ctx.fillStyle = '#fafbfd';
  ctx.fillRect(0, 0, size, size);

  // Very fine microscopic oxford weave thread lattice
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const checker = (x / 2 + y / 2) % 2 === 0;
      ctx.fillStyle = checker ? 'rgba(238, 242, 248, 0.7)' : 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Soft horizontal yarn lines
  ctx.fillStyle = 'rgba(226, 232, 240, 0.22)';
  for (let y = 0; y < size; y += 4) {
    ctx.fillRect(0, y, size, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _crispWhiteShirtTex = tex;
  return tex;
}

/**
 * Backward compatibility aliases.
 */
export function getPinstripeSuitTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getNavySuitTexture(maxAnisotropy);
}

export function getStripedDressShirtTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  return getCrispWhiteShirtTexture(maxAnisotropy);
}

/**
 * Procedural Stacked Cream Paper Block Edge Texture for 3D Hardcover Volumes.
 */
let _bookEdgePagesTex: THREE.CanvasTexture | null = null;
export function getBookEdgePagesTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (_bookEdgePagesTex) return _bookEdgePagesTex;
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f6efe0';
  ctx.fillRect(0, 0, w, h);

  for (let x = 0; x < w; x += 2) {
    ctx.fillStyle = x % 4 === 0 ? 'rgba(168, 145, 112, 0.22)' : 'rgba(255, 252, 245, 0.5)';
    ctx.fillRect(x, 0, 1, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _bookEdgePagesTex = tex;
  return tex;
}

/**
 * Procedural Vertical Japanese Hardcover Spine Texture (SRGBColorSpace).
 */
const _bookSpineCache = new Map<string, THREE.CanvasTexture>();
export function getBookSpineTexture(
  bookKey: string,
  spineColor: string,
  accentColor: string,
  shortLabel: string,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const existing = _bookSpineCache.get(bookKey);
  if (existing) return existing;

  const w = 96;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = spineColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle curved spine shading on left & right edges
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.28)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.78, 'rgba(255,255,255,0.04)');
  grad.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Top & bottom publisher bands
  ctx.fillStyle = accentColor;
  ctx.fillRect(10, 26, w - 20, 6);
  ctx.fillRect(10, h - 46, w - 20, 18);

  // Vertical Japanese spine lettering
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px "Plus Jakarta Sans", "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const chars = Array.from(shortLabel).slice(0, 10);
  const startY = 82;
  const stepY = 34;
  chars.forEach((ch, idx) => {
    ctx.fillText(ch, w / 2, startY + idx * stepY);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _bookSpineCache.set(bookKey, tex);
  return tex;
}

/**
 * High-Resolution Book Cover Texture with immediate procedural jacket fallback
 * and seamless upgrade once the cover JPG finishes loading (zero blank frames, zero CORS crashes).
 */
const _bookCoverCache = new Map<string, THREE.CanvasTexture>();
const _bookCoverListeners = new Map<string, Set<() => void>>();

export function getBookCoverTexture(
  bookKey: string,
  localUrl: string,
  remoteUrl: string,
  spineColor: string,
  backColor: string,
  shortLabel: string,
  maxAnisotropy = 4,
  onReady?: () => void,
): THREE.CanvasTexture {
  if (onReady) {
    let set = _bookCoverListeners.get(bookKey);
    if (!set) {
      set = new Set();
      _bookCoverListeners.set(bookKey, set);
    }
    set.add(onReady);
  }

  const cached = _bookCoverCache.get(bookKey);
  if (cached) {
    return cached;
  }

  // Power-of-two high-DPI canvas (512 x 768 crisp aspect ratio; mipmaps enabled)
  const cw = 512;
  const ch = 768;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;

  // 1. Immediate crisp styled cover jacket fallback while photo loads
  ctx.fillStyle = spineColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(36, 48, cw - 72, ch * 0.56);
  ctx.fillStyle = backColor;
  ctx.fillRect(0, ch * 0.68, cw, ch * 0.32);

  ctx.fillStyle = spineColor;
  ctx.font = '700 44px "Plus Jakarta Sans", "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shortLabel, cw / 2, ch * 0.34);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  _bookCoverCache.set(bookKey, tex);

  // 2. Load real cover artwork (same-origin local asset first, remote fallback second)
  if (typeof Image !== 'undefined') {
    const paintCoverImage = (img: HTMLImageElement) => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      // Subtle book-hinge crease highlight on left edge for physical realism
      const hingeGrad = ctx.createLinearGradient(0, 0, 18, 0);
      hingeGrad.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
      hingeGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.14)');
      hingeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = hingeGrad;
      ctx.fillRect(0, 0, 18, ch);

      tex.needsUpdate = true;
      const listeners = _bookCoverListeners.get(bookKey);
      if (listeners) {
        listeners.forEach((cb) => cb());
      }
    };

    const primaryImg = new Image();
    primaryImg.decoding = 'async';
    primaryImg.onload = () => paintCoverImage(primaryImg);
    primaryImg.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.referrerPolicy = 'no-referrer';
      fallbackImg.onload = () => paintCoverImage(fallbackImg);
      fallbackImg.src = remoteUrl;
    };
    primaryImg.src = localUrl;
  }

  return tex;
}


