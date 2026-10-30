(() => {
  let user = {};
  try { user = JSON.parse(sessionStorage.getItem("portalSession") || "{}"); } catch {}
  const name = user.displayName || user.username || "colleague";
  document.getElementById("welcomeName").textContent = name;
  document.getElementById("roleValue").textContent = user.role || "Staff";
  document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date());
})();
