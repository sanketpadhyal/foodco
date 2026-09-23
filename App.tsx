import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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

  useEffect(() => {
    const prepare = async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setAppReady(true);
    };
    prepare();
  }, []);

  if (!appReady) {
    return <FoodcoSplashScreen isReady={false} />;
  }

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthenticatedUser(user);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setAuthenticatedUser(null);
    setCurrentScreen('landing');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <FoodcoSplashScreen isReady={true} />
        {currentScreen === 'home' && authenticatedUser ? (
          <HomePage user={authenticatedUser} onLogout={handleLogout} />
        ) : currentScreen === 'auth' ? (
          <AuthPage
            onBack={() => setCurrentScreen('landing')}
            onSuccess={handleAuthSuccess}
          />
        ) : (
          <LandingPage onGetStarted={() => setCurrentScreen('auth')} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
});
