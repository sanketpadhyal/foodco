import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  Easing,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ScannedProduct, fetchProductsByCategory } from './productService';
import { ProductDetailPage } from '../product-detail';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const sansFont = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const boldSansFont = Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'sans-serif' });

export interface CategoryProductsPageProps {
  visible: boolean;
  category: {
    id: string;
    title: string;
    subtitle: string;
    bgColor: string;
    image: any;
  } | null;
  onClose: () => void;
}

type FilterOption = 'all' | 'safe' | 'high_nutri' | 'palm_free';

export default function CategoryProductsPage({
  visible,
  category,
  onClose,
}: CategoryProductsPageProps) {
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // 💥 Pop-up animation values
  const popupScale = useRef(new Animated.Value(0.88)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslateY = useRef(new Animated.Value(35)).current;

  useEffect(() => {
    if (visible && category) {
      setSearchQuery('');
      setActiveFilter('all');
      setLoading(true);

      // Instantaneous pop-up entrance animation
      popupScale.setValue(0.88);
      popupOpacity.setValue(0);
      popupTranslateY.setValue(35);

      Animated.parallel([
        Animated.spring(popupScale, {
          toValue: 1,
          friction: 7.5,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(popupOpacity, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(popupTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      loadCategoryProducts(category.id);
    } else {
      setProducts([]);
    }
  }, [visible, category]);

  const loadCategoryProducts = async (catId: string, search: string = '') => {
    setLoading(true);
    try {
      const res = await fetchProductsByCategory(catId, search, 80);
      setProducts(res.products);
      setTotalCount(res.total);
    } catch (_) {
      // Handled inside service
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!category) return;
    loadCategoryProducts(category.id, text);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (activeFilter === 'safe') {
        return (p.aiHealthRating || 0) >= 70;
      }
      if (activeFilter === 'high_nutri') {
        return p.nutriScore === 'A' || p.nutriScore === 'B';
      }
      if (activeFilter === 'palm_free') {
        return !p.hasPalmOil;
      }
      return true;
    });
  }, [products, activeFilter]);

  const handleProductPress = (product: ScannedProduct) => {
    setSelectedProduct(product);
    setDetailVisible(true);
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(popupScale, {
        toValue: 0.9,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(popupTranslateY, {
        toValue: 30,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible || !category) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: popupOpacity,
            transform: [
              { scale: popupScale },
              { translateY: popupTranslateY },
            ],
          },
        ]}
      >
        <StatusBar style="dark" />
        <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

        {/* Top Header */}
        <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={handleClose}
            activeOpacity={0.7}
            accessibilityLabel="Go Back"
          >
            <Ionicons name="chevron-back" size={22} color="#1E1D25" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {category.title}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {category.subtitle}
            </Text>
          </View>

          <View style={[styles.countPill, { backgroundColor: category.bgColor }]}>
            <Text style={styles.countPillText}>
              {totalCount > 0 ? `${totalCount}` : '•'}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={17} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${category.title}...`}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearchChange}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersWrapper}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              All ({products.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'safe' && styles.filterChipActive]}
            onPress={() => setActiveFilter('safe')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'safe' && styles.filterChipTextActive]}>
              🛡️ Safe Choice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'high_nutri' && styles.filterChipActive]}
            onPress={() => setActiveFilter('high_nutri')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'high_nutri' && styles.filterChipTextActive]}>
              ⭐ Grade A/B
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'palm_free' && styles.filterChipActive]}
            onPress={() => setActiveFilter('palm_free')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'palm_free' && styles.filterChipTextActive]}>
              🌴 Palm-Free
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading all {category.title} products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={category.image}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with another keyword or clearing your filter.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.barcode}
            numColumns={2}
            contentContainerStyle={[styles.gridContainer, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrapper}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productCard}
                activeOpacity={0.84}
                onPress={() => handleProductPress(item)}
              >
                {/* Score & Nutri-Score Top Badges */}
                <View style={styles.cardBadgeRow}>
                  <View
                    style={[
                      styles.scorePill,
                      { backgroundColor: `${item.verdictColor || '#10B981'}15` },
                    ]}
                  >
                    <Text style={[styles.scorePillText, { color: item.verdictColor || '#10B981' }]}>
                      {item.aiHealthRating}/100
                    </Text>
                  </View>

                  {item.nutriScore && (
                    <View
                      style={[
                        styles.nutriPill,
                        {
                          backgroundColor:
                            item.nutriScore === 'A'
                              ? '#038141'
                              : item.nutriScore === 'B'
                              ? '#85BB2F'
                              : item.nutriScore === 'C'
                              ? '#FECB02'
                              : item.nutriScore === 'D'
                              ? '#EE8100'
                              : '#E63E11',
                        },
                      ]}
                    >
                      <Text style={styles.nutriPillText}>{item.nutriScore}</Text>
                    </View>
                  )}
                </View>

                {/* Product Thumbnail */}
                <View style={styles.thumbnailWrapper}>
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.thumbnail}
                      resizeMode="contain"
                    />
                  ) : (
                    <Image
                      source={category.image}
                      style={styles.thumbnailPlaceholder}
                      resizeMode="contain"
                    />
                  )}
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.productBrand} numberOfLines={1}>
                    {item.brand || 'Mart Selection'}
                  </Text>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>

                {/* Bottom Verdict Row */}
                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.verdictDot,
                      { backgroundColor: item.verdictColor || '#10B981' },
                    ]}
                  />
                  <Text
                    style={[styles.verdictLabel, { color: item.verdictColor || '#10B981' }]}
                    numberOfLines={1}
                  >
                    {item.verdict || 'Good Choice'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Deep-Dive Product Info Page */}
        <ProductDetailPage
          visible={detailVisible}
          product={selectedProduct}
          onClose={() => setDetailVisible(false)}
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1D25',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E949D',
    marginTop: 2,
  },
  countPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  countPillText: {
    fontFamily: boldSansFont,
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1D25',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBarWrapper: {
    height: 46,
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
    color: '#1E1D25',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  filtersWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  filterChipActive: {
    backgroundColor: '#1E1D25',
    borderColor: '#1E1D25',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8489',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyImage: {
    width: 90,
    height: 90,
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1D25',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  gridContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scorePillText: {
    fontFamily: boldSansFont,
    fontSize: 11,
    fontWeight: '800',
  },
  nutriPill: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  thumbnailWrapper: {
    width: '100%',
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    opacity: 0.7,
  },
  cardInfo: {
    marginTop: 6,
    minHeight: 46,
  },
  productBrand: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1D25',
    lineHeight: 17,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F6F8',
    gap: 6,
  },
  verdictDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verdictLabel: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});
