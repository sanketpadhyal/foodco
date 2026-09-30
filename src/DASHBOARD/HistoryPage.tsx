import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  Dimensions,
  BackHandler,
  RefreshControl,
  InteractionManager,
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
import { ProductGridSkeleton } from '../components/ProductCardSkeleton';
import { DashboardBottomBar, DashboardTab } from './components';

const EMPTY_404_ILLUSTRATION = require('../../assets/page-found-concept-illustration_114360-1869 (1).png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const sansFont = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const boldSansFont = Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'sans-serif' });

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
}

export default function HistoryPage({
  visible,
  user,
  onClose,
  onSelectProduct,
  onTabPress,
  onScanPress,
  onGithubPress,
}: HistoryPageProps) {
  const insets = useSafeAreaInsets();

  const [historyItems, setHistoryItems] = useState<ScannedProduct[]>(() => getMemoryHistory() || []);
  const [loading, setLoading] = useState<boolean>(() => !getMemoryHistory());
  const [hasLoaded, setHasLoaded] = useState<boolean>(() => !!getMemoryHistory());
  const [refreshing, setRefreshing] = useState(false);
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
      setRefreshing(true);
    } else if (!getMemoryHistory()) {
      setLoading(true);
    }

    try {
      const jwt = await getStoredJwtToken();
      if (!jwt) {
        setHistoryItems([]);
        setHasLoaded(true);
        return;
      }

      const res = await fetch(`${getBackendBaseUrl()}/auth/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.scanHistory)) {
          setHistoryItems(data.scanHistory);
          setMemoryHistory(data.scanHistory);
        } else {
          setHistoryItems([]);
          setMemoryHistory([]);
        }
      } else {
        if (!getMemoryHistory()) {
          setHistoryItems([]);
        }
      }
    } catch (_) {
      if (!getMemoryHistory()) {
        setHistoryItems([]);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const cached = getMemoryHistory();
      if (cached) {
        setHistoryItems(cached);
        setHasLoaded(true);
        setLoading(false);
      } else {
        setLoading(true);
        setHasLoaded(false);
      }

      const task = InteractionManager.runAfterInteractions(() => {
        loadUserHistory();
      });

      return () => task.cancel();
    }
  }, [visible, loadUserHistory]);

  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

  const handleBottomTabPress = (tab: DashboardTab) => {
    if (tab === 'recipes') {
      return;
    }
    if (onTabPress) {
      onTabPress(tab);
    } else if (tab === 'home') {
      onClose();
    }
  };

  const handleScanPress = () => {
    if (onScanPress) {
      onScanPress();
    } else {
      onClose();
    }
  };

  const handleGithubPress = () => {
    if (onGithubPress) {
      onGithubPress();
    } else {
      onClose();
    }
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

  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Member';

  return (
    <View
      style={[
        styles.container,
        StyleSheet.absoluteFill,
        { zIndex: 995 },
      ]}
    >
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityLabel="Go Back"
        >
          <Ionicons name="chevron-back" size={22} color="#1E1D25" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Scan History</Text>
          <Text style={styles.headerSubtitle}>
            {displayName} • {historyItems.length > 0 ? `${historyItems.length} scan${historyItems.length === 1 ? '' : 's'}` : hasLoaded ? '0 scans' : 'loading...'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadUserHistory(true)}
          activeOpacity={0.7}
          accessibilityLabel="Refresh History"
        >
          <Ionicons name="refresh" size={20} color="#1E1D25" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading && !hasLoaded ? (
        <ProductGridSkeleton
          count={6}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 100,
          }}
        />
      ) : historyItems.length === 0 && hasLoaded ? (
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
          data={historyItems}
          keyExtractor={(item, index) => item.barcode ? `${item.barcode}_${index}` : `hist_${index}`}
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

      {/* Solid White Panel Behind Android System Navigation Buttons */}
      <View
        style={[
          styles.bottomNavBackdrop,
          { height: insets.bottom > 0 ? insets.bottom : 0 },
        ]}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1D25',
  },
  headerSubtitle: {
    fontFamily: sansFont,
    fontSize: 12,
    color: '#8E949D',
    marginTop: 2,
    fontWeight: '500',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
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
