import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share,
  StatusBar as RNStatusBar,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScannedProduct } from '../DASHBOARD/productService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ProductDetailPageProps {
  visible: boolean;
  product: ScannedProduct | null;
  onClose: () => void;
}

const NUTRI_COLORS: Record<string, string> = {
  A: '#038141',
  B: '#85BB2F',
  C: '#FECB02',
  D: '#EE8100',
  E: '#E63E11',
};

const NOVA_DETAILS: Record<number, { title: string; color: string; desc: string }> = {
  1: {
    title: 'Unprocessed or Minimally Processed',
    color: '#10B981',
    desc: 'Natural foods unaltered or minimally dried, boiled, or frozen without added industrial chemicals.',
  },
  2: {
    title: 'Processed Culinary Ingredients',
    color: '#3B82F6',
    desc: 'Extracted directly from natural foods, such as oils, butter, and culinary salts.',
  },
  3: {
    title: 'Processed Foods',
    color: '#F59E0B',
    desc: 'Manufactured by adding salt, sugar, or oil to natural foods to enhance shelf life or taste.',
  },
  4: {
    title: 'Ultra-Processed Food Product',
    color: '#EF4444',
    desc: 'Formulated with industrial ingredients, artificial flavor enhancers, stabilizers, and high refined sugars.',
  },
};

interface ParsedIngredient {
  raw: string;
  cleanName: string;
  percentage?: string;
  isPalm: boolean;
  isSugar: boolean;
  isAllergen: boolean;
  allergenLabel?: string;
}

function parseIngredients(text?: string): ParsedIngredient[] {
  if (!text) return [];
  const clean = text.replace(/[\*]/g, '').trim().replace(/\.$/, '');
  const items: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      if (current.trim()) items.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) items.push(current.trim());

  return items.map((raw) => {
    const pctMatch = raw.match(/(\d+(?:\.\d+)?%)/);
    const percentage = pctMatch ? pctMatch[1] : undefined;
    let cleanName = raw.replace(/\(\s*\d+(?:\.\d+)?%\s*\)/g, '').trim();

    const isPalm = /palm\s*oil|hydrogenated|vegetable\s*fat/i.test(raw);
    const isSugar = /^(?:sugar|sucrose|glucose|fructose|maltodextrin|corn\s*syrup)/i.test(cleanName);

    let isAllergen = false;
    let allergenLabel: string | undefined;
    if (/hazelnut|almond|peanut|cashew|walnut|nut/i.test(raw)) {
      isAllergen = true;
      allergenLabel = 'Tree Nut';
    } else if (/milk|dairy|whey|butter|cheese/i.test(raw)) {
      isAllergen = true;
      allergenLabel = 'Dairy';
    } else if (/soya|soy/i.test(raw)) {
      isAllergen = true;
      allergenLabel = 'Soy';
    } else if (/wheat|gluten|flour/i.test(raw)) {
      isAllergen = true;
      allergenLabel = 'Gluten';
    } else if (/egg/i.test(raw)) {
      isAllergen = true;
      allergenLabel = 'Egg';
    }

    return {
      raw,
      cleanName,
      percentage,
      isPalm,
      isSugar,
      isAllergen,
      allergenLabel,
    };
  });
}

interface AdditiveDetail {
  code: string;
  name: string;
  role: string;
  risk: 'safe' | 'moderate' | 'high';
  riskLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

function getAdditiveDetails(raw: string): AdditiveDetail {
  const clean = raw.replace(/^en:/i, '').trim();
  const lower = clean.toLowerCase();

  if (lower.includes('322') || lower.includes('lecithin')) {
    return {
      code: 'E322',
      name: 'Lecithins (Soya / Sunflower)',
      role: 'Emulsifier & Stabilizer',
      risk: 'safe',
      riskLabel: 'No Risk',
      color: '#10B981',
      bgColor: '#ECFDF5',
      borderColor: '#D1FAE5',
      description: 'Plant-derived natural lipid that bonds fats and water. Safe and digestible.',
    };
  }
  if (lower.includes('vanillin')) {
    return {
      code: 'Flavoring',
      name: 'Vanillin',
      role: 'Aroma & Flavor Compound',
      risk: 'safe',
      riskLabel: 'No Risk',
      color: '#10B981',
      bgColor: '#ECFDF5',
      borderColor: '#D1FAE5',
      description: 'Synthetic aroma compound identical to natural vanilla. Regarded as non-toxic in foods.',
    };
  }
  if (lower.includes('330') || lower.includes('citric acid')) {
    return {
      code: 'E330',
      name: 'Citric Acid',
      role: 'Acidity Regulator & Antioxidant',
      risk: 'safe',
      riskLabel: 'No Risk',
      color: '#10B981',
      bgColor: '#ECFDF5',
      borderColor: '#D1FAE5',
      description: 'Natural organic fruit acid used to regulate tartness and stabilize shelf life.',
    };
  }
  if (lower.includes('500') || lower.includes('sodium bicarbonate') || lower.includes('baking soda')) {
    return {
      code: 'E500',
      name: 'Sodium Carbonates (Baking Soda)',
      role: 'Raising & Leavening Agent',
      risk: 'safe',
      riskLabel: 'No Risk',
      color: '#10B981',
      bgColor: '#ECFDF5',
      borderColor: '#D1FAE5',
      description: 'Mineral leavening agent that creates light, airy textures in baked items.',
    };
  }
  if (lower.includes('503') || lower.includes('ammonium bicarbonate')) {
    return {
      code: 'E503',
      name: 'Ammonium Carbonates',
      role: 'Crisp Leavening Agent',
      risk: 'safe',
      riskLabel: 'No Risk',
      color: '#10B981',
      bgColor: '#ECFDF5',
      borderColor: '#D1FAE5',
      description: 'Traditional baking agent for crisp cookies that cleanly vaporizes during oven baking.',
    };
  }
  if (lower.includes('471') || lower.includes('mono- and diglycerides')) {
    return {
      code: 'E471',
      name: 'Mono- & Diglycerides of Fatty Acids',
      role: 'Texture Stabilizer',
      risk: 'moderate',
      riskLabel: 'Moderate Caution',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      borderColor: '#FEF3C7',
      description: 'Plant or animal derived fatty emulsifier. May carry residual trans-fatty acids.',
    };
  }
  if (lower.includes('621') || lower.includes('msg') || lower.includes('glutamate')) {
    return {
      code: 'E621',
      name: 'Monosodium Glutamate (MSG)',
      role: 'Umami Flavor Enhancer',
      risk: 'moderate',
      riskLabel: 'Moderate Caution',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      borderColor: '#FEF3C7',
      description: 'Concentrated savory flavor enhancer. Generally safe, but can trigger sensitivity in some.',
    };
  }
  if (lower.includes('150d') || lower.includes('caramel iv')) {
    return {
      code: 'E150d',
      name: 'Ammonia Sulfite Caramel (Caramel IV)',
      role: 'Deep Brown Colorant',
      risk: 'moderate',
      riskLabel: 'Moderate Caution',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      borderColor: '#FEF3C7',
      description: 'Manufactured with ammonium and sulfite compounds. Regulated daily intake limits apply.',
    };
  }
  if (lower.includes('250') || lower.includes('sodium nitrite')) {
    return {
      code: 'E250',
      name: 'Sodium Nitrite',
      role: 'Curing Salt & Preservative',
      risk: 'high',
      riskLabel: 'High Risk',
      color: '#EF4444',
      bgColor: '#FEF2F2',
      borderColor: '#FEE2E2',
      description: 'Antibacterial preservative in processed meats. Can form nitrosamines when cooked at high heat.',
    };
  }
  if (lower.includes('407') || lower.includes('carrageenan')) {
    return {
      code: 'E407',
      name: 'Carrageenan',
      role: 'Gelling & Thickening Agent',
      risk: 'moderate',
      riskLabel: 'Moderate Caution',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      borderColor: '#FEF3C7',
      description: 'Red seaweed thickener. Known to cause mild gut irritation in sensitive digestive tracts.',
    };
  }

  const eMatch = clean.match(/e\s*(\d{3,4}[a-z]?)/i);
  const code = eMatch ? `E${eMatch[1].toUpperCase()}` : clean;
  return {
    code,
    name: clean,
    role: 'Regulated Food Additive',
    risk: 'safe',
    riskLabel: 'Evaluated Safe',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#D1FAE5',
    description: 'Food additive authorized under international dietary safety and purity standards.',
  };
}

export default function ProductDetailPage({
  visible,
  product,
  onClose,
}: ProductDetailPageProps) {
  const insets = useSafeAreaInsets();
  const [ingredientsView, setIngredientsView] = React.useState<'list' | 'text'>('list');

  const toggleAnim = React.useRef(new Animated.Value(0)).current;
  const contentFadeAnim = React.useRef(new Animated.Value(1)).current;

  const handleSwitchView = (mode: 'list' | 'text') => {
    if (mode === ingredientsView) return;

    LayoutAnimation.configureNext({
      duration: 320,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.85,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    Animated.parallel([
      Animated.spring(toggleAnim, {
        toValue: mode === 'list' ? 0 : 1,
        damping: 18,
        stiffness: 240,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(contentFadeAnim, {
          toValue: 0.15,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    setIngredientsView(mode);
  };

  const togglePillTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 31],
  });

  const parsedIngredients = React.useMemo(
    () => parseIngredients(product?.ingredientsSummary),
    [product?.ingredientsSummary]
  );

  if (!product) return null;

  const metrics = product.metrics || {
    calories: 0,
    carbs: 0,
    sugars: 0,
    fat: 0,
    saturatedFat: 0,
    protein: 0,
    fiber: 0,
    salt: 0,
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: product.name,
        message: `${product.name} by ${product.brand}\nFoodco Health Score: ${product.aiHealthRating}/100 (${product.verdict})\nNutri-Score: ${product.nutriScore}`,
      });
    } catch (_) {}
  };

  const activeNova = NOVA_DETAILS[product.novaGroup || 3] || NOVA_DETAILS[3];

  const totalMacros = Math.max(1, (metrics.carbs || 0) + (metrics.fat || 0) + (metrics.protein || 0));
  const carbPct = Math.round(((metrics.carbs || 0) / totalMacros) * 100);
  const fatPct = Math.round(((metrics.fat || 0) / totalMacros) * 100);
  const proteinPct = Math.max(0, 100 - carbPct - fatPct);

  const navBarHeight = insets.bottom > 0 ? insets.bottom : 12;
  const statusBarHeight = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : insets.top;
  const headerPaddingTop = Math.max(insets.top, statusBarHeight) + 8;
  const bottomNavPadding = navBarHeight + 20;

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        const NavigationBar = require('expo-navigation-bar');
        NavigationBar.setBackgroundColorAsync?.('#FFFFFF');
        NavigationBar.setButtonStyleAsync?.('dark');
        NavigationBar.setBorderColorAsync?.('#EEF0F4');
      } catch (_) {}
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.fullContainer}>
        <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

        {/* Top Header Bar */}
        <View style={[styles.headerBar, { paddingTop: headerPaddingTop }]}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#1E1D25" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Nutritional Analysis
          </Text>

          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={handleShare}
            activeOpacity={0.8}
            accessibilityLabel="Share Product"
          >
            <Ionicons name="share-outline" size={20} color="#1E1D25" />
          </TouchableOpacity>
        </View>

        {/* Main Scrollable Content */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavPadding }]}
          showsVerticalScrollIndicator={true}
          bounces={true}
          overScrollMode="always"
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Image */}
          {product.imageUrl ? (
            <View style={styles.heroImageWrapper}>
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>
          ) : null}

          {/* Product Identity */}
          <View style={styles.identityCard}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productBrandCategory}>
              {product.brand} • <Text style={styles.productCategory}>{product.category}</Text>
            </Text>

            <View style={styles.barcodeRow}>
              <Text style={styles.barcodeLines}>|||||</Text>
              <Text style={styles.barcodeString}>{product.barcode}</Text>
            </View>
          </View>

          {/* Health Score Main Card */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreTopRow}>
              <View style={styles.logoRow}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.foodcoLogo}
                  resizeMode="contain"
                />
                <Text style={styles.indexTitle}>FOODCO HEALTH INDEX</Text>
              </View>
            </View>

            <View style={styles.scoreDisplayRow}>
              <View
                style={[
                  styles.scoreCircleBadge,
                  {
                    backgroundColor: `${product.verdictColor}10`,
                    borderColor: `${product.verdictColor}28`,
                  },
                ]}
              >
                <Text style={[styles.scoreBigNum, { color: product.verdictColor }]}>
                  {product.aiHealthRating}
                </Text>
                <Text style={[styles.scoreMaxSub, { color: product.verdictColor }]}>/100</Text>
              </View>

              <View style={styles.meterContainer}>
                <View style={styles.meterHeader}>
                  <Text style={styles.meterLabel}>Nutritional Rating</Text>
                  <Text style={[styles.meterPctText, { color: product.verdictColor }]}>
                    {product.aiHealthRating}%
                  </Text>
                </View>

                <View style={styles.meterTrack}>
                  <View
                    style={[
                      styles.meterFill,
                      {
                        width: `${Math.max(6, Math.min(100, product.aiHealthRating))}%`,
                        backgroundColor: product.verdictColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.meterSpectrumRow}>
                  <Text style={styles.spectrumText}>Poor</Text>
                  <Text style={styles.spectrumText}>Moderate</Text>
                  <Text style={styles.spectrumText}>Optimal</Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.insightBox,
                {
                  backgroundColor: `${product.verdictColor}0A`,
                  borderColor: `${product.verdictColor}20`,
                },
              ]}
            >
              <Ionicons
                name={product.aiHealthRating >= 60 ? 'checkmark-circle' : 'alert-circle'}
                size={17}
                color={product.verdictColor}
                style={styles.insightIcon}
              />
              <Text style={styles.insightText}>
                {product.insight ||
                  (product.aiHealthRating >= 70
                    ? 'Great nutritional choice with clean, balanced nutrients.'
                    : product.aiHealthRating >= 40
                    ? 'Moderate nutritional value. Safe in moderate portions.'
                    : 'Poor rating. High in sugar or saturated fats. Limit intake.')}
              </Text>
            </View>
          </View>

          {/* Global Standards: Nutri-Score & NOVA */}
          <View style={styles.standardsRow}>
            <View style={styles.standardCard}>
              <Text style={styles.standardCardTitle}>Nutri-Score</Text>
              <View style={styles.nutriPillRow}>
                {['A', 'B', 'C', 'D', 'E'].map((grade) => {
                  const isActive = product.nutriScore === grade;
                  const color = NUTRI_COLORS[grade] || '#9CA3AF';
                  return (
                    <View
                      key={grade}
                      style={[
                        styles.nutriLetterPill,
                        isActive
                          ? { backgroundColor: color, transform: [{ scale: 1.15 }], zIndex: 2 }
                          : { backgroundColor: '#ECEEF2', opacity: 0.6 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.nutriLetterText,
                          { color: isActive ? '#FFFFFF' : '#6B7280' },
                        ]}
                      >
                        {grade}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.standardCard}>
              <Text style={styles.standardCardTitle}>Processing Grade</Text>
              <View style={styles.novaIndicatorRow}>
                <View
                  style={[
                    styles.novaNumberCircle,
                    { backgroundColor: `${activeNova.color}15`, borderColor: activeNova.color },
                  ]}
                >
                  <Text style={[styles.novaNumberText, { color: activeNova.color }]}>
                    {product.novaGroup || 3}
                  </Text>
                </View>
                <View style={styles.novaTextWrap}>
                  <Text style={[styles.novaStatusText, { color: activeNova.color }]}>
                    {activeNova.title}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Macro Nutrient Proportion Bar */}
          <View style={styles.detailSectionCard}>
            <Text style={styles.sectionHeaderTitle}>Macro Nutrient Balance</Text>
            <View style={styles.macroProportionBar}>
              <View style={[styles.macroBarSegment, { flex: carbPct || 1, backgroundColor: '#3B82F6' }]} />
              <View style={[styles.macroBarSegment, { flex: fatPct || 1, backgroundColor: '#EF4444' }]} />
              <View style={[styles.macroBarSegment, { flex: proteinPct || 1, backgroundColor: '#10B981' }]} />
            </View>

            <View style={styles.macroLegendRow}>
              <View style={styles.macroLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendLabel}>Carbs {carbPct}%</Text>
              </View>
              <View style={styles.macroLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendLabel}>Fat {fatPct}%</Text>
              </View>
              <View style={styles.macroLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendLabel}>Protein {proteinPct}%</Text>
              </View>
            </View>
          </View>

          {/* Detailed Nutrient Breakdown Charts per 100g */}
          <View style={styles.detailSectionCard}>
            <Text style={styles.sectionHeaderTitle}>Nutrient Profile (per 100g)</Text>

            {/* Energy */}
            <View style={styles.graphRow}>
              <View style={styles.graphHeader}>
                <Text style={styles.graphMetricName}>Energy / Calories</Text>
                <Text style={styles.graphValueText}>{metrics.calories} kcal</Text>
              </View>
              <View style={styles.graphTrack}>
                <View
                  style={[
                    styles.graphFill,
                    {
                      width: `${Math.min(100, Math.round((metrics.calories / 800) * 100))}%`,
                      backgroundColor: metrics.calories > 450 ? '#EF4444' : '#10B981',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Sugars */}
            <View style={styles.graphRow}>
              <View style={styles.graphHeader}>
                <Text style={styles.graphMetricName}>Sugars</Text>
                <Text style={styles.graphValueText}>{metrics.sugars}g</Text>
              </View>
              <View style={styles.graphTrack}>
                <View
                  style={[
                    styles.graphFill,
                    {
                      width: `${Math.min(100, Math.round((metrics.sugars / 50) * 100))}%`,
                      backgroundColor: metrics.sugars > 22 ? '#EF4444' : metrics.sugars > 10 ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Saturated Fat */}
            <View style={styles.graphRow}>
              <View style={styles.graphHeader}>
                <Text style={styles.graphMetricName}>Saturated Fat</Text>
                <Text style={styles.graphValueText}>{metrics.saturatedFat}g</Text>
              </View>
              <View style={styles.graphTrack}>
                <View
                  style={[
                    styles.graphFill,
                    {
                      width: `${Math.min(100, Math.round((metrics.saturatedFat / 20) * 100))}%`,
                      backgroundColor: metrics.saturatedFat > 8 ? '#EF4444' : metrics.saturatedFat > 4 ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Dietary Fiber */}
            <View style={styles.graphRow}>
              <View style={styles.graphHeader}>
                <Text style={styles.graphMetricName}>Dietary Fiber</Text>
                <Text style={styles.graphValueText}>{metrics.fiber}g</Text>
              </View>
              <View style={styles.graphTrack}>
                <View
                  style={[
                    styles.graphFill,
                    {
                      width: `${Math.min(100, Math.round((metrics.fiber / 10) * 100))}%`,
                      backgroundColor: '#10B981',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Protein */}
            <View style={styles.graphRow}>
              <View style={styles.graphHeader}>
                <Text style={styles.graphMetricName}>Protein</Text>
                <Text style={styles.graphValueText}>{metrics.protein}g</Text>
              </View>
              <View style={styles.graphTrack}>
                <View
                  style={[
                    styles.graphFill,
                    {
                      width: `${Math.min(100, Math.round((metrics.protein / 25) * 100))}%`,
                      backgroundColor: '#3B82F6',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Salt */}
            <View style={styles.graphRow}>
              <View style={styles.graphHeader}>
                <Text style={styles.graphMetricName}>Salt / Sodium</Text>
                <Text style={styles.graphValueText}>{metrics.salt}g</Text>
              </View>
              <View style={styles.graphTrack}>
                <View
                  style={[
                    styles.graphFill,
                    {
                      width: `${Math.min(100, Math.round((metrics.salt / 3) * 100))}%`,
                      backgroundColor: metrics.salt > 1.5 ? '#EF4444' : metrics.salt > 0.8 ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Ingredients & Chemical Additives - Premium Redesign */}
          <View style={styles.detailSectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderTitleCol}>
                <Text style={styles.sectionHeaderTitle}>Ingredients & Additives</Text>
                <Text style={styles.sectionHeaderSubtitle}>
                  {parsedIngredients.length > 0
                    ? `${parsedIngredients.length} ingredients • ${product.additives?.length || 0} additives`
                    : 'Manufacturer Formulation'}
                </Text>
              </View>

              {parsedIngredients.length > 0 ? (
                <View style={styles.viewToggleWrap}>
                  {/* Sliding Active Dark Pill */}
                  <Animated.View
                    style={[
                      styles.slidingActivePill,
                      {
                        transform: [{ translateX: togglePillTranslateX }],
                      },
                    ]}
                  />

                  <TouchableOpacity
                    style={styles.viewToggleTab}
                    onPress={() => handleSwitchView('list')}
                    activeOpacity={0.8}
                    accessibilityLabel="List View"
                  >
                    <Ionicons
                      name="list"
                      size={15}
                      color={ingredientsView === 'list' ? '#FFFFFF' : '#6B7280'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.viewToggleTab}
                    onPress={() => handleSwitchView('text')}
                    activeOpacity={0.8}
                    accessibilityLabel="Full Label Text"
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={15}
                      color={ingredientsView === 'text' ? '#FFFFFF' : '#6B7280'}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* Palm Oil Attention Banner */}
            {product.hasPalmOil ? (
              <View style={styles.palmWarningCard}>
                <View style={styles.palmWarningIconCircle}>
                  <Ionicons name="warning" size={17} color="#DC2626" />
                </View>
                <View style={styles.palmWarningBody}>
                  <View style={styles.palmWarningHeaderRow}>
                    <Text style={styles.palmWarningTitle}>Contains Palm Oil</Text>
                    <View style={styles.palmWarningBadge}>
                      <Text style={styles.palmWarningBadgeText}>Saturated Fat</Text>
                    </View>
                  </View>
                  <Text style={styles.palmWarningDesc}>
                    Formulated with refined palm oil / vegetable fats, rich in palmitic acid.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Ingredients Display with Smooth Transition */}
            <Animated.View style={{ opacity: contentFadeAnim }}>
              {parsedIngredients.length > 0 ? (
                ingredientsView === 'list' ? (
                  <View style={styles.ingredientsListCard}>
                    {parsedIngredients.map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.ingredientItemRow,
                          idx < parsedIngredients.length - 1 && styles.ingredientItemDivider,
                        ]}
                      >
                        <View
                          style={[
                            styles.ingredientRankCircle,
                            item.isPalm
                              ? styles.rankCirclePalm
                              : item.isSugar && idx === 0
                              ? styles.rankCircleSugar
                              : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.ingredientRankText,
                              item.isPalm
                                ? styles.rankTextPalm
                                : item.isSugar && idx === 0
                                ? styles.rankTextSugar
                                : null,
                            ]}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </Text>
                        </View>

                        <View style={styles.ingredientTextInfo}>
                          <Text style={styles.ingredientTitleText}>
                            {item.cleanName}
                          </Text>
                          {(item.isPalm || (item.isSugar && idx === 0) || item.isAllergen) ? (
                            <View style={styles.ingredientTagRow}>
                              {item.isPalm ? (
                                <View style={styles.pillPalm}>
                                  <Text style={styles.pillPalmText}>Refined Fat</Text>
                                </View>
                              ) : null}
                              {item.isSugar && idx === 0 ? (
                                <View style={styles.pillSugar}>
                                  <Text style={styles.pillSugarText}>Primary Base</Text>
                                </View>
                              ) : null}
                              {item.isAllergen ? (
                                <View style={styles.pillAllergen}>
                                  <Text style={styles.pillAllergenText}>
                                    Allergen • {item.allergenLabel}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          ) : null}
                        </View>

                        {item.percentage ? (
                          <View style={styles.percentageBadge}>
                            <Text style={styles.percentageBadgeText}>{item.percentage}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.labelTypographyCard}>
                    <Text style={styles.labelTextHeadline}>Packaging Statement:</Text>
                    <Text style={styles.labelBodyText}>{product.ingredientsSummary}</Text>
                  </View>
                )
              ) : product.ingredientsSummary ? (
                <View style={styles.labelTypographyCard}>
                  <Text style={styles.labelBodyText}>{product.ingredientsSummary}</Text>
                </View>
              ) : (
                <Text style={styles.ingredientsPlaceholderText}>
                  Ingredients details provided on packaging.
                </Text>
              )}
            </Animated.View>

            {/* Detected Additives Section */}
            {Array.isArray(product.additives) && product.additives.length > 0 ? (
              <View style={styles.additivesBlock}>
                <View style={styles.additivesBlockHeader}>
                  <Text style={styles.additivesBlockTitle}>
                    Detected Additives ({product.additives.length})
                  </Text>
                  <Text style={styles.additivesSubtitle}>Safety & Functional Analysis</Text>
                </View>

                <View style={styles.additivesCardsColumn}>
                  {product.additives.map((rawAdditive, idx) => {
                    const detail = getAdditiveDetails(rawAdditive);
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.additiveDetailCard,
                          { borderColor: detail.borderColor },
                        ]}
                      >
                        <View style={styles.additiveTopLine}>
                          <View style={styles.additiveCodeGroup}>
                            <View
                              style={[
                                styles.additiveCodeChip,
                                { backgroundColor: detail.bgColor },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.additiveCodeChipText,
                                  { color: detail.color },
                                ]}
                              >
                                {detail.code}
                              </Text>
                            </View>
                            <Text style={styles.additiveFullName} numberOfLines={1}>
                              {detail.name}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.additiveRiskPill,
                              { backgroundColor: detail.bgColor },
                            ]}
                          >
                            <View
                              style={[
                                styles.additiveRiskIndicatorDot,
                                { backgroundColor: detail.color },
                              ]}
                            />
                            <Text
                              style={[
                                styles.additiveRiskPillText,
                                { color: detail.color },
                              ]}
                            >
                              {detail.riskLabel}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.additiveFunctionRole}>
                          Role: <Text style={styles.additiveRoleValue}>{detail.role}</Text>
                        </Text>
                        <Text style={styles.additiveDetailedDesc}>
                          {detail.description}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.cleanAdditivesCard}>
                <View style={styles.cleanAdditivesIconBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                </View>
                <View style={styles.cleanAdditivesMeta}>
                  <Text style={styles.cleanAdditivesHeadline}>
                    Zero Artificial Additives
                  </Text>
                  <Text style={styles.cleanAdditivesSubheadline}>
                    No synthetic colorants, preservatives, or chemical emulsifiers detected.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Solid White Panel Behind Android System Navigation Buttons */}
        <View
          style={[styles.bottomWhitePanel, { height: navBarHeight }]}
          pointerEvents="none"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomWhitePanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
  },
  fullContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1D25',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  heroImageWrapper: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroImage: {
    width: '90%',
    height: '90%',
  },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    marginBottom: 14,
  },
  productName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E1D25',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  productBrandCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  productCategory: {
    color: '#FF6B35',
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  barcodeLines: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#6B7280',
    marginRight: 6,
  },
  barcodeString: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    marginBottom: 14,
  },
  scoreTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  foodcoLogo: {
    width: 18,
    height: 18,
  },
  indexTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E95A2',
    letterSpacing: 0.8,
  },
  scoreDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  scoreCircleBadge: {
    width: 82,
    height: 82,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBigNum: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 38,
  },
  scoreMaxSub: {
    fontSize: 11,
    fontWeight: '800',
    opacity: 0.8,
    marginTop: -2,
  },
  meterContainer: {
    flex: 1,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  meterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  meterPctText: {
    fontSize: 13,
    fontWeight: '900',
  },
  meterTrack: {
    height: 9,
    backgroundColor: '#F1F3F5',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  meterFill: {
    height: '100%',
    borderRadius: 5,
  },
  meterSpectrumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spectrumText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  insightIcon: {
    marginRight: 9,
  },
  insightText: {
    flex: 1,
    fontSize: 12.5,
    color: '#374151',
    fontWeight: '600',
    lineHeight: 18,
  },
  standardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  standardCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  standardCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E95A2',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  nutriPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutriLetterPill: {
    width: 25,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriLetterText: {
    fontSize: 14,
    fontWeight: '900',
  },
  novaIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  novaNumberCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  novaNumberText: {
    fontSize: 18,
    fontWeight: '900',
  },
  novaTextWrap: {
    flex: 1,
  },
  novaStatusText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  detailSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1D25',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  macroProportionBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  macroBarSegment: {
    height: '100%',
  },
  macroLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  macroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  graphRow: {
    marginBottom: 12,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  graphMetricName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  graphValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1D25',
  },
  graphTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  graphFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  viewToggleWrap: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
    width: 68,
    height: 34,
    alignItems: 'center',
  },
  slidingActivePill: {
    position: 'absolute',
    left: 3,
    top: 3,
    width: 31,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#1E1D25',
  },
  viewToggleTab: {
    width: 31,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  palmWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 14,
  },
  palmWarningIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  palmWarningBody: {
    flex: 1,
  },
  palmWarningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  palmWarningTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  palmWarningBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  palmWarningBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  palmWarningDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7F1D1D',
    lineHeight: 16,
  },
  ingredientsListCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    overflow: 'hidden',
    marginBottom: 16,
  },
  ingredientItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  ingredientItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  ingredientRankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCirclePalm: {
    backgroundColor: '#FEE2E2',
  },
  rankCircleSugar: {
    backgroundColor: '#FEF3C7',
  },
  ingredientRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
  },
  rankTextPalm: {
    color: '#B91C1C',
  },
  rankTextSugar: {
    color: '#B45309',
  },
  ingredientTextInfo: {
    flex: 1,
  },
  ingredientTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E1D25',
    lineHeight: 18,
  },
  ingredientTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  pillPalm: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillPalmText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  pillSugar: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillSugarText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D97706',
  },
  pillAllergen: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillAllergenText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  percentageBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentageBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E1D25',
  },
  labelTypographyCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    padding: 14,
    marginBottom: 16,
  },
  labelTextHeadline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelBodyText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    fontWeight: '500',
  },
  ingredientsPlaceholderText: {
    fontSize: 12.5,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  additivesBlock: {
    marginTop: 4,
  },
  additivesBlockHeader: {
    marginBottom: 10,
  },
  additivesBlockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1D25',
  },
  additivesSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  additivesCardsColumn: {
    gap: 10,
  },
  additiveDetailCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  additiveTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  additiveCodeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  additiveCodeChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  additiveCodeChipText: {
    fontSize: 11,
    fontWeight: '900',
  },
  additiveFullName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1D25',
    flex: 1,
  },
  additiveRiskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  additiveRiskIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  additiveRiskPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  additiveFunctionRole: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  additiveRoleValue: {
    fontWeight: '700',
    color: '#1E1D25',
  },
  additiveDetailedDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 16,
  },
  cleanAdditivesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cleanAdditivesIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanAdditivesMeta: {
    flex: 1,
  },
  cleanAdditivesHeadline: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#166534',
  },
  cleanAdditivesSubheadline: {
    fontSize: 12,
    fontWeight: '500',
    color: '#15803D',
    lineHeight: 16,
    marginTop: 2,
  },
});
