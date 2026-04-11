const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { sendMail } = require('../utils/mailer');

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
    JWT_SECRET
  );
  logActivity({ userId: result.lastInsertRowid, userEmail: email, userName: full_name, action: 'register', detail: `New ${role || 'buyer'} account created`, req });
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
    JWT_SECRET
  );
  logActivity({ userId: user.id, userEmail: user.email, userName: user.full_name, action: 'login', detail: `Logged in as ${user.role}`, req });
  res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, referral_code: user.referral_code } });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const successMsg = 'If that email is registered, a reset link has been sent to your inbox.';
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ message: successMsg }); // Don't reveal if email exists

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
    .run(token, expires, user.id);

  const appUrl    = process.env.APP_URL || 'https://pinnacle-livestock-marketplace-production.up.railway.app';
  const resetLink = `${appUrl}/reset-password.html?token=${token}`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
    .header{background:#1b5e20;padding:28px 32px;text-align:center}
    .header h1{color:#fff;margin:0;font-size:1.4rem;letter-spacing:1px}
    .header p{color:rgba(255,255,255,.8);margin:4px 0 0;font-size:.9rem}
    .body{padding:36px}.body h2{color:#1b5e20;margin-top:0}
    .body p{color:#424242;line-height:1.8}
    .btn{display:inline-block;margin:24px 0;padding:14px 32px;background:#2e7d32;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem}
    .note{color:#757575;font-size:.82rem;margin-top:20px;border-top:1px solid #eee;padding-top:16px}
    .footer{background:#f5f5f5;padding:18px 32px;text-align:center;font-size:.8rem;color:#757575}
  </style></head><body><div class="wrap">
    <div class="header"><h1>🌾 PINNACLE</h1><p>East Africa's Livestock Marketplace</p></div>
    <div class="body">
      <h2>Reset Your Password</h2>
      <p>Hi <strong>${user.full_name}</strong>,</p>
      <p>We received a request to reset the password for your Pinnacle account. Click the button below to create a new password:</p>
      <a class="btn" href="${resetLink}">Reset My Password</a>
      <p class="note">⏱ This link expires in <strong>1 hour</strong>.<br/>
      If you didn't request a password reset, you can safely ignore this email — your account remains secure.</p>
    </div>
    <div class="footer">© 2026 Pinnacle Livestock Marketplace · thomaskiboma@gmail.com · +254 741 101 607</div>
  </div></body></html>`;

  await sendMail(email, 'Reset Your Pinnacle Password', html);
  logActivity({ userId: user.id, userEmail: user.email, userName: user.full_name, action: 'forgot_password', detail: 'Password reset email requested', req });
  res.json({ message: successMsg });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expires)
    return res.status(400).json({ error: 'Invalid or expired reset link.' });

  if (Date.now() > new Date(user.reset_token_expires).getTime())
    return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });

  const password_hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(password_hash, user.id);

  logActivity({ userId: user.id, userEmail: user.email, userName: user.full_name, action: 'password_reset', detail: 'Password reset successfully', req });
  res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, full_name, phone, role, farm_name, livestock_type, referral_code, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const sub = db.prepare('SELECT plan, billing_period, status, expires_at FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id);
  res.json({ ...user, subscription: sub || { plan: 'free' } });
});

module.exports = router;

