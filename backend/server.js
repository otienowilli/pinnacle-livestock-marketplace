require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from project root
app.use(express.static(path.join(__dirname, '..')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/listings',      require('./routes/listings'));
app.use('/api/contact',       require('./routes/contact'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/auctions',      require('./routes/auctions'));
app.use('/api/referrals',     require('./routes/referrals'));
app.use('/api/admin',         require('./routes/admin'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Pinnacle Livestock API', version: '1.0.0' }));

// ─── Serve admin.html for /admin route ───────────────────────────────────────
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '..', 'admin.html')));

// ─── Serve index.html for any non-API route (SPA fallback) ────────────────────
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
  next();
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Pinnacle API running at http://localhost:${PORT}`);
  console.log(`   Frontend  → http://localhost:${PORT}`);
  console.log(`   API docs  → http://localhost:${PORT}/api/health`);
});

