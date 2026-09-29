import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  BackHandler,
  InteractionManager,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  ScannedProduct,
  fetchProductsByCategory,
  getCachedCategoryPage,
  PaginatedProducts,
} from './productService';
import { ProductDetailPage } from '../product-detail';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const PAGE_SIZE = 20;

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
  onSelectProduct?: (product: ScannedProduct) => void;
}

export default function CategoryProductsPage({
  visible,
  category,
  onClose,
  onSelectProduct,
}: CategoryProductsPageProps) {
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [internalSelectedProduct, setInternalSelectedProduct] = useState<ScannedProduct | null>(null);
  const [internalDetailVisible, setInternalDetailVisible] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  const popupScale = useRef(new Animated.Value(0.92)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslateY = useRef(new Animated.Value(28)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      try {
        const NavigationBar = require('expo-navigation-bar');
        NavigationBar.setBackgroundColorAsync?.('#FFFFFF');
        NavigationBar.setButtonStyleAsync?.('dark');
        NavigationBar.setBorderColorAsync?.('#EEF0F4');
      } catch (_) {}
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      handleClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible]);

  useEffect(() => {
    if (visible && category) {
      isClosingRef.current = false;
      setSearchQuery('');
      setPage(1);

      popupScale.setValue(0.92);
      popupOpacity.setValue(0);
      popupTranslateY.setValue(28);

      Animated.parallel([
        Animated.spring(popupScale, {
          toValue: 1,
          friction: 8,
          tension: 75,
          useNativeDriver: true,
        }),
        Animated.timing(popupOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(popupTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

      let hasCache = false;
      getCachedCategoryPage(category.id, 1, '').then(cached => {
        if (cached && cached.products && cached.products.length > 0) {
          hasCache = true;
          setProducts(cached.products);
          setTotalCount(cached.total);
          setHasMore(cached.hasMore);
          setLoading(false);
        }
      });

      const task = InteractionManager.runAfterInteractions(() => {
        if (!hasCache) {
          setLoading(true);
        }
        loadCategoryProducts(category.id, 1, '', false);
      });

      return () => task.cancel();
    } else {
      setProducts([]);
      setTotalCount(0);
      setPage(1);
      setHasMore(true);
      setLoading(false);
      setLoadingMore(false);
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    }
  }, [visible, category]);

  const loadCategoryProducts = async (
    catId: string,
    targetPage: number = 1,
    search: string = '',
    forceRefresh: boolean = false
  ) => {
    if (isFetchingRef.current && !forceRefresh && targetPage > 1) return;
    isFetchingRef.current = true;

    try {
      const res = await fetchProductsByCategory(catId, targetPage, PAGE_SIZE, search, forceRefresh);
      if (targetPage === 1) {
        setProducts(res.products);
      } else {
        setProducts(prev => {
          const existingBarcodes = new Set(prev.map(p => p.barcode));
          const uniqueNew = res.products.filter(p => !existingBarcodes.has(p.barcode));
          return [...prev, ...uniqueNew];
        });
      }
      setTotalCount(res.total);
      setPage(targetPage);
      setHasMore(res.hasMore);
    } catch (_) {

    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!category) return;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      setLoading(true);
      setPage(1);
      loadCategoryProducts(category.id, 1, text, false);
    }, 280);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || refreshing || !hasMore || !category) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    loadCategoryProducts(category.id, nextPage, searchQuery, false);
  };

  const handleRefresh = () => {
    if (!category || refreshing) return;
    setRefreshing(true);
    setPage(1);
    loadCategoryProducts(category.id, 1, searchQuery, true);
  };

  const handleProductPress = (product: ScannedProduct) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    } else {
      setInternalSelectedProduct(product);
      setInternalDetailVisible(true);
    }
  };

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    Animated.parallel([
      Animated.timing(popupScale, {
        toValue: 0.94,
        duration: 170,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(popupTranslateY, {
        toValue: 24,
        duration: 170,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible || !category) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        StyleSheet.absoluteFill,
        {
          zIndex: 998,
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

      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          onPress={handleClose}
          activeOpacity={0.65}
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
            {totalCount > 0 ? `${totalCount}` : products.length > 0 ? `${products.length}` : '•'}
          </Text>
        </View>
      </View>

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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading {category.title} products...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={category.image}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with another keyword.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.barcode}
          numColumns={2}
          contentContainerStyle={[
            styles.gridContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 36 },
          ]}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.footerLoaderText}>Loading more products...</Text>
              </View>
            ) : !hasMore && products.length > 10 ? (
              <View style={styles.footerEnded}>
                <Text style={styles.footerEndedText}>
                  Showing all {products.length} {category.title.toLowerCase()} products
                </Text>
              </View>
            ) : (
              <View style={{ height: 16 }} />
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              activeOpacity={0.78}
              onPress={() => handleProductPress(item)}
            >

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

              <View style={styles.cardInfo}>
                <Text style={styles.productBrand} numberOfLines={1}>
                  {item.brand || 'Mart Selection'}
                </Text>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>

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

      {!onSelectProduct && (
        <ProductDetailPage
          visible={internalDetailVisible}
          product={internalSelectedProduct}
          onClose={() => setInternalDetailVisible(false)}
        />
      )}

      <View
        style={[
          styles.bottomNavBackdrop,
          { height: insets.bottom > 0 ? insets.bottom : 0 },
        ]}
        pointerEvents="none"
      />
    </Animated.View>
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
  bottomNavBackdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    zIndex: 999,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  footerEnded: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  footerEndedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0B5BC',
    textAlign: 'center',
  },
});
