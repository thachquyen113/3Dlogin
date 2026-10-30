import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getContactShadowTexture,
  groundHeightAt,
  isSoftwareGl,
  POND_CENTER_X,
  POND_CENTER_Z,
  POND_RADIUS_X,
  POND_RADIUS_Z,
  POND_WATER_Y,
} from '../../utils/webgl';
import type { ThemeMode } from '../../types';

interface GardenTerrainProps {
  theme: ThemeMode;
  breezeIntensity: number;
}

const _dayTerrainTint = new THREE.Color('#ffffff');
const _nightTerrainTint = new THREE.Color('#5a759e');
const _dayGrassTint = new THREE.Color('#78b856');
const _nightGrassTint = new THREE.Color('#2c584c');
const _dayWaterColor = new THREE.Color('#3898a8');
const _nightWaterColor = new THREE.Color('#102e4a');

export function GardenTerrain({ theme, breezeIntensity }: GardenTerrainProps) {
  const terrainMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const grassMeshRef = useRef<THREE.InstancedMesh>(null);
  const grassMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const waterMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const lilyGroupRef = useRef<THREE.Group>(null);

  const contactShadowTex = useMemo(() => getContactShadowTexture(), []);

  // 1. Sculpted Rolling Terrain Geometry with Vertex Colors
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(48, 38, 104, 84);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const lushMeadow = new THREE.Color('#568f46');
    const mossyKnoll = new THREE.Color('#3e733b');
    const sunlitVerge = new THREE.Color('#71a853');
    const sandyBed = new THREE.Color('#8c826b');
    const rightMisty = new THREE.Color('#476b5e');
    const tmpColor = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = groundHeightAt(x, z);
      pos.setY(i, y);

      const dx = (x - POND_CENTER_X) / (POND_RADIUS_X * 1.15);
      const dz = (z - POND_CENTER_Z) / (POND_RADIUS_Z * 1.15);
      const pondFactor = Math.max(0, 1 - Math.sqrt(dx * dx + dz * dz));

      tmpColor.copy(lushMeadow);
      if (y > 0.15) {
        tmpColor.lerp(mossyKnoll, Math.min(1, (y - 0.15) * 1.4));
      } else {
        tmpColor.lerp(sunlitVerge, Math.min(0.65, Math.abs(Math.sin(x * 0.4 + z * 0.3)) * 0.6));
      }

      if (pondFactor > 0.1) {
        tmpColor.lerp(sandyBed, THREE.MathUtils.smoothstep(pondFactor, 0.1, 0.65));
      }

      if (x > 0.5) {
        tmpColor.lerp(rightMisty, Math.min(0.85, (x - 0.5) * 0.14));
      }

      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 2. Curved Tapered Grass Blade Geometry for InstancedMesh (420 tufts)
  const grassBladeGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.038, 0.42, 4, 4);
    geo.translate(0, 0.21, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const bend = Math.pow(y / 0.42, 2) * 0.08;
      pos.setX(i, pos.getX(i) + bend);
      pos.setZ(i, pos.getZ(i) * 0.45);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const grassCount = 420;
  const grassTransforms = useMemo(() => {
    const items: Array<{ x: number; y: number; z: number; rotY: number; scale: number; tint: THREE.Color }> = [];
    let seed = 1093;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const basePalette = ['#5ca449', '#6fb853', '#498c40', '#82c45c', '#539952'];

    let attempts = 0;
    while (items.length < grassCount && attempts < 3000) {
      attempts++;
      const x = -9.2 + rand() * 9.8; // Concentrated across the left garden & shoreline
      const z = -4.8 + rand() * 8.8;

      // Keep out of deep pond center
      const pdx = (x - POND_CENTER_X) / (POND_RADIUS_X * 0.88);
      const pdz = (z - POND_CENTER_Z) / (POND_RADIUS_Z * 0.88);
      if (pdx * pdx + pdz * pdz < 1.0) continue;

      const y = groundHeightAt(x, z);
      if (y < POND_WATER_Y + 0.02) continue;

      const scale = 0.85 + rand() * 0.35; // +-15% natural variation
      const rotY = rand() * Math.PI * 2;
      const tint = new THREE.Color(basePalette[Math.floor(rand() * basePalette.length)]);
      items.push({ x, y, z, rotY, scale, tint });
    }
    return items;
  }, []);

  useEffect(() => {
    const mesh = grassMeshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    grassTransforms.forEach((item, idx) => {
      dummy.position.set(item.x, item.y - 0.02, item.z);
      dummy.rotation.set(( idx % 5 - 2 ) * 0.04, item.rotY, 0);
      dummy.scale.set(item.scale, item.scale * (0.85 + (idx % 4) * 0.12), item.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.setColorAt(idx, item.tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [grassTransforms]);

  // Inject wind sway shader on grass PBR material
  const grassUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreeze: { value: 1.0 },
    }),
    [],
  );

  const onGrassBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uTime = grassUniforms.uTime;
      shader.uniforms.uBreeze = grassUniforms.uBreeze;
      shader.vertexShader =
        `uniform float uTime;\nuniform float uBreeze;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 instWorld = instanceMatrix[3].xyz;
          #else
            vec3 instWorld = vec3(0.0);
          #endif
          float hFactor = clamp(position.y / 0.42, 0.0, 1.0);
          float gust = sin(uTime * 1.9 + instWorld.x * 0.85 + instWorld.z * 0.65) * 0.09
                     + cos(uTime * 3.1 + instWorld.z * 1.3) * 0.035;
          transformed.x += gust * hFactor * hFactor * uBreeze;
          transformed.z += gust * 0.45 * hFactor * hFactor * uBreeze;
          `,
        );
    },
    [grassUniforms],
  );

  // Inject gentle concentric ripples on Pond Water PBR material
  const waterUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  );

  const onWaterBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uTime = waterUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float rDist = length(position.xy);
          float ripple = sin(rDist * 7.5 - uTime * 2.2) * 0.012 + cos(position.x * 4.5 + uTime * 1.6) * 0.008;
          transformed.z += ripple;
          `,
        );
    },
    [waterUniforms],
  );

  // Shoreline composite boulders (3-part groups: main stone, secondary boulder, moss cap)
  const shorelineStones = useMemo(() => {
    const angles = [0.25, 0.85, 1.65, 2.35, 3.1, 4.15, 5.05, 5.75];
    return angles.map((a, i) => {
      const rx = POND_RADIUS_X * (0.92 + (i % 3) * 0.08);
      const rz = POND_RADIUS_Z * (0.92 + ((i + 1) % 3) * 0.08);
      const x = POND_CENTER_X + Math.cos(a) * rx;
      const z = POND_CENTER_Z + Math.sin(a) * rz;
      const y = groundHeightAt(x, z);
      const scale = 0.22 + (i % 3) * 0.08;
      return { x, y, z, rotY: a * 1.7, scale };
    });
  }, []);

  // Water lily pads + composite 5-part lotus blossoms
  const waterLilies = useMemo(
    () => [
      { x: POND_CENTER_X - 0.65, z: POND_CENTER_Z - 0.25, scale: 1.0, rot: 0.4, color: '#f9b4c8' },
      { x: POND_CENTER_X + 0.55, z: POND_CENTER_Z + 0.35, scale: 0.86, rot: 2.1, color: '#fff1f5' },
      { x: POND_CENTER_X - 0.1, z: POND_CENTER_Z + 0.58, scale: 0.78, rot: 4.0, color: '#fbcfe8' },
    ],
    [],
  );

  useEffect(() => {
    return () => {
      terrainGeo.dispose();
      grassBladeGeo.dispose();
    };
  }, [terrainGeo, grassBladeGeo]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);
    const k = 1 - Math.exp(-3.2 * dt);

    grassUniforms.uTime.value = elapsed;
    grassUniforms.uBreeze.value = THREE.MathUtils.damp(
      grassUniforms.uBreeze.value,
      breezeIntensity,
      4,
      dt,
    );
    waterUniforms.uTime.value = elapsed;

    if (terrainMatRef.current) {
      terrainMatRef.current.color.lerp(
        theme === 'light' ? _dayTerrainTint : _nightTerrainTint,
        k,
      );
    }
    if (grassMatRef.current) {
      grassMatRef.current.color.lerp(
        theme === 'light' ? _dayGrassTint : _nightGrassTint,
        k,
      );
    }
    if (waterMatRef.current) {
      waterMatRef.current.color.lerp(
        theme === 'light' ? _dayWaterColor : _nightWaterColor,
        k,
      );
    }
    if (lilyGroupRef.current) {
      lilyGroupRef.current.children.forEach((lily, idx) => {
        lily.position.y = POND_WATER_Y + 0.015 + Math.sin(elapsed * 1.5 + idx * 1.8) * 0.012;
        lily.rotation.z = Math.sin(elapsed * 1.1 + idx) * 0.03;
      });
    }
  });

  return (
    <group>
      {/* Rolling Botanical Ground */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial
          ref={terrainMatRef}
          vertexColors
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* Instanced Meadow Grass Blades */}
      <instancedMesh
        ref={grassMeshRef}
        args={[grassBladeGeo, undefined, grassTransforms.length]}
        castShadow={!isSoftwareGl}
        receiveShadow
      >
        <meshStandardMaterial
          ref={grassMatRef}
          color="#78b856"
          roughness={0.76}
          metalness={0.04}
          onBeforeCompile={onGrassBeforeCompile}
        />
      </instancedMesh>

      {/* Tranquil Reflective Sanctuary Pond */}
      <mesh
        position={[POND_CENTER_X, POND_WATER_Y, POND_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[POND_RADIUS_X * 0.96, POND_RADIUS_Z * 0.96, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        <meshPhysicalMaterial
          ref={waterMatRef}
          color="#3898a8"
          roughness={0.08}
          metalness={0.12}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
          transmission={isSoftwareGl ? 0 : 0.72}
          transparent
          opacity={isSoftwareGl ? 0.78 : 0.94}
          ior={1.333}
          thickness={0.8}
          onBeforeCompile={onWaterBeforeCompile}
        />
      </mesh>

      {/* Floating Water Lilies (Composite 5-part Lotus Groups) */}
      <group ref={lilyGroupRef}>
        {waterLilies.map((lily, i) => (
          <group
            key={i}
            position={[lily.x, POND_WATER_Y + 0.015, lily.z]}
            rotation={[0, lily.rot, 0]}
            scale={lily.scale}
          >
            {/* Slotted Lily Pad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[0.24, 24, 0.15, Math.PI * 1.85]} />
              <meshStandardMaterial color="#357a44" roughness={0.62} metalness={0.05} side={THREE.DoubleSide} />
            </mesh>
            {/* Outer Lotus Petals */}
            {[0, 1, 2, 3, 4, 5].map((p) => (
              <mesh
                key={p}
                position={[
                  Math.cos((p / 6) * Math.PI * 2) * 0.065,
                  0.035,
                  Math.sin((p / 6) * Math.PI * 2) * 0.065,
                ]}
                rotation={[0.55, -(p / 6) * Math.PI * 2 + Math.PI / 2, 0]}
                scale={[0.045, 0.08, 0.02]}
              >
                <sphereGeometry args={[1, 10, 10]} />
                <meshStandardMaterial
                  color={lily.color}
                  roughness={0.4}
                  metalness={0.05}
                  emissive={theme === 'dark' ? lily.color : '#000000'}
                  emissiveIntensity={theme === 'dark' ? 0.25 : 0}
                />
              </mesh>
            ))}
            {/* Golden Receptacle Crown */}
            <mesh position={[0, 0.045, 0]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshStandardMaterial
                color="#f5b942"
                roughness={0.35}
                emissive="#f59e0b"
                emissiveIntensity={theme === 'dark' ? 0.55 : 0.12}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Composite Shoreline Boulders & Mossy Stones */}
      {shorelineStones.map((stone, idx) => (
        <group
          key={idx}
          position={[stone.x, stone.y, stone.z]}
          rotation={[0, stone.rotY, 0]}
        >
          {/* Contact shadow */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[stone.scale * 3.4, stone.scale * 3.4]} />
            <meshBasicMaterial
              map={contactShadowTex}
              transparent
              depthWrite={false}
              opacity={0.45}
            />
          </mesh>
          {/* Primary River Stone */}
          <mesh
            position={[0, stone.scale * 0.36, 0]}
            scale={[stone.scale * 1.35, stone.scale * 0.72, stone.scale * 1.05]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#737b80" roughness={0.84} metalness={0.06} />
          </mesh>
          {/* Secondary Companion Pebble */}
          <mesh
            position={[stone.scale * 0.85, stone.scale * 0.2, stone.scale * 0.35]}
            scale={[stone.scale * 0.65, stone.scale * 0.45, stone.scale * 0.58]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#878e91" roughness={0.78} metalness={0.08} />
          </mesh>
          {/* Velvet Moss Cushion Accent */}
          <mesh
            position={[-stone.scale * 0.15, stone.scale * 0.66, 0]}
            scale={[stone.scale * 0.85, stone.scale * 0.25, stone.scale * 0.68]}
            receiveShadow
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#4b8a42" roughness={0.95} metalness={0.0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
