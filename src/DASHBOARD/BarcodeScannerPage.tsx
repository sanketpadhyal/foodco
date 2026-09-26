import React, { useState, useEffect, useRef, Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductScanResultPanel from './ProductScanResultPanel';
import { fetchProductByBarcode, ScannedProduct } from './productService';

const CORNER_MASK_TL = require('../../assets/dashboard/masks/corner_tl.png');
const CORNER_MASK_TR = require('../../assets/dashboard/masks/corner_tr.png');
const CORNER_MASK_BL = require('../../assets/dashboard/masks/corner_bl.png');
const CORNER_MASK_BR = require('../../assets/dashboard/masks/corner_br.png');

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamic resolution of expo-camera
let SafeCameraView: any = null;
let safeUseCameraPermissions: any = null;

try {
  const ExpoCam = require('expo-camera');
  if (ExpoCam && ExpoCam.CameraView) {
    SafeCameraView = ExpoCam.CameraView;
    safeUseCameraPermissions = ExpoCam.useCameraPermissions;
  }
} catch (_) {
  SafeCameraView = null;
  safeUseCameraPermissions = null;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CameraErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface BarcodeScannerPageProps {
  visible: boolean;
  onClose: () => void;
}

function RealCameraComponent({
  onBarcodeScanned,
  torch,
}: {
  onBarcodeScanned: (result: { type: string; data: string }) => void;
  torch: boolean;
}) {
  if (!safeUseCameraPermissions || !SafeCameraView) {
    return <CameraFallbackPlaceholder />;
  }

  const [permission, requestPermission] = safeUseCameraPermissions();

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={60} color="#FFFFFF" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionSub}>
          Allow camera access so Foodco can scan product barcodes.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          activeOpacity={0.82}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeCameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      enableTorch={torch}
      barcodeScannerSettings={{
        barcodeTypes: [
          'ean13',
          'ean8',
          'upc_a',
          'upc_e',
          'code128',
          'code39',
          'qr',
          'datamatrix',
        ],
      }}
      onBarcodeScanned={onBarcodeScanned}
    />
  );
}

function CameraFallbackPlaceholder() {
  return <View style={styles.lightCameraBackdrop} />;
}

export default function BarcodeScannerPage({ visible, onClose }: BarcodeScannerPageProps) {
  const insets = useSafeAreaInsets();
  const [torch, setTorch] = useState<boolean>(false);

  // Result panel states
  const [resultVisible, setResultVisible] = useState<boolean>(false);
  const [fetchingProduct, setFetchingProduct] = useState<boolean>(false);
  const [productData, setProductData] = useState<ScannedProduct | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Down-to-up transition animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Scanning laser beam animation
  const laserAnim = useRef(new Animated.Value(0)).current;
  const isCooldownRef = useRef(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 38,
          useNativeDriver: true,
        }),
      ]).start();

      const laser = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      laser.start();

      return () => {
        laser.stop();
      };
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setResultVisible(false);
      setProductData(null);
      setTorch(false);
      onClose();
    });
  };

  const processBarcode = async (rawCode: string) => {
    if (isCooldownRef.current || !rawCode.trim()) return;
    isCooldownRef.current = true;

    const cleaned = rawCode.trim();
    setResultVisible(true);
    setFetchingProduct(true);
    setScanError(null);
    setProductData(null);

    try {
      const product = await fetchProductByBarcode(cleaned);
      setProductData(product);
    } catch (err: any) {
      setScanError(err?.message || 'Could not fetch product details.');
    } finally {
      setFetchingProduct(false);
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 1500);
    }
  };

  const handleBarcodeScanned = (result: { type: string; data: string }) => {
    if (resultVisible || fetchingProduct || isCooldownRef.current) return;
    if (result && result.data) {
      processBarcode(result.data);
    }
  };

  const handleScanAnother = () => {
    setResultVisible(false);
    setProductData(null);
    setScanError(null);
    isCooldownRef.current = false;
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 180],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.fullContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* 100% Real Camera Fullscreen View */}
      <View style={StyleSheet.absoluteFill}>
        <CameraErrorBoundary fallback={<CameraFallbackPlaceholder />}>
          <RealCameraComponent
            onBarcodeScanned={handleBarcodeScanned}
            torch={torch}
          />
        </CameraErrorBoundary>
      </View>

      {/* Top Floating Controls - Clean Light Theme */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Back Button: Clean White Rounded Square with < Chevron */}
        <TouchableOpacity
          style={styles.squareControlBtn}
          onPress={handleClose}
          activeOpacity={0.82}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color="#1E1D25" />
        </TouchableOpacity>

        {/* Clean Center Scanner Title */}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitleText}>Scan Barcode</Text>
        </View>

        {/* Right Flashlight / Torch Toggle */}
        <TouchableOpacity
          style={[styles.squareControlBtn, torch && styles.torchActiveBtn]}
          activeOpacity={0.82}
          onPress={() => setTorch(prev => !prev)}
          accessibilityLabel="Toggle Flashlight"
        >
          <Ionicons
            name={torch ? 'flash' : 'flash-outline'}
            size={22}
            color={torch ? '#5DB035' : '#1E1D25'}
          />
        </TouchableOpacity>
      </View>

      {/* Light Mode Cutout Mask around Viewfinder (Clean Light Theme) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Top mask with Verified Foodco DB Trust Note */}
        <View style={[styles.maskTop, { paddingTop: insets.top + 64 }]} pointerEvents="box-none">
          <View style={styles.trustCardWrap}>
            <View style={styles.trustCard}>
              <View style={styles.trustIconWrap}>
                <Ionicons name="shield-checkmark" size={20} color="#15803D" />
              </View>
              <View style={styles.trustTextContent}>
                <View style={styles.trustHeaderRow}>
                  <Text style={styles.trustTitle}>100% Verified Food Data</Text>
                  <View style={styles.trustBadgePill}>
                    <Text style={styles.trustBadgeText}>Foodco DB</Text>
                  </View>
                </View>
                <Text style={styles.trustDescription}>
                  Whatever you see here is powered by Foodco's official database & certified health authorities. Fully trusted & transparent.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Center row with left mask, transparent viewfinder window, and right mask */}
        <View style={styles.maskRow} pointerEvents="box-none">
          <View style={styles.maskSide} />

          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => processBarcode('3017620422003')}
            style={styles.viewfinderBox}
          >
            {/* 4 Corner Rounding Masks - Gives a smooth curved cutout */}
            <Image source={CORNER_MASK_TL} style={[styles.cornerMask, styles.maskTL]} />
            <Image source={CORNER_MASK_TR} style={[styles.cornerMask, styles.maskTR]} />
            <Image source={CORNER_MASK_BL} style={[styles.cornerMask, styles.maskBL]} />
            <Image source={CORNER_MASK_BR} style={[styles.cornerMask, styles.maskBR]} />

            {/* 4 Clean Green Corner Brackets matching the curve */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Sweeping Laser Scan Line */}
            <Animated.View
              style={[
                styles.laserLine,
                { transform: [{ translateY: laserTranslateY }] },
              ]}
            >
              <View style={styles.laserGlow} />
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.maskSide} />
        </View>

        {/* Bottom mask - FamPay Style Tilted Hashtag Stickers */}
        <View style={styles.maskBottom}>
          {/* Main Tilted Instruction Sticker */}
          <View style={styles.heroStickerWrap}>
            <View style={styles.heroStickerPill}>
              <Text style={styles.heroStickerHash}>#</Text>
              <Text style={styles.heroStickerText}>AlignBarcodeWithinFrame</Text>
              <Text style={styles.heroStickerEmoji}> 🎯</Text>
            </View>
          </View>

          {/* FamPay-style Tilted Hashtags Cluster */}
          <View style={styles.stickersCluster}>
            <View style={[styles.stickerPill, styles.stickerHealthy]}>
              <Text style={[styles.stickerText, { color: '#15803D' }]}>#healthy</Text>
              <Text style={styles.stickerEmoji}> 🌱</Text>
            </View>

            <View style={[styles.stickerPill, styles.stickerNutri]}>
              <Text style={[styles.stickerText, { color: '#1D4ED8' }]}>#nutriscore</Text>
              <Text style={styles.stickerEmoji}> 📊</Text>
            </View>

            <View style={[styles.stickerPill, styles.stickerZeroJunk]}>
              <Text style={[styles.stickerText, { color: '#B91C1C' }]}>#zerojunk</Text>
              <Text style={styles.stickerEmoji}> 🚫</Text>
            </View>

            <View style={[styles.stickerPill, styles.stickerInstant]}>
              <Text style={[styles.stickerText, { color: '#6D28D9' }]}>#instantscan</Text>
              <Text style={styles.stickerEmoji}> ⚡</Text>
            </View>

            <View style={[styles.stickerPill, styles.stickerCleanFood]}>
              <Text style={[styles.stickerText, { color: '#047857' }]}>#cleanfood</Text>
              <Text style={styles.stickerEmoji}> 🥑</Text>
            </View>

            <View style={[styles.stickerPill, styles.stickerAiScore]}>
              <Text style={[styles.stickerText, { color: '#B45309' }]}>#aiscore</Text>
              <Text style={styles.stickerEmoji}> ✨</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Universal Panel Product Scan Result with Skeleton & Proper Graph */}
      <ProductScanResultPanel
        visible={resultVisible}
        loading={fetchingProduct}
        product={productData}
        errorMessage={scanError}
        onClose={handleScanAnother}
        onScanAnother={handleScanAnother}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F9FA',
    zIndex: 999,
  },
  lightCameraBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8F9FA',
  },
  permissionContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E1D25',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#5DB035',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 25,
  },
  squareControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  torchActiveBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#5DB035',
  },
  headerTitleWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1D25',
    letterSpacing: 0.2,
  },
  maskTop: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustCardWrap: {
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: 360,
  },
  trustIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  trustTextContent: {
    flex: 1,
  },
  trustHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14532D',
    letterSpacing: 0.1,
  },
  trustBadgePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  trustBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.3,
  },
  trustDescription: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    lineHeight: 15.5,
  },
  maskRow: {
    height: 200,
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  maskBottom: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    paddingTop: 26,
  },
  heroStickerWrap: {
    transform: [{ rotate: '-2.5deg' }],
    marginBottom: 16,
  },
  heroStickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#5DB035',
    shadowColor: '#5DB035',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  heroStickerHash: {
    fontSize: 16,
    fontWeight: '900',
    color: '#5DB035',
    marginRight: 2,
  },
  heroStickerText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E1D25',
    letterSpacing: 0.2,
  },
  heroStickerEmoji: {
    fontSize: 14,
  },
  stickersCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 340,
    gap: 10,
    paddingHorizontal: 12,
  },
  stickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stickerText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  stickerEmoji: {
    fontSize: 12.5,
    marginLeft: 3,
  },
  stickerHealthy: {
    transform: [{ rotate: '3.2deg' }],
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  stickerNutri: {
    transform: [{ rotate: '-2deg' }],
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  stickerZeroJunk: {
    transform: [{ rotate: '2.5deg' }],
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  stickerInstant: {
    transform: [{ rotate: '-3deg' }],
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  stickerCleanFood: {
    transform: [{ rotate: '2.8deg' }],
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  stickerAiScore: {
    transform: [{ rotate: '-1.8deg' }],
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  viewfinderBox: {
    width: Math.min(SCREEN_WIDTH - 80, 280),
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  cornerMask: {
    position: 'absolute',
    width: 32,
    height: 32,
    zIndex: 5,
  },
  maskTL: {
    top: 0,
    left: 0,
  },
  maskTR: {
    top: 0,
    right: 0,
  },
  maskBL: {
    bottom: 0,
    left: 0,
  },
  maskBR: {
    bottom: 0,
    right: 0,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#5DB035',
    zIndex: 10,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 26,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 26,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 26,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 26,
  },
  laserLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: '#5DB035',
    borderRadius: 2,
    shadowColor: '#5DB035',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  laserGlow: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 11,
    backgroundColor: 'rgba(93, 176, 53, 0.3)',
    borderRadius: 4,
  },
});

