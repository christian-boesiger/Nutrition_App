// ═══════════════════════════════════════════
// UI / RENDERING
// ═══════════════════════════════════════════

// ── Filter state (UI-seitig) ──
let _catalogFilter = 'alle';
let _intakeFilter  = 'alle';

function currentCatalogFilter() { return _catalogFilter; }
function currentIntakeFilter()  { return _intakeFilter; }

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════

function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'katalog') renderCatalog('alle');
  if (name === 'verlauf') renderSessions();
}

// ═══════════════════════════════════════════
// ACTIVITY – UI Callbacks (called from app.js)
// ═══════════════════════════════════════════

function onActivityStarted() {
  document.getElementById('state-idle').style.display   = 'none';
  document.getElementById('state-active').style.display = 'block';
  renderLiveStats();
  renderIntakeTimeline();
  showToast('Aktivität gestartet! 🚀');
}

function onActivityStopping(summaryHTML) {
  document.getElementById('session-summary-preview').innerHTML = summaryHTML;
  document.getElementById('session-comment').value = '';
  openModal('modal-session-end');
}

function onActivityStopped() {
  closeModal('modal-session-end');
  document.getElementById('state-idle').style.display   = 'block';
  document.getElementById('state-active').style.display = 'none';
}

function onIntakeAdded() {
  renderLiveStats();
  renderIntakeTimeline();
}

function getSessionComment() {
  return document.getElementById('session-comment').value.trim();
}

// ═══════════════════════════════════════════
// TIMER DISPLAY
// ═══════════════════════════════════════════

function updateTimerDisplay(elapsedSeconds) {
  document.getElementById('timer-display').textContent = formatDuration(elapsedSeconds);
}

function updateReminderDisplay(secondsLeft) {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  document.getElementById('next-reminder-display').textContent =
    `⏰ Nächste Erinnerung in ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════
// LIVE STATS
// ═══════════════════════════════════════════

function renderLiveStats() {
  const t = calcTotals();
  document.getElementById('live-kcal').textContent   = t.kcal;
  document.getElementById('live-carbs').textContent  = t.carbs + 'g';
  document.getElementById('live-sodium').textContent = t.sodium;
  document.getElementById('live-fluid').textContent  = t.fluid;
}

function renderIntakeTimeline() {
  const el = document.getElementById('intake-timeline');
  if (state.intakes.length === 0) {
    el.innerHTML = '<div style="font-size:13px; color:var(--text-light);">Noch nichts erfasst</div>';
    return;
  }
  el.innerHTML = state.intakes.map(i =>
    `<div class="intake-dot">${i.time} – ${i.name}</div>`
  ).join('');
}

// ═══════════════════════════════════════════
// INTAKE MODAL
// ═══════════════════════════════════════════

function openIntakeModal() {
  state.selectedProductId = null;
  _intakeFilter = 'alle';
  document.querySelectorAll('#modal-intake .cat-tab').forEach((t, i) =>
    t.classList.toggle('active', i === 0)
  );
  renderIntakeProductList('alle');
  openModal('modal-intake');
}

function filterIntakeList(cat, btn) {
  _intakeFilter = cat;
  document.querySelectorAll('#modal-intake .cat-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderIntakeProductList(cat);
}

function renderIntakeProductList(filter) {
  const products = loadProducts();
  const filtered = filter === 'alle' ? products : products.filter(p => p.category === filter);
  const el = document.getElementById('intake-product-list');
  el.innerHTML = filtered.map(p => `
    <div class="product-select-item ${state.selectedProductId === p.id ? 'selected' : ''}"
         onclick="selectIntakeProduct('${p.id}')">
      <div class="product-icon">${categoryIcon(p.category)}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.kcal} kcal · ${p.carbs}g KH · ${p.fluid > 0 ? p.fluid + 'ml' : 'kein Fluid'}</div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════
// KATALOG
// ═══════════════════════════════════════════

function filterCatalog(cat, btn) {
  _catalogFilter = cat;
  document.querySelectorAll('#page-katalog .cat-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderCatalog(cat);
}

function renderCatalog(filter) {
  _catalogFilter = filter;
  const products = loadProducts();
  const filtered = filter === 'alle' ? products : products.filter(p => p.category === filter);
  const el = document.getElementById('product-list');

  if (filtered.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Keine Produkte gefunden</p></div>`;
    return;
  }

  el.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="product-icon">${categoryIcon(p.category)}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">
          ${p.kcal} kcal · ${p.carbs}g KH · ${p.sodium}mg Na · ${p.fluid > 0 ? p.fluid + 'ml' : '–'}
          ${p.notes ? ' · ' + p.notes : ''}
        </div>
      </div>
      <div class="product-actions">
        <button class="btn btn-secondary btn-sm" onclick="openProductModal('${p.id}')">✏️</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteProduct('${p.id}')">🗑</button>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════
// PRODUKT MODAL
// ═══════════════════════════════════════════

function openProductModal(id) {
  state.editProductId = id || null;
  document.getElementById('product-modal-title').textContent = id ? 'Produkt bearbeiten' : 'Produkt hinzufügen';
  document.getElementById('edit-product-id').value = id || '';

  if (id) {
    const p = loadProducts().find(x => x.id === id);
    if (p) {
      document.getElementById('p-name').value     = p.name;
      document.getElementById('p-category').value = p.category;
      document.getElementById('p-kcal').value     = p.kcal;
      document.getElementById('p-carbs').value    = p.carbs;
      document.getElementById('p-sodium').value   = p.sodium;
      document.getElementById('p-fluid').value    = p.fluid;
      document.getElementById('p-notes').value    = p.notes;
    }
  } else {
    ['p-name','p-kcal','p-carbs','p-sodium','p-fluid','p-notes'].forEach(fid =>
      document.getElementById(fid).value = ''
    );
    document.getElementById('p-category').value = 'gel';
  }
  openModal('modal-product');
}

// ═══════════════════════════════════════════
// VERLAUF
// ═══════════════════════════════════════════

function renderSessions() {
  const sessions = loadSessions();
  const el = document.getElementById('session-list');

  if (sessions.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>Noch keine Sessions gespeichert</p></div>`;
    return;
  }

  el.innerHTML = sessions.map(s => `
    <div class="session-card" onclick="showSessionDetail('${s.id}')">
      <div class="session-header">
        <div>
          <div class="session-date">${s.date}</div>
          <div style="font-size:12px; color:var(--text-light); margin-top:2px;">${s.intakes.length} Einnahme(n)</div>
        </div>
        <div class="session-duration">⏱ ${formatDuration(s.duration)}</div>
      </div>
      <div class="session-stats">
        <div class="stat-box">
          <div class="stat-value">${s.totals.kcal}</div>
          <div class="stat-unit">kcal</div>
          <div class="stat-label">Kalorien</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${s.totals.carbs}g</div>
          <div class="stat-unit">KH</div>
          <div class="stat-label">Kohlenhydrate</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${s.totals.sodium}</div>
          <div class="stat-unit">mg</div>
          <div class="stat-label">Natrium</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${s.totals.fluid}</div>
          <div class="stat-unit">ml</div>
          <div class="stat-label">Flüssigkeit</div>
        </div>
      </div>
      ${s.comment ? `<div class="session-comment">💬 ${s.comment}</div>` : ''}
    </div>
  `).join('');
}

function showSessionDetail(id) {
  const s = loadSessions().find(x => x.id == id);
  if (!s) return;

  document.getElementById('detail-title').textContent = `Session – ${s.date}`;
  document.getElementById('detail-content').innerHTML = `
    <div style="font-size:13px; color:var(--text-light); margin-bottom:12px;">Dauer: ${formatDuration(s.duration)}</div>
    <div class="session-stats">
      <div class="stat-box">
        <div class="stat-value">${s.totals.kcal}</div>
        <div class="stat-unit">kcal</div>
        <div class="stat-label">Kalorien</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${s.totals.carbs}g</div>
        <div class="stat-unit">KH</div>
        <div class="stat-label">Kohlenhydrate</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${s.totals.sodium}</div>
        <div class="stat-unit">mg</div>
        <div class="stat-label">Natrium</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${s.totals.fluid}</div>
        <div class="stat-unit">ml</div>
        <div class="stat-label">Flüssigkeit</div>
      </div>
    </div>
    <div class="divider"></div>
    <div style="font-weight:700; font-size:13px; margin-bottom:10px; color:var(--text-light);">EINNAHMEN</div>
    ${s.intakes.length === 0
      ? '<div style="font-size:13px; color:var(--text-light);">Keine Einnahmen erfasst</div>'
      : s.intakes.map(i => `
          <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border);">
            <div style="font-size:20px;">${categoryIcon(i.category)}</div>
            <div style="flex:1;">
              <div style="font-weight:600; font-size:14px;">${i.name}</div>
              <div style="font-size:12px; color:var(--text-light);">${i.kcal} kcal · ${i.carbs}g KH${i.fluid > 0 ? ' · ' + i.fluid + 'ml' : ''}</div>
            </div>
            <div style="font-size:12px; color:var(--text-light); font-weight:600;">${i.time}</div>
          </div>
        `).join('')
    }
    ${s.comment ? `<div class="session-comment" style="margin-top:12px;">💬 ${s.comment}</div>` : ''}
  `;
  openModal('modal-session-detail');
}

// ═══════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Modals bei Overlay-Klick schliessen ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
  initApp();
});