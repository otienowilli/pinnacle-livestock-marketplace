const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

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

