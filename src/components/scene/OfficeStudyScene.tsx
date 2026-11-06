import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getBookCoverTexture,
  getBookEdgePagesTexture,
  getBookPageTexture,
  getBookSpineTexture,
  getContactShadowTexture,
  getCrispWhiteShirtTexture,
  getMonitorScreenTexture,
  getNavySuitTexture,
  getPinstripeSuitTexture,
  getRugPatternTexture,
  getStripedDressShirtTexture,
  getWoodFloorTexture,
  isSoftwareGl,
} from '../../utils/webgl';
import {
  computeFeaturedBookCameraFocus,
  FEATURED_BOOK_LIST,
  FEATURED_SHELF_LOCAL_SLOTS_X,
  getSortedFeaturedBooks,
  type FeaturedBookEntry,
} from '../../data/booksData';
import type {
  BookShelfSortMode,
  CustomCameraFocus,
  FeaturedBookId,
  HoveredStudyItem,
  OfficeCameraPreset,
  ThemeMode,
} from '../../types';

interface OfficeStudySceneProps {
  theme: ThemeMode;
  lampsOn: boolean;
  shelfSortMode: BookShelfSortMode;
  selectedBookId: FeaturedBookId | null;
  isConversing: boolean;
  isScholarSpeaking: boolean;
  scholarExternalEngaged: boolean;
  scholarLabelDomRef: React.RefObject<HTMLDivElement | null>;
  onScholarPointerChange: (engaged: boolean) => void;
  onHoverStudyItem: React.Dispatch<React.SetStateAction<HoveredStudyItem | null>>;
  tooltipDomRef: React.RefObject<HTMLDivElement | null>;
  onSelectOfficeView: (preset: OfficeCameraPreset) => void;
  onSelectFeaturedBook: (bookId: FeaturedBookId, focus: CustomCameraFocus) => void;
  onOpenScholarChat: () => void;
  onOpenSupportHandover?: (topic?: string) => void;
}

interface BookSpec {
  id: string;
  x: number;
  w: number;
  h: number;
  d: number;
  color: string;
  colorOrder: number;
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
 * Generates deterministic rows of varied hardcover books with curated titles,
 * and supports re-sorting each row cleanly by curated order, category/height, title, or color.
 */
function buildShelfBooks(
  seedBase: number,
  shelfWidth = 1.66,
  globeShelfIndex: number | null = null,
): BookSpec[][] {
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
    const limit = globeShelfIndex === s ? shelfWidth * 0.16 : shelfWidth * 0.42;
    let bookIdx = 0;

    while (cursor < limit) {
      if (rand() < 0.12) {
        cursor += 0.1 + rand() * 0.1;
        continue;
      }
      const w = 0.044 + rand() * 0.044;
      const h = 0.24 + rand() * 0.12;
      const d = 0.21 + rand() * 0.05;
      const colorOrder = Math.floor(rand() * palette.length);
      const color = palette[colorOrder];
      const isLast = cursor + w * 2.2 >= limit;
      const tilt = isLast && rand() > 0.45 ? -0.16 : 0;

      const entry = LIBRARY_CATALOG[catalogCounter % LIBRARY_CATALOG.length];
      catalogCounter += 3;

      row.push({
        id: `book-${seedBase}-${s}-${bookIdx++}`,
        x: cursor + w * 0.5 + (tilt !== 0 ? 0.032 : 0),
        w,
        h,
        d,
        color,
        colorOrder,
        tilt,
        title: entry.title.charAt(0).toUpperCase() + entry.title.slice(1),
        author: entry.author,
        edition: entry.edition,
      });

      cursor += w + 0.008 + (tilt !== 0 ? 0.055 : 0);
    }
    shelves.push(row);
  }
  return shelves;
}

function computeSortedRowPositions(
  row: BookSpec[],
  sortMode: BookShelfSortMode,
  shelfWidth = 1.66,
): Map<string, { x: number; tilt: number }> {
  const result = new Map<string, { x: number; tilt: number }>();
  if (sortMode === 'curated') {
    for (const b of row) {
      result.set(b.id, { x: b.x, tilt: b.tilt });
    }
    return result;
  }

  const ordered = [...row];
  if (sortMode === 'title') {
    ordered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortMode === 'color') {
    ordered.sort((a, b) => a.colorOrder - b.colorOrder || b.h - a.h);
  } else {
    // category -> tall-to-compact folio hierarchy
    ordered.sort((a, b) => b.h - a.h);
  }

  let cursor = -shelfWidth * 0.46;
  for (const b of ordered) {
    const x = cursor + b.w * 0.5;
    result.set(b.id, { x, tilt: 0 });
    cursor += b.w + 0.01;
  }
  return result;
}

const ROMAN_SHELF = ['Shelf I', 'Shelf II', 'Shelf III', 'Shelf IV'] as const;

/**
 * Individual Interactive Hardcover Book with damped shelf pull-out,
 * smooth sorted X glide, warm golden emissive highlight, and projected hover tooltip.
 */
function InteractiveShelfBook({
  book,
  targetX,
  targetTilt,
  baseTop,
  caseName,
  shelfIndex,
  onStartHover,
  onEndHover,
  onFocusBooks,
}: {
  book: BookSpec;
  targetX: number;
  targetTilt: number;
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
  const animX = useRef(targetX);
  const animTilt = useRef(targetTilt);

  useFrame((_, delta) => {
    const target = hovered ? 1 : 0;
    const dx = Math.abs(animX.current - targetX);
    const dTilt = Math.abs(animTilt.current - targetTilt);
    if (
      Math.abs(hoverMix.current - target) < 0.002 &&
      hoverMix.current === target &&
      dx < 0.001 &&
      dTilt < 0.001
    ) {
      return;
    }
    const dt = Math.min(delta, 0.1);
    hoverMix.current = THREE.MathUtils.damp(hoverMix.current, target, 12, dt);
    animX.current = THREE.MathUtils.damp(animX.current, targetX, 8, dt);
    animTilt.current = THREE.MathUtils.damp(animTilt.current, targetTilt, 8, dt);
    const m = hoverMix.current;

    if (groupRef.current) {
      groupRef.current.position.x = animX.current;
      groupRef.current.position.z = 0.02 + m * 0.075;
      groupRef.current.rotation.z = animTilt.current;
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
      position={[targetX, baseTop + book.h * 0.5, 0.02]}
      rotation={[0, 0, targetTilt]}
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
 * Composite Face-Out Featured Cover Book on a Walnut & Brushed-Brass Gallery Easel.
 * Displays the real book cover artwork, vertical Japanese spine, and cream paper block,
 * and glides smoothly across shelf slots when re-sorted.
 */
function FeaturedCoverBook({
  entry,
  slotIndex,
  baseTop,
  isSelected,
  maxAniso,
  pageEdgeTex,
  onInvalidate,
  onStartHover,
  onEndHover,
  onSelectBook,
}: {
  entry: FeaturedBookEntry;
  slotIndex: number;
  baseTop: number;
  isSelected: boolean;
  maxAniso: number;
  pageEdgeTex: THREE.CanvasTexture;
  onInvalidate: () => void;
  onStartHover: (
    anchorObj: THREE.Object3D,
    localOffsetY: number,
    meta: Omit<HoveredStudyItem, 'initialX' | 'initialY'>,
  ) => void;
  onEndHover: (id: string) => void;
  onSelectBook: (bookId: FeaturedBookId, focus: CustomCameraFocus) => void;
}) {
  const standGroupRef = useRef<THREE.Group>(null);
  const bookBodyRef = useRef<THREE.Group>(null);
  const frontMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  const targetX: number =
    FEATURED_SHELF_LOCAL_SLOTS_X[Math.max(0, Math.min(3, slotIndex))];
  const animX = useRef<number>(targetX);
  const activeMix = useRef<number>(0);

  const coverTex = useMemo(
    () =>
      getBookCoverTexture(
        entry.id,
        entry.coverUrl,
        entry.remoteCoverUrl,
        entry.spineColor,
        entry.backColor,
        entry.shortLabel,
        maxAniso,
        onInvalidate,
      ),
    [
      entry.backColor,
      entry.coverUrl,
      entry.id,
      entry.remoteCoverUrl,
      entry.shortLabel,
      entry.spineColor,
      maxAniso,
      onInvalidate,
    ],
  );

  const spineTex = useMemo(
    () =>
      getBookSpineTexture(
        entry.id,
        entry.spineColor,
        entry.accentColor,
        entry.shortLabel,
        maxAniso,
      ),
    [entry.accentColor, entry.id, entry.shortLabel, entry.spineColor, maxAniso],
  );

  const bookW = 0.254;
  const bookH = 0.366;
  const bookD = 0.042;

  useFrame((_, delta) => {
    const targetActive = hovered || isSelected ? 1 : 0;
    const dx = Math.abs(animX.current - targetX);
    if (
      Math.abs(activeMix.current - targetActive) < 0.002 &&
      dx < 0.001
    ) {
      return;
    }

    const dt = Math.min(delta, 0.1);
    animX.current = THREE.MathUtils.damp(animX.current, targetX, 7.2, dt);
    activeMix.current = THREE.MathUtils.damp(activeMix.current, targetActive, 11, dt);

    const m = activeMix.current;
    // Slight forward Z arc while sliding past sibling books during re-sort
    const slideArc = Math.min(0.068, Math.abs(animX.current - targetX) * 0.18);

    if (standGroupRef.current) {
      standGroupRef.current.position.x = animX.current;
      standGroupRef.current.position.z = 0.03 + slideArc;
    }

    if (bookBodyRef.current) {
      bookBodyRef.current.position.y = 0.018 + bookH * 0.5 + m * 0.018;
      bookBodyRef.current.position.z = 0.012 + m * 0.062;
      bookBodyRef.current.rotation.x = THREE.MathUtils.lerp(-0.11, -0.025, m);
      const sc = 1 + m * 0.055;
      bookBodyRef.current.scale.set(sc, sc, sc);
    }

    if (frontMatRef.current) {
      frontMatRef.current.emissiveIntensity = 0.08 + m * 0.2;
    }
  });

  const activeHighlight = hovered || isSelected;

  return (
    <group
      ref={standGroupRef}
      position={[targetX, baseTop, 0.03]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (bookBodyRef.current) {
          onStartHover(bookBodyRef.current, bookH * 0.54 + 0.03, {
            id: entry.id,
            kind: 'book',
            category: `Featured Collection · ${entry.category}`,
            title: entry.title,
            subtitle: entry.author,
            detail: `${entry.publisher} · Click to focus cover`,
            accentColor: entry.accentColor,
            coverUrl: entry.coverUrl,
            remoteCoverUrl: entry.remoteCoverUrl,
          });
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onEndHover(entry.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectBook(entry.id, computeFeaturedBookCameraFocus(slotIndex));
      }}
    >
      {/* 1. Walnut & Brushed-Brass Gallery Book Easel */}
      <mesh position={[0, 0.008, 0.005]} castShadow={!isSoftwareGl}>
        <boxGeometry args={[0.21, 0.016, 0.14]} />
        <meshStandardMaterial color="#362013" roughness={0.5} />
      </mesh>
      {/* Angled walnut easel backrest */}
      <mesh position={[0, 0.11, -0.024]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.17, 0.2, 0.012]} />
        <meshStandardMaterial color="#462a19" roughness={0.54} />
      </mesh>
      {/* Brushed brass front cradle ledge & pins */}
      <mesh position={[0, 0.02, 0.068]}>
        <boxGeometry args={[0.218, 0.018, 0.012]} />
        <meshStandardMaterial color="#d4a64a" metalness={0.82} roughness={0.26} />
      </mesh>
      {[-0.082, 0.082].map((px, i) => (
        <mesh key={i} position={[px, 0.032, 0.072]}>
          <cylinderGeometry args={[0.006, 0.006, 0.024, 10]} />
          <meshStandardMaterial color="#e0b55a" metalness={0.85} roughness={0.22} />
        </mesh>
      ))}

      {/* 2. Composite 3D Hardcover Book Assembly */}
      <group
        ref={bookBodyRef}
        position={[0, 0.018 + bookH * 0.5, 0.012]}
        rotation={[-0.11, 0, 0]}
      >
        {/* Cream Stacked Paper Block (recessed inside boards) */}
        <mesh castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
          <boxGeometry args={[bookW - 0.01, bookH - 0.012, bookD - 0.008]} />
          <meshStandardMaterial map={pageEdgeTex} roughness={0.82} />
        </mesh>

        {/* Back Hardcover Board */}
        <mesh position={[0, 0, -(bookD * 0.5 - 0.0025)]} castShadow={!isSoftwareGl}>
          <boxGeometry args={[bookW, bookH, 0.005]} />
          <meshStandardMaterial color={entry.backColor} roughness={0.48} />
        </mesh>

        {/* Left Hardcover Spine with Vertical Japanese Title */}
        <mesh
          position={[-(bookW * 0.5 - 0.003), 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          castShadow={!isSoftwareGl}
        >
          <planeGeometry args={[bookD, bookH]} />
          <meshStandardMaterial map={spineTex} roughness={0.44} metalness={0.04} />
        </mesh>
        <mesh position={[-(bookW * 0.5 - 0.0015), 0, 0]}>
          <boxGeometry args={[0.005, bookH, bookD]} />
          <meshStandardMaterial color={entry.spineColor} roughness={0.46} />
        </mesh>

        {/* Front Hardcover Board & High-Resolution Book Cover Jacket */}
        <mesh position={[0, 0, bookD * 0.5 - 0.0025]} castShadow={!isSoftwareGl}>
          <boxGeometry args={[bookW, bookH, 0.005]} />
          <meshStandardMaterial color={entry.spineColor} roughness={0.42} />
        </mesh>
        <mesh position={[0.001, 0, bookD * 0.5 + 0.0008]}>
          <planeGeometry args={[bookW - 0.002, bookH - 0.002]} />
          <meshStandardMaterial
            ref={frontMatRef}
            map={coverTex}
            emissive="#ffffff"
            emissiveMap={coverTex}
            emissiveIntensity={0.08}
            roughness={0.34}
            metalness={0.03}
          />
        </mesh>

        {/* Subtle Silk Bookmark Ribbon Tip at Top Spine */}
        <mesh position={[-bookW * 0.34, bookH * 0.5 + 0.008, 0]} rotation={[0, 0, 0.14]}>
          <boxGeometry args={[0.012, 0.022, 0.003]} />
          <meshStandardMaterial color={entry.accentColor} roughness={0.6} />
        </mesh>

        {/* Luminous Rim Frame when Hovered or Focused */}
        {activeHighlight && (
          <mesh>
            <boxGeometry args={[bookW + 0.014, bookH + 0.014, bookD + 0.014]} />
            <meshBasicMaterial
              color={isSelected ? '#5eead4' : '#fbbf24'}
              transparent
              opacity={isSelected ? 0.34 : 0.28}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

/**
 * Composite Walnut Bookshelf with crown molding, 4 stocked interactive book tiers,
 * optional Featured Cover Gallery Tier (Shelf III), and study curios.
 */
function WalnutBookshelf({
  position,
  rotation = [0, 0, 0],
  seed,
  caseName,
  withGlobe = false,
  featuredShowcase = false,
  shelfSortMode,
  selectedBookId,
  maxAniso,
  pageEdgeTex,
  shadowTex,
  onInvalidate,
  onStartHover,
  onEndHover,
  onFocusBooks,
  onSelectFeaturedBook,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  seed: number;
  caseName: string;
  withGlobe?: boolean;
  featuredShowcase?: boolean;
  shelfSortMode: BookShelfSortMode;
  selectedBookId: FeaturedBookId | null;
  maxAniso: number;
  pageEdgeTex: THREE.CanvasTexture;
  shadowTex: THREE.CanvasTexture;
  onInvalidate: () => void;
  onStartHover: (
    anchorObj: THREE.Object3D,
    localOffsetY: number,
    meta: Omit<HoveredStudyItem, 'initialX' | 'initialY'>,
  ) => void;
  onEndHover: (id: string) => void;
  onFocusBooks: () => void;
  onSelectFeaturedBook?: (bookId: FeaturedBookId, focus: CustomCameraFocus) => void;
}) {
  const globeShelfIdx = withGlobe ? (featuredShowcase ? 3 : 2) : null;
  const shelves = useMemo(
    () => buildShelfBooks(seed, 1.66, globeShelfIdx),
    [globeShelfIdx, seed],
  );
  const sortedMaps = useMemo(
    () => shelves.map((row) => computeSortedRowPositions(row, shelfSortMode, 1.66)),
    [shelfSortMode, shelves],
  );
  const sortedFeatured = useMemo(
    () => getSortedFeaturedBooks(shelfSortMode),
    [shelfSortMode],
  );

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

      {/* Subtle Warm Gallery Picture-Light Strip above Featured Cover Tier */}
      {featuredShowcase && (
        <group position={[0, shelfY[3] - 0.024, 0.13]}>
          <mesh>
            <boxGeometry args={[1.48, 0.012, 0.022]} />
            <meshStandardMaterial color="#c89a42" metalness={0.8} roughness={0.28} />
          </mesh>
          <pointLight
            position={[0, -0.06, 0.12]}
            color="#fff4dc"
            intensity={0.78}
            distance={1.6}
            decay={2}
          />
        </group>
      )}

      {/* Interactive Hardcover Books & Featured Cover Gallery Tier */}
      {shelves.map((row, sIdx) => {
        const baseTop = shelfY[sIdx] + 0.018;

        // Dedicated Face-Out Featured Cover Books on Shelf III of the Showcase Case
        if (featuredShowcase && sIdx === 2 && onSelectFeaturedBook) {
          return (
            <group key="featured-cover-tier">
              {/* Sculpted Brass Arch Bookends flanking the 4 Featured Covers */}
              {[-0.785, 0.785].map((bx, i) => (
                <group key={i} position={[bx, baseTop, 0.02]}>
                  <mesh position={[0, 0.008, 0]}>
                    <boxGeometry args={[0.048, 0.016, 0.16]} />
                    <meshStandardMaterial color="#c99b42" metalness={0.82} roughness={0.26} />
                  </mesh>
                  <mesh position={[0, 0.095, 0]}>
                    <boxGeometry args={[0.016, 0.17, 0.13]} />
                    <meshStandardMaterial color="#3c2415" roughness={0.52} />
                  </mesh>
                </group>
              ))}

              {FEATURED_BOOK_LIST.map((entry) => {
                const slotIdx = sortedFeatured.findIndex((item) => item.id === entry.id);
                return (
                  <FeaturedCoverBook
                    key={entry.id}
                    entry={entry}
                    slotIndex={slotIdx >= 0 ? slotIdx : entry.curatedRank}
                    baseTop={baseTop}
                    isSelected={selectedBookId === entry.id}
                    maxAniso={maxAniso}
                    pageEdgeTex={pageEdgeTex}
                    onInvalidate={onInvalidate}
                    onStartHover={onStartHover}
                    onEndHover={onEndHover}
                    onSelectBook={onSelectFeaturedBook}
                  />
                );
              })}
            </group>
          );
        }

        const posMap = sortedMaps[sIdx];
        return (
          <group key={sIdx}>
            {row.map((b) => {
              const target = posMap.get(b.id) ?? { x: b.x, tilt: b.tilt };
              return (
                <InteractiveShelfBook
                  key={b.id}
                  book={b}
                  targetX={target.x}
                  targetTilt={target.tilt}
                  baseTop={baseTop}
                  caseName={caseName}
                  shelfIndex={sIdx}
                  onStartHover={onStartHover}
                  onEndHover={onEndHover}
                  onFocusBooks={onFocusBooks}
                />
              );
            })}
          </group>
        );
      })}

      {/* Optional Brass & Emerald Study Globe */}
      {withGlobe && globeShelfIdx !== null && (
        <group position={[0.56, shelfY[globeShelfIdx] + 0.02, 0.03]}>
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
 * Plush Contemporary Greige/Taupe Sofa + Remade 3D Distinguished Scholar in Solid Navy Suit & White Shirt
 * Seated holding an open hardcover book with both hands (matched to reference photograph).
 * + Sleeping Orange Tabby Cat curled beside him.
 */
function SofaWithReadingScholar({
  position,
  rotation = [0, 0, 0],
  bookPageTex,
  navySuitTex,
  crispWhiteShirtTex,
  pinstripeSuitTex,
  stripedShirtTex,
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
  navySuitTex?: THREE.CanvasTexture;
  crispWhiteShirtTex?: THREE.CanvasTexture;
  pinstripeSuitTex?: THREE.CanvasTexture;
  stripedShirtTex?: THREE.CanvasTexture;
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
  const jawGroupRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const turningPageRef = useRef<THREE.Group>(null);
  const bookGroupRef = useRef<THREE.Group>(null);
  const glassesFrameMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const auraRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const leaveTimerRef = useRef<number | null>(null);

  const suitTex = navySuitTex || pinstripeSuitTex;
  const shirtTex = crispWhiteShirtTex || stripedShirtTex;

  // Solid dark midnight navy tailored suit worsted wool material (matched to reference photo)
  const suitJacketMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: suitTex,
        emissive: '#d97706',
        emissiveIntensity: 0,
        roughness: 0.58,
        metalness: 0.04,
      }),
    [suitTex],
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

    // Subtle warm highlight on navy suit blazer & rectangular glasses when hovered, focused, or conversing
    suitJacketMat.emissiveIntensity = hm * 0.22 + (isConversing ? 0.09 : 0);
    if (glassesFrameMatRef.current) {
      glassesFrameMatRef.current.emissiveIntensity = hm * 0.4 + sm * 0.22;
    }
    if (auraRingMatRef.current) {
      auraRingMatRef.current.opacity = hm * 0.34 + (isConversing ? 0.16 : 0);
    }

    // Calm breathing cycle + composed executive posture
    const breath = Math.sin(t * 1.45);
    if (upperBodyRef.current) {
      upperBodyRef.current.position.y = 0.68 + breath * 0.007;
      upperBodyRef.current.rotation.x =
        THREE.MathUtils.lerp(0.05, 0.015, lm) + breath * 0.012;
      upperBodyRef.current.rotation.y = THREE.MathUtils.lerp(0, 0.09, lm);
    }

    // Periodic page-turn every 7 seconds (paused smoothly while conversing)
    const cycle = t % 7.0;
    const isTurning = lm < 0.25 && cycle > 5.75 && cycle < 6.75;
    const turnProgress = isTurning ? (cycle - 5.75) / 1.0 : 0;
    const smoothTurn =
      turnProgress > 0
        ? turnProgress * turnProgress * (3 - 2 * turnProgress)
        : 0;

    // Reading head movement smoothly blends into looking up thoughtfully & nodding during conversation
    if (headRef.current) {
      const lineScan = Math.sin(t * 0.72) * 0.11;
      const pageNod = Math.sin(t * 1.44) * 0.026;
      const readRotX = 0.33 + pageNod + (isTurning ? 0.04 : 0);
      const readRotY = lineScan;

      const speakNod = Math.sin(t * 5.4) * 0.046 * sm;
      const speakTurn = Math.sin(t * 2.3) * 0.042 * sm;
      const converseRotX = 0.02 + Math.sin(t * 1.1) * 0.018 + speakNod;
      const converseRotY = 0.15 + Math.sin(t * 0.65) * 0.035 + speakTurn;

      headRef.current.rotation.x = THREE.MathUtils.lerp(readRotX, converseRotX, lm);
      headRef.current.rotation.y = THREE.MathUtils.lerp(readRotY, converseRotY, lm);
      headRef.current.rotation.z =
        Math.sin(t * 0.45) * 0.02 + Math.sin(t * 3.1) * 0.018 * sm;
    }

    // Clean-shaven lower jaw / mouth articulation while speaking an answer
    if (jawGroupRef.current) {
      jawGroupRef.current.position.y =
        -0.074 - Math.abs(Math.sin(t * 8.8)) * 0.0085 * sm;
    }

    // Both hands hold open book symmetrically (matching reference photo) with micro-adjustments
    if (rightArmRef.current) {
      const turnLift = Math.sin(smoothTurn * Math.PI);
      const speakGesture = Math.sin(t * 3.4) * 0.025 * sm;
      rightArmRef.current.rotation.x =
        -0.76 - turnLift * 0.12 - lm * 0.08 + speakGesture;
      rightArmRef.current.rotation.z =
        0.2 - turnLift * 0.08 + speakGesture * 0.08;
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -0.76 + breath * 0.012 - lm * 0.08;
      leftArmRef.current.rotation.z = -0.2;
    }

    // Book rests comfortably in front of chest/lap
    if (bookGroupRef.current) {
      bookGroupRef.current.position.y =
        THREE.MathUtils.lerp(0.88, 0.82, lm) + breath * 0.008;
      bookGroupRef.current.rotation.x = THREE.MathUtils.lerp(0.62, 0.4, lm);
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

      {/* ==================== 1. CONTEMPORARY WARM TAUPE / GREIGE FABRIC SOFA ==================== */}
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

      {/* Upholstered Lower Apron - Warm Taupe / Greige */}
      <mesh position={[0, 0.34, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[2.34, 0.14, 0.96]} />
        <meshStandardMaterial color="#888076" roughness={0.86} />
      </mesh>

      {/* 3 Plush Seat Cushions - Warm Taupe / Mushroom Greige (Matched to Reference Image) */}
      {[-0.72, 0, 0.72].map((cx, i) => (
        <mesh
          key={i}
          position={[cx, 0.47, 0.05]}
          castShadow={!isSoftwareGl}
          receiveShadow={!isSoftwareGl}
        >
          <boxGeometry args={[0.7, 0.16, 0.84]} />
          <meshStandardMaterial color="#9d9489" roughness={0.88} />
        </mesh>
      ))}

      {/* Backrest + 3 Back Cushions - Warm Taupe Greige */}
      <mesh
        position={[0, 0.82, -0.39]}
        rotation={[-0.08, 0, 0]}
        castShadow={!isSoftwareGl}
        receiveShadow={!isSoftwareGl}
      >
        <boxGeometry args={[2.32, 0.82, 0.22]} />
        <meshStandardMaterial color="#8d847a" roughness={0.86} />
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
          <meshStandardMaterial color="#9c9388" roughness={0.88} />
        </mesh>
      ))}

      {/* Track Left & Right Armrests - Matching Warm Taupe Greige */}
      {[-1.12, 1.12].map((ax, i) => (
        <group key={i} position={[ax, 0.62, 0]}>
          <mesh castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
            <boxGeometry args={[0.2, 0.46, 0.96]} />
            <meshStandardMaterial color="#91887e" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={!isSoftwareGl}>
            <cylinderGeometry args={[0.115, 0.115, 0.96, 16]} />
            <meshStandardMaterial color="#9c9388" roughness={0.86} />
          </mesh>
        </group>
      ))}

      {/* Contemporary Soft Accent Pillows */}
      <mesh
        position={[0.84, 0.68, -0.05]}
        rotation={[0.18, -0.35, 0.24]}
        scale={[0.34, 0.32, 0.14]}
        castShadow={!isSoftwareGl}
      >
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#b4a999" roughness={0.88} />
      </mesh>
      <mesh
        position={[-0.88, 0.66, -0.06]}
        rotation={[0.15, 0.32, -0.25]}
        scale={[0.3, 0.29, 0.13]}
        castShadow={!isSoftwareGl}
      >
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#6b7280" roughness={0.88} />
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

        {/* Seated Midnight Navy Suit Trousers Pelvis + Black Leather Dress Belt with Silver Buckle */}
        <mesh position={[0, 0.58, -0.05]} material={suitJacketMat} castShadow={!isSoftwareGl}>
          <boxGeometry args={[0.38, 0.15, 0.3]} />
        </mesh>
        {/* Dark Leather Dress Belt at Waistband */}
        <mesh position={[0, 0.65, 0.08]}>
          <boxGeometry args={[0.36, 0.034, 0.07]} />
          <meshStandardMaterial color="#141312" roughness={0.34} />
        </mesh>
        {/* Polished Silver Chrome Belt Buckle */}
        <mesh position={[0, 0.65, 0.118]}>
          <boxGeometry args={[0.046, 0.034, 0.014]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.88} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.65, 0.124]}>
          <boxGeometry args={[0.008, 0.024, 0.008]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.16} />
        </mesh>

        {/* Left & Right Tailored Navy Suit Trousers + Crisp Pressed Creases + Dark Socks + Oxford Shoes */}
        {[-0.105, 0.105].map((lx, idx) => (
          <group key={idx}>
            {/* Tailored Suit Thigh resting on sofa cushion */}
            <mesh
              position={[lx, 0.58, 0.17]}
              rotation={[Math.PI / 2 - 0.06, idx === 0 ? 0.04 : -0.04, 0]}
              material={suitJacketMat}
              castShadow={!isSoftwareGl}
            >
              <capsuleGeometry args={[0.076, 0.3, 8, 14]} />
            </mesh>
            {/* Crisp Center Pressed Crease along Thigh */}
            <mesh
              position={[lx * 1.02, 0.638, 0.17]}
              rotation={[Math.PI / 2 - 0.06, idx === 0 ? 0.04 : -0.04, 0]}
            >
              <boxGeometry args={[0.006, 0.28, 0.008]} />
              <meshStandardMaterial color="#293952" roughness={0.5} />
            </mesh>
            {/* Pressed Suit Trouser Leg angling down to floor rug */}
            <mesh
              position={[lx * 1.08, 0.32, 0.42]}
              rotation={[0.16, 0, 0]}
              material={suitJacketMat}
              castShadow={!isSoftwareGl}
            >
              <capsuleGeometry args={[0.064, 0.34, 8, 14]} />
            </mesh>
            {/* Razor-Sharp Center Pressed Crease along Shin (Signature Tailoring from Photo) */}
            <mesh
              position={[lx * 1.08, 0.32, 0.472]}
              rotation={[0.16, 0, 0]}
            >
              <boxGeometry args={[0.006, 0.32, 0.008]} />
              <meshStandardMaterial color="#283750" roughness={0.5} />
            </mesh>
            {/* Crisp Trouser Hem Cuff */}
            <mesh
              position={[lx * 1.08, 0.155, 0.45]}
              rotation={[0.16, 0, 0]}
              material={suitJacketMat}
            >
              <cylinderGeometry args={[0.066, 0.066, 0.03, 14]} />
            </mesh>
            {/* Charcoal Dress Sock */}
            <mesh position={[lx * 1.08, 0.115, 0.46]}>
              <cylinderGeometry args={[0.046, 0.046, 0.075, 10]} />
              <meshStandardMaterial color="#11141d" roughness={0.82} />
            </mesh>
            {/* Burnished Dark Espresso / Black Leather Oxford Dress Shoe */}
            <group position={[lx * 1.1, 0.055, 0.535]} rotation={[0, idx === 0 ? 0.05 : -0.05, 0]}>
              <mesh scale={[0.072, 0.05, 0.15]} castShadow={!isSoftwareGl}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshStandardMaterial color="#161311" roughness={0.24} metalness={0.16} />
              </mesh>
              {/* Polished Cap Toe */}
              <mesh position={[0, 0.008, 0.075]} scale={[0.062, 0.036, 0.065]}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshStandardMaterial color="#0f0c0a" roughness={0.18} metalness={0.18} />
              </mesh>
              {/* Welt Sole Edge */}
              <mesh position={[0, -0.032, 0]}>
                <boxGeometry args={[0.126, 0.022, 0.258]} />
                <meshStandardMaterial color="#0a0807" roughness={0.65} />
              </mesh>
              {/* Heel Block */}
              <mesh position={[0, -0.032, -0.075]}>
                <boxGeometry args={[0.118, 0.026, 0.08]} />
                <meshStandardMaterial color="#070605" roughness={0.7} />
              </mesh>
              {/* Lacing Eyestay & Dark Laces */}
              <mesh position={[0, 0.034, 0.012]} rotation={[-0.32, 0, 0]}>
                <boxGeometry args={[0.032, 0.012, 0.058]} />
                <meshStandardMaterial color="#1c1714" roughness={0.4} />
              </mesh>
            </group>
          </group>
        ))}

        {/* Upper Body Matched to Reference Photo: Tailored Midnight Navy Suit + Crisp White Dress Shirt */}
        <group ref={upperBodyRef} position={[0, 0.68, -0.07]} rotation={[0.05, 0, 0]}>
          {/* Tailored Navy Suit Blazer Torso */}
          <mesh position={[0, 0.22, 0]} material={suitJacketMat} castShadow={!isSoftwareGl}>
            <capsuleGeometry args={[0.188, 0.27, 10, 18]} />
          </mesh>

          {/* Structured Tailored Suit Shoulders */}
          {[-0.188, 0.188].map((sx, i) => (
            <mesh
              key={i}
              position={[sx, 0.365, 0.012]}
              scale={[0.88, 0.64, 0.94]}
              material={suitJacketMat}
              castShadow={!isSoftwareGl}
            >
              <sphereGeometry args={[0.08, 12, 10]} />
            </mesh>
          ))}

          {/* Crisp Solid White Poplin Dress Shirt Chest (Open Collar, No Tie) */}
          <mesh position={[0, 0.315, 0.146]} rotation={[-0.16, 0, 0]}>
            <boxGeometry args={[0.138, 0.22, 0.058]} />
            <meshStandardMaterial map={shirtTex} roughness={0.48} />
          </mesh>

          {/* Open Top Collar Neck V-Skin */}
          <mesh position={[0, 0.402, 0.124]} rotation={[-0.22, 0, 0]}>
            <coneGeometry args={[0.032, 0.072, 3]} />
            <meshStandardMaterial color="#d49a74" roughness={0.6} />
          </mesh>

          {/* Center Button Placket + Mother-of-Pearl Shirt Buttons */}
          <mesh position={[0.004, 0.285, 0.166]} rotation={[-0.16, 0, 0]}>
            <boxGeometry args={[0.022, 0.15, 0.012]} />
            <meshStandardMaterial map={shirtTex} roughness={0.46} />
          </mesh>
          {[0.325, 0.26, 0.195].map((by, i) => (
            <mesh key={i} position={[0.004, by, 0.174]} rotation={[Math.PI / 2 - 0.16, 0, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 0.004, 10]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.28} metalness={0.1} />
            </mesh>
          ))}

          {/* Open-Neck Spread Shirt Collar Stand & Left/Right Collar Points */}
          {[-0.044, 0.044].map((cx, i) => (
            <group key={i}>
              <mesh
                position={[cx * 0.56, 0.39, 0.136]}
                rotation={[-0.18, 0, i === 0 ? 0.22 : -0.22]}
              >
                <boxGeometry args={[0.024, 0.075, 0.016]} />
                <meshStandardMaterial map={shirtTex} roughness={0.46} />
              </mesh>
              <mesh
                position={[cx, 0.428, 0.095]}
                rotation={[0.2, i === 0 ? 0.28 : -0.28, i === 0 ? -0.26 : 0.26]}
              >
                <boxGeometry args={[0.056, 0.052, 0.02]} />
                <meshStandardMaterial map={shirtTex} roughness={0.45} />
              </mesh>
            </group>
          ))}

          {/* Sharp Tailored Notched Suit Lapels (Clean Tailoring like Reference Photo) */}
          {[-0.078, 0.078].map((sx, i) => (
            <group key={i}>
              <mesh
                position={[sx, 0.265, 0.166]}
                rotation={[-0.1, i === 0 ? 0.14 : -0.14, i === 0 ? -0.22 : 0.22]}
                material={suitJacketMat}
              >
                <boxGeometry args={[0.052, 0.27, 0.032]} />
              </mesh>
              <mesh
                position={[sx * 1.12, 0.396, 0.116]}
                rotation={[-0.22, 0, i === 0 ? -0.42 : 0.42]}
                material={suitJacketMat}
              >
                <boxGeometry args={[0.044, 0.084, 0.028]} />
              </mesh>
            </group>
          ))}

          {/* Two Dark Horn Blazer Waist Buttons */}
          {[0.145, 0.078].map((by, i) => (
            <mesh key={i} position={[0, by, 0.186]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0105, 0.0105, 0.009, 12]} />
              <meshStandardMaterial color="#1a1e26" roughness={0.36} metalness={0.15} />
            </mesh>
          ))}

          {/* Warm Sun-Tanned Neck */}
          <mesh position={[0, 0.452, 0.022]}>
            <cylinderGeometry args={[0.068, 0.078, 0.105, 14]} />
            <meshStandardMaterial color="#d69c76" roughness={0.58} />
          </mesh>

          {/* ==================== SCULPTED HEAD MATCHING REFERENCE PORTRAIT ==================== */}
          {/* Clean-shaven ~60yo East Asian scholar, short dark hair + silver sideburns/temples, rectangular dark glasses */}
          <group ref={headRef} position={[0, 0.555, 0.042]} rotation={[0.33, 0, 0]}>
            {/* Upper Cranium & Forehead */}
            <mesh scale={[0.98, 1.04, 1.0]} castShadow={!isSoftwareGl}>
              <sphereGeometry args={[0.146, 24, 20]} />
              <meshStandardMaterial color="#daa27d" roughness={0.56} />
            </mesh>

            {/* Subtle Cheekbones for Mature Facial Contour */}
            {[-0.082, 0.082].map((cx, i) => (
              <mesh key={i} position={[cx, -0.022, 0.095]} scale={[0.62, 0.52, 0.58]}>
                <sphereGeometry args={[0.068, 12, 10]} />
                <meshStandardMaterial color="#d79d77" roughness={0.56} />
              </mesh>
            ))}

            {/* Articulated Clean-Shaven Lower Jaw, Chin & Natural Lips */}
            <group ref={jawGroupRef} position={[0, -0.074, 0.056]}>
              {/* Clean-Shaven Jaw & Chin */}
              <mesh scale={[0.88, 0.68, 0.92]} castShadow={!isSoftwareGl}>
                <sphereGeometry args={[0.102, 18, 14]} />
                <meshStandardMaterial color="#d39872" roughness={0.58} />
              </mesh>
              {/* Subtle Chin Tip */}
              <mesh position={[0, -0.026, 0.068]} scale={[0.85, 0.65, 0.75]}>
                <sphereGeometry args={[0.036, 12, 10]} />
                <meshStandardMaterial color="#d1956f" roughness={0.58} />
              </mesh>
              {/* Composed Thoughtful Mouth / Upper & Lower Lip */}
              <mesh position={[0, 0.016, 0.087]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.0065, 0.044, 6, 10]} />
                <meshStandardMaterial color="#aa6953" roughness={0.52} />
              </mesh>
              <mesh position={[0, 0.007, 0.086]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.007, 0.038, 6, 10]} />
                <meshStandardMaterial color="#b77760" roughness={0.48} />
              </mesh>
            </group>

            {/* Subtle Nasolabial Expression Lines (Mature 60yo Character Realism) */}
            {[-0.038, 0.038].map((nx, i) => (
              <mesh
                key={i}
                position={[nx, -0.042, 0.132]}
                rotation={[0.15, 0, i === 0 ? 0.36 : -0.36]}
              >
                <capsuleGeometry args={[0.0028, 0.028, 4, 8]} />
                <meshStandardMaterial color="#bf835f" roughness={0.65} />
              </mesh>
            ))}

            {/* Sculpted Ears */}
            {[-0.141, 0.141].map((ex, i) => (
              <group key={i} position={[ex, -0.008, -0.006]}>
                <mesh scale={[0.42, 0.88, 0.62]}>
                  <sphereGeometry args={[0.044, 12, 10]} />
                  <meshStandardMaterial color="#d29670" roughness={0.58} />
                </mesh>
                <mesh position={[0, -0.022, 0.004]} scale={[0.38, 0.5, 0.48]}>
                  <sphereGeometry args={[0.028, 8, 8]} />
                  <meshStandardMaterial color="#cf926c" roughness={0.58} />
                </mesh>
              </group>
            ))}

            {/* ==================== SHORT TEXTURED DARK HAIR + SILVER TEMPLES & SIDEBURNS ==================== */}
            {/* Back & Crown Short Cropped Charcoal-Black Hair (leaves broad forehead open) */}
            <mesh
              position={[0, 0.034, -0.034]}
              rotation={[-0.24, 0, 0]}
              scale={[1.03, 1.0, 1.02]}
              castShadow={!isSoftwareGl}
            >
              <sphereGeometry args={[0.145, 22, 18]} />
              <meshStandardMaterial color="#1f2329" roughness={0.78} />
            </mesh>

            {/* Textured Short Brushed-Up Top Hair Layers (matching photo's cropped spiky/textured crown) */}
            {[
              [-0.045, 0.138, 0.022, -0.18, 0.1, 0.15],
              [0.0, 0.144, 0.03, -0.22, 0, 0],
              [0.046, 0.137, 0.022, -0.18, -0.1, -0.15],
              [-0.028, 0.132, 0.058, -0.35, 0.08, 0.1],
              [0.028, 0.132, 0.058, -0.35, -0.08, -0.1],
            ].map(([tx, ty, tz, rx, ry, rz], idx) => (
              <mesh
                key={idx}
                position={[tx, ty, tz]}
                rotation={[rx, ry, rz]}
                scale={[0.88, 0.42, 0.95]}
              >
                <sphereGeometry args={[0.056, 12, 10]} />
                <meshStandardMaterial
                  color={idx % 2 === 0 ? '#23272e' : '#2e333c'}
                  roughness={0.76}
                />
              </mesh>
            ))}

            {/* Prominent Silver-Grey / White Temple Hair & Sideburns (Signature Detail from Photo) */}
            {[-1, 1].map((dir, i) => (
              <group key={i}>
                {/* Upper Salt-and-Pepper Transition Band */}
                <mesh
                  position={[dir * 0.122, 0.058, 0.008]}
                  rotation={[0, 0, dir * -0.18]}
                  scale={[0.42, 0.68, 0.88]}
                >
                  <sphereGeometry args={[0.082, 12, 10]} />
                  <meshStandardMaterial color="#6d7682" roughness={0.78} />
                </mesh>
                {/* Bright Silver-Grey Temple Patch above Ear */}
                <mesh
                  position={[dir * 0.132, 0.024, 0.02]}
                  scale={[0.36, 0.62, 0.82]}
                >
                  <sphereGeometry args={[0.074, 12, 10]} />
                  <meshStandardMaterial color="#c4ccd6" roughness={0.76} />
                </mesh>
                {/* Crisp Silver-White Sideburn in Front of Ear */}
                <mesh
                  position={[dir * 0.137, -0.004, 0.046]}
                  rotation={[0.14, dir * 0.2, 0]}
                >
                  <boxGeometry args={[0.016, 0.056, 0.028]} />
                  <meshStandardMaterial color="#d4dbe3" roughness={0.76} />
                </mesh>
              </group>
            ))}

            {/* Nose Bridge & Sculpted Tip */}
            <mesh position={[0, 0.004, 0.144]} rotation={[-0.18, 0, 0]}>
              <capsuleGeometry args={[0.015, 0.036, 6, 10]} />
              <meshStandardMaterial color="#d49973" roughness={0.56} />
            </mesh>
            <mesh position={[0, -0.018, 0.154]} scale={[1.12, 0.85, 0.95]}>
              <sphereGeometry args={[0.019, 12, 10]} />
              <meshStandardMaterial color="#d1956f" roughness={0.56} />
            </mesh>

            {/* Warm Dark Brown Eyes, Upper Eyelids & Charcoal Salt-and-Pepper Eyebrows */}
            {[-0.049, 0.049].map((ex, i) => (
              <group key={i}>
                {/* Subtle Sclera + Dark Espresso Iris */}
                <mesh position={[ex, 0.016, 0.131]} scale={[1.15, 0.85, 0.7]}>
                  <sphereGeometry args={[0.016, 10, 10]} />
                  <meshStandardMaterial color="#f1f5f9" roughness={0.28} />
                </mesh>
                <mesh position={[ex, 0.015, 0.138]}>
                  <sphereGeometry args={[0.0115, 10, 10]} />
                  <meshStandardMaterial color="#1f140e" roughness={0.22} />
                </mesh>
                {/* Upper Eyelid Crease */}
                <mesh
                  position={[ex, 0.024, 0.136]}
                  rotation={[0.2, 0, i === 0 ? 0.05 : -0.05]}
                  scale={[1.15, 0.35, 0.65]}
                >
                  <sphereGeometry args={[0.016, 10, 8]} />
                  <meshStandardMaterial color="#c78b66" roughness={0.6} />
                </mesh>
                {/* Natural Charcoal Eyebrow */}
                <mesh
                  position={[ex, 0.046, 0.136]}
                  rotation={[0, i === 0 ? 0.14 : -0.14, i === 0 ? 0.05 : -0.05]}
                >
                  <boxGeometry args={[0.046, 0.011, 0.016]} />
                  <meshStandardMaterial color="#2c3038" roughness={0.8} />
                </mesh>
              </group>
            ))}

            {/* ==================== SLEEK RECTANGULAR SEMI-RIMLESS DARK GLASSES ==================== */}
            <group position={[0, 0.015, 0.152]}>
              {[-0.05, 0.05].map((gx, i) => (
                <group key={i} position={[gx, 0, 0]}>
                  {/* Crisp Dark Gunmetal Upper Brow Bar */}
                  <mesh position={[0, 0.016, 0.001]}>
                    <boxGeometry args={[0.058, 0.0055, 0.006]} />
                    <meshStandardMaterial
                      ref={i === 0 ? glassesFrameMatRef : undefined}
                      color="#171a21"
                      emissive="#f59e0b"
                      emissiveIntensity={0}
                      metalness={0.78}
                      roughness={0.24}
                    />
                  </mesh>
                  {/* Thin Outer & Inner Side Stanchions */}
                  {[-0.028, 0.028].map((rx, ri) => (
                    <mesh key={ri} position={[rx, 0, 0]}>
                      <boxGeometry args={[0.0032, 0.032, 0.0045]} />
                      <meshStandardMaterial
                        color="#222630"
                        metalness={0.78}
                        roughness={0.26}
                      />
                    </mesh>
                  ))}
                  {/* Delicate Semi-Rimless Lower Wire */}
                  <mesh position={[0, -0.0155, 0]}>
                    <boxGeometry args={[0.055, 0.002, 0.003]} />
                    <meshStandardMaterial
                      color="#94a3b8"
                      metalness={0.85}
                      roughness={0.22}
                    />
                  </mesh>
                  {/* Rectangular Clear Optical Lens */}
                  <mesh>
                    <boxGeometry args={[0.054, 0.03, 0.0025]} />
                    <meshStandardMaterial
                      color="#e0f2fe"
                      transparent
                      opacity={0.22}
                      roughness={0.1}
                      metalness={0.1}
                    />
                  </mesh>
                </group>
              ))}

              {/* Sleek Gunmetal Nose Bridge */}
              <mesh position={[0, 0.008, 0]}>
                <boxGeometry args={[0.042, 0.004, 0.0045]} />
                <meshStandardMaterial color="#1f242d" metalness={0.82} roughness={0.24} />
              </mesh>

              {/* Left & Right Thin Black Temple Arms Extending Back Over Silver Sideburns to Ears */}
              {[-1, 1].map((dir, i) => (
                <group key={i}>
                  {/* Outer Hinge Lug */}
                  <mesh position={[dir * 0.082, 0.011, -0.004]}>
                    <boxGeometry args={[0.01, 0.0045, 0.01]} />
                    <meshStandardMaterial color="#171a21" metalness={0.78} roughness={0.25} />
                  </mesh>
                  {/* Straight Black Temple Arm to Ear */}
                  <mesh
                    position={[dir * 0.114, 0.006, -0.078]}
                    rotation={[0.06, dir * -0.34, 0]}
                  >
                    <boxGeometry args={[0.004, 0.005, 0.152]} />
                    <meshStandardMaterial color="#14171d" metalness={0.65} roughness={0.3} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>

          {/* ==================== LEFT SUIT SLEEVE (4 HORN CUFF BUTTONS + CRISP WHITE SHIRT CUFF + HAND CUPPING BOOK) ==================== */}
          <group position={[-0.215, 0.34, 0.02]}>
            <mesh
              position={[-0.02, -0.11, 0.06]}
              rotation={[-0.42, 0, 0.18]}
              material={suitJacketMat}
              castShadow={!isSoftwareGl}
            >
              <capsuleGeometry args={[0.057, 0.18, 8, 12]} />
            </mesh>
            <group ref={leftArmRef} position={[-0.04, -0.21, 0.14]} rotation={[-0.76, 0.22, -0.18]}>
              <mesh position={[0, -0.09, 0]} material={suitJacketMat} castShadow={!isSoftwareGl}>
                <capsuleGeometry args={[0.049, 0.152, 8, 12]} />
              </mesh>
              {/* 4 Dark Horn Sleeve Cuff Buttons (matching Reference Photo) */}
              {[-0.118, -0.13, -0.142, -0.154].map((by, bi) => (
                <mesh
                  key={bi}
                  position={[-0.048, by, -0.008]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.0055, 0.0055, 0.004, 10]} />
                  <meshStandardMaterial color="#28221e" roughness={0.38} />
                </mesh>
              ))}
              {/* Crisp Solid White Dress Shirt Cuff */}
              <mesh position={[0, -0.175, 0]}>
                <cylinderGeometry args={[0.044, 0.042, 0.036, 14]} />
                <meshStandardMaterial map={shirtTex} roughness={0.44} />
              </mesh>
              {/* Left Hand Cupping Book Cover with Thumb Bracing Page Margin */}
              <group position={[0.01, -0.216, 0.01]} rotation={[0.2, 0.18, -0.2]}>
                {/* Palm / Hand */}
                <mesh scale={[0.92, 1.12, 0.72]}>
                  <sphereGeometry args={[0.042, 12, 10]} />
                  <meshStandardMaterial color="#d89f79" roughness={0.58} />
                </mesh>
                {/* Cupped Fingers under Left Book Cover */}
                <mesh position={[0.015, -0.028, 0.012]} rotation={[0.2, 0, 0]}>
                  <boxGeometry args={[0.034, 0.022, 0.042]} />
                  <meshStandardMaterial color="#d69c76" roughness={0.58} />
                </mesh>
                {/* Left Thumb Bracing Bottom Margin of Open Page */}
                <mesh position={[0.018, 0.024, 0.022]} rotation={[-0.32, 0.38, -0.15]}>
                  <capsuleGeometry args={[0.0085, 0.028, 6, 8]} />
                  <meshStandardMaterial color="#daa07a" roughness={0.56} />
                </mesh>
              </group>
            </group>
          </group>

          {/* ==================== RIGHT SUIT SLEEVE (4 HORN CUFF BUTTONS + CRISP WHITE SHIRT CUFF + HAND CUPPING BOOK) ==================== */}
          <group position={[0.215, 0.34, 0.02]}>
            <mesh
              position={[0.02, -0.11, 0.06]}
              rotation={[-0.42, 0, -0.18]}
              material={suitJacketMat}
              castShadow={!isSoftwareGl}
            >
              <capsuleGeometry args={[0.057, 0.18, 8, 12]} />
            </mesh>
            <group ref={rightArmRef} position={[0.04, -0.21, 0.14]} rotation={[-0.76, -0.22, 0.18]}>
              <mesh position={[0, -0.09, 0]} material={suitJacketMat} castShadow={!isSoftwareGl}>
                <capsuleGeometry args={[0.049, 0.152, 8, 12]} />
              </mesh>
              {/* 4 Dark Horn Sleeve Cuff Buttons (matching Reference Photo) */}
              {[-0.118, -0.13, -0.142, -0.154].map((by, bi) => (
                <mesh
                  key={bi}
                  position={[0.048, by, -0.008]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.0055, 0.0055, 0.004, 10]} />
                  <meshStandardMaterial color="#28221e" roughness={0.38} />
                </mesh>
              ))}
              {/* Crisp Solid White Dress Shirt Cuff */}
              <mesh position={[0, -0.175, 0]}>
                <cylinderGeometry args={[0.044, 0.042, 0.036, 14]} />
                <meshStandardMaterial map={shirtTex} roughness={0.44} />
              </mesh>
              {/* Right Hand Cupping Book Cover with Thumb Bracing Page Margin */}
              <group position={[-0.01, -0.216, 0.01]} rotation={[0.2, -0.18, 0.2]}>
                {/* Palm / Hand */}
                <mesh scale={[0.92, 1.12, 0.72]}>
                  <sphereGeometry args={[0.042, 12, 10]} />
                  <meshStandardMaterial color="#d89f79" roughness={0.58} />
                </mesh>
                {/* Cupped Fingers under Right Book Cover */}
                <mesh position={[-0.015, -0.028, 0.012]} rotation={[0.2, 0, 0]}>
                  <boxGeometry args={[0.034, 0.022, 0.042]} />
                  <meshStandardMaterial color="#d69c76" roughness={0.58} />
                </mesh>
                {/* Right Thumb Bracing Bottom Margin of Open Page */}
                <mesh position={[-0.018, 0.024, 0.022]} rotation={[-0.32, -0.38, 0.15]}>
                  <capsuleGeometry args={[0.0085, 0.028, 6, 8]} />
                  <meshStandardMaterial color="#daa07a" roughness={0.56} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* ==================== 3. OPEN HARDCOVER BOOK (SLATE CHARCOAL COVER MATCHING PHOTO) ==================== */}
        <group
          ref={bookGroupRef}
          position={[0, 0.88, 0.28]}
          rotation={[0.62, 0, 0]}
        >
          {/* Spine */}
          <mesh position={[0, -0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.28, 12]} />
            <meshStandardMaterial color="#2d3339" roughness={0.65} />
          </mesh>

          {/* Left Cover & Printed Page Block */}
          <group rotation={[0, 0, 0.22]}>
            <mesh position={[-0.105, -0.008, 0]} castShadow={!isSoftwareGl}>
              <boxGeometry args={[0.21, 0.012, 0.28]} />
              <meshStandardMaterial color="#373c42" roughness={0.65} />
            </mesh>
            <mesh position={[-0.1, 0.008, 0]}>
              <boxGeometry args={[0.195, 0.022, 0.265]} />
              <meshStandardMaterial map={bookPageTex} roughness={0.82} />
            </mesh>
          </group>

          {/* Right Cover & Printed Page Block */}
          <group rotation={[0, 0, -0.22]}>
            <mesh position={[0.105, -0.008, 0]} castShadow={!isSoftwareGl}>
              <boxGeometry args={[0.21, 0.012, 0.28]} />
              <meshStandardMaterial color="#373c42" roughness={0.65} />
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
  onOpenSupportHandover,
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
  onOpenSupportHandover?: (topic?: string) => void;
}) {
  const deskLampIntensity = lampsOn ? (theme === 'dark' ? 2.2 : 1.15) : 0;
  const displayGroupRef = useRef<THREE.Group>(null);
  const phoneGroupRef = useRef<THREE.Group>(null);
  const screenMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const screenLightRef = useRef<THREE.PointLight>(null);
  const [screenHovered, setScreenHovered] = useState(false);
  const [phoneHovered, setPhoneHovered] = useState(false);
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

      {/* Interactive 3D Executive Curator Desk Telephone (HandOver Support Call Point) */}
      <group
        ref={phoneGroupRef}
        position={[-0.56, 0.79, 0.15]}
        rotation={[0, 0.28, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setPhoneHovered(true);
          if (phoneGroupRef.current) {
            onStartHover(phoneGroupRef.current, 0.22, {
              id: 'curator-support-telephone',
              kind: 'screen',
              category: 'Sanctuary Direct Line',
              title: 'Curator Support Telephone',
              subtitle: 'Human Handover Line · Available Now',
              detail: 'Click to start direct audio call with sanctuary specialist',
              accentColor: '#10b981',
            });
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setPhoneHovered(false);
          onEndHover('curator-support-telephone');
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenSupportHandover?.('Desk Telephone Direct Line');
        }}
      >
        {/* Telephone Base Chassis */}
        <mesh position={[0, 0.022, 0]} castShadow={!isSoftwareGl}>
          <boxGeometry args={[0.2, 0.044, 0.22]} />
          <meshStandardMaterial
            color={phoneHovered ? '#1b4d3e' : '#1e293b'}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
        {/* Keypad & LCD Display Panel */}
        <mesh position={[0, 0.045, 0.02]} rotation={[-0.18, 0, 0]}>
          <boxGeometry args={[0.15, 0.008, 0.14]} />
          <meshStandardMaterial
            color={phoneHovered ? '#10b981' : '#334155'}
            roughness={0.35}
            emissive={phoneHovered ? '#059669' : '#0f172a'}
            emissiveIntensity={phoneHovered ? 0.75 : 0.15}
          />
        </mesh>
        {/* Brass Cradle Brackets */}
        {[-0.055, 0.055].map((bx, i) => (
          <mesh key={i} position={[bx, 0.05, -0.06]}>
            <cylinderGeometry args={[0.012, 0.012, 0.025, 8]} />
            <meshStandardMaterial color="#cba048" metalness={0.85} roughness={0.25} />
          </mesh>
        ))}
        {/* Handset Receiver */}
        <group position={[0, 0.068, -0.06]}>
          {/* Handset Grip */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.014, 0.014, 0.17, 10]} />
            <meshStandardMaterial
              color={phoneHovered ? '#1b4d3e' : '#1e293b'}
              roughness={0.4}
            />
          </mesh>
          {/* Earpiece */}
          <mesh position={[-0.09, 0, 0]} scale={[1, 1.3, 1]}>
            <sphereGeometry args={[0.028, 12, 10]} />
            <meshStandardMaterial
              color={phoneHovered ? '#10b981' : '#0f172a'}
              roughness={0.3}
            />
          </mesh>
          {/* Mouthpiece */}
          <mesh position={[0.09, 0, 0]} scale={[1, 1.3, 1]}>
            <sphereGeometry args={[0.028, 12, 10]} />
            <meshStandardMaterial
              color={phoneHovered ? '#10b981' : '#0f172a'}
              roughness={0.3}
            />
          </mesh>
        </group>
        {/* Subtle Pulse Halo when hovered */}
        {phoneHovered && (
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.13, 0.16, 24]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.65} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

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
  shelfSortMode,
  selectedBookId,
  isConversing,
  isScholarSpeaking,
  scholarExternalEngaged,
  scholarLabelDomRef,
  onScholarPointerChange,
  onHoverStudyItem,
  tooltipDomRef,
  onSelectOfficeView,
  onSelectFeaturedBook,
  onOpenScholarChat,
  onOpenSupportHandover,
}: OfficeStudySceneProps) {
  const { gl, camera, size, invalidate } = useThree();
  const maxAniso = useMemo(
    () => Math.min(8, gl.capabilities.getMaxAnisotropy()),
    [gl],
  );

  const woodFloorTex = useMemo(() => getWoodFloorTexture(maxAniso), [maxAniso]);
  const rugTex = useMemo(() => getRugPatternTexture(maxAniso), [maxAniso]);
  const monitorTex = useMemo(() => getMonitorScreenTexture(maxAniso), [maxAniso]);
  const bookPageTex = useMemo(() => getBookPageTexture(maxAniso), [maxAniso]);
  const bookEdgePagesTex = useMemo(
    () => getBookEdgePagesTexture(maxAniso),
    [maxAniso],
  );
  const navySuitTex = useMemo(() => getNavySuitTexture(maxAniso), [maxAniso]);
  const crispWhiteShirtTex = useMemo(
    () => getCrispWhiteShirtTexture(maxAniso),
    [maxAniso],
  );
  const pinstripeSuitTex = navySuitTex;
  const stripedShirtTex = crispWhiteShirtTex;
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
      {/* Back-Right Grand Bookshelf (Featured Cover Books Gallery Showcase) */}
      <WalnutBookshelf
        position={[2.3, 0, -3.52]}
        seed={109}
        caseName="East Conservatory Case"
        withGlobe
        featuredShowcase
        shelfSortMode={shelfSortMode}
        selectedBookId={selectedBookId}
        maxAniso={maxAniso}
        pageEdgeTex={bookEdgePagesTex}
        shadowTex={shadowTex}
        onInvalidate={invalidate}
        onStartHover={handleStartHover}
        onEndHover={handleEndHover}
        onFocusBooks={() => onSelectOfficeView('office-books')}
        onSelectFeaturedBook={onSelectFeaturedBook}
      />

      {/* Back-Left Bookshelf */}
      <WalnutBookshelf
        position={[-4.25, 0, -3.52]}
        seed={317}
        caseName="North Herbarium Case"
        shelfSortMode={shelfSortMode}
        selectedBookId={selectedBookId}
        maxAniso={maxAniso}
        pageEdgeTex={bookEdgePagesTex}
        shadowTex={shadowTex}
        onInvalidate={invalidate}
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
        shelfSortMode={shelfSortMode}
        selectedBookId={selectedBookId}
        maxAniso={maxAniso}
        pageEdgeTex={bookEdgePagesTex}
        shadowTex={shadowTex}
        onInvalidate={invalidate}
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
        navySuitTex={navySuitTex}
        crispWhiteShirtTex={crispWhiteShirtTex}
        pinstripeSuitTex={pinstripeSuitTex}
        stripedShirtTex={stripedShirtTex}
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
        onOpenSupportHandover={onOpenSupportHandover}
      />
    </group>
  );
}
