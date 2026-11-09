export interface HerbariumBookItem {
  id: string;
  title: string;
  author: string;
  edition: string;
  year: string;
  tierIndex: number;
  tierName: string;
  category: string;
  color: string;
  accentColor: string;
  summary: string;
  binding: string;
  shelfSlotX: number;
}

export interface BookStudyNote {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  noteType: 'reading-list' | 'botanical-research' | 'preservation';
  note: string;
  createdAt: string;
}

export const NORTH_HERBARIUM_SHELF_TIERS = [
  { index: -1, label: 'All Shelves', badge: 'All (24)' },
  { index: 0, label: 'Shelf I · Grand Folios', badge: '6 Volumes' },
  { index: 1, label: 'Shelf II · Historical Monographs', badge: '6 Volumes' },
  { index: 2, label: 'Shelf III · Pressed Herbarium', badge: '6 Volumes' },
  { index: 3, label: 'Shelf IV · Field Notes & Quarto', badge: '6 Volumes' },
] as const;

export const HERBARIUM_CATEGORIES = [
  'All Categories',
  'Botanical Taxonomy',
  'Glasshouse Architecture',
  'Nocturnal & Astronomy',
  'Herbal & Ethnobotany',
  'Ornithology & Ecology',
  'Philosophy & Essays',
] as const;

export const NORTH_HERBARIUM_BOOKS: HerbariumBookItem[] = [
  // Tier I (Bottom Shelf - Grand Folios)
  {
    id: 'hb-0-1',
    title: 'Flora Borealis: Illustrated Atlas',
    author: 'Carl von Linné',
    edition: 'First Folio · Imperial Engravings',
    year: '1753',
    tierIndex: 0,
    tierName: 'Shelf I · Grand Folios',
    category: 'Botanical Taxonomy',
    color: '#285443',
    accentColor: '#fbbf24',
    binding: 'Morocco Leather · Gilt Crown Trim',
    summary:
      'Seminal taxonomic treatise documenting 1,200 northern European alpine and subarctic plant specimens with hand-colored copperplate engravings.',
    shelfSlotX: -0.62,
  },
  {
    id: 'hb-0-2',
    title: 'Architecture of Glass Conservatories',
    author: 'Joseph Paxton',
    edition: 'Double Elephant Quarto · Architectural Plates',
    year: '1854',
    tierIndex: 0,
    tierName: 'Shelf I · Grand Folios',
    category: 'Glasshouse Architecture',
    color: '#26466d',
    accentColor: '#38bdf8',
    binding: 'Linen-Backed Buckram · Brass Corners',
    summary:
      'Detailed mechanical blueprints, iron rib calculations, and thermal glasshouse designs inspired by the Great Conservatory at Chatsworth.',
    shelfSlotX: -0.38,
  },
  {
    id: 'hb-0-3',
    title: 'Celestial Comets & Orbital Tides',
    author: 'Edmond Halley',
    edition: 'Observatory Notes & Star Charts',
    year: '1705',
    tierIndex: 0,
    tierName: 'Shelf I · Grand Folios',
    category: 'Nocturnal & Astronomy',
    color: '#1f3a4d',
    accentColor: '#e0b863',
    binding: 'Calfskin Binding · Stamped Constellations',
    summary:
      'A pioneering astrological record charting recurring perihelion orbits and tidal harmonics alongside celestial observatory logs.',
    shelfSlotX: -0.12,
  },
  {
    id: 'hb-0-4',
    title: 'The Secret Life of Ancient Oaks',
    author: 'Thomas Pakenham',
    edition: 'First Edition Folio · Photogravure Plates',
    year: '1888',
    tierIndex: 0,
    tierName: 'Shelf I · Grand Folios',
    category: 'Botanical Taxonomy',
    color: '#8f5e28',
    accentColor: '#f59e0b',
    binding: 'Quarter-Bound Walnut Veneer & Cloth',
    summary:
      'An affectionate century-long photographic survey of solitary ancient British and European oaks, their canopy biomes, and fungal symbioses.',
    shelfSlotX: 0.14,
  },
  {
    id: 'hb-0-5',
    title: 'Timber Joinery & Classic Studies',
    author: 'George Nakashima',
    edition: 'Studio Monograph · Hand-Bound Proof',
    year: '1972',
    tierIndex: 0,
    tierName: 'Shelf I · Grand Folios',
    category: 'Glasshouse Architecture',
    color: '#7c2d23',
    accentColor: '#fbbf24',
    binding: 'Raw Linen Quarto · Japanese Silk Thread',
    summary:
      'Reflections on butterfly keys, live edges, and reverence for the soul of timber within contemplative studio and library architectures.',
    shelfSlotX: 0.38,
  },
  {
    id: 'hb-0-6',
    title: 'Treatise on Japanese Koi Ponds',
    author: 'Haruto Sato',
    edition: 'Kyoto Water Garden Series · Folding Plates',
    year: '1911',
    tierIndex: 0,
    tierName: 'Shelf I · Grand Folios',
    category: 'Ornithology & Ecology',
    color: '#355c52',
    accentColor: '#34d399',
    binding: 'Washi Paper Covers · Indigo Dyed Cloth',
    summary:
      'Traditional stone placement techniques, lotus aeration cycles, and living stream choreography developed across imperial gardens.',
    shelfSlotX: 0.62,
  },

  // Tier II (Shelf II - Historical Monographs)
  {
    id: 'hb-1-1',
    title: 'Nocturnal Pollination & Starlight',
    author: 'Dr. Evelyn Vance',
    edition: 'Field Monograph · Vol. II',
    year: '1896',
    tierIndex: 1,
    tierName: 'Shelf II · Historical Monographs',
    category: 'Nocturnal & Astronomy',
    color: '#26466d',
    accentColor: '#a78bfa',
    binding: 'Midnight Blue Buckram · Silver Foil Stamp',
    summary:
      'Detailed study of night-blooming cereus, hawkmoths, and ultraviolet petal markers guiding nocturnal pollinators under lunar illumination.',
    shelfSlotX: -0.64,
  },
  {
    id: 'hb-1-2',
    title: 'Botanical Watercolors of Kyoto',
    author: 'Kenji Takahashi',
    edition: 'Linen-Bound Quarto · Color Facsimile',
    year: '1924',
    tierIndex: 1,
    tierName: 'Shelf II · Historical Monographs',
    category: 'Botanical Taxonomy',
    color: '#9a4632',
    accentColor: '#fbbf24',
    binding: 'Embossed Plum Cloth · Silk Bookmark',
    summary:
      'Eight-color collotype reproductions of seasonal blossoms, weeping cherry stems, and moss varieties from mountain monastery gardens.',
    shelfSlotX: -0.38,
  },
  {
    id: 'hb-1-3',
    title: 'Acoustic Ecology of Songbirds',
    author: 'Arthur Linnea',
    edition: 'Sylva Archive Press · Author Signed Copy',
    year: '1938',
    tierIndex: 1,
    tierName: 'Shelf II · Historical Monographs',
    category: 'Ornithology & Ecology',
    color: '#285443',
    accentColor: '#4fd1b5',
    binding: 'Green Library Cloth · Blind Stamped Spine',
    summary:
      'Sonographic analysis of canopy acoustics, territorial resonance, and melodic dialect shifts across northern conservatory bird species.',
    shelfSlotX: -0.14,
  },
  {
    id: 'hb-1-4',
    title: 'Medicinal Roots & Apothecary Lore',
    author: 'Elizabeth Blackwell',
    edition: 'Copperplate Reprint · Annotated Edition',
    year: '1786',
    tierIndex: 1,
    tierName: 'Shelf II · Historical Monographs',
    category: 'Herbal & Ethnobotany',
    color: '#c89d54',
    accentColor: '#d97706',
    binding: 'Tan Pigskin Leather · Hand-Lettered Labels',
    summary:
      'Comprehensive catalog of medicinal herb preparations, root extracts, and restorative tisanes cultivated in the Chelsea Physic Garden.',
    shelfSlotX: 0.12,
  },
  {
    id: 'hb-1-5',
    title: 'Lunar Phases & Perennial Cycles',
    author: 'Sophia Brahe',
    edition: 'Almanac Compendium · Astronomical Charts',
    year: '1692',
    tierIndex: 1,
    tierName: 'Shelf II · Historical Monographs',
    category: 'Nocturnal & Astronomy',
    color: '#4c3757',
    accentColor: '#e879f9',
    binding: 'Violet Cloth · Gilded Astral Circles',
    summary:
      'Observations tracking sap ascent, germination velocity, and nocturnal transpiration rhythms across 28-day synodic lunar cycles.',
    shelfSlotX: 0.36,
  },
  {
    id: 'hb-1-6',
    title: 'Alpine Wildflowers in Springtime',
    author: 'Henriette d’Angeville',
    edition: 'Annotated Field Guide · Mont Blanc Edition',
    year: '1842',
    tierIndex: 1,
    tierName: 'Shelf II · Historical Monographs',
    category: 'Botanical Taxonomy',
    color: '#7c2d23',
    accentColor: '#fbbf24',
    binding: 'Alpine Crimson Leather · Hand-Numbered',
    summary:
      'First-hand botanical notes compiled during high-altitude ascents, detailing saxifrages, gentians, and edelweiss blooming upon glacial moraines.',
    shelfSlotX: 0.62,
  },

  // Tier III (Shelf III - Pressed Herbarium)
  {
    id: 'hb-2-1',
    title: 'Mosses, Ferns & Shaded Woodland',
    author: 'Claire Linnea',
    edition: 'Pressed Herbarium Edition · Actual Botanical Mounts',
    year: '1984',
    tierIndex: 2,
    tierName: 'Shelf III · Pressed Herbarium',
    category: 'Botanical Taxonomy',
    color: '#355c52',
    accentColor: '#6ee7b7',
    binding: 'Forest Green Canvas · Archival Glassine Inserts',
    summary:
      'Dedicated field herbarium featuring authentic pressed fronds of maidenhair fern, sphagnum cushions, and clubmosses gathered from shaded gorges.',
    shelfSlotX: -0.62,
  },
  {
    id: 'hb-2-2',
    title: 'Orchids of the Cloud Forest',
    author: 'Marianne North',
    edition: 'Gilt Collector Issue · Chromolithograph Plates',
    year: '1882',
    tierIndex: 2,
    tierName: 'Shelf III · Pressed Herbarium',
    category: 'Botanical Taxonomy',
    color: '#9a4632',
    accentColor: '#fbbf24',
    binding: 'Deep Russet Leather · Gilt Orchid Blossom',
    summary:
      'Vibrant life-size illustrations of epiphytic orchids clinging to mossy cloud forest branches in the Andes and South-East Asian misty highlands.',
    shelfSlotX: -0.36,
  },
  {
    id: 'hb-2-3',
    title: 'Butterflies & Nectar Meadows',
    author: 'Maria Sibylla Merian',
    edition: 'Hand-Tinted Facsimile · Amsterdam Master Folio',
    year: '1705',
    tierIndex: 2,
    tierName: 'Shelf III · Pressed Herbarium',
    category: 'Ornithology & Ecology',
    color: '#c89d54',
    accentColor: '#f59e0b',
    binding: 'Ochre Calfskin · Engraved Lepidopteran Spine',
    summary:
      'Groundbreaking entomological studies linking caterpillar metamorphoses directly to specific host plants and seasonal flowering blooms.',
    shelfSlotX: -0.12,
  },
  {
    id: 'hb-2-4',
    title: 'Microscopic Anatomy of Bryophytes',
    author: 'Nathaniel Ward',
    edition: 'Royal Society Monograph · Wardian Case Studies',
    year: '1852',
    tierIndex: 2,
    tierName: 'Shelf III · Pressed Herbarium',
    category: 'Botanical Taxonomy',
    color: '#285443',
    accentColor: '#34d399',
    binding: 'Hunter Green Library Binding · Brass Clasp',
    summary:
      'The discovery of sealed glass Wardian terrariums and cellular leaf tissue preservation enabling exotic flora transport across open oceans.',
    shelfSlotX: 0.12,
  },
  {
    id: 'hb-2-5',
    title: 'Vascular Flora of Nordic Valleys',
    author: 'Elias Fries',
    edition: 'Uppsala Monograph · Herbarium Reference',
    year: '1846',
    tierIndex: 2,
    tierName: 'Shelf III · Pressed Herbarium',
    category: 'Botanical Taxonomy',
    color: '#26466d',
    accentColor: '#93c5fd',
    binding: 'Nordic Blue Buckram · Gold Stamped Title',
    summary:
      'Rigorous index classifying 940 flowering vascular species across Scandinavian peat bogs, granite ridges, and river estuaries.',
    shelfSlotX: 0.38,
  },
  {
    id: 'hb-2-6',
    title: 'Alpine Lichens & Rock Colonizers',
    author: 'Dr. Evelyn Vance',
    edition: 'High Altitude Survey · Specimen Folio',
    year: '1902',
    tierIndex: 2,
    tierName: 'Shelf III · Pressed Herbarium',
    category: 'Botanical Taxonomy',
    color: '#8f5e28',
    accentColor: '#fbbf24',
    binding: 'Raw Roughspun Linen · Granite Marbled Endpapers',
    summary:
      'Microscopic cross-sections and symbiotic crustose lichen mappings detailing how pioneer organisms break down bare rock into fertile garden humus.',
    shelfSlotX: 0.62,
  },

  // Tier IV (Top Shelf - Field Notes & Quarto)
  {
    id: 'hb-3-1',
    title: 'Reflections from a Quiet Sofa',
    author: 'Michel de Montaigne',
    edition: 'Leather Pocket Essays · Translated by Florio',
    year: '1603',
    tierIndex: 3,
    tierName: 'Shelf IV · Field Notes & Quarto',
    category: 'Philosophy & Essays',
    color: '#7c2d23',
    accentColor: '#fbbf24',
    binding: 'Supple Burgundy Goatskin · Hand-Sewn Ribbon',
    summary:
      'Intimate philosophical musings on solitude, friendship, botanical curiosity, and the art of peaceful afternoon study in a library chamber.',
    shelfSlotX: -0.62,
  },
  {
    id: 'hb-3-2',
    title: 'Field Sketches of Alpine Mosses',
    author: 'Claire Linnea',
    edition: 'Vellum Pocket Notebook · Hand-Colored Graphite',
    year: '1991',
    tierIndex: 3,
    tierName: 'Shelf IV · Field Notes & Quarto',
    category: 'Botanical Taxonomy',
    color: '#355c52',
    accentColor: '#34d399',
    binding: 'Bound Vellum · Elastic Closure Cord',
    summary:
      'Spontaneous pencil studies and gouache washes capturing cushion mosses in morning mountain mist along Swiss and Tyrolean walking trails.',
    shelfSlotX: -0.38,
  },
  {
    id: 'hb-3-3',
    title: 'Pruning & Espalier Techniques',
    author: 'André Le Nôtre',
    edition: 'Versailles Horticultural Archives · Diagram Book',
    year: '1685',
    tierIndex: 3,
    tierName: 'Shelf IV · Field Notes & Quarto',
    category: 'Glasshouse Architecture',
    color: '#285443',
    accentColor: '#f59e0b',
    binding: 'Dark Olive Morocco · Gold Tooling',
    summary:
      'Classical geometric fruit tree training, cordon branching, and masonry wall heat absorption for wintering conservatory orchards.',
    shelfSlotX: -0.12,
  },
  {
    id: 'hb-3-4',
    title: 'Nocturnal Moths of the Conservatory',
    author: 'Arthur Linnea',
    edition: 'Hand-Numbered Edition · Private Study Press',
    year: '1945',
    tierIndex: 3,
    tierName: 'Shelf IV · Field Notes & Quarto',
    category: 'Nocturnal & Astronomy',
    color: '#1f3a4d',
    accentColor: '#a78bfa',
    binding: 'Midnight Slate Cloth · Silver Gilt Moth Motif',
    summary:
      'Observations of spherical light traps, velvet wing scales, and ultrasonic navigation around greenhouse lantern glass panes.',
    shelfSlotX: 0.14,
  },
  {
    id: 'hb-3-5',
    title: 'Living Systems in Glass Enclosures',
    author: 'Joseph Paxton',
    edition: 'Royal Horticultural Papers · Expanded Quarto',
    year: '1861',
    tierIndex: 3,
    tierName: 'Shelf IV · Field Notes & Quarto',
    category: 'Glasshouse Architecture',
    color: '#26466d',
    accentColor: '#38bdf8',
    binding: 'Azure Linen Quarto · Blind Embossed Border',
    summary:
      'Foundational microclimatic thermodynamics, ventilation sash counterbalance systems, and humidity regulation inside large conservatory spaces.',
    shelfSlotX: 0.38,
  },
  {
    id: 'hb-3-6',
    title: 'Songbird Migration Across Mountain Passes',
    author: 'Arthur Linnea',
    edition: 'Observation Log · Field Records',
    year: '1904',
    tierIndex: 3,
    tierName: 'Shelf IV · Field Notes & Quarto',
    category: 'Ornithology & Ecology',
    color: '#4c3757',
    accentColor: '#fbbf24',
    binding: 'Plum Cloth Hardcover · Pocket Map Inserts',
    summary:
      'Forty seasons of spring arrivals, flight altitude barometer readings, and acoustic calls of nightingales and warblers navigating mountain breezes.',
    shelfSlotX: 0.62,
  },
];
