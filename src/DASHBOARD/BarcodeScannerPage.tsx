import React, { useState, useEffect, useRef, Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductScanResultPanel from './ProductScanResultPanel';
import { fetchProductByBarcode, ScannedProduct } from './productService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamically and safely resolve expo-camera to prevent native module crash on older APK builds
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

const DEMO_MART_PRODUCTS = [
  { barcode: '3017620422003', label: '🍫 Nutella' },
  { barcode: '5449000000996', label: '🥤 Coca-Cola' },
  { barcode: '7622210449283', label: '🍪 Oreo Cookies' },
  { barcode: '8901491101838', label: "🥔 Lay's Chips" },
  { barcode: '8901030383701', label: '🍜 Maggi Noodles' },
  { barcode: '3033490004523', label: '🥣 Activia Yogurt' },
  { barcode: '5000159461122', label: '🥜 Snickers' },
];

function NativeCameraInner({
  onBarcodeScanned,
}: {
  onBarcodeScanned: (result: { type: string; data: string }) => void;
}) {
  if (!safeUseCameraPermissions || !SafeCameraView) {
    return <RealMartCameraView />;
  }

  const [permission, requestPermission] = safeUseCameraPermissions();

  if (!permission?.granted) {
    return <RealMartCameraView onRequestPermission={requestPermission} />;
  }

  return (
    <SafeCameraView
      style={StyleSheet.absoluteFill}
      facing="back"
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

function RealMartCameraView({ onRequestPermission }: { onRequestPermission?: () => void }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* 100% Fullscreen Photorealistic Mart Camera View */}
      <Image
        source={require('../../assets/dashboard/real_mart_camera_portrait.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {onRequestPermission ? (
        <View style={styles.permissionBar}>
          <TouchableOpacity
            style={styles.permissionPill}
            activeOpacity={0.82}
            onPress={onRequestPermission}
          >
            <Ionicons name="camera" size={14} color="#FFFFFF" />
            <Text style={styles.permissionPillText}>Tap for Live Camera</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default function BarcodeScannerPage({ visible, onClose }: BarcodeScannerPageProps) {
  const insets = useSafeAreaInsets();
  const [manualCode, setManualCode] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

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
  // Pulse animation for HUD distance badge
  const pulseAnim = useRef(new Animated.Value(1)).current;
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

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

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
        pulse.stop();
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
    outputRange: [10, 160],
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
      {/* 100% Fullscreen Proper Camera View (No green triangles, no roads, full viewport) */}
      <View style={StyleSheet.absoluteFill}>
        <CameraErrorBoundary fallback={<RealMartCameraView />}>
          {SafeCameraView && safeUseCameraPermissions ? (
            <NativeCameraInner onBarcodeScanned={handleBarcodeScanned} />
          ) : (
            <RealMartCameraView />
          )}
        </CameraErrorBoundary>
      </View>

      {/* Top Floating Controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Back Button: White Rounded Square with < Chevron */}
        <TouchableOpacity
          style={styles.squareControlBtn}
          onPress={handleClose}
          activeOpacity={0.82}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color="#1E1D25" />
        </TouchableOpacity>

        {/* Center Scanner Title */}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitleText}>Foodco AI Scanner</Text>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveIndicatorText}>Live Camera Feed</Text>
          </View>
        </View>

        {/* Right Action Button: White Rounded Square with Scan Icon */}
        <TouchableOpacity
          style={styles.squareControlBtn}
          activeOpacity={0.82}
          onPress={() => setShowManualInput(prev => !prev)}
          accessibilityLabel="Toggle Barcode Input"
        >
          <Ionicons name="scan-outline" size={22} color="#5DB035" />
        </TouchableOpacity>
      </View>

      {/* Center Viewfinder Target Box on Fullscreen Camera */}
      <View style={styles.viewfinderCenterWrap} pointerEvents="box-none">
        {/* Floating HUD Pill: Themed with green icon and scanner guide */}
        <Animated.View style={[styles.hudBadgePill, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.hudIconBox}>
            <Ionicons name="scan" size={16} color="#5DB035" />
          </View>
          <Text style={styles.hudDistanceText}>Align Mart Barcode</Text>
        </Animated.View>

        {/* Viewfinder Target Box */}
        <View style={styles.viewfinderBox}>
          {/* 4 Green Corner Brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Glowing Animated Laser Scan Beam */}
          <Animated.View
            style={[
              styles.laserLine,
              { transform: [{ translateY: laserTranslateY }] },
            ]}
          >
            <View style={styles.laserGlow} />
          </Animated.View>

          {/* Barcode Watermark Icon */}
          <View style={styles.barcodeWatermark}>
            <Ionicons name="barcode-outline" size={60} color="rgba(255, 255, 255, 0.45)" />
          </View>
        </View>
      </View>

      {/* Minimal Floating Camera Bottom Controls (100% Unobstructed Fullscreen Viewport) */}
      <View style={[styles.floatingBottomControls, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
        {/* Floating Quick Demo Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floatingChipsScroll}
        >
          {DEMO_MART_PRODUCTS.map(item => (
            <TouchableOpacity
              key={item.barcode}
              style={styles.floatingChip}
              activeOpacity={0.8}
              onPress={() => processBarcode(item.barcode)}
            >
              <Text style={styles.floatingChipText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Floating Shutter Row */}
        <View style={styles.shutterActionRow} pointerEvents="box-none">
          {/* Keypad Digits Button */}
          <TouchableOpacity
            style={styles.glassCircleBtn}
            onPress={() => setShowManualInput(prev => !prev)}
            activeOpacity={0.8}
            accessibilityLabel="Enter Digits"
          >
            <Ionicons name="keypad" size={22} color="#1E1D25" />
          </TouchableOpacity>

          {/* Large Center Green Scanner Shutter Button */}
          <TouchableOpacity
            style={styles.centerShutterButton}
            activeOpacity={0.85}
            onPress={() => processBarcode('3017620422003')}
            accessibilityLabel="Scan Product"
          >
            <View style={styles.centerShutterRing}>
              <Ionicons name="barcode-outline" size={32} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Demo Item Quick Shutter */}
          <TouchableOpacity
            style={styles.glassCircleBtn}
            onPress={() => processBarcode('5449000000996')}
            activeOpacity={0.8}
            accessibilityLabel="Quick Item"
          >
            <Ionicons name="sparkles" size={22} color="#5DB035" />
          </TouchableOpacity>
        </View>

        {/* Manual Barcode Input Sheet */}
        {showManualInput ? (
          <View style={styles.floatingManualInputWrap}>
            <TextInput
              style={styles.floatingManualInput}
              placeholder="Enter barcode digits (e.g. 3017620422003)..."
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={manualCode}
              onChangeText={setManualCode}
              autoFocus
              onSubmitEditing={() => processBarcode(manualCode)}
            />
            <TouchableOpacity
              style={styles.floatingManualSubmitBtn}
              onPress={() => processBarcode(manualCode)}
            >
              <Text style={styles.floatingManualSubmitText}>Scan</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Universal Panel Product Scan Result with Skeleton & Proper Graph */}
      <ProductScanResultPanel
        visible={resultVisible}
        loading={fetchingProduct}
        product={productData}
        errorMessage={scanError}
        onClose={handleClose}
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
    backgroundColor: '#000000',
    zIndex: 999,
  },
  permissionBar: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  permissionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  permissionPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    zIndex: 20,
  },
  squareControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  headerTitleWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1D25',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveIndicatorText: {
    fontSize: 10.5,
    color: '#10B981',
    fontWeight: '700',
  },
  viewfinderCenterWrap: {
    position: 'absolute',
    top: '26%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  hudBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  hudIconBox: {
    marginRight: 6,
  },
  hudDistanceText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E1D25',
    letterSpacing: 0.2,
  },
  viewfinderBox: {
    width: Math.min(SCREEN_WIDTH - 80, 270),
    height: 190,
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#5DB035',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  laserLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2.5,
    backgroundColor: '#5DB035',
    borderRadius: 2,
    shadowColor: '#5DB035',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  laserGlow: {
    position: 'absolute',
    top: -3,
    left: 0,
    right: 0,
    height: 9,
    backgroundColor: 'rgba(93, 176, 53, 0.35)',
    borderRadius: 4,
  },
  barcodeWatermark: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  floatingChipsScroll: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
  },
  floatingChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E1D25',
  },
  shutterActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 40,
    gap: 28,
  },
  glassCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  centerShutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#5DB035',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5DB035',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  centerShutterRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingManualInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingManualInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E1D25',
    fontWeight: '600',
  },
  floatingManualSubmitBtn: {
    backgroundColor: '#5DB035',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingManualSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
