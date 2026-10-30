import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getContactShadowTexture,
  groundHeightAt,
  isSoftwareGl,
  POND_CENTER_X,
  POND_CENTER_Z,
  POND_WATER_Y,
} from '../../utils/webgl';
import type { ThemeMode } from '../../types';

interface GardenFaunaProps {
  theme: ThemeMode;
  breezeIntensity: number;
}

export function GardenFauna({ theme, breezeIntensity }: GardenFaunaProps) {
  const contactShadowTex = useMemo(() => getContactShadowTexture(), []);

  // Refs for animated creatures
  const rabbitAnchorRefs = useRef<Array<THREE.Group | null>>([]);
  const rabbitBodyRefs = useRef<Array<THREE.Group | null>>([]);
  const rabbitEarRefs = useRef<Array<THREE.Group | null>>([]);

  const butterflyRefs = useRef<Array<THREE.Group | null>>([]);
  const butterflyWingLRefs = useRef<Array<THREE.Mesh | null>>([]);
  const butterflyWingRRefs = useRef<Array<THREE.Mesh | null>>([]);

  const birdRef = useRef<THREE.Group>(null);
  const birdWingLRef = useRef<THREE.Mesh>(null);
  const birdWingRRef = useRef<THREE.Mesh>(null);

  const koiRefs = useRef<Array<THREE.Group | null>>([]);
  const koiTailRefs = useRef<Array<THREE.Mesh | null>>([]);

  // Custom Bevelled Swallowtail Butterfly Wing Geometry
  const butterflyWingGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.08, 0.12, 0.22, 0.16, 0.24, 0.05);
    shape.bezierCurveTo(0.25, -0.03, 0.16, -0.06, 0.12, -0.04);
    shape.bezierCurveTo(0.18, -0.1, 0.15, -0.19, 0.06, -0.17);
    shape.bezierCurveTo(0.02, -0.15, 0.01, -0.06, 0, 0);

    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.004,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 1,
    });
    geo.computeVertexNormals();
    return geo;
  }, []);

  const rabbitSpecs = useMemo(
    () => [
      {
        cx: -4.45,
        cz: 0.65,
        rx: 0.85,
        rz: 0.55,
        speed: 0.42,
        phase: 0.3,
        fur: '#f8fafc',
        earInner: '#fda4af',
        scale: 0.82,
      },
      {
        cx: -2.25,
        cz: -0.95,
        rx: 0.72,
        rz: 0.52,
        speed: 0.36,
        phase: 2.4,
        fur: '#ede0d4',
        earInner: '#f9a8d4',
        scale: 0.74,
      },
    ],
    [],
  );

  const butterflySpecs = useMemo(
    () => [
      { cx: -4.9, cy: 1.35, cz: 0.5, rx: 1.25, rz: 1.05, speed: 0.75, phase: 0.0, color: '#fbbf24' },
      { cx: -3.2, cy: 1.15, cz: -0.6, rx: 1.1, rz: 0.9, speed: 0.85, phase: 1.4, color: '#38bdf8' },
      { cx: -1.8, cy: 1.25, cz: 1.6, rx: 0.95, rz: 0.85, speed: 0.68, phase: 2.8, color: '#f472b6' },
      { cx: -4.8, cy: 1.45, cz: 2.2, rx: 1.0, rz: 0.8, speed: 0.78, phase: 4.1, color: '#c084fc' },
      { cx: -2.6, cy: 1.65, cz: 0.2, rx: 1.35, rz: 1.15, speed: 0.64, phase: 5.2, color: '#fb7185' },
    ],
    [],
  );

  const koiSpecs = useMemo(
    () => [
      { r: 0.78, speed: 0.58, phase: 0, bodyColor: '#f97316', finColor: '#fff7ed', scale: 0.88 },
      { r: 0.54, speed: -0.52, phase: 2.1, bodyColor: '#f8fafc', finColor: '#ef4444', scale: 0.78 },
      { r: 0.92, speed: 0.44, phase: 4.2, bodyColor: '#fbbf24', finColor: '#fef3c7', scale: 0.82 },
    ],
    [],
  );

  useEffect(() => {
    return () => {
      butterflyWingGeo.dispose();
    };
  }, [butterflyWingGeo]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 1. Animate Hopping Garden Rabbits (smooth pause-and-hop gait grounded on terrain)
    rabbitSpecs.forEach((r, idx) => {
      const anchor = rabbitAnchorRefs.current[idx];
      const body = rabbitBodyRefs.current[idx];
      const ears = rabbitEarRefs.current[idx];
      if (!anchor || !body) return;

      // Smooth stepped angle so the rabbit hops gently, then pauses to sniff flowers
      const cycle = t * r.speed + r.phase;
      const pauseWave = cycle + Math.sin(cycle * 2.0) * 0.42;
      const x = r.cx + Math.cos(pauseWave) * r.rx;
      const z = r.cz + Math.sin(pauseWave * 2.0) * r.rz * 0.55;
      const groundY = groundHeightAt(x, z);

      // Tangential heading
      const eps = 0.02;
      const nextWave = pauseWave + eps;
      const nx = r.cx + Math.cos(nextWave) * r.rx;
      const nz = r.cz + Math.sin(nextWave * 2.0) * r.rz * 0.55;
      const heading = Math.atan2(nx - x, nz - z);

      // Velocity factor determines hop height
      const moveFactor = Math.max(0, Math.cos(cycle * 2.0 + 0.5));
      const hopPhase = (t * 5.2 + r.phase) % (Math.PI * 2);
      const hopArc = Math.max(0, Math.sin(hopPhase)) * 0.14 * moveFactor;

      anchor.position.set(x, groundY, z);
      anchor.rotation.y = heading;

      body.position.y = hopArc;
      body.rotation.x = -Math.sin(hopPhase) * 0.18 * moveFactor;

      if (ears) {
        ears.rotation.x = -0.22 + Math.sin(t * 4.5 + idx * 2.0) * 0.1;
      }
    });

    // 2. Animate Fluttering Swallowtail Butterflies
    butterflySpecs.forEach((b, idx) => {
      const grp = butterflyRefs.current[idx];
      const wingL = butterflyWingLRefs.current[idx];
      const wingR = butterflyWingRRefs.current[idx];
      if (!grp) return;

      const bt = t * b.speed + b.phase;
      const x = b.cx + Math.sin(bt) * b.rx + Math.cos(bt * 2.1) * 0.25;
      const z = b.cz + Math.cos(bt * 0.85) * b.rz;
      const y =
        b.cy +
        Math.sin(bt * 2.7) * 0.22 +
        Math.cos(bt * 1.4) * 0.12 * breezeIntensity;

      const dx = Math.cos(bt) * b.rx * b.speed;
      const dz = -Math.sin(bt * 0.85) * b.rz * b.speed * 0.85;

      grp.position.set(x, y, z);
      grp.rotation.y = Math.atan2(dx, dz);
      grp.rotation.x = 0.22;

      const flap = Math.sin(t * 14.5 + b.phase * 3.0) * 0.88;
      if (wingL) wingL.rotation.y = flap;
      if (wingR) wingR.rotation.y = -flap;
    });

    // 3. Animate Hovering Emerald Hummingbird visiting blossoms
    if (birdRef.current) {
      const ht = t * 0.52;
      const bx = -4.2 + Math.sin(ht) * 1.45 + Math.sin(ht * 3.0) * 0.22;
      const bz = -0.35 + Math.cos(ht * 0.9) * 1.25;
      const by = 1.65 + Math.sin(t * 2.8) * 0.14;

      const lookX = -4.2 + Math.sin(ht + 0.05) * 1.45;
      const lookZ = -0.35 + Math.cos((ht + 0.05) * 0.9) * 1.25;

      birdRef.current.position.set(bx, by, bz);
      birdRef.current.rotation.y = Math.atan2(lookX - bx, lookZ - bz);
      birdRef.current.rotation.x = Math.sin(t * 2.2) * 0.08;

      const rapidFlap = Math.sin(t * 32.0) * 0.95;
      if (birdWingLRef.current) birdWingLRef.current.rotation.z = rapidFlap;
      if (birdWingRRef.current) birdWingRRef.current.rotation.z = -rapidFlap;
    }

    // 4. Animate Pond Koi Fish in smooth figure-8 loops
    koiSpecs.forEach((k, idx) => {
      const grp = koiRefs.current[idx];
      const tail = koiTailRefs.current[idx];
      if (!grp) return;

      const kt = t * k.speed + k.phase;
      const kx = POND_CENTER_X + Math.sin(kt) * k.r * 1.15;
      const kz = POND_CENTER_Z + Math.sin(kt * 2.0) * k.r * 0.52;
      const nextKt = kt + (k.speed > 0 ? 0.03 : -0.03);
      const nkx = POND_CENTER_X + Math.sin(nextKt) * k.r * 1.15;
      const nkz = POND_CENTER_Z + Math.sin(nextKt * 2.0) * k.r * 0.52;

      grp.position.set(kx, POND_WATER_Y - 0.08, kz);
      grp.rotation.y = Math.atan2(nkx - kx, nkz - kz);
      if (tail) {
        tail.rotation.y = Math.sin(t * 8.5 + idx * 1.7) * 0.42;
      }
    });
  });

  return (
    <group>
      {/* 1. COMPOSITE 9-PART GARDEN RABBITS */}
      {rabbitSpecs.map((r, idx) => (
        <group
          key={idx}
          ref={(el) => {
            rabbitAnchorRefs.current[idx] = el;
          }}
          scale={r.scale}
        >
          {/* Grounded Contact Shadow */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.56, 0.56]} />
            <meshBasicMaterial
              map={contactShadowTex}
              transparent
              depthWrite={false}
              opacity={0.42}
            />
          </mesh>

          <group
            ref={(el) => {
              rabbitBodyRefs.current[idx] = el;
            }}
          >
            {/* Torso */}
            <mesh position={[0, 0.16, -0.02]} scale={[0.13, 0.12, 0.18]} castShadow={!isSoftwareGl}>
              <sphereGeometry args={[1, 14, 12]} />
              <meshStandardMaterial color={r.fur} roughness={0.85} metalness={0.02} />
            </mesh>
            {/* Chest Fluff */}
            <mesh position={[0, 0.18, 0.11]} scale={[0.095, 0.095, 0.09]}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.28, 0.14]} scale={[0.095, 0.09, 0.105]} castShadow={!isSoftwareGl}>
              <sphereGeometry args={[1, 14, 12]} />
              <meshStandardMaterial color={r.fur} roughness={0.82} />
            </mesh>
            {/* Rosy Nose */}
            <mesh position={[0, 0.28, 0.245]} scale={[0.022, 0.018, 0.02]}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial color="#fb7185" roughness={0.4} />
            </mesh>
            {/* Eyes */}
            <mesh position={[0.055, 0.305, 0.205]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshStandardMaterial color="#1e1b18" roughness={0.15} />
            </mesh>
            <mesh position={[-0.055, 0.305, 0.205]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshStandardMaterial color="#1e1b18" roughness={0.15} />
            </mesh>

            {/* Articulated Long Ears */}
            <group
              ref={(el) => {
                rabbitEarRefs.current[idx] = el;
              }}
              position={[0, 0.34, 0.11]}
            >
              <group position={[0.042, 0, 0]} rotation={[-0.18, 0, -0.16]}>
                <mesh position={[0, 0.09, 0]} scale={[0.028, 0.1, 0.016]}>
                  <sphereGeometry args={[1, 10, 10]} />
                  <meshStandardMaterial color={r.fur} roughness={0.84} />
                </mesh>
                <mesh position={[0, 0.09, 0.01]} scale={[0.016, 0.075, 0.008]}>
                  <sphereGeometry args={[1, 8, 8]} />
                  <meshStandardMaterial color={r.earInner} roughness={0.65} />
                </mesh>
              </group>
              <group position={[-0.042, 0, 0]} rotation={[-0.18, 0, 0.16]}>
                <mesh position={[0, 0.09, 0]} scale={[0.028, 0.1, 0.016]}>
                  <sphereGeometry args={[1, 10, 10]} />
                  <meshStandardMaterial color={r.fur} roughness={0.84} />
                </mesh>
                <mesh position={[0, 0.09, 0.01]} scale={[0.016, 0.075, 0.008]}>
                  <sphereGeometry args={[1, 8, 8]} />
                  <meshStandardMaterial color={r.earInner} roughness={0.65} />
                </mesh>
              </group>
            </group>

            {/* Fluffy Cotton Tail */}
            <mesh position={[0, 0.16, -0.21]} scale={0.052}>
              <sphereGeometry args={[1, 10, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.92} />
            </mesh>

            {/* Hind & Fore Paws */}
            <mesh position={[0.075, 0.055, -0.06]} scale={[0.042, 0.05, 0.075]}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial color={r.fur} roughness={0.86} />
            </mesh>
            <mesh position={[-0.075, 0.055, -0.06]} scale={[0.042, 0.05, 0.075]}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial color={r.fur} roughness={0.86} />
            </mesh>
            <mesh position={[0.052, 0.05, 0.1]} scale={[0.03, 0.05, 0.04]}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial color={r.fur} roughness={0.86} />
            </mesh>
            <mesh position={[-0.052, 0.05, 0.1]} scale={[0.03, 0.05, 0.04]}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial color={r.fur} roughness={0.86} />
            </mesh>
          </group>
        </group>
      ))}

      {/* 2. COMPOSITE 6-PART SWALLOWTAIL BUTTERFLIES */}
      {butterflySpecs.map((b, idx) => (
        <group
          key={idx}
          ref={(el) => {
            butterflyRefs.current[idx] = el;
          }}
          scale={0.85}
        >
          {/* Thorax & Abdomen */}
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.018, 0.09, 0.018]}>
            <capsuleGeometry args={[1, 2, 4, 8]} />
            <meshStandardMaterial color="#27272a" roughness={0.5} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.01, 0.095]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color="#18181b" roughness={0.4} />
          </mesh>
          {/* Left Wing */}
          <mesh
            ref={(el) => {
              butterflyWingLRefs.current[idx] = el;
            }}
            geometry={butterflyWingGeo}
            rotation={[Math.PI / 2, 0, Math.PI]}
          >
            <meshStandardMaterial
              color={b.color}
              roughness={0.35}
              metalness={0.08}
              emissive={b.color}
              emissiveIntensity={theme === 'dark' ? 0.55 : 0.12}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Right Wing */}
          <mesh
            ref={(el) => {
              butterflyWingRRefs.current[idx] = el;
            }}
            geometry={butterflyWingGeo}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <meshStandardMaterial
              color={b.color}
              roughness={0.35}
              metalness={0.08}
              emissive={b.color}
              emissiveIntensity={theme === 'dark' ? 0.55 : 0.12}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* 3. HOVERING 7-PART EMERALD HUMMINGBIRD */}
      <group ref={birdRef} scale={0.9}>
        {/* Iridescent Body */}
        <mesh rotation={[0.45, 0, 0]} scale={[0.055, 0.11, 0.06]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color="#10b981" roughness={0.25} metalness={0.55} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.085, 0.065]} scale={0.046}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshStandardMaterial color="#059669" roughness={0.22} metalness={0.6} />
        </mesh>
        {/* Ruby Gorget Throat Accent */}
        <mesh position={[0, 0.055, 0.095]} scale={[0.032, 0.028, 0.02]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#f43f5e" roughness={0.2} metalness={0.65} />
        </mesh>
        {/* Slender Nectar Beak */}
        <mesh position={[0, 0.085, 0.165]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.008, 0.14, 6]} />
          <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Fanned Tail */}
        <mesh position={[0, -0.06, -0.1]} rotation={[-0.5, 0, 0]} scale={[0.045, 0.008, 0.08]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#065f46" roughness={0.35} />
        </mesh>
        {/* Left & Right Wings */}
        <mesh
          ref={birdWingLRef}
          position={[0.09, 0.04, 0.01]}
          scale={[0.16, 0.008, 0.055]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#34d399" roughness={0.3} metalness={0.35} />
        </mesh>
        <mesh
          ref={birdWingRRef}
          position={[-0.09, 0.04, 0.01]}
          scale={[0.16, 0.008, 0.055]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#34d399" roughness={0.3} metalness={0.35} />
        </mesh>
      </group>

      {/* 4. POND KOI FISH (Composite 6-Part Fish) */}
      {koiSpecs.map((koi, idx) => (
        <group
          key={idx}
          ref={(el) => {
            koiRefs.current[idx] = el;
          }}
          scale={koi.scale}
        >
          {/* Fusiform Body */}
          <mesh scale={[0.055, 0.05, 0.16]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial
              color={koi.bodyColor}
              roughness={0.22}
              metalness={0.15}
              emissive={koi.bodyColor}
              emissiveIntensity={theme === 'dark' ? 0.28 : 0.05}
            />
          </mesh>
          {/* Dorsal Fin */}
          <mesh position={[0, 0.048, -0.02]} scale={[0.008, 0.035, 0.075]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={koi.finColor} roughness={0.35} />
          </mesh>
          {/* Pectoral Fins */}
          <mesh position={[0.055, -0.01, 0.04]} rotation={[0, 0.4, -0.25]} scale={[0.05, 0.006, 0.03]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={koi.finColor} roughness={0.35} />
          </mesh>
          <mesh position={[-0.055, -0.01, 0.04]} rotation={[0, -0.4, 0.25]} scale={[0.05, 0.006, 0.03]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={koi.finColor} roughness={0.35} />
          </mesh>
          {/* Articulated Caudal Tail Fin */}
          <mesh
            ref={(el) => {
              koiTailRefs.current[idx] = el;
            }}
            position={[0, 0, -0.17]}
            scale={[0.012, 0.055, 0.085]}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={koi.finColor} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
