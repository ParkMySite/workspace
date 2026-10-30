/* Treasury Portal: live employee summary for the dashboard.
   Requires APP_CONFIG.employeeReportApiUrl pointing to the deployed Employee Report Web App. */
(() => {
  "use strict";

  const REFRESH_INTERVAL_MS = 60 * 1000;
  const $ = (id) => document.getElementById(id);
  const config = window.APP_CONFIG || {};
  const apiUrl = String(config.employeeReportApiUrl || "").trim();
  let requestInProgress = false;

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function setConnection(ok, message) {
    setText("employeeConnectionStatus", ok ? "Connected" : "Unavailable");
    setText("employeeConnectionMessage", message);
    setText("reportApiStatus", ok ? "Connected" : "Not connected");
    const dot = $("employeeConnectionDot");
    if (dot) {
      dot.classList.toggle("employee-dot-error", !ok);
      dot.classList.toggle("employee-dot-success", ok);
    }
  }

  function showError(message) {
    const el = $("employeeLiveError");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function clearError() {
    const el = $("employeeLiveError");
    if (el) {
      el.textContent = "";
      el.hidden = true;
    }
  }

  function normaliseGender(value) {
    const gender = String(value || "").trim().toLowerCase();
    if (gender === "male" || gender === "m") return "male";
    if (gender === "female" || gender === "f") return "female";
    return "other";
  }

  function renderPreview(people) {
    const tbody = $("employeePreviewBody");
    if (!tbody) return;
    tbody.replaceChildren();

    if (!people.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.className = "employee-empty";
      cell.textContent = "No employee records found.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    people.slice(0, 5).forEach((person) => {
      const row = document.createElement("tr");
      [person.name || "—", person.gender || "—", person.year || "—"].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
  }

  async function refreshEmployeeData() {
    if (requestInProgress) return;
    if (!apiUrl || apiUrl.includes("YOUR_EMPLOYEE_REPORT") || apiUrl.includes("PASTE_")) {
      setConnection(false, "Add employeeReportApiUrl in config.js");
      showError("The Employee Report API URL is not configured. Add employeeReportApiUrl to window.APP_CONFIG in assets/js/config.js.");
      setText("employeeLastUpdated", "Not connected");
      return;
    }

    requestInProgress = true;
    const refreshButton = $("refreshEmployeeData");
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "↻ Refreshing…";
    }

    try {
      const url = new URL(apiUrl);
      url.searchParams.set("action", "report");
      // No filters means the API returns all employee records.
      const response = await fetch(url.toString(), { method: "GET", redirect: "follow", cache: "no-store" });
      if (!response.ok) throw new Error(`API request failed (HTTP ${response.status}).`);
      const payload = await response.json();
      if (!payload || payload.ok !== true || !Array.isArray(payload.data)) {
        throw new Error(payload && payload.error ? payload.error : "The report API returned an unexpected response.");
      }

      const people = payload.data.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
      const counts = { male: 0, female: 0, other: 0 };
      people.forEach((person) => counts[normaliseGender(person.gender)]++);

      setText("employeeTotal", String(people.length));
      setText("employeeMale", String(counts.male));
      setText("employeeFemale", String(counts.female));
      setText("employeeOther", String(counts.other));
      renderPreview(people);
      const refreshedAt = new Date();
      setText("employeeLastUpdated", `Last refreshed: ${refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
      setConnection(true, "Live data loaded from Google Sheets");
      clearError();
    } catch (error) {
      setConnection(false, "Could not load employee data");
      showError(`${error && error.message ? error.message : "Unable to load employee data."} Check the report API URL, deployment access and sheet configuration.`);
      setText("employeeLastUpdated", "Refresh failed — showing last available values, if any");
    } finally {
      requestInProgress = false;
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ Refresh now";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const button = $("refreshEmployeeData");
    if (button) button.addEventListener("click", refreshEmployeeData);

    const today = $("todayDate");
    if (today && (!today.textContent || today.textContent.trim() === "Today")) {
      today.textContent = new Date().toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
    }

    refreshEmployeeData();
    window.setInterval(refreshEmployeeData, REFRESH_INTERVAL_MS);
  });
})();
