/**
 * Treasury Portal - Google Apps Script backend
 *
 * Spreadsheet tabs:
 * Users: userId | username | displayName | salt | passwordHash | role | active | createdAt | lastLoginAt
 * AuditLog: timestamp | username | action | outcome | detail
 *
 * IMPORTANT:
 * - Deploy as Web App: Execute as Me; access Anyone (or restricted if your environment supports it).
 * - Keep the spreadsheet private. Do not publish it or expose its API credentials.
 * - The UI is not a security boundary; protect every data endpoint here.
 * - Apps Script + Sheets is a constrained internal-portal option, not ideal for high-assurance production authentication.
 */

const USERS_SHEET = 'Users';
const AUDIT_SHEET = 'AuditLog';
const TOKEN_TTL_SECONDS = 1800; // 30 minutes
const PBKDF2_ITERATIONS = 10000; // monitor runtime/quotas; use a mature identity provider for production

function doGet() {
  return json_({ ok: true, service: 'Treasury Portal API', version: 1 });
}

function doPost(e) {
  let request = {};
  try {
    request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(request.action || '');
    if (action === 'login') return json_(login_(request));
    if (action === 'dashboard') {
      const user = requireAuth_(request.token);
      audit_(user.username, 'dashboard', 'success', '');
      return json_({ success: true, user: publicUser_(user), summary: dashboardSummary_(user) });
    }
    if (action === 'logout') {
      const user = requireAuth_(request.token);
      audit_(user.username, 'logout', 'success', 'Client token cleared; token expires naturally.');
      return json_({ success: true });
    }
    if (action === 'admin.listUsers') {
      const user = requireAuth_(request.token);
      requireRole_(user, ['Admin']);
      const users = getUsers_().map(u => ({
        userId: u.userId, username: u.username, displayName: u.displayName,
        role: u.role, active: u.active
      }));
      audit_(user.username, 'admin.listUsers', 'success', '');
      return json_({ success: true, users: users });
    }
    return json_({ success: false, code: 'BAD_ACTION', message: 'Unknown action.' });
  } catch (err) {
    const message = String(err && err.message || 'Request failed');
    // Do not return stack traces, sheet contents or sensitive details to the browser.
    return json_({ success: false, code: classifyError_(message), message: safeMessage_(message) });
  }
}

function login_(request) {
  const username = normalizeUsername_(request.username);
  const password = String(request.password || '');
  if (!username || !password || username.length > 100 || password.length > 200) {
    audit_(username, 'login', 'denied', 'Missing or invalid input');
    return { success: false, code: 'INVALID_INPUT', message: 'Enter a valid user ID and password.' };
  }

  // Basic per-username throttle. Script Cache is best-effort, not a complete WAF.
  const cache = CacheService.getScriptCache();
  const key = 'login-fail:' + digestHex_(username.toLowerCase()).slice(0, 32);
  const failures = Number(cache.get(key) || 0);
  if (failures >= 8) {
    audit_(username, 'login', 'throttled', '');
    return { success: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' };
  }

  const user = getUsers_().find(u => u.username.toLowerCase() === username.toLowerCase());
  // Perform a hash even for unknown usernames to reduce obvious timing differences.
  const salt = user ? user.salt : 'unknown-user-salt';
  const candidate = pbkdf2_(password, salt, PBKDF2_ITERATIONS);
  const ok = !!user && user.active && constantTimeEqual_(candidate, user.passwordHash);

  if (!ok) {
    cache.put(key, String(failures + 1), 900);
    audit_(username, 'login', 'denied', 'Invalid credentials or inactive account');
    return { success: false, code: 'LOGIN_FAILED', message: 'Invalid user ID or password, or account is inactive.' };
  }
  cache.remove(key);
  updateLastLogin_(user.username);
  audit_(user.username, 'login', 'success', '');
  const now = Math.floor(Date.now() / 1000);
  const token = createToken_({ sub: user.username, iat: now, exp: now + TOKEN_TTL_SECONDS, jti: Utilities.getUuid() });
  return {
    success: true,
    user: publicUser_(user),
    token: token,
    expiresAt: (now + TOKEN_TTL_SECONDS) * 1000
  };
}

function requireAuth_(token) {
  const claims = verifyToken_(String(token || ''));
  if (!claims || !claims.sub) throw new Error('UNAUTHENTICATED');
  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || claims.exp <= now) throw new Error('UNAUTHENTICATED');
  const user = getUsers_().find(u => u.username.toLowerCase() === String(claims.sub).toLowerCase());
  if (!user || !user.active) throw new Error('UNAUTHENTICATED');
  // Role/status are always re-read from the private sheet; never trust client role claims.
  return user;
}

function requireRole_(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) throw new Error('FORBIDDEN');
}

function dashboardSummary_(user) {
  // Replace placeholders with actual values only after defining the data model and permissions.
  return {
    availableModules: 4,
    portalStatus: 'Operational',
    role: user.role,
    generatedAt: new Date().toISOString()
  };
}

function publicUser_(user) {
  return { username: user.username, displayName: user.displayName || user.username, role: user.role };
}

function getUsers_() {
  const sheet = getSpreadsheet_().getSheetByName(USERS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  return rows.filter(r => r[0] && r[1]).map(r => ({
    userId: String(r[0]), username: String(r[1]), displayName: String(r[2] || ''),
    salt: String(r[3]), passwordHash: String(r[4]), role: String(r[5] || 'Staff'),
    active: String(r[6]).toLowerCase() === 'true' || r[6] === true,
    createdAt: r[7], lastLoginAt: r[8]
  }));
}

function updateLastLogin_(username) {
  const sheet = getSpreadsheet_().getSheetByName(USERS_SHEET);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]).toLowerCase() === username.toLowerCase()) {
      sheet.getRange(i + 1, 9).setValue(new Date());
      return;
    }
  }
}

function createToken_(claims) {
  const payload = base64UrlEncode_(JSON.stringify(claims));
  const signature = sign_(payload);
  return payload + '.' + signature;
}

function verifyToken_(token) {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('UNAUTHENTICATED');
  if (!constantTimeEqual_(sign_(parts[0]), parts[1])) throw new Error('UNAUTHENTICATED');
  let claims;
  try { claims = JSON.parse(base64UrlDecode_(parts[0])); } catch (_) { throw new Error('UNAUTHENTICATED'); }
  return claims;
}

function sign_(payload) {
  const secret = PropertiesService.getScriptProperties().getProperty('TOKEN_SIGNING_SECRET');
  if (!secret || secret.length < 32) throw new Error('SERVER_NOT_CONFIGURED');
  const bytes = Utilities.computeHmacSha256Signature(payload, secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function base64UrlEncode_(text) {
  return Utilities.base64EncodeWebSafe(text, Utilities.Charset.UTF_8).replace(/=+$/, '');
}
function base64UrlDecode_(text) {
  const padded = text + '='.repeat((4 - text.length % 4) % 4);
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString('UTF-8');
}

function pbkdf2_(password, salt, iterations) {
  // PBKDF2-HMAC-SHA256, one 32-byte block.
  const key = password;
  const block1 = salt + String.fromCharCode(0, 0, 0, 1);
  let u = Utilities.computeHmacSha256Signature(block1, key);
  let out = u.slice();
  for (let i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(u, key);
    for (let j = 0; j < out.length; j++) out[j] = out[j] ^ u[j];
  }
  return bytesToHex_(out);
}

function bytesToHex_(bytes) {
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}
function digestHex_(value) {
  return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8));
}
function constantTimeEqual_(a, b) {
  a = String(a || ''); b = String(b || '');
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return diff === 0;
}
function normalizeUsername_(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}
function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SERVER_NOT_CONFIGURED');
  return SpreadsheetApp.openById(id);
}
function audit_(username, action, outcome, detail) {
  try {
    const sheet = getSpreadsheet_().getSheetByName(AUDIT_SHEET);
    if (sheet) sheet.appendRow([new Date(), String(username || '').slice(0, 100), action, outcome, String(detail || '').slice(0, 250)]);
  } catch (_) {
    // Audit logging failure must not expose secrets or stack traces to clients.
  }
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function classifyError_(message) {
  if (message === 'UNAUTHENTICATED') return 'UNAUTHENTICATED';
  if (message === 'FORBIDDEN') return 'FORBIDDEN';
  if (message === 'SERVER_NOT_CONFIGURED') return 'SERVER_NOT_CONFIGURED';
  return 'SERVER_ERROR';
}
function safeMessage_(message) {
  if (message === 'UNAUTHENTICATED') return 'Your session is invalid or expired. Please sign in again.';
  if (message === 'FORBIDDEN') return 'You do not have permission to perform this action.';
  if (message === 'SERVER_NOT_CONFIGURED') return 'The server is not configured. Contact the administrator.';
  return 'The request could not be completed. Contact the administrator if the problem continues.';
}

/**
 * ONE-TIME setup:
 * 1. Create a new Google Sheet with Users and AuditLog tabs (or run setupSpreadsheet()).
 * 2. In Apps Script > Project Settings > Script Properties set:
 *    SPREADSHEET_ID, TOKEN_SIGNING_SECRET (at least 32 random characters),
 *    BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_NAME.
 * 3. Run setupInitialAdmin() once from the editor, authorize it, then verify the Users row.
 * 4. The bootstrap password property is deleted after successful creation.
 */
function setupSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Set SPREADSHEET_ID in Script Properties first.');
  const ss = SpreadsheetApp.openById(id);
  let users = ss.getSheetByName(USERS_SHEET);
  if (!users) users = ss.insertSheet(USERS_SHEET);
  if (users.getLastRow() === 0) users.appendRow(['userId','username','displayName','salt','passwordHash','role','active','createdAt','lastLoginAt']);
  let audit = ss.getSheetByName(AUDIT_SHEET);
  if (!audit) audit = ss.insertSheet(AUDIT_SHEET);
  if (audit.getLastRow() === 0) audit.appendRow(['timestamp','username','action','outcome','detail']);
  users.setFrozenRows(1); audit.setFrozenRows(1);
  users.getRange(1,1,1,9).setFontWeight('bold');
  audit.getRange(1,1,1,5).setFontWeight('bold');
  return 'Sheets ready';
}

function setupInitialAdmin() {
  const props = PropertiesService.getScriptProperties();
  const username = normalizeUsername_(props.getProperty('BOOTSTRAP_ADMIN_USERNAME'));
  const password = props.getProperty('BOOTSTRAP_ADMIN_PASSWORD');
  const displayName = props.getProperty('BOOTSTRAP_ADMIN_NAME') || username;
  if (!username || !password || password.length < 14) {
    throw new Error('Set BOOTSTRAP_ADMIN_USERNAME and a strong BOOTSTRAP_ADMIN_PASSWORD (14+ characters) in Script Properties.');
  }
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(USERS_SHEET);
  if (!sheet) { setupSpreadsheet(); sheet = ss.getSheetByName(USERS_SHEET); }
  if (getUsers_().some(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('That username already exists. No account was created.');
  }
  const salt = Utilities.getUuid() + Utilities.getUuid();
  const hash = pbkdf2_(password, salt, PBKDF2_ITERATIONS);
  const userId = Utilities.getUuid();
  sheet.appendRow([userId, username, displayName, salt, hash, 'Admin', true, new Date(), '']);
  props.deleteProperty('BOOTSTRAP_ADMIN_PASSWORD');
  props.deleteProperty('BOOTSTRAP_ADMIN_USERNAME');
  props.deleteProperty('BOOTSTRAP_ADMIN_NAME');
  audit_(username, 'bootstrap-admin', 'success', 'Initial admin created');
  return 'Initial admin created. Remove bootstrap properties and store credentials safely.';
}

/**
 * Admin helper: run manually from the Apps Script editor only after setting
 * NEW_USER_USERNAME, NEW_USER_PASSWORD, NEW_USER_NAME, NEW_USER_ROLE in Script Properties.
 * Roles allowed: Admin, Staff, Viewer. The temporary password property is deleted on success.
 */
function createUserFromProperties() {
  const props = PropertiesService.getScriptProperties();
  const username = normalizeUsername_(props.getProperty('NEW_USER_USERNAME'));
  const password = props.getProperty('NEW_USER_PASSWORD');
  const displayName = props.getProperty('NEW_USER_NAME') || username;
  const role = props.getProperty('NEW_USER_ROLE') || 'Staff';
  if (!username || !password || password.length < 14) throw new Error('Set username and a strong password of at least 14 characters.');
  if (!['Admin','Staff','Viewer'].includes(role)) throw new Error('Role must be Admin, Staff, or Viewer.');
  if (getUsers_().some(u => u.username.toLowerCase() === username.toLowerCase())) throw new Error('Username already exists.');
  const salt = Utilities.getUuid() + Utilities.getUuid();
  const hash = pbkdf2_(password, salt, PBKDF2_ITERATIONS);
  getSpreadsheet_().getSheetByName(USERS_SHEET).appendRow([Utilities.getUuid(), username, displayName, salt, hash, role, true, new Date(), '']);
  props.deleteProperty('NEW_USER_PASSWORD');
  props.deleteProperty('NEW_USER_USERNAME');
  props.deleteProperty('NEW_USER_NAME');
  props.deleteProperty('NEW_USER_ROLE');
  audit_('system-admin', 'create-user', 'success', 'Created role ' + role);
  return 'User created. Share the credentials securely and require a password change through your established process.';
}
