import { getApiBaseUrls } from "./apiBaseUrl";

const REQUEST_TIMEOUT_MS = 9000;
const AUTH_ERROR_STATUSES = new Set([400, 401, 404, 409]);

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

export class AuthApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

const parseErrorMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.name === "AbortError") {
    return "Le serveur met trop de temps a repondre.";
  }

  return error.message;
};

const isFatalAuthStatus = (status: number): boolean => AUTH_ERROR_STATUSES.has(status);

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

        if (isFatalAuthStatus(response.status)) {
          throw new AuthApiError(latestError ?? "Erreur d'authentification.", response.status);
        }

        continue;
      }

      if (!data?.token || !data?.user?.id) {
        throw new AuthApiError("Reponse backend invalide.");
      }

      return data as AuthResponse;
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }

      latestError = parseErrorMessage(error) ?? latestError;
    }
  }

  throw new AuthApiError(latestError ?? "Backend indisponible. Verifiez que l'API est lancee.");
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
          latestError = data?.message ?? "Impossible de recuperer le profil.";
          if (isFatalAuthStatus(response.status)) {
            throw new AuthApiError(latestError ?? "Impossible de recuperer le profil.", response.status);
          }
          continue;
        }

        return data as ProfileResponse;
      } catch (error) {
        if (error instanceof AuthApiError) {
          throw error;
        }

        latestError = parseErrorMessage(error) ?? latestError;
      }
    }

    throw new AuthApiError(latestError ?? "Backend indisponible.");
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
          latestError = data?.message ?? "Impossible de mettre a jour le profil.";
          if (isFatalAuthStatus(response.status)) {
            throw new AuthApiError(latestError ?? "Impossible de mettre a jour le profil.", response.status);
          }
          continue;
        }

        return data as ProfileResponse;
      } catch (error) {
        if (error instanceof AuthApiError) {
          throw error;
        }

        latestError = parseErrorMessage(error) ?? latestError;
      }
    }

    throw new AuthApiError(latestError ?? "Backend indisponible.");
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
          if (isFatalAuthStatus(response.status)) {
            throw new AuthApiError(latestError ?? "Impossible de supprimer le profil.", response.status);
          }
          continue;
        }

        return { message: data?.message ?? "Compte supprime." };
      } catch (error) {
        if (error instanceof AuthApiError) {
          throw error;
        }

        latestError = parseErrorMessage(error) ?? latestError;
      }
    }

    throw new AuthApiError(latestError ?? "Backend indisponible.");
  },
};
