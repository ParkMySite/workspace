(() => {
  "use strict";
  const API_URL = window.APP_CONFIG?.employeeReportApiUrl || window.APP_CONFIG?.employeeApiUrl || "";
  const $ = (id) => document.getElementById(id);
  const form = $("reportForm");
  const state = { rows: [], sortKey: "name", sortDir: "asc", generated: false };
  const columns = [
    { key: "name", label: "Employee Name" }, { key: "dob", label: "Date of Birth" },
    { key: "year", label: "Birth Year" }, { key: "gender", label: "Gender" },
    { key: "address", label: "Address" }, { key: "bloodGroup", label: "Blood Group" },
    { key: "contact", label: "Contact Number" }, { key: "email", label: "Email ID" }
  ];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const norm = (v) => String(v ?? "").trim();
  function setStatus(message, type = "") { const el = $("statusMessage"); el.textContent = message; el.className = `report-status ${type}`.trim(); el.hidden = false; }
  function setBusy(busy) { $("searchBtn").disabled = busy; $("searchBtn").textContent = busy ? "Generating…" : "Generate report"; }
  function toRow(raw) {
    const dobRaw = raw.dob ?? raw["Date of Birth"] ?? raw.dateOfBirth ?? "";
    let dob = "";
    if (dobRaw instanceof Date) dob = dobRaw.toISOString().slice(0,10);
    else if (dobRaw) {
      const s = String(dobRaw).trim();
      const d = new Date(s);
      dob = !Number.isNaN(d.getTime()) ? d.toISOString().slice(0,10) : s;
    }
    const name = norm(raw.name ?? raw["Employee Name"] ?? raw.employeeName);
    const yearMatch = dob.match(/(19\d{2}|20\d{2}|21\d{2})/);
    return { id: raw.id ?? raw.ID ?? "", name, dob, year: yearMatch ? Number(yearMatch[0]) : "", gender: norm(raw.gender ?? raw.Gender), address: norm(raw.address ?? raw.Address), bloodGroup: norm(raw.bloodGroup ?? raw["Blood Group"]), contact: norm(raw.contact ?? raw["Contact Number"] ?? raw.contactNumber), email: norm(raw.email ?? raw["Email ID"] ?? raw.emailId) };
  }
  function sortRows(rows) {
    const key = state.sortKey, direction = state.sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a,b) => {
      let av = a[key] ?? "", bv = b[key] ?? "";
      if (key === "year") { av = Number(av) || 0; bv = Number(bv) || 0; return (av-bv)*direction || a.name.localeCompare(b.name); }
      if (key === "dob") return String(av).localeCompare(String(bv))*direction || a.name.localeCompare(b.name);
      return String(av).localeCompare(String(bv), undefined, { numeric:true, sensitivity:"base" })*direction || a.name.localeCompare(b.name);
    });
  }
  function render() {
    const rows = sortRows(state.rows);
    $("resultCount").textContent = `${rows.length} employee${rows.length === 1 ? "" : "s"}`;
    $("resultsSubtitle").textContent = state.generated ? `Showing ${rows.length} matching record${rows.length === 1 ? "" : "s"}.` : "Generate a report to display matching records.";
    $("csvBtn").disabled = !rows.length; $("pdfBtn").disabled = !rows.length;
    $("tableWrap").hidden = !rows.length; $("emptyState").hidden = !state.generated || rows.length > 0; $("statusMessage").hidden = rows.length > 0 || !state.generated;
    $("resultsBody").innerHTML = rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.dob)}</td><td>${esc(r.year)}</td><td>${esc(r.gender)}</td><td>${esc(r.address)}</td><td>${esc(r.bloodGroup)}</td><td>${esc(r.contact)}</td><td>${esc(r.email)}</td></tr>`).join("");
    document.querySelectorAll("[data-sort]").forEach(btn => { const k = btn.dataset.sort; const span = btn.querySelector("span"); if (span) span.textContent = state.sortKey === k ? (state.sortDir === "asc" ? "↑" : "↓") : "↕"; });
  }
  async function generateReport(event) {
    if (event) event.preventDefault();
    if (!API_URL || API_URL.includes("PASTE_")) { setStatus("Report API URL is missing. Add employeeReportApiUrl to assets/js/config.js.", "error"); return; }
    const name = norm($("filterName").value), year = norm($("filterYear").value), gender = norm($("filterGender").value);
    if (year && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100)) { setStatus("Enter a valid four-digit birth year between 1900 and 2100.", "error"); $("filterYear").focus(); return; }
    setBusy(true); state.generated = false; setStatus("Fetching employee records…");
    try {
      const url = new URL(API_URL);
      url.searchParams.set("action", "report");
      if (name) url.searchParams.set("name", name);
      if (year) url.searchParams.set("year", year);
      if (gender) url.searchParams.set("gender", gender);
      const response = await fetch(url.toString(), { method:"GET", redirect:"follow" });
      if (!response.ok) throw new Error(`Server returned HTTP ${response.status}.`);
      const data = await response.json();
      if (data.ok === false) throw new Error(data.error || "The report API returned an error.");
      const list = Array.isArray(data.data) ? data.data : Array.isArray(data.employees) ? data.employees : Array.isArray(data.results) ? data.results : null;
      if (!list) throw new Error("Unexpected API response. Check that the report Apps Script is deployed and the Employees sheet exists.");
      state.rows = list.map(toRow).filter(r => r.name);
      // Apply filters in browser too, so matching remains consistent if the endpoint returns all rows.
      state.rows = state.rows.filter(r => (!name || r.name.toLocaleLowerCase().includes(name.toLocaleLowerCase())) && (!year || Number(r.year) === Number(year)) && (!gender || r.gender.toLocaleLowerCase() === gender.toLocaleLowerCase()));
      state.sortKey = "name"; state.sortDir = "asc"; state.generated = true;
      if (state.rows.length) { setStatus(`Report generated successfully: ${state.rows.length} matching record${state.rows.length === 1 ? "" : "s"}.`, "success"); }
      else setStatus("No matching employees found. Try changing or clearing the filters.");
      render();
    } catch (err) {
      state.rows = []; state.generated = false; render(); setStatus(`Could not generate report. ${err.message || "Check your internet connection and Apps Script deployment."}`, "error");
    } finally { setBusy(false); }
  }
  function downloadCSV() {
    const rows = sortRows(state.rows); if (!rows.length) return;
    const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [columns.map(c => csvCell(c.label)).join(","), ...rows.map(r => columns.map(c => csvCell(r[c.key])).join(","))];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type:"text/csv;charset=utf-8;" });
    downloadBlob(blob, `employee-report-${dateStamp()}.csv`);
  }
  function downloadPDF() {
    const rows = sortRows(state.rows); if (!rows.length) return;
    if (!window.jspdf?.jsPDF) { window.print(); return; }
    const doc = new window.jspdf.jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
    doc.setFontSize(16); doc.text("Treasury Portal - Employee Report", 38, 34);
    doc.setFontSize(9); doc.text(`Generated: ${new Date().toLocaleString()} | Records: ${rows.length}`, 38, 51);
    const body = rows.map(r => columns.map(c => String(r[c.key] ?? "")));
    if (typeof doc.autoTable === "function") {
      doc.autoTable({ head:[columns.map(c => c.label)], body, startY:66, theme:"grid", styles:{fontSize:7,cellPadding:4,overflow:"linebreak"}, headStyles:{fillColor:[36,95,190]}, margin:{left:28,right:28}, horizontalPageBreak:true, horizontalPageBreakRepeat:[0] });
      doc.save(`employee-report-${dateStamp()}.pdf`);
    } else { window.print(); }
  }
  function downloadBlob(blob, filename) { const a = document.createElement("a"); const url = URL.createObjectURL(blob); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function dateStamp() { return new Date().toISOString().slice(0,10); }
  form.addEventListener("submit", generateReport);
  $("clearBtn").addEventListener("click", () => { form.reset(); state.rows=[]; state.generated=false; $("resultCount").textContent="Ready to search"; $("resultsSubtitle").textContent="Generate a report to display matching records."; $("tableWrap").hidden=true; $("emptyState").hidden=true; $("resultsBody").innerHTML=""; $("csvBtn").disabled=true; $("pdfBtn").disabled=true; setStatus("Enter any filter or generate the report without filters to list all employees."); });
  $("csvBtn").addEventListener("click", downloadCSV); $("pdfBtn").addEventListener("click", downloadPDF);
  document.querySelectorAll("[data-sort]").forEach(btn => btn.addEventListener("click", () => { const key=btn.dataset.sort; if (state.sortKey===key) state.sortDir=state.sortDir==="asc"?"desc":"asc"; else {state.sortKey=key;state.sortDir="asc";} render(); }));
})();
