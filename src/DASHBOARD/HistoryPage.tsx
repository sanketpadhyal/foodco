import React, { useState, useEffect, useRef, useCallback, useReducer, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  Easing,
  Platform,
  StatusBar as RNStatusBar,
  Dimensions,
  BackHandler,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getStoredJwtToken } from '../auth-page/authService';
import { getBackendBaseUrl } from '../../api/universalbackendapi';
import {
  ScannedProduct,
  getMemoryHistory,
  getPersistedHistory,
  setMemoryHistory,
} from './productService';
import { DashboardNavbar, DashboardTab } from './components';
import { ProductGridSkeleton } from '../components/ProductCardSkeleton';

const EMPTY_404_ILLUSTRATION = require('../../assets/page-found-concept-illustration_114360-1869 (1).png');
const NOT_FOUND_IMG = require('../../assets/notfound.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = 236;
const CARD_MARGIN_BOTTOM = 16;
const ROW_TOTAL_HEIGHT = CARD_HEIGHT + CARD_MARGIN_BOTTOM;

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const sansFont = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

type Phase = 'loading' | 'ready' | 'empty';

type HistoryState = {
  items: ScannedProduct[];
  phase: Phase;
  refreshing: boolean;
};

type HistoryAction =
  | { type: 'SHOW_CACHED'; items: ScannedProduct[] }
  | { type: 'SHOW_LOADING' }
  | { type: 'SHOW_EMPTY' }
  | { type: 'START_REFRESH' }
  | { type: 'FETCH_SUCCESS'; items: ScannedProduct[] }
  | { type: 'FETCH_ERROR' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SHOW_CACHED':
      return { items: action.items, phase: 'ready', refreshing: false };
    case 'SHOW_LOADING':
      if (state.items.length > 0) return state;
      return { items: [], phase: 'loading', refreshing: false };
    case 'SHOW_EMPTY':
      return { items: [], phase: 'empty', refreshing: false };
    case 'START_REFRESH':
      return { ...state, refreshing: true };
    case 'FETCH_SUCCESS': {
      const isSame =
        state.items.length === action.items.length &&
        state.items.every((it, idx) => it.barcode === action.items[idx]?.barcode);
      if (isSame && state.phase === (action.items.length > 0 ? 'ready' : 'empty')) {
        return state.refreshing ? { ...state, refreshing: false } : state;
      }
      return {
        items: action.items,
        phase: action.items.length > 0 ? 'ready' : 'empty',
        refreshing: false,
      };
    }
    case 'FETCH_ERROR':
      return {
        ...state,
        refreshing: false,
        phase: state.items.length > 0 ? 'ready' : 'empty',
      };
    default:
      return state;
  }
}

function initState(): HistoryState {
  const cached = getMemoryHistory();
  if (cached && cached.length > 0) return { items: cached, phase: 'ready', refreshing: false };
  if (cached && cached.length === 0) return { items: [], phase: 'empty', refreshing: false };
  return { items: [], phase: 'loading', refreshing: false };
}

export interface HistoryPageProps {
  visible: boolean;
  user?: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
  };
  onClose: () => void;
  onSelectProduct?: (product: ScannedProduct) => void;
  onTabPress?: (tab: DashboardTab) => void;
  onScanPress?: () => void;
  onGithubPress?: () => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
}

export default function HistoryPage({
  visible,
  user,
  onClose,
  onSelectProduct,
  onTabPress,
  onScanPress,
  onGithubPress,
  onProfilePress,
  onLogout,
}: HistoryPageProps) {
  const insets = useSafeAreaInsets();

  const [state, dispatch] = useReducer(historyReducer, undefined, initState);
  const { items, phase, refreshing } = state;

  const pageOpacity = useRef(new Animated.Value(0)).current;
  const pageTranslateY = useRef(new Animated.Value(8)).current;
  const isClosingRef = useRef(false);
  const isFetchingRef = useRef(false);

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

  const loadUserHistory = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current && !isRefresh) return;
    isFetchingRef.current = true;

    if (isRefresh) {
      dispatch({ type: 'START_REFRESH' });
    }

    try {
      const persisted = await getPersistedHistory();
      if (persisted && persisted.length > 0) {
        dispatch({ type: 'SHOW_CACHED', items: persisted });
      }

      const jwt = await getStoredJwtToken();
      if (!jwt) {
        if (!persisted || persisted.length === 0) {
          dispatch({ type: 'SHOW_EMPTY' });
        }
        return;
      }

      const res = await fetch(`${getBackendBaseUrl()}/auth/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.scanHistory)) {
          setMemoryHistory(data.scanHistory);
          dispatch({ type: 'FETCH_SUCCESS', items: data.scanHistory });
        } else {
          setMemoryHistory([]);
          dispatch({ type: 'SHOW_EMPTY' });
        }
      } else {
        dispatch({ type: 'FETCH_ERROR' });
      }
    } catch (_) {
      dispatch({ type: 'FETCH_ERROR' });
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    isClosingRef.current = false;
    pageOpacity.setValue(0);
    pageTranslateY.setValue(8);

    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslateY, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const cached = getMemoryHistory();
    if (cached && cached.length > 0) {
      dispatch({ type: 'SHOW_CACHED', items: cached });
    } else {
      getPersistedHistory().then((diskCache) => {
        if (diskCache && diskCache.length > 0) {
          dispatch({ type: 'SHOW_CACHED', items: diskCache });
        }
      });
    }

    const task = InteractionManager.runAfterInteractions(() => {
      loadUserHistory();
    });

    return () => task.cancel();
  }, [visible, loadUserHistory, pageOpacity, pageTranslateY]);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslateY, {
        toValue: 8,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose, pageOpacity, pageTranslateY]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleClose]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ROW_TOTAL_HEIGHT,
      offset: ROW_TOTAL_HEIGHT * Math.floor(index / 2),
      index,
    }),
    []
  );

  const keyExtractor = useCallback(
    (item: ScannedProduct, index: number) => (item.barcode ? `hist_${item.barcode}` : `hist_idx_${index}`),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: ScannedProduct }) => (
      <HistoryProductCard item={item} onSelectProduct={onSelectProduct} />
    ),
    [onSelectProduct]
  );

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        StyleSheet.absoluteFill,
        {
          zIndex: 995,
          opacity: pageOpacity,
          transform: [{ translateY: pageTranslateY }],
        },
      ]}
    >
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

      <View style={[styles.navbarWrapper, { paddingTop: insets.top }]}>
        <DashboardNavbar
          user={user}
          onProfilePress={onProfilePress}
          onLogout={onLogout}
        />
      </View>

      <View style={styles.headingContainer}>
        <Text style={styles.headingLabel}>Your Scans</Text>
        <Text style={styles.headingTitle}>History</Text>
      </View>

      {phase === 'loading' ? (
        <View style={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}>
          <ProductGridSkeleton count={6} />
        </View>
      ) : phase === 'empty' ? (
        <View style={styles.centerContainer}>
          <Image
            source={EMPTY_404_ILLUSTRATION}
            style={styles.emptyIllustration}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No Scans Found</Text>
          <Text style={styles.emptySubtitle}>
            You haven't scanned any products yet. Scan food, drink, or skincare barcodes to see your history logged here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadUserHistory(true)}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
        />
      )}
    </Animated.View>
  );
}

const HistoryProductCard = memo(
  ({
    item,
    onSelectProduct,
  }: {
    item: ScannedProduct;
    onSelectProduct?: (product: ScannedProduct) => void;
  }) => {
    const [imageError, setImageError] = useState(false);
    const isBeauty = item.productType === 'beauty';
    const scoreColor = item.verdictColor || (item.aiHealthRating >= 60 ? '#58B84F' : '#E8502A');
    const hasImage = Boolean(item.imageUrl) && !imageError;

    const handlePress = useCallback(() => {
      onSelectProduct?.(item);
    }, [item, onSelectProduct]);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={handlePress}
      >
        <View style={styles.cardImageContainer}>
          <Image
            source={hasImage ? { uri: item.imageUrl } : NOT_FOUND_IMG}
            style={styles.cardImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />

          <View style={[styles.badgePill, { backgroundColor: scoreColor }]}>
            <Text style={styles.badgeText}>{item.aiHealthRating ?? 75}/100</Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardBrand} numberOfLines={1}>
            {item.brand || 'Foodco Verified'}
          </Text>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.cardMetaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText} numberOfLines={1}>
                {item.category || (isBeauty ? 'Beauty' : 'Grocery')}
              </Text>
            </View>
            <Text style={[styles.verdictMiniText, { color: scoreColor }]} numberOfLines={1}>
              {item.verdict || 'Good Choice'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.item.barcode === next.item.barcode &&
    prev.item.aiHealthRating === next.item.aiHealthRating &&
    prev.item.imageUrl === next.item.imageUrl &&
    prev.onSelectProduct === next.onSelectProduct
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navbarWrapper: {
    backgroundColor: '#FFFFFF',
  },
  headingContainer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headingLabel: {
    fontFamily: sansFont,
    fontSize: 14,
    color: '#58B84F',
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 4,
  },
  headingTitle: {
    fontFamily: serifFont,
    fontSize: 26,
    color: '#1E1D25',
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 70,
  },
  emptyIllustration: {
    width: 220,
    height: 220,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: serifFont,
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1D25',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#7F8489',
    textAlign: 'center',
    maxWidth: 290,
    marginBottom: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_MARGIN_BOTTOM,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 132,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badgePill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardInfo: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  cardName: {
    fontFamily: sansFont,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E1D25',
    lineHeight: 18,
    minHeight: 36,
  },
  cardMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    backgroundColor: '#F1F3F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '55%',
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  verdictMiniText: {
    fontSize: 10.5,
    fontWeight: '800',
    maxWidth: '42%',
  },
});
