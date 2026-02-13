document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const message = document.getElementById("form-message");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;

    message.textContent = "Création du compte...";
    message.className = "message";

    try {
      const payload = await window.CasinoApi.registerPlayer({ username, email, password });
      sessionStorage.setItem("casino_token", payload.token);
      sessionStorage.setItem("casino_user", JSON.stringify(payload.user));

      message.textContent = "Compte créé. Bienvenue au casino !";
      message.className = "message ok";

      setTimeout(() => {
        window.location.href = "landing.html";
      }, 800);
    } catch (error) {
      message.textContent = error?.message || "Inscription impossible.";
      message.className = "message err";
    }
  });
});
