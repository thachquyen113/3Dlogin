import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getBookPageTexture,
  getContactShadowTexture,
  getMonitorScreenTexture,
  getRugPatternTexture,
  getWoodFloorTexture,
  isSoftwareGl,
} from '../../utils/webgl';
import type {
  HoveredStudyItem,
  OfficeCameraPreset,
  ThemeMode,
} from '../../types';

interface OfficeStudySceneProps {
  theme: ThemeMode;
  lampsOn: boolean;
  isConversing: boolean;
  isScholarSpeaking: boolean;
  scholarExternalEngaged: boolean;
  scholarLabelDomRef: React.RefObject<HTMLDivElement | null>;
  onScholarPointerChange: (engaged: boolean) => void;
  onHoverStudyItem: React.Dispatch<React.SetStateAction<HoveredStudyItem | null>>;
  tooltipDomRef: React.RefObject<HTMLDivElement | null>;
  onSelectOfficeView: (preset: OfficeCameraPreset) => void;
  onOpenScholarChat: () => void;
}

interface BookSpec {
  id: string;
  x: number;
  w: number;
  h: number;
  d: number;
  color: string;
  tilt: number;
  title: string;
  author: string;
  edition: string;
}

interface HoveredAnchor {
  id: string;
  object: THREE.Object3D;
  localOffsetY: number;
}

const LIBRARY_CATALOG: ReadonlyArray<{
  title: string;
  author: string;
  edition: string;
}> = [
  {
    title: 'Flora Borealis: Illustrated Atlas',
    author: 'Carl von Linné',
    edition: 'First Folio · 1753',
  },
  {
    title: 'Architecture of Glass Conservatories',
    author: 'Joseph Paxton',
    edition: 'Engraved Plates · 1854',
  },
  {
    title: 'Nocturnal Pollination & Starlight',
    author: 'Dr. Evelyn Vance',
    edition: 'Field Monograph · Vol. II',
  },
  {
    title: 'Mosses, Ferns & Shaded Woodland',
    author: 'Claire Linnea',
    edition: 'Pressed Herbarium Edition',
  },
  {
    title: 'Celestial Comets & Orbital Tides',
    author: 'Edmond Halley',
    edition: 'Observatory Notes · 1705',
  },
  {
    title: 'Botanical Watercolors of Kyoto',
    author: 'Kenji Takahashi',
    edition: 'Linen-Bound Quarto',
  },
  {
    title: 'Orchids of the Cloud Forest',
    author: 'Marianne North',
    edition: 'Gilt Collector Issue',
  },
  {
    title: 'Acoustic Ecology of Songbirds',
    author: 'Arthur Linnea',
    edition: 'Sylva Archive Press',
  },
  {
    title: 'Medicinal Roots & Apothecary Lore',
    author: 'Elizabeth Blackwell',
    edition: 'Copperplate Reprint',
  },
  {
    title: 'Treatise on Japanese Koi Ponds',
    author: 'Haruto Sato',
    edition: 'Garden Craft Series',
  },
  {
    title: 'Alpine Wildflowers in Springtime',
    author: 'henriette d’Angeville',
    edition: 'Annotated Field Guide',
  },
  {
    title: 'The Secret Life of Ancient Oaks',
    author: 'Thomas Pakenham',
    edition: 'Walnut Library Binding',
  },
  {
    title: 'Lunar Phases & Perennial Cycles',
    author: 'Sophia Brahe',
    edition: 'Almanac Compendium',
  },
  {
    title: 'butterflies & Nectar Meadows',
    author: 'Maria Sibylla Merian',
    edition: 'Hand-Tinted Facsimile',
  },
  {
    title: 'Timber Joinery & Classic Studies',
    author: 'George Nakashima',
    edition: 'Studio Workshop Notes',
  },
  {
    title: 'Reflections from a Quiet Sofa',
    author: 'Michel de Montaigne',
    edition: 'Leather Pocket Essays',
  },
];

// Pre-allocated colors & projection vectors for zero-GC smooth frame updates
const _wallDayColor = new THREE.Color('#efe7d6');
const _wallNightColor = new THREE.Color('#1d273b');
const _bookHoverEmissive = new THREE.Color('#f59e0b');
const _zeroEmissive = new THREE.Color('#000000');
const _screenBaseEmissive = new THREE.Color('#1e4652');
const _screenHoverEmissive = new THREE.Color('#328899');
const _projWorldPos = new THREE.Vector3();
const _projNdcPos = new THREE.Vector3();

function projectObjectToScreen(
  obj: THREE.Object3D,
  localOffsetY: number,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number } {
  obj.updateWorldMatrix(true, false);
  _projWorldPos.set(0, localOffsetY, 0).applyMatrix4(obj.matrixWorld);
  _projNdcPos.copy(_projWorldPos).project(camera);
  const rawX = (_projNdcPos.x * 0.5 + 0.5) * width;
  const rawY = (-_projNdcPos.y * 0.5 + 0.5) * height;
  return {
    x: Math.max(140, Math.min(width - 140, rawX)),
    y: Math.max(118, Math.min(height - 32, rawY)),
  };
}

function projectScholarLabelToScreen(
  obj: THREE.Object3D,
  localOffsetY: number,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number; inView: boolean } {
  obj.updateWorldMatrix(true, false);
  _projWorldPos.set(0, localOffsetY, 0).applyMatrix4(obj.matrixWorld);
  _projNdcPos.copy(_projWorldPos).project(camera);
  const inView =
    _projNdcPos.z <= 1 &&
    _projNdcPos.x >= -1.08 &&
    _projNdcPos.x <= 1.08 &&
    _projNdcPos.y >= -1.08 &&
    _projNdcPos.y <= 1.08;
  const rawX = (_projNdcPos.x * 0.5 + 0.5) * width;
  const rawY = (-_projNdcPos.y * 0.5 + 0.5) * height;
  return {
    x: Math.max(108, Math.min(width - 108, rawX)),
    y: Math.max(82, Math.min(height - 48, rawY)),
    inView,
  };
}

/**
 * Generates deterministic rows of varied hardcover books with curated titles.
 */
function buildShelfBooks(seedBase: number, shelfWidth = 1.66): BookSpec[][] {
  const palette = [
    '#285443',
    '#7c2d23',
    '#26466d',
    '#8f5e28',
    '#4c3757',
    '#355c52',
    '#9a4632',
    '#c89d54',
    '#1f3a4d',
  ];

  let seed = seedBase;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  let catalogCounter = seedBase % LIBRARY_CATALOG.length;

  const shelves: BookSpec[][] = [];
  for (let s = 0; s < 4; s++) {
    const row: BookSpec[] = [];
    let cursor = -shelfWidth * 0.46;
    const limit = shelfWidth * 0.42;
    let bookIdx = 0;

    while (cursor < limit) {
      if (rand() < 0.14) {
        cursor += 0.12 + rand() * 0.12;
        continue;
      }
      const w = 0.042 + rand() * 0.045;
      const h = 0.24 + rand() * 0.12;
      const d = 0.21 + rand() * 0.05;
      const color = palette[Math.floor(rand() * palette.length)];
      const isLast = cursor + w * 2.2 >= limit;
      const tilt = isLast && rand() > 0.45 ? -0.18 : 0;

      const entry = LIBRARY_CATALOG[catalogCounter % LIBRARY_CATALOG.length];
      catalogCounter += 3;

      row.push({
        id: `book-${seedBase}-${s}-${bookIdx++}`,
        x: cursor + w * 0.5 + (tilt !== 0 ? 0.035 : 0),
        w,
        h,
        d,
        color,
        tilt,
        title: entry.title.charAt(0).toUpperCase() + entry.title.slice(1),
        author: entry.author,
        edition: entry.edition,
      });

      cursor += w + 0.008 + (tilt !== 0 ? 0.06 : 0);
    }
    shelves.push(row);
  }
  return shelves;
}

const ROMAN_SHELF = ['Shelf I', 'Shelf II', 'Shelf III', 'Shelf IV'] as const;

/**
 * Individual Interactive Hardcover Book with damped shelf pull-out,
 * warm golden emissive highlight, outline shell, and projected hover tooltip.
 */
function InteractiveShelfBook({
  book,
  baseTop,
  caseName,
  shelfIndex,
  onStartHover,
  onEndHover,
  onFocusBooks,
}: {
  book: BookSpec;
  baseTop: number;
  caseName: string;
  shelfIndex: number;
  onStartHover: (
    anchorObj: THREE.Object3D,
    localOffsetY: number,
    meta: Omit<HoveredStudyItem, 'initialX' | 'initialY'>,
  ) => void;
  onEndHover: (id: string) => void;
  onFocusBooks: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coverMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const foilMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const hoverMix = useRef(0);

  useFrame((_, delta) => {
    const target = hovered ? 1 : 0;
    if (Math.abs(hoverMix.current - target) < 0.002 && hoverMix.current === target) {
      return;
    }
    const dt = Math.min(delta, 0.1);
    hoverMix.current = THREE.MathUtils.damp(hoverMix.current, target, 12, dt);
    const m = hoverMix.current;

    if (groupRef.current) {
      // Smoothly pull the hovered volume slightly forward off the shelf
      groupRef.current.position.z = 0.02 + m * 0.075;
      const sc = 1 + m * 0.045;
      groupRef.current.scale.set(sc, sc, sc);
    }

    if (coverMatRef.current) {
      coverMatRef.current.emissive.lerpColors(_zeroEmissive, _bookHoverEmissive, m);
      coverMatRef.current.emissiveIntensity = m * 0.48;
    }

    if (foilMatRef.current) {
      foilMatRef.current.emissive.lerpColors(_zeroEmissive, _bookHoverEmissive, m);
      foilMatRef.current.emissiveIntensity = m * 0.85;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[book.x, baseTop + book.h * 0.5, 0.02]}
      rotation={[0, 0, book.tilt]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (groupRef.current) {
          onStartHover(groupRef.current, book.h * 0.55 + 0.04, {
            id: book.id,
            kind: 'book',
            category: `${caseName} · ${ROMAN_SHELF[shelfIndex] ?? 'Shelf'}`,
            title: book.title,
            subtitle: `By ${book.author}`,
            detail: `${book.edition} · Click to inspect shelves`,
            accentColor: '#f59e0b',
          });
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onEndHover(book.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onFocusBooks();
      }}
    >
      <mesh castShadow={!isSoftwareGl}>
        <boxGeometry args={[book.w, book.h, book.d]} />
        <meshStandardMaterial
          ref={coverMatRef}
          color={book.color}
          roughness={0.65}
        />
      </mesh>

      {/* Gold foil spine detail */}
      <mesh position={[0, book.h * 0.24, book.d * 0.5 + 0.002]}>
        <boxGeometry args={[book.w * 0.86, 0.016, 0.004]} />
        <meshStandardMaterial
          ref={foilMatRef}
          color="#e0b863"
          metalness={0.68}
          roughness={0.28}
        />
      </mesh>

      {/* Crisp Golden Rim Highlight Shell when Hovered */}
      {hovered && (
        <mesh>
          <boxGeometry args={[book.w + 0.008, book.h + 0.008, book.d + 0.008]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.28}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Composite Walnut Bookshelf with crown molding, 4 stocked interactive book tiers, and study curios.
 */
function WalnutBookshelf({
  position,
  rotation = [0, 0, 0],
  seed,
  caseName,
  withGlobe = false,
  shadowTex,
  onStartHover,
  onEndHover,
  onFocusBooks,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  seed: number;
  caseName: string;
  withGlobe?: boolean;
  shadowTex: THREE.CanvasTexture;
  onStartHover: (
    anchorObj: THREE.Object3D,
    localOffsetY: number,
    meta: Omit<HoveredStudyItem, 'initialX' | 'initialY'>,
  ) => void;
  onEndHover: (id: string) => void;
  onFocusBooks: () => void;
}) {
  const shelves = useMemo(() => buildShelfBooks(seed, 1.66), [seed]);
  const shelfY = [0.22, 0.78, 1.34, 1.9, 2.46];

  return (
    <group position={position} rotation={rotation}>
      {/* Ground Contact Shadow */}
      <mesh position={[0, 0.018, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.15, 0.78]} />
        <meshBasicMaterial
          map={shadowTex}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* Plinth Base */}
      <mesh position={[0, 0.1, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[1.86, 0.2, 0.42]} />
        <meshStandardMaterial color="#3c2415" roughness={0.62} />
      </mesh>

      {/* Back Panel */}
      <mesh position={[0, 1.38, -0.18]} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[1.8, 2.52, 0.04]} />
        <meshStandardMaterial color="#2c1a0f" roughness={0.74} />
      </mesh>

      {/* Left & Right Uprights */}
      <mesh position={[-0.88, 1.38, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[0.06, 2.56, 0.4]} />
        <meshStandardMaterial color="#4a2e1b" roughness={0.58} />
      </mesh>
      <mesh position={[0.88, 1.38, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[0.06, 2.56, 0.4]} />
        <meshStandardMaterial color="#4a2e1b" roughness={0.58} />
      </mesh>

      {/* Crown Molding Top */}
      <mesh position={[0, 2.68, 0.02]} castShadow={!isSoftwareGl}>
        <boxGeometry args={[1.96, 0.09, 0.46]} />
        <meshStandardMaterial color="#3b2314" roughness={0.52} />
      </mesh>

      {/* Horizontal Shelves */}
      {shelfY.map((sy, idx) => (
        <mesh key={idx} position={[0, sy, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
          <boxGeometry args={[1.74, 0.036, 0.38]} />
          <meshStandardMaterial color="#533520" roughness={0.56} />
        </mesh>
      ))}

      {/* Interactive Hardcover Books */}
      {shelves.map((row, sIdx) => {
        const baseTop = shelfY[sIdx] + 0.018;
        return (
          <group key={sIdx}>
            {row.map((b) => (
              <InteractiveShelfBook
                key={b.id}
                book={b}
                baseTop={baseTop}
                caseName={caseName}
                shelfIndex={sIdx}
                onStartHover={onStartHover}
                onEndHover={onEndHover}
                onFocusBooks={onFocusBooks}
              />
            ))}
          </group>
        );
      })}

      {/* Optional Brass & Emerald Study Globe on Shelf 3 */}
      {withGlobe && (
        <group position={[0.56, shelfY[2] + 0.02, 0.03]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.075, 0.095, 0.04, 16]} />
            <meshStandardMaterial color="#c99b42" metalness={0.78} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.1, 10]} />
            <meshStandardMaterial color="#c99b42" metalness={0.78} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[0.35, 0.6, -0.22]}>
            <sphereGeometry args={[0.115, 20, 16]} />
            <meshStandardMaterial color="#2f6c5e" roughness={0.44} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[0, 0.2, 0.38]}>
            <torusGeometry args={[0.132, 0.009, 10, 28, Math.PI * 1.25]} />
            <meshStandardMaterial color="#d4a74a" metalness={0.82} roughness={0.25} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Potted Botanical Study Plant in a Terracotta Planter.
 */
function StudyPottedPlant({
  position,
  shadowTex,
}: {
  position: [number, number, number];
  shadowTex: THREE.CanvasTexture;
}) {
  const leaves = useMemo(
    () => [
      { rotY: 0.2, tilt: 0.42, h: 0.68, scale: 1.0 },
      { rotY: 1.35, tilt: 0.5, h: 0.62, scale: 0.92 },
      { rotY: 2.5, tilt: 0.38, h: 0.74, scale: 1.08 },
      { rotY: 3.7, tilt: 0.48, h: 0.6, scale: 0.88 },
      { rotY: 4.85, tilt: 0.34, h: 0.78, scale: 1.05 },
      { rotY: 5.7, tilt: 0.55, h: 0.56, scale: 0.85 },
    ],
    [],
  );

  return (
    <group position={position}>
      <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.85, 0.85]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* Terracotta Pot */}
      <mesh position={[0, 0.22, 0]} castShadow={!isSoftwareGl}>
        <cylinderGeometry args={[0.24, 0.17, 0.44, 18]} />
        <meshStandardMaterial color="#a85338" roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.43, 0]}>
        <torusGeometry args={[0.235, 0.024, 10, 24]} />
        <meshStandardMaterial color="#b55d40" roughness={0.72} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial color="#382518" roughness={0.95} />
      </mesh>
      {/* Arching Stems & Broad Botanical Leaves */}
      {leaves.map((lf, i) => (
        <group key={i} position={[0, 0.4, 0]} rotation={[0, lf.rotY, 0]}>
          <mesh position={[0.08, lf.h * 0.42, 0]} rotation={[0, 0, -lf.tilt * 0.6]}>
            <cylinderGeometry args={[0.012, 0.018, lf.h, 8]} />
            <meshStandardMaterial color="#2a593d" roughness={0.68} />
          </mesh>
          <mesh
            position={[0.22, lf.h * 0.78, 0]}
            rotation={[0.12, 0, -lf.tilt]}
            scale={[0.18 * lf.scale, 0.02, 0.28 * lf.scale]}
            castShadow={!isSoftwareGl}
          >
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#2f6e49" roughness={0.48} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Curled-up 3D Sleeping Orange Tabby Cat with rhythmic purr-breathing,
 * peaceful closed eyes, occasional sleepy ear twitch, and curled striped tail.
 */
function SleepingOrangeCat({
  position,
  rotation = [0, 0, 0],
  shadowTex,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  shadowTex: THREE.CanvasTexture;
}) {
  const breathBodyRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const rightEarRef = useRef<THREE.Group>(null);
  const tailTipRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Gentle sleepy cat breathing (slightly faster than human breathing)
    const sleepBreath = Math.sin(t * 2.05);
    if (breathBodyRef.current) {
      breathBodyRef.current.scale.set(
        1 + sleepBreath * 0.022,
        1 + sleepBreath * 0.05,
        1 + sleepBreath * 0.028,
      );
    }

    // Subtle head rise/settle on paws
    if (headGroupRef.current) {
      headGroupRef.current.position.y = 0.088 + sleepBreath * 0.004;
      headGroupRef.current.rotation.z = 0.14 + sleepBreath * 0.015;
    }

    // Occasional sleepy ear twitch every ~5.6 seconds
    if (rightEarRef.current) {
      const cycle = t % 5.6;
      const twitch =
        cycle > 4.9 && cycle < 5.25
          ? Math.sin(((cycle - 4.9) / 0.35) * Math.PI * 2) * 0.24
          : 0;
      rightEarRef.current.rotation.z = -0.26 + twitch;
    }

    // Slow relaxed tail-tip curl
    if (tailTipRef.current) {
      tailTipRef.current.rotation.y = 0.42 + Math.sin(t * 1.15) * 0.1;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Soft Contact Shadow on Sofa Cushion */}
      <mesh position={[0, 0.003, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.48, 0.38]} />
        <meshBasicMaterial
          map={shadowTex}
          transparent
          opacity={0.48}
          depthWrite={false}
        />
      </mesh>

      {/* Breathing Curled Marmalade-Orange Torso & Tabby Stripes */}
      <group ref={breathBodyRef} position={[0.02, 0.088, -0.01]}>
        {/* Main Curled Ribcage / Back */}
        <mesh
          rotation={[0.06, 0.28, 0]}
          scale={[0.185, 0.105, 0.145]}
          castShadow={!isSoftwareGl}
          receiveShadow={!isSoftwareGl}
        >
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial color="#e67e28" roughness={0.82} />
        </mesh>

        {/* Curled Haunch / Hindquarters */}
        <mesh
          position={[0.105, -0.006, 0.048]}
          rotation={[0, -0.55, 0]}
          scale={[0.132, 0.098, 0.122]}
          castShadow={!isSoftwareGl}
        >
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color="#df7622" roughness={0.84} />
        </mesh>

        {/* Soft Cream Belly Fur Undertone */}
        <mesh
          position={[-0.015, -0.032, 0.055]}
          scale={[0.125, 0.062, 0.095]}
        >
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#fdf2de" roughness={0.88} />
        </mesh>

        {/* Ginger Tabby Back Stripes */}
        {[-0.055, 0.005, 0.065].map((sx, idx) => (
          <mesh
            key={idx}
            position={[sx, 0.058 - Math.abs(idx - 1) * 0.006, -0.012]}
            rotation={[0.22, 0.25 - idx * 0.18, 0.12]}
            scale={[0.024, 0.058, 0.125]}
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#b44d12" roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* Tucked Front Paws with White Mittens */}
      {[
        [-0.145, 0.026, 0.095, 0.2],
        [-0.075, 0.026, 0.125, -0.15],
      ].map(([px, py, pz, rotY], i) => (
        <group key={i} position={[px, py, pz]} rotation={[0, rotY, 0]}>
          <mesh scale={[0.038, 0.025, 0.052]} castShadow={!isSoftwareGl}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#e67e28" roughness={0.82} />
          </mesh>
          <mesh position={[-0.012, -0.002, 0.024]} scale={[0.033, 0.022, 0.032]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#fff8eb" roughness={0.86} />
          </mesh>
        </group>
      ))}

      {/* Peaceful Sleeping Cat Head Nestled Over Front Paws */}
      <group
        ref={headGroupRef}
        position={[-0.115, 0.088, 0.068]}
        rotation={[0.18, 0.58, 0.14]}
      >
        {/* Orange Cranium */}
        <mesh scale={[1.05, 0.94, 1.0]} castShadow={!isSoftwareGl}>
          <sphereGeometry args={[0.084, 20, 16]} />
          <meshStandardMaterial color="#eb842e" roughness={0.8} />
        </mesh>

        {/* Forehead Tabby 'M' Crest */}
        <mesh position={[0, 0.048, 0.056]} rotation={[-0.45, 0, 0]}>
          <boxGeometry args={[0.038, 0.008, 0.032]} />
          <meshStandardMaterial color="#b44d12" roughness={0.85} />
        </mesh>

        {/* Plump Cream Whisker Muzzle Pads */}
        {[-0.024, 0.024].map((mx, i) => (
          <mesh key={i} position={[mx, -0.018, 0.068]} scale={[0.95, 0.82, 0.85]}>
            <sphereGeometry args={[0.028, 12, 10]} />
            <meshStandardMaterial color="#fff8eb" roughness={0.85} />
          </mesh>
        ))}

        {/* Tiny Rosy Pink Nose */}
        <mesh position={[0, -0.006, 0.088]} scale={[1.1, 0.8, 0.8]}>
          <sphereGeometry args={[0.011, 10, 10]} />
          <meshStandardMaterial color="#f28b9f" roughness={0.5} />
        </mesh>

        {/* Closed Peaceful Sleeping Eyelids (Curved Dark Lashes) */}
        {[-0.034, 0.034].map((ex, i) => (
          <mesh
            key={i}
            position={[ex, 0.012, 0.073]}
            rotation={[0.25, i === 0 ? -0.28 : 0.28, Math.PI]}
          >
            <torusGeometry args={[0.016, 0.0032, 8, 14, Math.PI]} />
            <meshStandardMaterial color="#4a2511" roughness={0.7} />
          </mesh>
        ))}

        {/* Left Ear */}
        <group position={[-0.052, 0.068, 0.008]} rotation={[0.12, 0.15, 0.26]}>
          <mesh castShadow={!isSoftwareGl}>
            <coneGeometry args={[0.034, 0.068, 12]} />
            <meshStandardMaterial color="#e07520" roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.004, 0.014]} scale={[0.62, 0.72, 0.4]}>
            <coneGeometry args={[0.03, 0.058, 10]} />
            <meshStandardMaterial color="#f7b4c6" roughness={0.75} />
          </mesh>
        </group>

        {/* Right Ear (with occasional sleepy dream twitch) */}
        <group
          ref={rightEarRef}
          position={[0.052, 0.068, 0.008]}
          rotation={[0.12, -0.15, -0.26]}
        >
          <mesh castShadow={!isSoftwareGl}>
            <coneGeometry args={[0.034, 0.068, 12]} />
            <meshStandardMaterial color="#e07520" roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.004, 0.014]} scale={[0.62, 0.72, 0.4]}>
            <coneGeometry args={[0.03, 0.058, 10]} />
            <meshStandardMaterial color="#f7b4c6" roughness={0.75} />
          </mesh>
        </group>
      </group>

      {/* Fluffy Striped Tail Curled Around Body */}
      <group position={[0.175, 0.042, 0.075]} rotation={[0, -0.35, 0]}>
        {/* Base Tail Segment */}
        <mesh
          position={[0, 0, 0.05]}
          rotation={[Math.PI / 2, 0, 0.35]}
          castShadow={!isSoftwareGl}
        >
          <capsuleGeometry args={[0.025, 0.09, 8, 12]} />
          <meshStandardMaterial color="#e67e28" roughness={0.84} />
        </mesh>
        {/* Mid Tail Segment + Ginger Ring */}
        <mesh
          position={[-0.068, 0, 0.115]}
          rotation={[Math.PI / 2, 0, 1.18]}
          castShadow={!isSoftwareGl}
        >
          <capsuleGeometry args={[0.023, 0.085, 8, 12]} />
          <meshStandardMaterial color="#b44d12" roughness={0.85} />
        </mesh>
        {/* Animated Cream-Tipped Tail End */}
        <group ref={tailTipRef} position={[-0.135, 0, 0.132]} rotation={[0, 0.42, 0]}>
          <mesh
            position={[-0.038, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow={!isSoftwareGl}
          >
            <capsuleGeometry args={[0.021, 0.055, 8, 12]} />
            <meshStandardMaterial color="#eb842e" roughness={0.84} />
          </mesh>
          <mesh position={[-0.072, 0, 0]} scale={[1.25, 0.95, 0.95]}>
            <sphereGeometry args={[0.021, 10, 10]} />
            <meshStandardMaterial color="#fff8eb" roughness={0.86} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Plush Tufted Sofa + Animated Old Man Sitting & Reading an Open Hardcover Book
 * + Sleeping Orange Tabby Cat curled beside him.
 */
function SofaWithReadingScholar({
  position,
  rotation = [0, 0, 0],
  bookPageTex,
  shadowTex,
  lampsOn,
  theme,
  isConversing,
  isScholarSpeaking,
  scholarExternalEngaged,
  scholarAnchorRef,
  onScholarRaycastHoverChange,
  onOpenScholarChat,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  bookPageTex: THREE.CanvasTexture;
  shadowTex: THREE.CanvasTexture;
  lampsOn: boolean;
  theme: ThemeMode;
  isConversing: boolean;
  isScholarSpeaking: boolean;
  scholarExternalEngaged: boolean;
  scholarAnchorRef: React.MutableRefObject<THREE.Object3D | null>;
  onScholarRaycastHoverChange: (hovered: boolean) => void;
  onOpenScholarChat: () => void;
}) {
  const scholarGroupRef = useRef<THREE.Group>(null);
  const upperBodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const beardRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const turningPageRef = useRef<THREE.Group>(null);
  const bookGroupRef = useRef<THREE.Group>(null);
  const glassesRimLeftRef = useRef<THREE.MeshStandardMaterial>(null);
  const glassesRimRightRef = useRef<THREE.MeshStandardMaterial>(null);
  const auraRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const leaveTimerRef = useRef<number | null>(null);

  // Shared tailored navy-charcoal suit wool material (highlights jacket + sleeves uniformly on hover)
  const suitJacketMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e2b3e',
        emissive: '#d97706',
        emissiveIntensity: 0,
        roughness: 0.66,
        metalness: 0.04,
      }),
    [],
  );

  useEffect(() => {
    scholarAnchorRef.current = scholarGroupRef.current;
    return () => {
      scholarAnchorRef.current = null;
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
      }
      suitJacketMat.dispose();
    };
  }, [scholarAnchorRef, suitJacketMat]);

  const [scholarHovered, setScholarHovered] = useState(false);
  const hoverMix = useRef(0);
  const lookUpMix = useRef(0);
  const speakMix = useRef(0);

  const activateScholarPointer = useCallback(() => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    document.body.style.cursor = 'pointer';
    setScholarHovered(true);
    onScholarRaycastHoverChange(true);
  }, [onScholarRaycastHoverChange]);

  const scheduleDeactivateScholarPointer = useCallback(() => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null;
      document.body.style.cursor = '';
      setScholarHovered(false);
      onScholarRaycastHoverChange(false);
    }, 220);
  }, [onScholarRaycastHoverChange]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = clock.getElapsedTime();

    const isHighlighted = scholarHovered || scholarExternalEngaged;

    hoverMix.current = THREE.MathUtils.damp(
      hoverMix.current,
      isHighlighted ? 1 : 0,
      10,
      dt,
    );
    const targetLookUp = isConversing ? 1 : isHighlighted ? 0.56 : 0;
    lookUpMix.current = THREE.MathUtils.damp(
      lookUpMix.current,
      targetLookUp,
      5.5,
      dt,
    );
    speakMix.current = THREE.MathUtils.damp(
      speakMix.current,
      isScholarSpeaking ? 1 : 0,
      7.5,
      dt,
    );

    const hm = hoverMix.current;
    const lm = lookUpMix.current;
    const sm = speakMix.current;

    // Subtle warm highlight on tailored suit blazer & gold glasses when hovered, focused, or conversing
    suitJacketMat.emissiveIntensity = hm * 0.24 + (isConversing ? 0.1 : 0);
    if (glassesRimLeftRef.current) {
      glassesRimLeftRef.current.emissiveIntensity = hm * 0.45 + sm * 0.25;
    }
    if (glassesRimRightRef.current) {
      glassesRimRightRef.current.emissiveIntensity = hm * 0.45 + sm * 0.25;
    }
    if (auraRingMatRef.current) {
      auraRingMatRef.current.opacity = hm * 0.34 + (isConversing ? 0.16 : 0);
    }

    // Calm breathing cycle + upright 60-year-old posture
    const breath = Math.sin(t * 1.45);
    if (upperBodyRef.current) {
      upperBodyRef.current.position.y = 0.68 + breath * 0.007;
      upperBodyRef.current.rotation.x =
        THREE.MathUtils.lerp(0.045, 0.015, lm) + breath * 0.012;
      upperBodyRef.current.rotation.y = THREE.MathUtils.lerp(0, 0.08, lm);
    }

    // Periodic page-turn every 7 seconds (paused smoothly while conversing)
    const cycle = t % 7.0;
    const isTurning = lm < 0.25 && cycle > 5.75 && cycle < 6.75;
    const turnProgress = isTurning ? (cycle - 5.75) / 1.0 : 0;
    const smoothTurn =
      turnProgress > 0
        ? turnProgress * turnProgress * (3 - 2 * turnProgress)
        : 0;

    // Reading head movement smoothly blends into looking up & nodding during conversation
    if (headRef.current) {
      const lineScan = Math.sin(t * 0.72) * 0.11;
      const pageNod = Math.sin(t * 1.44) * 0.028;
      const readRotX = 0.34 + pageNod + (isTurning ? 0.04 : 0);
      const readRotY = lineScan;

      const speakNod = Math.sin(t * 5.4) * 0.048 * sm;
      const speakTurn = Math.sin(t * 2.3) * 0.045 * sm;
      const converseRotX = 0.03 + Math.sin(t * 1.1) * 0.02 + speakNod;
      const converseRotY = 0.14 + Math.sin(t * 0.65) * 0.035 + speakTurn;

      headRef.current.rotation.x = THREE.MathUtils.lerp(readRotX, converseRotX, lm);
      headRef.current.rotation.y = THREE.MathUtils.lerp(readRotY, converseRotY, lm);
      headRef.current.rotation.z =
        Math.sin(t * 0.45) * 0.022 + Math.sin(t * 3.1) * 0.02 * sm;
    }

    // Subtle trimmed-beard / jaw articulation while speaking an answer
    if (beardRef.current) {
      beardRef.current.position.y =
        -0.068 - Math.abs(Math.sin(t * 8.6)) * 0.009 * sm;
    }

    // Right forearm turns pages when reading, or gestures gently when speaking
    if (rightArmRef.current) {
      const turnLift = Math.sin(smoothTurn * Math.PI);
      const speakGesture = (0.5 + 0.5 * Math.sin(t * 4.4)) * 0.22 * sm;
      rightArmRef.current.rotation.x =
        -0.78 - turnLift * 0.16 - lm * 0.08 - speakGesture;
      rightArmRef.current.rotation.z =
        0.24 + turnLift * 0.14 - speakGesture * 0.45;
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -0.78 + breath * 0.015 + lm * 0.06;
    }

    // Book rests lower on his lap while conversing so his face & hands stay open
    if (bookGroupRef.current) {
      bookGroupRef.current.position.y =
        THREE.MathUtils.lerp(0.9, 0.83, lm) + breath * 0.01;
      bookGroupRef.current.rotation.x = THREE.MathUtils.lerp(0.62, 0.38, lm);
    }

    // Flipping page arcs 160 degrees from right page to left page
    if (turningPageRef.current) {
      if (isTurning) {
        turningPageRef.current.visible = true;
        turningPageRef.current.rotation.z = 0.12 + smoothTurn * (Math.PI - 0.24);
      } else {
        turningPageRef.current.visible = false;
      }
    }
  });

  const lampIntensity = lampsOn ? (theme === 'dark' ? 3.2 : 1.75) : 0;

  return (
    <group position={position} rotation={rotation}>
      {/* Sofa Ground Contact Shadow */}
      <mesh position={[0, 0.018, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.95, 1.55]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.62} depthWrite={false} />
      </mesh>

      {/* ==================== 1. COMPOSITE TUFTED SOFA ==================== */}
      {/* 4 Tapered Walnut Legs */}
      {[
        [-1.08, 0.09, -0.4],
        [1.08, 0.09, -0.4],
        [-1.08, 0.09, 0.4],
        [1.08, 0.09, 0.4],
      ].map(([lx, ly, lz], i) => (
        <mesh key={i} position={[lx, ly, lz]} castShadow={!isSoftwareGl}>
          <cylinderGeometry args={[0.042, 0.028, 0.18, 12]} />
          <meshStandardMaterial color="#3d2415" roughness={0.55} />
        </mesh>
      ))}

      {/* Walnut Plinth Base */}
      <mesh position={[0, 0.23, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[2.36, 0.12, 0.98]} />
        <meshStandardMaterial color="#4a2d1b" roughness={0.58} />
      </mesh>

      {/* Upholstered Lower Apron */}
      <mesh position={[0, 0.34, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[2.34, 0.14, 0.96]} />
        <meshStandardMaterial color="#2f5649" roughness={0.82} />
      </mesh>

      {/* 3 Plush Seat Cushions */}
      {[-0.72, 0, 0.72].map((cx, i) => (
        <mesh
          key={i}
          position={[cx, 0.47, 0.05]}
          castShadow={!isSoftwareGl}
          receiveShadow={!isSoftwareGl}
        >
          <boxGeometry args={[0.7, 0.16, 0.84]} />
          <meshStandardMaterial color="#376455" roughness={0.85} />
        </mesh>
      ))}

      {/* Tufted Backrest + 3 Back Cushions */}
      <mesh
        position={[0, 0.82, -0.39]}
        rotation={[-0.08, 0, 0]}
        castShadow={!isSoftwareGl}
        receiveShadow={!isSoftwareGl}
      >
        <boxGeometry args={[2.32, 0.82, 0.22]} />
        <meshStandardMaterial color="#2c5144" roughness={0.84} />
      </mesh>
      {[-0.71, 0, 0.71].map((cx, i) => (
        <mesh
          key={i}
          position={[cx, 0.8, -0.25]}
          rotation={[-0.1, 0, 0]}
          castShadow={!isSoftwareGl}
          receiveShadow={!isSoftwareGl}
        >
          <boxGeometry args={[0.68, 0.56, 0.16]} />
          <meshStandardMaterial color="#3b6b5b" roughness={0.86} />
        </mesh>
      ))}

      {/* Rolled Left & Right Armrests */}
      {[-1.12, 1.12].map((ax, i) => (
        <group key={i} position={[ax, 0.62, 0]}>
          <mesh castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
            <boxGeometry args={[0.2, 0.46, 0.96]} />
            <meshStandardMaterial color="#325c4e" roughness={0.84} />
          </mesh>
          <mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={!isSoftwareGl}>
            <cylinderGeometry args={[0.115, 0.115, 0.96, 16]} />
            <meshStandardMaterial color="#3a6959" roughness={0.82} />
          </mesh>
        </group>
      ))}

      {/* Cozy Accent Throw Pillows */}
      <mesh
        position={[0.84, 0.68, -0.05]}
        rotation={[0.18, -0.35, 0.24]}
        scale={[0.34, 0.32, 0.14]}
        castShadow={!isSoftwareGl}
      >
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#c88d42" roughness={0.88} />
      </mesh>
      <mesh
        position={[-0.88, 0.66, -0.06]}
        rotation={[0.15, 0.32, -0.25]}
        scale={[0.3, 0.29, 0.13]}
        castShadow={!isSoftwareGl}
      >
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#9e4d3a" roughness={0.88} />
      </mesh>

      {/* ==================== 1B. SLEEPING ORANGE CAT ON RIGHT OF OLD MAN ==================== */}
      <SleepingOrangeCat
        position={[0.52, 0.55, 0.12]}
        rotation={[0, -0.32, 0]}
        shadowTex={shadowTex}
      />

      {/* ==================== 2. INTERACTIVE 60-YEAR-OLD SCHOLAR IN TAILORED SUIT ==================== */}
      <group
        ref={scholarGroupRef}
        position={[-0.14, 0, 0.04]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          activateScholarPointer();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          activateScholarPointer();
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          activateScholarPointer();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          scheduleDeactivateScholarPointer();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenScholarChat();
        }}
      >
        {/* Invisible simplified hit-volume proxy around the person & open book for smooth hover/move detection */}
        <mesh position={[0, 0.76, 0.14]}>
          <capsuleGeometry args={[0.35, 0.84, 6, 12]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>

        {/* Subtle floor/seat golden interaction ring when hovered or conversing */}
        <mesh position={[0, 0.024, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.44, 32]} />
          <meshBasicMaterial
            ref={auraRingMatRef}
            color="#f59e0b"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>

        {/* Seated Suit Trousers Pelvis + Leather Belt & Gold Buckle */}
        <mesh position={[0, 0.58, -0.05]} castShadow={!isSoftwareGl}>
          <boxGeometry args={[0.38, 0.15, 0.3]} />
          <meshStandardMaterial color="#1b2638" roughness={0.68} />
        </mesh>
        <mesh position={[0, 0.65, 0.08]}>
          <boxGeometry args={[0.35, 0.032, 0.06]} />
          <meshStandardMaterial color="#1c120c" roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.65, 0.114]}>
          <boxGeometry args={[0.046, 0.036, 0.012]} />
          <meshStandardMaterial color="#d4af37" metalness={0.86} roughness={0.22} />
        </mesh>

        {/* Left & Right Tailored Suit Trousers + Navy Dress Socks + Polished Oxford Shoes */}
        {[-0.105, 0.105].map((lx, idx) => (
          <group key={idx}>
            {/* Tailored Suit Thigh resting on sofa cushion */}
            <mesh
              position={[lx, 0.58, 0.17]}
              rotation={[Math.PI / 2 - 0.06, idx === 0 ? 0.04 : -0.04, 0]}
              castShadow={!isSoftwareGl}
            >
              <capsuleGeometry args={[0.076, 0.3, 8, 14]} />
              <meshStandardMaterial color="#1d293b" roughness={0.66} />
            </mesh>
            {/* Pressed Suit Trouser Leg angling down to floor rug */}
            <mesh
              position={[lx * 1.08, 0.32, 0.42]}
              rotation={[0.16, 0, 0]}
              castShadow={!isSoftwareGl}
            >
              <capsuleGeometry args={[0.064, 0.34, 8, 14]} />
              <meshStandardMaterial color="#1a2536" roughness={0.66} />
            </mesh>
            {/* Crisp Trouser Hem Cuff */}
            <mesh position={[lx * 1.08, 0.155, 0.45]} rotation={[0.16, 0, 0]}>
              <cylinderGeometry args={[0.066, 0.066, 0.03, 14]} />
              <meshStandardMaterial color="#172131" roughness={0.68} />
            </mesh>
            {/* Dark Navy Ribbed Dress Sock */}
            <mesh position={[lx * 1.08, 0.115, 0.46]}>
              <cylinderGeometry args={[0.046, 0.046, 0.075, 10]} />
              <meshStandardMaterial color="#0f172a" roughness={0.82} />
            </mesh>
            {/* Polished Espresso-Black Leather Oxford Dress Shoe */}
            <group position={[lx * 1.1, 0.055, 0.535]} rotation={[0, idx === 0 ? 0.05 : -0.05, 0]}>
              <mesh scale={[0.072, 0.05, 0.15]} castShadow={!isSoftwareGl}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshStandardMaterial color="#1b110c" roughness={0.24} metalness={0.1} />
              </mesh>
              {/* Oxford Cap-Toe Seam Accent */}
              <mesh position={[0, 0.008, 0.075]} scale={[0.062, 0.036, 0.065]}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshStandardMaterial color="#140c08" roughness={0.18} metalness={0.14} />
              </mesh>
              {/* Welted Leather Sole & Heel */}
              <mesh position={[0, -0.032, 0]}>
                <boxGeometry args={[0.126, 0.022, 0.258]} />
                <meshStandardMaterial color="#0d0806" roughness={0.58} />
              </mesh>
            </group>
          </group>
        ))}

        {/* Upright 60-Year-Old Upper Body: Tailored Suit Jacket, Dress Shirt, Silk Tie & Head */}
        <group ref={upperBodyRef} position={[0, 0.68, -0.07]} rotation={[0.045, 0, 0]}>
          {/* Tailored Suit Blazer Torso */}
          <mesh position={[0, 0.22, 0]} material={suitJacketMat} castShadow={!isSoftwareGl}>
            <capsuleGeometry args={[0.186, 0.27, 10, 18]} />
          </mesh>

          {/* Structured Tailored Suit Shoulders */}
          {[-0.185, 0.185].map((sx, i) => (
            <mesh
              key={i}
              position={[sx, 0.365, 0.01]}
              scale={[0.85, 0.62, 0.92]}
              material={suitJacketMat}
              castShadow={!isSoftwareGl}
            >
              <sphereGeometry args={[0.078, 12, 10]} />
            </mesh>
          ))}

          {/* Crisp White Poplin Dress Shirt V-Front */}
          <mesh position={[0, 0.33, 0.146]} rotation={[-0.16, 0, 0]}>
            <boxGeometry args={[0.135, 0.21, 0.058]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.48} />
          </mesh>

          {/* Structured Spread Shirt Collar Wings */}
          {[-0.044, 0.044].map((cx, i) => (
            <mesh
              key={i}
              position={[cx, 0.428, 0.092]}
              rotation={[0.25, i === 0 ? 0.35 : -0.35, i === 0 ? -0.32 : 0.32]}
            >
              <boxGeometry args={[0.062, 0.042, 0.022]} />
              <meshStandardMaterial color="#ffffff" roughness={0.44} />
            </mesh>
          ))}

          {/* Silk Burgundy-Crimson Necktie (Windsor Knot + Tapered Blade + Gold Tie Bar) */}
          <mesh position={[0, 0.405, 0.128]} scale={[1.05, 0.95, 0.78]}>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color="#7f1d28" roughness={0.32} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0.285, 0.166]} rotation={[-0.16, 0, 0]}>
            <boxGeometry args={[0.036, 0.21, 0.016]} />
            <meshStandardMaterial color="#881f2b" roughness={0.32} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0.295, 0.176]} rotation={[-0.16, 0, 0]}>
            <boxGeometry args={[0.038, 0.007, 0.008]} />
            <meshStandardMaterial color="#d4af37" metalness={0.88} roughness={0.2} />
          </mesh>

          {/* Sharp Notched Suit Lapels (Upper Collar + Lower Blade) */}
          {[-0.076, 0.076].map((sx, i) => (
            <group key={i}>
              <mesh
                position={[sx, 0.265, 0.166]}
                rotation={[-0.1, i === 0 ? 0.12 : -0.12, i === 0 ? -0.22 : 0.22]}
                material={suitJacketMat}
              >
                <boxGeometry args={[0.048, 0.26, 0.032]} />
              </mesh>
              <mesh
                position={[sx * 1.12, 0.392, 0.118]}
                rotation={[-0.22, 0, i === 0 ? -0.42 : 0.42]}
                material={suitJacketMat}
              >
                <boxGeometry args={[0.042, 0.08, 0.028]} />
              </mesh>
            </group>
          ))}

          {/* Left Breast Welt Pocket + Crisp Folded Silk Pocket Square */}
          <mesh position={[-0.108, 0.305, 0.164]} rotation={[-0.1, -0.22, 0.05]}>
            <boxGeometry args={[0.054, 0.012, 0.016]} />
            <meshStandardMaterial color="#131c29" roughness={0.7} />
          </mesh>
          <mesh position={[-0.106, 0.322, 0.164]} rotation={[-0.08, -0.22, 0.18]}>
            <boxGeometry args={[0.038, 0.026, 0.008]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.38} />
          </mesh>

          {/* Two Tailored Horn/Gold Blazer Buttons */}
          {[0.145, 0.078].map((by, i) => (
            <mesh key={i} position={[0, by, 0.186]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.01, 12]} />
              <meshStandardMaterial color="#c99c42" metalness={0.78} roughness={0.28} />
            </mesh>
          ))}

          {/* Neck */}
          <mesh position={[0, 0.45, 0.02]}>
            <cylinderGeometry args={[0.068, 0.076, 0.1, 12]} />
            <meshStandardMaterial color="#e8bea3" roughness={0.64} />
          </mesh>

          {/* 60-Year-Old Distinguished Head: Salt-and-Pepper Hair, Silver Temples & Trimmed Beard */}
          <group ref={headRef} position={[0, 0.55, 0.04]} rotation={[0.34, 0, 0]}>
            {/* Cranium */}
            <mesh castShadow={!isSoftwareGl}>
              <sphereGeometry args={[0.148, 22, 18]} />
              <meshStandardMaterial color="#eec6ab" roughness={0.62} />
            </mesh>

            {/* Ears */}
            {[-0.142, 0.142].map((ex, i) => (
              <mesh key={i} position={[ex, -0.01, 0]} scale={[0.45, 0.85, 0.65]}>
                <sphereGeometry args={[0.042, 10, 10]} />
                <meshStandardMaterial color="#e6ba9e" roughness={0.64} />
              </mesh>
            ))}

            {/* Styled Charcoal Salt-and-Pepper Crown Hair + Side-Swept Forelock */}
            <mesh position={[0, 0.038, -0.026]} scale={[1.05, 0.99, 1.06]}>
              <sphereGeometry args={[0.146, 20, 16]} />
              <meshStandardMaterial color="#373f49" roughness={0.74} />
            </mesh>
            <mesh
              position={[0.02, 0.118, 0.065]}
              rotation={[-0.28, 0.12, -0.16]}
              scale={[1.15, 0.46, 0.82]}
            >
              <sphereGeometry args={[0.082, 14, 10]} />
              <meshStandardMaterial color="#434c58" roughness={0.72} />
            </mesh>

            {/* Distinguished 60-Year-Old Silver-Grey Temples */}
            {[-0.126, 0.126].map((hx, i) => (
              <mesh key={i} position={[hx, 0.012, 0.016]} scale={[0.42, 0.7, 0.82]}>
                <sphereGeometry args={[0.09, 12, 10]} />
                <meshStandardMaterial color="#9aa4b2" roughness={0.78} />
              </mesh>
            ))}

            {/* Nose */}
            <mesh position={[0, -0.012, 0.148]} rotation={[0.25, 0, 0]}>
              <capsuleGeometry args={[0.02, 0.032, 6, 10]} />
              <meshStandardMaterial color="#e5b699" roughness={0.62} />
            </mesh>

            {/* Attentive Eyes & Salt-and-Pepper Eyebrows */}
            {[-0.052, 0.052].map((ex, i) => (
              <group key={i}>
                <mesh position={[ex, 0.015, 0.134]}>
                  <sphereGeometry args={[0.014, 10, 10]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.32} />
                </mesh>
                <mesh
                  position={[ex, 0.048, 0.136]}
                  rotation={[0, 0, i === 0 ? 0.06 : -0.06]}
                >
                  <boxGeometry args={[0.046, 0.013, 0.018]} />
                  <meshStandardMaterial color="#464f5b" roughness={0.8} />
                </mesh>
              </group>
            ))}

            {/* Refined Gold-Rimmed Glasses */}
            <group position={[0, 0.012, 0.148]}>
              {[-0.052, 0.052].map((gx, i) => (
                <group key={i} position={[gx, 0, 0]}>
                  <mesh>
                    <torusGeometry args={[0.032, 0.0042, 10, 22]} />
                    <meshStandardMaterial
                      ref={i === 0 ? glassesRimLeftRef : glassesRimRightRef}
                      color="#d9ad4f"
                      emissive="#fbbf24"
                      emissiveIntensity={0}
                      metalness={0.85}
                      roughness={0.22}
                    />
                  </mesh>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.003, 16]} />
                    <meshStandardMaterial
                      color="#dbeafe"
                      transparent
                      opacity={0.25}
                      roughness={0.12}
                    />
                  </mesh>
                </group>
              ))}
              {/* Nose Bridge */}
              <mesh position={[0, 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0035, 0.0035, 0.042, 8]} />
                <meshStandardMaterial color="#d9ad4f" metalness={0.85} roughness={0.22} />
              </mesh>
            </group>

            {/* Neatly Trimmed 60-Year-Old Salt-and-Pepper Jawline Beard & Groomed Mustache */}
            <mesh
              ref={beardRef}
              position={[0, -0.068, 0.088]}
              scale={[0.84, 0.62, 0.76]}
              castShadow={!isSoftwareGl}
            >
              <sphereGeometry args={[0.112, 18, 14]} />
              <meshStandardMaterial color="#55606e" roughness={0.82} />
            </mesh>
            <mesh position={[-0.025, -0.04, 0.141]} rotation={[0, 0, 0.18]}>
              <capsuleGeometry args={[0.014, 0.036, 6, 10]} />
              <meshStandardMaterial color="#647080" roughness={0.8} />
            </mesh>
            <mesh position={[0.025, -0.04, 0.141]} rotation={[0, 0, -0.18]}>
              <capsuleGeometry args={[0.014, 0.036, 6, 10]} />
              <meshStandardMaterial color="#647080" roughness={0.8} />
            </mesh>
          </group>

          {/* Left Suit Sleeve + Crisp White French Cuff + Gold Dress Watch */}
          <group position={[-0.215, 0.34, 0.02]}>
            <mesh
              position={[-0.02, -0.11, 0.06]}
              rotation={[-0.42, 0, 0.18]}
              material={suitJacketMat}
              castShadow={!isSoftwareGl}
            >
              <capsuleGeometry args={[0.056, 0.18, 8, 12]} />
            </mesh>
            <group ref={leftArmRef} position={[-0.04, -0.21, 0.14]} rotation={[-0.78, 0.25, -0.24]}>
              <mesh position={[0, -0.092, 0]} material={suitJacketMat} castShadow={!isSoftwareGl}>
                <capsuleGeometry args={[0.048, 0.155, 8, 12]} />
              </mesh>
              {/* Crisp White Shirt Cuff + Cufflink */}
              <mesh position={[0, -0.175, 0]}>
                <cylinderGeometry args={[0.043, 0.042, 0.028, 14]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.46} />
              </mesh>
              {/* Gold Dress Wristwatch */}
              <mesh position={[0, -0.168, 0.002]}>
                <cylinderGeometry args={[0.045, 0.045, 0.012, 16]} />
                <meshStandardMaterial color="#2a1810" roughness={0.45} />
              </mesh>
              <mesh position={[-0.032, -0.168, 0.028]} rotation={[0, -0.5, Math.PI / 2]}>
                <cylinderGeometry args={[0.016, 0.016, 0.008, 14]} />
                <meshStandardMaterial color="#d4af37" metalness={0.88} roughness={0.2} />
              </mesh>
              {/* Left Hand */}
              <mesh position={[0.01, -0.215, 0.01]} scale={[0.9, 1.1, 0.7]}>
                <sphereGeometry args={[0.044, 12, 10]} />
                <meshStandardMaterial color="#eec6ab" roughness={0.64} />
              </mesh>
            </group>
          </group>

          {/* Right Suit Sleeve + Crisp White French Cuff & Gold Cufflink */}
          <group position={[0.215, 0.34, 0.02]}>
            <mesh
              position={[0.02, -0.11, 0.06]}
              rotation={[-0.42, 0, -0.18]}
              material={suitJacketMat}
              castShadow={!isSoftwareGl}
            >
              <capsuleGeometry args={[0.056, 0.18, 8, 12]} />
            </mesh>
            <group ref={rightArmRef} position={[0.04, -0.21, 0.14]} rotation={[-0.78, -0.25, 0.24]}>
              <mesh position={[0, -0.092, 0]} material={suitJacketMat} castShadow={!isSoftwareGl}>
                <capsuleGeometry args={[0.048, 0.155, 8, 12]} />
              </mesh>
              {/* Crisp White Shirt Cuff + Gold Cufflink */}
              <mesh position={[0, -0.175, 0]}>
                <cylinderGeometry args={[0.043, 0.042, 0.028, 14]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.46} />
              </mesh>
              <mesh position={[0.042, -0.175, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.006, 0.006, 0.008, 10]} />
                <meshStandardMaterial color="#d4af37" metalness={0.88} roughness={0.2} />
              </mesh>
              {/* Right Hand */}
              <mesh position={[-0.01, -0.215, 0.01]} scale={[0.9, 1.1, 0.7]}>
                <sphereGeometry args={[0.044, 12, 10]} />
                <meshStandardMaterial color="#eec6ab" roughness={0.64} />
              </mesh>
            </group>
          </group>
        </group>

        {/* ==================== 3. OPEN HARDCOVER BOOK ==================== */}
        <group
          ref={bookGroupRef}
          position={[0, 0.9, 0.3]}
          rotation={[0.62, 0, 0]}
        >
          {/* Spine */}
          <mesh position={[0, -0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.28, 12]} />
            <meshStandardMaterial color="#58261b" roughness={0.65} />
          </mesh>

          {/* Left Cover & Printed Page Block */}
          <group rotation={[0, 0, 0.2]}>
            <mesh position={[-0.105, -0.008, 0]} castShadow={!isSoftwareGl}>
              <boxGeometry args={[0.21, 0.012, 0.28]} />
              <meshStandardMaterial color="#6b2d1f" roughness={0.62} />
            </mesh>
            <mesh position={[-0.1, 0.008, 0]}>
              <boxGeometry args={[0.195, 0.022, 0.265]} />
              <meshStandardMaterial map={bookPageTex} roughness={0.82} />
            </mesh>
          </group>

          {/* Right Cover & Printed Page Block */}
          <group rotation={[0, 0, -0.2]}>
            <mesh position={[0.105, -0.008, 0]} castShadow={!isSoftwareGl}>
              <boxGeometry args={[0.21, 0.012, 0.28]} />
              <meshStandardMaterial color="#6b2d1f" roughness={0.62} />
            </mesh>
            <mesh position={[0.1, 0.008, 0]}>
              <boxGeometry args={[0.195, 0.022, 0.265]} />
              <meshStandardMaterial map={bookPageTex} roughness={0.82} />
            </mesh>
          </group>

          {/* Animated Turning Page Leaf */}
          <group ref={turningPageRef} position={[0, 0.018, 0]} visible={false}>
            <mesh position={[0.095, 0, 0]}>
              <boxGeometry args={[0.19, 0.003, 0.26]} />
              <meshStandardMaterial map={bookPageTex} roughness={0.78} />
            </mesh>
          </group>

          {/* Crimson Ribbon Bookmark */}
          <mesh position={[0.015, -0.01, 0.16]} rotation={[0.35, 0, 0.08]}>
            <boxGeometry args={[0.016, 0.004, 0.08]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* ==================== 4. SIDE TABLE & BRASS READING FLOOR LAMP ==================== */}
      {/* Round Walnut Side Table */}
      <group position={[-1.56, 0, 0.18]}>
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.45} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.22, 0.25, 0.05, 18]} />
          <meshStandardMaterial color="#3e2415" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.3, 0]} castShadow={!isSoftwareGl}>
          <cylinderGeometry args={[0.04, 0.055, 0.52, 14]} />
          <meshStandardMaterial color="#4a2c1a" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.57, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
          <cylinderGeometry args={[0.34, 0.32, 0.04, 24]} />
          <meshStandardMaterial color="#583620" roughness={0.48} />
        </mesh>
        {/* Porcelain Teacup & Saucer */}
        <mesh position={[0.08, 0.6, 0.06]}>
          <cylinderGeometry args={[0.075, 0.05, 0.014, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.25} />
        </mesh>
        <mesh position={[0.08, 0.635, 0.06]}>
          <cylinderGeometry args={[0.046, 0.036, 0.062, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.22} />
        </mesh>
        {/* Small Stacked Book */}
        <mesh position={[-0.1, 0.61, -0.05]} rotation={[0, 0.35, 0]}>
          <boxGeometry args={[0.18, 0.04, 0.24]} />
          <meshStandardMaterial color="#285443" roughness={0.68} />
        </mesh>
      </group>

      {/* Tall Brass Reading Floor Lamp */}
      <group position={[-1.48, 0, -0.58]}>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.05, 18]} />
          <meshStandardMaterial color="#b88c38" metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh position={[0, 1.02, 0]} castShadow={!isSoftwareGl}>
          <cylinderGeometry args={[0.022, 0.028, 1.98, 12]} />
          <meshStandardMaterial color="#c99c42" metalness={0.82} roughness={0.26} />
        </mesh>
        {/* Angled Brass Neck */}
        <mesh position={[0.16, 1.98, 0.08]} rotation={[0.2, 0, -0.95]}>
          <cylinderGeometry args={[0.016, 0.018, 0.42, 10]} />
          <meshStandardMaterial color="#c99c42" metalness={0.82} roughness={0.26} />
        </mesh>
        {/* Warm Linen Lampshade */}
        <group position={[0.32, 1.88, 0.16]} rotation={[0.15, 0, -0.22]}>
          <mesh>
            <cylinderGeometry args={[0.11, 0.22, 0.24, 20, 1, true]} />
            <meshStandardMaterial
              color="#fdf3d7"
              emissive="#ffbe5c"
              emissiveIntensity={lampsOn ? 0.85 : 0.05}
              roughness={0.75}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <sphereGeometry args={[0.048, 12, 12]} />
            <meshStandardMaterial
              color="#fffbeb"
              emissive="#ffd27d"
              emissiveIntensity={lampsOn ? 2.2 : 0.1}
            />
          </mesh>
          {lampIntensity > 0 && (
            <pointLight
              position={[0.05, -0.12, 0.08]}
              color="#ffcc80"
              intensity={lampIntensity}
              distance={6.2}
              decay={1.7}
            />
          )}
        </group>
      </group>
    </group>
  );
}

/**
 * Walnut & Steel Computer Desk Workstation with Widescreen Monitor, Keyboard,
 * Mouse, PC Tower, Desk Lamp, and Ergonomic Swivel Chair.
 */
function ComputerDeskStation({
  position,
  rotation = [0, 0, 0],
  monitorTex,
  shadowTex,
  lampsOn,
  theme,
  onStartHover,
  onEndHover,
  onFocusDesk,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  monitorTex: THREE.CanvasTexture;
  shadowTex: THREE.CanvasTexture;
  lampsOn: boolean;
  theme: ThemeMode;
  onStartHover: (
    anchorObj: THREE.Object3D,
    localOffsetY: number,
    meta: Omit<HoveredStudyItem, 'initialX' | 'initialY'>,
  ) => void;
  onEndHover: (id: string) => void;
  onFocusDesk: () => void;
}) {
  const deskLampIntensity = lampsOn ? (theme === 'dark' ? 2.2 : 1.15) : 0;
  const displayGroupRef = useRef<THREE.Group>(null);
  const screenMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const screenLightRef = useRef<THREE.PointLight>(null);
  const [screenHovered, setScreenHovered] = useState(false);
  const screenHoverMix = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    screenHoverMix.current = THREE.MathUtils.damp(
      screenHoverMix.current,
      screenHovered ? 1 : 0,
      11,
      dt,
    );
    const m = screenHoverMix.current;

    if (displayGroupRef.current) {
      const sc = 1 + m * 0.028;
      displayGroupRef.current.scale.set(sc, sc, 1);
    }

    if (screenMatRef.current) {
      screenMatRef.current.emissive.lerpColors(
        _screenBaseEmissive,
        _screenHoverEmissive,
        m,
      );
      const baseIntensity = theme === 'dark' ? 0.95 : 0.55;
      screenMatRef.current.emissiveIntensity = baseIntensity + m * 0.65;
    }

    if (screenLightRef.current) {
      const baseLight = theme === 'dark' ? 0.65 : 0.25;
      screenLightRef.current.intensity = baseLight + m * 0.75;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Desk Ground Contact Shadow */}
      <mesh position={[0, 0.018, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.35, 1.8]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.56} depthWrite={false} />
      </mesh>

      {/* ==================== 1. WALNUT & STEEL DESK ==================== */}
      {/* Walnut Desktop Slab */}
      <mesh position={[0, 0.76, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[1.92, 0.055, 0.92]} />
        <meshStandardMaterial color="#4e301d" roughness={0.48} />
      </mesh>

      {/* Left Brushed-Steel Frame Legs */}
      {[-0.36, 0.36].map((lz, i) => (
        <mesh key={i} position={[-0.86, 0.37, lz]} castShadow={!isSoftwareGl}>
          <boxGeometry args={[0.05, 0.73, 0.05]} />
          <meshStandardMaterial color="#27303a" metalness={0.68} roughness={0.36} />
        </mesh>
      ))}
      <mesh position={[-0.86, 0.06, 0]}>
        <boxGeometry args={[0.05, 0.04, 0.77]} />
        <meshStandardMaterial color="#27303a" metalness={0.68} roughness={0.36} />
      </mesh>

      {/* Right Integrated 3-Drawer Cabinet */}
      <group position={[0.62, 0.37, 0]}>
        <mesh castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
          <boxGeometry args={[0.52, 0.72, 0.82]} />
          <meshStandardMaterial color="#3f2617" roughness={0.58} />
        </mesh>
        {[-0.2, 0.02, 0.24].map((dy, i) => (
          <group key={i} position={[0, dy, 0.415]}>
            <mesh>
              <boxGeometry args={[0.46, 0.19, 0.02]} />
              <meshStandardMaterial color="#4c2f1c" roughness={0.52} />
            </mesh>
            <mesh position={[0, 0, 0.018]}>
              <boxGeometry args={[0.12, 0.018, 0.018]} />
              <meshStandardMaterial color="#cba048" metalness={0.8} roughness={0.28} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Desktop Workstation Tower tucked on lower left */}
      <group position={[-0.62, 0.24, -0.1]}>
        <mesh castShadow={!isSoftwareGl}>
          <boxGeometry args={[0.22, 0.46, 0.44]} />
          <meshStandardMaterial color="#1f2833" metalness={0.55} roughness={0.38} />
        </mesh>
        {/* Subtle teal power indicator */}
        <mesh position={[0, 0.17, 0.222]}>
          <boxGeometry args={[0.08, 0.012, 0.006]} />
          <meshStandardMaterial
            color="#5eead4"
            emissive="#4fd1b5"
            emissiveIntensity={1.6}
          />
        </mesh>
      </group>

      {/* ==================== 2. WIDESCREEN COMPUTER MONITOR & PERIPHERALS ==================== */}
      {/* Felt Desk Pad */}
      <mesh position={[-0.1, 0.79, 0.14]}>
        <boxGeometry args={[0.92, 0.008, 0.42]} />
        <meshStandardMaterial color="#25333d" roughness={0.92} />
      </mesh>

      {/* Monitor Stand & Ultrawide Display */}
      <group position={[-0.1, 0.79, -0.22]}>
        {/* Aluminum Base & Neck */}
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.28, 0.016, 0.2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.15, -0.04]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.06, 0.28, 0.025]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.28} />
        </mesh>

        {/* Interactive Monitor Chassis & Glowing Display Screen */}
        <group
          ref={displayGroupRef}
          position={[0, 0.36, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setScreenHovered(true);
            if (displayGroupRef.current) {
              onStartHover(displayGroupRef.current, 0.3, {
                id: 'study-workstation-screen',
                kind: 'screen',
                category: 'Botanical Studio Workstation',
                title: 'Sylva Herbarium & Growth Console',
                subtitle: 'Live Conservatory Telemetry · 1,420 Specimens',
                detail: 'Seasonal growth curves synchronized · Click to focus desk',
                accentColor: '#4fd1b5',
              });
            }
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setScreenHovered(false);
            onEndHover('study-workstation-screen');
          }}
          onClick={(e) => {
            e.stopPropagation();
            onFocusDesk();
          }}
        >
          <mesh castShadow={!isSoftwareGl}>
            <boxGeometry args={[0.96, 0.54, 0.032]} />
            <meshStandardMaterial color="#18202c" metalness={0.5} roughness={0.36} />
          </mesh>

          {/* Glowing Display Screen */}
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.91, 0.49]} />
            <meshStandardMaterial
              ref={screenMatRef}
              map={monitorTex}
              emissive="#1e4652"
              emissiveMap={monitorTex}
              emissiveIntensity={theme === 'dark' ? 0.95 : 0.55}
              roughness={0.22}
            />
          </mesh>

          {/* Crisp Luminous Bezel Rim Highlight on Hover */}
          {screenHovered && (
            <mesh position={[0, 0, 0.002]}>
              <boxGeometry args={[0.985, 0.565, 0.036]} />
              <meshBasicMaterial
                color="#5eead4"
                transparent
                opacity={0.34}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>

        {/* Soft Monitor Screen Glow onto Keyboard */}
        <pointLight
          ref={screenLightRef}
          position={[0, 0.32, 0.25]}
          color="#67e8f9"
          intensity={theme === 'dark' ? 0.65 : 0.25}
          distance={2.2}
          decay={2}
        />
      </group>

      {/* Mechanical Keyboard */}
      <group position={[-0.16, 0.805, 0.14]} rotation={[0.05, 0, 0]}>
        <mesh castShadow={!isSoftwareGl}>
          <boxGeometry args={[0.42, 0.022, 0.15]} />
          <meshStandardMaterial color="#1e293b" metalness={0.35} roughness={0.48} />
        </mesh>
        <mesh position={[0, 0.014, 0]}>
          <boxGeometry args={[0.39, 0.01, 0.125]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.62} />
        </mesh>
      </group>

      {/* Wireless Mouse */}
      <mesh position={[0.18, 0.805, 0.15]} scale={[0.036, 0.022, 0.058]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.35} />
      </mesh>

      {/* Ceramic Coffee Mug */}
      <group position={[0.56, 0.79, 0.18]}>
        <mesh position={[0, 0.05, 0]} castShadow={!isSoftwareGl}>
          <cylinderGeometry args={[0.044, 0.038, 0.1, 16]} />
          <meshStandardMaterial color="#e7decb" roughness={0.32} />
        </mesh>
        <mesh position={[0.046, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.026, 0.007, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#e7decb" roughness={0.32} />
        </mesh>
      </group>

      {/* Brass Architect Desk Lamp */}
      <group position={[0.68, 0.79, -0.22]} rotation={[0, -0.55, 0]}>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.03, 16]} />
          <meshStandardMaterial color="#c99c42" metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh position={[-0.04, 0.2, 0]} rotation={[0, 0, 0.26]}>
          <cylinderGeometry args={[0.012, 0.014, 0.38, 10]} />
          <meshStandardMaterial color="#c99c42" metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh position={[0.05, 0.42, 0]} rotation={[0, 0, -0.68]}>
          <cylinderGeometry args={[0.011, 0.012, 0.28, 10]} />
          <meshStandardMaterial color="#c99c42" metalness={0.82} roughness={0.28} />
        </mesh>
        <group position={[0.16, 0.45, 0]} rotation={[0, 0, -0.45]}>
          <mesh>
            <coneGeometry args={[0.095, 0.15, 18, 1, true]} />
            <meshStandardMaterial
              color="#264e42"
              roughness={0.38}
              metalness={0.25}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshStandardMaterial
              color="#fffbeb"
              emissive="#ffd27d"
              emissiveIntensity={lampsOn ? 2.0 : 0.08}
            />
          </mesh>
          {deskLampIntensity > 0 && (
            <pointLight
              position={[0, -0.1, 0]}
              color="#ffd18a"
              intensity={deskLampIntensity}
              distance={4.2}
              decay={1.8}
            />
          )}
        </group>
      </group>

      {/* ==================== 3. ERGONOMIC SWIVEL OFFICE CHAIR ==================== */}
      <group position={[-0.12, 0, 0.72]} rotation={[0, 2.75, 0]}>
        {/* Pneumatic Column */}
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.032, 0.038, 0.38, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.32} />
        </mesh>
        {/* 5-Star Caster Base */}
        {[0, 1, 2, 3, 4].map((leg) => {
          const ang = (leg / 5) * Math.PI * 2;
          return (
            <group key={leg} rotation={[0, ang, 0]}>
              <mesh position={[0, 0.075, 0.16]} rotation={[0.14, 0, 0]}>
                <boxGeometry args={[0.036, 0.028, 0.32]} />
                <meshStandardMaterial color="#27303a" metalness={0.7} roughness={0.34} />
              </mesh>
              <mesh position={[0, 0.03, 0.3]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.028, 0.028, 0.026, 10]} />
                <meshStandardMaterial color="#0f172a" roughness={0.6} />
              </mesh>
            </group>
          );
        })}
        {/* Contoured Cognac Leather Seat */}
        <mesh position={[0, 0.47, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
          <boxGeometry args={[0.52, 0.085, 0.5]} />
          <meshStandardMaterial color="#7c4728" roughness={0.56} />
        </mesh>
        {/* Curved Backrest + Walnut Shell */}
        <mesh
          position={[0, 0.78, -0.23]}
          rotation={[-0.1, 0, 0]}
          castShadow={!isSoftwareGl}
        >
          <boxGeometry args={[0.48, 0.56, 0.075]} />
          <meshStandardMaterial color="#874e2c" roughness={0.54} />
        </mesh>
        <mesh position={[0, 0.78, -0.27]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[0.5, 0.58, 0.024]} />
          <meshStandardMaterial color="#3f2516" roughness={0.5} />
        </mesh>
        {/* Left & Right Armrests */}
        {[-0.27, 0.27].map((ax, i) => (
          <group key={i} position={[ax, 0.58, -0.02]}>
            <mesh position={[0, -0.05, 0]}>
              <boxGeometry args={[0.03, 0.16, 0.04]} />
              <meshStandardMaterial color="#27303a" metalness={0.65} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.04, 0.02]}>
              <boxGeometry args={[0.065, 0.03, 0.28]} />
              <meshStandardMaterial color="#6e3e22" roughness={0.55} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * Framed Botanical Study Wall Print.
 */
function FramedBotanicalPrint({
  position,
  rotation = [0, 0, 0],
  accentColor,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  accentColor: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow={!isSoftwareGl}>
        <boxGeometry args={[0.68, 0.88, 0.04]} />
        <meshStandardMaterial color="#3f2617" roughness={0.52} />
      </mesh>
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[0.58, 0.78]} />
        <meshStandardMaterial color="#f5efe2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.02, 0.025]}>
        <circleGeometry args={[0.16, 20]} />
        <meshStandardMaterial color={accentColor} roughness={0.65} />
      </mesh>
      <mesh position={[0, -0.14, 0.026]}>
        <planeGeometry args={[0.025, 0.26]} />
        <meshStandardMaterial color="#285443" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function OfficeStudyScene({
  theme,
  lampsOn,
  isConversing,
  isScholarSpeaking,
  scholarExternalEngaged,
  scholarLabelDomRef,
  onScholarPointerChange,
  onHoverStudyItem,
  tooltipDomRef,
  onSelectOfficeView,
  onOpenScholarChat,
}: OfficeStudySceneProps) {
  const { gl, camera, size } = useThree();
  const maxAniso = useMemo(
    () => Math.min(8, gl.capabilities.getMaxAnisotropy()),
    [gl],
  );

  const woodFloorTex = useMemo(() => getWoodFloorTexture(maxAniso), [maxAniso]);
  const rugTex = useMemo(() => getRugPatternTexture(maxAniso), [maxAniso]);
  const monitorTex = useMemo(() => getMonitorScreenTexture(maxAniso), [maxAniso]);
  const bookPageTex = useMemo(() => getBookPageTexture(maxAniso), [maxAniso]);
  const shadowTex = useMemo(() => getContactShadowTexture(), []);

  const nightMix = useRef(theme === 'dark' ? 1 : 0);
  const hoveredAnchorRef = useRef<HoveredAnchor | null>(null);
  const scholarAnchorRef = useRef<THREE.Object3D | null>(null);
  const scholarRaycastRef = useRef(false);
  const scholarMoveNearRef = useRef(false);
  const prevReportedScholarRef = useRef(false);
  const moveNearTimerRef = useRef<number | null>(null);
  const lastPointerNdcRef = useRef({ x: 99, y: 99 });

  const syncScholarEngaged = useCallback(() => {
    const next = scholarRaycastRef.current || scholarMoveNearRef.current;
    if (prevReportedScholarRef.current !== next) {
      prevReportedScholarRef.current = next;
      onScholarPointerChange(next);
    }
  }, [onScholarPointerChange]);

  const handleScholarRaycastHoverChange = useCallback(
    (hovered: boolean) => {
      scholarRaycastRef.current = hovered;
      syncScholarEngaged();
    },
    [syncScholarEngaged],
  );

  const handleStartHover = useCallback(
    (
      anchorObj: THREE.Object3D,
      localOffsetY: number,
      meta: Omit<HoveredStudyItem, 'initialX' | 'initialY'>,
    ) => {
      hoveredAnchorRef.current = {
        id: meta.id,
        object: anchorObj,
        localOffsetY,
      };
      document.body.style.cursor = 'pointer';

      const initialPos = projectObjectToScreen(
        anchorObj,
        localOffsetY,
        camera,
        size.width,
        size.height,
      );
      if (tooltipDomRef.current) {
        tooltipDomRef.current.style.transform = `translate3d(${initialPos.x}px, ${initialPos.y}px, 0)`;
      }
      onHoverStudyItem({
        ...meta,
        initialX: initialPos.x,
        initialY: initialPos.y,
      });
    },
    [camera, onHoverStudyItem, size.height, size.width, tooltipDomRef],
  );

  const handleEndHover = useCallback(
    (id: string) => {
      if (hoveredAnchorRef.current?.id === id) {
        hoveredAnchorRef.current = null;
        document.body.style.cursor = '';
      }
      onHoverStudyItem((prev) => (prev?.id === id ? null : prev));
    },
    [onHoverStudyItem],
  );

  useEffect(() => {
    return () => {
      hoveredAnchorRef.current = null;
      if (moveNearTimerRef.current !== null) {
        window.clearTimeout(moveNearTimerRef.current);
      }
      document.body.style.cursor = '';
      onHoverStudyItem(null);
      onScholarPointerChange(false);
    };
  }, [onHoverStudyItem, onScholarPointerChange]);

  // Shared wall material instance updated smoothly in useFrame
  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: theme === 'dark' ? '#1d273b' : '#efe7d6',
        roughness: 0.88,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      wallMaterial.dispose();
    };
  }, [wallMaterial]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    nightMix.current = THREE.MathUtils.damp(
      nightMix.current,
      theme === 'dark' ? 1 : 0,
      2.6,
      dt,
    );
    wallMaterial.color.lerpColors(
      _wallDayColor,
      _wallNightColor,
      nightMix.current,
    );

    // Keep floating tooltip locked smoothly above the hovered 3D book or computer screen
    if (hoveredAnchorRef.current && tooltipDomRef.current) {
      const pos = projectObjectToScreen(
        hoveredAnchorRef.current.object,
        hoveredAnchorRef.current.localOffsetY,
        state.camera,
        state.size.width,
        state.size.height,
      );
      tooltipDomRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    }

    // Project Talking Icon Label directly above the person reading the book + track pointer movement near him
    if (scholarAnchorRef.current && scholarLabelDomRef.current) {
      const labelPos = projectScholarLabelToScreen(
        scholarAnchorRef.current,
        1.44,
        state.camera,
        state.size.width,
        state.size.height,
      );

      if (labelPos.inView) {
        scholarLabelDomRef.current.style.transform = `translate3d(${labelPos.x}px, ${labelPos.y}px, 0)`;

        const dxNdc = state.pointer.x - lastPointerNdcRef.current.x;
        const dyNdc = state.pointer.y - lastPointerNdcRef.current.y;
        if (dxNdc * dxNdc + dyNdc * dyNdc > 0.00001) {
          lastPointerNdcRef.current.x = state.pointer.x;
          lastPointerNdcRef.current.y = state.pointer.y;

          const ptrX = (state.pointer.x * 0.5 + 0.5) * state.size.width;
          const ptrY = (-state.pointer.y * 0.5 + 0.5) * state.size.height;
          const distToScholar = Math.hypot(ptrX - labelPos.x, ptrY - (labelPos.y + 62));

          if (distToScholar < 112) {
            if (moveNearTimerRef.current !== null) {
              window.clearTimeout(moveNearTimerRef.current);
            }
            scholarMoveNearRef.current = true;
            syncScholarEngaged();
            moveNearTimerRef.current = window.setTimeout(() => {
              moveNearTimerRef.current = null;
              scholarMoveNearRef.current = false;
              syncScholarEngaged();
            }, 900);
          } else if (scholarMoveNearRef.current && !scholarRaycastRef.current) {
            if (moveNearTimerRef.current !== null) {
              window.clearTimeout(moveNearTimerRef.current);
              moveNearTimerRef.current = null;
            }
            scholarMoveNearRef.current = false;
            syncScholarEngaged();
          }
        }
      } else {
        scholarLabelDomRef.current.style.transform = 'translate3d(-9999px, -9999px, 0)';
      }
    }
  });

  return (
    <group>

      {/* Warm Overhead Chandelier / Ceiling Ambient Fill inside the Study */}
      <pointLight
        position={[0.2, 3.65, 0.4]}
        color={theme === 'dark' ? '#ffd9a0' : '#fff3db'}
        intensity={lampsOn ? (theme === 'dark' ? 2.45 : 1.35) : theme === 'dark' ? 0.65 : 0.9}
        distance={14}
        decay={1.45}
      />

      {/* ==================== 1. ARCHITECTURAL STUDY SHELL ==================== */}
      {/* Warm Oak Plank Floor (y = 0) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.2]} receiveShadow={!isSoftwareGl}>
        <planeGeometry args={[12.4, 10.2]} />
        <meshStandardMaterial map={woodFloorTex} roughness={0.56} metalness={0.04} />
      </mesh>

      {/* Woven Botanical Medallion Area Rug (offset y = 0.014 to avoid Z-fighting) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, 0.014, -0.15]} receiveShadow={!isSoftwareGl}>
        <planeGeometry args={[6.2, 4.4]} />
        <meshStandardMaterial map={rugTex} roughness={0.92} />
      </mesh>

      {/* Back Wall (z = -3.85) with Panoramic Conservatory Window Opening: x in [-2.6, 0.3], y in [1.05, 3.35] */}
      {/* Lower Wainscot Wall under Window */}
      <mesh position={[-1.15, 0.525, -3.85]} material={wallMaterial} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[2.9, 1.05, 0.16]} />
      </mesh>
      {/* Upper Header Wall above Window */}
      <mesh position={[-1.15, 3.925, -3.85]} material={wallMaterial} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[2.9, 1.15, 0.16]} />
      </mesh>
      {/* Back-Left Wall Section (x: -5.8 to -2.6 -> center -4.2, width 3.2) */}
      <mesh position={[-4.2, 2.25, -3.85]} material={wallMaterial} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[3.2, 4.5, 0.16]} />
      </mesh>
      {/* Back-Right Wall Section (x: 0.3 to 5.8 -> center 3.05, width 5.5) */}
      <mesh position={[3.05, 2.25, -3.85]} material={wallMaterial} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[5.5, 4.5, 0.16]} />
      </mesh>

      {/* Panoramic Walnut Window Frame, Sill & Mullions looking out at CelestialSky */}
      <group position={[-1.15, 2.2, -3.82]}>
        {/* Sill */}
        <mesh position={[0, -1.16, 0.06]} castShadow={!isSoftwareGl}>
          <boxGeometry args={[3.08, 0.07, 0.28]} />
          <meshStandardMaterial color="#4a2d1b" roughness={0.5} />
        </mesh>
        {/* Top Trim */}
        <mesh position={[0, 1.16, 0.03]}>
          <boxGeometry args={[3.06, 0.08, 0.22]} />
          <meshStandardMaterial color="#4a2d1b" roughness={0.52} />
        </mesh>
        {/* Left & Right Jambs */}
        {[-1.47, 1.47].map((jx, i) => (
          <mesh key={i} position={[jx, 0, 0.02]}>
            <boxGeometry args={[0.09, 2.32, 0.2]} />
            <meshStandardMaterial color="#4a2d1b" roughness={0.52} />
          </mesh>
        ))}
        {/* Interior Mullion Bars */}
        {[-0.48, 0.48].map((mx, i) => (
          <mesh key={i} position={[mx, 0, 0.02]}>
            <boxGeometry args={[0.04, 2.28, 0.08]} />
            <meshStandardMaterial color="#583620" roughness={0.54} />
          </mesh>
        ))}
        <mesh position={[0, 0.28, 0.02]}>
          <boxGeometry args={[2.88, 0.04, 0.08]} />
          <meshStandardMaterial color="#583620" roughness={0.54} />
        </mesh>
      </group>

      {/* Left & Right Side Walls */}
      <mesh position={[-5.75, 2.25, 0.4]} material={wallMaterial} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[0.18, 4.5, 8.7]} />
      </mesh>
      <mesh position={[5.75, 2.25, 0.4]} material={wallMaterial} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[0.18, 4.5, 8.7]} />
      </mesh>

      {/* Walnut Baseboards */}
      <mesh position={[0, 0.08, -3.76]}>
        <boxGeometry args={[11.4, 0.16, 0.04]} />
        <meshStandardMaterial color="#3d2415" roughness={0.56} />
      </mesh>
      <mesh position={[-5.65, 0.08, 0.4]}>
        <boxGeometry args={[0.04, 0.16, 8.5]} />
        <meshStandardMaterial color="#3d2415" roughness={0.56} />
      </mesh>
      <mesh position={[5.65, 0.08, 0.4]}>
        <boxGeometry args={[0.04, 0.16, 8.5]} />
        <meshStandardMaterial color="#3d2415" roughness={0.56} />
      </mesh>

      {/* Framed Botanical Wall Prints */}
      <FramedBotanicalPrint
        position={[4.45, 2.15, -3.74]}
        accentColor="#2f6e53"
      />
      <FramedBotanicalPrint
        position={[5.62, 2.1, -1.2]}
        rotation={[0, -Math.PI / 2, 0]}
        accentColor="#b87638"
      />

      {/* ==================== 2. SURROUNDING BOOKSHELVES ==================== */}
      {/* Back-Right Grand Bookshelf */}
      <WalnutBookshelf
        position={[2.3, 0, -3.52]}
        seed={109}
        caseName="East Conservatory Case"
        withGlobe
        shadowTex={shadowTex}
        onStartHover={handleStartHover}
        onEndHover={handleEndHover}
        onFocusBooks={() => onSelectOfficeView('office-books')}
      />

      {/* Back-Left Bookshelf */}
      <WalnutBookshelf
        position={[-4.25, 0, -3.52]}
        seed={317}
        caseName="North Herbarium Case"
        shadowTex={shadowTex}
        onStartHover={handleStartHover}
        onEndHover={handleEndHover}
        onFocusBooks={() => onSelectOfficeView('office-books')}
      />

      {/* Left-Wall Library Bookshelf */}
      <WalnutBookshelf
        position={[-5.36, 0, -1.25]}
        rotation={[0, Math.PI / 2, 0]}
        seed={643}
        caseName="West Folio Library"
        withGlobe
        shadowTex={shadowTex}
        onStartHover={handleStartHover}
        onEndHover={handleEndHover}
        onFocusBooks={() => onSelectOfficeView('office-books')}
      />

      {/* Potted Conservatory Plants */}
      <StudyPottedPlant position={[-2.95, 0, -3.18]} shadowTex={shadowTex} />
      <StudyPottedPlant position={[4.55, 0, -2.95]} shadowTex={shadowTex} />

      {/* ==================== 3. HERO READING SOFA, INTERACTIVE SCHOLAR & SLEEPING ORANGE CAT ==================== */}
      <SofaWithReadingScholar
        position={[-1.18, 0, -0.62]}
        rotation={[0, 0.24, 0]}
        bookPageTex={bookPageTex}
        shadowTex={shadowTex}
        lampsOn={lampsOn}
        theme={theme}
        isConversing={isConversing}
        isScholarSpeaking={isScholarSpeaking}
        scholarExternalEngaged={scholarExternalEngaged}
        scholarAnchorRef={scholarAnchorRef}
        onScholarRaycastHoverChange={handleScholarRaycastHoverChange}
        onOpenScholarChat={onOpenScholarChat}
      />

      {/* ==================== 4. COMPUTER DESK WORKSTATION ==================== */}
      <ComputerDeskStation
        position={[2.45, 0, -0.58]}
        rotation={[0, -0.4, 0]}
        monitorTex={monitorTex}
        shadowTex={shadowTex}
        lampsOn={lampsOn}
        theme={theme}
        onStartHover={handleStartHover}
        onEndHover={handleEndHover}
        onFocusDesk={() => onSelectOfficeView('office-desk')}
      />
    </group>
  );
}
