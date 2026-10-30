/* SD-WAN dashboard data configuration.
   Restrict your Google API key in Google Cloud Console to the required APIs and your site referrers.
   Prefer moving Sheets access behind your Apps Script backend for confidential data. */
window.SDWAN_CONFIG = {
  // Replace with the Google Sheets API key used by your project.
  apiKey: "AIzaSyBB1V3vJpNZ9X1GIF-YOwoa6YSt_iXMLo0",
  spreadsheets: {
    main: "1HvCqLHC8IyllKskBXX1MtMfjQMGUyhMP7KuTuJxDhmU",
    treasuries: "105FU8biUFJETqboPumblZ1BJYv7TzKiOy7Jwfbn3zTw",
    wan2: "1q70H2WSERyz_agwb0ZirYzs2MhAO1sIB7GKlAGxvtUo",
    backup: "16ADBnxUOA6Gghl44mLqWmuJz-GvjoxdxVAdsHQqxl20"
  },
  sheets: {
    installation: "Installation Status",
    mpls: "MPLS Devices",
    working: "Working Status",
    admin: "Admin Contact Details",
    treasuries: "Treasuries",
    wan2: "WAN2 Details",
    backup: "Form Responses 1"
  }
};
