const express = require('express');
const db = require('../db');
const { logActivity } = require('../utils/activity');
const { sendMail, buildHtml } = require('../utils/mailer');

const router = express.Router();

const NOTIFY_EMAIL = 'thomaskiboma@gmail.com';

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  db.prepare(`
    INSERT INTO contacts (name, email, phone, subject, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, phone || null, subject || null, message);

  logActivity({ userEmail: email, userName: name, action: 'contact_form', detail: `Subject: ${subject || 'General'} – "${message.substring(0, 80)}${message.length > 80 ? '…' : ''}"`, req });

  // Notify Thomas of the new contact message
  const emailBody = buildHtml(
    `📩 New Contact Message: ${subject || 'General Enquiry'}`,
    `You have a new message on Pinnacle:\n\n` +
    `👤 Name:    ${name}\n` +
    `📧 Email:   ${email}\n` +
    `📞 Phone:   ${phone || 'Not provided'}\n` +
    `📋 Subject: ${subject || 'General'}\n\n` +
    `💬 Message:\n${message}`
  );
  sendMail(NOTIFY_EMAIL, `📩 Pinnacle Contact: ${subject || 'New Message'} – from ${name}`, emailBody)
    .catch(err => console.error('[Contact notify]', err));

  res.status(201).json({ success: true, message: 'Message received! Our team will respond within 2 hours.' });
});

// GET /api/contact (admin only – list all messages)
router.get('/', (req, res) => {
  const messages = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json(messages);
});

module.exports = router;

