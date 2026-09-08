// ═══════════════════════════════════════════
// DATA & STORAGE
// ═══════════════════════════════════════════

const STORAGE_KEYS = {
  products: 'snt_products',
  sessions: 'snt_sessions'
};

const DUMMY_PRODUCTS = [
  // GELS
  { id: 'g1', name: 'SIS Go Energy Gel',    category: 'gel',   kcal: 87,  carbs: 22, sodium: 11,  fluid: 60,  notes: 'Isotonisch' },
  { id: 'g2', name: 'Maurten Gel 100',       category: 'gel',   kcal: 100, carbs: 25, sodium: 55,  fluid: 40,  notes: '' },
  { id: 'g3', name: 'GU Energy Gel Koffein', category: 'gel',   kcal: 100, carbs: 22, sodium: 55,  fluid: 32,  notes: '20mg Koffein' },
  { id: 'g4', name: 'Powerbar PowerGel',     category: 'gel',   kcal: 108, carbs: 27, sodium: 200, fluid: 41,  notes: 'Mit Natrium' },
  { id: 'g5', name: 'Clif Shot Gel',         category: 'gel',   kcal: 90,  carbs: 24, sodium: 50,  fluid: 34,  notes: 'Bio-Zutaten' },
  // GETRÄNKE
  { id: 'd1', name: 'Isostar Isotonic',      category: 'drink', kcal: 150, carbs: 35, sodium: 420, fluid: 500, notes: 'Zitrone' },
  { id: 'd2', name: 'Maurten Drink Mix 160', category: 'drink', kcal: 160, carbs: 40, sodium: 100, fluid: 500, notes: 'Hydrogel' },
  { id: 'd3', name: 'SIS Go Electrolyte',    category: 'drink', kcal: 136, carbs: 34, sodium: 410, fluid: 500, notes: 'Orange' },
  { id: 'd4', name: 'Powerbar Isoactive',    category: 'drink', kcal: 145, carbs: 36, sodium: 380, fluid: 500, notes: 'Waldbeere' },
  { id: 'd5', name: 'Wasser',                category: 'drink', kcal: 0,   carbs: 0,  sodium: 0,   fluid: 500, notes: '' },
  // RIEGEL
  { id: 'b1', name: 'Powerbar Performance Bar', category: 'bar', kcal: 230, carbs: 45, sodium: 180, fluid: 0, notes: 'Schokolade' },
  { id: 'b2', name: 'Clif Bar Hafer',            category: 'bar', kcal: 250, carbs: 44, sodium: 150, fluid: 0, notes: 'Hafer & Honig' },
  { id: 'b3', name: 'SIS Go Energy Bar',         category: 'bar', kcal: 215, carbs: 43, sodium: 90,  fluid: 0, notes: 'Beere' },
  { id: 'b4', name: 'Larabar Dattel-Nuss',       category: 'bar', kcal: 200, carbs: 30, sodium: 10,  fluid: 0, notes: 'Natürlich' },
  { id: 'b5', name: 'Powerbar Natural Energy',   category: 'bar', kcal: 185, carbs: 38, sodium: 70,  fluid: 0, notes: 'Aprikose' },
];

// ── In-memory fallback wenn localStorage nicht verfügbar ──
let _memProducts = null;
let _memSessions = [];

function isLocalStorageAvailable() {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return true;
  } catch(e) {
    return false;
  }
}

const USE_LS = isLocalStorageAvailable();

function loadProducts() {
  if (USE_LS) {
    const stored = localStorage.getItem(STORAGE_KEYS.products);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch(e) {}
    }
    const defaults = JSON.parse(JSON.stringify(DUMMY_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(defaults));
    return defaults;
  } else {
    if (_memProducts && _memProducts.length > 0) return _memProducts;
    _memProducts = JSON.parse(JSON.stringify(DUMMY_PRODUCTS));
    return _memProducts;
  }
}

function saveProducts(products) {
  if (USE_LS) {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
  } else {
    _memProducts = products;
  }
}

function loadSessions() {
  if (USE_LS) {
    const stored = localStorage.getItem(STORAGE_KEYS.sessions);
    if (stored) {
      try { return JSON.parse(stored); } catch(e) {}
    }
    return [];
  }
  return _memSessions;
}

function saveSessions(sessions) {
  if (USE_LS) {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  } else {
    _memSessions = sessions;
  }
}

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════

const state = {
  isActive: false,
  startTime: null,
  timerInterval: null,
  reminderInterval: null,
  reminderSeconds: 30 * 60,
  nextReminderIn: 30 * 60,
  intakes: [],
  selectedProductId: null,
  editProductId: null
};

// ═══════════════════════════════════════════
// ACTIVITY – Business Logic
// ═══════════════════════════════════════════

function startActivity() {
  state.isActive = true;
  state.startTime = Date.now();
  state.intakes = [];
  state.nextReminderIn = state.reminderSeconds;

  state.timerInterval    = setInterval(tickTimer, 1000);
  state.reminderInterval = setInterval(tickReminder, 1000);

  // UI update delegated to ui.js
  onActivityStarted();
}

function tickTimer() {
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  updateTimerDisplay(elapsed);
}

function tickReminder() {
  state.nextReminderIn--;
  updateReminderDisplay(state.nextReminderIn);

  if (state.nextReminderIn <= 0) {
    triggerReminder();
    state.nextReminderIn = state.reminderSeconds;
  }
}

function triggerReminder() {
  // Vibration
  if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
  // Sound
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.3, 0.6].forEach(delay => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch(e) {}

  showToast('⏰ Zeit für Ernährung!');
  openIntakeModal();
}

function stopActivity() {
  onActivityStopping(buildSessionSummaryHTML());
}

function confirmStopActivity() {
  clearInterval(state.timerInterval);
  clearInterval(state.reminderInterval);

  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const comment = getSessionComment();
  const totals  = calcTotals();

  const session = {
    id:       Date.now(),
    date:     new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    dateRaw:  new Date().toISOString(),
    duration: elapsed,
    intakes:  [...state.intakes],
    totals,
    comment
  };

  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions);

  state.isActive = false;
  onActivityStopped();
  showToast('Session gespeichert! ✅');
}

function calcTotals() {
  return state.intakes.reduce((acc, item) => {
    acc.kcal   += item.kcal   || 0;
    acc.carbs  += item.carbs  || 0;
    acc.sodium += item.sodium || 0;
    acc.fluid  += item.fluid  || 0;
    return acc;
  }, { kcal: 0, carbs: 0, sodium: 0, fluid: 0 });
}

function buildSessionSummaryHTML() {
  const t = calcTotals();
  return `
    <div class="session-stats">
      <div class="stat-box">
        <div class="stat-value">${t.kcal}</div>
        <div class="stat-unit">kcal</div>
        <div class="stat-label">Kalorien</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${t.carbs}g</div>
        <div class="stat-unit">KH</div>
        <div class="stat-label">Kohlenhydrate</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${t.sodium}</div>
        <div class="stat-unit">mg</div>
        <div class="stat-label">Natrium</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${t.fluid}</div>
        <div class="stat-unit">ml</div>
        <div class="stat-label">Flüssigkeit</div>
      </div>
    </div>
    <div style="font-size:13px; color:var(--text-light); margin-top:8px;">
      ${state.intakes.length} Einnahme(n) erfasst
    </div>`;
}

// ═══════════════════════════════════════════
// INTAKE – Business Logic
// ═══════════════════════════════════════════

function selectIntakeProduct(id) {
  state.selectedProductId = id;
  renderIntakeProductList(currentIntakeFilter());
}

function confirmIntake() {
  if (!state.selectedProductId) {
    showToast('Bitte ein Produkt auswählen');
    return;
  }
  const products = loadProducts();
  const product  = products.find(p => p.id === state.selectedProductId);
  if (!product) return;

  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  state.intakes.push({
    ...product,
    time:      formatDuration(elapsed),
    timestamp: Date.now()
  });

  onIntakeAdded();
  closeModal('modal-intake');
  showToast(`${product.name} erfasst ✓`);
}

// ═══════════════════════════════════════════
// PRODUCTS – Business Logic
// ═══════════════════════════════════════════

function saveProduct() {
  const name = document.getElementById('p-name').value.trim();
  if (!name) { showToast('Name ist erforderlich'); return; }

  const products = loadProducts();
  const editId   = document.getElementById('edit-product-id').value;

  const productData = {
    name,
    category: document.getElementById('p-category').value,
    kcal:     parseInt(document.getElementById('p-kcal').value)    || 0,
    carbs:    parseInt(document.getElementById('p-carbs').value)   || 0,
    sodium:   parseInt(document.getElementById('p-sodium').value)  || 0,
    fluid:    parseInt(document.getElementById('p-fluid').value)   || 0,
    notes:    document.getElementById('p-notes').value.trim()
  };

  if (editId) {
    const idx = products.findIndex(p => p.id === editId);
    if (idx !== -1) products[idx] = { ...products[idx], ...productData };
  } else {
    productData.id = 'p' + Date.now();
    products.push(productData);
  }

  saveProducts(products);
  closeModal('modal-product');
  renderCatalog(currentCatalogFilter());
  showToast(editId ? 'Produkt aktualisiert ✓' : 'Produkt hinzugefügt ✓');
}

function deleteProduct(id) {
  if (!confirm('Produkt wirklich löschen?')) return;
  const products = loadProducts().filter(p => p.id !== id);
  saveProducts(products);
  renderCatalog(currentCatalogFilter());
  showToast('Produkt gelöscht');
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function categoryIcon(cat) {
  return { gel: '🍯', drink: '🥤', bar: '🍫' }[cat] || '📦';
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

function initApp() {
  // Sicherstellen dass Produkte geladen sind
  const products = loadProducts();
  if (!products || products.length === 0) {
    saveProducts(JSON.parse(JSON.stringify(DUMMY_PRODUCTS)));
  }
  renderCatalog('alle');
}