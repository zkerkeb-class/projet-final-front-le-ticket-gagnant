(function protectPage() {
  const token = sessionStorage.getItem("casino_token");
  if (!token) {
    window.location.replace("login.html");
    return;
  }

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("casino_token");
      sessionStorage.removeItem("casino_user");
      window.location.replace("login.html");
    });
  }
})();
