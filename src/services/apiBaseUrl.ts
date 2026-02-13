import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim();

const unique = (values: string[]) => Array.from(new Set(values));

const normalizeApiBase = (input: string): string => {
  return input
    .replace(/\/$/, "")
    .replace(/\/api\/games\/blackjack$/, "/api")
    .replace(/\/games\/blackjack$/, "/api");
};

const isDevMode = (): boolean => {
  if (typeof __DEV__ !== "undefined") {
    return __DEV__;
  }

  return process.env.NODE_ENV !== "production";
};

const getDevFallbackBaseUrls = (): string[] => {
  if (Platform.OS === "android") {
    return ["http://10.0.2.2:3000/api", "http://localhost:3000/api", "http://127.0.0.1:3000/api"];
  }

  return ["http://localhost:3000/api", "http://127.0.0.1:3000/api"];
};

export const getApiBaseUrls = (suffix = ""): string[] => {
  const normalizedSuffix = suffix
    ? `/${suffix.replace(/^\//, "")}`
    : "";

  const explicitBase = API_BASE_URL ? normalizeApiBase(API_BASE_URL) : null;

  const baseCandidates = explicitBase
    ? [explicitBase]
    : (isDevMode() ? getDevFallbackBaseUrls() : []);

  if (baseCandidates.length === 0) {
    throw new Error("EXPO_PUBLIC_API_URL est requis en production.");
  }

  return unique(baseCandidates.map((baseUrl) => `${baseUrl}${normalizedSuffix}`));
};
