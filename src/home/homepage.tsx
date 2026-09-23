import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthUser } from '../auth-page/authService';

const logoSource = require('../../assets/logo.png');
const groceriesIcon = require('../../assets/baskets-icons/groceries.png');
const groceryBagIcon = require('../../assets/baskets-icons/grocery-bag.png');
const waterBottleIcon = require('../../assets/baskets-icons/water-bottle.png');

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

interface HomePageProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function HomePage({ user, onLogout }: HomePageProps) {
  const insets = useSafeAreaInsets();

  const displayName = user.displayName || user.email.split('@')[0] || 'Member';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={logoSource} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.appTitle}>Foodco</Text>
            <Text style={styles.greetingText}>Hello, {displayName}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color="#E8502A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userCard}>
          <View style={styles.avatarWrap}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>AUTHENTICATED</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mindful Nutrition</Text>

        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={styles.cardIconWrap}>
              <Image source={groceriesIcon} style={styles.cardIcon} resizeMode="contain" />
            </View>
            <Text style={styles.cardTitle}>Fresh Harvest</Text>
            <Text style={styles.cardDesc}>100% Organic, traceable whole foods.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardIconWrap}>
              <Image source={groceryBagIcon} style={styles.cardIcon} resizeMode="contain" />
            </View>
            <Text style={styles.cardTitle}>Smart Basket</Text>
            <Text style={styles.cardDesc}>Personalized wholesome meal plans.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardIconWrap}>
              <Image source={waterBottleIcon} style={styles.cardIcon} resizeMode="contain" />
            </View>
            <Text style={styles.cardTitle}>Hydration Track</Text>
            <Text style={styles.cardDesc}>Daily vitality & hydration goals.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardIconWrap}>
              <MaterialCommunityIcons name="shield-check" size={28} color="#FF6B35" />
            </View>
            <Text style={styles.cardTitle}>Privacy First</Text>
            <Text style={styles.cardDesc}>Zero ads, zero data monetization.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  appTitle: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#0D0E11',
  },
  greetingText: {
    fontSize: 13,
    color: '#7F8489',
    fontWeight: '500',
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#0D0E11',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#7F8489',
    marginBottom: 6,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F9EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#0D0E11',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF0E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    width: 26,
    height: 26,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D0E11',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7F8489',
  },
});
