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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UniversalPanel from '../components/universalpanel';
import { ScannedProduct } from './productService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SCROLL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.58, 480);

const NOT_FOUND_IMAGE = require('../../assets/dashboard/illustration_not_found.png');


export interface ProductScanResultPanelProps {
  visible: boolean;
  loading: boolean;
  product: ScannedProduct | null;
  errorMessage?: string | null;
  onClose: () => void;
  onScanAnother: () => void;
  onGetMoreInfo?: () => void;
}

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function ProductScanResultPanel({
  visible,
  loading,
  product,
  errorMessage,
  onClose,
  onScanAnother,
  onGetMoreInfo,
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
                label: 'Get More Info',
                variant: 'secondary',
                onPress: () => {
                  if (onGetMoreInfo) {
                    onGetMoreInfo();
                  } else if (product) {
                    const barcode = product.barcode;
                    if (barcode) {
                      Linking.openURL(`https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`).catch(() => {
                        const q = encodeURIComponent(`${product.brand} ${product.name} nutrition ingredients`);
                        Linking.openURL(`https://www.google.com/search?q=${q}`).catch(() => {});
                      });
                    } else {
                      const q = encodeURIComponent(`${product.brand} ${product.name} nutrition ingredients`);
                      Linking.openURL(`https://www.google.com/search?q=${q}`).catch(() => {});
                    }
                  } else {
                    onScanAnother();
                  }
                },
              },
              {
                label: 'Done',
                variant: 'blue',
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
        // Error state — custom illustration
        <View style={styles.errorContainer}>
          <Image
            source={require('../../assets/dashboard/illustration_not_found.png')}
            style={styles.notFoundIllustration}
            resizeMode="contain"
          />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
        </View>
      ) : product ? (
        // Loaded Product Detail & Proper Graph View
        <View style={styles.resultContent}>
          {/* Product Image Banner */}
          <View style={styles.productImageBanner}>
            {product.imageUrl && !imageLoadError ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.productBannerImg}
                resizeMode="contain"
                onError={() => setImageLoadError(true)}
              />
            ) : (
              <Image
                source={NOT_FOUND_IMAGE}
                style={styles.productBannerImg}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productHeader}>
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

          {/* Modern Health / Clean Score Card */}
          <View style={styles.scoreHeroCard}>
            {/* Header: Tag */}
            <View style={styles.scoreCardTopRow}>
              <View style={styles.scoreTagRow}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logoTagIcon}
                  resizeMode="contain"
                />
                <Text style={styles.scoreTagText}>
                  {product.productType === 'beauty' ? 'FOODCO CLEAN INDEX' : 'FOODCO HEALTH INDEX'}
                </Text>
              </View>
            </View>

            {/* Middle: Big Score + Meter */}
            <View style={styles.scoreMainRow}>
              <View style={[styles.scoreBadgeBox, { backgroundColor: `${product.verdictColor}0E`, borderColor: `${product.verdictColor}28` }]}>
                <Text style={[styles.scoreNumberMain, { color: product.verdictColor }]}>
                  {product.aiHealthRating}
                </Text>
                <Text style={[styles.scoreMaxSub, { color: product.verdictColor }]}>/100</Text>
              </View>

              <View style={styles.meterContainer}>
                <View style={styles.meterHeader}>
                  <Text style={styles.meterTitle}>
                    {product.productType === 'beauty' ? 'Clean Safety Rating' : 'Nutritional Rating'}
                  </Text>
                  <Text style={[styles.meterPercent, { color: product.verdictColor }]}>
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

                <View style={styles.meterLabels}>
                  <Text style={styles.meterLabelText}>Poor</Text>
                  <Text style={styles.meterLabelText}>Moderate</Text>
                  <Text style={styles.meterLabelText}>Optimal</Text>
                </View>
              </View>
            </View>

            {/* Bottom: Insight banner */}
            <View style={[styles.scoreInsightBox, { backgroundColor: `${product.verdictColor}0A`, borderColor: `${product.verdictColor}20` }]}>
              <Ionicons
                name={product.aiHealthRating >= 60 ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={product.verdictColor}
                style={styles.insightIcon}
              />
              <Text style={styles.scoreDescText}>
                {product.insight ||
                  (product.productType === 'beauty'
                    ? (product.aiHealthRating >= 70
                        ? 'Clean & gentle formulation with safe, verified skin ingredients.'
                        : product.aiHealthRating >= 40
                        ? 'Contains potential allergens or sensitizers. Patch test recommended.'
                        : 'Formulation contains high-hazard chemicals or endocrine concerns.')
                    : (product.aiHealthRating >= 70
                        ? 'Great nutritional choice with clean, balanced nutrients.'
                        : product.aiHealthRating >= 40
                        ? 'Moderate nutritional value. Safe in moderate portions.'
                        : 'Poor rating. High in sugar or saturated fats. Limit intake.'))}
              </Text>
            </View>
          </View>
        </View>
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
  notFoundIllustration: {
    width: 200,
    height: 200,
    marginBottom: 16,
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
    flexShrink: 1,
  },
  resultContent: {
    paddingBottom: 0,
  },
  productImageBanner: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  productBannerImg: {
    width: '100%',
    height: '100%',
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
    borderRadius: 22,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  scoreCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  scoreTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoTagIcon: {
    width: 17,
    height: 17,
  },
  scoreTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E95A2',
    letterSpacing: 0.8,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  verdictDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verdictBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  scoreMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  scoreBadgeBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumberMain: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 34,
  },
  scoreMaxSub: {
    fontSize: 10,
    fontWeight: '800',
    opacity: 0.8,
    marginTop: -2,
  },
  meterContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  meterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  meterPercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  meterTrack: {
    height: 8,
    backgroundColor: '#F1F3F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meterLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  scoreInsightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  insightIcon: {
    marginRight: 8,
  },
  scoreDescText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    lineHeight: 17,
  },
});
