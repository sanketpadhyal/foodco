import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Platform,
  BackHandler,
  Share,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScannedProduct } from '../DASHBOARD/productService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export default function ProductDetailPage({
  visible,
  product,
  onClose,
}: ProductDetailPageProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted || !product) return null;

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

  const statusBarHeight = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : insets.top;
  const headerPaddingTop = Math.max(insets.top, statusBarHeight) + 8;
  const bottomNavPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 20) + 48;

  return (
    <Animated.View
      style={[
        styles.fullContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
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

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavPadding }]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        overScrollMode="always"
        scrollEventThrottle={16}
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

        {/* Ingredients & Chemical Additives */}
        <View style={styles.detailSectionCard}>
          <Text style={styles.sectionHeaderTitle}>Ingredients & Additives</Text>

          {product.hasPalmOil ? (
            <View style={styles.warningAlertBox}>
              <Ionicons name="warning-outline" size={17} color="#B91C1C" />
              <Text style={styles.warningAlertText}>
                Contains Palm Oil or hydrogenated vegetable fats.
              </Text>
            </View>
          ) : null}

          {product.ingredientsSummary ? (
            <View style={styles.ingredientsTextBlock}>
              <Text style={styles.ingredientsBodyText}>
                {product.ingredientsSummary}
              </Text>
            </View>
          ) : (
            <Text style={styles.ingredientsPlaceholderText}>
              Ingredients information provided by manufacturer packaging.
            </Text>
          )}

          {Array.isArray(product.additives) && product.additives.length > 0 ? (
            <View style={styles.additivesWrapper}>
              <Text style={styles.subSectionTitle}>
                Detected Additives ({product.additives.length})
              </Text>
              <View style={styles.additivesChipsRow}>
                {product.additives.map((additive, idx) => (
                  <View key={idx} style={styles.additiveChip}>
                    <Text style={styles.additiveChipText}>{additive}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.cleanAdditivesBox}>
              <Ionicons name="checkmark-circle-outline" size={17} color="#15803D" />
              <Text style={styles.cleanAdditivesText}>
                No concerning artificial additives detected in this formulation.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8F9FA',
    zIndex: 99999,
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
    zIndex: 10,
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
  warningAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  warningAlertText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#991B1B',
    lineHeight: 17,
  },
  ingredientsTextBlock: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 14,
  },
  ingredientsBodyText: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 19,
    fontWeight: '500',
  },
  ingredientsPlaceholderText: {
    fontSize: 12.5,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  additivesWrapper: {
    marginTop: 4,
  },
  additivesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  additiveChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  additiveChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#374151',
  },
  cleanAdditivesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  cleanAdditivesText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#166534',
  },
});
