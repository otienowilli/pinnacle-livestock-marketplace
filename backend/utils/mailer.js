/**
 * Pinnacle Mailer Utility
 * Uses nodemailer + SMTP env vars.
 * Falls back gracefully when SMTP is not configured.
 *
 * Required env vars (set in Railway Variables):
 *   SMTP_HOST   e.g. smtp.gmail.com
 *   SMTP_PORT   e.g. 587
 *   SMTP_USER   e.g. admin@pinnacle.co.ke
 *   SMTP_PASS   Gmail App Password
 *   SMTP_FROM   e.g. "Pinnacle Livestock" <admin@pinnacle.co.ke>
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null; // SMTP not configured
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Send an email.
 * @param {string|string[]} to      Recipient(s)
 * @param {string} subject
 * @param {string} htmlBody
 * @returns {Promise<{sent:boolean, error?:string}>}
 */
async function sendMail(to, subject, htmlBody) {
  const t = getTransporter();
  if (!t) {
    return { sent: false, error: 'SMTP not configured – email saved to DB only.' };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || `"Pinnacle Livestock" <${process.env.SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: htmlBody,
    });
    return { sent: true };
  } catch (err) {
    console.error('[Mailer]', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Build a branded HTML email body.
 */
function buildHtml(subject, message) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  .header{background:#1b5e20;padding:28px 32px;text-align:center}
  .header img{height:52px;border-radius:50%;margin-bottom:10px}
  .header h1{color:#fff;margin:0;font-size:1.4rem;letter-spacing:1px}
  .body{padding:32px}
  .body h2{color:#1b5e20;margin-top:0}
  .body p{color:#424242;line-height:1.7;white-space:pre-wrap}
  .footer{background:#f5f5f5;padding:18px 32px;text-align:center;font-size:.8rem;color:#757575}
  .btn{display:inline-block;margin-top:20px;padding:12px 28px;background:#2e7d32;color:#fff;border-radius:8px;text-decoration:none;font-weight:700}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🌾 PINNACLE</h1>
    <p style="color:rgba(255,255,255,.8);margin:4px 0 0">East Africa's Livestock Marketplace</p>
  </div>
  <div class="body">
    <h2>${subject}</h2>
    <p>${message.replace(/\n/g, '<br/>')}</p>
    <a class="btn" href="https://pinnacle-livestock-marketplace-production.up.railway.app">Visit Pinnacle</a>
  </div>
  <div class="footer">
    © 2026 Pinnacle Livestock Marketplace · thomaskiboma@gmail.com · +254 741 101 607<br/>
    <small>You received this because you have a Pinnacle account. <a href="#">Unsubscribe</a></small>
  </div>
</div>
</body>
</html>`;
}

module.exports = { sendMail, buildHtml };

