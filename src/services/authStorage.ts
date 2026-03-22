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

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
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

const getStoredUserRaw = async (): Promise<string | null> => {
  if (Platform.OS === "web") {
    return getWebStore()?.getItem(USER_KEY) ?? null;
  }

  return AsyncStorage.getItem(USER_KEY);
};

const setStoredUserRaw = async (value: string): Promise<void> => {
  if (Platform.OS === "web") {
    getWebStore()?.setItem(USER_KEY, value);
    return;
  }

  await AsyncStorage.setItem(USER_KEY, value);
};

const removeStoredUserRaw = async (): Promise<void> => {
  if (Platform.OS === "web") {
    getWebStore()?.removeItem(USER_KEY);
    return;
  }

  await AsyncStorage.removeItem(USER_KEY);
};

export type StoredUser = {
  id: string;
  username: string;
  email: string;
  chipBalance: number;
};

type SessionListener = (user: StoredUser | null) => void;

const listeners = new Set<SessionListener>();

const emitSession = (user: StoredUser | null) => {
  listeners.forEach((listener) => {
    try {
      listener(user);
    } catch {
      // ignore listener failures to keep storage stable
    }
  });
};

const normalizeChipBalance = (value: number): number => Math.round(value * 100) / 100;

export const authStorage = {
  async getToken(): Promise<string | null> {
    return getSecureItem(TOKEN_KEY);
  },

  async setSession(token: string, user: StoredUser): Promise<void> {
    const normalizedUser: StoredUser = {
      ...user,
      chipBalance: normalizeChipBalance(user.chipBalance),
    };

    await Promise.all([
      setSecureItem(TOKEN_KEY, token),
      setStoredUserRaw(JSON.stringify(normalizedUser)),
    ]);

    emitSession(normalizedUser);
  },

  async getUser(): Promise<StoredUser | null> {
    const raw = await getStoredUserRaw();
    if (!raw) return null;

    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      await removeStoredUserRaw();
      emitSession(null);
      return null;
    }
  },

  async updateUser(patch: Partial<StoredUser>): Promise<StoredUser | null> {
    const currentUser = await this.getUser();
    if (!currentUser) {
      return null;
    }

    const nextUser: StoredUser = {
      ...currentUser,
      ...patch,
      chipBalance: typeof patch.chipBalance === "number"
        ? normalizeChipBalance(patch.chipBalance)
        : currentUser.chipBalance,
    };

    await setStoredUserRaw(JSON.stringify(nextUser));
    emitSession(nextUser);
    return nextUser;
  },

  async updateChipBalance(chipBalance: number): Promise<StoredUser | null> {
    if (!Number.isFinite(chipBalance)) {
      return null;
    }

    return this.updateUser({ chipBalance });
  },

  async getSession(): Promise<{ token: string; user: StoredUser | null } | null> {
    const [token, user] = await Promise.all([
      this.getToken(),
      this.getUser(),
    ]);

    if (!token) {
      if (user) {
        await this.clearSession();
      }
      return null;
    }

    return { token, user };
  },

  async clearSession(): Promise<void> {
    await Promise.all([
      removeSecureItem(TOKEN_KEY),
      removeStoredUserRaw(),
    ]);

    emitSession(null);
  },

  subscribe(listener: SessionListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
