export interface SanctuaryArticleItem {
  id: string;
  title: string;
  shortLabel: string;
  author: string;
  category: string;
  group: 'botany' | 'strategy' | 'essays';
  publication: string;
  year: string;
  readTime: string;
  color: string;
  summary: string;
}

export const SANCTUARY_ARTICLES: SanctuaryArticleItem[] = [
  {
    id: 'art-biophilic-conservatory',
    title: 'Biophilic Architecture in Victorian & Modern Glass Conservatories',
    shortLabel: 'Biophilic Conservatories',
    author: 'Dr. Evelyn Vance',
    category: 'Glasshouse Architecture',
    group: 'botany',
    publication: 'Journal of Conservatory Studies',
    year: '2025',
    readTime: '6 min read',
    color: '#0f766e',
    summary:
      'Examines how curved iron-and-glass spans regulate solar warmth, passive humidity, and contemplative focus inside botanical study sanctuaries.',
  },
  {
    id: 'art-pdca-resilience',
    title: 'Applying Disciplined PDCA Cycles to Long-Term Stewardship & Teams',
    shortLabel: 'PDCA Stewardship',
    author: 'Noboru Kondo · Arthur Linnea',
    category: 'Management · Strategy',
    group: 'strategy',
    publication: 'Sanctuary Management Review',
    year: '2025',
    readTime: '8 min read',
    color: '#165668',
    summary:
      'Explores how continuous Plan-Do-Check-Act reflection strengthens organizational resilience, team clarity, and daily execution without burnout.',
  },
  {
    id: 'art-nocturnal-pollination',
    title: 'Nocturnal Pollination: How Starlight Guides Night-Blooming Flora',
    shortLabel: 'Nocturnal Pollination',
    author: 'Prof. Arthur Linnea',
    category: 'Botanical Ecology',
    group: 'botany',
    publication: 'Sylva Field Quarterly',
    year: '2024',
    readTime: '5 min read',
    color: '#1e3a5f',
    summary:
      'Field observations of evening jasmine, lunar moths, and pale lotus petals opening beneath clear night skies in the conservatory grove.',
  },
  {
    id: 'art-human-ai-craft',
    title: 'Human Aspiration & Practical AI: A Guide for Small & Medium Enterprises',
    shortLabel: 'Human Aspiration & AI',
    author: 'Noboru Kondo',
    category: 'AI Strategy · Enterprise',
    group: 'strategy',
    publication: 'Digital Craft & Leadership',
    year: '2025',
    readTime: '7 min read',
    color: '#3a4d68',
    summary:
      'Clarifies where human judgment, empathy, and purpose lead—while practical AI tools elevate meetings, forecasting, and everyday productivity.',
  },
  {
    id: 'art-slow-reading-ai',
    title: 'The Art of Deep Reading in an Era of Instant Information',
    shortLabel: 'Art of Deep Reading',
    author: 'Hiromu Takahashi · Noboru Kondo',
    category: 'Knowledge · Publishing',
    group: 'essays',
    publication: 'Sanctuary Essay Series',
    year: '2025',
    readTime: '6 min read',
    color: '#1d8f86',
    summary:
      'Reflects on why bound books remain humanity’s greatest intellectual tool for structured synthesis, critical thought, and lasting wisdom.',
  },
  {
    id: 'art-empathy-support-mark',
    title: 'Designing Compassionate Communities Through Everyday Awareness',
    shortLabel: 'Compassionate Communities',
    author: 'Akemi Akisato',
    category: 'Education · Inclusion',
    group: 'essays',
    publication: 'Civic Empathy Monograph',
    year: '2024',
    readTime: '5 min read',
    color: '#c2410c',
    summary:
      'Shares heartfelt perspectives on disability inclusion, parental resilience, and how small gestures of awareness reshape public spaces.',
  },
  {
    id: 'art-copperplate-preservation',
    title: 'Preserving 18th-Century Copperplate Botanical Folios & Pigments',
    shortLabel: 'Copperplate Preservation',
    author: 'Elena Vance',
    category: 'Archival Conservation',
    group: 'botany',
    publication: 'Curator Preservation Note',
    year: '2024',
    readTime: '4 min read',
    color: '#285443',
    summary:
      'Practical archival standards for controlling light exposure, linen rag hydration, and pigment stability in historic Flora Borealis plates.',
  },
  {
    id: 'art-barnaby-study-notes',
    title: 'Feline Companionship & Calm Attention in the Reading Study',
    shortLabel: 'Study Companionship',
    author: 'Prof. Arthur Linnea',
    category: 'Philosophy & Study',
    group: 'essays',
    publication: 'Sanctuary Reflections',
    year: '2025',
    readTime: '4 min read',
    color: '#9a3412',
    summary:
      'Short meditative notes on quiet focus, warm lamplight, and why Barnaby the orange tabby chooses the softest corner of the reading sofa.',
  },
];
