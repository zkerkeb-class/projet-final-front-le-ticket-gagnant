(function protectPage() {
  const token = localStorage.getItem("casino_token");
  if (!token) {
    window.location.replace("login.html");
    return;
  }

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("casino_token");
      localStorage.removeItem("casino_user");
      window.location.replace("login.html");
    });
  }
})();
