import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
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
  ActivityIndicator,
  Dimensions,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStoredJwtToken } from '../auth-page/authService';
import { getBackendBaseUrl } from '../../api/universalbackendapi';
import { ScannedProduct } from './productService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const sansFont = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const boldSansFont = Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'sans-serif' });

export interface HistoryPageProps {
  visible: boolean;
  onClose: () => void;
  onSelectProduct?: (product: ScannedProduct) => void;
}

export default function HistoryPage({
  visible,
  onClose,
  onSelectProduct,
}: HistoryPageProps) {
  const insets = useSafeAreaInsets();

  const [historyItems, setHistoryItems] = useState<ScannedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const loadHistory = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const jwt = await getStoredJwtToken();
      if (!jwt) {
        setHistoryItems([]);
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
        }
      }
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadHistory();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

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
            {item.brand || 'Foodco'}
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
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />

        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#1E1D25" />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Scan History</Text>
              <Text style={styles.headerSubtitle}>
                {historyItems.length > 0 ? `${historyItems.length} scanned products` : 'Recent scans'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => loadHistory(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={20} color="#1E1D25" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading && !refreshing ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Loading your scan history...</Text>
            </View>
          ) : historyItems.length === 0 ? (
            <View style={styles.centerContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="barcode-outline" size={54} color="#FF6B35" />
              </View>
              <Text style={styles.emptyTitle}>No scan history yet</Text>
              <Text style={styles.emptySubtitle}>
                Scan your daily packaged foods, drinks, or cosmetics to see their real-time health verdict stored here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={historyItems}
              keyExtractor={(item, index) => item.barcode ? `${item.barcode}_${index}` : `hist_${index}`}
              renderItem={renderProductItem}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => loadHistory(true)} tintColor="#FF6B35" colors={['#FF6B35']} />
              }
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#7F8489',
    fontWeight: '500',
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF0EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1D25',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#7F8489',
    textAlign: 'center',
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
});
