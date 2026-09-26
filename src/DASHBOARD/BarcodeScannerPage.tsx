import React, { useState, useEffect, useRef } from 'react';
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
    if (!rawCode.trim()) return;
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
    }
  };

  const handleScanAnother = () => {
    setResultVisible(false);
    setProductData(null);
    setScanError(null);
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
      {/* High-res Realistic Supermarket AR Camera Background with Green Perspective Path */}
      <Image
        source={require('../../assets/dashboard/foodco_ar_scanner_bg.jpg')}
        style={styles.cameraBackground}
        resizeMode="cover"
      />

      {/* Top Controls Row */}
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
            <Text style={styles.liveIndicatorText}>Live Mart Camera</Text>
          </View>
        </View>

        {/* Right Action Button: White Rounded Square with Scan/Compass Icon */}
        <TouchableOpacity
          style={styles.squareControlBtn}
          activeOpacity={0.82}
          onPress={() => setShowManualInput(prev => !prev)}
          accessibilityLabel="Toggle Barcode Input"
        >
          <Ionicons name="scan-outline" size={22} color="#5DB035" />
        </TouchableOpacity>
      </View>

      {/* Center AR Scanning Frame & HUD Distance Pill */}
      <View style={styles.viewfinderCenterWrap} pointerEvents="box-none">
        {/* Floating HUD Pill: Themed with green icon and scanner guide */}
        <Animated.View style={[styles.hudBadgePill, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.hudIconBox}>
            <Ionicons name="scan" size={16} color="#5DB035" />
          </View>
          <Text style={styles.hudDistanceText}>Align Mart Barcode</Text>
        </Animated.View>

        {/* High-Tech Viewfinder Target Box */}
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
            <Ionicons name="barcode-outline" size={60} color="rgba(93, 176, 53, 0.35)" />
          </View>
        </View>
      </View>

      {/* Bottom Sheet - Beautiful Themed White Card with High Border Radius */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 18 }]}>
        {/* Foodco AI Assistant Profile Row */}
        <View style={styles.profileRow}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require('../../assets/fodai.png')}
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>Foodco AI Scanner</Text>
            <Text style={styles.profileSubtitle}>Point camera at any packaged item</Text>
          </View>
          {/* Circular Vibrant Green Action Button */}
          <TouchableOpacity
            style={styles.callActionButton}
            activeOpacity={0.85}
            onPress={() => processBarcode('3017620422003')}
            accessibilityLabel="Scan Product"
          >
            <Ionicons name="barcode-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Feature / Scanner Modes Connected by Dotted Line */}
        <View style={styles.routeSection}>
          {/* Feature 1: Barcode & Digits Reader */}
          <TouchableOpacity
            style={styles.routeStopRow}
            activeOpacity={0.8}
            onPress={() => processBarcode('5449000000996')}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="cart-outline" size={20} color="#1E1D25" />
            </View>
            <View style={styles.stopTextCol}>
              <Text style={styles.stopTitle}>Supermarket Barcode & Digits</Text>
              <Text style={styles.stopAddress}>Instant Nutri-Score & NOVA health group</Text>
            </View>
          </TouchableOpacity>

          {/* Dotted Vertical Connector Line */}
          <View style={styles.dottedLineWrapper}>
            <View style={styles.dottedLine} />
          </View>

          {/* Feature 2: Harmful Chemical & Additives Detector */}
          <TouchableOpacity
            style={styles.routeStopRow}
            activeOpacity={0.8}
            onPress={() => processBarcode('7622210449283')}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#5DB035" />
            </View>
            <View style={styles.stopTextCol}>
              <Text style={styles.stopTitle}>Harmful Chemical & Additives Alert</Text>
              <Text style={styles.stopAddress}>Finds hidden palm oil, E-numbers & carcinogens</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Hyper OCR Barcode Digits Quick Bar */}
        <View style={styles.ocrQuickBar}>
          <View style={styles.ocrQuickHeader}>
            <Text style={styles.ocrQuickTitle}>⚡ FOODCO HYPER OCR DIGITS</Text>
            <TouchableOpacity onPress={() => setShowManualInput(prev => !prev)}>
              <Text style={styles.ocrInputToggleText}>
                {showManualInput ? 'Close Input' : 'Type Barcode'}
              </Text>
            </TouchableOpacity>
          </View>

          {showManualInput ? (
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter 8, 12, or 13-digit barcode..."
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={manualCode}
                onChangeText={setManualCode}
                onSubmitEditing={() => processBarcode(manualCode)}
              />
              <TouchableOpacity
                style={styles.manualSubmitBtn}
                onPress={() => processBarcode(manualCode)}
              >
                <Text style={styles.manualSubmitText}>Scan</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Quick Demo Mart Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {DEMO_MART_PRODUCTS.map(item => (
              <TouchableOpacity
                key={item.barcode}
                style={styles.quickChip}
                activeOpacity={0.75}
                onPress={() => processBarcode(item.barcode)}
              >
                <Text style={styles.quickChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    backgroundColor: '#000000',
    zIndex: 999,
  },
  cameraBackground: {
    width: '100%',
    height: '62%',
    position: 'absolute',
    top: 0,
    left: 0,
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
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  headerTitleWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    top: '19%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  hudBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
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
    width: Math.min(SCREEN_WIDTH - 80, 260),
    height: 180,
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 20,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileMeta: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#1E1D25',
    letterSpacing: -0.2,
  },
  profileSubtitle: {
    fontSize: 12.5,
    color: '#7E858E',
    marginTop: 2,
    fontWeight: '500',
  },
  callActionButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#5DB035',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5DB035',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 5,
  },
  routeSection: {
    marginBottom: 12,
    paddingLeft: 2,
  },
  routeStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopTextCol: {
    marginLeft: 14,
  },
  stopTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E1D25',
  },
  stopAddress: {
    fontSize: 12,
    color: '#7E858E',
    marginTop: 1.5,
    fontWeight: '500',
  },
  dottedLineWrapper: {
    height: 18,
    marginLeft: 19,
    justifyContent: 'center',
  },
  dottedLine: {
    width: 1,
    height: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  ocrQuickBar: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ocrQuickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ocrQuickTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: 0.3,
  },
  ocrInputToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5DB035',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  manualInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E1D25',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  manualSubmitBtn: {
    marginLeft: 8,
    backgroundColor: '#5DB035',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  chipsScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
});
