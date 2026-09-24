import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, AntDesign } from '@expo/vector-icons';
import { parseAuthError, syncTokenWithBackend, AuthUser } from './authService';
import UniversalPanel from '../components/universalpanel';

const logoSource = require('../../assets/logo.png');
const gmailIcon = require('../../assets/gmail-icon.webp');

const GOOGLE_WEB_CLIENT_ID = '677834907140-4tee16jc3cpe8mu51rfe873i1439odhr.apps.googleusercontent.com';

let googleSigninModule: any = null;
let firebaseAuthModule: any = null;

try {
  const gSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  const fAuth = require('@react-native-firebase/auth').default;

  gSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });

  googleSigninModule = gSignin;
  firebaseAuthModule = fAuth;
} catch (error) {
  try {
    const gSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    gSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    googleSigninModule = gSignin;
  } catch (err) {}
}

const THEME = {
  primary: '#FF6B35',
  primaryDark: '#E8502A',
  peachBg: '#FFF0E6',
  peachBorder: '#FFB28F',
  bg: '#FFFFFF',
  surface: '#F8F9FB',
  textPrimary: '#0D0E11',
  textMuted: '#7F8489',
  border: '#E5E7EB',
  cardBg: '#FFFFFF',
};

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

interface AuthPageProps {
  onBack?: () => void;
  onSuccess?: (user: AuthUser) => void;
}

interface AlertModalState {
  visible: boolean;
  title: string;
  message: string;
}

export default function AuthPage({ onBack, onSuccess }: AuthPageProps) {
  const insets = useSafeAreaInsets();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [dataAlertVisible, setDataAlertVisible] = useState(false);
  const [appleAlertVisible, setAppleAlertVisible] = useState(false);
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    visible: false,
    title: '',
    message: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const backAnim = useRef(new Animated.Value(0)).current;
  const backScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backScale, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoogleSignIn = () => {
    if (googleLoading) return;
    setDataAlertVisible(true);
  };

  const startGoogleSignIn = async () => {
    if (googleLoading) return;
    setDataAlertVisible(false);

    if (!googleSigninModule) {
      setAlertModal({
        visible: true,
        title: 'Google Sign-In',
        message: 'Google Sign-In is ready. Please ensure Google Play Services are enabled on this device.',
      });
      return;
    }

    setGoogleLoading(true);

    try {
      await googleSigninModule.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await googleSigninModule.signOut().catch(() => null);
      const response = await googleSigninModule.signIn();

      if (response?.type === 'cancelled') {
        setGoogleLoading(false);
        return;
      }

      const idToken = response?.data?.idToken ?? response?.idToken;
      const rawUser = response?.data?.user ?? response?.user;

      if (!idToken) {
        throw new Error('Google did not return a valid account token.');
      }

      let authUser: AuthUser = {
        uid: rawUser?.id || `google_${Date.now()}`,
        email: rawUser?.email || '',
        displayName: rawUser?.name || 'Foodco Member',
        photoURL: rawUser?.photo || null,
      };

      if (firebaseAuthModule) {
        try {
          const googleCredential = firebaseAuthModule.GoogleAuthProvider.credential(idToken);
          const firebaseUserCredential = await firebaseAuthModule().signInWithCredential(googleCredential);
          const firebaseIdToken = await firebaseUserCredential.user.getIdToken(true);

          authUser = {
            uid: firebaseUserCredential.user.uid,
            email: firebaseUserCredential.user.email || authUser.email,
            displayName: firebaseUserCredential.user.displayName || authUser.displayName,
            photoURL: firebaseUserCredential.user.photoURL || authUser.photoURL,
          };

          try {
            const backendResult = await syncTokenWithBackend(
              firebaseIdToken,
              authUser.displayName,
              authUser.photoURL || undefined
            );
            if (backendResult?.user) {
              authUser = backendResult.user;
            }
          } catch (backendError) {}
        } catch (firebaseErr) {
          try {
            const backendResult = await syncTokenWithBackend(
              idToken,
              authUser.displayName,
              authUser.photoURL || undefined
            );
            if (backendResult?.user) {
              authUser = backendResult.user;
            }
          } catch (backendError) {}
        }
      } else {
        try {
          const backendResult = await syncTokenWithBackend(
            idToken,
            authUser.displayName,
            authUser.photoURL || undefined
          );
          if (backendResult?.user) {
            authUser = backendResult.user;
          }
        } catch (backendError) {}
      }

      if (onSuccess) {
        onSuccess(authUser);
      }
    } catch (error: any) {
      if (
        error?.code === 'SIGN_IN_CANCELLED' ||
        error?.code === '12501' ||
        error?.message?.toLowerCase().includes('cancel')
      ) {
        setGoogleLoading(false);
        return;
      }

      setAlertModal({
        visible: true,
        title: 'Login failed',
        message: parseAuthError(error),
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />

      <TouchableOpacity
        style={[styles.backButton, { top: Math.max(insets.top + 8, 24) }]}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.backIconWrap, { opacity: backAnim, transform: [{ scale: backScale }] }]}>
          <Feather name="chevron-left" size={26} color={THEME.textPrimary} strokeWidth={3} />
        </Animated.View>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.title}>Foodco</Text>
            <Text style={styles.subtitle}>Login to get started</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <View style={styles.authButtonWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.authButton, styles.googleButton]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <Image source={gmailIcon} style={styles.socialImage} resizeMode="contain" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
                {googleLoading && <ActivityIndicator size="small" color={THEME.textPrimary} style={styles.loader} />}
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>RECOMMENDED</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.authButtonWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.authButton, styles.appleButton]}
                onPress={() => setAppleAlertVisible(true)}
              >
                <AntDesign name="apple" size={21} color="#FFFFFF" style={styles.socialIcon} />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.termsText}>
            Foodco is a mindful nutrition companion app. We prioritize your privacy and never share or monetize your personal health data.
          </Text>
        </Animated.View>
      </ScrollView>

      <UniversalPanel
        visible={dataAlertVisible}
        title="Data collection notice"
        titleUnderline
        dismissOnBackdropPress={!googleLoading}
        onClose={() => setDataAlertVisible(false)}
        actions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => setDataAlertVisible(false),
            disabled: googleLoading,
          },
          {
            label: 'Continue',
            variant: 'primary',
            onPress: startGoogleSignIn,
            loading: googleLoading,
          },
        ]}
      >
        <Text style={styles.dataNoticeHighlight}>
          We do not collect anything extra from your Google account.
        </Text>
        <Text style={styles.dataNoticeBody}>
          When you continue with Google, Foodco only uses the basic sign-in info Google provides, like your email and account ID, to log you in and keep your account secure. We do not read your Gmail, contacts, Drive, photos, or anything else.
        </Text>
      </UniversalPanel>

      <UniversalPanel
        visible={appleAlertVisible}
        title="Apple Sign-In"
        message="Continue with Apple will be available in the upcoming build."
        onClose={() => setAppleAlertVisible(false)}
        actions={[
          {
            label: 'OK',
            variant: 'primary',
            onPress: () => setAppleAlertVisible(false),
          },
        ]}
      />

      <UniversalPanel
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
        actions={[
          {
            label: 'OK',
            variant: 'primary',
            onPress: () => setAlertModal((prev) => ({ ...prev, visible: false })),
          },
        ]}
      />
    </View>
  );
}

export { AuthPage };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  backIconWrap: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  title: {
    fontFamily: serifFont,
    fontSize: 28,
    fontWeight: '700',
    color: '#0D0E11',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7F8489',
    letterSpacing: 0.2,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  authButtonWrap: {
    width: '100%',
    alignItems: 'center',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 310,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 26,
    justifyContent: 'center',
    height: 52,
    position: 'relative',
  },
  socialIcon: {
    marginRight: 10,
  },
  socialImage: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  appleButton: {
    backgroundColor: '#0D0E11',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -9,
    right: 18,
    backgroundColor: THEME.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loader: {
    marginLeft: 8,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 36,
    paddingHorizontal: 16,
    maxWidth: 320,
  },
  dataNoticeHighlight: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 8,
    lineHeight: 19,
    textAlign: 'center',
  },
  dataNoticeBody: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
  },
});
