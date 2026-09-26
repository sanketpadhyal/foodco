import React, { memo } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type DashboardTab = 'home' | 'stats' | 'scan' | 'recipes' | 'ai' | 'cart';

export interface DashboardBottomBarProps {
  activeTab?: DashboardTab;
  onTabPress?: (tab: DashboardTab) => void;
  onScanPress?: () => void;
}

const scannerBtnSource = require('../../../assets/orange-scanner-btn.png');
const fodaiSource = require('../../../assets/fodai.png');

const THEME = {
  active: '#FF6B35',
  activeAccent: '#FFB894',
  inactive: '#9CA3AF',
  inactiveAccent: '#D1D5DB',
  border: '#F3F4F6',
};

export const DashboardBottomBar: React.FC<DashboardBottomBarProps> = memo(({
  activeTab = 'home',
  onTabPress,
  onScanPress,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 12);

  const handleTab = (tab: DashboardTab) => {
    if (tab === 'scan') {
      onScanPress?.();
    } else {
      onTabPress?.(tab);
    }
  };

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      {/* Solid Pure White Bottom Bar */}
      <View style={[styles.barContainer, { paddingBottom: bottomInset }]}>
        {/* Tab 1: Home / Explore Grid */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTab('home')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Home"
        >
          <View style={styles.iconSlot}>
            <View style={styles.gridIconWrap}>
              <View
                style={[
                  styles.gridBlock,
                  { backgroundColor: activeTab === 'home' ? THEME.active : THEME.inactive },
                ]}
              />
              <View
                style={[
                  styles.gridBlock,
                  { backgroundColor: activeTab === 'home' ? THEME.activeAccent : THEME.inactiveAccent },
                ]}
              />
              <View
                style={[
                  styles.gridBlock,
                  { backgroundColor: activeTab === 'home' ? THEME.active : THEME.inactive },
                ]}
              />
              <View
                style={[
                  styles.gridBlock,
                  { backgroundColor: activeTab === 'home' ? THEME.active : THEME.inactive },
                ]}
              />
            </View>
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
          <View style={styles.iconSlot}>
            <View style={styles.chartIconWrap}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: 12,
                    backgroundColor: activeTab === 'stats' ? THEME.active : THEME.inactive,
                  },
                ]}
              />
              <View
                style={[
                  styles.chartBar,
                  {
                    height: 20,
                    backgroundColor: activeTab === 'stats' ? THEME.active : THEME.inactive,
                  },
                ]}
              />
              <View
                style={[
                  styles.chartBar,
                  {
                    height: 15,
                    backgroundColor: activeTab === 'stats' ? THEME.active : THEME.inactive,
                  },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Center Space reserved for Floating Scanner Button */}
        <View style={styles.centerSpace} />

        {/* Tab 4: Recipes / Documents */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTab('recipes')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Recipes"
        >
          <View style={styles.iconSlot}>
            <Ionicons
              name={activeTab === 'recipes' ? 'document-text' : 'document-text-outline'}
              size={27}
              color={activeTab === 'recipes' ? THEME.active : THEME.inactive}
            />
          </View>
        </TouchableOpacity>

        {/* Tab 5: Fod AI */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTab('ai')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Fod AI Assistant"
        >
          <View style={styles.aiIconSlot}>
            <Image
              source={fodaiSource}
              style={[
                styles.fodaiImage,
                { opacity: activeTab === 'ai' || activeTab === 'cart' ? 1 : 0.72 },
              ]}
              resizeMode="contain"
            />
          </View>
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
    paddingHorizontal: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 10,
  },
  tabButton: {
    width: 48,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSlot: {
    width: 28,
    height: 28,
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
    width: 9.8,
    height: 9.8,
    borderRadius: 3.2,
  },
  chartIconWrap: {
    width: 22,
    height: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  chartBar: {
    width: 4.8,
    borderRadius: 2.4,
  },
  centerSpace: {
    width: 60,
    height: 44,
  },
  floatingCenterBtn: {
    position: 'absolute',
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 12,
  },
  scannerImage: {
    width: 60,
    height: 60,
  },
  aiIconSlot: {
    width: 32,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fodaiImage: {
    width: 25,
    height: 38,
  },
});
