import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DashboardNavbar, DashboardBottomBar, DashboardTab } from './components';
import UniversalPanel from '../components/universalpanel';

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

interface FoodItem {
  id: string;
  title: string;
  category: string;
  calories: string;
  nutriScore: string;
  scoreColor: string;
  rating: string;
  novaGroup: string;
  additives: string;
  image: any;
  badge: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'veg',
    title: 'Vegetables',
    subtitle: '120 Dishes',
    bgColor: '#EAF8EC',
    image: require('../../assets/dashboard/cat_veg.png'),
  },
  {
    id: 'mush',
    title: 'Mushroom',
    subtitle: '120 Dishes',
    bgColor: '#FDF0EB',
    image: require('../../assets/dashboard/cat_mush.png'),
  },
  {
    id: 'fruit',
    title: 'Fruit',
    subtitle: '120 Dishes',
    bgColor: '#FEF5E7',
    image: require('../../assets/dashboard/cat_fruit.png'),
  },
  {
    id: 'dairy',
    title: 'Dairy & Milk',
    subtitle: '110 Products',
    bgColor: '#E8F4FD',
    image: require('../../assets/dashboard/cat_milk.png'),
  },
  {
    id: 'bakery',
    title: 'Bakery',
    subtitle: '95 Products',
    bgColor: '#F3EBFD',
    image: require('../../assets/dashboard/cat_bread.png'),
  },
];

const HEALTHY_DISHES: FoodItem[] = [
  {
    id: 'dish-1',
    title: 'Salad with thousand island dress',
    category: 'Vegetables & Greens',
    calories: '250.5 Calories',
    nutriScore: 'Nutri-Score A',
    scoreColor: '#137333',
    rating: '4.8',
    novaGroup: 'NOVA 1 (Unprocessed)',
    additives: '0 Harmful Additives',
    image: require('../../assets/dashboard/dish_salad.png'),
    badge: '100% Clean',
  },
  {
    id: 'dish-2',
    title: 'Mayo herb salad with fruits',
    category: 'Fresh Salads',
    calories: '180.2 Calories',
    nutriScore: 'Nutri-Score A',
    scoreColor: '#137333',
    rating: '4.9',
    novaGroup: 'NOVA 1 (Unprocessed)',
    additives: '0 Harmful Additives',
    image: require('../../assets/dashboard/dish_yogurt.png'),
    badge: 'Organic',
  },
  {
    id: 'dish-3',
    title: 'Greek yogurt & organic berry bowl',
    category: 'Dairy & Breakfast',
    calories: '140.0 Calories',
    nutriScore: 'Nutri-Score A',
    scoreColor: '#137333',
    rating: '5.0',
    novaGroup: 'NOVA 1 (Clean)',
    additives: '100% Natural Probiotics',
    image: require('../../assets/dashboard/dish_yogurt.png'),
    badge: 'Superfood',
  },
  {
    id: 'dish-4',
    title: 'Avocado grain bowl with seeds',
    category: 'Healthy Meals',
    calories: '290.0 Calories',
    nutriScore: 'Nutri-Score A',
    scoreColor: '#137333',
    rating: '4.7',
    novaGroup: 'NOVA 1 (Natural)',
    additives: 'Rich in Omega-3',
    image: require('../../assets/dashboard/dish_salad.png'),
    badge: 'Nutrient Dense',
  },
];

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const insets = useSafeAreaInsets();
  
  const [profilePanelVisible, setProfilePanelVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [scannerPanelVisible, setScannerPanelVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState<FoodItem | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        RNStatusBar.setBackgroundColor('#FFFFFF', true);
        RNStatusBar.setBarStyle('dark-content', true);
      } catch (_) {}
      try {
        const NavigationBar = require('expo-navigation-bar');
        NavigationBar.setStyle?.('dark');
      } catch (_) {}
    }
  }, []);

  const filteredDishes = HEALTHY_DISHES.filter(dish =>
    searchQuery.trim().length === 0
      ? true
      : dish.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
      >
        {/* Header Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Hello, {user.displayName || 'User'}</Text>
          <Text style={styles.subtitleText}>
            What would you like to <Text style={styles.subtitleHighlight}>scan</Text>?
          </Text>
        </View>

        {/* Centered Search Bar */}
        <View style={styles.searchBarWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for healthy food..."
            placeholderTextColor="#B5B9BC"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            accessibilityRole="search"
            accessibilityLabel="Search for healthy food"
          />
        </View>

        {/* Categories Section */}
        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, { backgroundColor: cat.bgColor }]}
                activeOpacity={0.82}
                onPress={() => setSearchQuery(cat.title)}
              >
                <View style={styles.categoryIconBox}>
                  <Image source={cat.image} style={styles.categoryImage} resizeMode="contain" />
                </View>
                <Text style={styles.categoryTitle} numberOfLines={1}>
                  {cat.title}
                </Text>
                <Text style={styles.categorySubtitle}>{cat.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Avocado Hero Banner */}
        <TouchableOpacity
          style={styles.bannerContainer}
          activeOpacity={0.92}
          onPress={() => setScannerPanelVisible(true)}
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

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Scanned Products</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchQuery('')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* Dishes / Products List */}
        <View style={styles.dishesListWrapper}>
          {filteredDishes.map(dish => (
            <TouchableOpacity
              key={dish.id}
              style={styles.dishCard}
              activeOpacity={0.85}
              onPress={() => setSelectedDish(dish)}
            >
              <View style={styles.dishImageBox}>
                <Image source={dish.image} style={styles.dishImage} resizeMode="cover" />
              </View>
              <View style={styles.dishInfoCol}>
                <Text style={styles.dishTitle} numberOfLines={1}>
                  {dish.title}
                </Text>
                <View style={styles.dishMetaRow}>
                  <Text style={styles.dishCalories}>🔥 {dish.calories}</Text>
                  <View style={styles.nutriBadge}>
                    <Text style={styles.nutriBadgeText}>{dish.nutriScore}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingScore}>{dish.rating}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Account Logout Panel */}
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

      {/* Barcode & AI Scanner Panel */}
      <UniversalPanel
        visible={scannerPanelVisible}
        title="AI Mart Barcode Scanner"
        message="Scan any packaged mart item barcode to get an instant AI health rating, Nutri-Score, NOVA processing group, calories, and harmful additive alerts."
        onClose={() => setScannerPanelVisible(false)}
        actions={[
          {
            label: 'Ready to Scan',
            variant: 'primary',
            onPress: () => setScannerPanelVisible(false),
          },
        ]}
      />

      {/* Product Nutrition AI Details Panel */}
      {selectedDish && (
        <UniversalPanel
          visible={!!selectedDish}
          title={selectedDish.title}
          message={`Category: ${selectedDish.category}\nCalories: ${selectedDish.calories}\nProcessing: ${selectedDish.novaGroup}\nAdditives: ${selectedDish.additives}\nAI Rating: ${selectedDish.rating} / 5.0 (${selectedDish.badge})`}
          onClose={() => setSelectedDish(null)}
          actions={[
            {
              label: 'Close',
              variant: 'secondary',
              onPress: () => setSelectedDish(null),
            },
            {
              label: 'Scan Another',
              variant: 'primary',
              onPress: () => {
                setSelectedDish(null);
                setScannerPanelVisible(true);
              },
            },
          ]}
        />
      )}

      {/* Dashboard Bottom Bar */}
      <DashboardBottomBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onScanPress={() => setScannerPanelVisible(true)}
      />
    </View>
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
  searchBarWrapper: {
    marginHorizontal: 20,
    marginTop: 18,
    height: 54,
    backgroundColor: '#F7F8FA',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  categoriesWrapper: {
    marginTop: 22,
  },
  categoriesScrollContent: {
    paddingHorizontal: 20,
    paddingRight: 8,
  },
  categoryCard: {
    width: 122,
    height: 140,
    borderRadius: 24,
    padding: 12,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryImage: {
    width: 44,
    height: 44,
  },
  categoryTitle: {
    fontSize: 14,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 26,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.blue,
  },
  dishesListWrapper: {
    paddingHorizontal: 20,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  dishImageBox: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: '#FFF8ED',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dishImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  dishInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  dishTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  dishMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dishCalories: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E949D',
  },
  nutriBadge: {
    marginLeft: 8,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nutriBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#137333',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  ratingStar: {
    color: '#FBBC05',
    fontSize: 12,
    marginRight: 3,
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textPrimary,
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
});
