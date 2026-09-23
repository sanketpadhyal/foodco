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
  KeyboardAvoidingView,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { sendOtpRequest, verifyOtpRequest, parseAuthError, AuthUser } from './authService';

const logoSource = require('../../assets/logo.png');

const THEME = {
  primary: '#FF6B35',
  primaryDark: '#E8502A',
  peachBg: '#FFF0E6',
  peachBorder: '#FFB28F',
  bg: '#F5F6F8',
  cardBg: '#FFFFFF',
  textPrimary: '#141414',
  textMuted: '#666666',
  inputBg: '#F8F9FB',
  inputBorder: '#E5E7EB',
  inputFocusBorder: '#FF6B35',
  errorBg: '#FEE2E2',
  errorText: '#DC2626',
  successBg: '#DCFCE7',
  successText: '#16A34A',
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

export default function AuthPage({ onBack, onSuccess }: AuthPageProps) {
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
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

  const switchMode = (newMode: 'signin' | 'signup') => {
    if (mode === newMode) return;
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpSent(false);
    setOtpCode('');

    Animated.spring(tabIndicatorAnim, {
      toValue: newMode === 'signin' ? 0 : 1,
      damping: 18,
      stiffness: 200,
      useNativeDriver: false,
    }).start();
  };

  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.965,
      damping: 18,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      damping: 18,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await sendOtpRequest(email);
      setOtpSent(true);
      setResendTimer(60);
      setSuccessMessage('A 6-digit verification code was sent to your email.');
    } catch (err) {
      setErrorMessage(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (authMethod === 'otp') {
      if (!otpSent) {
        await handleSendOtp();
        return;
      }
      if (otpCode.length < 6) {
        setErrorMessage('Please enter the complete 6-digit OTP code.');
        return;
      }
      setLoading(true);
      try {
        const response = await verifyOtpRequest(email, otpCode);
        if (response.user && onSuccess) {
          onSuccess(response.user);
        }
      } catch (err) {
        setErrorMessage(parseAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      const mockUser: AuthUser = {
        uid: `user_${Date.now()}`,
        email: email.trim().toLowerCase(),
        displayName: mode === 'signup' ? name.trim() : email.split('@')[0],
      };
      if (onSuccess) {
        onSuccess(mockUser);
      }
    } catch (err) {
      setErrorMessage(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const mockGoogleUser: AuthUser = {
        uid: `google_${Date.now()}`,
        email: 'user@gmail.com',
        displayName: 'Google User',
      };
      if (onSuccess) {
        onSuccess(mockGoogleUser);
      }
    } catch (err) {
      setErrorMessage(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const tabTranslateX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerBrand}>
          <Image source={logoSource} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.brandTitle}>Foodco</Text>
        </View>

        <View style={styles.topBarRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexOne}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.tabContainer}>
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    left: tabTranslateX,
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => switchMode('signin')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => switchMode('signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headlineSection}>
              <Text style={styles.headlineTitle}>
                {mode === 'signin' ? 'Welcome Back!' : 'Create Account'}
              </Text>
              <Text style={styles.headlineSubtitle}>
                {mode === 'signin'
                  ? 'Sign in to access your mindful nutrition plans.'
                  : 'Start your healthy lifestyle journey with Foodco.'}
              </Text>
            </View>

            {errorMessage && (
              <View style={styles.alertError}>
                <Ionicons name="alert-circle" size={18} color={THEME.errorText} style={styles.alertIcon} />
                <Text style={styles.alertErrorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.alertSuccess}>
                <Ionicons name="checkmark-circle" size={18} color={THEME.successText} style={styles.alertIcon} />
                <Text style={styles.alertSuccessText}>{successMessage}</Text>
              </View>
            )}

            <View style={styles.formSection}>
              {mode === 'signup' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'name' && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons name="person-outline" size={20} color={THEME.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. John Doe"
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'email' && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={THEME.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {authMethod === 'password' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'password' && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons name="lock-closed-outline" size={20} color={THEME.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={THEME.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                otpSent && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === 'otp' && styles.inputWrapperFocused,
                      ]}
                    >
                      <Ionicons name="key-outline" size={20} color={THEME.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.textInput, styles.otpInput]}
                        placeholder="123456"
                        placeholderTextColor="#9CA3AF"
                        value={otpCode}
                        onChangeText={setOtpCode}
                        onFocus={() => setFocusedField('otp')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      {resendTimer > 0 ? (
                        <Text style={styles.resendTimerText}>{resendTimer}s</Text>
                      ) : (
                        <TouchableOpacity onPress={handleSendOtp}>
                          <Text style={styles.resendActionText}>Resend</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )
              )}

              <View style={styles.methodToggleRow}>
                <TouchableOpacity
                  onPress={() => {
                    setAuthMethod(authMethod === 'password' ? 'otp' : 'password');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.methodToggleText}>
                    {authMethod === 'password'
                      ? 'Sign in using Email OTP'
                      : 'Sign in using Password'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 14 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={handleSubmit}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {authMethod === 'otp' && !otpSent
                        ? 'Send OTP Code'
                        : mode === 'signin'
                        ? 'Sign In'
                        : 'Create Account'}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
                disabled={loading}
              >
                <FontAwesome name="google" size={18} color="#EA4335" style={styles.googleIcon} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export { AuthPage };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  flexOne: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    marginRight: 8,
  },
  brandTitle: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  topBarRight: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: THEME.cardBg,
    borderRadius: 30,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.inputBg,
    borderRadius: 20,
    position: 'relative',
    height: 44,
    padding: 3,
    marginBottom: 20,
  },
  tabIndicator: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    top: 3,
    backgroundColor: THEME.cardBg,
    borderRadius: 17,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  tabTextActive: {
    color: THEME.textPrimary,
  },
  headlineSection: {
    marginBottom: 20,
  },
  headlineTitle: {
    fontFamily: serifFont,
    fontSize: 26,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  headlineSubtitle: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.errorBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  alertErrorText: {
    flex: 1,
    fontSize: 13,
    color: THEME.errorText,
    fontWeight: '500',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.successBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  alertSuccessText: {
    flex: 1,
    fontSize: 13,
    color: THEME.successText,
    fontWeight: '500',
  },
  alertIcon: {
    marginRight: 8,
  },
  formSection: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    borderWidth: 1.5,
    borderColor: THEME.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: THEME.inputFocusBorder,
    backgroundColor: THEME.cardBg,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.textPrimary,
  },
  otpInput: {
    letterSpacing: 6,
    fontWeight: '700',
    fontSize: 18,
  },
  eyeIcon: {
    padding: 6,
  },
  resendTimerText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  resendActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  methodToggleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  methodToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primaryDark,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
    color: THEME.textMuted,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 26,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
});
