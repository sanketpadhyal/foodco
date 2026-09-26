import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const insets = useSafeAreaInsets();
  
  const [profilePanelVisible, setProfilePanelVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [scannerPanelVisible, setScannerPanelVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

      {/* Scanner Info Panel */}
      <UniversalPanel
        visible={scannerPanelVisible}
        title="Food & Barcode Scanner"
        message="Scan any packaged food barcode or dish to analyze nutritional score, calories, allergens, and ultra-processed status instantly."
        onClose={() => setScannerPanelVisible(false)}
        actions={[
          {
            label: 'Got It',
            variant: 'primary',
            onPress: () => setScannerPanelVisible(false),
          },
        ]}
      />

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
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.white,
  },
  greetingText: {
    fontSize: 20,
    color: theme.green,
    marginBottom: 6,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 22,
    color: theme.textPrimary,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'center',
  },
  subtitleHighlight: {
    color: theme.blue,
  },
  searchBarWrapper: {
    marginHorizontal: 20,
    marginTop: 24,
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
