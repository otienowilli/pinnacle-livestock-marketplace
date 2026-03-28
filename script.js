/* ============================================================
   PINNACLE LIVESTOCK MARKETPLACE — MAIN SCRIPT
   ============================================================ */

// ---- API configuration ----
// On localhost use the local dev server; everywhere else (Railway, etc.) use relative /api
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : '/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('pinnacle_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ---- Fallback data (shown while API loads) ----
const TYPE_IMGS = {
  cattle:  'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=250&fit=crop',
  goats:   'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=250&fit=crop',
  sheep:   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=250&fit=crop',
  pigs:    'https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=400&h=250&fit=crop',
  poultry: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=250&fit=crop',
};
const SELLER_IMGS = ['men/32','women/44','men/78','men/54','women/68','men/22','women/12','men/45'];

// Normalise a listing from the API into card-render format
function normalise(item) {
  const type = (item.type || 'cattle').toLowerCase();
  const priceNum = typeof item.price === 'number' ? item.price : parseInt((item.price || '0').replace(/\D/g,''));
  return {
    ...item,
    typeLabel: type.charAt(0).toUpperCase() + type.slice(1),
    priceLabel: item.price && typeof item.price === 'number'
      ? `KSh ${item.price.toLocaleString()}`
      : (item.price || 'Contact for price'),
    img: item.img || item.image_url || TYPE_IMGS[type] || TYPE_IMGS.cattle,
    badge: item.badge || (item.condition === 'Excellent' ? 'Featured' : 'NEW'),
    badgeClass: item.badgeClass || (item.condition === 'Excellent' ? '' : 'new'),
    seller: item.seller || item.seller_name || 'Verified Seller',
    sellerImg: item.sellerImg || `https://randomuser.me/api/portraits/${SELLER_IMGS[item.id % SELLER_IMGS.length]}.jpg`,
    age: item.age || '—',
    weight: item.weight || '—',
    location: item.location || 'East Africa',
  };
}

// ---- Navbar scroll effect ----
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 60);
  const btn = document.getElementById('backToTop');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
});

// ---- Hamburger toggle ----
function toggleNav() {
  const links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}

// ---- Modal helpers ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
}
function closeModalOutside(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// ---- Auth mode switcher (Register / Login) ----
function switchAuthMode(mode, btn) {
  const regPanel  = document.getElementById('authRegisterPanel');
  const logPanel  = document.getElementById('authLoginPanel');
  const title     = document.getElementById('authModalTitle');
  const sub       = document.getElementById('authModalSub');
  const allBtns   = document.querySelectorAll('.auth-mode-btn');
  allBtns.forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    // Called from link — find the matching button
    allBtns.forEach(b => { if (b.textContent.toLowerCase().includes(mode)) b.classList.add('active'); });
  }
  if (mode === 'login') {
    regPanel.style.display = 'none';
    logPanel.style.display = '';
    if (title) title.textContent = 'Welcome back!';
    if (sub)   sub.textContent   = 'Sign in to your Pinnacle account';
  } else {
    regPanel.style.display = '';
    logPanel.style.display = 'none';
    if (title) title.textContent = 'Join Pinnacle';
    if (sub)   sub.textContent   = 'Start selling your livestock to thousands of buyers today';
  }
}

// ---- Role tab switcher in register form ----
function switchTab(type, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const farmerFields  = document.getElementById('farmerFields');
  const roleInput     = document.getElementById('registerRole');
  if (farmerFields) farmerFields.style.display = type === 'farmer' ? 'flex' : 'none';
  if (roleInput)    roleInput.value = type;
}

// ---- Toast notification ----
function showToast(msg) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ---- Register form ----
async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email:          form.querySelector('[name="email"]')?.value,
        password:       form.querySelector('[name="password"]')?.value,
        full_name:      form.querySelector('[name="full_name"]')?.value,
        phone:          form.querySelector('[name="phone"]')?.value,
        role:           form.querySelector('[name="role"]')?.value || 'buyer',
        farm_name:      form.querySelector('[name="farm_name"]')?.value,
        livestock_type: form.querySelector('[name="livestock_type"]')?.value,
      })
    });
    localStorage.setItem('pinnacle_token', data.token);
    localStorage.setItem('pinnacle_user', JSON.stringify(data.user));
    closeModal('register-modal');
    updateNavAuth(data.user);
    showToast(`Welcome to Pinnacle, ${data.user.full_name}! 🎉`);
    form.reset();
  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---- Login form ----
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email:    form.querySelector('[name="login_email"]')?.value,
        password: form.querySelector('[name="login_password"]')?.value,
      })
    });
    localStorage.setItem('pinnacle_token', data.token);
    localStorage.setItem('pinnacle_user', JSON.stringify(data.user));
    closeModal('register-modal');
    updateNavAuth(data.user);
    showToast(`Welcome back, ${data.user.full_name}! 👋`);
    form.reset();
  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---- Auth: update nav with logged-in user ----
function updateNavAuth(user) {
  const navJoin = document.getElementById('navJoinBtn');
  const navUser = document.getElementById('navUserArea');
  const navName = document.getElementById('navUserName');
  if (!navJoin || !navUser) return;
  if (user) {
    navJoin.style.display = 'none';
    navUser.style.display = 'flex';
    if (navName) navName.textContent = user.full_name.split(' ')[0];
  } else {
    navJoin.style.display = '';
    navUser.style.display = 'none';
  }
}

function handleLogout() {
  localStorage.removeItem('pinnacle_token');
  localStorage.removeItem('pinnacle_user');
  updateNavAuth(null);
  showToast('You have been logged out. See you soon! 👋');
}

function initAuth() {
  const saved = localStorage.getItem('pinnacle_user');
  if (saved) { try { updateNavAuth(JSON.parse(saved)); } catch(_) {} }
}

// ---- Scroll to top ----
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ---- Search redirect ----
function searchListings() {
  const q = document.getElementById('heroSearch')?.value || '';
  const loc = document.getElementById('locationSelect')?.value || '';
  window.location.href = `marketplace.html?q=${encodeURIComponent(q)}&loc=${encodeURIComponent(loc)}`;
}

// ---- Animated counters ----
function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current = 0;
    const step = target / 80;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current).toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 20);
  });
}

// ---- Build listing card HTML ----
function buildListingCard(raw) {
  const item = normalise(raw);
  return `
  <div class="listing-card" onclick="window.location='marketplace.html'">
    <div class="listing-img">
      <img src="${item.img}" alt="${item.name}" loading="lazy"/>
      <span class="listing-badge ${item.badgeClass}">${item.badge}</span>
      <button class="listing-wishlist" onclick="event.stopPropagation();toggleWishlist(this)"><i class="far fa-heart"></i></button>
      <button class="listing-share-wa" onclick="event.stopPropagation();shareOnWhatsApp('${item.name}','${item.priceLabel}','${item.location}')"><i class="fab fa-whatsapp"></i> Share</button>
    </div>
    <div class="listing-body">
      <p class="listing-type"><i class="fas fa-tag"></i> ${item.typeLabel}</p>
      <h3>${item.name}</h3>
      <div class="listing-meta">
        <span><i class="fas fa-map-marker-alt"></i> ${item.location}</span>
        <span><i class="fas fa-calendar-alt"></i> ${item.age}</span>
        <span><i class="fas fa-weight-hanging"></i> ${item.weight}</span>
      </div>
      <div class="listing-footer">
        <span class="listing-price">${item.priceLabel}</span>
        <div class="listing-seller">
          <img src="${item.sellerImg}" alt="${item.seller}"/>
          <span>${item.seller} <i class="fas fa-check-circle verified-badge"></i></span>
        </div>
      </div>
    </div>
  </div>`;
}

function toggleWishlist(btn) {
  const icon = btn.querySelector('i');
  const isLiked = icon.classList.toggle('fas');
  icon.classList.toggle('far', !isLiked);
  if (isLiked) { btn.style.color='#e53935'; showToast('Added to wishlist!'); }
  else          { btn.style.color=''; showToast('Removed from wishlist'); }
}

// ---- Render featured grid ----
async function renderFeatured() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  grid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--gray-600)"><i class="fas fa-spinner fa-spin"></i> Loading listings…</p>';
  try {
    const listings = await apiFetch('/listings');
    grid.innerHTML = listings.length ? listings.map(buildListingCard).join('') : '<p style="text-align:center;padding:40px">No listings yet.</p>';
  } catch (_) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--gray-600)">Could not load listings — check your connection.</p>';
  }
}

// ---- Render marketplace grid ----
function renderMarketplace(data) {
  const grid = document.getElementById('marketplaceGrid');
  if (!grid) return;
  grid.innerHTML = data.length
    ? data.map(buildListingCard).join('')
    : '<p style="grid-column:1/-1;text-align:center;color:var(--gray-600);padding:60px 0">No listings found. Try adjusting your filters.</p>';
  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = `${data.length} listings found`;
}

// ---- Marketplace filter/search (API-powered) ----
async function filterMarketplace() {
  const grid = document.getElementById('marketplaceGrid');
  const q    = document.getElementById('marketSearch')?.value || '';
  const type = document.getElementById('typeFilter')?.value || '';
  const sort = document.getElementById('sortFilter')?.value || '';
  const params = new URLSearchParams();
  if (q)    params.set('search', q);
  if (type) params.set('type', type.toLowerCase());
  try {
    let data = await apiFetch(`/listings?${params}`);
    if (sort === 'price-asc')  data.sort((a,b) => a.price - b.price);
    if (sort === 'price-desc') data.sort((a,b) => b.price - a.price);
    renderMarketplace(data);
  } catch (_) {
    if (grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:60px">Could not load listings.</p>';
  }
}

// ---- FAQ accordion ----
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ---- Contact form ----
async function handleContact(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try {
    await apiFetch('/contact', {
      method: 'POST',
      body: JSON.stringify({
        name:    form.querySelector('[name="name"]')?.value,
        email:   form.querySelector('[name="email"]')?.value,
        phone:   form.querySelector('[name="phone"]')?.value,
        subject: form.querySelector('[name="subject"]')?.value,
        message: form.querySelector('[name="message"]')?.value,
      })
    });
    showToast('✅ Message sent! Grace will respond within 2 hours.');
    form.reset();
  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---- Intersection Observer for fade-in ----
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.category-card, .listing-card, .step-card, .testi-card, .value-card, .team-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    observer.observe(el);
  });
}

// ---- Add visible class styles ----
const style = document.createElement('style');
style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(style);

/* ============================================================
   PREMIUM — MARKET PRICE TICKER DATA
   ============================================================ */
const tickerPrices = [
  { label:'Friesian Heifer', price:'KSh 95,000', change:'+2.1%', up:true },
  { label:'Boer Goat',       price:'KSh 18,500', change:'+0.8%', up:true },
  { label:'Dorper Ram',      price:'KSh 22,000', change:'-1.2%', up:false },
  { label:'Broiler (kg)',    price:'KSh 320',    change:'+3.4%', up:true },
  { label:'Large White Pig', price:'KSh 28,000', change:'+1.5%', up:true },
  { label:'Dairy Cow',       price:'KSh 110,000',change:'-0.5%', up:false },
  { label:'Local Chicken',   price:'KSh 850',    change:'+1.0%', up:true },
  { label:'Angus Bull',      price:'KSh 185,000',change:'+4.2%', up:true },
  { label:'Merino Sheep',    price:'KSh 16,500', change:'-0.9%', up:false },
  { label:'Kenbro Chicken',  price:'KSh 1,200',  change:'+2.7%', up:true },
];

function buildTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  // Duplicate for seamless loop
  const html = [...tickerPrices, ...tickerPrices].map(t => `
    <span class="ticker-item">
      <span class="ticker-label">${t.label}</span>
      <span>${t.price}</span>
      <span class="${t.up ? 'ticker-up' : 'ticker-down'}">
        <i class="fas fa-arrow-${t.up ? 'up' : 'down'}"></i> ${t.change}
      </span>
    </span>`).join('');
  track.innerHTML = html;
  document.body.classList.add('has-ticker');
}

/* ============================================================
   PREMIUM — BILLING TOGGLE (monthly ↔ annual)
   ============================================================ */
const PLANS = {
  free:       { monthly: 0,     annual: 0 },
  pro:        { monthly: 1999,  annual: 1599 },
  enterprise: { monthly: 5999,  annual: 4799 },
};

function updatePricing(isAnnual) {
  Object.keys(PLANS).forEach(key => {
    const el = document.getElementById(`price-${key}`);
    if (!el) return;
    const amt = isAnnual ? PLANS[key].annual : PLANS[key].monthly;
    el.textContent = amt === 0 ? 'Free' : `${amt.toLocaleString()}`;
    const noteEl = document.getElementById(`note-${key}`);
    if (noteEl) {
      if (key === 'free') { noteEl.textContent = ''; return; }
      noteEl.textContent = isAnnual
        ? `Billed KSh ${(PLANS[key].annual * 12).toLocaleString()}/year — save 20%`
        : `Billed monthly — switch to annual to save 20%`;
    }
  });
  // Update monthly label highlights
  document.querySelectorAll('.billing-label-monthly').forEach(el => el.classList.toggle('active-label', !isAnnual));
  document.querySelectorAll('.billing-label-annual').forEach(el  => el.classList.toggle('active-label', isAnnual));
}

function initBillingToggle() {
  const toggle = document.getElementById('billingToggle');
  if (!toggle) return;
  toggle.addEventListener('change', () => updatePricing(toggle.checked));
  updatePricing(false);
}

/* ============================================================
   PREMIUM — OPEN UPGRADE MODAL
   ============================================================ */
function openUpgrade(planKey) {
  const isAnnual = document.getElementById('billingToggle')?.checked || false;
  const prices   = { free:0, pro: isAnnual?1599:1999, enterprise: isAnnual?4799:5999 };
  const names    = { free:'Starter', pro:'Pro Farmer', enterprise:'Enterprise' };
  const period   = isAnnual ? '/month, billed annually' : '/month';
  const amt      = prices[planKey];
  const nameEl   = document.getElementById('upgradePlanName');
  const priceEl  = document.getElementById('upgradePlanPrice');
  const periodEl = document.getElementById('upgradePlanPeriod');
  if (nameEl)   nameEl.textContent  = names[planKey];
  if (priceEl)  priceEl.textContent = amt === 0 ? 'Free' : `KSh ${amt.toLocaleString()}`;
  if (periodEl) periodEl.textContent = amt === 0 ? '' : period;
  openModal('upgrade-modal');
}

function selectPayMethod(btn, method) {
  document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const mpesaField  = document.getElementById('mpesaField');
  const cardFields  = document.getElementById('cardFields');
  if (mpesaField) mpesaField.style.display = method === 'mpesa' ? 'block' : 'none';
  if (cardFields) cardFields.style.display  = method === 'card'  ? 'block' : 'none';
}

async function handleUpgradePayment(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  const planName = document.getElementById('upgradePlanName')?.textContent || 'Pro Farmer';
  const planKey  = planName.toLowerCase().includes('enterprise') ? 'enterprise' : 'pro';
  const isAnnual = document.getElementById('billingToggle')?.checked || false;
  try {
    await apiFetch('/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({
        plan:           planKey,
        billing_period: isAnnual ? 'annual' : 'monthly',
        payment_method: form.querySelector('.pay-method-btn.selected')?.dataset?.method || 'mpesa',
        phone_number:   form.querySelector('#mpesaNumber')?.value || '',
      })
    });
    closeModal('upgrade-modal');
    showToast(`🎉 Welcome to Pinnacle ${planName}! Your premium features are now active.`);
    // Update stored user plan
    const saved = localStorage.getItem('pinnacle_user');
    if (saved) {
      const u = JSON.parse(saved);
      u.plan = planKey;
      localStorage.setItem('pinnacle_user', JSON.stringify(u));
    }
  } catch (err) {
    showToast(`❌ ${err.message || 'Payment failed. Please try again.'}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ============================================================
   PREMIUM — LIVE AUCTION COUNTDOWN TIMERS
   ============================================================ */
const auctionEndTimes = [
  Date.now() + 2*3600*1000 + 14*60*1000 + 30*1000,  // 2h 14m 30s
  Date.now() + 0*3600*1000 + 47*60*1000 + 12*1000,  // 47m 12s
  Date.now() + 5*3600*1000 + 3*60*1000  + 55*1000,  // 5h 3m 55s
];

function pad(n) { return String(n).padStart(2,'0'); }

function updateAuctionTimers() {
  auctionEndTimes.forEach((end, i) => {
    const remaining = Math.max(0, end - Date.now());
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const hEl = document.getElementById(`timer-h-${i}`);
    const mEl = document.getElementById(`timer-m-${i}`);
    const sEl = document.getElementById(`timer-s-${i}`);
    if (hEl) hEl.textContent = pad(h);
    if (mEl) mEl.textContent = pad(m);
    if (sEl) sEl.textContent = pad(s);
  });
}

function initAuctionTimers() {
  if (!document.querySelector('.auction-timer')) return;
  updateAuctionTimers();
  setInterval(updateAuctionTimers, 1000);
}

function placeBid(auctionIdx) {
  const bids = [24, 18, 31];
  const prices = ['KSh 97,500', 'KSh 19,200', 'KSh 24,800'];
  const bidEl  = document.getElementById(`bid-count-${auctionIdx}`);
  const priceEl= document.getElementById(`current-bid-${auctionIdx}`);
  if (bidEl)   bidEl.textContent  = `${bids[auctionIdx] + 1} bids`;
  if (priceEl) priceEl.textContent = prices[auctionIdx];
  bids[auctionIdx]++;
  showToast('🔨 Bid placed successfully! You are the highest bidder.');
}

/* ============================================================
   PREMIUM — PRICE ESTIMATOR
   ============================================================ */
const baseMarketPrices = {
  'Cattle':  { base: 85000,  perKg: 180, ageMultiplier: { young:0.55, juvenile:0.85, adult:1.0, breeding:1.2 } },
  'Goats':   { base: 12000,  perKg: 220, ageMultiplier: { young:0.5,  juvenile:0.8,  adult:1.0, breeding:1.25 } },
  'Sheep':   { base: 14000,  perKg: 200, ageMultiplier: { young:0.55, juvenile:0.82, adult:1.0, breeding:1.15 } },
  'Poultry': { base: 600,    perKg: 320, ageMultiplier: { young:0.4,  juvenile:0.75, adult:1.0, breeding:1.1 } },
  'Pigs':    { base: 22000,  perKg: 160, ageMultiplier: { young:0.45, juvenile:0.78, adult:1.0, breeding:1.18 } },
  'Rabbits': { base: 3500,   perKg: 400, ageMultiplier: { young:0.5,  juvenile:0.8,  adult:1.0, breeding:1.2 } },
};
const breedBonus = { exotic:1.35, crossbreed:1.15, local:1.0 };
const condBonus  = { excellent:1.2, good:1.0, fair:0.8 };

function runEstimator() {
  const type      = document.getElementById('estType')?.value;
  const breed     = document.getElementById('estBreed')?.value;
  const ageGroup  = document.getElementById('estAge')?.value;
  const weight    = parseFloat(document.getElementById('estWeight')?.value) || 0;
  const condition = document.getElementById('estCondition')?.value;
  const qty       = parseInt(document.getElementById('estQty')?.value) || 1;
  if (!type || !breed || !ageGroup || !weight || !condition) {
    showToast('⚠️ Please fill in all fields to get an estimate.'); return;
  }
  const mp = baseMarketPrices[type];
  const ageMult  = mp.ageMultiplier[ageGroup] || 1;
  const breedMult= breedBonus[breed] || 1;
  const condMult = condBonus[condition] || 1;
  const baseVal  = (mp.base + weight * mp.perKg) * ageMult * breedMult * condMult;
  const mid   = Math.round(baseVal / 100) * 100;
  const low   = Math.round(mid * 0.88 / 100) * 100;
  const high  = Math.round(mid * 1.14 / 100) * 100;
  const total = mid * qty;
  const ph = document.getElementById('estPlaceholder');
  const out= document.getElementById('estOutput');
  if (ph)  ph.style.display  = 'none';
  if (out) out.classList.add('visible');
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt('estLow',   `KSh ${low.toLocaleString()}`);
  setTxt('estMid',   `KSh ${mid.toLocaleString()}`);
  setTxt('estHigh',  `KSh ${high.toLocaleString()}`);
  setTxt('estAnimal', type);
  setTxt('estWeightOut', `${weight} kg`);
  setTxt('estBreedOut',  breed.charAt(0).toUpperCase() + breed.slice(1));
  setTxt('estQtyOut',    `${qty} animal${qty>1?'s':''}`);
  setTxt('estTotalOut',  `KSh ${total.toLocaleString()}`);
  showToast('✅ Market estimate calculated successfully!');
}

/* ============================================================
   TRUST — LIVE ACTIVITY FEED
   ============================================================ */
const activityEvents = [
  { avatar:'https://randomuser.me/api/portraits/men/32.jpg',  name:'James Mwangi',   location:'Nakuru',   action:'sold 8 Friesian Heifers',      price:'KSh 760,000', icon:'🐄', color:'var(--green)' },
  { avatar:'https://randomuser.me/api/portraits/women/44.jpg',name:'Fatuma Hassan',  location:'Mombasa',  action:'purchased 15 Boer Goats',      price:'KSh 277,500', icon:'🐐', color:'var(--amber)' },
  { avatar:'https://randomuser.me/api/portraits/men/54.jpg',  name:'Samuel Otieno', location:'Kisumu',   action:'listed 3 Dorper Rams',         price:'KSh 22,000 ea', icon:'🐑', color:'var(--green)' },
  { avatar:'https://randomuser.me/api/portraits/men/78.jpg',  name:'Peter Kamau',   location:'Kiambu',   action:'sold 200 Broiler Chickens',    price:'KSh 170,000', icon:'🐔', color:'var(--amber)' },
  { avatar:'https://randomuser.me/api/portraits/women/68.jpg',name:'Mary Njeri',    location:'Thika',    action:'joined as Pro Farmer',         price:'',            icon:'⭐', color:'var(--gold)' },
  { avatar:'https://randomuser.me/api/portraits/men/22.jpg',  name:'David Muthoni', location:'Meru',     action:'sold Angus Bull at auction',   price:'KSh 195,000', icon:'🐄', color:'#dc2626' },
  { avatar:'https://randomuser.me/api/portraits/women/12.jpg',name:'Aisha Wambua',  location:'Machakos', action:'listed 50 Kenbro Chickens',    price:'KSh 1,200 ea', icon:'🐔', color:'var(--green)' },
  { avatar:'https://randomuser.me/api/portraits/men/45.jpg',  name:'Charles Odhiambo',location:'Kisii',  action:'upgraded to Enterprise plan',  price:'',            icon:'🚀', color:'var(--gold)' },
  { avatar:'https://randomuser.me/api/portraits/women/33.jpg',name:'Esther Wanjiru',location:'Nakuru',   action:'sold 6 Large White Pigs',      price:'KSh 168,000', icon:'🐷', color:'var(--green)' },
  { avatar:'https://randomuser.me/api/portraits/men/61.jpg',  name:'Hassan Omar',   location:'Kwale',    action:'purchased an Angus Bull',      price:'KSh 180,000', icon:'🐄', color:'var(--amber)' },
];

let actIdx = 0;
const MAX_TOASTS = 2;

function showActivityToast() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  const ev = activityEvents[actIdx % activityEvents.length];
  actIdx++;
  const toast = document.createElement('div');
  toast.className = 'activity-toast';
  toast.style.borderLeftColor = ev.color;
  toast.innerHTML = `
    <img class="act-avatar" src="${ev.avatar}" alt="${ev.name}"/>
    <div class="act-body">
      <strong>${ev.icon} ${ev.name}</strong>
      <div class="act-sub">${ev.action}${ev.price ? ' · <b>' + ev.price + '</b>' : ''}</div>
      <div class="act-time"><i class="fas fa-map-marker-alt"></i> ${ev.location} · just now</div>
    </div>`;
  feed.appendChild(toast);
  // Keep only MAX_TOASTS visible
  const toasts = feed.querySelectorAll('.activity-toast:not(.removing)');
  if (toasts.length > MAX_TOASTS) {
    const old = toasts[0];
    old.classList.add('removing');
    setTimeout(() => old.remove(), 400);
  }
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

function initActivityFeed() {
  if (!document.getElementById('activityFeed')) return;
  setTimeout(showActivityToast, 2500);
  setInterval(showActivityToast, 6000);
}

/* ============================================================
   TRUST — ONLINE USERS COUNTER
   ============================================================ */
function initOnlineCounter() {
  const el = document.getElementById('onlineCount');
  if (!el) return;
  let base = 287 + Math.floor(Math.random() * 60);
  el.textContent = base.toLocaleString();
  setInterval(() => {
    base += Math.floor(Math.random() * 7) - 3;
    base = Math.max(250, Math.min(400, base));
    el.textContent = base.toLocaleString();
  }, 8000);
}

/* ============================================================
   TRUST — WHATSAPP SHARE (listings & platform)
   ============================================================ */
function shareOnWhatsApp(title, price, location) {
  const text = `🐄 *Pinnacle Livestock Marketplace*\n\n✅ *${title}*\n💰 ${price}\n📍 ${location}\n\n👉 Check it out on Pinnacle:\nhttps://pinnacle.co.ke/marketplace`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function sharePlatform(channel) {
  const url   = 'https://pinnacle.co.ke';
  const text  = '🐄 Just found the best livestock marketplace in East Africa — Pinnacle! Buy & sell cattle, goats, sheep, poultry & more. Trusted by 4,800+ farmers 🌱';
  const links = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    copy:     null,
  };
  if (channel === 'copy') {
    navigator.clipboard?.writeText(url).then(() => showToast('🔗 Link copied! Share Pinnacle with friends.'));
  } else {
    window.open(links[channel], '_blank');
  }
  toggleFab(false);
}

/* ============================================================
   TRUST — FLOATING SHARE BUTTON (FAB)
   ============================================================ */
function toggleFab(forceClose) {
  const opts = document.getElementById('fabOptions');
  if (!opts) return;
  const isOpen = opts.classList.contains('open');
  opts.classList.toggle('open', forceClose === false ? false : !isOpen);
}

/* ============================================================
   TRUST — REFERRAL COPY LINK
   ============================================================ */
function copyReferralLink() {
  const inp = document.getElementById('refLinkInput');
  const link = inp ? inp.value : 'https://pinnacle.co.ke/ref/YOUR-CODE';
  navigator.clipboard?.writeText(link).then(() => showToast('🔗 Referral link copied! Share it to earn KSh 500.'));
}

function shareReferral(channel) {
  const inp  = document.getElementById('refLinkInput');
  const link = inp ? inp.value : 'https://pinnacle.co.ke/ref/YOUR-CODE';
  const text = `🌱 Join me on Pinnacle — East Africa's best livestock marketplace! Use my link and we both earn KSh 500 when you make your first listing:\n${link}`;
  const urls = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  };
  window.open(urls[channel], '_blank');
}

// Generate a simple referral code on page load
function initReferral() {
  const inp = document.getElementById('refLinkInput');
  if (!inp) return;
  const code = 'REF-' + Math.random().toString(36).substring(2,8).toUpperCase();
  inp.value = `https://pinnacle.co.ke/ref/${code}`;
}

// ---- Initialise on DOM ready ----
document.addEventListener('DOMContentLoaded', () => {
  // Auth
  initAuth();

  // Listings
  renderFeatured();

  // Marketplace page: load & wire filters
  if (document.getElementById('marketplaceGrid')) {
    filterMarketplace();
    const params = new URLSearchParams(window.location.search);
    const tf = document.getElementById('typeFilter');
    if (tf && params.get('type')) {
      tf.value = params.get('type').charAt(0).toUpperCase() + params.get('type').slice(1);
      filterMarketplace();
    }
    const ms = document.getElementById('marketSearch');
    const sf = document.getElementById('sortFilter');
    if (ms) ms.addEventListener('input', filterMarketplace);
    if (tf) tf.addEventListener('change', filterMarketplace);
    if (sf) sf.addEventListener('change', filterMarketplace);
  }

  // General init
  initFAQ();
  initAnimations();
  buildTicker();
  initBillingToggle();
  initAuctionTimers();
  initActivityFeed();
  initOnlineCounter();
  initReferral();

  // Bind register & login forms
  const regForm = document.getElementById('registerForm');
  if (regForm) regForm.addEventListener('submit', handleRegister);
  const logForm = document.getElementById('loginForm');
  if (logForm) logForm.addEventListener('submit', handleLogin);

  // Bind price estimator
  const estBtn = document.getElementById('estBtn');
  if (estBtn) estBtn.addEventListener('click', runEstimator);

  // Bind upgrade payment form
  const upForm = document.getElementById('upgradeForm');
  if (upForm) upForm.addEventListener('submit', handleUpgradePayment);

  // Counter animation on hero scroll
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { animateCounters(); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(heroStats);
  }

  // Bind contact form
  const cf = document.getElementById('contactForm');
  if (cf) cf.addEventListener('submit', handleContact);

  // Farmer fields visibility
  const ff = document.getElementById('farmerFields');
  if (ff) { ff.style.display = 'flex'; ff.style.flexDirection = 'column'; ff.style.gap = '14px'; }
});

