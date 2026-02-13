import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 9000;

const unique = (values: string[]) => Array.from(new Set(values));

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

const getApiBaseUrls = (): string[] => {
  const normalizedEnvUrl = API_BASE_URL?.replace(/\/games\/blackjack\/?$/, "");

  if (API_BASE_URL) {
    if (Platform.OS === "android") {
      return unique([
        normalizedEnvUrl,
        "http://10.0.2.2:3000/api",
        "http://localhost:3000/api",
        "http://127.0.0.1:3000/api",
      ].filter((value): value is string => Boolean(value)));
    }

    return unique([
      normalizedEnvUrl,
      "http://localhost:3000/api",
      "http://127.0.0.1:3000/api",
    ].filter((value): value is string => Boolean(value)));
  }

  if (Platform.OS === "android") {
    return ["http://10.0.2.2:3000/api", "http://localhost:3000/api", "http://127.0.0.1:3000/api"];
  }

  return ["http://localhost:3000/api", "http://127.0.0.1:3000/api"];
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  chipBalance: number;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type ProfileResponse = {
  id: string;
  username: string;
  email: string;
  chipBalance: number;
  createdAt?: string;
  updatedAt?: string;
};

const postAuth = async (path: "/auth/login" | "/auth/register", payload: Record<string, unknown>): Promise<AuthResponse> => {
  const baseUrls = getApiBaseUrls();

  let latestError: string | null = null;

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({} as { message?: string }));

      if (!response.ok) {
        latestError = data?.message ?? "Erreur d'authentification.";

        if (response.status === 400 || response.status === 401 || response.status === 409) {
          throw new Error(latestError ?? "Erreur d'authentification.");
        }

        continue;
      }

      if (!data?.token || !data?.user?.id) {
        throw new Error("Réponse backend invalide.");
      }

      return data as AuthResponse;
      } catch (error) {
      if (error instanceof Error) {
        latestError = error.name === "AbortError"
          ? "Le serveur met trop de temps à répondre."
          : error.message;
      }
      continue;
    }
  }

  throw new Error(latestError ?? "Backend indisponible. Vérifiez que l'API est lancée.");
};

export const authApi = {
  login(email: string, password: string) {
    return postAuth("/auth/login", { email, password });
  },
  register(username: string, email: string, password: string) {
    return postAuth("/auth/register", { username, email, password });
  },
  async getProfile(token: string): Promise<ProfileResponse> {
    const baseUrls = getApiBaseUrls();
    let latestError: string | null = null;

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetchWithTimeout(`${baseUrl}/user/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({} as { message?: string }));

        if (!response.ok) {
          latestError = data?.message ?? "Impossible de récupérer le profil.";
          if (response.status === 401 || response.status === 404) {
            throw new Error(latestError ?? "Impossible de récupérer le profil.");
          }
          continue;
        }

        return data as ProfileResponse;
      } catch (error) {
        if (error instanceof Error) {
          latestError = error.name === "AbortError"
            ? "Le serveur met trop de temps à répondre."
            : error.message;
        }
        continue;
      }
    }

    throw new Error(latestError ?? "Backend indisponible.");
  },
  async updateProfile(token: string, payload: { username?: string; email?: string }): Promise<ProfileResponse> {
    const baseUrls = getApiBaseUrls();
    let latestError: string | null = null;

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetchWithTimeout(`${baseUrl}/user/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({} as { message?: string }));

        if (!response.ok) {
          latestError = data?.message ?? "Impossible de mettre à jour le profil.";
          if (response.status === 400 || response.status === 401 || response.status === 409 || response.status === 404) {
            throw new Error(latestError ?? "Impossible de mettre à jour le profil.");
          }
          continue;
        }

        return data as ProfileResponse;
      } catch (error) {
        if (error instanceof Error) {
          latestError = error.name === "AbortError"
            ? "Le serveur met trop de temps à répondre."
            : error.message;
        }
        continue;
      }
    }

    throw new Error(latestError ?? "Backend indisponible.");
  },
  async deleteProfile(token: string): Promise<{ message: string }> {
    const baseUrls = getApiBaseUrls();
    let latestError: string | null = null;

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetchWithTimeout(`${baseUrl}/user/profile`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({} as { message?: string }));

        if (!response.ok) {
          latestError = data?.message ?? "Impossible de supprimer le profil.";
          if (response.status === 401 || response.status === 404) {
            throw new Error(latestError ?? "Impossible de supprimer le profil.");
          }
          continue;
        }

        return { message: data?.message ?? "Compte supprimé." };
      } catch (error) {
        if (error instanceof Error) {
          latestError = error.name === "AbortError"
            ? "Le serveur met trop de temps à répondre."
            : error.message;
        }
        continue;
      }
    }

    throw new Error(latestError ?? "Backend indisponible.");
  },
};
