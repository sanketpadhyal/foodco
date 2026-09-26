import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import UniversalPanel from '../components/universalpanel';
import { ScannedProduct } from './productService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SCROLL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.58, 480);

const CAT_FALLBACKS: Record<string, any> = {
  drinks: require('../../assets/dashboard/cat_drinks.png'),
  chocolates: require('../../assets/dashboard/cat_chocolates.png'),
  biscuits: require('../../assets/dashboard/cat_biscuits.png'),
  food: require('../../assets/dashboard/cat_food.png'),
  dairy: require('../../assets/dashboard/dish_yogurt.png'),
  beauty: require('../../assets/dashboard/cat_beauty.png'),
  default: require('../../assets/dashboard/banner_card.png'),
};

function getCategoryFallback(category?: string, name?: string) {
  const str = `${category || ''} ${name || ''}`.toLowerCase();
  if (/drink|soda|coke|beverage|cola/i.test(str)) return CAT_FALLBACKS.drinks;
  if (/chocolate|spread|nutella|snickers|candy|sweet/i.test(str)) return CAT_FALLBACKS.chocolates;
  if (/biscuit|cookie|oreo|wafer/i.test(str)) return CAT_FALLBACKS.biscuits;
  if (/noodle|pasta|maggi|chips|lays|snack/i.test(str)) return CAT_FALLBACKS.food;
  if (/butter|milk|yogurt|dairy|cheese/i.test(str)) return CAT_FALLBACKS.dairy;
  return CAT_FALLBACKS.default;
}

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
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setImageLoadError(false);
  }, [product?.barcode, product?.imageUrl]);

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
      title={loading ? 'Analyzing Product...' : undefined}
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

          <Text style={styles.scanningFetchingText}>
            ⚡ Fetching verified mart data & health rating...
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
              {product.imageUrl && !imageLoadError ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="contain"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <Image
                  source={getCategoryFallback(product.category, product.name)}
                  style={styles.productImage}
                  resizeMode="contain"
                />
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

          {/* Premium Quality Health Scorecard */}
          <View style={styles.scoreHeroCard}>
            {/* Foodco AI Health Rating */}
            <View style={[styles.scorePillarCard, styles.centerPillar]}>
              <View style={styles.scoreNumberRow}>
                <Text style={[styles.scoreLargeNumber, { color: product.verdictColor }]}>
                  {product.aiHealthRating}
                </Text>
                <Text style={styles.scoreMaxText}>/100</Text>
              </View>
              <View style={[styles.verdictPill, { backgroundColor: `${product.verdictColor}14` }]}>
                <Text style={[styles.verdictText, { color: product.verdictColor }]}>
                  {product.verdict}
                </Text>
              </View>
              <Text style={styles.pillarSub}>Foodco Index</Text>
            </View>
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
    maxHeight: MAX_SCROLL_HEIGHT,
  },
  resultContent: {
    paddingBottom: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFC',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    marginBottom: 8,
  },
  scorePillarCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  centerPillar: {
    flex: 1.35,
  },
  pillarDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E5E7EB',
  },
  nutriScoreBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriScoreLetter: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  pillarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1D25',
    marginTop: 6,
  },
  pillarSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreLargeNumber: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
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
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  verdictText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  novaBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  novaNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
});
