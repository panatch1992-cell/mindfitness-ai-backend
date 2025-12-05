/**
 * Comic Products Configuration
 *
 * Defines all available psychoeducation comics with pricing
 * Supports individual comics and bundles
 */

// Individual Comics
export const COMICS = [
  {
    id: 'comic-depression',
    name: 'ทำความรู้จักกับภาวะซึมเศร้า',
    nameEn: 'Understanding Depression',
    description: 'เรียนรู้เกี่ยวกับภาวะซึมเศร้า สัญญาณเตือน และวิธีรับมือ',
    price: 99,
    pages: 24,
    category: 'mental-health',
    thumbnail: '/images/comics/depression-thumb.jpg',
    previewPages: 3,
    order: 1,
    tags: ['depression', 'mental-health', 'beginner']
  },
  {
    id: 'comic-anxiety',
    name: 'เมื่อความวิตกกังวลมาเยือน',
    nameEn: 'When Anxiety Visits',
    description: 'ทำความเข้าใจความวิตกกังวลและเทคนิคการจัดการ',
    price: 99,
    pages: 22,
    category: 'mental-health',
    thumbnail: '/images/comics/anxiety-thumb.jpg',
    previewPages: 3,
    order: 2,
    tags: ['anxiety', 'mental-health', 'coping']
  },
  {
    id: 'comic-stress',
    name: 'Stress ไม่ใช่ศัตรู',
    nameEn: 'Stress Is Not The Enemy',
    description: 'เข้าใจกลไกความเครียดและการใช้ประโยชน์จากมัน',
    price: 99,
    pages: 20,
    category: 'wellness',
    thumbnail: '/images/comics/stress-thumb.jpg',
    previewPages: 3,
    order: 3,
    tags: ['stress', 'wellness', 'productivity']
  },
  {
    id: 'comic-sleep',
    name: 'นอนหลับอย่างมีคุณภาพ',
    nameEn: 'Quality Sleep Guide',
    description: 'เคล็ดลับการนอนหลับที่ดีและการแก้ปัญหานอนไม่หลับ',
    price: 99,
    pages: 18,
    category: 'wellness',
    thumbnail: '/images/comics/sleep-thumb.jpg',
    previewPages: 3,
    order: 4,
    tags: ['sleep', 'wellness', 'health']
  },
  {
    id: 'comic-relationship',
    name: 'ความสัมพันธ์ที่ดีต่อใจ',
    nameEn: 'Healthy Relationships',
    description: 'สร้างความสัมพันธ์ที่ดีกับคนรอบข้างและตัวเอง',
    price: 99,
    pages: 26,
    category: 'relationship',
    thumbnail: '/images/comics/relationship-thumb.jpg',
    previewPages: 3,
    order: 5,
    tags: ['relationship', 'communication', 'self-love']
  },
  {
    id: 'comic-burnout',
    name: 'หมดไฟในการทำงาน',
    nameEn: 'Burnout Recovery',
    description: 'รู้จัก Burnout และวิธีฟื้นฟูพลังใจในการทำงาน',
    price: 99,
    pages: 24,
    category: 'work-life',
    thumbnail: '/images/comics/burnout-thumb.jpg',
    previewPages: 3,
    order: 6,
    tags: ['burnout', 'work-life', 'recovery']
  }
];

// Comic Bundles
export const COMIC_BUNDLES = [
  {
    id: 'bundle-all',
    name: 'Comic ทั้งหมด 6 เล่ม',
    nameEn: 'Complete Collection (6 Comics)',
    description: 'รวม Psychoeducation Comic ทั้ง 6 เล่ม ในราคาพิเศษ',
    originalPrice: 594, // 99 x 6
    price: 399,
    discount: 33,
    comicIds: ['comic-depression', 'comic-anxiety', 'comic-stress', 'comic-sleep', 'comic-relationship', 'comic-burnout'],
    badge: 'ขายดี',
    order: 1
  },
  {
    id: 'bundle-mental-health',
    name: 'Mental Health Series',
    nameEn: 'Mental Health Series',
    description: 'รวม Comic เกี่ยวกับสุขภาพจิต 2 เล่ม',
    originalPrice: 198,
    price: 149,
    discount: 25,
    comicIds: ['comic-depression', 'comic-anxiety'],
    badge: null,
    order: 2
  },
  {
    id: 'bundle-wellness',
    name: 'Wellness Series',
    nameEn: 'Wellness Series',
    description: 'รวม Comic เกี่ยวกับ Wellness 2 เล่ม',
    originalPrice: 198,
    price: 149,
    discount: 25,
    comicIds: ['comic-stress', 'comic-sleep'],
    badge: null,
    order: 3
  }
];

// Product types
export const PRODUCT_TYPES = {
  COMIC: 'comic',
  BUNDLE: 'bundle',
  CONSULTATION: 'consultation'
};

/**
 * Get comic by ID
 */
export function getComic(comicId) {
  return COMICS.find(c => c.id === comicId) || null;
}

/**
 * Get bundle by ID
 */
export function getBundle(bundleId) {
  return COMIC_BUNDLES.find(b => b.id === bundleId) || null;
}

/**
 * Get all comics in a bundle
 */
export function getBundleComics(bundleId) {
  const bundle = getBundle(bundleId);
  if (!bundle) return [];
  return bundle.comicIds.map(id => getComic(id)).filter(Boolean);
}

/**
 * Get product price (comic or bundle)
 */
export function getProductPrice(productId) {
  const comic = getComic(productId);
  if (comic) return comic.price;

  const bundle = getBundle(productId);
  if (bundle) return bundle.price;

  return null;
}

/**
 * Get product info by ID
 */
export function getProduct(productId) {
  const comic = getComic(productId);
  if (comic) return { type: PRODUCT_TYPES.COMIC, ...comic };

  const bundle = getBundle(productId);
  if (bundle) return { type: PRODUCT_TYPES.BUNDLE, ...bundle };

  return null;
}

/**
 * List all products for catalog
 */
export function listProducts() {
  return {
    comics: COMICS.sort((a, b) => a.order - b.order),
    bundles: COMIC_BUNDLES.sort((a, b) => a.order - b.order)
  };
}

export default {
  COMICS,
  COMIC_BUNDLES,
  PRODUCT_TYPES,
  getComic,
  getBundle,
  getBundleComics,
  getProductPrice,
  getProduct,
  listProducts
};
