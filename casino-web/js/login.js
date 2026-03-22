document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const message = document.getElementById("form-message");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;

    message.textContent = "Connexion en cours...";
    message.className = "message";

    try {
      const payload = await window.CasinoApi.loginPlayer({ email, password });
      sessionStorage.setItem("casino_token", payload.token);
      sessionStorage.setItem("casino_user", JSON.stringify(payload.user));

      message.textContent = "Connexion réussie. Redirection...";
      message.className = "message ok";

      setTimeout(() => {
        window.location.href = "landing.html";
      }, 600);
    } catch (error) {
      message.textContent = error?.message || "Connexion impossible.";
      message.className = "message err";
    }
  });
});
