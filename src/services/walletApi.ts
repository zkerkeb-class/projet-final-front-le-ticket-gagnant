import { AuthApiError } from "./authApi";
import { getApiBaseUrls } from "./apiBaseUrl";

const REQUEST_TIMEOUT_MS = 9000;
const WALLET_ERROR_STATUSES = new Set([400, 401, 404, 409, 429]);

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export type WalletTransaction = {
  id: string;
  amount: number;
  type: "BET" | "WIN" | "DEPOSIT" | "WITHDRAWAL";
  game: string | null;
  direction: "IN" | "OUT";
  createdAt: string;
};

export type RescueBonusStatus = {
  eligible: boolean;
  amount: number;
  maxBalanceToClaim: number;
  cooldownRemainingMs: number;
  availableAt: string | null;
  lastClaimedAt: string | null;
  currentBalance: number;
};

export type WalletSummaryResponse = {
  userId: string;
  chipBalance: number;
  recentTransactions: WalletTransaction[];
  rescueBonus: RescueBonusStatus;
};

const parseErrorMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.name === "AbortError") {
    return "Le serveur met trop de temps a repondre.";
  }

  return error.message;
};

const requestWallet = async <T>(token: string, path: string, init?: RequestInit): Promise<T> => {
  const baseUrls = getApiBaseUrls();
  let latestError: string | null = null;

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
      });

      const data = await response.json().catch(() => ({} as { message?: string }));

      if (!response.ok) {
        latestError = data?.message ?? "Erreur portefeuille.";
        if (WALLET_ERROR_STATUSES.has(response.status)) {
          throw new AuthApiError(latestError ?? "Erreur portefeuille.", response.status);
        }
        continue;
      }

      return data as T;
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }

      latestError = parseErrorMessage(error) ?? latestError;
    }
  }

  throw new AuthApiError(latestError ?? "Backend indisponible.");
};

export const walletApi = {
  getSummary(token: string) {
    return requestWallet<WalletSummaryResponse>(token, "/user/wallet");
  },
  claimRescueBonus(token: string) {
    return requestWallet<WalletSummaryResponse>(token, "/user/wallet/rescue-bonus", {
      method: "POST",
    });
  },
};
