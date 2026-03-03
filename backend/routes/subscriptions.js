const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const PLANS = {
  pro:        { monthly: 1999, annual: 1599 * 12 },
  enterprise: { monthly: 5999, annual: 4799 * 12 }
};

// POST /api/subscriptions/upgrade
router.post('/upgrade', requireAuth, (req, res) => {
  const { plan, billing_period, payment_method, phone_number } = req.body;
  if (!plan || !billing_period) {
    return res.status(400).json({ error: 'Plan and billing period are required.' });
  }
  if (!['pro', 'enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan. Choose pro or enterprise.' });
  }
  if (!['monthly', 'annual'].includes(billing_period)) {
    return res.status(400).json({ error: 'billing_period must be monthly or annual.' });
  }

  const amount = PLANS[plan][billing_period];
  const months = billing_period === 'annual' ? 12 : 1;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  // Cancel any active subscription first
  db.prepare(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'`).run(req.user.id);

  db.prepare(`
    INSERT INTO subscriptions (user_id, plan, billing_period, amount, status, expires_at)
    VALUES (?, ?, ?, ?, 'active', ?)
  `).run(req.user.id, plan, billing_period, amount, expiresAt.toISOString());

  res.json({
    success: true,
    message: `Upgraded to ${plan} plan! Payment of KSh ${amount.toLocaleString()} processed via ${payment_method || 'M-Pesa'}.`,
    plan,
    billing_period,
    amount,
    expires_at: expiresAt.toISOString()
  });
});

// GET /api/subscriptions/status
router.get('/status', requireAuth, (req, res) => {
  const sub = db.prepare(`
    SELECT plan, billing_period, amount, status, started_at, expires_at
    FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1
  `).get(req.user.id);
  res.json(sub || { plan: 'free', status: 'active' });
});

module.exports = router;

