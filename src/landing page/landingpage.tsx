import React, { useEffect, useRef, useState } from 'react';
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
  AppState,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AntDesign } from '@expo/vector-icons';
import UniversalPanel from '../components/universalpanel';

let NavigationBarComponent: any = null;
try {
  NavigationBarComponent = require('expo-navigation-bar').NavigationBar;
} catch (error) {}

const logoSource = require('../../assets/logo.png');
const fodaiLogo = require('../../logo-formats/fodai.png');
const fodaiVideo = require('../../logo-formats/clideo_editor_53a7cf597624468ea2a9dad5e7319e8f_V1.mp4');
const groceriesIcon = require('../../assets/baskets-icons/groceries.png');
const groceryBagIcon = require('../../assets/baskets-icons/grocery-bag.png');
const waterBottleIcon = require('../../assets/baskets-icons/water-bottle.png');
const arrowRightIcon = require('../../assets/arrow-right.png');
const infoIcon = require('../../assets/info.png');

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
  blue: '#1A73E8',
};

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

interface LandingPageProps {
  onGetStarted?: () => void;
  onLogin?: () => void;
  onAbout?: () => void;
  isFocused?: boolean;
}

export default function LandingPage({ onGetStarted, onAbout, isFocused = true }: LandingPageProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [aboutVisible, setAboutVisible] = useState(false);
  const [githubModalVisible, setGithubModalVisible] = useState(false);

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

  const btnPaddingVertical = isVeryCompactHeight ? 11 : isCompactHeight ? 12 : 13.5;
  const btnFontSize = isVeryCompactHeight ? 14 : 15;

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
  const aboutBtnScale = useRef(new Animated.Value(1)).current;

  const videoPlayer = useVideoPlayer(fodaiVideo, (player) => {
    player.loop = false;
    player.muted = true;
    player.play();
  });

  const handlePressVideo = () => {
    if (videoPlayer) {
      videoPlayer.replay();
    }
  };

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isFocused && videoPlayer) {
      videoPlayer.replay();
    }
  }, [isFocused, videoPlayer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isFocused && videoPlayer) {
        videoPlayer.replay();
      }
    });
    return () => subscription.remove();
  }, [isFocused, videoPlayer]);

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

  const handleAboutPressIn = () => {
    Animated.spring(aboutBtnScale, {
      toValue: 0.965,
      damping: 18,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const handleAboutPressOut = () => {
    Animated.spring(aboutBtnScale, {
      toValue: 1,
      damping: 18,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const handleOpenAbout = () => {
    setAboutVisible(true);
    if (onAbout) {
      onAbout();
    }
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
          <TouchableOpacity
            style={styles.githubButton}
            onPress={() => setGithubModalVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AntDesign name="github" size={26} color={THEME.textPrimary} />
          </TouchableOpacity>
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
              {"Scan barcodes,\nshop "}
              <Text style={{ color: THEME.blue }}>smarter</Text>
              {",\neat "}
              <Text style={{ color: THEME.blue }}>healthier</Text>
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
              {"Instant food info while shopping & ask FodAi anything."}
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
                <Text style={[styles.chipFilledText, { fontSize: chipFontSize }]}>Scan barcode</Text>
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
                  Instant product info
                </Text>
              </View>

              <View
                style={[
                  styles.chip,
                  styles.chipOutline,
                  { paddingVertical: chipPadV, paddingHorizontal: chipPadH },
                ]}
              >
                <Text style={[styles.chipOutlineText, { fontSize: chipFontSize }]}>Shop smarter</Text>
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
                  Ask FodAi anything
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
                  Check ingredients
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
                  Allergen alerts
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
                  Healthy alternatives
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
          <View style={styles.footerLogoWrap}>
            <Pressable onPress={handlePressVideo}>
              <VideoView
                player={videoPlayer}
                style={styles.footerVideo}
                nativeControls={false}
                contentFit="contain"
              />
            </Pressable>
          </View>
          <Text style={[styles.footerHintText, { fontSize: isVeryCompactHeight ? 12 : 13 }]}>
            Scan any product barcode while shopping to get instant info, and ask our FodAi any question about it.
          </Text>
          <View style={styles.buttonRow}>
            <Animated.View style={{ flex: 1.35, transform: [{ scale: primaryBtnScale }] }}>
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
                <Image
                  source={arrowRightIcon}
                  style={[styles.primaryButtonIcon, { width: Math.round(btnFontSize * 0.95), height: Math.round(btnFontSize * 0.95) }]}
                  resizeMode="contain"
                />
              </Pressable>
            </Animated.View>

            <Animated.View style={{ flex: 1, transform: [{ scale: aboutBtnScale }] }}>
              <Pressable
                style={({ pressed }) => [
                  styles.aboutButton,
                  {
                    opacity: pressed ? 0.9 : 1,
                    paddingVertical: btnPaddingVertical,
                  },
                ]}
                onPress={handleOpenAbout}
                onPressIn={handleAboutPressIn}
                onPressOut={handleAboutPressOut}
              >
                <Text style={[styles.aboutButtonText, { fontSize: btnFontSize }]}>
                  About
                </Text>
                <Image
                  source={infoIcon}
                  style={[styles.aboutButtonIcon, { width: Math.round(btnFontSize * 0.95), height: Math.round(btnFontSize * 0.95) }]}
                  resizeMode="contain"
                />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      <UniversalPanel
        visible={aboutVisible}
        title="About Foodco"
        message="Foodco is your mindful nutrition companion. Scan any product barcode while shopping to get instant info, ingredient analysis, allergen alerts, and ask our FodAi assistant any question about it."
        onClose={() => setAboutVisible(false)}
        actions={[
          {
            label: 'Got it',
            variant: 'blue',
            onPress: () => setAboutVisible(false),
          },
        ]}
      />

      <UniversalPanel
        visible={githubModalVisible}
        title="GitHub Repository"
        message="Are you sure you want to go to the GitHub repository of this?"
        onClose={() => setGithubModalVisible(false)}
        actions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => setGithubModalVisible(false),
          },
          {
            label: 'Open GitHub',
            variant: 'blue',
            onPress: () => {
              setGithubModalVisible(false);
              Linking.openURL('https://github.com/sanketpadhyal/foodco.git').catch(() => {});
            },
          },
        ]}
      />
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
    justifyContent: 'space-between',
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
  githubButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  primaryButtonIcon: {
    marginLeft: 7,
    tintColor: '#FFFFFF',
  },
  aboutButton: {
    backgroundColor: THEME.blue,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  aboutButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  aboutButtonIcon: {
    marginLeft: 7,
    tintColor: '#FFFFFF',
  },
  footerLogoWrap: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginLeft: 0,
  },
  footerVideo: {
    width: 64,
    height: 64,
    backgroundColor: '#FFFFFF',
  },
  footerHintText: {
    fontSize: 13,
    lineHeight: 18.5,
    color: '#6B7280',
    textAlign: 'left',
    marginBottom: 14,
    paddingHorizontal: 2,
    fontWeight: '500',
  },
});
