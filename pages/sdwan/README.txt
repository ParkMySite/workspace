TREASURY PORTAL SD-WAN DASHBOARD INTEGRATION

Files included:
- pages/sdwan-status.html
- assets/js/config/sdwan-config.js
- assets/js/pages/sdwan-status.js

Integration steps:
1. Copy pages/sdwan-status.html into your repository's pages/ folder.
2. Copy assets/js/config/sdwan-config.js into your repository's assets/js/config/ folder.
3. Copy assets/js/pages/sdwan-status.js into your repository's assets/js/pages/ folder.
4. In sdwan-config.js, replace YOUR_GOOGLE_SHEETS_API_KEY with your current key.
5. Confirm the CSS and JS filenames/paths referenced in sdwan-status.html match the actual files in your repository. This page assumes assets/css and assets/js directories and a shared layout.js at assets/js/components/layout.js.
6. Add the page to assets/js/config/menu.js if you want it in the sidebar. Example item:
   { label: "SD-WAN Status", href: "pages/sdwan-status.html", icon: "⌁", roles: ["Admin", "Staff"], activeKey: "sdwan-status.html" }
7. Ensure each Google Sheet is readable by the API key/user configuration. Restrict the key by HTTP referrer and API. Since browser-side requests expose the key and sheet data, use your Apps Script backend for confidential information.

The HTML includes sidebarMount, headerMount, and footerMount so the existing shared layout.js can populate the portal shell. If your app shell uses different CSS class names, adapt the app-shell/main-content classes to your current layout.
