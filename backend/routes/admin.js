const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { generateListings } = require('../seeds/livestock-seed');
const { sendMail, buildHtml } = require('../utils/mailer');

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const totalUsers        = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const totalListings     = db.prepare('SELECT COUNT(*) as n FROM listings').get().n;
  const activeListings    = db.prepare("SELECT COUNT(*) as n FROM listings WHERE status='active'").get().n;
  const totalAuctions     = db.prepare('SELECT COUNT(*) as n FROM auctions').get().n;
  const activeAuctions    = db.prepare("SELECT COUNT(*) as n FROM auctions WHERE status='active'").get().n;
  const totalContacts     = db.prepare('SELECT COUNT(*) as n FROM contacts').get().n;
  const totalSubscriptions= db.prepare('SELECT COUNT(*) as n FROM subscriptions').get().n;
  const proSubs           = db.prepare("SELECT COUNT(*) as n FROM subscriptions WHERE plan='pro' AND status='active'").get().n;
  const enterpriseSubs    = db.prepare("SELECT COUNT(*) as n FROM subscriptions WHERE plan='enterprise' AND status='active'").get().n;
  const totalBids         = db.prepare('SELECT COUNT(*) as n FROM bids').get().n;
  const farmers           = db.prepare("SELECT COUNT(*) as n FROM users WHERE role='farmer'").get().n;
  const buyers            = db.prepare("SELECT COUNT(*) as n FROM users WHERE role='buyer'").get().n;
  const admins            = db.prepare("SELECT COUNT(*) as n FROM users WHERE role='admin'").get().n;

  res.json({
    users: { total: totalUsers, farmers, buyers, admins },
    listings: { total: totalListings, active: activeListings },
    auctions: { total: totalAuctions, active: activeAuctions, totalBids },
    contacts: { total: totalContacts },
    subscriptions: { total: totalSubscriptions, pro: proSubs, enterprise: enterpriseSubs }
  });
});

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.phone, u.role, u.farm_name,
           u.livestock_type, u.referral_code, u.created_at,
           s.plan as subscription_plan, s.status as subscription_status
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id AND s.id = (
      SELECT MAX(id) FROM subscriptions WHERE user_id = u.id
    )
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['farmer', 'buyer', 'admin'].includes(role))
    return res.status(400).json({ error: 'Invalid role. Must be farmer, buyer, or admin.' });
  const info = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'User not found.' });
  res.json({ success: true, message: `User role updated to ${role}` });
});

router.delete('/users/:id', (req, res) => {
  if (String(req.user.id) === String(req.params.id))
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  db.prepare('DELETE FROM bids WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM referrals WHERE referrer_id = ? OR referred_id = ?').run(req.params.id, req.params.id);
  db.prepare('DELETE FROM listings WHERE user_id = ?').run(req.params.id);
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'User not found.' });
  res.json({ success: true, message: 'User deleted successfully.' });
});

// ─── LISTINGS ─────────────────────────────────────────────────────────────────
router.get('/listings', (req, res) => {
  const listings = db.prepare(`
    SELECT l.*, u.full_name as seller_name, u.email as seller_email
    FROM listings l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.created_at DESC
  `).all();
  res.json(listings);
});

router.put('/listings/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'sold', 'pending'].includes(status))
    return res.status(400).json({ error: 'Invalid status. Must be active, sold, or pending.' });
  const info = db.prepare('UPDATE listings SET status = ? WHERE id = ?').run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ success: true, message: `Listing status updated to ${status}` });
});

router.delete('/listings/:id', (req, res) => {
  db.prepare('DELETE FROM auctions WHERE listing_id = ?').run(req.params.id);
  const info = db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ success: true, message: 'Listing deleted.' });
});

// ─── AUCTIONS ─────────────────────────────────────────────────────────────────
router.get('/auctions', (req, res) => {
  const auctions = db.prepare(`
    SELECT a.*, l.name as listing_name, l.type as listing_type, l.location
    FROM auctions a
    LEFT JOIN listings l ON l.id = a.listing_id
    ORDER BY a.ends_at ASC
  `).all();
  res.json(auctions);
});

router.put('/auctions/:id/close', (req, res) => {
  const info = db.prepare("UPDATE auctions SET status = 'ended' WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Auction not found.' });
  res.json({ success: true, message: 'Auction closed.' });
});

// ─── CONTACTS ─────────────────────────────────────────────────────────────────
router.get('/contacts', (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json(contacts);
});

router.delete('/contacts/:id', (req, res) => {
  const info = db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Message not found.' });
  res.json({ success: true, message: 'Contact message deleted.' });
});

// ─── SEED LIVESTOCK DATA ──────────────────────────────────────────────────────
router.post('/seed-listings', (req, res) => {
  const current = db.prepare('SELECT COUNT(*) as n FROM listings').get().n;
  if (current >= 1000) return res.json({ success: true, message: `Already have ${current} listings – no seed needed.`, added: 0 });

  const admin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  if (!admin) return res.status(500).json({ error: 'No admin user found to assign listings.' });

  const listings = generateListings(admin.id);
  const toAdd = listings.slice(0, Math.max(0, 1000 - current));

  const insert = db.prepare(`
    INSERT INTO listings (user_id, type, name, breed, price, location, age, weight, condition, quantity, description, image_url, status)
    VALUES (@user_id, @type, @name, @breed, @price, @location, @age, @weight, @condition, @quantity, @description, @image_url, @status)
  `);
  const insertMany = db.transaction(rows => rows.forEach(r => insert.run(r)));
  insertMany(toAdd);

  res.json({ success: true, message: `✅ Seeded ${toAdd.length} livestock listings!`, added: toAdd.length, total: current + toAdd.length });
});

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
router.get('/activity', (req, res) => {
  const limit  = Math.min(Number(req.query.limit)  || 100, 500);
  const offset = Number(req.query.offset) || 0;
  const action = req.query.action || null;

  let sql = 'SELECT * FROM activity_logs';
  const params = [];
  if (action) { sql += ' WHERE action = ?'; params.push(action); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logs  = db.prepare(sql).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as n FROM activity_logs${action ? ' WHERE action = ?' : ''}`).get(...(action ? [action] : [])).n;
  res.json({ logs, total, limit, offset });
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
// GET /api/admin/notifications  – list previously sent notifications
router.get('/notifications', (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
  res.json(notifs);
});

// POST /api/admin/notify  – send email notification to users
router.post('/notify', async (req, res) => {
  const { target, subject, message } = req.body;
  if (!target || !subject || !message) {
    return res.status(400).json({ error: 'target, subject and message are required.' });
  }

  // Resolve recipients
  let emails = [];
  if (target === 'all') {
    emails = db.prepare("SELECT email FROM users WHERE email IS NOT NULL").all().map(r => r.email);
  } else if (target === 'farmers') {
    emails = db.prepare("SELECT email FROM users WHERE role='farmer'").all().map(r => r.email);
  } else if (target === 'buyers') {
    emails = db.prepare("SELECT email FROM users WHERE role='buyer'").all().map(r => r.email);
  } else {
    // Treat as a specific email or user id
    const user = db.prepare("SELECT email FROM users WHERE email=? OR id=?").get(target, Number(target) || 0);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    emails = [user.email];
  }

  if (emails.length === 0) {
    return res.status(400).json({ error: 'No recipients found for the selected target.' });
  }

  // Save to DB first (always)
  const info = db.prepare(`
    INSERT INTO notifications (sent_by, target, subject, message, recipients_count, status)
    VALUES (?, ?, ?, ?, ?, 'sent')
  `).run(req.user.id, target, subject, message, emails.length);

  // Attempt to send emails
  const html = buildHtml(subject, message);
  const results = await Promise.allSettled(emails.map(email => sendMail(email, subject, html)));
  const sent = results.filter(r => r.status === 'fulfilled' && r.value?.sent).length;
  const failed = emails.length - sent;

  res.json({
    success: true,
    notification_id: info.lastInsertRowid,
    recipients: emails.length,
    emails_sent: sent,
    emails_failed: failed,
    smtp_configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    message: sent > 0
      ? `Notification sent to ${sent} recipient(s)${failed > 0 ? `, ${failed} failed` : ''}.`
      : `Notification saved. ${failed} email(s) not sent – SMTP not configured on server.`
  });
});

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
router.get('/subscriptions', (req, res) => {
  const subs = db.prepare(`
    SELECT s.*, u.full_name, u.email
    FROM subscriptions s
    LEFT JOIN users u ON u.id = s.user_id
    ORDER BY s.started_at DESC
  `).all();
  res.json(subs);
});

module.exports = router;

