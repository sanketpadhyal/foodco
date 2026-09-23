import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { sendOtpRequest, verifyOtpRequest, parseAuthError, AuthUser, AuthResponse } from './authService';

const logoSource = require('../../assets/logo.png');
const groceryBagIcon = require('../../assets/baskets-icons/grocery-bag.png');

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
  darkBg: '#191A1B',
  darkSurface: '#232528',
  darkBorder: '#2E3035',
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
  const { width: screenWidth } = useWindowDimensions();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [emailOtpMounted, setEmailOtpMounted] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpEmail, setEmailOtpEmail] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

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
  const emailPageAnim = useRef(new Animated.Value(0)).current;
  const emailStepAnim = useRef(new Animated.Value(1)).current;

  const emailInputRef = useRef<TextInput | null>(null);
  const otpInputRef = useRef<TextInput | null>(null);
  const lastAutoVerifyCodeRef = useRef('');

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

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const openEmailOtpPanel = () => {
    setEmailOtpMounted(true);
    setEmailOtpOpen(true);
    emailPageAnim.setValue(0);
    Animated.timing(emailPageAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      if (emailOtpSent) {
        otpInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    }, 320);
  };

  const closeEmailOtpPanel = () => {
    if (emailOtpLoading) return;
    Animated.timing(emailPageAnim, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setEmailOtpOpen(false);
      setEmailOtpMounted(false);
    });
  };

  const requestEmailOtp = async () => {
    const trimmed = emailOtpEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setAlertModal({
        visible: true,
        title: 'Valid email required',
        message: 'Please enter a valid email address to continue.',
      });
      return;
    }

    setEmailOtpLoading(true);
    try {
      await sendOtpRequest(trimmed);
      setEmailOtpSent(true);
      setResendTimer(60);
      emailStepAnim.setValue(0);
      Animated.timing(emailStepAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 260);
    } catch (error) {
      setAlertModal({
        visible: true,
        title: 'Could not send code',
        message: parseAuthError(error),
      });
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    const code = emailOtpCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) return;

    setEmailOtpLoading(true);
    try {
      const result: AuthResponse = await verifyOtpRequest(emailOtpEmail.trim().toLowerCase(), code);
      if (result.user && onSuccess) {
        onSuccess(result.user);
      }
    } catch (error) {
      setAlertModal({
        visible: true,
        title: 'Verification failed',
        message: parseAuthError(error),
      });
    } finally {
      setEmailOtpLoading(false);
    }
  };

  useEffect(() => {
    if (!emailOtpSent || emailOtpLoading) return;
    const code = emailOtpCode.replace(/\D/g, '');
    if (code.length !== 6 || code === lastAutoVerifyCodeRef.current) return;
    lastAutoVerifyCodeRef.current = code;
    void verifyEmailOtp();
  }, [emailOtpCode, emailOtpLoading, emailOtpSent]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockUser: AuthUser = {
        uid: `google_${Date.now()}`,
        email: 'user@gmail.com',
        displayName: 'Foodco Member',
      };
      if (onSuccess) {
        onSuccess(mockUser);
      }
    } catch (error) {
      setAlertModal({
        visible: true,
        title: 'Google sign-in failed',
        message: parseAuthError(error),
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const otpDigits = Array.from({ length: 6 }, (_, index) => emailOtpCode[index] || '');
  const trimmedEmail = emailOtpEmail.trim().toLowerCase();

  const authPageTranslateX = emailPageAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -42],
  });

  const emailPageTranslateX = emailPageAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(screenWidth, 360), 0],
  });

  const emailPageOpacity = emailPageAnim.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [0.4, 1, 1],
  });

  const emailStepTranslateY = emailStepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

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
              transform: [{ translateX: authPageTranslateX }, { translateY: slideAnim }],
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
                <FontAwesome name="google" size={20} color="#EA4335" style={styles.socialIcon} />
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

            <View style={styles.authButtonWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.authButton, styles.emailButton]}
                onPress={openEmailOtpPanel}
                disabled={googleLoading || emailOtpLoading}
              >
                <MaterialCommunityIcons name="email-fast-outline" size={22} color={THEME.textPrimary} style={styles.socialIcon} />
                <Text style={styles.emailButtonText}>Continue with email</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.termsText}>
            Foodco is a mindful nutrition companion app. We prioritize your privacy and never share or monetize your personal health data.
          </Text>
        </Animated.View>
      </ScrollView>

      {emailOtpMounted ? (
        <Animated.View
          pointerEvents={emailOtpOpen ? 'auto' : 'none'}
          style={[
            styles.emailPage,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              opacity: emailPageOpacity,
              transform: [{ translateX: emailPageTranslateX }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.emailPageBackButton, { top: Math.max(insets.top + 8, 24) }]}
            onPress={closeEmailOtpPanel}
            disabled={emailOtpLoading}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={28} color={THEME.textPrimary} strokeWidth={3} />
          </TouchableOpacity>

          <ScrollView
            style={styles.emailPageScroll}
            contentContainerStyle={styles.emailPageContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emailPageHero}>
              <View style={styles.emailMojiWrap}>
                <Image source={groceryBagIcon} style={styles.emailMoji} resizeMode="contain" />
              </View>
              <Text style={styles.emailPageTitle}>
                {emailOtpSent ? 'Enter your code' : 'Continue with email'}
              </Text>
              <Text style={styles.emailPageSubtitle}>
                {emailOtpSent
                  ? `We sent a 6-digit code to ${trimmedEmail || 'your email'}.`
                  : 'Enter your email address to receive a 6-digit login code.'}
              </Text>
            </View>

            <Animated.View
              style={[
                styles.emailPageCard,
                {
                  opacity: emailStepAnim,
                  transform: [{ translateY: emailStepTranslateY }],
                },
              ]}
            >
              {!emailOtpSent ? (
                <>
                  <Text style={styles.emailStepLabel}>Email address</Text>
                  <View style={styles.emailInputWrap}>
                    <MaterialCommunityIcons name="email-outline" size={20} color={THEME.textMuted} />
                    <TextInput
                      ref={emailInputRef}
                      value={emailOtpEmail}
                      onChangeText={setEmailOtpEmail}
                      editable={!emailOtpLoading}
                      placeholder="name@example.com"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="send"
                      onSubmitEditing={() => void requestEmailOtp()}
                      style={styles.emailPanelInput}
                    />
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.84}
                    style={[styles.emailOtpPrimaryButton, emailOtpLoading && styles.emailOtpDisabledButton]}
                    onPress={requestEmailOtp}
                    disabled={emailOtpLoading}
                  >
                    <Text style={styles.emailOtpPrimaryText}>
                      {emailOtpLoading ? 'Sending code...' : 'Send OTP on email'}
                    </Text>
                    {emailOtpLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={styles.emailOtpButtonLoader} />
                    ) : null}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.emailStepLabel}>Verification code</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.otpBoxes}
                    onPress={() => otpInputRef.current?.focus()}
                    disabled={emailOtpLoading}
                  >
                    {otpDigits.map((digit, index) => {
                      const activeBox = index === Math.min(emailOtpCode.length, 5) && !emailOtpLoading;
                      const filledBox = Boolean(digit);
                      return (
                        <View
                          key={`${index}-${digit || 'empty'}`}
                          style={[
                            styles.otpBox,
                            activeBox && styles.otpBoxActive,
                            filledBox && styles.otpBoxFilled,
                          ]}
                        >
                          <Text style={styles.otpBoxText}>{digit}</Text>
                        </View>
                      );
                    })}
                  </TouchableOpacity>

                  <TextInput
                    ref={otpInputRef}
                    value={emailOtpCode}
                    onChangeText={(value) => setEmailOtpCode(value.replace(/\D/g, '').slice(0, 6))}
                    editable={!emailOtpLoading}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    caretHidden
                    style={styles.hiddenOtpInput}
                  />

                  <View style={styles.otpFooterRow}>
                    {emailOtpLoading ? (
                      <ActivityIndicator size="small" color={THEME.primary} style={styles.otpLoader} />
                    ) : resendTimer > 0 ? (
                      <Text style={styles.otpResendTimerText}>Resend code in {resendTimer}s</Text>
                    ) : (
                      <TouchableOpacity onPress={requestEmailOtp}>
                        <Text style={styles.otpResendActionText}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.84}
                    style={[styles.emailOtpPrimaryButton, emailOtpLoading && styles.emailOtpDisabledButton]}
                    onPress={verifyEmailOtp}
                    disabled={emailOtpLoading || emailOtpCode.length < 6}
                  >
                    <Text style={styles.emailOtpPrimaryText}>
                      {emailOtpLoading ? 'Verifying...' : 'Verify & Continue'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </ScrollView>
        </Animated.View>
      ) : null}

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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
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
  emailButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emailButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
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
  emailPage: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  emailPageBackButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  emailPageScroll: {
    flex: 1,
  },
  emailPageContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
    alignItems: 'center',
  },
  emailPageHero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emailMojiWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.peachBg,
    borderWidth: 1.5,
    borderColor: THEME.peachBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emailMoji: {
    width: 36,
    height: 36,
  },
  emailPageTitle: {
    fontFamily: serifFont,
    fontSize: 24,
    fontWeight: '700',
    color: '#0D0E11',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emailPageSubtitle: {
    fontSize: 14,
    color: '#7F8489',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emailPageCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
  },
  emailStepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D0E11',
    marginBottom: 8,
  },
  emailInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  emailPanelInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0D0E11',
  },
  emailOtpPrimaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 26,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 6,
  },
  emailOtpDisabledButton: {
    opacity: 0.65,
  },
  emailOtpPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  emailOtpButtonLoader: {
    marginLeft: 8,
  },
  otpBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F8F9FB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: THEME.primary,
    backgroundColor: '#FFFFFF',
  },
  otpBoxFilled: {
    borderColor: '#374151',
    backgroundColor: '#FFFFFF',
  },
  otpBoxText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D0E11',
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  otpLoader: {
    marginRight: 6,
  },
  otpResendTimerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  otpResendActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
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
