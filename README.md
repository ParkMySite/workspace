# Treasury Portal — complete starter (GitHub Pages + Apps Script + Google Sheets)

## Included
- Responsive login page and dashboard
- Shared header/sidebar/footer dynamically injected with `assets/js/components/layout.js`
- CSS and JavaScript in folders
- Starter module pages
- Apps Script backend (`apps-script/Code.gs`) with:
  - Users and AuditLog sheet setup
  - salted PBKDF2-HMAC-SHA256 password hashes
  - HMAC-signed short-lived bearer tokens
  - account active-status and role checks on every protected endpoint
  - basic per-username failed-login throttling
  - audit events
  - one-time bootstrap admin and manual user-creation helpers

## Security and suitability warning
This is a learning/internal-prototype foundation, not a certification of production security. Apps Script and Sheets are not a dedicated identity platform. For sensitive official or high-assurance data, use an approved identity provider and backend, and obtain your organization's security approval.
- Keep the spreadsheet private.
- Do not put passwords or signing secrets in frontend files.
- Never return all user rows or password hashes to the browser.
- Every future endpoint must call `requireAuth_(token)` and enforce role/ownership checks before reading or changing data.
- Tokens are bearer credentials: do not log them, expose them in URLs, or share screenshots containing them.
- `sessionStorage` only stores the token for this tab; it does not itself secure the API.
- Basic cache throttling is not a full rate limiter.
- Apps Script password-hashing runtime/quota and browser CORS behavior must be tested. If the cross-origin POST cannot be read from GitHub Pages, do not weaken security or use JSONP for passwords; move the UI into Apps Script HTML Service or use a supported backend/identity provider.

## Step 1 — create a new private Google Sheet
1. Create a Google Sheet named `Treasury Portal Auth`.
2. Leave sharing set to Restricted; do not use “Anyone with the link”.
3. Copy the spreadsheet ID from its URL (between `/d/` and `/edit`).

## Step 2 — create Apps Script
1. Open `script.google.com`, create a standalone project named `Treasury Portal API`.
2. Paste `apps-script/Code.gs` into `Code.gs`.
3. Open Project Settings > Script Properties and add:
   - `SPREADSHEET_ID` = your private sheet ID
   - `TOKEN_SIGNING_SECRET` = a random secret at least 32 characters long, generated privately. Do not reuse a password or put it in frontend code.
   - `BOOTSTRAP_ADMIN_USERNAME` = your chosen admin username
   - `BOOTSTRAP_ADMIN_PASSWORD` = a strong, unique password of 14+ characters
   - `BOOTSTRAP_ADMIN_NAME` = admin display name (optional)
4. Save the project.
5. Select and run `setupSpreadsheet()` once. Approve the requested Google Sheets authorization.
6. Run `setupInitialAdmin()` once. It creates the initial Admin row and deletes the temporary bootstrap password/user/name properties after success. Confirm the password property is gone. Keep the signing secret.
7. Never manually type plain passwords into the Sheet. The sheet stores salt + password hash.

## Step 3 — deploy Web App
1. Deploy > New deployment > select Web app.
2. Execute as: Me.
3. Access: choose the narrowest access setting that still supports your users. “Anyone” makes the endpoint internet-reachable, so the code must validate every request and should be used only after review.
4. Deploy and copy the `/exec` URL.
5. After changing Apps Script code, create a new version and update the deployment.

## Step 4 — connect frontend
1. In `assets/js/config.js`, set `apiUrl` to the deployed `/exec` URL.
2. Push the whole project to your GitHub repository.
3. Enable GitHub Pages from the correct branch/folder.
4. Test login from the actual deployed GitHub Pages URL, not only from a local file.

## Step 5 — create additional users
In Apps Script > Project Settings > Script Properties, temporarily add:
- `NEW_USER_USERNAME`
- `NEW_USER_PASSWORD` (14+ characters)
- `NEW_USER_NAME`
- `NEW_USER_ROLE` (`Admin`, `Staff`, or `Viewer`)
Run `createUserFromProperties()` manually. It deletes these temporary user/password properties on success.
For deactivation, set the user's `active` column to `FALSE`. Existing tokens are rejected because active status is checked on each request. For role changes, edit the `role` column; the backend re-reads the role from the sheet.

## API actions implemented
- `POST { action: "login", username, password }` — returns a short-lived signed token and a safe user profile.
- `POST { action: "dashboard", token }` — verifies the token, checks current active status, returns sample summary.
- `POST { action: "logout", token }` — logs logout, but bearer token naturally expires; browser clears it locally.
- `POST { action: "admin.listUsers", token }` — Admin-only list of safe user fields, no hashes.

## Important note on browser CORS
Apps Script web apps may behave differently across browsers/deployments for cross-origin fetch requests. The frontend uses a text/plain POST to avoid a JSON preflight in many browsers, but you must test the actual deployed flow. If the browser blocks reading the response, do not switch password login to JSONP or place credentials in URL query strings. Use Apps Script HTML Service for the login UI or an identity/backend platform designed for cross-origin APIs.

## Before adding business data
For every new action, explicitly:
1. Validate the action and all fields server-side.
2. Call `requireAuth_(request.token)`.
3. Check role and/or record ownership.
4. Limit what data is returned.
5. Log the outcome without passwords/tokens.
6. Avoid trusting client-provided role, userId, or access flags.
