const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pinnacle-livestock-secret-2026-default';

function genReferralCode() {
  return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, full_name, phone, role, farm_name, livestock_type } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password and full name are required.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered.' });

  const password_hash = bcrypt.hashSync(password, 10);
  const referral_code = genReferralCode();

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, phone, role, farm_name, livestock_type, referral_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(email, password_hash, full_name, phone || null, role || 'buyer', farm_name || null, livestock_type || null, referral_code);

  // Create free subscription
  db.prepare('INSERT INTO subscriptions (user_id, plan) VALUES (?, ?)').run(result.lastInsertRowid, 'free');

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, role: role || 'buyer', full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.status(201).json({ token, user: { id: result.lastInsertRowid, email, full_name, role: role || 'buyer', referral_code } });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, referral_code: user.referral_code } });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, full_name, phone, role, farm_name, livestock_type, referral_code, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const sub = db.prepare('SELECT plan, billing_period, status, expires_at FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id);
  res.json({ ...user, subscription: sub || { plan: 'free' } });
});

module.exports = router;

