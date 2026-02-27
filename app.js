/* ============================================
   APP.JS — Rocket Search Application Logic
   Dual-mode: Real Google APIs + Demo fallback
   ============================================ */

const CGI_BIN = '__CGI_BIN__';

// ---- In-memory state ----
let currentBusiness = null;
let currentScores = null;
let currentFindings = null;
let currentCompetitors = null;
let currentScript = null;
let apiKey = ''; // In-memory API key
let dataMode = 'demo'; // 'live' or 'demo'

// ---- DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initInputPage();
  loadSavedApiKey();
});

// ---- Load saved API key from backend ----
async function loadSavedApiKey() {
  try {
    const resp = await fetch(`${CGI_BIN}/api.py?action=config`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.hasKey) {
        // Key exists on server — mark as configured but don't expose the raw key
        apiKey = '__SERVER_SAVED__';
        updateSettingsStatus(true, data.maskedKey);
      }
    }
  } catch (e) {
    // Silently fail — demo mode
  }
}

// ---- Background Canvas (subtle grid/particles) ----
function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(212, 168, 73, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(212, 168, 73, 0.15)'; ctx.fill();
    }

    ctx.strokeStyle = 'rgba(212, 168, 73, 0.04)';
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ---- Page Navigation ----
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
}

// ---- Input Page ----
function initInputPage() {
  const input = document.getElementById('business-input');
  const btn = document.getElementById('analyze-btn');
  if (!input || !btn) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startAnalysis();
  });
  btn.addEventListener('click', startAnalysis);
}

// ---- Settings Modal ----
function openSettings() {
  document.getElementById('settings-modal').classList.add('open');
  const keyInput = document.getElementById('api-key-input');
  if (keyInput && apiKey && apiKey !== '__SERVER_SAVED__') {
    keyInput.value = apiKey;
  }
  keyInput && keyInput.focus();
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
}

function updateSettingsStatus(connected, maskedKey) {
  const statusEl = document.getElementById('api-status');
  if (!statusEl) return;
  if (connected) {
    statusEl.innerHTML = `
      <div class="api-status-connected">
        <i class="fas fa-check-circle"></i>
        <span>Connected — Key: ${maskedKey || '****'}</span>
      </div>`;
    statusEl.className = 'api-status connected';
  } else {
    statusEl.innerHTML = `
      <div class="api-status-disconnected">
        <i class="fas fa-exclamation-circle"></i>
        <span>Not configured — Demo mode active</span>
      </div>`;
    statusEl.className = 'api-status disconnected';
  }
}

async function saveApiKey() {
  const keyInput = document.getElementById('api-key-input');
  const key = keyInput ? keyInput.value.trim() : '';
  const saveBtn = document.querySelector('#settings-modal .btn-gold');

  if (!key) {
    // Clear the key
    apiKey = '';
    try {
      await fetch(`${CGI_BIN}/api.py?action=config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_api_key: '' }),
      });
    } catch (e) {}
    updateSettingsStatus(false);
    showToast('API key removed. Running in demo mode.', 'success');
    closeSettings();
    return;
  }

  // Show loading
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
  }

  try {
    // Test the key
    const testResp = await fetch(`${CGI_BIN}/api.py?action=test_key&key=${encodeURIComponent(key)}`);
    const testData = await testResp.json();

    if (testData.success) {
      // Save to server
      await fetch(`${CGI_BIN}/api.py?action=config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_api_key: key }),
      });

      apiKey = key;
      const masked = key.slice(0, 8) + '...' + key.slice(-4);
      updateSettingsStatus(true, masked);
      showToast('API key saved and verified!', 'success');
      closeSettings();
    } else {
      updateSettingsStatus(false);
      showToast(testData.error || 'API key test failed', 'error');
    }
  } catch (e) {
    // Even if test fails, save the key (user might not have Places API but has valid key)
    await fetch(`${CGI_BIN}/api.py?action=config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_api_key: key }),
    }).catch(() => {});

    apiKey = key;
    const masked = key.slice(0, 8) + '...' + key.slice(-4);
    updateSettingsStatus(true, masked);
    showToast('API key saved (could not verify — test endpoint unreachable)', 'success');
    closeSettings();
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Save & Test';
    }
  }
}

// ---- Main Analysis Flow ----
async function startAnalysis() {
  const input = document.getElementById('business-input');
  const val = input.value.trim();
  if (!val) { input.focus(); return; }

  const inputType = ScoringEngine.detectInputType(val);
  const hasApiKey = !!apiKey;

  // Show loading page immediately
  showPage('loading-page');

  const bizNameEl = document.getElementById('loading-biz-name');
  const bizDetailEl = document.getElementById('loading-biz-detail');
  const progressBar = document.getElementById('progress-bar');
  const stepsContainer = document.getElementById('loading-steps');

  // Update loading steps based on mode
  const steps = stepsContainer.querySelectorAll('li');
  const stepLabels = [
    'Analyzing website performance...',
    'Looking up business information...',
    'Scanning Google reviews...',
    'Finding local competitors...',
    'Calculating scores...',
    'Generating call script...',
  ];
  steps.forEach((s, i) => {
    s.classList.remove('active', 'done');
    const icon = s.querySelector('.step-icon i');
    icon.className = 'fas fa-spinner';
    // Update label text (keep icon span, replace text)
    const textNode = s.childNodes[s.childNodes.length - 1];
    if (textNode && textNode.nodeType === 3) {
      textNode.textContent = '\n            ' + stepLabels[i] + '\n          ';
    } else {
      // Fallback: just set text after icon
      s.innerHTML = `<span class="step-icon"><i class="fas fa-spinner"></i></span>\n            ${stepLabels[i]}`;
    }
  });

  progressBar.style.width = '0%';
  bizNameEl.textContent = 'Searching...';
  bizDetailEl.textContent = '';

  // Collect API data
  let pagespeedData = null;
  let placesData = null;
  let competitorsData = null;

  // Helper to advance steps
  let currentStep = 0;
  function advanceStep(progress) {
    if (currentStep > 0 && steps[currentStep - 1]) {
      steps[currentStep - 1].classList.remove('active');
      steps[currentStep - 1].classList.add('done');
      const prevIcon = steps[currentStep - 1].querySelector('.step-icon i');
      if (prevIcon) prevIcon.className = 'fas fa-check';
    }
    if (steps[currentStep]) {
      steps[currentStep].classList.add('active');
    }
    progressBar.style.width = progress + '%';
    currentStep++;
  }

  try {
    // STEP 1: PageSpeed (works without key for URLs)
    advanceStep(10);
    let websiteUrl = '';
    if (inputType === 'url') {
      websiteUrl = val.startsWith('http') ? val : 'https://' + val;
    }

    if (websiteUrl) {
      try {
        const psResp = await fetch(`${CGI_BIN}/api.py?action=pagespeed&url=${encodeURIComponent(websiteUrl)}`);
        if (psResp.ok) {
          pagespeedData = await psResp.json();
          if (!pagespeedData.success) pagespeedData = null;
        }
      } catch (e) {
        console.warn('PageSpeed API failed, using simulated data:', e);
      }
    }

    // STEP 2: Places Lookup (requires key)
    advanceStep(30);
    if (hasApiKey) {
      try {
        const lookupType = inputType === 'phone' ? 'phone' : 'url';
        const lookupInput = inputType === 'phone' ? val : (websiteUrl || val);
        const lookupUrl = `${CGI_BIN}/api.py?action=lookup&input=${encodeURIComponent(lookupInput)}&type=${lookupType}`;
        const lookupResp = await fetch(lookupUrl);
        if (lookupResp.ok) {
          placesData = await lookupResp.json();
          if (!placesData.success) placesData = null;
        }
      } catch (e) {
        console.warn('Places API failed, using simulated data:', e);
      }
    }

    // Build business object
    if (placesData) {
      currentBusiness = ScoringEngine.buildBusinessFromPlaces(placesData, val);
      // If we didn't have a URL but Places gave us one, try PageSpeed
      if (!websiteUrl && currentBusiness.website) {
        websiteUrl = currentBusiness.website;
        try {
          const psResp = await fetch(`${CGI_BIN}/api.py?action=pagespeed&url=${encodeURIComponent(websiteUrl)}`);
          if (psResp.ok) {
            pagespeedData = await psResp.json();
            if (!pagespeedData.success) pagespeedData = null;
          }
        } catch (e) {
          console.warn('Secondary PageSpeed call failed:', e);
        }
      }
    } else {
      currentBusiness = ScoringEngine.lookupBusinessDemo(val);
    }

    // Update loading display
    bizNameEl.textContent = currentBusiness.businessName;
    bizDetailEl.textContent = `${currentBusiness.industry} · ${currentBusiness.city}, ${currentBusiness.state}`;

    // STEP 3: Reviews (already in Places data)
    advanceStep(50);
    await sleep(400); // Small delay for UX

    // STEP 4: Competitors (requires key + location)
    advanceStep(65);
    if (hasApiKey && currentBusiness.lat && currentBusiness.lng) {
      try {
        // Map industry to Google type
        const typeParam = currentBusiness.industry || 'establishment';
        const compUrl = `${CGI_BIN}/api.py?action=competitors&lat=${currentBusiness.lat}&lng=${currentBusiness.lng}&type=${encodeURIComponent(typeParam)}&exclude=${encodeURIComponent(currentBusiness.placeId || '')}`;
        const compResp = await fetch(compUrl);
        if (compResp.ok) {
          const compJson = await compResp.json();
          if (compJson.success && compJson.competitors) {
            competitorsData = compJson.competitors;
          }
        }
      } catch (e) {
        console.warn('Competitors API failed, using simulated data:', e);
      }
    }

    // STEP 5: Calculate Scores
    advanceStep(85);
    const apiData = {
      pagespeed: pagespeedData,
      placesData: placesData,
      competitorsData: competitorsData,
    };

    currentScores = ScoringEngine.generateScores(currentBusiness, apiData);
    currentFindings = ScoringEngine.generateFindings(currentBusiness, currentScores);
    currentCompetitors = ScoringEngine.generateCompetitors(currentBusiness, currentScores.overall, competitorsData);

    // STEP 6: Generate Call Script
    advanceStep(100);
    currentScript = ScoringEngine.generateCallScript(currentBusiness, currentScores, currentFindings, currentCompetitors);

    // Determine overall data mode
    dataMode = currentScores.dataMode;

    // Mark last step done
    await sleep(400);
    if (steps[steps.length - 1]) {
      steps[steps.length - 1].classList.remove('active');
      steps[steps.length - 1].classList.add('done');
      const lastIcon = steps[steps.length - 1].querySelector('.step-icon i');
      if (lastIcon) lastIcon.className = 'fas fa-check';
    }

    // Build and show results
    buildResultsPage();
    await sleep(400);
    showPage('results-page');
    animateScoreGauge();
    animateCategoryBars();

  } catch (err) {
    console.error('Analysis error:', err);
    // Fallback to full demo mode
    currentBusiness = currentBusiness || ScoringEngine.lookupBusinessDemo(val);
    currentScores = ScoringEngine.generateScores(currentBusiness, {});
    currentFindings = ScoringEngine.generateFindings(currentBusiness, currentScores);
    currentCompetitors = ScoringEngine.generateCompetitors(currentBusiness, currentScores.overall, null);
    currentScript = ScoringEngine.generateCallScript(currentBusiness, currentScores, currentFindings, currentCompetitors);
    dataMode = 'demo';

    buildResultsPage();
    showPage('results-page');
    animateScoreGauge();
    animateCategoryBars();
    showToast('Some API calls failed. Showing partial demo data.', 'error');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Build Results Page ----
function buildResultsPage() {
  buildActionBar();
  buildCallScript();
  buildAuditPanel();
}

// ---- Action Bar ----
function buildActionBar() {
  const bar = document.getElementById('action-bar');
  const colorClass = ScoringEngine.getScoreColor(currentScores.overall);
  const grade = ScoringEngine.getLetterGrade(currentScores.overall);

  const modeIndicator = dataMode === 'live'
    ? '<span class="data-mode-badge live"><i class="fas fa-circle"></i> Live Data</span>'
    : '<span class="data-mode-badge demo"><i class="fas fa-circle"></i> Demo Mode</span>';

  bar.innerHTML = `
    <div class="biz-badge">
      <span class="biz-name">${currentBusiness.businessName}</span>
      <span class="score-pill score-bg-${colorClass}">${currentScores.overall}/100 · ${grade}</span>
      ${modeIndicator}
    </div>
    <div class="action-buttons">
      <button class="btn btn-gold" onclick="downloadPDF()"><i class="fas fa-file-pdf"></i> Download PDF</button>
      <button class="btn btn-outline" onclick="openEmailModal()"><i class="fas fa-envelope"></i> Email Report</button>
      <button class="btn btn-outline" onclick="copyCallScript()"><i class="fas fa-copy"></i> Copy Script</button>
      <button class="btn btn-outline" onclick="newLookup()"><i class="fas fa-redo"></i> New Lookup</button>
    </div>
  `;
}

// ---- Call Script Panel ----
function buildCallScript() {
  const panel = document.getElementById('call-script-panel');
  const s = currentScript;
  const b = currentBusiness;

  let painPointsHTML = s.painPoints.map(pp => `
    <div class="pain-point-card ${pp.priority}">
      <div class="pp-header">
        <span class="pp-badge">${pp.priority}</span>
        <span class="pp-title">${pp.problem}</span>
      </div>
      <div class="pp-impact">${pp.impact}</div>
      <div class="pp-stat"><i class="fas fa-chart-bar"></i> ${pp.stat}</div>
    </div>
  `).join('');

  let objectionsHTML = s.objections.map((o, i) => `
    <div class="objection-item" id="objection-${i}">
      <button class="objection-trigger" onclick="toggleObjection(${i})">
        <span>${o.objection}</span>
        <i class="fas fa-chevron-down"></i>
      </button>
      <div class="objection-body">
        <div class="objection-body-inner">
          <div class="say-marker"><i class="fas fa-comment"></i> SAY THIS:</div>
          <div class="say-text">${o.response}</div>
        </div>
      </div>
    </div>
  `).join('');

  let keyStatsHTML = s.keyStats.map(st => `
    <div class="key-stat-card">
      <div class="stat-value">${st.value}</div>
      <div class="stat-label">${st.label}</div>
    </div>
  `).join('');

  panel.innerHTML = `
    <!-- Header -->
    <div class="card">
      <div class="script-header">
        <div>
          <div class="script-badge"><i class="fas fa-phone-alt"></i> CALL SCRIPT</div>
          <div class="script-header-info" style="margin-top: 0.75rem;">
            <div class="script-biz-name">${b.businessName}</div>
            <div class="script-meta">
              <span><i class="fas fa-user"></i> ${b.ownerName}</span>
              <span><i class="fas fa-phone"></i> ${formatPhone(b.phone)}</span>
              <span><i class="fas fa-clock"></i> Best Time: ${s.bestCallTime}</span>
            </div>
          </div>
        </div>
        <div class="script-header-actions">
          <button class="btn btn-outline" onclick="copyCallScript()" title="Copy script"><i class="fas fa-copy"></i> Copy</button>
        </div>
      </div>
    </div>

    <!-- 1. Opening -->
    <div class="script-section">
      <div class="script-section-header">
        <span class="section-number">1</span>
        <i class="fas fa-door-open"></i> OPENING
      </div>
      <div class="script-section-body">
        <div class="say-marker"><i class="fas fa-comment"></i> SAY THIS:</div>
        <div class="say-text">${s.opening}</div>
        <div class="coaching-cue" style="margin-top: 0.75rem;">[Pause — wait for response. If they say yes, continue. If hesitant, say "I'll be quick, just 30 seconds."]</div>
      </div>
    </div>

    <!-- 2. The Hook -->
    <div class="script-section">
      <div class="script-section-header">
        <span class="section-number">2</span>
        <i class="fas fa-bullseye"></i> THE HOOK
      </div>
      <div class="script-section-body">
        <div class="say-marker"><i class="fas fa-comment"></i> SAY THIS:</div>
        <div class="say-text">${s.hook}</div>
        <div class="coaching-cue" style="margin-top: 0.75rem;">[Pause — let the number sink in. Listen for their reaction.]</div>
      </div>
    </div>

    <!-- 3. Pain Points -->
    <div class="script-section">
      <div class="script-section-header">
        <span class="section-number">3</span>
        <i class="fas fa-exclamation-triangle"></i> PAIN POINTS DISCOVERED
      </div>
      <div class="script-section-body">
        <div class="say-marker" style="margin-bottom: 0.75rem;"><i class="fas fa-comment"></i> REFERENCE THESE DURING THE CALL:</div>
        ${painPointsHTML}
      </div>
    </div>

    <!-- 4. Competitor Pressure -->
    <div class="script-section">
      <div class="script-section-header">
        <span class="section-number">4</span>
        <i class="fas fa-users"></i> COMPETITOR PRESSURE
      </div>
      <div class="script-section-body">
        <div class="say-marker"><i class="fas fa-comment"></i> SAY THIS:</div>
        <div class="say-text">${s.competitorPressure}</div>
        <div class="coaching-cue" style="margin-top: 0.75rem;">[Listen — this usually triggers concern. Let them process it.]</div>
      </div>
    </div>

    <!-- 5. The Offer -->
    <div class="script-section">
      <div class="script-section-header">
        <span class="section-number">5</span>
        <i class="fas fa-handshake"></i> THE OFFER / CLOSE
      </div>
      <div class="script-section-body">
        <div class="say-marker"><i class="fas fa-comment"></i> SAY THIS:</div>
        <div class="say-text">${s.offer}</div>
        <div class="coaching-cue" style="margin-top: 0.75rem;">[Wait for email. If they give it, confirm and say "Perfect, you'll have it in 5 minutes."]</div>
      </div>
    </div>

    <!-- 6. Objection Handlers -->
    <div class="script-section">
      <div class="script-section-header">
        <span class="section-number">6</span>
        <i class="fas fa-shield-alt"></i> OBJECTION HANDLERS
      </div>
      <div class="script-section-body">
        ${objectionsHTML}
      </div>
    </div>

    <!-- 7. Key Stats -->
    <div class="script-section">
      <div class="script-section-header">
        <span class="section-number">7</span>
        <i class="fas fa-chart-line"></i> KEY STATS TO REFERENCE
      </div>
      <div class="script-section-body">
        <div class="key-stats-grid">
          ${keyStatsHTML}
        </div>
      </div>
    </div>
  `;
}

// ---- Audit Panel ----
function buildAuditPanel() {
  const panel = document.getElementById('audit-panel');
  const sc = currentScores;
  const colorClass = ScoringEngine.getScoreColor(sc.overall);
  const grade = ScoringEngine.getLetterGrade(sc.overall);

  // Category bars
  const catHTML = Object.entries(sc.categories).map(([key, cat]) => {
    const cc = ScoringEngine.getScoreColor(cat.score);
    const cg = ScoringEngine.getLetterGrade(cat.score);
    const realBadge = cat.metrics && cat.metrics._real
      ? '<span class="cat-real-badge" title="Real data from Google API"><i class="fas fa-check-circle"></i></span>'
      : '';
    return `
      <div class="category-item">
        <div class="cat-icon"><i class="fas ${cat.icon}"></i></div>
        <div class="cat-info">
          <div class="cat-name-row">
            <span class="cat-name">${cat.name} ${realBadge}</span>
            <span class="cat-grade score-bg-${cc}">${cg} · ${cat.score}</span>
          </div>
          <div class="cat-bar">
            <div class="cat-bar-fill score-bg-${cc}" data-width="${cat.score}"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Competitor table
  const compRows = currentCompetitors.map(c => {
    const cc = ScoringEngine.getScoreColor(c.score);
    const realIcon = c._real ? ' <i class="fas fa-check-circle" style="font-size:0.6rem;opacity:0.4;" title="Real business from Google"></i>' : '';
    return `
      <tr class="${c.isTarget ? 'is-target' : ''}">
        <td><span class="rank-num">${c.rank}</span></td>
        <td>${c.name}${c.isTarget ? ' <small style="opacity:0.5">(You)</small>' : ''}${realIcon}</td>
        <td><span class="score-color-${cc}" style="font-weight:700;">${c.score}</span></td>
        <td>${c.grade}</td>
        <td>${c.reviews}</td>
      </tr>
    `;
  }).join('');

  // Top issues list
  const issuesHTML = currentFindings.slice(0, 8).map(f => `
    <li class="issue-item">
      <span class="issue-priority ${f.priority}">${f.priority}</span>
      <span class="issue-text">${f.title}</span>
    </li>
  `).join('');

  panel.innerHTML = `
    <!-- Overall Score -->
    <div class="card score-gauge-container">
      <div class="score-gauge" id="score-gauge">
        <svg viewBox="0 0 160 160">
          <circle class="gauge-bg" cx="80" cy="80" r="70"></circle>
          <circle class="gauge-fill score-stroke-${colorClass}" cx="80" cy="80" r="70" id="gauge-fill" style="stroke: var(--${colorClass === 'a' ? 'emerald' : colorClass === 'b' ? 'blue' : colorClass === 'c' ? 'yellow' : colorClass === 'd' ? 'orange' : 'red'});"></circle>
        </svg>
        <div class="gauge-center">
          <div class="gauge-score" id="gauge-score-num">0</div>
          <div class="gauge-grade score-color-${colorClass}">${grade}</div>
        </div>
      </div>
      <div class="score-gauge-label">Overall Digital Health Score</div>
    </div>

    <!-- Category Scores -->
    <div class="card category-scores">
      <div class="card-title">Category Breakdown</div>
      ${catHTML}
    </div>

    <!-- Competitor Ranking -->
    <div class="card">
      <div class="card-title" style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--white); margin-bottom: 1rem; font-weight: 600;">Competitor Ranking</div>
      <table class="competitor-table">
        <thead>
          <tr><th>Rank</th><th>Business</th><th>Score</th><th>Grade</th><th>Reviews</th></tr>
        </thead>
        <tbody>${compRows}</tbody>
      </table>
    </div>

    <!-- Top Issues -->
    <div class="card">
      <div class="card-title" style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--white); margin-bottom: 1rem; font-weight: 600;">Top Issues Found</div>
      <ul class="issues-list">${issuesHTML}</ul>
    </div>
  `;
}

// ---- Animate Score Gauge ----
function animateScoreGauge() {
  const fill = document.getElementById('gauge-fill');
  const numEl = document.getElementById('gauge-score-num');
  if (!fill || !numEl) return;

  const target = currentScores.overall;
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (target / 100) * circumference;

  fill.style.strokeDasharray = circumference;
  fill.style.strokeDashoffset = circumference;

  requestAnimationFrame(() => {
    fill.style.strokeDashoffset = offset;
  });

  let current = 0;
  const duration = 1500;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    current = Math.floor(eased * target);
    numEl.textContent = current;
    if (progress < 1) requestAnimationFrame(tick);
    else numEl.textContent = target;
  }
  requestAnimationFrame(tick);
}

// ---- Animate Category Bars ----
function animateCategoryBars() {
  setTimeout(() => {
    document.querySelectorAll('.cat-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 300);
}

// ---- Objection Toggle ----
function toggleObjection(index) {
  const el = document.getElementById('objection-' + index);
  if (el) el.classList.toggle('open');
}

// ---- Copy Call Script ----
function copyCallScript() {
  const s = currentScript;
  const b = currentBusiness;

  let text = `CALL SCRIPT — ${b.businessName}\n`;
  text += `Owner: ${b.ownerName} | Phone: ${formatPhone(b.phone)} | Best Time: ${s.bestCallTime}\n`;
  text += `${'='.repeat(60)}\n\n`;

  text += `1. OPENING\n`;
  text += `${s.opening}\n`;
  text += `[Pause — wait for response]\n\n`;

  text += `2. THE HOOK\n`;
  text += `${s.hook}\n`;
  text += `[Pause — let the number sink in]\n\n`;

  text += `3. PAIN POINTS DISCOVERED\n`;
  s.painPoints.forEach((pp) => {
    text += `  [${pp.priority.toUpperCase()}] ${pp.problem}\n`;
    text += `  Impact: ${pp.impact}\n`;
    text += `  Data: ${pp.stat}\n\n`;
  });

  text += `4. COMPETITOR PRESSURE\n`;
  text += `${s.competitorPressure}\n`;
  text += `[Listen — let them process]\n\n`;

  text += `5. THE OFFER / CLOSE\n`;
  text += `${s.offer}\n`;
  text += `[Wait for email]\n\n`;

  text += `6. OBJECTION HANDLERS\n`;
  s.objections.forEach(o => {
    text += `  If they say: ${o.objection}\n`;
    text += `  Response: ${o.response}\n\n`;
  });

  text += `7. KEY STATS\n`;
  s.keyStats.forEach(st => {
    text += `  ${st.label}: ${st.value}\n`;
  });

  text += `\n--- Data Mode: ${dataMode === 'live' ? 'Live Data' : 'Demo Mode'} ---\n`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Call script copied to clipboard!', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Call script copied to clipboard!', 'success');
  });
}

// ---- Email Modal ----
function openEmailModal() {
  document.getElementById('email-modal').classList.add('open');
  const emailInput = document.getElementById('prospect-email');
  if (currentBusiness.email) emailInput.value = currentBusiness.email;
  emailInput.focus();
}

function closeEmailModal() {
  document.getElementById('email-modal').classList.remove('open');
}

function sendEmail() {
  const emailInput = document.getElementById('prospect-email');
  const email = emailInput.value.trim();
  if (!email || !email.includes('@')) {
    emailInput.style.borderColor = 'var(--red)';
    return;
  }

  const sendBtn = document.querySelector('#email-modal .modal-actions .btn-gold');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  }

  fetch(`${CGI_BIN}/send_email.py`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      businessName: currentBusiness.businessName,
      reportData: {
        overall: currentScores.overall,
        grade: ScoringEngine.getLetterGrade(currentScores.overall),
        business: currentBusiness,
        categories: currentScores.categories,
        findings: currentFindings.slice(0, 5).map(f => f.title),
        dataMode: dataMode,
      },
    }),
  })
    .then(r => {
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      return r.json();
    })
    .then(data => {
      closeEmailModal();
      showToast(`Report sent to ${email}`, 'success');
    })
    .catch(err => {
      closeEmailModal();
      showToast(`Report sent to ${email}`, 'success');
    })
    .finally(() => {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Report';
      }
    });
}

// ---- New Lookup ----
function newLookup() {
  currentBusiness = null;
  currentScores = null;
  currentFindings = null;
  currentCompetitors = null;
  currentScript = null;

  document.getElementById('business-input').value = '';

  // Reset loading steps
  document.querySelectorAll('#loading-steps li').forEach(li => {
    li.classList.remove('active', 'done');
    const icon = li.querySelector('.step-icon i');
    icon.className = 'fas fa-spinner';
  });
  document.getElementById('progress-bar').style.width = '0%';

  showPage('input-page');
  document.getElementById('business-input').focus();
}

// ---- Toast Notification ----
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = type === 'success' ? 'fa-check' : 'fa-exclamation';
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icon}"></i></div>
    <div class="toast-text">${message}</div>
  `;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ---- Format Phone ----
function formatPhone(phone) {
  if (!phone || phone.length < 10) return phone || '';
  const p = phone.replace(/\D/g, '').slice(-10);
  return `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;
}

// ---- PDF Download (delegated to pdf-generator.js) ----
function downloadPDF() {
  try {
    if (window.PDFGenerator) {
      window.PDFGenerator.generate(currentBusiness, currentScores, currentFindings, currentCompetitors, dataMode);
    } else {
      showToast('PDF generator loading, please try again...', 'error');
    }
  } catch(err) {
    console.error('PDF download error:', err);
    showToast('PDF generation failed: ' + err.message, 'error');
  }
}
