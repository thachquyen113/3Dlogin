import type {
  BookShelfSortMode,
  CameraVector3,
  CustomCameraFocus,
  FeaturedBookId,
} from '../types';

export interface FeaturedBookEntry {
  id: FeaturedBookId;
  title: string;
  shortLabel: string;
  author: string;
  publisher: string;
  category: string;
  tagline: string;
  summary: string;
  coverUrl: string;
  remoteCoverUrl: string;
  spineColor: string;
  backColor: string;
  accentColor: string;
  curatedRank: number;
  categoryRank: number;
  titleRank: number;
  colorRank: number;
  cameraPos: CameraVector3;
  targetPos: CameraVector3;
}

/**
 * World-space coordinates for the Featured Gallery Tier (Shelf III) on the
 * East Conservatory Case (position = [2.3, 0, -3.52], shelfY[2] = 1.34).
 */
export const FEATURED_BOOKCASE_WORLD_X = 2.3;
export const FEATURED_BOOKCASE_WORLD_Z = -3.52;
export const FEATURED_SHELF_LOCAL_SLOTS_X = [-0.57, -0.19, 0.19, 0.57] as const;
export const FEATURED_BOOK_CENTER_WORLD_Y = 1.545;

/**
 * Computes a close-up gallery camera framing for a featured book at a given
 * horizontal slot index (0..3) on the showcase bookshelf. Shifts lookAt slightly
 * right so the 3D book stands unobstructed on the left-center while the
 * transparent Book Inspector card opens on the right.
 */
export function computeFeaturedBookCameraFocus(slotIndex: number): CustomCameraFocus {
  const clampedSlot = Math.max(0, Math.min(3, slotIndex));
  const localX = FEATURED_SHELF_LOCAL_SLOTS_X[clampedSlot];
  const worldBookX = FEATURED_BOOKCASE_WORLD_X + localX;

  return {
    cameraPos: {
      x: Number((worldBookX + 0.12).toFixed(3)),
      y: 1.56,
      z: -2.26,
    },
    targetPos: {
      x: Number((worldBookX + 0.22).toFixed(3)),
      y: 1.535,
      z: -3.46,
    },
  };
}

export const booksData: Record<FeaturedBookId, FeaturedBookEntry> = {
  Book_PDCA: {
    id: 'Book_PDCA',
    title: '経営はPDCAそのものである。',
    shortLabel: '経営はPDCA',
    author: '監修 近藤 昇 · 著者 ブレインワークス',
    publisher: 'カナリアコミュニケーションズ',
    category: 'Management · Strategy',
    tagline: 'ビヨンド コロナ — 飛躍する企業の必要条件は何か？',
    summary:
      'Explores why disciplined Plan-Do-Check-Act cycles form the living heartbeat of resilient management, organizational agility, and sustainable enterprise growth.',
    coverUrl: '/assets/books/book-pdca.jpg',
    remoteCoverUrl: 'https://m.media-amazon.com/images/I/71u89cnymvL._SY522_.jpg',
    spineColor: '#165668',
    backColor: '#d92d27',
    accentColor: '#0284c7',
    curatedRank: 0,
    categoryRank: 2,
    titleRank: 1,
    colorRank: 0,
    ...computeFeaturedBookCameraFocus(0),
  },
  Book_Business: {
    id: 'Book_Business',
    title: '本は人類最高の知的発明である AI時代を生き抜く「知」の武器としての本',
    shortLabel: '本は知的発明',
    author: '近藤 昇 · 高橋 大夢 (ブレインワークス / ブレインナビオン)',
    publisher: 'ブレインワークス',
    category: 'Knowledge · Publishing',
    tagline: '本を書くということは、人を豊かにし、社会をつなぎ、未来を耕すことになる。',
    summary:
      'Examines the enduring power of books as humanity’s greatest intellectual invention and a vital compass for deep thinking and leadership in the age of AI.',
    coverUrl: '/assets/books/book-business.jpg',
    remoteCoverUrl: 'https://m.media-amazon.com/images/I/61o9pSQwhfL._SY522_.jpg',
    spineColor: '#1d8f86',
    backColor: '#17756e',
    accentColor: '#14b8a6',
    curatedRank: 1,
    categoryRank: 1,
    titleRank: 3,
    colorRank: 1,
    ...computeFeaturedBookCameraFocus(1),
  },
  Book_AI: {
    id: 'Book_AI',
    title: '人間がしたいこと×AIができること 中小企業が知るべき本当のAI',
    shortLabel: '人間×AI経営',
    author: '近藤 昇 (Noboru Kondo)',
    publisher: '幻冬舎 (Gentosha)',
    category: 'AI Strategy · Enterprise',
    tagline: '直感と経験だけの経営はもう限界 — AIの活用で会議・意思決定・社長が変わる',
    summary:
      'Bridges human aspiration with practical AI capability, showing small and medium enterprises how to transform meetings, decision-making, and executive leadership.',
    coverUrl: '/assets/books/book-ai.jpg',
    remoteCoverUrl: 'https://m.media-amazon.com/images/I/81F029z2+LL._SY522_.jpg',
    spineColor: '#3a4d68',
    backColor: '#2c3c53',
    accentColor: '#60a5fa',
    curatedRank: 2,
    categoryRank: 0,
    titleRank: 2,
    colorRank: 3,
    ...computeFeaturedBookCameraFocus(2),
  },
  Book_Education: {
    id: 'Book_Education',
    title: 'この子には障がいがあります',
    shortLabel: 'この子には障がいが',
    author: 'あきさと明美 (Akemi Akisato)',
    publisher: 'マザーブックス出版 · カナリアコミュニケーションズ',
    category: 'Education · Inclusion',
    tagline: '息子を救おうと思っていた。救われていたのは、私だった。',
    summary:
      'A heartfelt narrative on parenting, empathy, and community understanding—illuminating the story behind the support mark for children with disabilities.',
    coverUrl: '/assets/books/book-education.jpg',
    remoteCoverUrl: 'https://m.media-amazon.com/images/I/61QOkL0Yj+L._SY522_.jpg',
    spineColor: '#df5235',
    backColor: '#f6ad63',
    accentColor: '#f97316',
    curatedRank: 3,
    categoryRank: 3,
    titleRank: 0,
    colorRank: 2,
    ...computeFeaturedBookCameraFocus(3),
  },
};

export const FEATURED_BOOK_LIST: FeaturedBookEntry[] = [
  booksData.Book_PDCA,
  booksData.Book_Business,
  booksData.Book_AI,
  booksData.Book_Education,
];

export function getSortedFeaturedBooks(
  sortMode: BookShelfSortMode,
): FeaturedBookEntry[] {
  const copy = [...FEATURED_BOOK_LIST];
  switch (sortMode) {
    case 'category':
      return copy.sort((a, b) => a.categoryRank - b.categoryRank);
    case 'title':
      return copy.sort((a, b) => a.titleRank - b.titleRank);
    case 'color':
      return copy.sort((a, b) => a.colorRank - b.colorRank);
    case 'curated':
    default:
      return copy.sort((a, b) => a.curatedRank - b.curatedRank);
  }
}
