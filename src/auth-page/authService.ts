import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api/auth',
  default: 'http://localhost:5000/api/auth',
});

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

export interface AuthResponse {
  success: boolean;
  code?: string;
  message?: string;
  user?: AuthUser;
  customToken?: string;
}

export function parseAuthError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: string }).message);
    if (/rate_limited|429|too many requests/i.test(msg)) {
      return 'Too many requests. Please wait a few moments and try again.';
    }
    if (/network|econn|timeout|connection/i.test(msg)) {
      return 'Could not connect to server. Please check your internet connection.';
    }
    return msg;
  }
  return 'Authentication failed. Please try again.';
}

export async function sendOtpRequest(email: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send OTP code.');
    }
    return data;
  } catch (error) {
    throw new Error(parseAuthError(error));
  }
}

export async function verifyOtpRequest(email: string, otp: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'OTP verification failed.');
    }
    return data;
  } catch (error) {
    throw new Error(parseAuthError(error));
  }
}

export async function syncTokenWithBackend(
  idToken: string,
  name?: string,
  photoURL?: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, name, photoURL }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Session sync failed.');
    }
    return data;
  } catch (error) {
    throw new Error(parseAuthError(error));
  }
}

const SESSION_KEY = '@foodco_user_session';

export async function saveUserSession(user: AuthUser): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (_) {}
}

export async function loadUserSession(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid && parsed.email) return parsed as AuthUser;
    return null;
  } catch (_) {
    return null;
  }
}

export async function clearUserSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (_) {}
}
