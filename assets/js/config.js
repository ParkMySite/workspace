
/* Public frontend configuration. The Apps Script URL is not a secret.
   Never place passwords, API secrets, or privileged tokens in this file. */

window.APP_CONFIG = {
  appName: "Treasury Portal",

  // Existing Apps Script URL
  apiUrl: "https://script.google.com/macros/s/AKfycby9IVb5ydhHQgDCa_sW9zMF3Qm1k4gxssehOSHGk1982Fu4gpjekmvxXoXctCaV-pWw6A/exec",

  // Employee Details API URL
  // Use the deployed URL for the Employee Details Apps Script
  employeeApiUrl: "https://script.google.com/macros/s/AKfycbx2bezA_JtFJQVMC6IM3GnRuy6LoQRbvm9VrzFehvG6btE1F_aKyW27LWSJtrWUFrKv8Q/exec",
  employeeReportApiUrl: "https://script.google.com/macros/s/AKfycbzJ5_9MP8qAgendXldJP3dSY5VCYJhQiPIp1829x4wAbSrWx_zFE-wM9HZdgBZYWKw/exec",


  loginPage: "./index.html",
  dashboardPage: "./dashboard.html"
};
