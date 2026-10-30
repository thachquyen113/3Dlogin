import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getGlowHaloTexture,
  getMoonTextures,
  getStarShineTexture,
} from '../../utils/webgl';
import type { ThemeMode } from '../../types';

interface CelestialSkyProps {
  theme: ThemeMode;
  themeBurstId: number;
  lastTriggeredTheme: ThemeMode | null;
  skySpeed: number;
}

// Pre-allocated scratch colors & vectors outside useFrame (zero GC)
const _dayZenith = new THREE.Color('#3892d4');
const _dayHorizon = new THREE.Color('#e6f5fa');
const _dayWarmGlow = new THREE.Color('#ffe9a6');

const _nightZenith = new THREE.Color('#030714');
const _nightHorizon = new THREE.Color('#102042');
const _nightLunarGlow = new THREE.Color('#3b68ad');

interface CometTrack {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  arcLift: number;
  z: number;
  progress: number;
  speed: number;
  scale: number;
  active: boolean;
  cooldown: number;
}

export function CelestialSky({
  theme,
  themeBurstId,
  lastTriggeredTheme,
  skySpeed,
}: CelestialSkyProps) {
  const { gl } = useThree();
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const haloTex = useMemo(() => getGlowHaloTexture(), []);
  const starShineTex = useMemo(() => getStarShineTexture(), []);
  const moonTextures = useMemo(() => getMoonTextures(maxAniso), [maxAniso]);

  // Smooth 0 (Light / Sunshine) -> 1 (Dark / Starry Night) blend progress
  const nightMix = useRef(theme === 'dark' ? 1 : 0);
  const sunBurstStrength = useRef(0);

  // Sun & Sunbeams refs
  const sunGroupRef = useRef<THREE.Group>(null);
  const sunBeamsRef = useRef<THREE.Group>(null);
  const sunCoronaRingRef = useRef<THREE.Mesh>(null);
  const sunBurstRingRef = useRef<THREE.Mesh>(null);

  // Clouds & Sky Birds refs (Light scene)
  const cloudsContainerRef = useRef<THREE.Group>(null);
  const cloudGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const cloudMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const skyBirdsContainerRef = useRef<THREE.Group>(null);
  const skyBirdRefs = useRef<Array<THREE.Group | null>>([]);
  const skyBirdWingLRefs = useRef<Array<THREE.Group | null>>([]);
  const skyBirdWingRRefs = useRef<Array<THREE.Group | null>>([]);

  // Moon, Star Shine & Comets refs (Night scene)
  const moonGroupRef = useRef<THREE.Group>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const starShineSpritesRef = useRef<Array<THREE.Sprite | null>>([]);

  const cometGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const cometHeadShineRefs = useRef<Array<THREE.Sprite | null>>([]);
  const cometHaloRefs = useRef<Array<THREE.Sprite | null>>([]);

  const cometsData = useRef<CometTrack[]>([
    // Comet 0: Grand signature comet arcing smoothly across the night sky
    {
      startX: 11.8,
      startY: 6.4,
      endX: -12.5,
      endY: 2.8,
      arcLift: 1.35,
      z: -12.2,
      progress: 0.12,
      speed: 0.145,
      scale: 1.12,
      active: true,
      cooldown: 0,
    },
    // Comet 1: Secondary high celestial comet
    {
      startX: -10.5,
      startY: 7.2,
      endX: 11.2,
      endY: 3.5,
      arcLift: 0.95,
      z: -13.6,
      progress: -0.35,
      speed: 0.19,
      scale: 0.86,
      active: true,
      cooldown: 1.8,
    },
    // Comet 2: Swift horizon-skimming comet
    {
      startX: 9.6,
      startY: 4.9,
      endX: -9.8,
      endY: 1.9,
      arcLift: 0.85,
      z: -11.5,
      progress: 1.2,
      speed: 0.24,
      scale: 0.76,
      active: false,
      cooldown: 3.4,
    },
  ]);

  // Trigger Sunburst (Light) or Fresh Comet Arrival (Dark) when theme button is pressed
  useEffect(() => {
    if (themeBurstId === 0) return;
    if (lastTriggeredTheme === 'light') {
      sunBurstStrength.current = 1.0;
    } else if (lastTriggeredTheme === 'dark') {
      // Launch immediate visible comets across the starry night sky
      const c0 = cometsData.current[0];
      c0.startX = 10.8;
      c0.startY = 6.3;
      c0.endX = -11.8;
      c0.endY = 2.9;
      c0.progress = 0.04;
      c0.active = true;

      const c1 = cometsData.current[1];
      c1.startX = 4.5;
      c1.startY = 7.4;
      c1.endX = -12.2;
      c1.endY = 3.8;
      c1.progress = -0.18;
      c1.active = true;

      const c2 = cometsData.current[2];
      c2.startX = 11.4;
      c2.startY = 4.7;
      c2.endX = -8.5;
      c2.endY = 1.8;
      c2.progress = -0.42;
      c2.active = true;
    }
  }, [themeBurstId, lastTriggeredTheme]);

  // 1. Atmospheric Sky Dome Shader
  const skyUniforms = useMemo(
    () => ({
      uZenithColor: { value: new THREE.Color(theme === 'dark' ? '#030714' : '#3892d4') },
      uHorizonColor: { value: new THREE.Color(theme === 'dark' ? '#102042' : '#e6f5fa') },
      uCelestialGlow: { value: new THREE.Color(theme === 'dark' ? '#3b68ad' : '#ffe9a6') },
      uCelestialDir: { value: new THREE.Vector3(-0.42, 0.45, -0.78).normalize() },
    }),
    [],
  );

  // 2. Drifting 3D Cumulus Cloud Specifications (7 multi-puff clouds across Light sky)
  const cloudSpecs = useMemo(
    () => [
      { baseX: -10.5, y: 5.5, z: -11.8, scale: 1.25, speed: 0.42, bobPhase: 0.2 },
      { baseX: -3.2, y: 6.2, z: -13.5, scale: 1.45, speed: 0.34, bobPhase: 1.5 },
      { baseX: 4.4, y: 5.1, z: -10.8, scale: 1.18, speed: 0.46, bobPhase: 2.7 },
      { baseX: 10.8, y: 6.4, z: -14.2, scale: 1.38, speed: 0.36, bobPhase: 3.9 },
      { baseX: -14.8, y: 4.4, z: -12.6, scale: 1.05, speed: 0.48, bobPhase: 4.8 },
      { baseX: 0.6, y: 4.3, z: -15.2, scale: 1.15, speed: 0.31, bobPhase: 5.4 },
      { baseX: 15.2, y: 5.0, z: -11.5, scale: 1.22, speed: 0.41, bobPhase: 6.1 },
    ],
    [],
  );

  // 3. Flying Sky Bird Geometries & Specifications (8 composite 6-part birds in Light sky)
  const { skyWingGeo, skyTailGeo } = useMemo(() => {
    // Swept aerodynamic swallow/dove wing (ExtrudeGeometry with bevel)
    const wShape = new THREE.Shape();
    wShape.moveTo(0, 0);
    wShape.bezierCurveTo(0.14, 0.06, 0.32, 0.05, 0.48, -0.08);
    wShape.bezierCurveTo(0.36, -0.11, 0.18, -0.07, 0, -0.05);
    wShape.closePath();

    const wGeo = new THREE.ExtrudeGeometry(wShape, {
      steps: 1,
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
    });
    wGeo.computeVertexNormals();

    // Forked V-tail fan
    const tShape = new THREE.Shape();
    tShape.moveTo(0, 0);
    tShape.lineTo(0.065, -0.14);
    tShape.lineTo(0, -0.09);
    tShape.lineTo(-0.065, -0.14);
    tShape.closePath();

    const tGeo = new THREE.ExtrudeGeometry(tShape, {
      steps: 1,
      depth: 0.006,
      bevelEnabled: false,
    });
    tGeo.computeVertexNormals();

    return { skyWingGeo: wGeo, skyTailGeo: tGeo };
  }, []);

  const skyBirdSpecs = useMemo(
    () => [
      // V-Formation Flock of 5 white/ivory sky doves gliding left-to-right across high sky
      { mode: 'flock' as const, offsetX: 0, offsetY: 0, offsetZ: 0, phase: 0.0, scale: 0.72 },
      { mode: 'flock' as const, offsetX: -0.85, offsetY: 0.24, offsetZ: -0.55, phase: 0.6, scale: 0.66 },
      { mode: 'flock' as const, offsetX: -0.92, offsetY: -0.18, offsetZ: 0.55, phase: 1.1, scale: 0.68 },
      { mode: 'flock' as const, offsetX: -1.75, offsetY: 0.46, offsetZ: -1.05, phase: 1.7, scale: 0.64 },
      { mode: 'flock' as const, offsetX: -1.82, offsetY: -0.36, offsetZ: 1.05, phase: 2.3, scale: 0.64 },
      // 3 Soaring Swallows circling in wide graceful sky arcs
      { mode: 'soar' as const, cx: -3.2, cy: 4.35, cz: -7.8, rx: 4.2, rz: 1.9, speed: 0.44, phase: 0.4, scale: 0.74 },
      { mode: 'soar' as const, cx: 2.8, cy: 4.85, cz: -8.6, rx: 4.6, rz: 2.1, speed: -0.38, phase: 2.2, scale: 0.7 },
      { mode: 'soar' as const, cx: -0.4, cy: 5.45, cz: -9.8, rx: 5.4, rz: 1.8, speed: 0.35, phase: 4.1, scale: 0.68 },
    ],
    [],
  );

  // 4. Deep Background Twinkling Starfield (780 Stars across entire Night Sky)
  const { starsGeo, starsUniforms } = useMemo(() => {
    const count = 780;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const starPalette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#dbeafe'),
      new THREE.Color('#fef3c7'),
      new THREE.Color('#e0e7ff'),
      new THREE.Color('#bae6fd'),
    ];

    let seed = 8821;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      // Span full visible sky frustum behind both garden & right login card
      positions[i * 3] = (rand() - 0.5) * 48;
      positions[i * 3 + 1] = 0.6 + rand() * 14.5;
      positions[i * 3 + 2] = -14.5 - rand() * 12;

      sizes[i] = 1.3 + Math.pow(rand(), 2.2) * 3.6;
      phases[i] = rand() * Math.PI * 2;

      const c = starPalette[Math.floor(rand() * starPalette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: theme === 'dark' ? 1 : 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    };

    return { starsGeo: geo, starsUniforms: uniforms };
  }, []);

  // 5. 34 Hero Diffraction "Star Shine" Beacons across the Night Sky
  const starShineSpecs = useMemo(() => {
    let seed = 3197;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const shinePalette = ['#ffffff', '#bae6fd', '#fef08a', '#c7d2fe', '#a5f3fc'];
    const items: Array<{
      x: number;
      y: number;
      z: number;
      baseScale: number;
      speed: number;
      phase: number;
      color: string;
    }> = [];

    for (let i = 0; i < 34; i++) {
      items.push({
        x: -13.5 + rand() * 26.5,
        y: 1.6 + rand() * 6.4,
        z: -13.2 - rand() * 4.5,
        baseScale: 0.48 + Math.pow(rand(), 1.6) * 0.78,
        speed: 1.3 + rand() * 2.1,
        phase: rand() * Math.PI * 2,
        color: shinePalette[i % shinePalette.length],
      });
    }
    return items;
  }, []);

  // 6. Volumetric Sunbeam & Comet Tail Shader Uniforms
  const sunbeamUniforms = useMemo(
    () => ({
      uOpacity: { value: theme === 'light' ? 0.24 : 0 },
      uTime: { value: 0 },
    }),
    [],
  );

  const cometIonUniforms = useMemo(
    () => [
      { uTime: { value: 0 }, uOpacity: { value: 0 } },
      { uTime: { value: 0 }, uOpacity: { value: 0 } },
      { uTime: { value: 0 }, uOpacity: { value: 0 } },
    ],
    [],
  );

  const cometDustUniforms = useMemo(
    () => [
      { uTime: { value: 0 }, uOpacity: { value: 0 } },
      { uTime: { value: 0 }, uOpacity: { value: 0 } },
      { uTime: { value: 0 }, uOpacity: { value: 0 } },
    ],
    [],
  );

  useEffect(() => {
    return () => {
      starsGeo.dispose();
      skyWingGeo.dispose();
      skyTailGeo.dispose();
    };
  }, [starsGeo, skyWingGeo, skyTailGeo]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);
    const pace = skySpeed;

    // Smooth day/night transition factor
    const targetNight = theme === 'dark' ? 1 : 0;
    nightMix.current = THREE.MathUtils.damp(nightMix.current, targetNight, 2.5, dt);
    const nm = nightMix.current;
    const dayFactor = 1 - nm;

    // Decay sunburst pulse smoothly
    if (sunBurstStrength.current > 0.001) {
      sunBurstStrength.current = THREE.MathUtils.damp(sunBurstStrength.current, 0, 2.2, dt);
    }

    // 1. Update Sky Dome Colors
    skyUniforms.uZenithColor.value.lerpColors(_dayZenith, _nightZenith, nm);
    skyUniforms.uHorizonColor.value.lerpColors(_dayHorizon, _nightHorizon, nm);
    skyUniforms.uCelestialGlow.value.lerpColors(_dayWarmGlow, _nightLunarGlow, nm);

    // 2. Update Sun & Sunbeams (Light Scene)
    if (sunGroupRef.current) {
      sunGroupRef.current.position.y = THREE.MathUtils.lerp(-3.5, 6.85, dayFactor);
      sunGroupRef.current.visible = dayFactor > 0.02;
      const sScale = Math.max(0.01, dayFactor * (1 + sunBurstStrength.current * 0.28));
      sunGroupRef.current.scale.setScalar(sScale);
    }
    if (sunCoronaRingRef.current) {
      sunCoronaRingRef.current.rotation.z = t * 0.22;
    }
    if (sunBurstRingRef.current) {
      const burst = sunBurstStrength.current;
      sunBurstRingRef.current.visible = burst > 0.02;
      const expand = 1 + (1 - burst) * 4.5;
      sunBurstRingRef.current.scale.setScalar(expand);
      const mat = sunBurstRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = burst * 0.55;
    }
    if (sunBeamsRef.current) {
      sunBeamsRef.current.visible = dayFactor > 0.03;
      sunBeamsRef.current.rotation.z = -0.46 + Math.sin(t * 0.35) * 0.03;
      sunbeamUniforms.uTime.value = t;
      sunbeamUniforms.uOpacity.value =
        dayFactor * (0.22 + sunBurstStrength.current * 0.32);
    }

    // 3. Animate Drifting 3D Cumulus Clouds in Light Scene
    if (cloudsContainerRef.current) {
      cloudsContainerRef.current.visible = dayFactor > 0.02;
    }
    if (cloudMatRef.current) {
      cloudMatRef.current.opacity = dayFactor * 0.96;
    }
    if (dayFactor > 0.02) {
      const span = 36; // Wraps from -18 to +18
      cloudSpecs.forEach((c, idx) => {
        const grp = cloudGroupRefs.current[idx];
        if (!grp) return;
        const rawX = c.baseX + t * c.speed * pace;
        const wrappedX = ((((rawX + 18) % span) + span) % span) - 18;
        const bobY = c.y + Math.sin(t * 0.55 + c.bobPhase) * 0.14;
        grp.position.set(wrappedX, bobY + (1 - dayFactor) * 1.4, c.z);
        grp.scale.setScalar(c.scale * Math.max(0.01, dayFactor));
      });
    }

    // 4. Animate Flying 3D Sky Birds in Light Scene
    if (skyBirdsContainerRef.current) {
      skyBirdsContainerRef.current.visible = dayFactor > 0.03;
    }
    if (dayFactor > 0.03) {
      // V-formation leader path sweeping left -> right across high sky
      const flockSpan = 30;
      const leaderX = ((((t * 1.35 * pace + 15) % flockSpan) + flockSpan) % flockSpan) - 15;
      const leaderY = 4.95 + Math.sin(t * 0.75) * 0.35 + (1 - dayFactor) * 2.5;
      const leaderZ = -9.4 + Math.cos(t * 0.45) * 0.85;

      skyBirdSpecs.forEach((b, idx) => {
        const grp = skyBirdRefs.current[idx];
        const wingL = skyBirdWingLRefs.current[idx];
        const wingR = skyBirdWingRRefs.current[idx];
        if (!grp) return;

        // Natural intermittent flap-and-glide cadence
        const glideCycle = Math.sin(t * 1.4 + b.phase);
        const flapAmp = glideCycle > -0.25 ? 0.68 : 0.12;
        const flapAngle =
          glideCycle > -0.25
            ? Math.sin(t * 9.2 * pace + b.phase * 2.2) * flapAmp
            : 0.14 + Math.sin(t * 2.0 + b.phase) * 0.05;

        if (b.mode === 'flock') {
          const bx = leaderX + b.offsetX;
          const by = leaderY + b.offsetY + Math.sin(t * 2.2 + b.phase) * 0.06;
          const bz = leaderZ + b.offsetZ;

          grp.position.set(bx, by, bz);
          grp.rotation.set(0.04, Math.PI / 2, Math.sin(t * 0.75) * 0.08);
          grp.scale.setScalar(b.scale * dayFactor);
        } else {
          const st = t * b.speed * pace + b.phase;
          const bx = b.cx + Math.cos(st) * b.rx;
          const bz = b.cz + Math.sin(st) * b.rz;
          const by =
            b.cy +
            Math.sin(st * 2.0) * 0.28 +
            (1 - dayFactor) * 2.5;

          const eps = b.speed > 0 ? 0.03 : -0.03;
          const nbx = b.cx + Math.cos(st + eps) * b.rx;
          const nbz = b.cz + Math.sin(st + eps) * b.rz;
          const heading = Math.atan2(nbx - bx, nbz - bz);

          grp.position.set(bx, by, bz);
          grp.rotation.set(0.05, heading, (b.speed > 0 ? -1 : 1) * 0.26);
          grp.scale.setScalar(b.scale * dayFactor);
        }

        if (wingL) wingL.rotation.z = flapAngle;
        if (wingR) wingR.rotation.z = -flapAngle;
      });
    }

    // 5. Update 3D Moon, Starfield & Radiant Star Shine (Night Scene)
    if (moonGroupRef.current) {
      moonGroupRef.current.position.y = THREE.MathUtils.lerp(-3.8, 6.35, nm);
      moonGroupRef.current.visible = nm > 0.02;
      moonGroupRef.current.scale.setScalar(Math.max(0.01, nm));
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.rotation.y = t * 0.06 + 0.8;
    }

    starsUniforms.uTime.value = t * pace;
    const starAlpha = THREE.MathUtils.smoothstep(nm, 0.15, 0.95);
    starsUniforms.uOpacity.value = starAlpha;

    // Animate 34 Diffraction Star-Shine Sprites
    starShineSpecs.forEach((s, idx) => {
      const sp = starShineSpritesRef.current[idx];
      if (!sp) return;
      if (starAlpha <= 0.01) {
        sp.visible = false;
        return;
      }
      sp.visible = true;
      const gleam = 0.52 + 0.48 * Math.pow(0.5 + 0.5 * Math.sin(t * s.speed * pace + s.phase), 1.6);
      const scaleVal = s.baseScale * (0.72 + 0.55 * gleam) * starAlpha;
      sp.scale.set(scaleVal, scaleVal, 1);
      const mat = sp.material as THREE.SpriteMaterial;
      mat.opacity = gleam * starAlpha * 0.92;
      mat.rotation = Math.sin(t * 0.4 + s.phase) * 0.08;
    });

    // 6. Animate 3 Multi-Part 3D Comets in Night Scene
    cometsData.current.forEach((c, idx) => {
      const grp = cometGroupRefs.current[idx];
      if (!grp) return;

      if (nm < 0.18) {
        grp.visible = false;
        return;
      }

      if (!c.active) {
        grp.visible = false;
        c.cooldown -= dt * pace;
        if (c.cooldown <= 0) {
          // Relaunch along a fresh majestic sky trajectory
          const leftToRight = idx === 1;
          c.startX = leftToRight ? -11.5 - Math.random() * 2 : 10.5 + Math.random() * 2.5;
          c.endX = leftToRight ? 11.2 + Math.random() * 2 : -11.8 - Math.random() * 2;
          c.startY = 5.4 + Math.random() * 2.2;
          c.endY = 2.0 + Math.random() * 2.2;
          c.arcLift = 0.85 + Math.random() * 0.65;
          c.progress = 0;
          c.active = true;
        }
        return;
      }

      c.progress += dt * c.speed * pace;
      if (c.progress < 0) {
        grp.visible = false;
        return;
      }
      if (c.progress >= 1.0) {
        c.active = false;
        c.cooldown = idx === 0 ? 1.4 : 2.8 + Math.random() * 2.5;
        grp.visible = false;
        return;
      }

      // Parabolic celestial arc position + exact velocity tangent so tail streams behind head
      const p = c.progress;
      const x = THREE.MathUtils.lerp(c.startX, c.endX, p);
      const y =
        THREE.MathUtils.lerp(c.startY, c.endY, p) +
        Math.sin(p * Math.PI) * c.arcLift;

      const dp = 0.01;
      const nx = THREE.MathUtils.lerp(c.startX, c.endX, p + dp);
      const ny =
        THREE.MathUtils.lerp(c.startY, c.endY, p + dp) +
        Math.sin((p + dp) * Math.PI) * c.arcLift;

      const angle = Math.atan2(ny - y, nx - x);
      const envelope = Math.sin(p * Math.PI) * starAlpha;

      grp.visible = envelope > 0.01;
      grp.position.set(x, y, c.z);
      // Local +X points forward along flight vector; tail trails along -X
      grp.rotation.set(0, 0, angle);
      grp.scale.setScalar(c.scale);

      cometIonUniforms[idx].uTime.value = t * 3.5;
      cometIonUniforms[idx].uOpacity.value = envelope * 0.92;
      cometDustUniforms[idx].uTime.value = t * 2.6;
      cometDustUniforms[idx].uOpacity.value = envelope * 0.58;

      const headShine = cometHeadShineRefs.current[idx];
      if (headShine) {
        const pulse = 1.35 + Math.sin(t * 14 + idx) * 0.18;
        headShine.scale.set(pulse, pulse, 1);
        (headShine.material as THREE.SpriteMaterial).opacity = envelope;
      }
      const halo = cometHaloRefs.current[idx];
      if (halo) {
        (halo.material as THREE.SpriteMaterial).opacity = envelope * 0.85;
      }
    });
  });

  return (
    <group>
      {/* 1. ATMOSPHERIC SKY DOME */}
      <mesh scale={44}>
        <sphereGeometry args={[1, 32, 24]} />
        <shaderMaterial
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={skyUniforms}
          vertexShader={`
            varying vec3 vWorldDir;
            void main() {
              vWorldDir = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 uZenithColor;
            uniform vec3 uHorizonColor;
            uniform vec3 uCelestialGlow;
            uniform vec3 uCelestialDir;
            varying vec3 vWorldDir;
            void main() {
              float h = clamp(vWorldDir.y * 1.15 + 0.12, 0.0, 1.0);
              vec3 sky = mix(uHorizonColor, uZenithColor, pow(h, 0.68));
              float sunSpot = max(0.0, dot(normalize(vWorldDir), uCelestialDir));
              sky += uCelestialGlow * pow(sunSpot, 6.0) * 0.35;
              gl_FragColor = vec4(sky, 1.0);
            }
          `}
        />
      </mesh>

      {/* 2. SUNSHINE CELESTIAL ASSEMBLY & VOLUMETRIC SUNBEAM RAYS (LIGHT SCENE) */}
      <group ref={sunGroupRef} position={[-6.4, 6.85, -13.5]}>
        <mesh>
          <sphereGeometry args={[1.05, 28, 28]} />
          <meshBasicMaterial color="#fffbeb" />
        </mesh>
        <sprite scale={[6.6, 6.6, 1]}>
          <spriteMaterial
            map={haloTex}
            color="#fcd34d"
            transparent
            opacity={0.78}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        <mesh ref={sunCoronaRingRef}>
          <ringGeometry args={[1.38, 1.52, 48]} />
          <meshBasicMaterial
            color="#fde68a"
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh ref={sunBurstRingRef} visible={false}>
          <ringGeometry args={[1.25, 1.65, 64]} />
          <meshBasicMaterial
            color="#fef08a"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Diagonal Volumetric Sunbeam Rays */}
        <group ref={sunBeamsRef} rotation={[0, 0, -0.46]}>
          {[-0.22, -0.09, 0.03, 0.16, 0.29].map((angleOffset, idx) => (
            <mesh
              key={idx}
              position={[idx * 0.35 - 0.7, -5.8, 1.2]}
              rotation={[0.12, 0, angleOffset]}
            >
              <coneGeometry args={[1.65 + (idx % 2) * 0.45, 13.5, 20, 1, true]} />
              <shaderMaterial
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                uniforms={sunbeamUniforms}
                vertexShader={`
                  varying vec2 vUv;
                  varying vec3 vNormal;
                  varying vec3 vViewPos;
                  void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    vViewPos = -mvPos.xyz;
                    gl_Position = projectionMatrix * mvPos;
                  }
                `}
                fragmentShader={`
                  uniform float uOpacity;
                  uniform float uTime;
                  varying vec2 vUv;
                  varying vec3 vNormal;
                  varying vec3 vViewPos;
                  void main() {
                    float edgeSoft = pow(abs(dot(normalize(vNormal), normalize(vViewPos))), 1.7);
                    float lengthFade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.15, vUv.y);
                    float shimmer = 0.85 + 0.15 * sin(uTime * 1.6 + vUv.x * 12.0);
                    float alpha = edgeSoft * lengthFade * uOpacity * shimmer;
                    gl_FragColor = vec4(vec3(1.0, 0.91, 0.62), alpha);
                  }
                `}
              />
            </mesh>
          ))}
        </group>
      </group>

      {/* 3. DRIFTING COMPOSITE 6-PART 3D CUMULUS CLOUDS (LIGHT SCENE) */}
      <group ref={cloudsContainerRef}>
        {/* Shared soft sunlit cumulus material */}
        <mesh visible={false}>
          <sphereGeometry args={[0.1, 4, 4]} />
          <meshStandardMaterial
            ref={cloudMatRef}
            color="#ffffff"
            emissive="#fffbeb"
            emissiveIntensity={0.22}
            roughness={0.86}
            metalness={0.0}
            transparent
            opacity={0.96}
          />
        </mesh>

        {cloudSpecs.map((c, idx) => (
          <group
            key={idx}
            ref={(el) => {
              cloudGroupRefs.current[idx] = el;
            }}
            position={[c.baseX, c.y, c.z]}
            scale={c.scale}
          >
            {/* Central Billow Crown */}
            <mesh position={[0, 0.28, 0]} scale={[0.78, 0.62, 0.58]}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#fffdf5"
                emissiveIntensity={0.24}
                roughness={0.85}
                metalness={0.0}
              />
            </mesh>
            {/* Left Sunlit Crest */}
            <mesh position={[-0.68, 0.12, 0.08]} scale={[0.62, 0.48, 0.48]}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                color="#fffefc"
                emissive="#fef3c7"
                emissiveIntensity={0.2}
                roughness={0.88}
                metalness={0.0}
              />
            </mesh>
            {/* Right Cumulus Lobe */}
            <mesh position={[0.72, 0.08, -0.05]} scale={[0.66, 0.46, 0.5]}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                color="#f8fafc"
                emissive="#ffffff"
                emissiveIntensity={0.18}
                roughness={0.88}
                metalness={0.0}
              />
            </mesh>
            {/* Flat-Bottomed Cumulus Base */}
            <mesh position={[0.02, -0.14, 0]} scale={[1.38, 0.32, 0.55]}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                color="#eef6fc"
                emissive="#e0f2fe"
                emissiveIntensity={0.14}
                roughness={0.92}
                metalness={0.0}
              />
            </mesh>
            {/* Forward Accent Puff */}
            <mesh position={[-0.24, 0.04, 0.34]} scale={[0.52, 0.38, 0.4]}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#fffbeb"
                emissiveIntensity={0.22}
                roughness={0.86}
                metalness={0.0}
              />
            </mesh>
            {/* Trailing Wisp */}
            <mesh position={[-1.22, -0.08, -0.06]} scale={[0.42, 0.25, 0.32]}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                color="#f8fafc"
                emissive="#ffffff"
                emissiveIntensity={0.16}
                roughness={0.9}
                metalness={0.0}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4. FLYING COMPOSITE 6-PART SKY BIRDS (LIGHT SCENE) */}
      <group ref={skyBirdsContainerRef}>
        {skyBirdSpecs.map((_, idx) => (
          <group
            key={idx}
            ref={(el) => {
              skyBirdRefs.current[idx] = el;
            }}
          >
            {/* Streamlined Fusiform Body (aligned along +Z heading) */}
            <mesh scale={[0.065, 0.058, 0.21]}>
              <sphereGeometry args={[1, 10, 10]} />
              <meshStandardMaterial
                color="#f8fafc"
                emissive="#e2e8f0"
                emissiveIntensity={0.18}
                roughness={0.45}
              />
            </mesh>
            {/* Sculpted Head */}
            <mesh position={[0, 0.035, 0.19]} scale={0.052}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.42} />
            </mesh>
            {/* Golden-Amber Beak */}
            <mesh position={[0, 0.032, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.016, 0.085, 6]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.35} />
            </mesh>
            {/* Forked Swallow/Dove Tail Fan */}
            <mesh
              geometry={skyTailGeo}
              position={[0, 0.01, -0.18]}
              rotation={[Math.PI / 2 - 0.12, 0, 0]}
            >
              <meshStandardMaterial color="#e2e8f0" roughness={0.5} side={THREE.DoubleSide} />
            </mesh>
            {/* Articulated Swept Left Wing (+X) */}
            <group
              ref={(el) => {
                skyBirdWingLRefs.current[idx] = el;
              }}
              position={[0.04, 0.02, 0.04]}
            >
              <mesh geometry={skyWingGeo} rotation={[-Math.PI / 2, 0, 0]}>
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#f1f5f9"
                  emissiveIntensity={0.2}
                  roughness={0.42}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
            {/* Articulated Swept Right Wing (-X) */}
            <group
              ref={(el) => {
                skyBirdWingRRefs.current[idx] = el;
              }}
              position={[-0.04, 0.02, 0.04]}
            >
              <mesh
                geometry={skyWingGeo}
                rotation={[-Math.PI / 2, 0, Math.PI]}
                scale={[1, -1, 1]}
              >
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#f1f5f9"
                  emissiveIntensity={0.2}
                  roughness={0.42}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* 5. SCULPTED 3D MOON, STARRY FIELD & DIFFRACTION STAR SHINE (NIGHT SCENE) */}
      <group ref={moonGroupRef} position={[-4.5, 6.35, -13.8]}>
        <mesh ref={moonMeshRef}>
          <sphereGeometry args={[1.18, 36, 36]} />
          <meshStandardMaterial
            map={moonTextures.map}
            bumpMap={moonTextures.bumpMap}
            bumpScale={0.045}
            color="#f8fafc"
            emissive="#cbd5e1"
            emissiveMap={moonTextures.map}
            emissiveIntensity={0.74}
            roughness={0.78}
            metalness={0.05}
          />
        </mesh>
        <sprite scale={[6.2, 6.2, 1]}>
          <spriteMaterial
            map={haloTex}
            color="#93c5fd"
            transparent
            opacity={0.52}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        <mesh>
          <ringGeometry args={[1.55, 1.63, 48]} />
          <meshBasicMaterial
            color="#bfdbfe"
            transparent
            opacity={0.28}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 780 Twinkling Night Stars */}
      <points geometry={starsGeo} frustumCulled={false}>
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexColors
          blending={THREE.AdditiveBlending}
          uniforms={starsUniforms}
          vertexShader={`
            attribute float aSize;
            attribute float aPhase;
            uniform float uTime;
            uniform float uPixelRatio;
            varying vec3 vColor;
            varying float vTwinkle;
            void main() {
              vColor = color;
              vTwinkle = 0.52 + 0.48 * sin(uTime * 2.5 + aPhase * 6.28);
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = aSize * uPixelRatio * (0.75 + 0.45 * vTwinkle);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform float uOpacity;
            varying vec3 vColor;
            varying float vTwinkle;
            void main() {
              float d = length(gl_PointCoord - vec2(0.5));
              if (d > 0.5) discard;
              float core = smoothstep(0.5, 0.05, d);
              gl_FragColor = vec4(vColor, core * vTwinkle * uOpacity);
            }
          `}
        />
      </points>

      {/* 34 Hero Diffraction "Star Shine" Flares */}
      <group>
        {starShineSpecs.map((s, idx) => (
          <sprite
            key={idx}
            ref={(el) => {
              starShineSpritesRef.current[idx] = el;
            }}
            position={[s.x, s.y, s.z]}
            visible={theme === 'dark'}
          >
            <spriteMaterial
              map={starShineTex}
              color={s.color}
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        ))}
      </group>

      {/* 6. MULTI-PART 3D CELESTIAL COMETS (NIGHT SCENE) */}
      {[0, 1, 2].map((idx) => (
        <group
          key={idx}
          ref={(el) => {
            cometGroupRefs.current[idx] = el;
          }}
          visible={false}
        >
          {/* 1. Incandescent Crystalline Comet Nucleus */}
          <mesh>
            <icosahedronGeometry args={[0.1, 1]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* 2. Soft Cyan Coma Halo */}
          <sprite
            ref={(el) => {
              cometHaloRefs.current[idx] = el;
            }}
            scale={[1.45, 1.45, 1]}
          >
            <spriteMaterial
              map={haloTex}
              color="#7dd3fc"
              transparent
              opacity={0.85}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>

          {/* 3. Brilliant Star-Shine Coma Diffraction Flare */}
          <sprite
            ref={(el) => {
              cometHeadShineRefs.current[idx] = el;
            }}
            scale={[1.4, 1.4, 1]}
          >
            <spriteMaterial
              map={starShineTex}
              color="#f0f9ff"
              transparent
              opacity={0.95}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>

          {/* 4. Primary Luminous Ion Tail (streams along -X behind the nucleus) */}
          <mesh position={[-2.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.26, 4.3, 18, 1, true]} />
            <shaderMaterial
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              uniforms={cometIonUniforms[idx]}
              vertexShader={`
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `}
              fragmentShader={`
                uniform float uTime;
                uniform float uOpacity;
                varying vec2 vUv;
                void main() {
                  // vUv.y = 1.0 at cone apex (+X nucleus), 0.0 at wide far tail (-X)
                  float headToTail = vUv.y;
                  float plasma = 0.82 + 0.18 * sin(vUv.x * 24.0 + uTime * 2.5 - headToTail * 8.0);
                  float radialFade = sin(vUv.x * 3.14159);
                  float alpha = pow(headToTail, 1.55) * smoothstep(0.0, 0.18, headToTail) * plasma * radialFade * uOpacity;
                  vec3 headCol = vec3(0.88, 0.97, 1.0);
                  vec3 midCol = vec3(0.22, 0.74, 0.98);
                  vec3 tailCol = vec3(0.39, 0.40, 0.95);
                  vec3 col = mix(tailCol, mix(midCol, headCol, headToTail), headToTail);
                  gl_FragColor = vec4(col, alpha);
                }
              `}
            />
          </mesh>

          {/* 5. Secondary Angled Golden-White Dust Tail */}
          <mesh position={[-1.65, 0.18, -0.02]} rotation={[0, 0, -Math.PI / 2 - 0.11]}>
            <coneGeometry args={[0.32, 3.3, 16, 1, true]} />
            <shaderMaterial
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              uniforms={cometDustUniforms[idx]}
              vertexShader={`
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `}
              fragmentShader={`
                uniform float uOpacity;
                varying vec2 vUv;
                void main() {
                  float headToTail = vUv.y;
                  float alpha = pow(headToTail, 1.85) * smoothstep(0.0, 0.22, headToTail) * uOpacity;
                  vec3 dustCol = mix(vec3(0.65, 0.78, 1.0), vec3(1.0, 0.96, 0.86), headToTail);
                  gl_FragColor = vec4(dustCol, alpha * 0.65);
                }
              `}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
