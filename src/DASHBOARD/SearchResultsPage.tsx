import React, { useState, useEffect, useRef } from 'react';
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
  searchAllProducts,
  getCachedSearchResults,
  PaginatedProducts,
} from './productService';
import { ProductDetailPage } from '../product-detail';
import { ProductGridSkeleton } from '../components/ProductCardSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const PAGE_SIZE = 20;

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const sansFont = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const boldSansFont = Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'sans-serif' });

export interface SearchResultsPageProps {
  visible: boolean;
  initialQuery?: string;
  onClose: () => void;
  onSelectProduct?: (product: ScannedProduct) => void;
}

export default function SearchResultsPage({
  visible,
  initialQuery = '',
  onClose,
  onSelectProduct,
}: SearchResultsPageProps) {
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
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
    if (visible) {
      isClosingRef.current = false;
      const initial = (initialQuery || '').trim();
      setQuery(initial);
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

      if (initial.length > 0) {
        let hasCache = false;
        getCachedSearchResults(initial, 1).then(cached => {
          if (cached && cached.products && cached.products.length > 0) {
            hasCache = true;
            setProducts(cached.products);
            setTotalCount(cached.total);
            setHasMore(cached.hasMore);
            setHasSearched(true);
            setLoading(false);
          }
        });

        const task = InteractionManager.runAfterInteractions(() => {
          if (!hasCache) setLoading(true);
          executeSearch(initial, 1, false);
        });
        return () => task.cancel();
      } else {
        setProducts([]);
        setTotalCount(0);
        setHasSearched(false);
      }
    } else {
      setProducts([]);
      setTotalCount(0);
      setPage(1);
      setHasMore(true);
      setHasSearched(false);
      setLoading(false);
      setLoadingMore(false);
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    }
  }, [visible, initialQuery]);

  const executeSearch = async (searchTerm: string, targetPage: number = 1, forceRefresh: boolean = false) => {
    const q = searchTerm.trim();
    if (!q) {
      setProducts([]);
      setTotalCount(0);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    if (isFetchingRef.current && !forceRefresh && targetPage > 1) return;
    isFetchingRef.current = true;

    if (targetPage === 1 && !refreshing) {
      setLoading(true);
    }
    setHasSearched(true);

    try {
      const res = await searchAllProducts(q, targetPage, PAGE_SIZE, forceRefresh);
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
      if (targetPage === 1) {
        setProducts([]);
        setTotalCount(0);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!text.trim()) {
      setProducts([]);
      setTotalCount(0);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      executeSearch(text, 1, false);
    }, 280);
  };

  const handleSearchSubmit = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setPage(1);
    executeSearch(query, 1, false);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || refreshing || !hasMore || !query.trim()) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    executeSearch(query, nextPage, false);
  };

  const handleRefresh = () => {
    if (!query.trim() || refreshing) return;
    setRefreshing(true);
    setPage(1);
    executeSearch(query, 1, true);
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

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        StyleSheet.absoluteFill,
        {
          zIndex: 1006,
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

        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={18} color="#FF6B35" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search all products & mart items..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus={!initialQuery}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setProducts([]);
                setTotalCount(0);
                setHasSearched(false);
              }}
              style={styles.clearBtn}
              accessibilityLabel="Clear Search"
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.infoSubBar}>
        <Text style={styles.resultsStatusText}>
          {loading
            ? 'Searching mart database...'
            : hasSearched
            ? `Found ${totalCount} product${totalCount === 1 ? '' : 's'}`
            : 'Enter a search term to find products'}
        </Text>
        {totalCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ProductGridSkeleton count={6} contentContainerStyle={{ paddingHorizontal: 16 }} />
      ) : products.length === 0 && hasSearched ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="search-outline" size={40} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No matching products</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find any products matching "{query}". Try checking the spelling or search by brand (e.g. Amul, Britannia, Maggi).
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.barcode || item.name}
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                <Text style={styles.footerLoaderText}>Loading more results...</Text>
              </View>
            ) : !hasMore && products.length > 10 ? (
              <View style={styles.footerEnded}>
                <Text style={styles.footerEndedText}>
                  Showing all {products.length} results
                </Text>
              </View>
            ) : (
              <View style={{ height: 16 }} />
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              activeOpacity={0.75}
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

              {/* Image */}
              <View style={styles.thumbnailWrapper}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.thumbnail}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={require('../../assets/dashboard/cat_food.png')}
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

      {/* Fallback Internal Product Detail Page if not using dashboard top-level */}
      {!onSelectProduct && (
        <ProductDetailPage
          visible={internalDetailVisible}
          product={internalSelectedProduct}
          onClose={() => setInternalDetailVisible(false)}
        />
      )}

      {/* Solid White Panel Behind Android System Navigation Buttons */}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E1D25',
    fontFamily: sansFont,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  infoSubBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  resultsStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: sansFont,
  },
  countBadge: {
    backgroundColor: '#FFE8DC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1D25',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
  },
  rowWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  listContent: {
    paddingTop: 14,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
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
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 10,
  },
  thumbnail: {
    width: '85%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    opacity: 0.35,
  },
  cardInfo: {
    marginBottom: 8,
    minHeight: 46,
  },
  productBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E949D',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1D25',
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F6F8',
  },
  verdictDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
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
