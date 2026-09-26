import React, { memo } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export type DashboardTab = 'home' | 'stats' | 'scan' | 'recipes' | 'cart';

export interface DashboardBottomBarProps {
  activeTab?: DashboardTab;
  onTabPress?: (tab: DashboardTab) => void;
  onScanPress?: () => void;
}

const scannerBtnSource = require('../../../assets/scanner-btn.png');

export const DashboardBottomBar: React.FC<DashboardBottomBarProps> = memo(({
  activeTab = 'home',
  onTabPress,
  onScanPress,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  const handleTab = (tab: DashboardTab) => {
    if (tab === 'scan') {
      onScanPress?.();
    } else {
      onTabPress?.(tab);
    }
  };

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      {/* Blurred Translucent Bottom Bar */}
      <View style={[styles.barContainer, { paddingBottom: bottomInset }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 45}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.whiteGlassOverlay]} />

        {/* Tab 1: Home / Explore Grid */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTab('home')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Home"
        >
          <View style={styles.gridIconWrap}>
            <View
              style={[
                styles.gridBlock,
                { backgroundColor: activeTab === 'home' ? '#22C55E' : '#B2BAC6' },
              ]}
            />
            <View
              style={[
                styles.gridBlock,
                { backgroundColor: activeTab === 'home' ? '#86EFAC' : '#D1D5DB' },
              ]}
            />
            <View
              style={[
                styles.gridBlock,
                { backgroundColor: activeTab === 'home' ? '#22C55E' : '#B2BAC6' },
              ]}
            />
            <View
              style={[
                styles.gridBlock,
                { backgroundColor: activeTab === 'home' ? '#22C55E' : '#B2BAC6' },
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Tab 2: Stats / Analytics */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTab('stats')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Stats"
        >
          <View style={styles.chartIconWrap}>
            <View
              style={[
                styles.chartBar,
                {
                  height: 10,
                  backgroundColor: activeTab === 'stats' ? '#22C55E' : '#B2BAC6',
                },
              ]}
            />
            <View
              style={[
                styles.chartBar,
                {
                  height: 16,
                  backgroundColor: activeTab === 'stats' ? '#22C55E' : '#B2BAC6',
                },
              ]}
            />
            <View
              style={[
                styles.chartBar,
                {
                  height: 8,
                  backgroundColor: activeTab === 'stats' ? '#22C55E' : '#B2BAC6',
                },
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Center Empty Space for Floating Scanner Button */}
        <View style={styles.centerSpace} />

        {/* Tab 4: Recipes / Documents */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTab('recipes')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Recipes"
        >
          <Ionicons
            name={activeTab === 'recipes' ? 'document-text' : 'document-text-outline'}
            size={23}
            color={activeTab === 'recipes' ? '#22C55E' : '#B2BAC6'}
          />
        </TouchableOpacity>

        {/* Tab 5: Cart / Shopping Bag */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTab('cart')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Shopping Cart"
        >
          <Ionicons
            name={activeTab === 'cart' ? 'bag-handle' : 'bag-handle-outline'}
            size={23}
            color={activeTab === 'cart' ? '#22C55E' : '#B2BAC6'}
          />
        </TouchableOpacity>
      </View>

      {/* Floating Center Scanner Button */}
      <TouchableOpacity
        style={[styles.floatingCenterBtn, { bottom: bottomInset + 18 }]}
        onPress={() => handleTab('scan')}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Food Scanner"
      >
        <Image
          source={scannerBtnSource}
          style={styles.scannerImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
});

DashboardBottomBar.displayName = 'DashboardBottomBar';

export default DashboardBottomBar;

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  barContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.6)',
  },
  whiteGlassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  tabButton: {
    width: 48,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridIconWrap: {
    width: 22,
    height: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  gridBlock: {
    width: 9.5,
    height: 9.5,
    borderRadius: 3.5,
  },
  chartIconWrap: {
    width: 24,
    height: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3.5,
  },
  chartBar: {
    width: 4,
    borderRadius: 2,
  },
  centerSpace: {
    width: 60,
    height: 44,
  },
  floatingCenterBtn: {
    position: 'absolute',
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
  },
  scannerImage: {
    width: 58,
    height: 58,
  },
});
