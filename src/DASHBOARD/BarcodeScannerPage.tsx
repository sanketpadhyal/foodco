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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductScanResultPanel from './ProductScanResultPanel';
import { fetchProductByBarcode, ScannedProduct } from './productService';

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
  return (
    <View style={styles.darkCameraBackdrop}>
      <Ionicons name="camera-outline" size={48} color="rgba(255, 255, 255, 0.4)" />
    </View>
  );
}

export default function BarcodeScannerPage({ visible, onClose }: BarcodeScannerPageProps) {
  const insets = useSafeAreaInsets();
  const [torch, setTorch] = useState<boolean>(false);
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

  // Optimized bottom padding for Android 3-button navigation bar (triangle, circle, square)
  const bottomBarPadding = Math.max(insets.bottom, 48) + 20;

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
      {/* 100% Real Camera Fullscreen View (No fake image behind) */}
      <View style={StyleSheet.absoluteFill}>
        <CameraErrorBoundary fallback={<CameraFallbackPlaceholder />}>
          <RealCameraComponent
            onBarcodeScanned={handleBarcodeScanned}
            torch={torch}
          />
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

        {/* Clean Center Scanner Title (No extra subhead) */}
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

      {/* PROPERLY CENTERED Viewfinder Target Frame (Exact Geometric Center of Screen) */}
      <View style={styles.centeredViewfinderWrapper} pointerEvents="box-none">
        <View style={styles.viewfinderBox}>
          {/* 4 Clean Green Corner Brackets */}
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

          {/* Clean Barcode Watermark in Center */}
          <View style={styles.barcodeWatermark}>
            <Ionicons name="barcode-outline" size={64} color="rgba(255, 255, 255, 0.4)" />
          </View>
        </View>
      </View>

      {/* Bottom Action Controls - Optimized for Android Navigation Buttons */}
      <View
        style={[styles.floatingBottomControls, { paddingBottom: bottomBarPadding }]}
        pointerEvents="box-none"
      >
        {/* Manual Barcode Input Card if toggled */}
        {showManualInput ? (
          <View style={styles.floatingManualInputWrap}>
            <TextInput
              style={styles.floatingManualInput}
              placeholder="Enter barcode number (e.g. 3017620422003)..."
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

        {/* Shutter Button Row */}
        <View style={styles.shutterActionRow} pointerEvents="box-none">
          {/* Keypad Digits Toggle Button */}
          <TouchableOpacity
            style={[styles.glassCircleBtn, showManualInput && styles.glassCircleActive]}
            onPress={() => setShowManualInput(prev => !prev)}
            activeOpacity={0.8}
            accessibilityLabel="Enter Digits"
          >
            <Ionicons
              name="keypad"
              size={22}
              color={showManualInput ? '#5DB035' : '#1E1D25'}
            />
          </TouchableOpacity>

          {/* Center Green Barcode Shutter Button */}
          <TouchableOpacity
            style={styles.centerShutterButton}
            activeOpacity={0.85}
            onPress={() => processBarcode('3017620422003')}
            accessibilityLabel="Scan Product"
          >
            <Ionicons name="barcode-outline" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Info / Hint Button */}
          <TouchableOpacity
            style={styles.glassCircleBtn}
            onPress={() => processBarcode('5449000000996')}
            activeOpacity={0.8}
            accessibilityLabel="Sample Scan"
          >
            <Ionicons name="sparkles" size={22} color="#5DB035" />
          </TouchableOpacity>
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
    backgroundColor: '#000000',
    zIndex: 999,
  },
  darkCameraBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A0C0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#111418',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 14,
    color: '#9CA3AF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  torchActiveBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#5DB035',
  },
  headerTitleWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1D25',
    letterSpacing: 0.2,
  },
  centeredViewfinderWrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  viewfinderBox: {
    width: Math.min(SCREEN_WIDTH - 80, 280),
    height: 200,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#5DB035',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 18,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 18,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 18,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 18,
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
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 8,
  },
  laserGlow: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 11,
    backgroundColor: 'rgba(93, 176, 53, 0.4)',
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
    zIndex: 25,
  },
  shutterActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 40,
    gap: 32,
  },
  glassCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  glassCircleActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#5DB035',
  },
  centerShutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#5DB035',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5DB035',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 9,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  floatingManualInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingManualInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1E1D25',
    fontWeight: '600',
  },
  floatingManualSubmitBtn: {
    backgroundColor: '#5DB035',
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingManualSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
