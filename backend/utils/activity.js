/**
 * Activity logger — fire-and-forget, never throws.
 * Writes to the activity_logs table in SQLite.
 */
const db = require('../db');

const insert = db.prepare(`
  INSERT INTO activity_logs (user_id, user_email, user_name, action, detail, ip)
  VALUES (?, ?, ?, ?, ?, ?)
`);

/**
 * @param {object} opts
 * @param {number|null}  opts.userId
 * @param {string|null}  opts.userEmail
 * @param {string|null}  opts.userName
 * @param {string}       opts.action   — e.g. 'login', 'register', 'view_listings', 'create_listing'
 * @param {string|null}  opts.detail   — human-readable note
 * @param {object|null}  opts.req      — express request (to extract IP)
 */
function logActivity({ userId = null, userEmail = null, userName = null, action, detail = null, req = null }) {
  try {
    const ip = req
      ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null)
      : null;
    insert.run(userId, userEmail, userName, action, detail, ip);
  } catch (_) {
    // silent – logging must never break the app
  }
}

module.exports = { logActivity };

