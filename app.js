// app.js (refactored, merged, with stricter "installed" checks)
// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function bindOnce(el, type, handler, options) {
  if (!el) return;
  const key = `__bound_${type}`;
  if (el[key]) return;
  el.addEventListener(type, handler, options);
  el[key] = true;
}

// ------------------------------------------------------------
// FAQ toggle functionality
// ------------------------------------------------------------
function initFaqToggles() {
  $$('.faq-question').forEach(question => {
    bindOnce(question, 'click', () => {
      const faqItem = question.parentElement;
      faqItem.classList.toggle('active');
    });
  });
}

// ------------------------------------------------------------
// Smooth scrolling for anchor links
// ------------------------------------------------------------
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(anchor => {
    bindOnce(anchor, 'click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 0;
      window.scrollTo({
        top: target.offsetTop - headerHeight - 20,
        behavior: 'smooth'
      });
    });
  });
}

// ------------------------------------------------------------
// Install Notification Logic
// ------------------------------------------------------------
let deferredPrompt;

/** Detect if PWA is installed (retained from your app.js) */
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone ||
    document.referrer.includes('android-app://');
}

function showInstallNotification(force = false) {
  const installNotification = $('#install-notification'); // index.html:contentReference[oaicite:0]{index=0}
  if (!installNotification) return;

  // Extra guards: never show if installed (session or persisted flag)
  if (isAppInstalled() || localStorage.getItem('pwa-installed') === 'true') return;

  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  const now = Date.now();
  // 30 minutes cool-down
  if (!force && dismissedTime && (now - parseInt(dismissedTime, 10) < 1800000)) {
    return;
  }

  installNotification.classList.add('show');
  // Auto hide after 30s
  setTimeout(() => installNotification.classList.remove('show'), 30000);
}

function initInstallPromptFlows() {
  const installNotification = $('#install-notification'); // index.html:contentReference[oaicite:1]{index=1}
  const installBtn = $('#install-btn');                   // index.html:contentReference[oaicite:2]{index=2}
  const laterBtn = $('#later-btn');
  const closeBtn = $('#close-install');

  // Show prompt later when browser fires it
  window.addEventListener('beforeinstallprompt', (e) => {
    // If installed, don’t capture or show anything
    if (isAppInstalled() || localStorage.getItem('pwa-installed') === 'true') return;
    e.preventDefault();
    deferredPrompt = e;
    // Nudge user after 30s if not installed yet
    setTimeout(() => { if (!isAppInstalled()) showInstallNotification(); }, 30000);
  });

  // Nudge on load if there's no deferred prompt and not installed
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!deferredPrompt && !isAppInstalled() && localStorage.getItem('pwa-installed') !== 'true') {
        showInstallNotification(true);
      }
    }, 5000);
  });

  // Primary action:
  // If not installed, our Get App UX may route to registration first (see initGetAppUX).
  // If installed or user proceeds, use native prompt where available.
  bindOnce(installBtn, 'click', async (e) => {
    if (isAppInstalled() || localStorage.getItem('pwa-installed') === 'true') {
      installNotification?.classList.remove('show');
      return;
    }
    if (!deferredPrompt) { 
      installNotification?.classList.remove('show'); 
      return; 
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      installNotification?.classList.remove('show');
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-install-accepted', Date.now().toString());
      }
    } catch {
      installNotification?.classList.remove('show');
    }
  });

  bindOnce(laterBtn, 'click', () => {
    installNotification?.classList.remove('show');
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed');
      if (!isAppInstalled() && localStorage.getItem('pwa-installed') !== 'true') {
        showInstallNotification(true);
      }
    }, 1800000); // 30 minutes
  });

  bindOnce(closeBtn, 'click', () => {
    installNotification?.classList.remove('show');
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  });

  // Persist installed state & hide banner immediately when installed
  window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwa-installed', 'true');
    $('#install-notification')?.classList.remove('show');
  });
}


// ------------------------------------------------------------
// Service Worker Registration with update handling (retained)
// ------------------------------------------------------------
function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      // Cache-busting query parameter
      const timestamp = Date.now();
      const registration = await navigator.serviceWorker.register(
        `/sw.js?version=${timestamp}`,
        { scope: '/' }
      );

      // Check for updates every 4 hours
      setInterval(() => registration.update(), 4 * 60 * 60 * 1000);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            showUpdateNotification();
          }
        });
      });
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  });

  // Force refresh when new SW takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// ------------------------------------------------------------
// Pricing Module (retained)
// ------------------------------------------------------------
function initPricingModule() {
  console.log('Command Results Pricing Module loaded');

  const pricingData = {
    online: {
      bvaApp: {
        monthly: {
          price: 0,
          link: "https://command-results.passion.io/checkout/99a47923-3170-4657-8fcf-0fdfad3d9393"
        },
        annual: {
          price: 0,
          link: "https://command-results.passion.io/checkout/769da188-59a6-47ee-ac6d-7c98a3732c7d"
        }
      },
      bvaWorkbooks: {
        monthly: {
          price: 47,
          link: "https://command-results.passion.io/checkout/99a47923-3170-4657-8fcf-0fdfad3d9393"
        },
        annual: {
          price: 497,
          link: "https://command-results.passion.io/checkout/769da188-59a6-47ee-ac6d-7c98a3732c7d"
        }
      }
    }
  };

  // Toggle elements
  const onlineToggle = $('#online-toggle');
  const monthlyLabelOnline = $('#monthly-label-online');
  const annualLabelOnline = $('#annual-label-online');
  const onlineDiscount = $('#online-discount');
  const bvaAppPrice = $('#bva-app-price');
  const bvaWorkbooksPrice = $('#bva-workbooks-price');
  const bvaAppTerms = $('#bva-app-terms');
  const bvaWorkbooksTerms = $('#bva-workbooks-terms');
  const bvaAppButton = $('#bva-app-enroll-button');
  const bvaWorkbooksButton = $('#bva-workbooks-enroll-button');

  if (!onlineToggle || !monthlyLabelOnline || !annualLabelOnline) return;

  let onlineIsAnnual = false;

  function updateOnlinePricing() {
    // If Lean-Agile Foundations (bvaApp) is free, reflect that explicitly
    const isBvaAppFreeMonthly = pricingData.online.bvaApp.monthly.price === 0;
    const isBvaAppFreeAnnual  = pricingData.online.bvaApp.annual.price === 0;
    
    const bvaAppPlan = onlineIsAnnual ? 'annual' : 'monthly';
    const bvaWorkbooksPlan = onlineIsAnnual ? 'annual' : 'monthly';

    if (onlineIsAnnual) {
      if (bvaAppPrice) bvaAppPrice.textContent = isBvaAppFreeAnnual ? 'Free' : `$${pricingData.online.bvaApp.annual.price} one-time payment`;
      if (bvaWorkbooksPrice) bvaWorkbooksPrice.textContent = `$${pricingData.online.bvaWorkbooks.annual.price} one-time payment`;

      if (bvaAppTerms) {
  if ((onlineIsAnnual && isBvaAppFreeAnnual) || (!onlineIsAnnual && isBvaAppFreeMonthly)) {
    bvaAppTerms.innerHTML = `
      <ul>
        <li>Certificate of Completion included</li>
        <li>No credit card required</li>
        <li>Cancel any time</li>
      </ul>
    `;
  } else {
    bvaAppTerms.innerHTML = `
      <ul>
        <li>Pay one-time fee and save nearly $70 compared to monthly billing</li>
        <li>Cancel any time in the first 30 days</li>
      </ul>
    `;
  }
}

      if (bvaWorkbooksTerms) {
        bvaWorkbooksTerms.innerHTML = `
          <ul>
            <li>Pay one-time fee and save nearly $70 compared to monthly billing</li>
            <li>Cancel any time in the first 30 days</li>
          </ul>
        `;
      }
    } else {
      if (bvaAppPrice) bvaAppPrice.textContent = isBvaAppFreeMonthly ? 'Free' : `$${pricingData.online.bvaApp.monthly.price}/month`;
      if (bvaWorkbooksPrice) bvaWorkbooksPrice.textContent = `$${pricingData.online.bvaWorkbooks.monthly.price}/month`;

      if (bvaAppTerms) {
  if ((onlineIsAnnual && isBvaAppFreeAnnual) || (!onlineIsAnnual && isBvaAppFreeMonthly)) {
    bvaAppTerms.innerHTML = `
      <ul>
        <li>Certificate of Completion included</li>
        <li>No credit card required</li>
        <li>Cancel any time</li>
      </ul>
    `;
  } else {
    bvaAppTerms.innerHTML = `
      <ul>
        <li>Pay one-time fee and save nearly $70 compared to monthly billing</li>
        <li>Cancel any time in the first 30 days</li>
      </ul>
    `;
  }
}

      if (bvaWorkbooksTerms) {
        bvaWorkbooksTerms.innerHTML = `
          <ul>
            <li>Billed monthly for 12 months</li>
            <li>Continued access after the first year requires an 18% annual maintenance fee</li>
            <li>Cancel any time in the first 30 days</li>
          </ul>
        `;
      }
    }

    if (bvaAppButton) bvaAppButton.href = pricingData.online.bvaApp[bvaAppPlan].link;
    if (bvaWorkbooksButton) bvaWorkbooksButton.href = pricingData.online.bvaWorkbooks[bvaWorkbooksPlan].link;

        if (bvaAppButton) bvaAppButton.dataset.installedHref = pricingData.online.bvaApp[bvaAppPlan].link;
    if (bvaWorkbooksButton) bvaWorkbooksButton.dataset.installedHref = pricingData.online.bvaWorkbooks[bvaWorkbooksPlan].link;
// Protect pricing CTA destinations based on install state
    wireProtectedLink(bvaAppButton, { whenInstalled: PASSION_APP_URL, whenNotInstalled: '/registration.html', changeLabel: true });
    wireProtectedLink(bvaWorkbooksButton, { whenNotInstalled: '/registration.html', changeLabel: true, respectCurrentHref: true });


    if (onlineIsAnnual) {
      if (onlineDiscount) onlineDiscount.style.display = 'inline';
      monthlyLabelOnline.classList.remove('active');
      annualLabelOnline.classList.add('active');
      onlineToggle.classList.add('annual');
    } else {
      if (onlineDiscount) onlineDiscount.style.display = 'none';
      monthlyLabelOnline.classList.add('active');
      annualLabelOnline.classList.remove('active');
      onlineToggle.classList.remove('annual');
    }
  }

  bindOnce(onlineToggle, 'click', () => {
    onlineIsAnnual = !onlineIsAnnual;
    updateOnlinePricing();
  });

  bindOnce(monthlyLabelOnline, 'click', () => {
    if (onlineIsAnnual) {
      onlineIsAnnual = false;
      updateOnlinePricing();
    }
  });

  bindOnce(annualLabelOnline, 'click', () => {
    if (!onlineIsAnnual) {
      onlineIsAnnual = true;
      updateOnlinePricing();
    }
  });

  updateOnlinePricing();
}

// ------------------------------------------------------------
// Newsletter form submission (retained)
// ------------------------------------------------------------
function initNewsletter() {
  const newsletterForm = $('#newsletterForm');
  if (!newsletterForm) return;

  bindOnce(newsletterForm, 'submit', (e) => {
    e.preventDefault();
    alert("Thank you for subscribing!");
    newsletterForm.reset();
  });
}

// ------------------------------------------------------------

// ------------------------------------------------------------
// Routing helper: registration vs Passion.io
// ------------------------------------------------------------
const PASSION_APP_URL = 'https://command-results.passion.io';

function wireProtectedLink(el, { whenInstalled = PASSION_APP_URL, whenNotInstalled = '/registration.html', changeLabel = true, respectCurrentHref = false } = {}) {
  if (!el) return;
  // Update href immediately for hover/long-press previews
  if (isAppInstalled()) {
    if (!respectCurrentHref) el.href = whenInstalled;
  } else {
    el.href = whenNotInstalled;
  }

  if (changeLabel) {
    if (isAppInstalled()) {
      // Prefer an "Open App" affordance when installed
      el.innerHTML = el.innerHTML.replace(/Register|Get App|Get Program|Get Started Free/i, 'Open App');
    } else {
      // Show registration intent
      if (!/Register/i.test(el.innerText)) {
        el.innerHTML = '<i class="fas fa-user-plus"></i> Register';
      }
    }
  }

  bindOnce(el, 'click', (e) => {
    // Always hard-route based on current install state
    e.preventDefault();
    const installedTarget = respectCurrentHref ? (el.dataset.installedHref || el.href) : whenInstalled;
    window.location.href = isAppInstalled() ? installedTarget : whenNotInstalled;
  }, { capture: true });

  // Re-wire after appinstallation event
  window.addEventListener('appinstalled', () => {
    el.href = respectCurrentHref ? (el.dataset.installedHref || el.href) : whenInstalled;
    if (changeLabel) el.innerHTML = el.innerHTML.replace(/Register|Get App|Get Program|Get Started Free/i, 'Open App');
  });
}

// Get App UX: label swap + routing to registration (UPDATED)
// ------------------------------------------------------------
const GET_APP_SELECTORS = ['#hero-free-app-button', '#final-free-app-button'];

function initGetAppUX() {
  const heroBtn  = $('#hero-free-app-button');     // Hero CTA button:contentReference[oaicite:3]{index=3}
  const finalBtn = $('#final-free-app-button');    // Final CTA button:contentReference[oaicite:4]{index=4}
  const installPopupBtn = $('#install-btn');       // Install popup button:contentReference[oaicite:5]{index=5}
  const headerAuthBtn = $('#auth-button');         // Header "Log In" button:contentReference[oaicite:6]{index=6}

  // Save original content & links to restore later
  const originals = {
    hero:  heroBtn  ? heroBtn.innerHTML  : null,
    final: finalBtn ? finalBtn.innerHTML : null,
    install: installPopupBtn ? installPopupBtn.innerHTML : null,
    auth: headerAuthBtn ? headerAuthBtn.innerHTML : null,
    authHref: headerAuthBtn ? headerAuthBtn.href : null
  };
  // Route primary CTAs depending on install state
  wireProtectedLink(heroBtn,  { whenInstalled: PASSION_APP_URL, whenNotInstalled: '/registration.html' });
  wireProtectedLink(finalBtn, { whenInstalled: PASSION_APP_URL, whenNotInstalled: '/registration.html' });
  wireProtectedLink(installPopupBtn, { whenInstalled: PASSION_APP_URL, whenNotInstalled: '/registration.html', changeLabel: false });


  function applyNotInstalledState() {
    // Change labels
    if (heroBtn)  heroBtn.innerHTML  = '<i class="fas fa-user-plus"></i> Register';
    if (finalBtn) finalBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
    if (installPopupBtn) installPopupBtn.textContent = 'Register';
    if (headerAuthBtn) {
      headerAuthBtn.innerHTML = 'Register';
      headerAuthBtn.href = '/registration.html';
    }

    // Intercept hero & final CTAs to go to registration page
    [heroBtn, finalBtn].forEach(a => {
      if (!a) return;
      bindOnce(a, 'click', (e) => {
        if (!isAppInstalled()) {
          e.preventDefault();
          window.location.href = '/registration.html';
        }
      }, { capture: true });
    });

    // Intercept install popup button to registration (install flow handled elsewhere)
    bindOnce(installPopupBtn, 'click', (e) => {
      if (!isAppInstalled()) {
        e.preventDefault();
        const notif = $('#install-notification');
        if (notif) notif.classList.remove('show');
        window.location.href = '/registration.html';
      }
    }, { capture: true });
  }

  function applyInstalledState() {
    // Restore labels & links
    if (heroBtn && originals.hero)   heroBtn.innerHTML = originals.hero;
    if (finalBtn && originals.final) finalBtn.innerHTML = originals.final;
    if (installPopupBtn && originals.install) installPopupBtn.innerHTML = originals.install;
    if (headerAuthBtn && originals.auth) {
      headerAuthBtn.innerHTML = originals.auth;
      headerAuthBtn.href = originals.authHref || 'https://command-results.passion.io/login';
    }
  }

  // Apply initial state
  if (!isAppInstalled()) {
    applyNotInstalledState();
  }

  // Restore state dynamically if PWA gets installed
  window.addEventListener('appinstalled', applyInstalledState);
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initFaqToggles();
  initSmoothScroll();
  initInstallPromptFlows();
  initServiceWorker();
  initPricingModule();
  initNewsletter();
  initGetAppUX();
});


/* ==============================
   Analytics: GA4 + LinkedIn tracking
   ============================== */
(function() {
  function onReady(fn){ if(document.readyState!=='loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); }}

  // Helper: GA4
  function trackGA(eventName, params){
    try {
      if (window.gtag) { window.gtag('event', eventName, params || {}); }
    } catch(e){ /* no-op */ }
  }

  // Helper: LinkedIn (requires configured conversion_id in Campaign Manager)
  const LI_CONVERSIONS = {
    app_click: null,            // e.g., "1234567"
    trial_click: null,          // e.g., "2345678"
    purchase_click: null,       // e.g., "3456789"
    outbound_click: null,       // optional
    registration_submit: null,  // optional
    registration_complete: null // optional
  };
  function trackLI(key){
    try {
      if (window.lintrk && LI_CONVERSIONS[key]) {
        window.lintrk('track', { conversion_id: LI_CONVERSIONS[key] });
      }
    } catch(e){ /* no-op */ }
  }

  // Attach handlers
  onReady(function(){
    // CTA buttons
    var appBtn = document.getElementById('app-btn');
    var trialBtn = document.getElementById('trial-btn');
    var purchaseBtn = document.getElementById('purchase-btn');

    function attachClick(el, id, label){
      if(!el) return;
      el.addEventListener('click', function(e){
        var href = el.getAttribute('href') || '';
        trackGA('cta_click', {
          cta_id: id,
          cta_label: label,
          destination_url: href,
          event_category: 'engagement',
          event_label: label
        });
        // LinkedIn (if conversion IDs are configured)
        if (id === 'app_btn') trackLI('app_click');
        if (id === 'trial_btn') trackLI('trial_click');
        if (id === 'purchase_btn') trackLI('purchase_click');
      }, { passive: true });
    }

    attachClick(appBtn, 'app_btn', 'App');
    attachClick(trialBtn, 'trial_btn', 'Free Trial');
    attachClick(purchaseBtn, 'purchase_btn', 'Purchase');

    // Sitewide outbound link tracking
    document.addEventListener('click', function(ev){
      var a = ev.target.closest && ev.target.closest('a[href]');
      if(!a) return;
      var url;
      try { url = new URL(a.href, window.location.href); } catch(e){ return; }
      if (url.host && url.host !== window.location.host) {
        trackGA('outbound_click', {
          link_url: url.href,
          link_text: (a.textContent || '').trim().slice(0,120),
          link_host: url.host
        });
        trackLI('outbound_click');
      }
    }, { capture: true, passive: true });

    // Registration page hooks (if present in this build)
    // Fire on submit and on success redirect (?registered=1)
    var regForm = document.querySelector('form#registration-form, form[data-analytics="registration"]');
    if (regForm) {
      regForm.addEventListener('submit', function(){
        trackGA('registration_submit', { form_id: regForm.id || 'registration-form' });
        trackLI('registration_submit');
      }, { passive: true });
    }
    var usp = new URLSearchParams(window.location.search);
    if (usp.get('registered') === '1' || document.body.getAttribute('data-registered') === 'true') {
      trackGA('registration_complete', {});
      trackLI('registration_complete');
    }
  });
})();


// Sticky nav dropdown toggle + analytics
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    var toggle = document.getElementById('nav-dropdown-toggle');
    var menu   = document.getElementById('nav-dropdown-menu');
    if (!toggle || !menu) return;

    function closeMenu(){ menu.classList.remove('show'); toggle.setAttribute('aria-expanded','false'); menu.setAttribute('aria-hidden','true'); }
    function openMenu(){  menu.classList.add('show');    toggle.setAttribute('aria-expanded','true');  menu.setAttribute('aria-hidden','false'); }

    toggle.addEventListener('click', function(e){
      e.preventDefault();
      if (menu.classList.contains('show')) closeMenu(); else openMenu();
    }, { passive: false });

    document.addEventListener('click', function(e){
      if (!menu.contains(e.target) && e.target !== toggle) closeMenu();
    }, { capture: true });

    // Analytics for nav dropdown links
    function trackNav(id, label, href){
      try { if (window.gtag) gtag('event','nav_dropdown_click',{cta_id:id, cta_label:label, destination_url:href}); } catch(e){}
      try { if (window.lintrk && window.LI_CONVERSIONS && window.LI_CONVERSIONS[id]) lintrk('track', {conversion_id: window.LI_CONVERSIONS[id]}); } catch(e){}
    }
    [['nav-app-link','App'],['nav-trial-link','Free Trial'],['nav-purchase-link','Purchase']].forEach(function(pair){
      var el = document.getElementById(pair[0]);
      if (!el) return;
      el.addEventListener('click', function(){
        trackNav(pair[0], pair[1], el.href);
      }, { passive: true });
    });
  });
})();
// ---------------- Reviewer Card + Install Gate (Vercel Option 2) ----------------

// Reveal card only in preview (approval flow) until you remove the hidden attribute
(function revealReviewerCardForPreview(){
  const card = document.getElementById('reviewerCard');
  if (!card) return;
  const qp = new URLSearchParams(location.search);
  if (qp.get('reviewerPreview') === '1') {
    card.hidden = false;
    try { localStorage.setItem('cr.reviewerPreview', '1'); } catch(e){}
  } else if (localStorage.getItem('cr.reviewerPreview') === '1') {
    card.hidden = false;
  }
})();

function isPWAInstalled(){
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.navigator.standalone === true) return true; // iOS Safari
    if (document.referrer && document.referrer.startsWith('android-app://')) return true;
    if (localStorage.getItem('pwa-installed') === '1' || localStorage.getItem('cr.pwaInstalled') === '1') return true;
  } catch(e){}
  return false;
}

(function wireReviewerForm(){
  const form = document.getElementById('reviewerForm');
  const tokenInput = document.getElementById('reviewerTokenInput');
  const btn = document.getElementById('reviewerContinueBtn');
  const msg = document.getElementById('reviewerMsg');
  if (!form || !tokenInput || !btn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = tokenInput.value.trim();
    if (!token) {
      msg.textContent = 'Please enter your reviewer token.';
      tokenInput.focus();
      return;
    }
    // Not installed? Show install gate first
    if (!isPWAInstalled()) {
      openInstallGate(async () => {
        // On continue after install
        await verifyAndRedirect(token, msg, btn);
      });
      return;
    }
    await verifyAndRedirect(token, msg, btn);
  });
})();

async function verifyAndRedirect(token, msgEl, btnEl){
  try {
    btnEl.disabled = true;
    msgEl.textContent = 'Validating token…';
  } catch(e){}

  let resp;
  try {
    resp = await fetch('/api/reviewer/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
  } catch(err) {
    msgEl.textContent = 'Network error. Please try again.';
    btnEl.disabled = false;
    return;
  }

  if (!resp.ok) {
    const data = await resp.json().catch(()=> ({}));
    msgEl.textContent = data?.error || 'Invalid or expired token.';
    btnEl.disabled = false;
    return;
  }

  const data = await resp.json().catch(()=> ({}));
  if (data?.ok && data?.url) {
    msgEl.textContent = 'Token accepted. Redirecting…';
    window.location.href = data.url;
    return;
  }
  msgEl.textContent = 'Unexpected response. Please try again.';
  btnEl.disabled = false;
}

// ----- Install Gate Modal -----
function openInstallGate(onContinue){
  const modal = document.getElementById('installGate');
  const continueBtn = document.getElementById('installContinueBtn');
  const closeBtn = document.getElementById('installCloseBtn');
  const hint = document.getElementById('installHint');
  if (!modal || !continueBtn) return;

  function close(){
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('cr-modal-open');
    modal.removeEventListener('click', backdropHandler);
    continueBtn.removeEventListener('click', handleContinue);
    closeBtn?.removeEventListener('click', handleCloseBtn);
  }
  function backdropHandler(ev){
    if (ev.target && ev.target.hasAttribute('data-close-modal')) close();
  }
  function handleCloseBtn(){ close(); }
  function handleContinue(){
    if (isPWAInstalled()) {
      close();
      onContinue && onContinue();
    } else {
      if (hint) hint.textContent = 'Still not installed. Install the app, then tap “I’ve installed — continue”.';
    }
  }

  modal.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('cr-modal-open');
  hint && (hint.textContent = '');
  modal.addEventListener('click', backdropHandler);
  continueBtn.addEventListener('click', handleContinue);
  closeBtn?.addEventListener('click', handleCloseBtn);
}

(function(){
  const qs = new URLSearchParams(location.search);
  const preview = qs.get('reviewerPreview') === '1' || localStorage.getItem('reviewerPreview') === '1';

  if (preview) {
    localStorage.setItem('reviewerPreview', '1');
    const card = document.getElementById('reviewerCard');
    if (card) card.hidden = false;
  }

  const form = document.getElementById('reviewerForm');
  const input = document.getElementById('reviewerTokenInput');
  const msg = document.getElementById('reviewerMsg');
  const btn = document.getElementById('reviewerContinueBtn');

  if (!form) return;

  const SUCCESS_REDIRECT_DELAY = 300;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();
    const raw = (input.value || '').trim();
    if (!raw) {
      showMsg('Please enter your reviewer token.');
      input.focus();
      return;
    }

    setBusy(true);
    try {
      const resp = await fetch('/api/reviewer/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: raw })
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data) {
        showMsg(data && data.error ? data.error : 'Token lookup failed.');
        setBusy(false);
        return;
      }

      if (data.ok && data.url) {
        showMsg('Success! Redirecting…');
        setTimeout(() => { location.href = data.url; }, SUCCESS_REDIRECT_DELAY);
      } else {
        showMsg(data.error || 'Invalid or expired token.');
      }
    } catch (err) {
      showMsg('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  });

  function showMsg(t){ if (msg) { msg.textContent = t; msg.style.visibility='visible'; } }
  function clearMsg(){ if (msg) { msg.textContent = ''; msg.style.visibility='hidden'; } }
  function setBusy(b){
    if (btn) { btn.disabled = b; btn.setAttribute('aria-busy', String(b)); }
    if (input) input.disabled = b;
  }
})();
