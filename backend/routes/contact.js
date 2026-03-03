const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /api/contact
router.post('/', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  db.prepare(`
    INSERT INTO contacts (name, email, phone, subject, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, phone || null, subject || null, message);

  res.status(201).json({ success: true, message: 'Message received! Our team will respond within 2 hours.' });
});

// GET /api/contact (admin only – list all messages)
router.get('/', (req, res) => {
  const messages = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json(messages);
});

module.exports = router;

