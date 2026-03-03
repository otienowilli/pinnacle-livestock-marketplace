const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/referrals/code  – get current user's referral code
router.get('/code', requireAuth, (req, res) => {
  const user = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ referral_code: user.referral_code });
});

// POST /api/referrals/redeem  – redeem a referral code at registration
router.post('/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Referral code is required.' });

  const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code);
  if (!referrer) return res.status(404).json({ error: 'Invalid referral code.' });
  if (referrer.id === req.user.id) return res.status(400).json({ error: 'You cannot redeem your own referral code.' });

  const alreadyUsed = db.prepare('SELECT id FROM referrals WHERE referred_id = ?').get(req.user.id);
  if (alreadyUsed) return res.status(409).json({ error: 'You have already redeemed a referral code.' });

  db.prepare(`
    INSERT INTO referrals (referrer_id, referred_id, code, status)
    VALUES (?, ?, ?, 'completed')
  `).run(referrer.id, req.user.id, code);

  // Mark reward as pending (in real app: trigger M-Pesa payout)
  db.prepare('UPDATE referrals SET reward_paid = 1 WHERE referrer_id = ? AND code = ?').run(referrer.id, code);

  res.json({ success: true, message: 'Referral redeemed! KSh 500 reward credited to referrer.' });
});

// GET /api/referrals/stats  – referral stats for current user
router.get('/stats', requireAuth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?').get(req.user.id).count;
  const completed = db.prepare(`SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND status = 'completed'`).get(req.user.id).count;
  const earnings = completed * 500;
  res.json({ total_referrals: total, completed, earnings_ksh: earnings });
});

module.exports = router;

