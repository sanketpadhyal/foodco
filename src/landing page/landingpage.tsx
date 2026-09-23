import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Easing,
  Platform,
  StatusBar as RNStatusBar,
  useWindowDimensions,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let NavigationBarComponent: any = null;
try {
  NavigationBarComponent = require('expo-navigation-bar').NavigationBar;
} catch (error) {}

const logoSource = require('../../assets/logo.png');
const groceriesIcon = require('../../assets/baskets-icons/groceries.png');
const groceryBagIcon = require('../../assets/baskets-icons/grocery-bag.png');
const waterBottleIcon = require('../../assets/baskets-icons/water-bottle.png');

const THEME = {
  primary: '#FF6B35',
  primaryDark: '#E8502A',
  chipPeachBg: '#FFF0E6',
  chipPeachBorder: '#FFB28F',
  chipPeachText: '#E8502A',
  chipOutlineBorder: '#3A3A3A',
  chipOutlineText: '#1A1A1A',
  bg: '#F5F6F8',
  panelBg: '#FFFFFF',
  textPrimary: '#141414',
  textMuted: '#666666',
};

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

interface LandingPageProps {
  onGetStarted?: () => void;
  onLogin?: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isVeryCompactHeight = screenHeight < 680;
  const isCompactHeight = screenHeight < 760;
  const maxContentWidth = Math.min(screenWidth, 440);

  const scale = isVeryCompactHeight ? 0.82 : isCompactHeight ? 0.90 : 1.0;
  const scaled = (value: number) => Math.round(value * scale);

  const titleFontSize = isVeryCompactHeight
    ? 25
    : isCompactHeight
    ? 29
    : Math.min(33, Math.round(screenWidth * 0.082));
  const titleLineHeight = Math.round(titleFontSize * 1.2);

  const subtitleFontSize = isVeryCompactHeight ? 13 : 14.5;
  const subtitleLineHeight = Math.round(subtitleFontSize * 1.35);

  const circleBadgeSize = scaled(44);
  const badgeIconSize = scaled(25);
  const chipPadV = scaled(9.5);
  const chipPadH = scaled(15);
  const chipFontSize = isVeryCompactHeight ? 12.5 : 13.5;

  const btnPaddingVertical = isVeryCompactHeight ? 13 : isCompactHeight ? 15 : 17;
  const btnFontSize = isVeryCompactHeight ? 15 : 16.5;

  const contentPaddingTop = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 12) + (isCompactHeight ? 6 : 10);
  const contentPaddingBottom = Math.max(insets.bottom, 12) + (isVeryCompactHeight ? 10 : 16);

  const entranceFade = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-18)).current;
  const row1Anim = useRef(new Animated.Value(0)).current;
  const row2Anim = useRef(new Animated.Value(0)).current;
  const row3Anim = useRef(new Animated.Value(0)).current;
  const footerFade = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(22)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const primaryBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS === 'android' && NavigationBarComponent) {
      try {
        NavigationBarComponent.setStyle?.('dark');
        NavigationBarComponent.setHidden?.(false);
      } catch (e) {}
    }

    const entranceAnim = Animated.parallel([
      Animated.timing(entranceFade, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(85, [
        Animated.timing(row1Anim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(row2Anim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(row3Anim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(footerFade, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(footerTranslateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    entranceAnim.start(({ finished }) => {
      if (finished) {
        floatLoop.start();
      }
    });

    return () => {
      entranceAnim.stop();
      floatLoop.stop();
    };
  }, []);

  const floatRow1X = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 4],
  });
  const floatRow2X = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -4],
  });
  const floatRow3X = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 3],
  });

  const handlePressIn = () => {
    Animated.spring(primaryBtnScale, {
      toValue: 0.965,
      damping: 18,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(primaryBtnScale, {
      toValue: 1,
      damping: 18,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar style="dark" />
      {Platform.OS === 'android' && NavigationBarComponent && (
        <NavigationBarComponent style="dark" />
      )}

      <View
        style={[
          styles.container,
          {
            paddingTop: contentPaddingTop,
            paddingBottom: 0,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.headerBar,
            {
              opacity: entranceFade,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Image
              source={logoSource}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
          <Animated.View
            style={[
              styles.headerSection,
              {
                opacity: entranceFade,
                transform: [{ translateY: headerTranslateY }],
              },
            ]}
          >
            <Text
              style={[
                styles.mainTitle,
                { fontSize: titleFontSize, lineHeight: titleLineHeight },
              ]}
            >
              {"Let's make\nyour days\nhealthier"}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: subtitleFontSize,
                  lineHeight: subtitleLineHeight,
                  marginTop: isCompactHeight ? 8 : 10,
                },
              ]}
            >
              {"Nutritious, delicious, and convenient."}
            </Text>
          </Animated.View>

          <View
            style={[
              styles.cloudSection,
              {
                paddingVertical: isCompactHeight ? 8 : 12,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.tagRow,
                styles.row1,
                {
                  opacity: row1Anim,
                  marginVertical: isCompactHeight ? 5 : 6.5,
                  transform: [
                    {
                      translateY: row1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: row1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.93, 1],
                      }),
                    },
                    { translateX: -24 },
                    { translateX: floatRow1X },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.chip,
                  styles.chipFilled,
                  { paddingVertical: chipPadV, paddingHorizontal: chipPadH },
                ]}
              >
                <Text style={[styles.chipFilledText, { fontSize: chipFontSize }]}>Nutrients</Text>
              </View>

              <View
                style={[
                  styles.circleBadge,
                  styles.chipOutline,
                  { width: circleBadgeSize, height: circleBadgeSize, borderRadius: circleBadgeSize / 2 },
                ]}
              >
                <Image
                  source={groceryBagIcon}
                  style={{ width: badgeIconSize, height: badgeIconSize }}
                  resizeMode="contain"
                />
              </View>

              <View
                style={[
                  styles.chip,
                  styles.chipOutline,
                  { paddingVertical: chipPadV, paddingHorizontal: chipPadH },
                ]}
              >
                <Text style={[styles.chipOutlineText, { fontSize: chipFontSize }]}>
                  Track meals mindfully
                </Text>
              </View>

              <View
                style={[
                  styles.chip,
                  styles.chipOutline,
                  { paddingVertical: chipPadV, paddingHorizontal: chipPadH },
                ]}
              >
                <Text style={[styles.chipOutlineText, { fontSize: chipFontSize }]}>Track</Text>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.tagRow,
                styles.row2,
                {
                  opacity: row2Anim,
                  marginVertical: isCompactHeight ? 5 : 6.5,
                  transform: [
                    {
                      translateY: row2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: row2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.93, 1],
                      }),
                    },
                    { translateX: 18 },
                    { translateX: floatRow2X },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.chip,
                  styles.chipOutline,
                  { paddingVertical: chipPadV, paddingHorizontal: chipPadH },
                ]}
              >
                <Text style={[styles.chipOutlineText, { fontSize: chipFontSize }]}>
                  Build healthy habits
                </Text>
              </View>

              <View
                style={[
                  styles.circleBadge,
                  styles.chipOutline,
                  { width: circleBadgeSize, height: circleBadgeSize, borderRadius: circleBadgeSize / 2 },
                ]}
              >
                <Image
                  source={groceriesIcon}
                  style={{ width: badgeIconSize, height: badgeIconSize }}
                  resizeMode="contain"
                />
              </View>

              <View
                style={[
                  styles.chip,
                  styles.chipFilled,
                  { paddingVertical: chipPadV, paddingHorizontal: chipPadH },
                ]}
              >
                <Text style={[styles.chipFilledText, { fontSize: chipFontSize }]}>
                  Support energy
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.tagRow,
                styles.row3,
                {
                  opacity: row3Anim,
                  marginVertical: isCompactHeight ? 5 : 6.5,
                  transform: [
                    {
                      translateY: row3Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: row3Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.93, 1],
                      }),
                    },
                    { translateX: -22 },
                    { translateX: floatRow3X },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.chip,
                  styles.chipFilled,
                  { paddingVertical: chipPadV, paddingHorizontal: chipPadH },
                ]}
              >
                <Text style={[styles.chipFilledText, { fontSize: chipFontSize }]}>
                  Smart nutrition
                </Text>
              </View>

              <View
                style={[
                  styles.circleBadge,
                  styles.chipOutline,
                  { width: circleBadgeSize, height: circleBadgeSize, borderRadius: circleBadgeSize / 2 },
                ]}
              >
                <Image
                  source={waterBottleIcon}
                  style={{ width: badgeIconSize, height: badgeIconSize, borderRadius: badgeIconSize / 2 }}
                  resizeMode="contain"
                />
              </View>

              <View
                style={[
                  styles.chip,
                  styles.chipOutline,
                  { paddingVertical: chipPadV, paddingHorizontal: chipPadH },
                ]}
              >
                <Text style={[styles.chipOutlineText, { fontSize: chipFontSize }]}>
                  Increase meals nutrition
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.footerPanel,
            {
              opacity: footerFade,
              transform: [{ translateY: footerTranslateY }],
              paddingBottom: contentPaddingBottom,
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: primaryBtnScale }] }}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  opacity: pressed ? 0.9 : 1,
                  paddingVertical: btnPaddingVertical,
                },
              ]}
              onPress={onGetStarted}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Text style={[styles.primaryButtonText, { fontSize: btnFontSize }]}>
                Get Started
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

export { LandingPage };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-around',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  mainTitle: {
    fontFamily: serifFont,
    fontWeight: '700',
    color: THEME.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontWeight: '500',
    color: THEME.textMuted,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  cloudSection: {
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row1: {},
  row2: {},
  row3: {},
  chip: {
    borderRadius: 26,
    marginHorizontal: 4.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBadge: {
    marginHorizontal: 4.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  chipFilled: {
    backgroundColor: THEME.chipPeachBg,
    borderWidth: 1.5,
    borderColor: THEME.chipPeachBorder,
    borderStyle: 'dashed',
  },
  chipFilledText: {
    fontFamily: serifFont,
    fontWeight: '600',
    color: THEME.chipPeachText,
  },
  chipOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: THEME.chipOutlineBorder,
    borderStyle: 'dashed',
  },
  chipOutlineText: {
    fontFamily: serifFont,
    fontWeight: '600',
    color: THEME.chipOutlineText,
  },
  footerPanel: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 22,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
    borderTopWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderLeftWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderRightWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
