(() => {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const button = document.getElementById("loginButton");
  const password = document.getElementById("password");
  document.getElementById("togglePassword").addEventListener("click", event => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    event.currentTarget.textContent = show ? "Hide" : "Show";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "";
    button.disabled = true;
    button.innerHTML = 'Signing in <span aria-hidden="true">…</span>';
    try {
      const result = await window.AppAPI.post({
        action: "login",
        username: document.getElementById("username").value.trim(),
        password: password.value
      });
      if (!result || !result.success || !result.user || !result.token) {
        message.textContent = (result && result.message) || "Sign-in failed. Check your details or contact the administrator.";
        return;
      }
      sessionStorage.setItem("portalSession", JSON.stringify({
        username: result.user.username,
        displayName: result.user.displayName || result.user.username,
        role: result.user.role || "Staff",
        token: result.token,
        expiresAt: result.expiresAt
      }));
      location.href = window.APP_CONFIG.dashboardPage;
    } catch (error) {
      message.textContent = error.message || "Unable to sign in right now.";
    } finally {
      button.disabled = false;
      button.innerHTML = 'Sign in <span aria-hidden="true">→</span>';
    }
  });
})();
