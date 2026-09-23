import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FoodcoSplashScreen from './src/splash-screen/splashscreen';
import LandingPage from './src/landing page/landingpage';
import { AuthPage } from './src/auth-page';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'auth'>('landing');

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

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <FoodcoSplashScreen isReady={true} />
        {currentScreen === 'landing' ? (
          <LandingPage onGetStarted={() => setCurrentScreen('auth')} />
        ) : (
          <AuthPage onBack={() => setCurrentScreen('landing')} />
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
