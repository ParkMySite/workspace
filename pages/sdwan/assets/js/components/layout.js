(() => {
  const current = location.pathname.toLowerCase();
  const nested = /\/pages\/[^/]+$/.test(current);
  const root = nested ? "../" : "./";
  const page = name => root + name;

  const session = (() => { try { return JSON.parse(sessionStorage.getItem("portalSession") || "{}"); } catch { return {}; } })();
  const username = session.username || "Staff member";
  const role = session.role || "Staff";
  const initials = username.slice(0, 2).toUpperCase();


const menuSections = window.TREASURY_MENU || [];

const sidebarLinks = menuSections.map(section => {
  const visibleItems = section.items.filter(item =>
    Array.isArray(item.roles) && item.roles.includes(role)
  );

  if (!visibleItems.length) return "";

  return `
    <div class="nav-caption">${escapeText(section.section)}</div>
    ${visibleItems.map(item => {
const href = page(item.href);

const currentPath = location.pathname
  .replace(/\/+$/, "")
  .toLowerCase();

const targetPath = new URL(href, location.href).pathname
  .replace(/\/+$/, "")
  .toLowerCase();

const active = currentPath === targetPath
  ? " active"
  : "";

      return `
        <a class="nav-link${active}" href="${href}">
          <span class="nav-icon">${escapeText(item.icon)}</span>
          ${escapeText(item.label)}
        </a>`;
    }).join("")}
  `;
}).join("");

const sidebar = `
  <aside class="sidebar" id="appSidebar">
    <a class="sidebar-brand" href="${page("dashboard.html")}">
      <span class="brand-mark">T</span>
      <span>
        Treasury Portal
        <span class="brand-sub">OPERATIONS WORKSPACE</span>
      </span>
    </a>

    ${sidebarLinks}

    <div class="sidebar-spacer"></div>

    <div class="sidebar-support">
      <strong>Need assistance?</strong>
      <p>Contact your system administrator for access or technical support.</p>
    </div>

    <div class="sidebar-bottom">
      TREASURY PORTAL · STARTER UI
    </div>
  </aside>`;



  const header = `
    <header class="topbar">
      <div class="topbar-left"><button class="icon-button menu-toggle" id="menuToggle" aria-label="Open navigation">☰</button><div><div class="topbar-title">Treasury workspace</div><div class="topbar-sub">Department of Treasuries · Internal portal</div></div></div>
      <div class="topbar-right"><div class="search-pill">⌕ &nbsp; Workspace overview</div><button class="icon-button" id="notificationsButton" aria-label="Notifications">♧</button><div class="profile"><div class="avatar">${escapeText(initials)}</div><div><div class="profile-name">${escapeText(username)}</div><div class="profile-role">${escapeText(role)}</div></div></div><button class="icon-button" id="logoutButton" aria-label="Sign out" title="Sign out">↪</button></div>
    </header>`;
  const footer = `<footer class="app-footer"><span>© ${new Date().getFullYear()} <strong>Department of Treasuries</strong></span><span>Built for clarity · <strong>Treasury Portal</strong></span></footer>`;

  function escapeText(value) { return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch])); }
  document.getElementById("sidebarMount").innerHTML = sidebar;
  document.getElementById("headerMount").innerHTML = header;
  document.getElementById("footerMount").innerHTML = footer;
  document.getElementById("menuToggle")?.addEventListener("click", () => document.getElementById("appSidebar").classList.toggle("open"));
  document.getElementById("logoutButton")?.addEventListener("click", () => {
    sessionStorage.removeItem("portalSession");
    location.replace(page("index.html"));
  });
  document.getElementById("helpLink")?.addEventListener("click", event => {
    event.preventDefault(); alert("Please contact your system administrator for support.");
  });
  document.getElementById("notificationsButton")?.addEventListener("click", () => alert("No live notifications are connected in this starter."));
})();
