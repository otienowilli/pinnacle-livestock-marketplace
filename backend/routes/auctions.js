const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/auctions  – active auctions with listing details
router.get('/', (req, res) => {
  const auctions = db.prepare(`
    SELECT a.*, l.name, l.type, l.breed, l.location, l.image_url,
           u.full_name AS seller_name
    FROM auctions a
    JOIN listings l ON a.listing_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE a.status = 'active' AND a.ends_at > datetime('now')
    ORDER BY a.ends_at ASC
  `).all();
  res.json(auctions);
});

// GET /api/auctions/:id
router.get('/:id', (req, res) => {
  const auction = db.prepare(`
    SELECT a.*, l.name, l.type, l.breed, l.location, l.description, l.image_url,
           u.full_name AS seller_name, u.phone AS seller_phone
    FROM auctions a
    JOIN listings l ON a.listing_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!auction) return res.status(404).json({ error: 'Auction not found.' });

  const recentBids = db.prepare(`
    SELECT b.amount, b.created_at, u.full_name AS bidder
    FROM bids b JOIN users u ON b.user_id = u.id
    WHERE b.auction_id = ? ORDER BY b.created_at DESC LIMIT 5
  `).all(req.params.id);

  res.json({ ...auction, recent_bids: recentBids });
});

// POST /api/auctions/:id/bid  (auth required)
router.post('/:id/bid', requireAuth, (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Valid bid amount required.' });

  const auction = db.prepare('SELECT * FROM auctions WHERE id = ? AND status = ?').get(req.params.id, 'active');
  if (!auction) return res.status(404).json({ error: 'Auction not found or has ended.' });
  if (new Date(auction.ends_at) < new Date()) return res.status(400).json({ error: 'Auction has ended.' });
  if (Number(amount) <= auction.current_bid) {
    return res.status(400).json({ error: `Bid must be higher than current bid of KSh ${auction.current_bid.toLocaleString()}.` });
  }

  db.prepare('INSERT INTO bids (auction_id, user_id, amount) VALUES (?, ?, ?)').run(auction.id, req.user.id, Number(amount));
  db.prepare('UPDATE auctions SET current_bid = ?, bid_count = bid_count + 1 WHERE id = ?').run(Number(amount), auction.id);

  res.json({
    success: true,
    message: `Bid of KSh ${Number(amount).toLocaleString()} placed successfully!`,
    current_bid: Number(amount),
    bid_count: auction.bid_count + 1
  });
});

module.exports = router;

