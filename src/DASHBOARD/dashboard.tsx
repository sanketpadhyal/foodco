import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { DashboardNavbar, DashboardBottomBar, DashboardTab } from './components';
import UniversalPanel from '../components/universalpanel';
import { checkSessionStatus, clearUserSession } from '../auth-page/authService';
import BarcodeScannerPage from './BarcodeScannerPage';
import CategoryProductsPage from './CategoryProductsPage';
import SearchResultsPage from './SearchResultsPage';
import { ProductDetailPage } from '../product-detail';
import { ScannedProduct } from './productService';

export interface DashboardProps {
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
  };
  onLogout: () => void;
}

const theme = {
  primary: '#FF6B35',
  primaryDark: '#E8502A',
  blue: '#1A73E8',
  green: '#58B84F',
  bg: '#FFFFFF',
  white: '#FFFFFF',
  textPrimary: '#1E1D25',
  textSecondary: '#7F8489',
  border: '#E5E7EB',
};

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const sansFont = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const boldSansFont = Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'sans-serif' });

interface CategoryItem {
  id: string;
  title: string;
  subtitle: string;
  bgColor: string;
  image: any;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'beauty',
    title: 'Beauty',
    subtitle: 'Cosmetics & Care',
    bgColor: '#FFF0F2',
    image: require('../../assets/dashboard/cat_beauty.png'),
  },
  {
    id: 'food',
    title: 'Food',
    subtitle: 'Grocery & Snacks',
    bgColor: '#FFF8E7',
    image: require('../../assets/dashboard/cat_food.png'),
  },
  {
    id: 'drinks',
    title: 'Cold Drinks',
    subtitle: 'Soda & Juices',
    bgColor: '#EAF4FD',
    image: require('../../assets/dashboard/cat_drinks.png'),
  },
];

const CATEGORIES_ROW_2: CategoryItem[] = [
  {
    id: 'chocolates',
    title: 'Chocolates',
    subtitle: 'Sweets & Treats',
    bgColor: '#F4ECF8',
    image: require('../../assets/dashboard/cat_chocolates.png'),
  },
  {
    id: 'biscuits',
    title: 'Biscuits',
    subtitle: 'Cookies & Bakes',
    bgColor: '#FFF5EC',
    image: require('../../assets/dashboard/cat_biscuits.png'),
  },
  {
    id: 'perfume',
    title: 'Perfume',
    subtitle: 'Fragrance & Scent',
    bgColor: '#F0F2F6',
    image: require('../../assets/dashboard/cat_perfume.png'),
  },
];

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const insets = useSafeAreaInsets();

  const [profilePanelVisible, setProfilePanelVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [scannerPageVisible, setScannerPageVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionExpiredVisible, setSessionExpiredVisible] = useState(false);
  const [githubPanelVisible, setGithubPanelVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [categoryPageVisible, setCategoryPageVisible] = useState(false);
  const [searchPageVisible, setSearchPageVisible] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<ScannedProduct | null>(null);
  const [productDetailVisible, setProductDetailVisible] = useState(false);
  const [futureUpdatePanelVisible, setFutureUpdatePanelVisible] = useState(false);
  const [futureUpdateTitle, setFutureUpdateTitle] = useState('Coming Soon');

  const handleTabPress = (tab: DashboardTab) => {
    if (tab === 'stats') {
      setFutureUpdateTitle('Insights & Health Analytics');
      setFutureUpdatePanelVisible(true);
    } else if (tab === 'recipes') {
      setFutureUpdateTitle('Saved Lists & History');
      setFutureUpdatePanelVisible(true);
    } else if (tab === 'scan') {
      setScannerPageVisible(true);
    } else if (tab === 'github') {
      setGithubPanelVisible(true);
    } else {
      setActiveTab(tab);
    }
  };

  const pageFade = useRef(new Animated.Value(0)).current;
  const pageSlide = useRef(new Animated.Value(32)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const handleCategoryPress = (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setCategoryPageVisible(true);
  };

  useEffect(() => {
    let isMounted = true;
    async function verifySession() {
      const status = await checkSessionStatus();
      if (isMounted && !status.valid) {
        setSessionExpiredVisible(true);
      }
    }
    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pageFade, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(pageSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        RNStatusBar.setBackgroundColor('#FFFFFF', true);
        RNStatusBar.setBarStyle('dark-content', true);
      } catch (_) {}
      try {
        const NavigationBar = require('expo-navigation-bar');
        NavigationBar.setBackgroundColorAsync?.('#FFFFFF');
        NavigationBar.setButtonStyleAsync?.('dark');
        NavigationBar.setBorderColorAsync?.('#EEF0F4');
      } catch (_) {}
    }
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: pageFade,
          transform: [{ translateY: pageSlide }],
        },
      ]}
    >
      <StatusBar style="dark" />
      <View style={[styles.navbarWrapper, { paddingTop: insets.top }]}>
        <DashboardNavbar
          user={user}
          onProfilePress={() => setProfilePanelVisible(true)}
          onLogout={onLogout}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
      >

        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Hello, {user.displayName || 'User'}</Text>
          <Text style={styles.subtitleText}>
            What would you like to <Text style={styles.subtitleHighlight}>scan</Text>?
          </Text>
        </View>

        <View style={styles.stickySearchContainer}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchLeadingIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for healthy food..."
              placeholderTextColor="#B5B9BC"
              underlineColorAndroid="transparent"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                if (searchQuery.trim().length > 0) {
                  setSearchPageVisible(true);
                }
              }}
              returnKeyType="search"
              accessibilityRole="search"
              accessibilityLabel="Search for healthy food"
            />
            <TouchableOpacity
              style={styles.searchCameraBtn}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => {
                if (searchQuery.trim().length > 0) {
                  setSearchPageVisible(true);
                } else {
                  setScannerPageVisible(true);
                }
              }}
              accessibilityLabel={searchQuery.trim().length > 0 ? "Search Mart Products" : "Scan Mart Barcode"}
            >
              <Ionicons
                name={searchQuery.trim().length > 0 ? "search" : "camera"}
                size={20}
                color="#FF6B35"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {CATEGORIES.map(cat => (
              <Animated.View
                key={cat.id}
                style={{ transform: [{ scale: cardScale }] }}
              >
                <TouchableOpacity
                  style={[styles.categoryCard, { backgroundColor: cat.bgColor }]}
                  activeOpacity={0.7}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <Image
                    source={cat.image}
                    style={styles.categoryPopoutImage}
                    resizeMode="contain"
                  />
                  <View style={styles.categoryTextContent}>
                    <Text style={styles.categoryTitle} numberOfLines={1}>
                      {cat.title}
                    </Text>
                    <Text style={styles.categorySubtitle}>{cat.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.categoriesRow2Wrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {CATEGORIES_ROW_2.map(cat => (
              <Animated.View
                key={cat.id}
                style={{ transform: [{ scale: cardScale }] }}
              >
                <TouchableOpacity
                  style={[styles.categoryCard, { backgroundColor: cat.bgColor }]}
                  activeOpacity={0.7}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <Image
                    source={cat.image}
                    style={styles.categoryPopoutImage}
                    resizeMode="contain"
                  />
                  <View style={styles.categoryTextContent}>
                    <Text style={styles.categoryTitle} numberOfLines={1}>
                      {cat.title}
                    </Text>
                    <Text style={styles.categorySubtitle}>{cat.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={styles.bannerContainer}
          activeOpacity={0.92}
          onPress={() => setScannerPageVisible(true)}
        >
          <View style={styles.bannerCard}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerHeading}>Health body comes with good nutrients</Text>
                <Text style={styles.bannerSubheading}>
                  Scan mart barcodes for instant AI nutrition info & score
                </Text>
                <View style={styles.bannerActionBtn}>
                  <Text style={styles.bannerActionText}>Scan Product Now  ➔</Text>
                </View>
              </View>
              <Image
                source={require('../../assets/dashboard/avocado_3d.png')}
                style={styles.bannerAvocadoImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bannerContainer, styles.aiBannerContainer]}
          activeOpacity={0.92}
          onPress={() => setScannerPageVisible(true)}
        >
          <View style={[styles.bannerCard, styles.aiBannerCard]}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerHeading}>Foodco AI detects harmful additives</Text>
                <Text style={styles.bannerSubheading}>
                  Instant AI safety score, hidden palm oil, carcinogens & E-numbers
                </Text>
                <View style={[styles.bannerActionBtn, styles.aiBannerActionBtn]}>
                  <Text style={[styles.bannerActionText, styles.aiBannerActionText]}>
                    Scan With Foodco AI  ➔
                  </Text>
                </View>
              </View>
              <Image
                source={require('../../assets/fodai.png')}
                style={styles.bannerAiImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <UniversalPanel
        visible={profilePanelVisible}
        title="Account"
        onClose={() => setProfilePanelVisible(false)}
        actions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => setProfilePanelVisible(false),
          },
          {
            label: 'Log Out',
            variant: 'danger',
            onPress: () => {
              setProfilePanelVisible(false);
              onLogout();
            },
          },
        ]}
      >
        <View style={styles.profilePanelCard}>
          <View style={styles.profilePanelAvatarWrap}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.profilePanelAvatar} />
            ) : (
              <View style={styles.profilePanelAvatarPlaceholder}>
                <Text style={styles.profilePanelAvatarText}>
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profilePanelInfo}>
            <Text style={styles.profilePanelName} numberOfLines={1}>
              {user.displayName || 'Member'}
            </Text>
            <Text style={styles.profilePanelEmail} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>
        <Text style={styles.profilePanelQuestion}>
          Are you sure you want to log out of your account?
        </Text>
      </UniversalPanel>

      <UniversalPanel
        visible={sessionExpiredVisible}
        title="Session Expired"
        dismissOnBackdropPress={false}
        onClose={async () => {
          setSessionExpiredVisible(false);
          await clearUserSession();
          onLogout();
        }}
        actions={[
          {
            label: 'Continue',
            variant: 'primary',
            onPress: async () => {
              setSessionExpiredVisible(false);
              await clearUserSession();
              onLogout();
            },
          },
        ]}
      >
        <View style={styles.expiredIllustrationWrap}>
          <Image
            source={require('../../assets/dashboard/session_expired.png')}
            style={styles.expiredIllustration}
            resizeMode="contain"
          />
          <Text style={styles.expiredMessageText}>
            Your session is expired. You are logged out.
          </Text>
        </View>
      </UniversalPanel>

      <DashboardBottomBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        onScanPress={() => setScannerPageVisible(true)}
        onGithubPress={() => setGithubPanelVisible(true)}
      />

      <UniversalPanel
        visible={futureUpdatePanelVisible}
        title={futureUpdateTitle}
        message="We will bring this in a future stable update. Stay tuned!"
        onClose={() => setFutureUpdatePanelVisible(false)}
        actions={[
          {
            label: 'Got it',
            variant: 'primary',
            onPress: () => setFutureUpdatePanelVisible(false),
          },
        ]}
      />

      <UniversalPanel
        visible={githubPanelVisible}
        title="Contribute on GitHub"
        message="Do you want to redirect to the GitHub repository of this project to contribute?"
        onClose={() => setGithubPanelVisible(false)}
        actions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => setGithubPanelVisible(false),
          },
          {
            label: 'Open GitHub',
            variant: 'blue',
            onPress: () => {
              setGithubPanelVisible(false);
              Linking.openURL('https://github.com/sanketpadhyal/foodco.git').catch(() => {});
            },
          },
        ]}
      />

      <BarcodeScannerPage
        visible={scannerPageVisible}
        onClose={() => setScannerPageVisible(false)}
      />

      <CategoryProductsPage
        visible={categoryPageVisible}
        category={selectedCategory}
        onClose={() => setCategoryPageVisible(false)}
        onSelectProduct={(product) => {
          setSelectedDetailProduct(product);
          setProductDetailVisible(true);
        }}
      />

      <SearchResultsPage
        visible={searchPageVisible}
        initialQuery={searchQuery}
        onClose={() => setSearchPageVisible(false)}
        onSelectProduct={(product) => {
          setSelectedDetailProduct(product);
          setProductDetailVisible(true);
        }}
      />

      <ProductDetailPage
        visible={productDetailVisible}
        product={selectedDetailProduct}
        onClose={() => setProductDetailVisible(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  navbarWrapper: {
    backgroundColor: theme.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.white,
  },
  scrollContent: {
    paddingBottom: 24,
    backgroundColor: theme.white,
  },
  greetingContainer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.white,
  },
  greetingText: {
    fontFamily: sansFont,
    fontSize: 20,
    color: theme.green,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitleText: {
    fontFamily: serifFont,
    fontSize: 23,
    color: theme.textPrimary,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'center',
  },
  subtitleHighlight: {
    fontFamily: boldSansFont,
    color: theme.blue,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stickySearchContainer: {
    backgroundColor: theme.white,
    paddingTop: 8,
    paddingBottom: 16,
    zIndex: 10,
  },
  searchBarWrapper: {
    marginHorizontal: 20,
    height: 54,
    backgroundColor: '#F7F8FA',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchLeadingIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
    color: theme.textPrimary,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  searchCameraBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  categoriesWrapper: {
    marginTop: 14,
    overflow: 'visible',
  },
  categoriesRow2Wrapper: {
    marginTop: 4,
    overflow: 'visible',
  },
  categoriesScrollContent: {
    paddingHorizontal: 20,
    paddingRight: 8,
    paddingTop: 36,
    paddingBottom: 8,
    overflow: 'visible',
  },
  categoryCard: {
    width: 126,
    height: 135,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingBottom: 16,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'visible',
  },
  categoryPopoutImage: {
    position: 'absolute',
    top: -28,
    width: 76,
    height: 96,
    zIndex: 5,
  },
  categoryTextContent: {
    alignItems: 'center',
    width: '100%',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'center',
  },
  categorySubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E949D',
    marginTop: 2,
    textAlign: 'center',
  },
  bannerContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 24,
    shadowColor: '#3EA62D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  bannerCard: {
    backgroundColor: '#52BF38',
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  bannerHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  bannerSubheading: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 4,
    lineHeight: 16,
  },
  bannerActionBtn: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bannerActionText: {
    color: '#2E881F',
    fontSize: 11.5,
    fontWeight: '800',
  },
  bannerAvocadoImage: {
    width: 108,
    height: 108,
  },
  aiBannerContainer: {
    marginTop: 18,
    marginBottom: 8,
    shadowColor: '#E65100',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  aiBannerCard: {
    backgroundColor: '#FF6B35',
  },
  aiBannerActionBtn: {
    backgroundColor: '#FFFFFF',
  },
  aiBannerActionText: {
    color: '#E65100',
  },
  bannerAiImage: {
    width: 95,
    height: 135,
  },
  profilePanelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  profilePanelAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E4F6D4',
  },
  profilePanelAvatar: {
    width: '100%',
    height: '100%',
  },
  profilePanelAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.primary,
  },
  profilePanelAvatarText: {
    color: theme.white,
    fontSize: 20,
    fontWeight: '700',
  },
  profilePanelInfo: {
    marginLeft: 14,
    flex: 1,
  },
  profilePanelName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  profilePanelEmail: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  profilePanelQuestion: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  expiredIllustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  expiredIllustration: {
    width: 140,
    height: 140,
  },
  expiredMessageText: {
    fontSize: 15,
    color: '#656A72',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
});
