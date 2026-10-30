(() => {
  "use strict";

  const cfg = window.SDWAN_CONFIG;
  const $ = window.jQuery;
  const data = { installation: [], mpls: [], working: [], admin: [], treasuries: [], wan2: [], backup: [] };
  let treasuryList = [];
  let select2Ready = false;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? "—").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  const escAttr = esc;

  function alertMessage(message, type = "danger") {
    byId("sdwanAlert").innerHTML = `<div class="alert alert-${type}" role="alert">${esc(message)}</div>`;
  }
  function clearAlert() { byId("sdwanAlert").innerHTML = ""; }
  function showLoading(id) {
    byId(id).innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading data...</p></div>';
  }
  function showEmpty(id, message) {
    byId(id).innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><h6>${esc(message || "No data found for this treasury")}</h6></div>`;
  }
  function codeOf(name) {
    const match = String(name || "").trim().match(/^(\d{4})/);
    return match ? match[1] : "";
  }
  function normalize(name) {
    return String(name || "").trim().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-").toLowerCase();
  }
  function matchesTreasury(sheetValue, selected) {
    if (!sheetValue || !selected) return false;
    const selectedCode = codeOf(selected);
    const sheetCode = codeOf(sheetValue);
    return selectedCode ? selectedCode === sheetCode : normalize(sheetValue) === normalize(selected);
  }
  function isSafeHttpUrl(value) {
    try { const u = new URL(value); return u.protocol === "https:" || u.protocol === "http:"; }
    catch { return false; }
  }
  function isIPv4(value) {
    const parts = String(value).split(".");
    return parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
  }
  function maskApiKey(value) {
    if (!value || value === "—" || value.length <= 10) return value;
    return value.slice(0, 5) + "•••••••••••••••" + value.slice(-5);
  }

  async function getSheet(spreadsheetId, range) {
    if (!cfg || !cfg.apiKey || cfg.apiKey === "YOUR_GOOGLE_SHEETS_API_KEY") {
      throw new Error("Set your Google Sheets API key in assets/js/config/sdwan-config.js first.");
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(cfg.apiKey)}`;
    const response = await fetch(url);
    const json = await response.json();
    if (!response.ok || json.error) throw new Error(json.error?.message || `Google Sheets request failed (${response.status}).`);
    return Array.isArray(json.values) ? json.values : [];
  }

  async function loadTreasuryList() {
    try {
      data.installation = await getSheet(cfg.spreadsheets.main, cfg.sheets.installation);
      treasuryList = [...new Set(data.installation.slice(1).map(row => String(row[0] || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const select = byId("treasurySelect");
      select.innerHTML = '<option value="">-- Select Treasury --</option>' + treasuryList.map(t => `<option value="${escAttr(t)}">${esc(t)}</option>`).join("");
      if ($ && $.fn && $.fn.select2) {
        $(select).select2({ theme: "bootstrap-5", width: "100%", placeholder: "Search or select treasury...", allowClear: true });
        select2Ready = true;
      }
      if (!treasuryList.length) select.innerHTML = '<option value="">No treasuries found</option>';
    } catch (error) {
      console.error("Treasury list load failed:", error);
      byId("treasurySelect").innerHTML = '<option value="">Error loading treasuries</option>';
      alertMessage(`Unable to load the treasury list. ${error.message}`);
    }
  }

  async function loadAllDetails() {
    const [mpls, wan2, working, admin, treasuries, backup] = await Promise.all([
      getSheet(cfg.spreadsheets.main, cfg.sheets.mpls),
      getSheet(cfg.spreadsheets.wan2, cfg.sheets.wan2),
      getSheet(cfg.spreadsheets.main, cfg.sheets.working),
      getSheet(cfg.spreadsheets.main, `${cfg.sheets.admin}!A2:H`),
      getSheet(cfg.spreadsheets.treasuries, `${cfg.sheets.treasuries}!A2:G`),
      getSheet(cfg.spreadsheets.backup, `${cfg.sheets.backup}!B:D`)
    ]);
    data.mpls = mpls; data.wan2 = wan2; data.working = working;
    data.admin = admin; data.treasuries = treasuries; data.backup = backup;
  }

  function networkDetails(treasury) {
    const row = data.treasuries.find(r => matchesTreasury(r[0], treasury));
    return row ? { lanPool: row[5] || "", gatewayIP: String(row[6] || "").replace(/\s+/g, "") } : { lanPool: "", gatewayIP: "" };
  }
  function backupLinkFor(treasury) {
    for (let i = data.backup.length - 1; i >= 0; i--) {
      if (normalize(data.backup[i][0]) === normalize(treasury) && data.backup[i][2]) return String(data.backup[i][2]).trim();
    }
    return "";
  }
  function table(headers, rowsHtml, emptyMessage) {
    return `<div class="table-responsive"><table class="table table-hover table-bordered"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${headers.length}" class="text-center py-4">${esc(emptyMessage)}</td></tr>`}</tbody></table></div>`;
  }

  function renderInstallation(treasury) {
    const rows = data.installation.slice(1).filter(r => matchesTreasury(r[0], treasury));
    if (!data.installation.length) return showEmpty("installationTableContainer", "No installation data available");
    const net = networkDetails(treasury);
    const cols = [
      ["Treasury",0],["Location",1],["Device Type",2],["Device ID",3],["Device Serial No.",4],["Device Label",5],
      ["Instance ID",13],["API Key",14],["Encapsulation IP",15],["MPLS Connection Available?",9],["Installation Date",10],["Migration Date",11],
      ["LAN Pool","lan"],["FatPipe Device IP (Gateway)","gateway"],["Backup Configuration","backup"]
    ];
    const html = rows.map(row => `<tr>${cols.map(([label, idx]) => {
      if (idx === "lan") return `<td><span class="lan-pool">${esc(net.lanPool || "—")}</span></td>`;
      if (idx === "gateway") {
        const ip = net.gatewayIP || "—";
        return `<td>${ip !== "—" && isIPv4(ip) ? `<a class="gateway-ip" href="https://${escAttr(ip)}" target="_blank" rel="noopener noreferrer">${esc(ip)}</a>` : `<span class="gateway-ip">${esc(ip)}</span>`}</td>`;
      }
      if (idx === "backup") {
        const link = backupLinkFor(treasury);
        return `<td>${link && isSafeHttpUrl(link) ? `<a href="${escAttr(link)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-download"></i> Download</a>` : "No backup file found"}</td>`;
      }
      const value = String(row[idx] || "").trim() || "—";
      if (label === "API Key" && value !== "—") return `<td><div class="api-key-wrapper"><span>${esc(maskApiKey(value))}</span><button type="button" class="btn-copy-apikey" data-fullkey="${escAttr(value)}">Copy</button></div></td>`;
      if (label === "Instance ID") return `<td><span class="instance-id-text">${esc(value)}</span></td>`;
      if (label === "Encapsulation IP") return `<td><span class="encap-ip-text">${esc(value)}</span></td>`;
      return `<td>${esc(value)}</td>`;
    }).join("")}</tr>`).join("");
    byId("installationTableContainer").innerHTML = table(cols.map(c => c[0]), html, "No installation record for this treasury");
  }

  function renderMpls(treasury) {
    const headers = ["Name of Treasury","BSNL TXN / TIP","LCO CODE","OLT IP","OUTER VLAN","WAN IP","VLAN","GATEWAY (WAN 1)","Fat-Pipe Interface IP (WAN 1)","Clarity order status","Status of work","LC ID"];
    const rows = data.mpls.slice(1).filter(r => matchesTreasury(r[0], treasury)).map(r => {
      const cells = [];
      for (let i = 0; i <= 10; i++) {
        let value = String(r[i] || "—");
        if (i === 10) {
          const low = value.toLowerCase();
          const cls = low.includes("completed") ? "status-badge-working" : low.includes("pending") ? "status-badge-other" : low.includes("wip") ? "status-badge-linkdown" : "status-badge-blank";
          value = `<span class="${cls} mpls-badge">${esc(value)}</span>`;
        } else value = esc(value);
        cells.push(`<td>${value}</td>`);
      }
      cells.push(`<td>${esc(r[18] || "—")}</td>`);
      return `<tr>${cells.join("")}</tr>`;
    }).join("");
    byId("mplsConfigTableContainer").innerHTML = table(headers, rows, "No MPLS configuration found for this treasury");
  }

  function renderWan2(treasury) {
    const headers = ["Treasury","Type of Service","WAN Subnet","Gateway (WAN 2)","Fat-Pipe Interface IP (WAN 2)","Subnet"];
    const rows = data.wan2.slice(1).filter(r => matchesTreasury(r[0], treasury)).map(r => `<tr>${headers.map((_, i) => {
      const value = String(r[i] || "").trim() || "—";
      if ((i === 2 || i === 5) && value !== "—") return `<td><code>${esc(value)}</code></td>`;
      if (i === 3 && value !== "—") return `<td><span class="gateway-ip">${esc(value)}</span></td>`;
      return `<td>${esc(value)}</td>`;
    }).join("")}</tr>`).join("");
    byId("wan2ConfigTableContainer").innerHTML = table(headers, rows, "No WAN 2 configuration found for this treasury");
  }

  function renderWorking(treasury) {
    const headers = ["Name of Treasury","Contact Details of BSNL Officers","Treasury Remarks","BBM Remarks","Issue Remarks"];
    const rows = data.working.slice(1).filter(r => matchesTreasury(r[0], treasury)).map(r => {
      const remarks = String(r[13] || "—");
      const low = remarks.toLowerCase();
      const cls = !remarks.trim() || remarks === "—" ? "status-badge-blank" : low.includes("link down") ? "status-badge-linkdown" : low.includes("working fine") ? "status-badge-working" : low.includes("not working") ? "status-badge-notworking" : "status-badge-other";
      return `<tr><td><strong>${esc(r[0] || "—")}</strong></td><td>${esc(r[12] || "—")}</td><td><span class="${cls}">${esc(remarks)}</span></td><td>${esc(r[14] || "—")}</td><td>${esc(r[15] || "—")}</td></tr>`;
    }).join("");
    byId("treasuryWorkingTableContainer").innerHTML = table(headers, rows, "No working/contact status found for this treasury");
  }

  function renderAdmin(treasury) {
    const headers = ["Treasury/Location","Network Admin Name","Network Admin Contact","Treasury Admin Name","Treasury Admin Contact","Office Mail ID","Office Contact","Office Mobile"];
    const rows = data.admin.filter(r => matchesTreasury(r[0], treasury)).map(r => `<tr>${headers.map((_, i) => {
      const value = String(r[i] || "—");
      if (i === 5 && value.includes("@")) return `<td><a href="mailto:${escAttr(value)}">${esc(value)}</a></td>`;
      if ([2,4,6,7].includes(i) && value !== "—") {
        const phone = value.replace(/[^0-9+]/g, "");
        return `<td>${phone ? `<a href="tel:${escAttr(phone)}">${esc(value)}</a>` : esc(value)}</td>`;
      }
      return `<td>${esc(value)}</td>`;
    }).join("")}</tr>`).join("");
    byId("adminTableContainer").innerHTML = table(headers, rows, "No admin contacts found for this treasury");
  }

  async function viewTreasuryDetails() {
    clearAlert();
    const treasury = byId("treasurySelect").value;
    if (!treasury) return alertMessage("Please select a treasury before viewing details.", "warning");
    const btn = byId("viewDetailsBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading...';
    ["installationTableContainer","mplsConfigTableContainer","wan2ConfigTableContainer","treasuryWorkingTableContainer","adminTableContainer"].forEach(showLoading);
    try {
      await loadAllDetails();
      renderInstallation(treasury); renderMpls(treasury); renderWan2(treasury); renderWorking(treasury); renderAdmin(treasury);
    } catch (error) {
      console.error("Unable to load treasury details:", error);
      alertMessage(`Unable to load treasury details. ${error.message}`);
      ["installationTableContainer","mplsConfigTableContainer","wan2ConfigTableContainer","treasuryWorkingTableContainer","adminTableContainer"].forEach(id => showEmpty(id, "Data could not be loaded. Check the API key, permissions, and sheet names."));
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-search"></i> View Details';
    }
  }

  async function copyApiKey(button) {
    const value = button.getAttribute("data-fullkey");
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      const original = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => { button.textContent = original; }, 1400);
    } catch (error) {
      alert("Unable to copy the API key. Your browser may require HTTPS or clipboard permission.");
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest(".btn-copy-apikey");
    if (button) copyApiKey(button);
  });
  byId("viewDetailsBtn").addEventListener("click", viewTreasuryDetails);
  byId("treasurySelect").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); viewTreasuryDetails(); }
  });
  document.addEventListener("DOMContentLoaded", loadTreasuryList);
  if (document.readyState !== "loading") loadTreasuryList();
})();
