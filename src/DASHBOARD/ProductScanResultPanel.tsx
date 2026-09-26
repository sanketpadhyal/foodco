import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from 'react-native';
import UniversalPanel from '../components/universalpanel';
import { ScannedProduct } from './productService';

export interface ProductScanResultPanelProps {
  visible: boolean;
  loading: boolean;
  product: ScannedProduct | null;
  errorMessage?: string | null;
  onClose: () => void;
  onScanAnother: () => void;
}

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function ProductScanResultPanel({
  visible,
  loading,
  product,
  errorMessage,
  onClose,
  onScanAnother,
}: ProductScanResultPanelProps) {
  // Skeleton pulse animation
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (loading) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      anim?.stop();
    };
  }, [loading]);

  const getNutriColor = (grade?: 'A' | 'B' | 'C' | 'D' | 'E') => {
    switch (grade) {
      case 'A': return '#10B981';
      case 'B': return '#58B84F';
      case 'C': return '#F59E0B';
      case 'D': return '#FF6B35';
      case 'E': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const nutriColor = getNutriColor(product?.nutriScore);

  return (
    <UniversalPanel
      visible={visible}
      title={loading ? 'Analyzing Product...' : product?.name || 'Scanned Product'}
      dismissOnBackdropPress={!loading}
      onClose={onClose}
      actions={
        loading
          ? []
          : [
              {
                label: 'Scan Another',
                variant: 'secondary',
                onPress: onScanAnother,
              },
              {
                label: 'Done',
                variant: 'primary',
                onPress: onClose,
              },
            ]
      }
    >
      {loading ? (
        // Skeleton Loader View
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonHeaderRow}>
            <Animated.View style={[styles.skeletonImage, { opacity: pulseAnim }]} />
            <View style={styles.skeletonHeaderMeta}>
              <Animated.View style={[styles.skeletonLine, { width: '85%', height: 18, opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonLine, { width: '55%', height: 14, marginTop: 8, opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonLine, { width: '40%', height: 12, marginTop: 8, opacity: pulseAnim }]} />
            </View>
          </View>

          {/* Skeleton Badges */}
          <View style={styles.skeletonBadgeRow}>
            <Animated.View style={[styles.skeletonBadge, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonBadge, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonBadge, { opacity: pulseAnim }]} />
          </View>

          {/* Skeleton Graph Container */}
          <View style={styles.skeletonGraphCard}>
            <Animated.View style={[styles.skeletonLine, { width: '45%', height: 14, marginBottom: 16, opacity: pulseAnim }]} />
            {[80, 55, 90, 40, 65].map((pct, idx) => (
              <View key={idx} style={styles.skeletonGraphRow}>
                <Animated.View style={[styles.skeletonLine, { width: 60, height: 10, opacity: pulseAnim }]} />
                <View style={styles.skeletonTrack}>
                  <Animated.View style={[styles.skeletonFill, { width: `${pct}%`, opacity: pulseAnim }]} />
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.scanningFetchingText}>
            ⚡ Fetching mart database & running AI chemical analysis...
          </Text>
        </View>
      ) : errorMessage && !product ? (
        // Error state
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
        </View>
      ) : product ? (
        // Loaded Product Detail & Proper Graph View
        <ScrollView
          style={styles.resultScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultContent}
        >
          {/* Header Row: Image & Info */}
          <View style={styles.productHeader}>
            <View style={styles.productImageWrapper}>
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Text style={styles.productPlaceholderEmoji}>🛒</Text>
                </View>
              )}
            </View>
            <View style={styles.productMeta}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productBrand} numberOfLines={1}>
                {product.brand} • <Text style={styles.productCategory}>{product.category}</Text>
              </Text>
              <View style={styles.barcodeChip}>
                <Text style={styles.barcodeIcon}>|||||</Text>
                <Text style={styles.barcodeText}>{product.barcode}</Text>
              </View>
            </View>
          </View>

          {/* AI Health Score & Nutri-Score Card */}
          <View style={[styles.scoreHeroCard, { borderColor: `${nutriColor}33` }]}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreBadgeWrap}>
                <View style={[styles.nutriScoreBadge, { backgroundColor: nutriColor }]}>
                  <Text style={styles.nutriScoreLetter}>{product.nutriScore}</Text>
                </View>
                <Text style={styles.nutriScoreLabel}>Nutri-Score</Text>
              </View>

              <View style={styles.aiRatingCenter}>
                <View style={styles.scoreNumberRow}>
                  <Text style={[styles.scoreLargeNumber, { color: product.verdictColor }]}>
                    {product.aiHealthRating}
                  </Text>
                  <Text style={styles.scoreMaxText}>/100</Text>
                </View>
                <View style={[styles.verdictPill, { backgroundColor: `${product.verdictColor}18` }]}>
                  <Text style={[styles.verdictText, { color: product.verdictColor }]}>
                    {product.verdict}
                  </Text>
                </View>
              </View>

              {product.novaGroup ? (
                <View style={styles.novaBadgeWrap}>
                  <View style={[styles.novaBadge, { backgroundColor: product.novaGroup === 4 ? '#EF4444' : '#10B981' }]}>
                    <Text style={styles.novaNumber}>{product.novaGroup}</Text>
                  </View>
                  <Text style={styles.novaLabel}>NOVA Group</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* PROPER NUTRITION BREAKDOWN GRAPH */}
          <View style={styles.graphSection}>
            <View style={styles.graphSectionHeader}>
              <Text style={styles.graphSectionTitle}>Nutrition Breakdown Graph</Text>
              <Text style={styles.graphSectionSub}>Per 100g / 100ml serving</Text>
            </View>

            <View style={styles.graphCard}>
              {/* Calories Metric */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelCol}>
                  <Text style={styles.metricName}>Calories</Text>
                  <Text style={styles.metricValue}>{product.metrics.calories} kcal</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, (product.metrics.calories / 600) * 100)}%`,
                        backgroundColor: product.metrics.calories > 400 ? '#EF4444' : '#FF6B35',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Sugars Metric */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelCol}>
                  <Text style={styles.metricName}>Sugars</Text>
                  <Text style={[styles.metricValue, { color: product.metrics.sugars > 15 ? '#EF4444' : '#1E1D25' }]}>
                    {product.metrics.sugars}g
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, (product.metrics.sugars / 50) * 100)}%`,
                        backgroundColor: product.metrics.sugars > 15 ? '#EF4444' : product.metrics.sugars > 5 ? '#F59E0B' : '#10B981',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Saturated Fat */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelCol}>
                  <Text style={styles.metricName}>Sat. Fat</Text>
                  <Text style={[styles.metricValue, { color: product.metrics.saturatedFat > 5 ? '#EF4444' : '#1E1D25' }]}>
                    {product.metrics.saturatedFat}g
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, (product.metrics.saturatedFat / 20) * 100)}%`,
                        backgroundColor: product.metrics.saturatedFat > 5 ? '#EF4444' : '#F59E0B',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Protein */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelCol}>
                  <Text style={styles.metricName}>Protein</Text>
                  <Text style={[styles.metricValue, { color: '#10B981' }]}>
                    {product.metrics.protein}g
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, (product.metrics.protein / 25) * 100)}%`,
                        backgroundColor: '#10B981',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Fiber */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelCol}>
                  <Text style={styles.metricName}>Fiber</Text>
                  <Text style={[styles.metricValue, { color: '#10B981' }]}>
                    {product.metrics.fiber}g
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, (product.metrics.fiber / 15) * 100)}%`,
                        backgroundColor: '#10B981',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Salt */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabelCol}>
                  <Text style={styles.metricName}>Salt</Text>
                  <Text style={styles.metricValue}>{product.metrics.salt}g</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, (product.metrics.salt / 3) * 100)}%`,
                        backgroundColor: product.metrics.salt > 1.2 ? '#EF4444' : '#58B84F',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Harmful Additives & Chemical Alerts */}
          <View style={styles.alertsCard}>
            <Text style={styles.alertsTitle}>Chemicals & Additives Detection</Text>

            {product.hasPalmOil && (
              <View style={styles.palmOilWarning}>
                <Text style={styles.palmOilIcon}>⚠️</Text>
                <View style={styles.palmOilTextCol}>
                  <Text style={styles.palmOilHeading}>Contains Palm Oil / Palmolein</Text>
                  <Text style={styles.palmOilSub}>High saturated fat, linked to cardiovascular risk.</Text>
                </View>
              </View>
            )}

            {product.additives && product.additives.length > 0 ? (
              <View style={styles.additivesListWrap}>
                <Text style={styles.additivesSubtitle}>
                  {product.additives.length} Additive{product.additives.length > 1 ? 's' : ''} Identified:
                </Text>
                <View style={styles.additivesChips}>
                  {product.additives.map((add, idx) => (
                    <View key={idx} style={styles.additiveChip}>
                      <Text style={styles.additiveChipText}>{add}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.cleanAdditivesBadge}>
                <Text style={styles.cleanEmoji}>✨</Text>
                <Text style={styles.cleanText}>No harmful E-number additives detected</Text>
              </View>
            )}

            {product.ingredientsSummary && (
              <View style={styles.ingredientsBox}>
                <Text style={styles.ingredientsHeading}>Ingredients:</Text>
                <Text style={styles.ingredientsText}>{product.ingredientsSummary}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}
    </UniversalPanel>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingVertical: 12,
  },
  skeletonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonImage: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  skeletonHeaderMeta: {
    flex: 1,
    marginLeft: 14,
  },
  skeletonLine: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  skeletonBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonBadge: {
    width: '30%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  skeletonGraphCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  skeletonGraphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginLeft: 12,
    overflow: 'hidden',
  },
  skeletonFill: {
    height: '100%',
    backgroundColor: '#D1D5DB',
    borderRadius: 6,
  },
  scanningFetchingText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1D25',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  resultScroll: {
    maxHeight: 460,
  },
  resultContent: {
    paddingBottom: 8,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productImageWrapper: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPlaceholderEmoji: {
    fontSize: 34,
  },
  productMeta: {
    flex: 1,
    marginLeft: 14,
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1D25',
    lineHeight: 22,
  },
  productBrand: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  productCategory: {
    color: '#FF6B35',
  },
  barcodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  barcodeIcon: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#6B7280',
    marginRight: 4,
  },
  barcodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  scoreHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  scoreBadgeWrap: {
    alignItems: 'center',
  },
  nutriScoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  nutriScoreLetter: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  nutriScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  aiRatingCenter: {
    alignItems: 'center',
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreLargeNumber: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: serifFont,
  },
  scoreMaxText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '700',
    marginLeft: 2,
  },
  verdictPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 3,
  },
  verdictText: {
    fontSize: 11,
    fontWeight: '800',
  },
  novaBadgeWrap: {
    alignItems: 'center',
  },
  novaBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  novaNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  novaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  graphSection: {
    marginBottom: 16,
  },
  graphSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  graphSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1D25',
  },
  graphSectionSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  graphCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricLabelCol: {
    width: 82,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  metricName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1D25',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  alertsCard: {
    backgroundColor: '#FFF8F5',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE4D6',
    marginBottom: 10,
  },
  alertsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#C2410C',
    marginBottom: 8,
  },
  palmOilWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 8,
  },
  palmOilIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  palmOilTextCol: {
    flex: 1,
  },
  palmOilHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },
  palmOilSub: {
    fontSize: 10.5,
    color: '#7F1D1D',
    marginTop: 1,
  },
  additivesListWrap: {
    marginTop: 6,
  },
  additivesSubtitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  additivesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  additiveChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  additiveChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C2410C',
  },
  cleanAdditivesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  cleanEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  cleanText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  ingredientsBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFE4D6',
  },
  ingredientsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 2,
  },
  ingredientsText: {
    fontSize: 11,
    color: '#7C2D12',
    lineHeight: 16,
  },
});
