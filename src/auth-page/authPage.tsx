import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, AntDesign } from '@expo/vector-icons';
import { parseAuthError, syncTokenWithBackend, AuthUser } from './authService';

const logoSource = require('../../assets/logo.png');
const gmailIcon = require('../../assets/gmail-icon.webp');

const GOOGLE_WEB_CLIENT_ID = '677834907140-4tee16jc3cpe8mu51rfe873i1439odhr.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '677834907140-jgf7uh48st456kdp5b0e16laeto55um4.apps.googleusercontent.com';

let googleSigninModule: any = null;
let firebaseAuthModule: any = null;
let webBrowserModule: any = null;

try {
  webBrowserModule = require('expo-web-browser');
  webBrowserModule.maybeCompleteAuthSession?.();
} catch (error) {}

try {
  const gSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  gSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  googleSigninModule = gSignin;
} catch (error) {}

try {
  firebaseAuthModule = require('@react-native-firebase/auth').default;
} catch (error) {}

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

  const handleAuthUrlResponse = async (url: string): Promise<AuthUser | null> => {
    try {
      const parsedUrl = new URL(url);
      const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
      const searchParams = new URLSearchParams(parsedUrl.search);

      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const idToken = hashParams.get('id_token') || searchParams.get('id_token');

      if (!accessToken && !idToken) {
        return null;
      }

      let profileData: { id?: string; email?: string; name?: string; picture?: string } = {};

      if (accessToken) {
        try {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (profileRes.ok) {
            profileData = await profileRes.json();
          }
        } catch (e) {}
      }

      let authUser: AuthUser = {
        uid: profileData.id || `google_${Date.now()}`,
        email: profileData.email || '',
        displayName: profileData.name || 'Foodco Member',
        photoURL: profileData.picture || null,
      };

      if (idToken) {
        try {
          const backendResult = await syncTokenWithBackend(
            idToken,
            authUser.displayName,
            authUser.photoURL || undefined
          );
          if (backendResult?.user) {
            authUser = backendResult.user;
          }
        } catch (err) {}
      }

      return authUser;
    } catch (err) {
      return null;
    }
  };

  const performNativeGoogleSignIn = async (): Promise<AuthUser | null> => {
    await googleSigninModule.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await googleSigninModule.signIn();

    if (signInResult?.type === 'cancelled') {
      return null;
    }

    const idToken = signInResult?.data?.idToken ?? signInResult?.idToken;
    const rawUser = signInResult?.data?.user ?? signInResult?.user;

    if (!idToken) {
      throw new Error('Google did not return an ID token.');
    }

    let authUser: AuthUser = {
      uid: rawUser?.id || `google_${Date.now()}`,
      email: rawUser?.email || '',
      displayName: rawUser?.name || 'Foodco Member',
      photoURL: rawUser?.photo || null,
    };

    if (firebaseAuthModule) {
      try {
        const credential = firebaseAuthModule.GoogleAuthProvider.credential(idToken);
        const userCredential = await firebaseAuthModule().signInWithCredential(credential);
        const firebaseIdToken = await userCredential.user.getIdToken(true);
        authUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email || authUser.email,
          displayName: userCredential.user.displayName || authUser.displayName,
          photoURL: userCredential.user.photoURL || authUser.photoURL,
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
        } catch (err) {}
      } catch (fbErr) {}
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
      } catch (err) {}
    }

    return authUser;
  };

  const performBrowserOAuth = async (): Promise<AuthUser | null> => {
    const redirectUri = 'foodco://auth';
    const clientId = Platform.OS === 'android' ? GOOGLE_ANDROID_CLIENT_ID : GOOGLE_WEB_CLIENT_ID;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token%20id_token&scope=${encodeURIComponent(
      'openid profile email'
    )}&nonce=${encodeURIComponent(Math.random().toString(36).substring(2))}`;

    if (webBrowserModule?.openAuthSessionAsync) {
      try {
        const result = await webBrowserModule.openAuthSessionAsync(authUrl, redirectUri);
        if (result.type === 'success' && result.url) {
          return await handleAuthUrlResponse(result.url);
        }
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return null;
        }
      } catch (err) {}
    }

    const canOpen = await Linking.canOpenURL(authUrl);
    if (canOpen) {
      await Linking.openURL(authUrl);
    }
    return null;
  };

  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      if (event.url && event.url.startsWith('foodco://')) {
        const user = await handleAuthUrlResponse(event.url);
        if (user && onSuccess) {
          onSuccess(user);
        }
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url && url.startsWith('foodco://')) {
        handleUrl({ url });
      }
    });

    return () => {
      sub.remove();
    };
  }, [onSuccess]);

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);

    try {
      let authUser: AuthUser | null = null;

      if (googleSigninModule) {
        try {
          authUser = await performNativeGoogleSignIn();
        } catch (nativeError: any) {
          if (
            nativeError?.code === 'SIGN_IN_CANCELLED' ||
            nativeError?.code === '12501' ||
            nativeError?.message?.toLowerCase().includes('cancel')
          ) {
            setGoogleLoading(false);
            return;
          }
          authUser = await performBrowserOAuth();
        }
      } else {
        authUser = await performBrowserOAuth();
      }

      if (authUser && onSuccess) {
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
        title: 'Google Sign-In Failed',
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

      <Modal
        visible={appleAlertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAppleAlertVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAppleAlertVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apple Sign-In</Text>
            <Text style={styles.modalMessage}>Continue with Apple will be available in the upcoming build.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setAppleAlertVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={alertModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{alertModal.title}</Text>
            <Text style={styles.modalMessage}>{alertModal.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#0D0E11',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: THEME.primary,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 120,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
