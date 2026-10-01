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

export type DashboardTab = 'home' | 'stats' | 'scan' | 'recipes' | 'ai' | 'cart' | 'github';

export interface DashboardBottomBarProps {
  activeTab?: DashboardTab;
  onTabPress?: (tab: DashboardTab) => void;
  onScanPress?: () => void;
  onGithubPress?: () => void;
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
  onGithubPress,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 12);

  const handleTab = (tab: DashboardTab) => {
    if (tab === 'scan') {
      onScanPress?.();
    } else if (tab === 'github') {
      if (onGithubPress) {
        onGithubPress();
      } else {
        onTabPress?.(tab);
      }
    } else {
      onTabPress?.(tab);
    }
  };

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">

      <View style={[styles.barContainer, { paddingBottom: bottomInset }]}>
        <View style={styles.sideGroupLeft}>
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
        </View>

        <View style={styles.centerSpace} />

        <View style={styles.sideGroupRight}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTab('recipes')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Scan History"
          >
            <View style={styles.iconSlot}>
              <Ionicons
                name={activeTab === 'recipes' ? 'time' : 'time-outline'}
                size={26}
                color={activeTab === 'recipes' ? THEME.active : THEME.inactive}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTab('github')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="GitHub Repository"
          >
            <View style={styles.iconSlot}>
              <Ionicons
                name="logo-github"
                size={26}
                color={activeTab === 'github' ? THEME.active : THEME.inactive}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

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
  sideGroupLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  sideGroupRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 24,
    paddingRight: 8,
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
    width: 30,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fodaiImage: {
    width: 20,
    height: 31,
  },
});
