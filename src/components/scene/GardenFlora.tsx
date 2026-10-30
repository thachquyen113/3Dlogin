import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getContactShadowTexture,
  getPetalRoughnessTexture,
  groundHeightAt,
  isSoftwareGl,
} from '../../utils/webgl';
import type { ThemeMode } from '../../types';

interface GardenFloraProps {
  theme: ThemeMode;
  breezeIntensity: number;
}

interface FlowerSpec {
  id: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotY: number;
  petalColor: string;
  innerColor: string;
  nightGlowColor: string;
  phase: number;
  petalCount: number;
}

const _tmpEmissive = new THREE.Color();

export function GardenFlora({ theme, breezeIntensity }: GardenFloraProps) {
  const { gl } = useThree();
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const contactShadowTex = useMemo(() => getContactShadowTexture(), []);
  const petalRoughTex = useMemo(() => getPetalRoughnessTexture(maxAniso), [maxAniso]);

  const flowerGroupsRef = useRef<Array<THREE.Group | null>>([]);
  const petalRingsRef = useRef<Array<THREE.Group | null>>([]);
  const treeCanopyRef = useRef<THREE.Group>(null);
  const hangingLanternRef = useRef<THREE.Group>(null);
  const hangingGlowMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const hangingPointLightRef = useRef<THREE.PointLight>(null);
  const stoneLanternGlowMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const stoneLanternLightRef = useRef<THREE.PointLight>(null);
  const openBloomProgress = useRef(theme === 'light' ? 1 : 0.35);

  // Shared Bevelled ExtrudeGeometry for Botanical Petals & Leaves
  const { petalGeo, leafGeo, calyxGeo } = useMemo(() => {
    // Sculpted teardrop petal shape
    const pShape = new THREE.Shape();
    pShape.moveTo(0, 0);
    pShape.bezierCurveTo(0.11, 0.08, 0.15, 0.28, 0.0, 0.42);
    pShape.bezierCurveTo(-0.15, 0.28, -0.11, 0.08, 0, 0);

    const pGeo = new THREE.ExtrudeGeometry(pShape, {
      steps: 2,
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    // Curve petal slightly upward for organic botanical cup
    const pPos = pGeo.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      const py = pPos.getY(i);
      const arch = Math.sin((py / 0.42) * Math.PI) * 0.045;
      pPos.setZ(i, pPos.getZ(i) + arch);
    }
    pGeo.computeVertexNormals();

    // Sculpted pointed botanical leaf shape
    const lShape = new THREE.Shape();
    lShape.moveTo(0, 0);
    lShape.bezierCurveTo(0.08, 0.07, 0.09, 0.22, 0.0, 0.34);
    lShape.bezierCurveTo(-0.09, 0.22, -0.08, 0.07, 0, 0);

    const lGeo = new THREE.ExtrudeGeometry(lShape, {
      steps: 1,
      depth: 0.01,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    });
    lGeo.computeVertexNormals();

    // LatheGeometry sepal calyx cup
    const cPoints = [
      new THREE.Vector2(0.018, 0),
      new THREE.Vector2(0.055, 0.04),
      new THREE.Vector2(0.075, 0.085),
      new THREE.Vector2(0.045, 0.09),
    ];
    const cGeo = new THREE.LatheGeometry(cPoints, 12);

    return { petalGeo: pGeo, leafGeo: lGeo, calyxGeo: cGeo };
  }, []);

  // Curved flower stem geometry (TubeGeometry)
  const stemGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.03, 0.32, 0.02),
      new THREE.Vector3(-0.02, 0.64, 0.03),
      new THREE.Vector3(0.01, 0.88, 0),
    ]);
    return new THREE.TubeGeometry(curve, 16, 0.022, 8, false);
  }, []);

  // Hero Blossom Sanctuary Tree Geometries (Composite 10-part sculpture)
  const treePosition = useMemo(() => {
    const tx = -5.3;
    const tz = -1.65;
    return new THREE.Vector3(tx, groundHeightAt(tx, tz), tz);
  }, []);

  const treeGeos = useMemo(() => {
    // 1. Root flare base (LatheGeometry)
    const rootPts = [
      new THREE.Vector2(0.62, 0),
      new THREE.Vector2(0.42, 0.22),
      new THREE.Vector2(0.31, 0.55),
      new THREE.Vector2(0.26, 0.9),
    ];
    const rootBase = new THREE.LatheGeometry(rootPts, 14);

    // 2. Main sinuous trunk
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0.18, 1.35, 0.08),
      new THREE.Vector3(-0.12, 2.35, 0.14),
      new THREE.Vector3(0.22, 3.15, -0.05),
    ]);
    const mainTrunk = new THREE.TubeGeometry(trunkCurve, 24, 0.21, 10, false);

    // 3. Three primary boughs reaching out over the garden & pond
    const boughRight = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.05, 2.1, 0.12),
        new THREE.Vector3(0.95, 2.65, 0.45),
        new THREE.Vector3(1.85, 2.88, 0.72),
      ]),
      18,
      0.11,
      8,
      false,
    );

    const boughLeft = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.08, 2.25, 0.08),
        new THREE.Vector3(-0.95, 2.85, -0.25),
        new THREE.Vector3(-1.55, 3.2, -0.45),
      ]),
      18,
      0.1,
      8,
      false,
    );

    const boughBack = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.15, 2.65, -0.02),
        new THREE.Vector3(0.45, 3.35, -0.75),
        new THREE.Vector3(0.65, 3.75, -1.2),
      ]),
      16,
      0.09,
      8,
      false,
    );

    return { rootBase, mainTrunk, boughRight, boughLeft, boughBack };
  }, []);

  // Stone Lantern ("Toro") Lathe pedestal
  const lanternPedestalGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.28, 0),
      new THREE.Vector2(0.26, 0.1),
      new THREE.Vector2(0.13, 0.22),
      new THREE.Vector2(0.11, 0.68),
      new THREE.Vector2(0.24, 0.78),
      new THREE.Vector2(0.28, 0.84),
    ];
    return new THREE.LatheGeometry(pts, 8);
  }, []);

  const stoneLanternPos = useMemo(() => {
    const lx = -1.42;
    const lz = 0.42;
    return new THREE.Vector3(lx, groundHeightAt(lx, lz), lz);
  }, []);

  // 14 Curated Multi-Part Animated Flowers across the left sanctuary
  const flowers: FlowerSpec[] = useMemo(() => {
    const rawCoords = [
      { x: -5.8, z: 0.7, s: 1.08, p: '#f472b6', inner: '#fbcfe8', glow: '#f472b6', n: 6 },
      { x: -5.1, z: 1.6, s: 0.94, p: '#fb7185', inner: '#ffe4e6', glow: '#fb7185', n: 7 },
      { x: -4.6, z: -0.35, s: 1.15, p: '#c084fc', inner: '#f3e8ff', glow: '#a855f7', n: 6 },
      { x: -3.9, z: -0.65, s: 0.9, p: '#fda4af', inner: '#fff1f2', glow: '#fb7185', n: 6 },
      { x: -2.4, z: -0.5, s: 1.12, p: '#facc15', inner: '#fef9c3', glow: '#38bdf8', n: 8 },
      { x: -1.8, z: -1.25, s: 0.96, p: '#fb923c', inner: '#ffedd5', glow: '#5eead4', n: 7 },
      { x: -1.25, z: 1.85, s: 1.05, p: '#f472b6', inner: '#fce7f3', glow: '#ec4899', n: 6 },
      { x: -2.05, z: 2.65, s: 0.92, p: '#a78bfa', inner: '#ede9fe', glow: '#818cf8', n: 6 },
      { x: -4.75, z: 2.85, s: 1.16, p: '#fb7185', inner: '#ffe4e6', glow: '#f43f5e', n: 7 },
      { x: -5.95, z: 2.35, s: 0.88, p: '#fcd34d', inner: '#fef3c7', glow: '#2dd4bf', n: 8 },
      { x: -3.15, z: 3.15, s: 1.02, p: '#f9a8d4', inner: '#fdf2f8', glow: '#f472b6', n: 6 },
      { x: -6.4, z: -0.6, s: 0.98, p: '#c084fc', inner: '#f3e8ff', glow: '#c084fc', n: 6 },
      { x: -2.95, z: -1.65, s: 1.06, p: '#fda4af', inner: '#fff1f2', glow: '#38bdf8', n: 7 },
      { x: -0.95, z: -0.35, s: 0.86, p: '#f9a8d4', inner: '#fdf2f8', glow: '#5eead4', n: 6 },
    ];

    return rawCoords.map((c, idx) => ({
      id: idx,
      x: c.x,
      y: groundHeightAt(c.x, c.z),
      z: c.z,
      scale: c.s,
      rotY: idx * 1.15,
      petalColor: c.p,
      innerColor: c.inner,
      nightGlowColor: c.glow,
      phase: idx * 0.77,
      petalCount: c.n,
    }));
  }, []);

  // Natural perimeter cypress/pine trees on the distant hills
  const backdropTrees = useMemo(() => {
    const coords = [
      { x: -9.5, z: -5.8, s: 1.45 },
      { x: -7.8, z: -6.4, s: 1.75 },
      { x: -5.9, z: -6.9, s: 1.35 },
      { x: -3.6, z: -6.5, s: 1.6 },
      { x: -1.4, z: -6.8, s: 1.28 },
      { x: -8.6, z: -3.8, s: 1.25 },
    ];
    return coords.map((t) => ({
      ...t,
      y: groundHeightAt(t.x, t.z),
    }));
  }, []);

  useEffect(() => {
    return () => {
      petalGeo.dispose();
      leafGeo.dispose();
      calyxGeo.dispose();
      stemGeo.dispose();
      treeGeos.rootBase.dispose();
      treeGeos.mainTrunk.dispose();
      treeGeos.boughRight.dispose();
      treeGeos.boughLeft.dispose();
      treeGeos.boughBack.dispose();
      lanternPedestalGeo.dispose();
    };
  }, [petalGeo, leafGeo, calyxGeo, stemGeo, treeGeos, lanternPedestalGeo]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);

    // Smoothly bloom open wider in sunshine, gently cup in night mode
    const targetOpen = theme === 'light' ? 1.0 : 0.48;
    openBloomProgress.current = THREE.MathUtils.damp(
      openBloomProgress.current,
      targetOpen,
      2.6,
      dt,
    );

    const openAngle = THREE.MathUtils.lerp(0.52, 1.14, openBloomProgress.current);
    const nightFactor = 1 - (openBloomProgress.current - 0.48) / 0.52;

    flowers.forEach((f, idx) => {
      const grp = flowerGroupsRef.current[idx];
      if (grp) {
        const swayX = Math.sin(t * 1.45 + f.phase) * 0.055 * breezeIntensity;
        const swayZ = Math.cos(t * 1.15 + f.phase * 1.3) * 0.045 * breezeIntensity;
        grp.rotation.x = swayX;
        grp.rotation.z = swayZ;
      }

      const ring = petalRingsRef.current[idx];
      if (ring) {
        ring.rotation.y = Math.sin(t * 0.5 + f.phase) * 0.08;
        ring.children.forEach((petalPivot, pIdx) => {
          const flutter = Math.sin(t * 2.2 + f.phase + pIdx * 0.9) * 0.045 * breezeIntensity;
          petalPivot.rotation.x = openAngle + flutter;

          const mesh = petalPivot.children[0] as THREE.Mesh | undefined;
          if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
            _tmpEmissive.set(f.nightGlowColor);
            mesh.material.emissive.copy(_tmpEmissive);
            mesh.material.emissiveIntensity = Math.max(0, nightFactor) * 0.36;
          }
        });
      }
    });

    // Gentle tree canopy breathing & hanging lantern pendulum sway
    if (treeCanopyRef.current) {
      treeCanopyRef.current.rotation.z = Math.sin(t * 0.85) * 0.018 * breezeIntensity;
      treeCanopyRef.current.rotation.x = Math.cos(t * 0.65) * 0.014 * breezeIntensity;
    }

    if (hangingLanternRef.current) {
      hangingLanternRef.current.rotation.z = Math.sin(t * 1.35) * 0.075 * breezeIntensity;
      hangingLanternRef.current.rotation.x = Math.cos(t * 1.05) * 0.045 * breezeIntensity;
    }

    // Lantern warm illumination smoothly brightens at night
    const targetEmissive = theme === 'dark' ? 2.4 : 0.35;
    const targetLightInt = theme === 'dark' ? 3.2 : 0.15;

    if (hangingGlowMatRef.current) {
      hangingGlowMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        hangingGlowMatRef.current.emissiveIntensity,
        targetEmissive,
        3.5,
        dt,
      );
    }
    if (hangingPointLightRef.current) {
      hangingPointLightRef.current.intensity = THREE.MathUtils.damp(
        hangingPointLightRef.current.intensity,
        targetLightInt,
        3.5,
        dt,
      );
    }
    if (stoneLanternGlowMatRef.current) {
      stoneLanternGlowMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        stoneLanternGlowMatRef.current.emissiveIntensity,
        targetEmissive * 0.9,
        3.5,
        dt,
      );
    }
    if (stoneLanternLightRef.current) {
      stoneLanternLightRef.current.intensity = THREE.MathUtils.damp(
        stoneLanternLightRef.current.intensity,
        targetLightInt * 0.85,
        3.5,
        dt,
      );
    }
  });

  return (
    <group>
      {/* 1. HERO ORNAMENTAL BLOSSOM TREE (10-Part Composite Group) */}
      <group position={treePosition}>
        {/* Ground Contact Shadow */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.4, 4.4]} />
          <meshBasicMaterial
            map={contactShadowTex}
            transparent
            depthWrite={false}
            opacity={0.52}
          />
        </mesh>

        {/* Sculpted Root Flare */}
        <mesh geometry={treeGeos.rootBase} castShadow receiveShadow>
          <meshStandardMaterial color="#4e382c" roughness={0.92} metalness={0.03} />
        </mesh>

        {/* Sinuous Main Trunk */}
        <mesh geometry={treeGeos.mainTrunk} castShadow receiveShadow>
          <meshStandardMaterial color="#584033" roughness={0.88} metalness={0.04} />
        </mesh>

        {/* Three Articulated Boughs */}
        <mesh geometry={treeGeos.boughRight} castShadow receiveShadow>
          <meshStandardMaterial color="#5c4336" roughness={0.86} metalness={0.04} />
        </mesh>
        <mesh geometry={treeGeos.boughLeft} castShadow receiveShadow>
          <meshStandardMaterial color="#5c4336" roughness={0.86} metalness={0.04} />
        </mesh>
        <mesh geometry={treeGeos.boughBack} castShadow receiveShadow>
          <meshStandardMaterial color="#5c4336" roughness={0.86} metalness={0.04} />
        </mesh>

        {/* Layered Organic Blossom Canopy Clusters */}
        <group ref={treeCanopyRef}>
          <mesh position={[0.15, 3.65, 0.05]} scale={[1.45, 0.95, 1.35]} castShadow receiveShadow>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial
              color="#fbcfe8"
              roughness={0.62}
              metalness={0.02}
              emissive="#f472b6"
              emissiveIntensity={theme === 'dark' ? 0.14 : 0.03}
            />
          </mesh>
          <mesh position={[1.75, 3.12, 0.68]} scale={[1.15, 0.78, 1.05]} castShadow receiveShadow>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial
              color="#fce7f3"
              roughness={0.58}
              metalness={0.02}
              emissive="#f9a8d4"
              emissiveIntensity={theme === 'dark' ? 0.16 : 0.04}
            />
          </mesh>
          <mesh position={[-1.45, 3.45, -0.38]} scale={[1.22, 0.85, 1.12]} castShadow receiveShadow>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial
              color="#f9a8d4"
              roughness={0.65}
              metalness={0.02}
              emissive="#ec4899"
              emissiveIntensity={theme === 'dark' ? 0.12 : 0.02}
            />
          </mesh>
          <mesh position={[0.65, 4.05, -1.05]} scale={[1.18, 0.82, 1.08]} castShadow receiveShadow>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial color="#fbcfe8" roughness={0.64} metalness={0.02} />
          </mesh>
          <mesh position={[-0.45, 4.18, 0.55]} scale={[0.98, 0.72, 0.95]} castShadow receiveShadow>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial color="#fdf2f8" roughness={0.55} metalness={0.03} />
          </mesh>
        </group>

        {/* Suspended Brass & Amber Sanctuary Lantern (5-part sub-assembly on Right Bough) */}
        <group ref={hangingLanternRef} position={[1.65, 2.78, 0.68]}>
          {/* Hanging cord */}
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.44, 6]} />
            <meshStandardMaterial color="#b48a3e" roughness={0.32} metalness={0.82} />
          </mesh>
          {/* Brass Canopy Cap */}
          <mesh position={[0, -0.44, 0]} castShadow>
            <coneGeometry args={[0.17, 0.11, 6]} />
            <meshStandardMaterial color="#c99b42" roughness={0.28} metalness={0.86} />
          </mesh>
          {/* Warm Glowing Lantern Core */}
          <mesh position={[0, -0.58, 0]}>
            <cylinderGeometry args={[0.105, 0.09, 0.22, 6]} />
            <meshStandardMaterial
              ref={hangingGlowMatRef}
              color="#fffbeb"
              emissive="#fbbf24"
              emissiveIntensity={theme === 'dark' ? 2.4 : 0.35}
              roughness={0.22}
            />
          </mesh>
          {/* Lower Brass Ring */}
          <mesh position={[0, -0.71, 0]}>
            <cylinderGeometry args={[0.11, 0.06, 0.06, 6]} />
            <meshStandardMaterial color="#c99b42" roughness={0.28} metalness={0.86} />
          </mesh>
          {/* Crimson Silk Tassel */}
          <mesh position={[0, -0.82, 0]}>
            <cylinderGeometry args={[0.015, 0.03, 0.16, 6]} />
            <meshStandardMaterial color="#be123c" roughness={0.78} metalness={0.05} />
          </mesh>
          {/* Warm Sanctuary Point Light */}
          <pointLight
            ref={hangingPointLightRef}
            position={[0, -0.6, 0]}
            color="#fbbf24"
            intensity={theme === 'dark' ? 3.2 : 0.15}
            distance={7.5}
            decay={2}
          />
        </group>
      </group>

      {/* 2. TRADITIONAL STONE GARDEN LANTERN ("TORO" - 7 Parts) */}
      <group position={stoneLanternPos}>
        {/* Ground Contact Shadow */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshBasicMaterial
            map={contactShadowTex}
            transparent
            depthWrite={false}
            opacity={0.48}
          />
        </mesh>
        {/* Sculpted Pedestal Column */}
        <mesh geometry={lanternPedestalGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#8d9499" roughness={0.86} metalness={0.05} />
        </mesh>
        {/* Warm Paper Chamber */}
        <mesh position={[0, 0.98, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.17, 0.28, 6]} />
          <meshStandardMaterial
            ref={stoneLanternGlowMatRef}
            color="#fef3c7"
            emissive="#f59e0b"
            emissiveIntensity={theme === 'dark' ? 2.1 : 0.3}
            roughness={0.4}
          />
        </mesh>
        {/* Stone Frame Pillars */}
        {[0, 1, 2, 3, 4, 5].map((corner) => (
          <mesh
            key={corner}
            position={[
              Math.cos((corner / 6) * Math.PI * 2) * 0.175,
              0.98,
              Math.sin((corner / 6) * Math.PI * 2) * 0.175,
            ]}
          >
            <cylinderGeometry args={[0.018, 0.018, 0.29, 5]} />
            <meshStandardMaterial color="#6e767b" roughness={0.85} />
          </mesh>
        ))}
        {/* Pagoda Roof */}
        <mesh position={[0, 1.22, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.42, 0.22, 6]} />
          <meshStandardMaterial color="#767e84" roughness={0.82} metalness={0.07} />
        </mesh>
        {/* Finial Ring & Lotus Bud Jewel */}
        <mesh position={[0, 1.36, 0]}>
          <torusGeometry args={[0.055, 0.018, 8, 14]} />
          <meshStandardMaterial color="#767e84" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.43, 0]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color="#889096" roughness={0.75} />
        </mesh>
        <pointLight
          ref={stoneLanternLightRef}
          position={[0, 1.0, 0]}
          color="#fbbf24"
          intensity={theme === 'dark' ? 2.6 : 0.12}
          distance={6}
          decay={2}
        />
      </group>

      {/* 3. 14 ANIMATED COMPOSITE BOTANICAL FLOWERS */}
      {flowers.map((flower, idx) => (
        <group
          key={flower.id}
          position={[flower.x, flower.y, flower.z]}
          rotation={[0, flower.rotY, 0]}
          scale={flower.scale}
        >
          {/* Soft Ground Contact Shadow */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.68, 0.68]} />
            <meshBasicMaterial
              map={contactShadowTex}
              transparent
              depthWrite={false}
              opacity={0.36}
            />
          </mesh>

          {/* Swaying Stem + Foliage + Blossom Assembly */}
          <group
            ref={(el) => {
              flowerGroupsRef.current[idx] = el;
            }}
          >
            {/* Curved Tube Stem */}
            <mesh geometry={stemGeo} castShadow={!isSoftwareGl} receiveShadow>
              <meshStandardMaterial color="#3c7d3e" roughness={0.68} metalness={0.04} />
            </mesh>

            {/* Leaf 1 (Lower Left) */}
            <mesh
              geometry={leafGeo}
              position={[0.02, 0.28, 0.02]}
              rotation={[0.85, 0.4, 0.65]}
              castShadow={!isSoftwareGl}
            >
              <meshStandardMaterial color="#468f44" roughness={0.56} metalness={0.05} />
            </mesh>

            {/* Leaf 2 (Mid Right) */}
            <mesh
              geometry={leafGeo}
              position={[-0.01, 0.48, 0.02]}
              rotation={[0.8, -0.5, -0.72]}
              scale={0.88}
              castShadow={!isSoftwareGl}
            >
              <meshStandardMaterial color="#529e4c" roughness={0.54} metalness={0.05} />
            </mesh>

            {/* Flower Head at Stem Apex */}
            <group position={[0.01, 0.87, 0]}>
              {/* Sepal Calyx Cup */}
              <mesh geometry={calyxGeo}>
                <meshStandardMaterial color="#2f6b34" roughness={0.65} metalness={0.04} />
              </mesh>

              {/* Articulated Radial Petals */}
              <group
                ref={(el) => {
                  petalRingsRef.current[idx] = el;
                }}
                position={[0, 0.075, 0]}
              >
                {Array.from({ length: flower.petalCount }).map((_, pIdx) => {
                  const angle = (pIdx / flower.petalCount) * Math.PI * 2;
                  return (
                    <group key={pIdx} rotation={[0, angle, 0]}>
                      <group rotation={[0.95, 0, 0]}>
                        <mesh
                          geometry={petalGeo}
                          castShadow={!isSoftwareGl}
                          receiveShadow
                        >
                          <meshStandardMaterial
                            color={pIdx % 2 === 0 ? flower.petalColor : flower.innerColor}
                            roughness={0.38}
                            roughnessMap={petalRoughTex}
                            metalness={0.04}
                          />
                        </mesh>
                      </group>
                    </group>
                  );
                })}
              </group>

              {/* Golden Stamen Crown & Central Pistil */}
              <mesh position={[0, 0.1, 0]}>
                <sphereGeometry args={[0.058, 12, 10]} />
                <meshStandardMaterial
                  color="#fbbf24"
                  roughness={0.32}
                  metalness={0.12}
                  emissive="#f59e0b"
                  emissiveIntensity={theme === 'dark' ? 0.65 : 0.15}
                />
              </mesh>
              <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.068, 0.012, 6, 12]} />
                <meshStandardMaterial
                  color="#fde047"
                  roughness={0.42}
                  emissive="#facc15"
                  emissiveIntensity={theme === 'dark' ? 0.45 : 0.08}
                />
              </mesh>
            </group>
          </group>
        </group>
      ))}

      {/* 4. DISTANT CYPRESS & PINE GROVE FOR NATURAL HORIZON PERIMETER */}
      {backdropTrees.map((bt, idx) => (
        <group key={idx} position={[bt.x, bt.y, bt.z]} scale={bt.s}>
          <mesh position={[0, 0.45, 0]} castShadow={!isSoftwareGl}>
            <cylinderGeometry args={[0.09, 0.14, 0.9, 7]} />
            <meshStandardMaterial color="#4a372b" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow={!isSoftwareGl}>
            <coneGeometry args={[0.68, 1.45, 8]} />
            <meshStandardMaterial color="#2d5e3e" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.95, 0]} castShadow={!isSoftwareGl}>
            <coneGeometry args={[0.52, 1.25, 8]} />
            <meshStandardMaterial color="#366e47" roughness={0.82} />
          </mesh>
          <mesh position={[0, 2.55, 0]} castShadow={!isSoftwareGl}>
            <coneGeometry args={[0.34, 0.95, 8]} />
            <meshStandardMaterial color="#427d52" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
