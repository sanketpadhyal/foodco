import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getBackendBaseUrl } from '../../api/universalbackendapi';

const getBackendAuthUrl = () => `${getBackendBaseUrl()}/auth`;

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  token?: string;
  jwt?: string;
}

export interface AuthResponse {
  success: boolean;
  code?: string;
  message?: string;
  user?: AuthUser;
  customToken?: string;
  token?: string;
  jwt?: string;
  session?: {
    sessionId?: string;
    createdAt?: string;
    status?: string;
  };
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
    const response = await fetch(`${getBackendAuthUrl()}/send-otp`, {
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
    const response = await fetch(`${getBackendAuthUrl()}/verify-otp`, {
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
    const response = await fetch(`${getBackendAuthUrl()}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, name, photoURL }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Session sync failed.');
    }
    if (data.user && (data.token || data.jwt)) {
      data.user.token = data.token || data.jwt;
      data.user.jwt = data.jwt || data.token;
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

export async function getStoredJwtToken(): Promise<string | null> {
  try {
    const session = await loadUserSession();
    return session?.jwt || session?.token || null;
  } catch (_) {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (parsed.exp && typeof parsed.exp === 'number') {
      return Date.now() >= parsed.exp * 1000;
    }
    return false;
  } catch (_) {
    return false;
  }
}

export async function checkSessionStatus(): Promise<{ valid: boolean; reason?: string }> {
  try {
    const session = await loadUserSession();
    if (!session || !session.uid) {
      return { valid: false, reason: 'no_session' };
    }

    let token = session.jwt || session.token;

    try {
      const fAuthPackage = require('@react-native-firebase/auth');
      const firebaseAuth = fAuthPackage.default || fAuthPackage;
      const authInstance =
        typeof firebaseAuth === 'function'
          ? firebaseAuth()
          : firebaseAuth.getAuth
          ? firebaseAuth.getAuth()
          : firebaseAuth;
      const currentUser = authInstance?.currentUser;

      if (currentUser) {
        if (!token || isTokenExpired(token)) {
          const freshToken = await currentUser.getIdToken(true);
          if (freshToken) {
            token = freshToken;
            session.token = freshToken;
            session.jwt = freshToken;
            await saveUserSession(session);
          }
        }
      }
    } catch (_) {}

    if (!token) {
      if (session.uid && session.email) {
        return { valid: true };
      }
      return { valid: false, reason: 'missing_token' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${getBackendAuthUrl()}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (response.status === 401 || response.status === 403) {
        const errorJson = await response.json().catch(() => ({}));

        if (errorJson.code === 'session_revoked' || errorJson.code === 'account_disabled') {
          return { valid: false, reason: errorJson.code };
        }

        return { valid: true };
      }

      return { valid: true };
    } catch (networkError) {

      return { valid: true };
    }
  } catch (error) {
    return { valid: true };
  }
}

export async function clearUserSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (_) {}
}
