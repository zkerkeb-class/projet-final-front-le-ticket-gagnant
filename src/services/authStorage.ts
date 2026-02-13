import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "casino_token";
const USER_KEY = "casino_user";

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const getWebStore = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
};

const getSecureItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    return getWebStore()?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key, secureOptions);
};

const setSecureItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === "web") {
    getWebStore()?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value, secureOptions);
};

const removeSecureItem = async (key: string): Promise<void> => {
  if (Platform.OS === "web") {
    getWebStore()?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key, secureOptions);
};

export type StoredUser = {
  id: string;
  username: string;
  email: string;
  chipBalance: number;
};

export const authStorage = {
  async getToken(): Promise<string | null> {
    return getSecureItem(TOKEN_KEY);
  },

  async setSession(token: string, user: StoredUser): Promise<void> {
    await Promise.all([
      setSecureItem(TOKEN_KEY, token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
  },

  async getUser(): Promise<StoredUser | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await Promise.all([
      removeSecureItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  },
};
