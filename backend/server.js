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

// ─── Auto-seed listings on startup ───────────────────────────────────────────
function autoSeed() {
  try {
    const db = require('./db');
    const { generateListings } = require('./seeds/livestock-seed');
    const count = db.prepare('SELECT COUNT(*) as n FROM listings').get().n;
    if (count < 1000) {
      const admin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
      if (!admin) { console.log('⚠️  No admin user found – skipping auto-seed.'); return; }
      const listings = generateListings(admin.id);
      const toAdd = listings.slice(0, Math.max(0, 1000 - count));
      const insert = db.prepare(`
        INSERT INTO listings (user_id, type, name, breed, price, location, age, weight, condition, quantity, description, image_url, status)
        VALUES (@user_id, @type, @name, @breed, @price, @location, @age, @weight, @condition, @quantity, @description, @image_url, @status)
      `);
      db.transaction(rows => rows.forEach(r => insert.run(r)))(toAdd);
      console.log(`🌱 Auto-seeded ${toAdd.length} listings (total: ${count + toAdd.length})`);
    } else {
      console.log(`✅ Listings OK – ${count} in database.`);
    }
  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Pinnacle API running at http://localhost:${PORT}`);
  console.log(`   Frontend  → http://localhost:${PORT}`);
  console.log(`   API docs  → http://localhost:${PORT}/api/health`);
  autoSeed();
});

