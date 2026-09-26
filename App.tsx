import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  useWindowDimensions,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FoodcoSplashScreen from './src/splash-screen/splashscreen';
import LandingPage from './src/landing page/landingpage';
import { AuthPage } from './src/auth-page';
import Dashboard from './src/DASHBOARD/dashboard';
import { AuthUser, saveUserSession, loadUserSession, clearUserSession } from './src/auth-page/authService';
import { clearNativeAuthState } from './src/auth-page/authPage';

import * as SplashScreen from 'expo-splash-screen';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const screenX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const prepare = async () => {
      try {
        const savedUser = await loadUserSession();
        if (savedUser) {
          setAuthenticatedUser(savedUser);
          setCurrentScreen('dashboard');
        }
      } catch (_) {}
      setAppReady(true);
      SplashScreen.hideAsync().catch(() => null);
    };
    prepare();
  }, []);

  const handleGoToAuth = useCallback(() => {
    setCurrentScreen('auth');
    screenX.stopAnimation();
    Animated.spring(screenX, {
      toValue: -screenWidth,
      damping: 26,
      stiffness: 190,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [screenX, screenWidth]);

  const handleBackToLanding = useCallback(() => {
    setCurrentScreen('landing');
    screenX.stopAnimation();
    Animated.spring(screenX, {
      toValue: 0,
      damping: 26,
      stiffness: 190,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [screenX]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'auth') {
        handleBackToLanding();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [currentScreen, handleBackToLanding]);

  const handleAuthSuccess = async (user: AuthUser) => {
    await saveUserSession(user);
    setAuthenticatedUser(user);
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    await clearUserSession();
    await clearNativeAuthState().catch(() => {});
    setAuthenticatedUser(null);
    handleBackToLanding();
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <FoodcoSplashScreen isReady={appReady} />
        {appReady && currentScreen === 'dashboard' && authenticatedUser ? (
          <Dashboard user={authenticatedUser} onLogout={handleLogout} />
        ) : appReady ? (
          <View style={styles.container}>
            <Animated.View
              style={[
                styles.sliderContainer,
                {
                  width: screenWidth * 2,
                  transform: [{ translateX: screenX }],
                },
              ]}
            >
              <View style={[styles.screenWrapper, { width: screenWidth }]}>
                <LandingPage
                  onGetStarted={handleGoToAuth}
                  isFocused={currentScreen === 'landing'}
                />
              </View>
              <View style={[styles.screenWrapper, { width: screenWidth }]}>
                <AuthPage
                  onBack={handleBackToLanding}
                  onSuccess={handleAuthSuccess}
                />
              </View>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  sliderContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  screenWrapper: {
    height: '100%',
  },
});
