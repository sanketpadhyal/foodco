import React, { useEffect, useRef, useCallback, useReducer } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStoredJwtToken } from '../auth-page/authService';
import { getBackendBaseUrl } from '../../api/universalbackendapi';
import {
  ScannedProduct,
  getMemoryHistory,
  setMemoryHistory,
} from './productService';
import { DashboardNavbar, DashboardBottomBar, DashboardTab } from './components';

const EMPTY_404_ILLUSTRATION = require('../../assets/page-found-concept-illustration_114360-1869 (1).png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const sansFont = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

// ---------------------------------------------------------------------------
// Atomic state machine — all transitions happen in ONE dispatch (no flicker)
// ---------------------------------------------------------------------------
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
      return { items: [], phase: 'loading', refreshing: false };
    case 'SHOW_EMPTY':
      return { items: [], phase: 'empty', refreshing: false };
    case 'START_REFRESH':
      return { ...state, refreshing: true };
    case 'FETCH_SUCCESS':
      return {
        items: action.items,
        phase: action.items.length > 0 ? 'ready' : 'empty',
        refreshing: false,
      };
    case 'FETCH_ERROR':
      // keep existing items visible; just stop refreshing
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
  if (cached) return { items: [], phase: 'empty', refreshing: false };
  return { items: [], phase: 'loading', refreshing: false };
}
// ---------------------------------------------------------------------------

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
  const pageTranslateY = useRef(new Animated.Value(10)).current;
  const isClosingRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Android nav bar colour
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

  // Fetch from network — dispatches a single action, never multiple setState calls
  const loadUserHistory = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current && !isRefresh) return;
    isFetchingRef.current = true;

    if (isRefresh) {
      dispatch({ type: 'START_REFRESH' });
    }

    try {
      const jwt = await getStoredJwtToken();
      if (!jwt) {
        dispatch({ type: 'SHOW_EMPTY' });
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

  // Page open/close animation + initial data gate
  useEffect(() => {
    if (!visible) return;

    isClosingRef.current = false;
    pageOpacity.setValue(0);
    pageTranslateY.setValue(10);

    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslateY, {
        toValue: 0,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Seed from cache first (single atomic dispatch → no flicker)
    const cached = getMemoryHistory();
    if (cached && cached.length > 0) {
      dispatch({ type: 'SHOW_CACHED', items: cached });
    } else if (cached) {
      dispatch({ type: 'SHOW_EMPTY' });
    } else {
      dispatch({ type: 'SHOW_LOADING' });
    }

    // Defer network fetch until after interactions/animation
    const task = InteractionManager.runAfterInteractions(() => {
      loadUserHistory();
    });

    return () => task.cancel();
  }, [visible, loadUserHistory, pageOpacity, pageTranslateY]);

  // Android hardware back
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslateY, {
        toValue: 8,
        duration: 130,
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

  const handleBottomTabPress = (tab: DashboardTab) => {
    if (tab === 'recipes') return;
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslateY, {
        toValue: 8,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onTabPress) onTabPress(tab);
      else if (tab === 'home') onClose();
    });
  };

  const handleScanPress = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(pageOpacity, {
      toValue: 0,
      duration: 130,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      if (onScanPress) onScanPress();
      else onClose();
    });
  };

  const handleGithubPress = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(pageOpacity, {
      toValue: 0,
      duration: 130,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      if (onGithubPress) onGithubPress();
      else onClose();
    });
  };

  if (!visible) return null;

  const renderProductItem = ({ item }: { item: ScannedProduct }) => {
    const isBeauty = item.productType === 'beauty';
    const scoreColor = item.verdictColor || (item.aiHealthRating >= 60 ? '#58B84F' : '#E8502A');

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => onSelectProduct?.(item)}
      >
        <View style={styles.cardImageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cardImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.cardPlaceholder}>
              {isBeauty ? (
                <Ionicons name="sparkles" size={34} color="#C0C5CE" />
              ) : (
                <MaterialCommunityIcons name="food-apple-outline" size={38} color="#C0C5CE" />
              )}
            </View>
          )}

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
  };

  return (
    <View style={[styles.container, StyleSheet.absoluteFill, { zIndex: 995 }]}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

      {/* Only the content animates — bottom bar stays static */}
      <Animated.View
        style={[
          styles.animatedContent,
          { opacity: pageOpacity, transform: [{ translateY: pageTranslateY }] },
        ]}
      >
        {/* Navbar */}
        <View style={[styles.navbarWrapper, { paddingTop: insets.top }]}>
          <DashboardNavbar
            user={user}
            onProfilePress={onProfilePress}
            onLogout={onLogout}
          />
        </View>

        {/* Body — exactly ONE phase is visible at a time, zero flicker */}
        {phase === 'loading' ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
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
            <TouchableOpacity
              style={styles.emptyScanBtn}
              activeOpacity={0.85}
              onPress={handleScanPress}
            >
              <Ionicons name="barcode-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyScanBtnText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, index) =>
              item.barcode ? `${item.barcode}_${index}` : `hist_${index}`
            }
            renderItem={renderProductItem}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
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

      {/* Bottom bar & backdrop — always static, never animated */}
      <View
        style={[styles.bottomNavBackdrop, { height: insets.bottom > 0 ? insets.bottom : 0 }]}
        pointerEvents="none"
      />
      <DashboardBottomBar
        activeTab="recipes"
        onTabPress={handleBottomTabPress}
        onScanPress={handleScanPress}
        onGithubPress={handleGithubPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  animatedContent: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navbarWrapper: {
    backgroundColor: '#FFFFFF',
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
  emptyScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 22,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyScanBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: {
    height: 135,
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
  cardPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 8,
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
  bottomNavBackdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    zIndex: 99,
  },
});
