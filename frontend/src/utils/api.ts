import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const getDefaultApiUrl = () => {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return 'http://192.168.1.6:8000/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1';
};

const TOKEN_KEY = 'smokeshield_jwt_token';
const API_URL_KEY = 'smokeshield_api_url';

let currentApiUrl = getDefaultApiUrl();

// Safe storage wrapper that falls back to localStorage on web
const isWeb = Platform.OS === 'web';

const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      return await SecureStore.getItemAsync(key);
    }
    return null;
  } catch (e) {
    console.warn(`Storage get error for key ${key}:`, e);
    return null;
  }
};

const safeSetItem = async (key: string, value: string): Promise<void> => {
  try {
    if (isWeb) {
      localStorage.setItem(key, value);
      return;
    }
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (e) {
    console.error(`Storage set error for key ${key}:`, e);
  }
};

const safeDeleteItem = async (key: string): Promise<void> => {
  try {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (e) {
    console.error(`Storage delete error for key ${key}:`, e);
  }
};

// Load saved custom API URL if it exists
export const initApiUrl = async () => {
  const savedUrl = await safeGetItem(API_URL_KEY);
  if (savedUrl) {
    currentApiUrl = savedUrl;
  }
  return currentApiUrl;
};

export const getApiUrl = () => currentApiUrl;

export const setApiUrl = async (url: string) => {
  currentApiUrl = url;
  await safeSetItem(API_URL_KEY, url);
};

export const saveToken = async (token: string) => {
  await safeSetItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await safeGetItem(TOKEN_KEY);
};

export const removeToken = async () => {
  await safeDeleteItem(TOKEN_KEY);
};

// Generic fetch wrapper with auth header
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${currentApiUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    const textData = await response.text();
    let jsonData;
    try {
      jsonData = textData ? JSON.parse(textData) : null;
    } catch {
      jsonData = { message: textData };
    }

    if (!response.ok) {
      throw {
        status: response.status,
        detail: jsonData?.detail || jsonData?.message || 'API request failed',
      };
    }
    
    return jsonData;
  } catch (error: any) {
    console.error(`API request error on ${endpoint}:`, error);
    throw error;
  }
};
