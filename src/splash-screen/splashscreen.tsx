import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => null);

const SPLASH_BG = '#E8502A';

interface SplashScreenProps {
  isReady: boolean;
}

export default function FoodcoSplashScreen({ isReady }: SplashScreenProps) {
  const hasHidden = useRef(false);

  useEffect(() => {
    if (isReady && !hasHidden.current) {
      hasHidden.current = true;
      SplashScreen.hideAsync().catch(() => null);
    }
  }, [isReady]);

  if (isReady) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={SPLASH_BG}
        translucent={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
});
