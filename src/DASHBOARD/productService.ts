import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredJwtToken } from '../auth-page/authService';
import { getBackendBaseUrl } from '../../api/universalbackendapi';

export interface NutritionMetrics {
  calories: number;
  carbs: number;
  sugars: number;
  fat: number;
  saturatedFat: number;
  protein: number;
  fiber: number;
  salt: number;
}

export interface FormulationProfile {
  activePct: number;
  emollientPct: number;
  stabilizerPct: number;
  isParabenFree: boolean;
  isSulfateFree: boolean;
  isSiliconeFree: boolean;
  isFragranceFree: boolean;
  highRiskCount: number;
  moderateRiskCount: number;
  activesCount: number;
  detectedRisks?: { name: string; category: string; risk: string }[];
  detectedActives?: { name: string; benefit: string }[];
}

export interface ScannedProduct {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  imageUrl?: string;
  productType?: 'food' | 'beauty' | 'general';
  nutriScore: 'A' | 'B' | 'C' | 'D' | 'E';
  novaGroup?: number;
  aiHealthRating: number;
  verdict: 'Excellent Choice' | 'Good Choice' | 'Moderate' | 'Avoid / Unhealthy' | 'Clean & Safe' | 'Good Formulation' | 'Moderate Concern' | 'Hazardous / Poor';
  verdictColor: string;
  metrics: NutritionMetrics;
  additives: string[];
  hasPalmOil: boolean;
  isUltraProcessed: boolean;
  ingredientsSummary?: string;
  insight?: string;
  formulationProfile?: FormulationProfile | null;
}

export interface PaginatedProducts {
  total: number;
  products: ScannedProduct[];
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  fromCache?: boolean;
}

const PROD_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const CAT_CACHE_TTL = 60 * 60 * 1000;
const SEARCH_CACHE_TTL = 30 * 60 * 1000;

const memoryProductCache = new Map<string, { data: ScannedProduct; timestamp: number }>();
const memoryCategoryCache = new Map<string, { data: PaginatedProducts; timestamp: number }>();
const memorySearchCache = new Map<string, { data: PaginatedProducts; timestamp: number }>();

const PROD_KEY_PREFIX = '@foodco_prod_v2_';
const CAT_KEY_PREFIX = '@foodco_cat_v2_';
const SEARCH_KEY_PREFIX = '@foodco_search_v2_';

const CATEGORY_LOCAL_DATA = require('./categoryProductsData.json');

export async function getCachedProduct(barcode: string): Promise<ScannedProduct | null> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  const memHit = memoryProductCache.get(cleanBarcode);
  if (memHit && Date.now() - memHit.timestamp < PROD_CACHE_TTL) {
    return memHit.data;
  }

  try {
    const raw = await AsyncStorage.getItem(`${PROD_KEY_PREFIX}${cleanBarcode}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && Date.now() - parsed.timestamp < PROD_CACHE_TTL) {
        memoryProductCache.set(cleanBarcode, parsed);
        return parsed.data;
      }
    }
  } catch (_) {}
  return null;
}

let memoryHistoryCache: ScannedProduct[] | null = null;

export function getMemoryHistory(): ScannedProduct[] | null {
  return memoryHistoryCache;
}

export function setMemoryHistory(items: ScannedProduct[]): void {
  memoryHistoryCache = items;
}

export function prependScanToMemoryHistory(product: ScannedProduct): void {
  if (!memoryHistoryCache) {
    memoryHistoryCache = [product];
  } else {
    const filtered = memoryHistoryCache.filter(p => p.barcode !== product.barcode);
    memoryHistoryCache = [product, ...filtered];
  }
}

export async function recordScanToHistory(product: ScannedProduct): Promise<void> {
  try {
    if (product) {
      prependScanToMemoryHistory(product);
    }
    const jwt = await getStoredJwtToken();
    if (!jwt || !product) return;

    fetch(`${getBackendBaseUrl()}/auth/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({ product }),
    }).catch(() => {});
  } catch (_) {}
}

// Cache-only — used when pre-caching browsed/category products (does NOT record to history)
export async function setCachedProduct(barcode: string, product: ScannedProduct): Promise<void> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode || !product) return;
  const entry = { data: product, timestamp: Date.now() };
  memoryProductCache.set(cleanBarcode, entry);
  try {
    await AsyncStorage.setItem(`${PROD_KEY_PREFIX}${cleanBarcode}`, JSON.stringify(entry));
  } catch (_) {}
  // NOTE: intentionally NOT recording to history here — only actual barcode scans should appear
}

// Cache + history — used ONLY when the user actually scans a barcode
export async function setCachedProductFromScan(barcode: string, product: ScannedProduct): Promise<void> {
  await setCachedProduct(barcode, product);
  recordScanToHistory(product).catch(() => {});
}

export async function getCachedCategoryPage(
  categoryKey: string,
  page: number = 1,
  search: string = ''
): Promise<PaginatedProducts | null> {
  const key = `${categoryKey.toLowerCase().trim()}_p${page}_q${search.toLowerCase().trim()}`;

  const memHit = memoryCategoryCache.get(key);
  if (memHit && Date.now() - memHit.timestamp < CAT_CACHE_TTL) {
    return { ...memHit.data, fromCache: true };
  }

  try {
    const raw = await AsyncStorage.getItem(`${CAT_KEY_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && Date.now() - parsed.timestamp < CAT_CACHE_TTL) {
        memoryCategoryCache.set(key, parsed);
        return { ...parsed.data, fromCache: true };
      }
    }
  } catch (_) {}
  return null;
}

export async function setCachedCategoryPage(
  categoryKey: string,
  page: number,
  search: string,
  data: PaginatedProducts
): Promise<void> {
  const key = `${categoryKey.toLowerCase().trim()}_p${page}_q${search.toLowerCase().trim()}`;
  const entry = { data, timestamp: Date.now() };
  memoryCategoryCache.set(key, entry);
  try {
    await AsyncStorage.setItem(`${CAT_KEY_PREFIX}${key}`, JSON.stringify(entry));
  } catch (_) {}
}

export async function getCachedSearchResults(
  query: string,
  page: number = 1
): Promise<PaginatedProducts | null> {
  const key = `${query.toLowerCase().trim()}_p${page}`;

  const memHit = memorySearchCache.get(key);
  if (memHit && Date.now() - memHit.timestamp < SEARCH_CACHE_TTL) {
    return { ...memHit.data, fromCache: true };
  }

  try {
    const raw = await AsyncStorage.getItem(`${SEARCH_KEY_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && Date.now() - parsed.timestamp < SEARCH_CACHE_TTL) {
        memorySearchCache.set(key, parsed);
        return { ...parsed.data, fromCache: true };
      }
    }
  } catch (_) {}
  return null;
}

export async function setCachedSearchResults(
  query: string,
  page: number,
  data: PaginatedProducts
): Promise<void> {
  const key = `${query.toLowerCase().trim()}_p${page}`;
  const entry = { data, timestamp: Date.now() };
  memorySearchCache.set(key, entry);
  try {
    await AsyncStorage.setItem(`${SEARCH_KEY_PREFIX}${key}`, JSON.stringify(entry));
  } catch (_) {}
}

const getBackendBase = () => getBackendBaseUrl();

export function isNonSupportedProduct(barcode: string, name?: string, category?: string): { isUnsupported: boolean; reason?: string } {
  const cleanBarcode = barcode.replace(/[^0-9]/g, '');
  // ISBN-13 book prefixes: 978 and 979
  if ((cleanBarcode.length === 13 || cleanBarcode.length === 10) && (cleanBarcode.startsWith('978') || cleanBarcode.startsWith('979'))) {
    return {
      isUnsupported: true,
      reason: 'This item appears to be a book (ISBN barcode). Foodco only supports food, beauty, perfume, chocolate, biscuit, and cold drink products.',
    };
  }

  const combined = `${name || ''} ${category || ''}`.toLowerCase();
  const nonSupportedRegex = /\b(book|books|novel|textbook|author|isbn|hardcover|paperback|magazine|comic|comics|stationery|notebook|pen|pencil|electronics|charger|cable|battery|phone|headphone|earphone|laptop|clothing|shirt|pants|dress|shoes|toy|toys|game|board game|furniture|hardware|tool|tools)\b/i;
  if (nonSupportedRegex.test(combined)) {
    return {
      isUnsupported: true,
      reason: 'This item is not supported. Foodco only supports food, beauty, perfume, chocolate, biscuit, and cold drink products.',
    };
  }

  return { isUnsupported: false };
}

export function isAllowedCategory(category: string, name: string, productType?: string): boolean {
  if (productType === 'beauty') return true;
  const combined = `${category || ''} ${name || ''}`.toLowerCase();
  const allowedRegex = /\b(food|grocery|groceries|snack|snacks|atta|flour|rice|dal|lentil|masala|spice|spices|curry|sauce|ketchup|pickle|chutney|oil|ghee|butter|paneer|cheese|milk|dairy|dairies|pasta|noodles|cereal|oats|muesli|bread|roti|biscuit|biscuits|cookie|cookies|wafer|wafers|cracker|crackers|rusk|toast|bourbon|chocolate|chocolates|choco|cacao|cocoa|candies|candy|sweets|drink|drinks|soda|sodas|cola|juice|juices|beverage|beverages|cold drink|water|tea|coffee|energy drink|lassi|beauty|cosmetic|cosmetics|skincare|skin care|haircare|hair care|shampoo|conditioner|soap|body wash|face wash|cleanser|moisturizer|lotion|cream|serum|sunscreen|spf|makeup|lipstick|lip balm|perfume|fragrance|deodorant|deo|eau de parfum|eau de toilette)\b/i;
  return allowedRegex.test(combined);
}

export function isBeautyCategory(category: string, name: string): boolean {
  const combined = `${category || ''} ${name || ''}`.toLowerCase();
  if (/\b(biscuit|biscuits|cookie|cookies|cracker|chocolate|chocolates|choco|wafer|snack|chips|noodles|rice|atta|flour|dal|paneer|butter|ghee|cheese|ice cream|tea|coffee|juice|soda|drink|cola)\b/i.test(combined)) {
    return false;
  }
  return /\b(beauty|cosmetic|cosmetics|skincare|skin care|haircare|hair care|shampoo|conditioner|soap|body wash|face wash|cleanser|moisturizer|lotion|face cream|eye cream|night cream|day cream|hand cream|serum|sunscreen|sunblock|spf|makeup|lipstick|lip balm|mascara|eyeliner|foundation|deodorant|perfume|fragrance|eau de parfum|eau de toilette|nail polish|hair oil|shaving|aftershave|toothpaste|mouthwash|hygiene|personal care)\b/i.test(combined);
}

const CURATED_PRODUCTS: Record<string, Partial<ScannedProduct>> = {
  '0051111407592': {
    name: 'Birthday Cake Protein Oats',
    brand: 'Freaking Protein Oats',
    category: 'Protein bars & Oats',
    imageUrl: 'https://images.openfoodfacts.org/images/products/005/111/140/7592/front_en.10.400.jpg',
    productType: 'food',
    nutriScore: 'B',
    novaGroup: 4,
    aiHealthRating: 83,
    verdict: 'Excellent Choice',
    verdictColor: '#10B981',
    metrics: {
      calories: 364,
      carbs: 51.9,
      sugars: 7.8,
      fat: 7.8,
      saturatedFat: 1.9,
      protein: 28.6,
      fiber: 26.0,
      salt: 0.65,
    },
    additives: [],
    hasPalmOil: false,
    isUltraProcessed: true,
    ingredientsSummary: 'Whole grain rolled oats, plant protein blend (pea protein, fava bean protein isolate, brown rice protein concentrate), cake flavoring powder, dates, monk fruit extract, chia seeds, flax seeds.',
  },
  '051111407592': {
    name: 'Birthday Cake Protein Oats',
    brand: 'Freaking Protein Oats',
    category: 'Protein bars & Oats',
    imageUrl: 'https://images.openfoodfacts.org/images/products/005/111/140/7592/front_en.10.400.jpg',
    productType: 'food',
    nutriScore: 'B',
    novaGroup: 4,
    aiHealthRating: 83,
    verdict: 'Excellent Choice',
    verdictColor: '#10B981',
    metrics: {
      calories: 364,
      carbs: 51.9,
      sugars: 7.8,
      fat: 7.8,
      saturatedFat: 1.9,
      protein: 28.6,
      fiber: 26.0,
      salt: 0.65,
    },
    additives: [],
    hasPalmOil: false,
    isUltraProcessed: true,
    ingredientsSummary: 'Whole grain rolled oats, plant protein blend (pea protein, fava bean protein isolate, brown rice protein concentrate), cake flavoring powder, dates, monk fruit extract, chia seeds, flax seeds.',
  },
  '3017620422003': {
    name: 'Nutella Hazelnut Spread',
    brand: 'Ferrero',
    category: 'Spreads & Sweets',
    imageUrl: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg',
    productType: 'food',
    nutriScore: 'E',
    novaGroup: 4,
    aiHealthRating: 24,
    verdict: 'Avoid / Unhealthy',
    verdictColor: '#EF4444',
    metrics: {
      calories: 539,
      carbs: 57.5,
      sugars: 56.3,
      fat: 30.9,
      saturatedFat: 10.6,
      protein: 6.3,
      fiber: 3.0,
      salt: 0.1,
    },
    additives: ['E322 (Lecithin)', 'Vanillin'],
    hasPalmOil: true,
    isUltraProcessed: true,
    ingredientsSummary: 'Sugar, Palm Oil, Hazelnuts (13%), Skimmed Milk Powder (8.7%), Fat-Reduced Cocoa (7.4%), Emulsifier: Lecithins (Soya), Vanillin.',
  },
  '5449000000996': {
    name: 'Coca-Cola Original Taste',
    brand: 'The Coca-Cola Company',
    category: 'Cold Drinks & Sodas',
    imageUrl: 'https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.1129.400.jpg',
    productType: 'food',
    nutriScore: 'E',
    novaGroup: 4,
    aiHealthRating: 18,
    verdict: 'Avoid / Unhealthy',
    verdictColor: '#EF4444',
    metrics: {
      calories: 42,
      carbs: 10.6,
      sugars: 10.6,
      fat: 0,
      saturatedFat: 0,
      protein: 0,
      fiber: 0,
      salt: 0.02,
    },
    additives: ['E150d (Caramel IV)', 'E338 (Phosphoric Acid)', 'Caffeine'],
    hasPalmOil: false,
    isUltraProcessed: true,
    ingredientsSummary: 'Carbonated Water, Sugar, Caramel Colour (E150d), Acidity Regulator (E338), Natural Flavourings including Caffeine.',
  },
  '7622210449283': {
    name: 'Oreo Original Sandwich Cookies',
    brand: 'Mondelez',
    category: 'Biscuits & Cookies',
    imageUrl: 'https://images.openfoodfacts.org/images/products/762/221/044/9283/front_en.605.400.jpg',
    productType: 'food',
    nutriScore: 'D',
    novaGroup: 4,
    aiHealthRating: 32,
    verdict: 'Moderate',
    verdictColor: '#F59E0B',
    metrics: {
      calories: 474,
      carbs: 68.0,
      sugars: 38.0,
      fat: 19.0,
      saturatedFat: 5.2,
      protein: 5.4,
      fiber: 2.7,
      salt: 0.74,
    },
    additives: ['E500 (Sodium Carbonate)', 'E503 (Ammonium Carbonate)', 'E322 (Soya Lecithin)'],
    hasPalmOil: true,
    isUltraProcessed: true,
    ingredientsSummary: 'Wheat Flour, Sugar, Palm Oil, Rapeseed Oil, Fat-Reduced Cocoa Powder, Wheat Starch, Glucose-Fructose Syrup, Raising Agents, Salt, Emulsifiers.',
  },
  '8901491101838': {
    name: "Lay's Classic Salted Potato Chips",
    brand: 'PepsiCo',
    category: 'Snacks & Chips',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/149/110/1838/front_en.11.400.jpg',
    productType: 'food',
    nutriScore: 'C',
    novaGroup: 3,
    aiHealthRating: 46,
    verdict: 'Moderate',
    verdictColor: '#F59E0B',
    metrics: {
      calories: 544,
      carbs: 52.4,
      sugars: 1.2,
      fat: 34.8,
      saturatedFat: 14.1,
      protein: 6.9,
      fiber: 4.1,
      salt: 1.2,
    },
    additives: ['Iodised Salt', 'Edible Vegetable Oil'],
    hasPalmOil: true,
    isUltraProcessed: false,
    ingredientsSummary: 'Potatoes, Edible Vegetable Oil (Palmolein), Iodised Salt (1.5%).',
  },
  '8901030383701': {
    name: 'Maggi 2-Minute Masala Noodles',
    brand: 'Nestle',
    category: 'Instant Noodles & Pasta',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/105/885/1328/front_en.17.400.jpg',
    productType: 'food',
    nutriScore: 'D',
    novaGroup: 4,
    aiHealthRating: 38,
    verdict: 'Moderate',
    verdictColor: '#F59E0B',
    metrics: {
      calories: 427,
      carbs: 63.5,
      sugars: 2.2,
      fat: 15.7,
      saturatedFat: 6.8,
      protein: 8.0,
      fiber: 3.6,
      salt: 2.1,
    },
    additives: ['E635 (Flavor Enhancer)', 'E500 (Acidity Regulator)', 'E451 (Stabilizer)'],
    hasPalmOil: true,
    isUltraProcessed: true,
    ingredientsSummary: 'Refined Wheat Flour (Maida), Palm Oil, Iodised Salt, Wheat Gluten, Mineral (Calcium Carbonate), Thickeners (508 & 412), Acidity Regulators.',
  },
  '5000159461122': {
    name: 'Snickers Milk Chocolate Bar',
    brand: 'Mars',
    category: 'Chocolates & Confectionery',
    imageUrl: 'https://images.openfoodfacts.org/images/products/500/015/946/1122/front_en.116.400.jpg',
    productType: 'food',
    nutriScore: 'E',
    novaGroup: 4,
    aiHealthRating: 22,
    verdict: 'Avoid / Unhealthy',
    verdictColor: '#EF4444',
    metrics: {
      calories: 483,
      carbs: 60.5,
      sugars: 51.8,
      fat: 22.8,
      saturatedFat: 7.9,
      protein: 8.6,
      fiber: 2.3,
      salt: 0.63,
    },
    additives: ['E322 (Soya Lecithin)', 'Egg White Powder'],
    hasPalmOil: true,
    isUltraProcessed: true,
    ingredientsSummary: 'Sugar, Peanuts, Glucose Syrup, Skimmed Milk Powder, Cocoa Butter, Cocoa Mass, Sunflower Oil, Palm Fat, Lactose, Whey Powder, Milk Fat, Soya Lecithin, Salt.',
  },
  '8901725181222': {
    name: 'Amul Pure Butter',
    brand: 'Amul',
    category: 'Dairy & Butter',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/172/518/1222/front_en.6.400.jpg',
    productType: 'food',
    nutriScore: 'E',
    novaGroup: 2,
    aiHealthRating: 52,
    verdict: 'Moderate',
    verdictColor: '#F59E0B',
    metrics: {
      calories: 720,
      carbs: 0.0,
      sugars: 0.0,
      fat: 80.0,
      saturatedFat: 51.0,
      protein: 0.5,
      fiber: 0.0,
      salt: 2.5,
    },
    additives: ['Common Salt', 'Natural Annatto Colour'],
    hasPalmOil: false,
    isUltraProcessed: false,
    ingredientsSummary: 'Butter (Milk Fat 80%), Common Salt, Permitted Natural Colour (Annatto).',
  },
  '3033490004523': {
    name: 'Activia Probiotic Natural Yogurt',
    brand: 'Danone',
    category: 'Yogurt & Fermented Dairy',
    imageUrl: 'https://images.openfoodfacts.org/images/products/303/349/000/4523/front_en.24.400.jpg',
    productType: 'food',
    nutriScore: 'B',
    novaGroup: 1,
    aiHealthRating: 86,
    verdict: 'Excellent Choice',
    verdictColor: '#10B981',
    metrics: {
      calories: 63,
      carbs: 4.8,
      sugars: 4.8,
      fat: 3.5,
      saturatedFat: 2.2,
      protein: 3.9,
      fiber: 0.0,
      salt: 0.15,
    },
    additives: [],
    hasPalmOil: false,
    isUltraProcessed: false,
    ingredientsSummary: 'Whole Milk, Skimmed Milk Concentrate, Live Bifidus ActiRegularis cultures.',
  },

  '4005808811120': {
    name: 'Nivea Soft Light Moisturising Cream',
    brand: 'Nivea',
    category: 'Skincare & Moisturizer',
    imageUrl: 'https://images.openbeautyfacts.org/images/products/400/580/881/1120/front_en.18.400.jpg',
    productType: 'beauty',
    nutriScore: 'B',
    novaGroup: 2,
    aiHealthRating: 82,
    verdict: 'Good Formulation',
    verdictColor: '#58B84F',
    metrics: { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
    additives: ['Jojoba Seed Oil', 'Vitamin E (Tocopheryl Acetate)', 'Glycerin'],
    hasPalmOil: false,
    isUltraProcessed: false,
    insight: 'Hydrating formula enriched with Jojoba Seed Oil & Vitamin E. Non-greasy and gentle on skin.',
    ingredientsSummary: 'Aqua, Glycerin, Paraffinum Liquidum, Myristyl Alcohol, Butylene Glycol, Alcohol Denat., Stearic Acid, Myristyl Myristate, Cera Microcristallina, Glyceryl Stearate, Hydrogenated Coco-Glycerides, Simmondsia Chinensis Seed Oil, Tocopheryl Acetate, Lanolin Alcohol (Eucerit®), Polyglyceryl-2 Caprate, Dimethicone, Sodium Carbomer, Phenoxyethanol, Linalool, Citronellol, Alpha-Isomethyl Ionone, Benzyl Alcohol, Limonene, Benzyl Salicylate, Parfum.',
    formulationProfile: {
      activePct: 62,
      emollientPct: 24,
      stabilizerPct: 14,
      isParabenFree: true,
      isSulfateFree: true,
      isSiliconeFree: false,
      isFragranceFree: false,
      highRiskCount: 0,
      moderateRiskCount: 2,
      activesCount: 3,
      detectedActives: [
        { name: 'Jojoba Seed Oil', benefit: 'Sebum-Balancing Botanical Oil' },
        { name: 'Vitamin E', benefit: 'Antioxidant Barrier Protection' },
        { name: 'Glycerin', benefit: 'Biomimetic Humectant' },
      ],
      detectedRisks: [
        { name: 'Dimethicone', category: 'Silicone', risk: 'Synthetic Occlusive Silicone' },
        { name: 'Parfum', category: 'Fragrance', risk: 'Sensitizing Aroma Blend' },
      ],
    },
  },
  '8901030704681': {
    name: 'Dove Deeply Nourishing Body Wash',
    brand: 'Dove',
    category: 'Body Care & Shower',
    imageUrl: 'https://images.openbeautyfacts.org/images/products/890/103/070/4681/front_en.10.400.jpg',
    productType: 'beauty',
    nutriScore: 'B',
    novaGroup: 2,
    aiHealthRating: 78,
    verdict: 'Good Formulation',
    verdictColor: '#58B84F',
    metrics: { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
    additives: ['NutriumMoisture', 'Plant-based Moisturizers'],
    hasPalmOil: false,
    isUltraProcessed: false,
    insight: 'Mild, microbiome-gentle body cleanser with 100% gentle plant cleansers and sulfate-safe formulation.',
    ingredientsSummary: 'Water (Aqua), Cocamidopropyl Betaine, Sodium Hydroxypropyl Starch Phosphate, Lauric Acid, Sodium Lauroyl Glycinate, Sodium Lauroyl Isethionate, Hydrogenated Soybean Oil, Glycine Soja (Soybean) Oil, Sodium Chloride, Glycerin, Fragrance (Parfum), Phenoxyethanol, Guar Hydroxypropyltrimonium Chloride, Stearic Acid, Citric Acid, BHT, Tetrasodium EDTA.',
    formulationProfile: {
      activePct: 58,
      emollientPct: 26,
      stabilizerPct: 16,
      isParabenFree: true,
      isSulfateFree: true,
      isSiliconeFree: true,
      isFragranceFree: false,
      highRiskCount: 1,
      moderateRiskCount: 1,
      activesCount: 2,
      detectedActives: [
        { name: 'Glycerin', benefit: 'Biomimetic Humectant' },
        { name: 'Soybean Oil', benefit: 'Natural Barrier Nourishing Lipid' },
      ],
      detectedRisks: [
        { name: 'BHT', category: 'Antioxidant', risk: 'Potential Endocrine Disruptor' },
        { name: 'Fragrance (Parfum)', category: 'Fragrance', risk: 'Sensitizing Aroma Blend' },
      ],
    },
  },
  '8901138834419': {
    name: 'Himalaya Purifying Neem Face Wash',
    brand: 'Himalaya Herbals',
    category: 'Face Care & Cleanser',
    imageUrl: 'https://images.openbeautyfacts.org/images/products/890/113/883/4419/front_en.9.400.jpg',
    productType: 'beauty',
    nutriScore: 'A',
    novaGroup: 1,
    aiHealthRating: 88,
    verdict: 'Clean & Safe',
    verdictColor: '#10B981',
    metrics: { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
    additives: ['Neem Leaf Extract', 'Turmeric Rhizome Extract'],
    hasPalmOil: false,
    isUltraProcessed: false,
    insight: 'Herbal soap-free facial wash with antibacterial Neem and anti-inflammatory Turmeric. Clears impurities without over-drying.',
    ingredientsSummary: 'Aqua, Ammonium Lauryl Sulfate, Melia Azadirachta Leaf Extract (Neem), Curcuma Longa Rhizome Extract (Turmeric), Stearic Acid, Glycerin, Sodium Hydroxide, Parfum, Phenoxyethanol, Methylchloroisothiazolinone, Methylisothiazolinone.',
    formulationProfile: {
      activePct: 70,
      emollientPct: 18,
      stabilizerPct: 12,
      isParabenFree: true,
      isSulfateFree: false,
      isSiliconeFree: true,
      isFragranceFree: false,
      highRiskCount: 0,
      moderateRiskCount: 2,
      activesCount: 3,
      detectedActives: [
        { name: 'Neem Leaf Extract', benefit: 'Natural Antibacterial & Blemish Defense' },
        { name: 'Turmeric Extract', benefit: 'Antioxidant & Soothing Glow' },
        { name: 'Glycerin', benefit: 'Gentle Humectant Moisture Lock' },
      ],
      detectedRisks: [
        { name: 'Ammonium Lauryl Sulfate', category: 'Surfactant', risk: 'Stripping Surfactant' },
        { name: 'Parfum', category: 'Fragrance', risk: 'Sensitizing Aroma Blend' },
      ],
    },
  },
  '070501110003': {
    name: 'Neutrogena Hydro Boost Water Gel',
    brand: 'Neutrogena',
    category: 'Skincare & Gel Hydrator',
    imageUrl: 'https://images.openbeautyfacts.org/images/products/070/501/110/003/front_en.12.400.jpg',
    productType: 'beauty',
    nutriScore: 'A',
    novaGroup: 1,
    aiHealthRating: 92,
    verdict: 'Clean & Safe',
    verdictColor: '#10B981',
    metrics: { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
    additives: ['Hyaluronic Acid', 'Glycerin', 'Trehalose'],
    hasPalmOil: false,
    isUltraProcessed: false,
    insight: 'Oil-free, non-comedogenic hyaluronic acid gel. Provides 72-hour moisture lock and strengthens skin barrier.',
    ingredientsSummary: 'Water, Dimethicone, Glycerin, Dimethicone/Vinyl Dimethicone Crosspolymer, Phenoxyethanol, Polyacrylamide, Cetearyl Olivate, Sorbitan Olivate, Dimethiconol, C13-14 Isoparaffin, Fragrance, Dimethicone Crosspolymer, Carbomer, Laureth-7, Sodium Hyaluronate, Ethylhexylglycerin, Sodium Hydroxide, Blue 1.',
    formulationProfile: {
      activePct: 75,
      emollientPct: 15,
      stabilizerPct: 10,
      isParabenFree: true,
      isSulfateFree: true,
      isSiliconeFree: false,
      isFragranceFree: false,
      highRiskCount: 0,
      moderateRiskCount: 1,
      activesCount: 2,
      detectedActives: [
        { name: 'Sodium Hyaluronate', benefit: 'Deep Penetrative Hydration Plump' },
        { name: 'Glycerin', benefit: 'Essential Skin Barrier Humectant' },
      ],
      detectedRisks: [
        { name: 'Dimethicone', category: 'Silicone', risk: 'Synthetic Occlusive' },
      ],
    },
  },
};

// ─── Nutri-Score 2023 negative-point tables ─────────────────────────────────

function _nutriNegEnergy(kcal: number, isBev: boolean): number {
  if (isBev) {
    if (kcal <= 0) return 0; if (kcal <= 30) return 1; if (kcal <= 60) return 2;
    if (kcal <= 90) return 3; if (kcal <= 120) return 4; if (kcal <= 150) return 5;
    if (kcal <= 180) return 6; if (kcal <= 210) return 7; if (kcal <= 240) return 8;
    if (kcal <= 270) return 9; return 10;
  }
  if (kcal <= 335) return 0; if (kcal <= 670) return 1; if (kcal <= 1005) return 2;
  if (kcal <= 1340) return 3; if (kcal <= 1675) return 4; if (kcal <= 2010) return 5;
  if (kcal <= 2345) return 6; if (kcal <= 2680) return 7; if (kcal <= 3015) return 8;
  if (kcal <= 3350) return 9; return 10;
}

function _nutriNegSugars(g: number, isBev: boolean): number {
  if (isBev) {
    if (g <= 0) return 0; if (g <= 1.5) return 1; if (g <= 3) return 2;
    if (g <= 4.5) return 3; if (g <= 6) return 4; if (g <= 7.5) return 5;
    if (g <= 9) return 6; if (g <= 10.5) return 7; if (g <= 12) return 8;
    if (g <= 13.5) return 9; return 10;
  }
  if (g <= 4.5) return 0; if (g <= 9) return 1; if (g <= 13.5) return 2;
  if (g <= 18) return 3; if (g <= 22.5) return 4; if (g <= 27) return 5;
  if (g <= 31) return 6; if (g <= 36) return 7; if (g <= 40) return 8;
  if (g <= 45) return 9; return 10;
}

function _nutriNegSatFat(g: number): number {
  if (g <= 1) return 0; if (g <= 2) return 1; if (g <= 3) return 2;
  if (g <= 4) return 3; if (g <= 5) return 4; if (g <= 6) return 5;
  if (g <= 7) return 6; if (g <= 8) return 7; if (g <= 9) return 8;
  if (g <= 10) return 9; return 10;
}

function _nutriNegSodium(mgSodium: number): number {
  const s = mgSodium;
  if (s <= 90) return 0; if (s <= 180) return 1; if (s <= 270) return 2;
  if (s <= 360) return 3; if (s <= 450) return 4; if (s <= 540) return 5;
  if (s <= 630) return 6; if (s <= 720) return 7; if (s <= 810) return 8;
  if (s <= 900) return 9; return 10;
}

function _nutriPosFiber(g: number): number {
  if (g <= 0.9) return 0; if (g <= 1.9) return 1; if (g <= 2.8) return 2;
  if (g <= 3.7) return 3; if (g <= 4.7) return 4; return 5;
}

function _nutriPosProtein(g: number): number {
  if (g <= 1.6) return 0; if (g <= 3.2) return 1; if (g <= 4.8) return 2;
  if (g <= 6.4) return 3; if (g <= 8.0) return 4; return 5;
}

function _nutriGradeFood(pts: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (pts <= -1) return 'A';
  if (pts <= 2)  return 'B';
  if (pts <= 10) return 'C';
  if (pts <= 18) return 'D';
  return 'E';
}

function _nutriGradeBev(pts: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (pts <= 1)  return 'A';
  if (pts <= 5)  return 'B';
  if (pts <= 9)  return 'C';
  if (pts <= 12) return 'D';
  return 'E';
}

// ─── Public types ──────────────────────────────────────────────────────────

export interface NutrientInput {
  calories: number | null;
  sugars: number | null;
  saturatedFat: number | null;
  salt: number | null;
  fiber: number | null;
  protein: number | null;
  isBeverage?: boolean;
  isSugaryDrink?: boolean;
  isJuice?: boolean;
  is100PctJuice?: boolean;
}

export interface HealthRatingResult {
  score: number;
  nutriScoreGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  verdict: ScannedProduct['verdict'];
  color: string;
  insufficientData: boolean;
}

// ─── Main exported scorer — used by tests and OFQ path ────────────────────

export function computeHealthRating(
  nutrients: NutrientInput,
  novaGroup: number = 3,
  hasPalmOil: boolean = false,
  additives: string[] = []
): HealthRatingResult {
  const { calories, sugars, saturatedFat, salt, fiber, protein,
          isBeverage, isSugaryDrink, isJuice, is100PctJuice } = nutrients;

  const keysMissing = calories === null || sugars === null || saturatedFat === null;
  if (keysMissing) {
    return { score: 0, nutriScoreGrade: 'E', verdict: 'Avoid / Unhealthy', color: '#EF4444', insufficientData: true };
  }

  const cal    = calories as number;
  const sug    = sugars as number;
  const sf     = saturatedFat as number;
  const saltG  = salt ?? 0;
  const fib    = fiber ?? 0;
  const prot   = protein ?? 0;
  const sodMg  = saltG * 400;
  const isBev  = isBeverage ?? false;

  const negTotal = _nutriNegEnergy(cal, isBev) + _nutriNegSugars(sug, isBev)
                 + _nutriNegSatFat(sf) + _nutriNegSodium(sodMg);
  const pFib   = _nutriPosFiber(fib);
  const pProt  = _nutriPosProtein(prot);
  const posTotal = pFib + pProt;

  const nutriPts = negTotal >= 11 ? negTotal - pFib : negTotal - posTotal;
  const grade = isBev ? _nutriGradeBev(nutriPts) : _nutriGradeFood(nutriPts);

  let base: number;
  switch (grade) {
    case 'A': base = 88; break;
    case 'B': base = 72; break;
    case 'C': base = 52; break;
    case 'D': base = 35; break;
    default:  base = 18; break;
  }

  if (novaGroup === 1) base += 8;
  else if (novaGroup === 2) base += 3;
  else if (novaGroup === 4) base -= 10;

  if (hasPalmOil) base -= 6;

  const HIGH_RISK = /E1[0-9]{2}[a-z]?|E2[0-9]{2}|E6[23][0-9]|E9[0-9]{2}|E950|E951|E952|E954|E955|E961/i;
  const highRiskCount = additives.filter(a => HIGH_RISK.test(a)).length;
  base -= Math.min(highRiskCount * 4, 12);

  // Hard caps
  if (novaGroup === 4) base = Math.min(base, 60);
  if (grade === 'D')   base = Math.min(base, 45);
  if (grade === 'E')   base = Math.min(base, 30);
  if (isBev && isSugaryDrink && sug >= 5) base = Math.min(base, 35);
  if (isJuice) base = Math.min(base, is100PctJuice ? 65 : 50);

  const score = Math.max(8, Math.min(98, Math.round(base)));

  let verdict: ScannedProduct['verdict'];
  let color: string;
  if (score >= 80)      { verdict = 'Excellent Choice'; color = '#10B981'; }
  else if (score >= 60) { verdict = 'Good Choice';      color = '#58B84F'; }
  else if (score >= 40) { verdict = 'Moderate';         color = '#F59E0B'; }
  else                  { verdict = 'Avoid / Unhealthy'; color = '#EF4444'; }

  return { score, nutriScoreGrade: grade, verdict, color, insufficientData: false };
}

// ─── Internal helper used by the OFQ/OBF fallback path ────────────────────

function calculateAiHealthScore(
  _nutriScore: 'A' | 'B' | 'C' | 'D' | 'E',
  novaGroup: number = 3,
  sugars: number | null = null,
  saturatedFat: number | null = null,
  hasPalmOil: boolean = false,
  _additivesCount: number = 0,
  calories: number | null = null,
  salt: number | null = null,
  fiber: number | null = null,
  protein: number | null = null,
  isBeverage: boolean = false,
  isSugaryDrink: boolean = false,
  isJuice: boolean = false,
  is100PctJuice: boolean = false,
  additivesList: string[] = []
): { score: number; verdict: ScannedProduct['verdict']; color: string } {
  const r = computeHealthRating(
    { calories, sugars, saturatedFat, salt, fiber, protein,
      isBeverage, isSugaryDrink, isJuice, is100PctJuice },
    novaGroup, hasPalmOil, additivesList
  );
  return { score: r.score, verdict: r.verdict, color: r.color };
}

export function parseBeautyIngredients(rawIngredients: string) {
  const hasParabens = /methylparaben|propylparaben|butylparaben|ethylparaben/i.test(rawIngredients);
  const hasSulfates = /sodium\s*lauryl\s*sulfate|sodium\s*laureth\s*sulfate|\bsls\b|\bsles\b/i.test(rawIngredients);
  const hasSilicones = /cyclopentasiloxane|dimethicone/i.test(rawIngredients);
  const hasFragrance = /fragrance|parfum|perfume/i.test(rawIngredients);

  const detectedActives = [];
  if (/hyaluronic|sodium\s*hyaluronate/i.test(rawIngredients)) {
    detectedActives.push({ name: 'Hyaluronic Acid', benefit: 'Deep Penetrative Hydration Plumping' });
  }
  if (/niacinamide/i.test(rawIngredients)) {
    detectedActives.push({ name: 'Niacinamide', benefit: 'Lipid Barrier Protection & Pore Defense' });
  }
  if (/ceramide/i.test(rawIngredients)) {
    detectedActives.push({ name: 'Ceramides', benefit: 'Skin Barrier Restoration' });
  }
  if (/glycerin/i.test(rawIngredients)) {
    detectedActives.push({ name: 'Plant Glycerin', benefit: 'Natural Biomimetic Humectant' });
  }
  if (/aloe/i.test(rawIngredients)) {
    detectedActives.push({ name: 'Aloe Vera', benefit: 'Skin Soothing & Deep Calm' });
  }

  const detectedRisks = [];
  if (hasParabens) {
    detectedRisks.push({ name: 'Parabens', category: 'Preservative', risk: 'Endocrine Disruptor Concern' });
  }
  if (hasSulfates) {
    detectedRisks.push({ name: 'Sulfates (SLS/SLES)', category: 'Surfactant', risk: 'Harsh Cleanser & Barrier Stripper' });
  }
  if (hasFragrance) {
    detectedRisks.push({ name: 'Synthetic Parfum', category: 'Fragrance', risk: 'Common Sensitizing Allergen' });
  }

  let penalty = 0;
  if (hasParabens) penalty += 25;
  if (hasSulfates) penalty += 12;
  if (hasFragrance) penalty += 8;

  const score = Math.max(15, Math.min(98, 92 - penalty + detectedActives.length * 5));
  let verdict: ScannedProduct['verdict'] = 'Clean & Safe';
  let color = '#10B981';
  let grade: ScannedProduct['nutriScore'] = 'A';

  if (score >= 82) {
    verdict = 'Clean & Safe';
    color = '#10B981';
    grade = score >= 90 ? 'A' : 'B';
  } else if (score >= 65) {
    verdict = 'Good Formulation';
    color = '#58B84F';
    grade = 'B';
  } else if (score >= 42) {
    verdict = 'Moderate Concern';
    color = '#F59E0B';
    grade = 'C';
  } else {
    verdict = 'Hazardous / Poor';
    color = '#EF4444';
    grade = 'E';
  }

  return {
    score,
    verdict,
    color,
    grade,
    formulationProfile: {
      activePct: 60,
      emollientPct: 25,
      stabilizerPct: 15,
      isParabenFree: !hasParabens,
      isSulfateFree: !hasSulfates,
      isSiliconeFree: !hasSilicones,
      isFragranceFree: !hasFragrance,
      highRiskCount: hasParabens ? 1 : 0,
      moderateRiskCount: (hasSulfates ? 1 : 0) + (hasFragrance ? 1 : 0),
      activesCount: detectedActives.length,
      detectedActives,
      detectedRisks,
    }
  };
}

export async function fetchProductByBarcode(barcodeRaw: string, forceRefresh: boolean = false): Promise<ScannedProduct> {
  const barcode = barcodeRaw.trim();

  // 1. Immediately validate if barcode is an ISBN book or unsupported product
  const earlyCheck = isNonSupportedProduct(barcode);
  if (earlyCheck.isUnsupported) {
    throw new Error(earlyCheck.reason);
  }

  if (!forceRefresh) {
    const cached = await getCachedProduct(barcode);
    if (cached) {
      return cached;
    }
  }

  // 2. Check Curated Products
  if (CURATED_PRODUCTS[barcode]) {
    const cur = CURATED_PRODUCTS[barcode];
    const nutri = (cur.nutriScore || 'C') as ScannedProduct['nutriScore'];
    const isBeauty = cur.productType === 'beauty' || isBeautyCategory(cur.category || '', cur.name || '');

    const curatedProduct: ScannedProduct = {
      barcode,
      name: cur.name || 'Packaged Mart Item',
      brand: cur.brand || 'Mart Product',
      category: cur.category || (isBeauty ? 'Beauty & Care' : 'Grocery'),
      imageUrl: cur.imageUrl,
      productType: isBeauty ? 'beauty' : 'food',
      nutriScore: nutri,
      novaGroup: cur.novaGroup || (isBeauty ? 1 : 3),
      aiHealthRating: cur.aiHealthRating || 80,
      verdict: cur.verdict || (isBeauty ? 'Clean & Safe' : 'Good Choice'),
      verdictColor: cur.verdictColor || '#10B981',
      metrics: cur.metrics || {
        calories: isBeauty ? 0 : 320,
        carbs: isBeauty ? 0 : 45,
        sugars: isBeauty ? 0 : 12,
        fat: isBeauty ? 0 : 10,
        saturatedFat: isBeauty ? 0 : 3.5,
        protein: isBeauty ? 0 : 6.5,
        fiber: isBeauty ? 0 : 2.8,
        salt: isBeauty ? 0 : 0.8,
      },
      additives: cur.additives || [],
      hasPalmOil: !!cur.hasPalmOil,
      isUltraProcessed: cur.isUltraProcessed !== undefined ? cur.isUltraProcessed : false,
      ingredientsSummary: cur.ingredientsSummary,
      insight: cur.insight,
      formulationProfile: cur.formulationProfile || null,
    };
    await setCachedProductFromScan(barcode, curatedProduct);
    return curatedProduct;
  }

  // 3. Check verified local database catalog (categoryProductsData)
  for (const catKey of Object.keys(CATEGORY_LOCAL_DATA)) {
    const list = (CATEGORY_LOCAL_DATA as Record<string, any[]>)[catKey] || [];
    const found = list.find((p: any) => p.barcode === barcode);
    if (found) {
      const isBeauty = found.productType === 'beauty' || isBeautyCategory(found.category || '', found.name || '');
      const validNutriScores = ['A', 'B', 'C', 'D', 'E'];
      const scoreCandidate = (found.nutriScore || 'C').toString().toUpperCase();
      const safeNutriScore: ScannedProduct['nutriScore'] = validNutriScores.includes(scoreCandidate)
        ? (scoreCandidate as ScannedProduct['nutriScore'])
        : 'C';
      const m = found.metrics || { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 };

      const localProduct: ScannedProduct = {
        barcode,
        name: found.name,
        brand: found.brand,
        category: found.category,
        imageUrl: found.imageUrl,
        productType: isBeauty ? 'beauty' : 'food',
        nutriScore: safeNutriScore,
        novaGroup: found.novaGroup || (isBeauty ? 1 : 3),
        aiHealthRating: typeof found.aiHealthRating === 'number' ? found.aiHealthRating : 75,
        verdict: found.verdict || 'Good Choice',
        verdictColor: found.verdictColor || '#58B84F',
        metrics: isBeauty ? { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 } : m,
        additives: Array.isArray(found.additives) ? found.additives : [],
        hasPalmOil: Boolean(found.hasPalmOil),
        isUltraProcessed: Boolean(found.isUltraProcessed),
        ingredientsSummary: found.ingredientsSummary,
        insight: found.insight,
        formulationProfile: found.formulationProfile || null,
      };
      await setCachedProductFromScan(barcode, localProduct);
      return localProduct;
    }
  }

  try {
    const jwt = await getStoredJwtToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }

    const backendRes = await fetch(`${getBackendBase()}/products/${encodeURIComponent(barcode)}`, {
      method: 'GET',
      headers,
    });

    if (backendRes.ok) {
      const backendJson = await backendRes.json();
      if (backendJson.success && backendJson.product) {
        const prod = backendJson.product;
        const unsup = isNonSupportedProduct(barcode, prod.product_name || prod.name, prod.category);
        if (unsup.isUnsupported) {
          throw new Error(unsup.reason);
        }
        if (!isAllowedCategory(prod.category || '', prod.product_name || prod.name || '', prod.productType)) {
          throw new Error('This item is not a supported food, drink, or beauty product.');
        }

        const isBeauty = prod.productType === 'beauty' || isBeautyCategory(prod.category || '', prod.product_name || prod.name || '');
        const validNutriScores = ['A', 'B', 'C', 'D', 'E'];
        const scoreCandidate = (prod.nutriScore || prod.nutriscore_grade || 'C').toString().toUpperCase();
        const safeNutriScore: ScannedProduct['nutriScore'] = validNutriScores.includes(scoreCandidate)
          ? (scoreCandidate as ScannedProduct['nutriScore'])
          : 'C';
        const nova = typeof prod.nova_group === 'number' ? prod.nova_group : (isBeauty ? 1 : 3);
        const n = prod.nutrition_per_100g || {};
        const calories = Math.round(Number(prod.metrics?.calories ?? prod.calories ?? n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0));
        const carbs = Number((Number(prod.metrics?.carbs ?? prod.carbs ?? n.carbohydrates_100g ?? n.carbohydrates ?? 0)).toFixed(1));
        const sugars = Number((Number(prod.metrics?.sugars ?? prod.sugars ?? n.sugars_100g ?? 0)).toFixed(1));
        const fat = Number((Number(prod.metrics?.fat ?? prod.fat ?? n.fat_100g ?? 0)).toFixed(1));
        const saturatedFat = Number((Number(prod.metrics?.saturatedFat ?? prod.saturatedFat ?? n['saturated-fat_100g'] ?? 0)).toFixed(1));
        const protein = Number((Number(prod.metrics?.protein ?? prod.protein ?? n.proteins_100g ?? 0)).toFixed(1));
        const fiber = Number((Number(prod.metrics?.fiber ?? prod.fiber ?? n.fiber_100g ?? 0)).toFixed(1));
        const salt = Number((Number(prod.metrics?.salt ?? prod.salt ?? n.salt_100g ?? 0)).toFixed(2));
        const hasPalm = Boolean(prod.hasPalmOil || (prod.ingredients && /palm/i.test(prod.ingredients)));
        const additives = Array.isArray(prod.additives) ? prod.additives : [];

        let backendAiRating = typeof prod.aiHealthRating === 'number' ? prod.aiHealthRating : 70;
        let backendVerdict = prod.verdict || 'Good Choice';
        let backendVerdictColor = prod.verdictColor || '#58B84F';
        let formulation = prod.formulationProfile || null;

        if (isBeauty && !formulation && (prod.ingredientsSummary || prod.ingredients_text)) {
          const beautyAnalysis = parseBeautyIngredients(prod.ingredientsSummary || prod.ingredients_text);
          formulation = beautyAnalysis.formulationProfile;
          backendAiRating = beautyAnalysis.score;
          backendVerdict = beautyAnalysis.verdict;
          backendVerdictColor = beautyAnalysis.color;
        }

        const productObj: ScannedProduct = {
          barcode,
          name: prod.product_name || prod.name || (isBeauty ? 'Beauty & Care Product' : 'Packaged Mart Item'),
          brand: prod.brand || 'Selection',
          category: prod.category || (isBeauty ? 'Beauty & Care' : 'Grocery'),
          imageUrl: prod.image_url || prod.imageUrl,
          productType: isBeauty ? 'beauty' : 'food',
          nutriScore: safeNutriScore,
          novaGroup: prod.novaGroup ?? nova,
          aiHealthRating: backendAiRating,
          verdict: backendVerdict,
          verdictColor: backendVerdictColor,
          insight: prod.insight,
          metrics: {
            calories,
            carbs,
            sugars,
            fat,
            saturatedFat,
            protein,
            fiber,
            salt,
          },
          additives: Array.isArray(prod.additives) ? prod.additives : additives,
          hasPalmOil: prod.hasPalmOil !== undefined ? Boolean(prod.hasPalmOil) : hasPalm,
          isUltraProcessed: prod.isUltraProcessed !== undefined ? Boolean(prod.isUltraProcessed) : nova === 4,
          ingredientsSummary: prod.ingredientsSummary || prod.ingredients || prod.ingredients_text,
          formulationProfile: formulation,
        };
        await setCachedProductFromScan(barcode, productObj);
        return productObj;
      }
    }
  } catch (_) {

  }

  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
    );
    if (offRes.ok) {
      const data = await offRes.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name || p.product_name_en || '';
        const cat = p.categories || '';

        const unsup = isNonSupportedProduct(barcode, name, cat);
        if (unsup.isUnsupported) {
          throw new Error(unsup.reason);
        }
        if (!isAllowedCategory(cat, name, 'food')) {
          throw new Error('This item is not a supported food, drink, or beauty product.');
        }

        const gradeRaw = (p.nutriscore_grade || 'c').toUpperCase();
        const nutriScore: ScannedProduct['nutriScore'] = ['A', 'B', 'C', 'D', 'E'].includes(gradeRaw)
          ? (gradeRaw as ScannedProduct['nutriScore'])
          : 'C';
        const nova = typeof p.nova_group === 'number' ? p.nova_group : 3;

        const nutriments = p.nutriments || {};
        // Use null for truly missing values — never default to fake nutrition data
        const rawCal  = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? null;
        const rawSug  = nutriments['sugars_100g'] ?? null;
        const rawSF   = nutriments['saturated-fat_100g'] ?? null;
        const rawFat  = nutriments['fat_100g'] ?? null;
        const rawCarb = nutriments['carbohydrates_100g'] ?? null;
        const rawProt = nutriments['proteins_100g'] ?? null;
        const rawFib  = nutriments['fiber_100g'] ?? null;
        const rawSalt = nutriments['salt_100g'] ?? null;

        const calories     = rawCal  !== null ? Math.round(Number(rawCal))  : null;
        const carbs        = rawCarb !== null ? Number(Number(rawCarb).toFixed(1)) : 0;
        const sugars       = rawSug  !== null ? Number(Number(rawSug).toFixed(1))  : null;
        const fat          = rawFat  !== null ? Number(Number(rawFat).toFixed(1))  : 0;
        const saturatedFat = rawSF   !== null ? Number(Number(rawSF).toFixed(1))   : null;
        const protein      = rawProt !== null ? Number(Number(rawProt).toFixed(1)) : null;
        const fiber        = rawFib  !== null ? Number(Number(rawFib).toFixed(1))  : null;
        const salt         = rawSalt !== null ? Number(Number(rawSalt).toFixed(2)) : null;

        const additivesTags: string[] = p.additives_tags || [];
        const additives = additivesTags.map((tag: string) => tag.replace('en:', '').toUpperCase());
        const ingredientsText: string = p.ingredients_text || '';
        const hasPalmOil =
          p.ingredients_from_palm_oil_n > 0 ||
          /palm oil|palmolein|palm fat/i.test(ingredientsText);

        // Detect beverage / juice from OFQ category tags
        const catLower = cat.toLowerCase();
        const isBeverage = /\b(beverage|drink|soda|cola|juice|water|nectar|smoothie|energy.drink|sports.drink)\b/.test(catLower);
        const isJuice = /\b(juice|nectar|smoothie|fruit.drink)\b/.test(catLower);
        const is100PctJuice = isJuice && /100.?%/.test(catLower) && !/added.?sugar|sweetened/.test(ingredientsText.toLowerCase());
        const isSugaryDrink = isBeverage && !isJuice && (sugars ?? 0) >= 5;

        const analysis = calculateAiHealthScore(
          nutriScore,
          nova,
          sugars,
          saturatedFat,
          hasPalmOil,
          additives.length,
          calories,
          salt,
          fiber,
          protein,
          isBeverage,
          isSugaryDrink,
          isJuice,
          is100PctJuice,
          additives
        );

        const offProduct: ScannedProduct = {
          barcode,
          name: name || 'Packaged Mart Item',
          brand: p.brands || 'Mart Brand',
          category: cat.split(',')[0] || 'Packaged Food',
          imageUrl: p.image_url || p.image_front_url || p.image_small_url,
          productType: 'food',
          nutriScore,
          novaGroup: nova,
          aiHealthRating: analysis.score,
          verdict: analysis.verdict,
          verdictColor: analysis.color,
          metrics: {
            calories: calories ?? 0,
            carbs,
            sugars: sugars ?? 0,
            fat,
            saturatedFat: saturatedFat ?? 0,
            protein: protein ?? 0,
            fiber: fiber ?? 0,
            salt: salt ?? 0,
          },
          additives: additives.slice(0, 5),
          hasPalmOil,
          isUltraProcessed: nova === 4,
          ingredientsSummary: ingredientsText ? ingredientsText.slice(0, 180) + '...' : undefined,
        };
        await setCachedProductFromScan(barcode, offProduct);
        return offProduct;
      }
    }
  } catch (err: any) {
    if (err?.message && (err.message.includes('Foodco only supports') || err.message.includes('not a supported'))) {
      throw err;
    }
  }

  try {
    const obfRes = await fetch(
      `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
    );
    if (obfRes.ok) {
      const data = await obfRes.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name || p.product_name_en || '';
        const cat = p.categories || '';

        const unsup = isNonSupportedProduct(barcode, name, cat);
        if (unsup.isUnsupported) {
          throw new Error(unsup.reason);
        }
        if (!isAllowedCategory(cat, name, 'beauty')) {
          throw new Error('This item is not a supported food, drink, or beauty product.');
        }

        const ingredientsText: string = p.ingredients_text || p.ingredients_text_en || '';
        const beautyEval = parseBeautyIngredients(ingredientsText);

        const obfProduct: ScannedProduct = {
          barcode,
          name: name || 'Cosmetic / Personal Care Item',
          brand: p.brands || 'Personal Care Brand',
          category: cat.split(',')[0] || 'Beauty & Cosmetics',
          imageUrl: p.image_url || p.image_front_url || p.image_small_url,
          productType: 'beauty',
          nutriScore: beautyEval.grade,
          novaGroup: 1,
          aiHealthRating: beautyEval.score,
          verdict: beautyEval.verdict,
          verdictColor: beautyEval.color,
          metrics: {
            calories: 0,
            carbs: 0,
            sugars: 0,
            fat: 0,
            saturatedFat: 0,
            protein: 0,
            fiber: 0,
            salt: 0,
          },
          additives: (p.additives_tags || []).map((t: string) => t.replace('en:', '').toUpperCase()),
          hasPalmOil: false,
          isUltraProcessed: false,
          ingredientsSummary: ingredientsText || undefined,
          formulationProfile: beautyEval.formulationProfile,
        };
        await setCachedProductFromScan(barcode, obfProduct);
        return obfProduct;
      }
    }
  } catch (err: any) {
    if (err?.message && (err.message.includes('Foodco only supports') || err.message.includes('not a supported'))) {
      throw err;
    }
  }

  // Not found in database or verified external registers — NEVER show fake ratings or fake products
  throw new Error('Product not found in database. This barcode is not in our verified food, drink, or beauty records.');
}

export async function fetchRandomProductFromDatabase(): Promise<string | null> {
  try {
    const jwt = await getStoredJwtToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
    const res = await fetch(`${getBackendBase()}/items/random?limit=6`, {
      method: 'GET',
      headers,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items) && json.items.length > 0) {
        const randomIndex = Math.floor(Math.random() * json.items.length);
        const item = json.items[randomIndex];
        return item.id || item.barcode || null;
      }
    }
  } catch (_) {}
  return null;
}

export async function fetchProductsByCategory(
  categoryKey: string,
  page: number = 1,
  limit: number = 20,
  search: string = '',
  forceRefresh: boolean = false
): Promise<PaginatedProducts> {
  const normKey = categoryKey.toLowerCase().trim();
  const searchLower = search.toLowerCase().trim();

  if (!forceRefresh) {
    const cached = await getCachedCategoryPage(normKey, page, searchLower);
    if (cached) {
      return cached;
    }
  }

  let baseProducts: ScannedProduct[] = [];
  const localItems = (CATEGORY_LOCAL_DATA as Record<string, any[]>)[normKey] || [];
  if (localItems.length > 0) {
    baseProducts = localItems.map(p => ({
      ...p,
      productType: p.productType || (normKey === 'beauty' || normKey === 'perfume' ? 'beauty' : 'food'),
      nutriScore: (p.nutriScore || 'B') as ScannedProduct['nutriScore'],
      verdict: p.verdict || 'Good Choice',
      metrics: p.metrics || { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
      additives: p.additives || [],
      hasPalmOil: Boolean(p.hasPalmOil),
      isUltraProcessed: Boolean(p.isUltraProcessed),
    }));
  }

  let filteredLocal = baseProducts;
  if (searchLower) {
    filteredLocal = baseProducts.filter(p =>
      (p.name && p.name.toLowerCase().includes(searchLower)) ||
      (p.brand && p.brand.toLowerCase().includes(searchLower)) ||
      (p.category && p.category.toLowerCase().includes(searchLower))
    );
  }
  const localTotal = filteredLocal.length;
  const localStart = (page - 1) * limit;
  const localSlice = filteredLocal.slice(localStart, localStart + limit);
  const localTotalPages = Math.max(1, Math.ceil(localTotal / limit));
  const localHasMore = page < localTotalPages;

  try {
    const jwt = await getStoredJwtToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
    const queryParams = new URLSearchParams();
    if (searchLower) queryParams.append('search', searchLower);
    queryParams.append('page', String(page));
    queryParams.append('limit', String(limit));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`${getBackendBase()}/products/category/${encodeURIComponent(normKey)}?${queryParams.toString()}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        const liveProducts: ScannedProduct[] = data.products.map((p: any) => ({
          ...p,
          productType: p.productType || (normKey === 'beauty' || normKey === 'perfume' ? 'beauty' : 'food'),
          nutriScore: (p.nutriScore || 'B') as ScannedProduct['nutriScore'],
          verdict: p.verdict || 'Good Choice',
          metrics: p.metrics || { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
          additives: p.additives || [],
          hasPalmOil: Boolean(p.hasPalmOil),
          isUltraProcessed: Boolean(p.isUltraProcessed),
        }));

        let finalProducts = liveProducts;
        let total = typeof data.total === 'number' ? data.total : liveProducts.length;
        let totalPages = typeof data.totalPages === 'number' ? data.totalPages : Math.ceil(total / limit);

        if (finalProducts.length === 0 && page === 1 && localSlice.length > 0) {
          finalProducts = localSlice;
          total = localTotal;
          totalPages = localTotalPages;
        }

        const hasMore = page < totalPages && finalProducts.length > 0;
        const result: PaginatedProducts = {
          total,
          products: finalProducts,
          page,
          limit,
          totalPages,
          hasMore,
          fromCache: false,
        };

        await setCachedCategoryPage(normKey, page, searchLower, result);

        for (const p of finalProducts) {
          if (p.barcode) {
            setCachedProduct(p.barcode, p).catch(() => {});
          }
        }

        return result;
      }
    }
  } catch (_) {

  }

  const fallbackResult: PaginatedProducts = {
    total: localTotal,
    products: localSlice,
    page,
    limit,
    totalPages: localTotalPages,
    hasMore: localHasMore,
    fromCache: false,
  };
  return fallbackResult;
}

export async function searchAllProducts(
  query: string,
  page: number = 1,
  limit: number = 20,
  forceRefresh: boolean = false
): Promise<PaginatedProducts> {
  const searchLower = query.toLowerCase().trim();
  if (!searchLower) {
    return {
      total: 0,
      products: [],
      page: 1,
      limit,
      totalPages: 0,
      hasMore: false,
      fromCache: false,
    };
  }

  if (!forceRefresh) {
    const cached = await getCachedSearchResults(searchLower, page);
    if (cached) {
      return cached;
    }
  }

  const curatedList: ScannedProduct[] = Object.entries(CURATED_PRODUCTS).map(([barcode, p]) => ({
    barcode,
    name: p.name || 'Packaged Mart Item',
    brand: p.brand || 'Mart Selection',
    category: p.category || 'Grocery',
    imageUrl: p.imageUrl,
    productType: p.productType || 'food',
    nutriScore: (p.nutriScore || 'B') as ScannedProduct['nutriScore'],
    novaGroup: p.novaGroup || 3,
    aiHealthRating: p.aiHealthRating ?? 75,
    verdict: p.verdict || 'Good Choice',
    verdictColor: p.verdictColor || '#10B981',
    metrics: p.metrics || { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
    additives: p.additives || [],
    hasPalmOil: Boolean(p.hasPalmOil),
    isUltraProcessed: Boolean(p.isUltraProcessed),
    ingredientsSummary: p.ingredientsSummary,
    insight: p.insight,
    formulationProfile: p.formulationProfile || null,
  }));

  const allCategoryLocal = Object.values(CATEGORY_LOCAL_DATA as Record<string, any[]>).flat();
  const allLocal = [...curatedList, ...allCategoryLocal];

  const matchedLocal: ScannedProduct[] = allLocal
    .filter(p => {
      const text = [p.name, p.brand, p.category].filter(Boolean).join(' ').toLowerCase();
      return text.includes(searchLower);
    })
    .map(p => ({
      ...p,
      productType: p.productType || 'food',
      nutriScore: (p.nutriScore || 'B') as ScannedProduct['nutriScore'],
      verdict: p.verdict || 'Good Choice',
      metrics: p.metrics || { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
      additives: p.additives || [],
      hasPalmOil: Boolean(p.hasPalmOil),
      isUltraProcessed: Boolean(p.isUltraProcessed),
    }));

  const seenLocal = new Set<string>();
  const deduplicatedLocal: ScannedProduct[] = [];
  for (const p of matchedLocal) {
    if (!seenLocal.has(p.barcode)) {
      seenLocal.add(p.barcode);
      deduplicatedLocal.push(p);
    }
  }

  const localTotal = deduplicatedLocal.length;
  const localStart = (page - 1) * limit;
  const localSlice = deduplicatedLocal.slice(localStart, localStart + limit);
  const localTotalPages = Math.max(1, Math.ceil(localTotal / limit));
  const localHasMore = page < localTotalPages;

  try {
    const jwt = await getStoredJwtToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `${getBackendBase()}/products/category/all?search=${encodeURIComponent(searchLower)}&page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers,
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        const liveProducts: ScannedProduct[] = data.products.map((p: any) => ({
          ...p,
          productType: p.productType || 'food',
          nutriScore: (p.nutriScore || 'B') as ScannedProduct['nutriScore'],
          verdict: p.verdict || 'Good Choice',
          metrics: p.metrics || { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
          additives: p.additives || [],
          hasPalmOil: Boolean(p.hasPalmOil),
          isUltraProcessed: Boolean(p.isUltraProcessed),
        }));

        let finalProducts = liveProducts;
        let total = typeof data.total === 'number' ? data.total : liveProducts.length;
        let totalPages = typeof data.totalPages === 'number' ? data.totalPages : Math.ceil(total / limit);

        if (finalProducts.length === 0 && page === 1 && localSlice.length > 0) {
          finalProducts = localSlice;
          total = localTotal;
          totalPages = localTotalPages;
        }

        const hasMore = page < totalPages && finalProducts.length > 0;
        const result: PaginatedProducts = {
          total,
          products: finalProducts,
          page,
          limit,
          totalPages,
          hasMore,
          fromCache: false,
        };

        await setCachedSearchResults(searchLower, page, result);

        for (const p of finalProducts) {
          if (p.barcode) {
            setCachedProduct(p.barcode, p).catch(() => {});
          }
        }

        return result;
      }
    }
  } catch (_) {}

  const fallbackResult: PaginatedProducts = {
    total: localTotal,
    products: localSlice,
    page,
    limit,
    totalPages: localTotalPages,
    hasMore: localHasMore,
    fromCache: false,
  };
  return fallbackResult;
}

export async function fetchTopRatedProducts(
  categoryKey: string = 'all',
  search: string = '',
  limit: number = 60
): Promise<ScannedProduct[]> {
  const normCategory = categoryKey.toLowerCase().trim();
  const searchLower = search.toLowerCase().trim();

  let allItems: ScannedProduct[] = [];
  const localData = CATEGORY_LOCAL_DATA as Record<string, any[]>;

  if (normCategory === 'all') {
    Object.keys(localData).forEach(cat => {
      const items = localData[cat] || [];
      items.forEach(p => {
        allItems.push({
          ...p,
          productType: p.productType || (cat === 'beauty' || cat === 'perfume' ? 'beauty' : 'food'),
          nutriScore: (p.nutriScore || 'B') as ScannedProduct['nutriScore'],
          verdict: p.verdict || 'Good Choice',
          aiHealthRating: typeof p.aiHealthRating === 'number' ? p.aiHealthRating : 50,
          metrics: p.metrics || { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
          additives: p.additives || [],
          hasPalmOil: Boolean(p.hasPalmOil),
          isUltraProcessed: Boolean(p.isUltraProcessed),
        });
      });
    });
  } else {
    const items = localData[normCategory] || [];
    items.forEach(p => {
      allItems.push({
        ...p,
        productType: p.productType || (normCategory === 'beauty' || normCategory === 'perfume' ? 'beauty' : 'food'),
        nutriScore: (p.nutriScore || 'B') as ScannedProduct['nutriScore'],
        verdict: p.verdict || 'Good Choice',
        aiHealthRating: typeof p.aiHealthRating === 'number' ? p.aiHealthRating : 50,
        metrics: p.metrics || { calories: 0, carbs: 0, sugars: 0, fat: 0, saturatedFat: 0, protein: 0, fiber: 0, salt: 0 },
        additives: p.additives || [],
        hasPalmOil: Boolean(p.hasPalmOil),
        isUltraProcessed: Boolean(p.isUltraProcessed),
      });
    });
  }

  const seenBarcodes = new Set<string>();
  let deduped = allItems.filter(p => {
    if (!p.barcode || seenBarcodes.has(p.barcode)) return false;
    seenBarcodes.add(p.barcode);
    return true;
  });

  if (searchLower) {
    deduped = deduped.filter(p =>
      (p.name && p.name.toLowerCase().includes(searchLower)) ||
      (p.brand && p.brand.toLowerCase().includes(searchLower)) ||
      (p.category && p.category.toLowerCase().includes(searchLower)) ||
      (p.ingredientsSummary && p.ingredientsSummary.toLowerCase().includes(searchLower))
    );
  }

  deduped.sort((a, b) => (b.aiHealthRating || 0) - (a.aiHealthRating || 0));

  return deduped.slice(0, limit);
}

