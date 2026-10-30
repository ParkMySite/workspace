(() => {
  const current = location.pathname.toLowerCase();
  if (current.endsWith("/index.html") || current === "/" || current.endsWith("/")) return;
  const session = (() => { try { return JSON.parse(sessionStorage.getItem("portalSession") || "{}"); } catch { return {}; } })();
  const root = /\/pages\/[^/]+$/.test(current) ? "../" : "./";
  if (!session.token || !session.expiresAt || Date.now() > session.expiresAt) {
    sessionStorage.removeItem("portalSession");
    location.replace(root + "index.html");
  }
})();
