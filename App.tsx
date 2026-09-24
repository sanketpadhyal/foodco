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
import HomePage from './src/home/homepage';
import { AuthUser } from './src/auth-page/authService';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'auth' | 'home'>('landing');
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const screenX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const prepare = async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setAppReady(true);
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

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthenticatedUser(user);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setAuthenticatedUser(null);
    handleBackToLanding();
  };

  if (!appReady) {
    return <FoodcoSplashScreen isReady={false} />;
  }

  if (currentScreen === 'home' && authenticatedUser) {
    return (
      <SafeAreaProvider>
        <View style={styles.root}>
          <StatusBar style="dark" />
          <HomePage user={authenticatedUser} onLogout={handleLogout} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <FoodcoSplashScreen isReady={true} />
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
              <LandingPage onGetStarted={handleGoToAuth} />
            </View>
            <View style={[styles.screenWrapper, { width: screenWidth }]}>
              <AuthPage
                onBack={handleBackToLanding}
                onSuccess={handleAuthSuccess}
              />
            </View>
          </Animated.View>
        </View>
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
