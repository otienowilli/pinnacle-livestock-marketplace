const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = express.Router();

// GET /api/listings  (with optional filters: type, location, minPrice, maxPrice, search)
router.get('/', optionalAuth, (req, res) => {
  const { type, location, minPrice, maxPrice, search } = req.query;
  if (req.user) {
    logActivity({ userId: req.user.id, userEmail: req.user.email, userName: req.user.full_name, action: 'view_listings', detail: `Browsed marketplace${type ? ' – type: ' + type : ''}${search ? ' – search: ' + search : ''}`, req });
  }
  let sql = `SELECT l.*, u.full_name AS seller_name, u.phone AS seller_phone
             FROM listings l LEFT JOIN users u ON l.user_id = u.id
             WHERE l.status = 'active'`;
  const params = [];

  if (type && type !== 'all') { sql += ' AND l.type = ?'; params.push(type); }
  if (location && location !== 'all') { sql += ' AND l.location = ?'; params.push(location); }
  if (minPrice) { sql += ' AND l.price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { sql += ' AND l.price <= ?'; params.push(Number(maxPrice)); }
  if (search) { sql += ' AND (l.name LIKE ? OR l.breed LIKE ? OR l.description LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }

  sql += ' ORDER BY l.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/listings/:id
router.get('/:id', (req, res) => {
  const listing = db.prepare(`
    SELECT l.*, u.full_name AS seller_name, u.phone AS seller_phone, u.farm_name
    FROM listings l LEFT JOIN users u ON l.user_id = u.id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  res.json(listing);
});

// POST /api/listings  (auth required)
router.post('/', requireAuth, (req, res) => {
  const { type, name, price, location, age, weight, breed, condition, quantity, description } = req.body;
  if (!type || !name || !price || !location) {
    return res.status(400).json({ error: 'type, name, price and location are required.' });
  }
  const result = db.prepare(`
    INSERT INTO listings (user_id, type, name, price, location, age, weight, breed, condition, quantity, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, type, name, Number(price), location, age || null, weight || null, breed || null, condition || 'Excellent', Number(quantity) || 1, description || null);

  logActivity({ userId: req.user.id, userEmail: req.user.email, userName: req.user.full_name, action: 'create_listing', detail: `Posted listing: ${name} (${type}) at KES ${Number(price).toLocaleString()} – ${location}`, req });
  res.status(201).json({ id: result.lastInsertRowid, message: 'Listing created successfully.' });
});

// PUT /api/listings/:id  (auth required – owner only)
router.put('/:id', requireAuth, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorised.' });

  const { name, price, location, age, weight, breed, condition, quantity, description, status } = req.body;
  db.prepare(`
    UPDATE listings SET name=COALESCE(?,name), price=COALESCE(?,price), location=COALESCE(?,location),
    age=COALESCE(?,age), weight=COALESCE(?,weight), breed=COALESCE(?,breed), condition=COALESCE(?,condition),
    quantity=COALESCE(?,quantity), description=COALESCE(?,description), status=COALESCE(?,status)
    WHERE id = ?
  `).run(name, price ? Number(price) : null, location, age, weight, breed, condition, quantity ? Number(quantity) : null, description, status, req.params.id);

  res.json({ message: 'Listing updated.' });
});

// DELETE /api/listings/:id  (owner only – marks as pending/removed)
router.delete('/:id', requireAuth, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorised.' });

  db.prepare(`UPDATE listings SET status = 'pending' WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Listing removed.' });
});

module.exports = router;

