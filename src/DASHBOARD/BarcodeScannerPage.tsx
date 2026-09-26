import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ProductScanResultPanel from './ProductScanResultPanel';
import { fetchProductByBarcode, ScannedProduct } from './productService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function BarcodeScannerPage({ visible, onClose }: BarcodeScannerPageProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  // Result panel states
  const [resultVisible, setResultVisible] = useState<boolean>(false);
  const [fetchingProduct, setFetchingProduct] = useState<boolean>(false);
  const [productData, setProductData] = useState<ScannedProduct | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Down-to-up page transition animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Scanning laser beam animation
  const laserAnim = useRef(new Animated.Value(0)).current;
  const isCooldownRef = useRef(false);

  useEffect(() => {
    if (visible) {
      // Slide up from bottom
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 38,
          useNativeDriver: true,
        }),
      ]).start();

      // Start looping laser sweep
      const laserLoop = Animated.loop(
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
      laserLoop.start();

      return () => {
        laserLoop.stop();
      };
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 260,
          easing: Easing.in(Easing.cubic),
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
        easing: Easing.in(Easing.cubic),
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
      setScannedCode(null);
      onClose();
    });
  };

  const processBarcode = async (rawCode: string) => {
    if (isCooldownRef.current || !rawCode.trim()) return;
    isCooldownRef.current = true;

    const cleaned = rawCode.trim();
    setScannedCode(cleaned);
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
      // Brief cooldown before next camera scan
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
    setScannedCode(null);
    setScanError(null);
    isCooldownRef.current = false;
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 218],
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
      {/* Real Camera Viewport */}
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
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
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : (
        <View style={styles.permissionFallback}>
          <Text style={styles.fallbackEmoji}>📷</Text>
          <Text style={styles.fallbackTitle}>Camera Permission Required</Text>
          <Text style={styles.fallbackSub}>
            Foodco AI needs camera access to scan mart barcodes and analyze harmful ingredients.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            activeOpacity={0.82}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Camera Dark Overlays for Viewfinder Framing */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {/* Top Floating Controls */}
        <View style={[styles.topControlsRow, { paddingTop: insets.top + 8 }]}>
          {/* Back Circular Button */}
          <TouchableOpacity
            style={styles.circularGlassBtn}
            onPress={handleClose}
            activeOpacity={0.8}
            accessibilityLabel="Close Scanner"
          >
            <Ionicons name="chevron-back" size={24} color="#1E1D25" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.scannerHeaderTitle}>Barcode Scanner</Text>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveIndicatorText}>Foodco AI OCR Active</Text>
            </View>
          </View>

          {/* Right Action Buttons */}
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={[styles.circularGlassBtn, torch && styles.glassBtnActive]}
              onPress={() => setTorch(prev => !prev)}
              activeOpacity={0.8}
              accessibilityLabel="Toggle Flashlight"
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-outline'}
                size={20}
                color={torch ? '#FF6B35' : '#1E1D25'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.circularGlassBtn, { marginLeft: 10 }]}
              onPress={() => setFacing(prev => (prev === 'back' ? 'front' : 'back'))}
              activeOpacity={0.8}
              accessibilityLabel="Flip Camera"
            >
              <Ionicons name="camera-reverse-outline" size={22} color="#1E1D25" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Target Viewfinder */}
        <View style={styles.viewfinderCenterWrap} pointerEvents="none">
          <View style={styles.viewfinderBox}>
            {/* Viewfinder Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Glowing Laser Scan Line */}
            <Animated.View
              style={[
                styles.laserLine,
                { transform: [{ translateY: laserTranslateY }] },
              ]}
            >
              <View style={styles.laserGlow} />
            </Animated.View>

            {/* Center Barcode Watermark Icon */}
            <View style={styles.barcodeWatermark}>
              <Ionicons name="barcode-outline" size={64} color="rgba(255,255,255,0.22)" />
            </View>
          </View>
          <Text style={styles.aimInstructionText}>
            Align package barcode or numeric digits inside frame
          </Text>
        </View>

        {/* Bottom Hyper OCR & Quick Digit Chips Panel */}
        <View style={[styles.bottomControlDeck, { paddingBottom: insets.bottom + 16 }]}>
          {/* Quick Manual OCR Digits Input Bar */}
          <View style={styles.ocrDeckCard}>
            <View style={styles.ocrHeaderRow}>
              <View style={styles.ocrTag}>
                <Ionicons name="scan" size={14} color="#FF6B35" />
                <Text style={styles.ocrTagText}>HYPER OCR DIGITS DETECTOR</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowManualInput(prev => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.manualToggleText}>
                  {showManualInput ? 'Close Input' : 'Type Digits'}
                </Text>
              </TouchableOpacity>
            </View>

            {showManualInput ? (
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualTextInput}
                  placeholder="Enter 8, 12, or 13-digit barcode..."
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={manualCode}
                  onChangeText={setManualCode}
                  returnKeyType="search"
                  onSubmitEditing={() => processBarcode(manualCode)}
                />
                <TouchableOpacity
                  style={styles.manualSubmitBtn}
                  activeOpacity={0.82}
                  onPress={() => processBarcode(manualCode)}
                >
                  <Text style={styles.manualSubmitText}>Scan</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Quick Demo Mart Barcode Chips */}
            <Text style={styles.chipsSectionTitle}>Tap popular mart items to test:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.demoChipsScroll}
            >
              {DEMO_MART_PRODUCTS.map(item => (
                <TouchableOpacity
                  key={item.barcode}
                  style={styles.demoChip}
                  activeOpacity={0.75}
                  onPress={() => processBarcode(item.barcode)}
                >
                  <Text style={styles.demoChipText}>{item.label}</Text>
                  <Text style={styles.demoChipCode}>{item.barcode.slice(-4)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
    backgroundColor: '#0F1115',
    zIndex: 999,
  },
  permissionFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1E1D25',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  fallbackEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSub: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  circularGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  glassBtnActive: {
    backgroundColor: '#FFF0E8',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  scannerHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  liveIndicatorText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewfinderCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  viewfinderBox: {
    width: Math.min(SCREEN_WIDTH - 64, 300),
    height: 240,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FF6B35',
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
    backgroundColor: '#FF6B35',
    borderRadius: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  laserGlow: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 11,
    backgroundColor: 'rgba(255, 107, 53, 0.35)',
    borderRadius: 4,
  },
  barcodeWatermark: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aimInstructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomControlDeck: {
    paddingHorizontal: 16,
    zIndex: 20,
  },
  ocrDeckCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  ocrHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ocrTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ocrTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B35',
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  manualToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  manualTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1E1D25',
    fontWeight: '600',
  },
  manualSubmitBtn: {
    marginLeft: 10,
    backgroundColor: '#FF6B35',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chipsSectionTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  demoChipsScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  demoChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1D25',
  },
  demoChipCode: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginLeft: 6,
  },
});
