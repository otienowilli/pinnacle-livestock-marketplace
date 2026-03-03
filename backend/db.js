const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'pinnacle.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT CHECK(role IN ('farmer','buyer','admin')) DEFAULT 'buyer',
    farm_name TEXT,
    livestock_type TEXT,
    referral_code TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    location TEXT NOT NULL,
    age TEXT,
    weight TEXT,
    breed TEXT,
    condition TEXT DEFAULT 'Excellent',
    quantity INTEGER DEFAULT 1,
    description TEXT,
    image_url TEXT,
    status TEXT CHECK(status IN ('active','sold','pending')) DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    plan TEXT CHECK(plan IN ('free','pro','enterprise')) DEFAULT 'free',
    billing_period TEXT CHECK(billing_period IN ('monthly','annual')) DEFAULT 'monthly',
    amount INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('active','expired','cancelled')) DEFAULT 'active',
    started_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
  );

  CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER REFERENCES listings(id),
    starting_bid INTEGER NOT NULL,
    current_bid INTEGER NOT NULL,
    bid_count INTEGER DEFAULT 0,
    ends_at TEXT NOT NULL,
    status TEXT CHECK(status IN ('active','ended','cancelled')) DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER REFERENCES auctions(id),
    user_id INTEGER REFERENCES users(id),
    amount INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER REFERENCES users(id),
    referred_id INTEGER REFERENCES users(id),
    code TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending','completed')) DEFAULT 'pending',
    reward_paid INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seedListings = [
  { type:'cattle', name:'Friesian Dairy Cows', price:85000, location:'Kenya', age:'3 years', weight:'450kg', breed:'Friesian', condition:'Excellent', quantity:5, description:'High milk-producing Friesian dairy cows, vaccinated and dewormed.' },
  { type:'goats',  name:'Boer Goats',          price:12000, location:'Uganda', age:'2 years', weight:'45kg',  breed:'Boer',     condition:'Excellent', quantity:10, description:'Premium Boer goats, ideal for meat production, fully vaccinated.' },
  { type:'sheep',  name:'Dorper Sheep',         price:18000, location:'Tanzania', age:'18 months', weight:'55kg', breed:'Dorper', condition:'Good', quantity:8, description:'Healthy Dorper sheep, well-fed and ready for sale.' },
  { type:'pigs',   name:'Large White Pigs',     price:25000, location:'Rwanda', age:'6 months', weight:'80kg', breed:'Large White', condition:'Excellent', quantity:4, description:'Fast-growing Large White pigs raised on quality feed.' },
  { type:'cattle', name:'Angus Bulls',          price:120000, location:'Kenya', age:'4 years', weight:'600kg', breed:'Angus', condition:'Excellent', quantity:2, description:'Premium Angus bulls for breeding, superior genetics.' },
  { type:'poultry',name:'Kenbro Chickens',      price:800,   location:'Ethiopia', age:'5 months', weight:'2.5kg', breed:'Kenbro', condition:'Good', quantity:200, description:'Dual-purpose Kenbro chickens, great for eggs and meat.' }
];

const existingListings = db.prepare('SELECT COUNT(*) as cnt FROM listings').get();
if (existingListings.cnt === 0) {
  const insertListing = db.prepare(`
    INSERT INTO listings (type, name, price, location, age, weight, breed, condition, quantity, description)
    VALUES (@type, @name, @price, @location, @age, @weight, @breed, @condition, @quantity, @description)
  `);
  seedListings.forEach(l => insertListing.run(l));

  // Seed auctions for first 3 listings
  const listingRows = db.prepare('SELECT id FROM listings LIMIT 3').all();
  const insertAuction = db.prepare(`
    INSERT INTO auctions (listing_id, starting_bid, current_bid, bid_count, ends_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const bids = [{ start: 75000, cur: 92000, count: 14 }, { start: 10000, cur: 15500, count: 9 }, { start: 15000, cur: 21000, count: 6 }];
  listingRows.forEach((row, i) => {
    const endsAt = new Date(Date.now() + (i + 1) * 3600000 * 24).toISOString();
    insertAuction.run(row.id, bids[i].start, bids[i].cur, bids[i].count, endsAt);
  });
}

module.exports = db;

