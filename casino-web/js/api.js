const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE_URL = window.CASINO_API_BASE_URL || (isLocalHost ? "http://localhost:3000/api" : null);

if (!API_BASE_URL) {
  throw new Error("CASINO_API_BASE_URL est requis hors environnement local.");
}

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Erreur serveur.");
  }
  return payload;
};

const postJson = async (path, body) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseResponse(response);
};

async function registerPlayer({ username, email, password }) {
  return postJson("/auth/register", { username, email, password });
}

async function loginPlayer({ email, password }) {
  return postJson("/auth/login", { email, password });
}

window.CasinoApi = {
  registerPlayer,
  loginPlayer,
};
