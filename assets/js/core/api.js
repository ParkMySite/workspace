window.AppAPI = {
  async post(payload) {
    const url = window.APP_CONFIG && window.APP_CONFIG.apiUrl;
    if (!url) throw new Error("Configure the Apps Script Web App URL in assets/js/config.js.");
    const session = (() => { try { return JSON.parse(sessionStorage.getItem("portalSession") || "{}"); } catch { return {}; } })();
    const requestPayload = { ...payload };
    if (payload.action !== "login" && session.token) requestPayload.token = session.token;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(requestPayload),
      redirect: "follow"
    });
    if (!response.ok) throw new Error("The server could not complete the request.");
    let data;
    try { data = await response.json(); }
    catch { throw new Error("The server response could not be read. Check Apps Script deployment and cross-origin access."); }
    if (data && data.code === "UNAUTHENTICATED") {
      sessionStorage.removeItem("portalSession");
      location.replace(window.APP_CONFIG.loginPage);
    }
    return data;
  }
};
