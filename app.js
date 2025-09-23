// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function bindOnce(el, type, handler, options = { once: true }) {
  if (!el) return;
  const key = `__bound_${type}`;
  if (el[key]) return;
  el.addEventListener(type, handler, options);
  el[key] = true;
}

function withParam(url, key, val) {
  const u = new URL(url, window.location.href);
  u.searchParams.set(key, String(val));
  return u.toString();
}

function setScrollLock(locked) {
  const cls = 'cr-modal-open';
  document.documentElement.classList.toggle(cls, locked);
  document.body.classList.toggle(cls, locked);
}

// ------------------------------------------------------------
// FAQ Toggle Functionality
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
// Smooth Scrolling for Anchor Links
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
function isAppInstalled() {
  try {
    const inStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = ('standalone' in navigator) ? navigator.standalone === true : false;
    const androidReferrer = (document.referrer || '').startsWith('android-app://');
    // Do NOT rely on localStorage flags for gating UI
    return !!(inStandalone || iosStandalone || androidReferrer);
  } catch {
    return false;
  }
}


function showInstallNotification(force = false) {
  const installNotification = $('#install-notification');
  if (!installNotification) return;

  if (isAppInstalled() || localStorage.getItem('pwa-installed') === 'true') return;

  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  const now = Date.now();
  if (!force && dismissedTime && (now - parseInt(dismissedTime, 10) < 1800000)) return;

  installNotification.classList.add('show');
  setTimeout(() => installNotification.classList.remove('show'), 30000);
}

function initInstallPromptFlows() {
  const installNotification = $('#install-notification');
  const installBtn = $('#install-btn');
  const laterBtn = $('#later-btn');
  const closeBtn = $('#close-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    if (isAppInstalled() || localStorage.getItem('pwa-installed') === 'true') return;
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => { if (!isAppInstalled()) showInstallNotification(); }, 30000);
  });

  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!deferredPrompt && !isAppInstalled() && localStorage.getItem('pwa-installed') !== 'true') {
        showInstallNotification(true);
      }
    }, 5000);
  });

  bindOnce(installBtn, 'click', async () => {
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
    }, 1800000);
  });

  bindOnce(closeBtn, 'click', () => {
    installNotification?.classList.remove('show');
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  });

  window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwa-installed', 'true');
    $('#install-notification')?.classList.remove('show');
  });
}

// ------------------------------------------------------------
// Service Worker Registration
// ------------------------------------------------------------
function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const timestamp = Date.now();
      const registration = await navigator.serviceWorker.register(
        `/sw.js?version=${timestamp}`,
        { scope: '/' }
      );

      setInterval(() => registration.update(), 4 * 60 * 60 * 1000);

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

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initFaqToggles();
  initSmoothScroll();
  initInstallPromptFlows();
  initServiceWorker();
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
    [['nav-bva-program-app-link','BVA Program App'],['nav-app-link','App'],['nav-trial-link','Free Trial'],['nav-purchase-link','Purchase']].forEach(function(pair){
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


/* ===== Enhancements: console logging + scorecard gating ===== */

// logging helper
function __log(...args){ try { console.log('[Mailchimp]', ...args); } catch(_){} }

// global flag for scorecard gating
window.__scorecardSubscribed = window.__scorecardSubscribed || false;
let __deferredNavHref = null;

// Intercept clicks on anything that should be gated until subscription
document.addEventListener('click', (e) => {
  const gateEl = e.target && e.target.closest && e.target.closest('[data-gate="scorecard-results"]');
  if (!gateEl) return;
  if (!window.__scorecardSubscribed) {
    e.preventDefault();
    // remember target href if it's a link
    if (gateEl.tagName === 'A' && gateEl.href) {
      __deferredNavHref = gateEl.href;
    }
    // nudge user to the scorecard form
    const form = document.getElementById('scorecard-form') ||
                 document.querySelector('form[data-mailchimp="scorecard"]') ||
                 document.querySelector('#scorecard form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const status = document.getElementById('scorecard-status') ||
                     form.querySelector('[data-status]') ||
                     form.querySelector('[role="status"]');
      if (status) status.textContent = 'Please subscribe to receive your results.';
    }
  }
});

// Expose an optional function quiz code can call to force-check the gate
window.requireScorecardSubscription = function() {
  if (!window.__scorecardSubscribed) {
    const evt = new Event('click', { bubbles: true });
    const fake = document.createElement('div');
    fake.setAttribute('data-gate','scorecard-results');
    document.body.appendChild(fake);
    fake.dispatchEvent(evt);
    fake.remove();
    return false;
  }
  return true;
};

// Patch into existing handlers if present (from earlier flexible wiring)
(function patchMailchimpHandlers(){
  const oldNewsletter = typeof __attachNewsletterHandler === 'function' ? __attachNewsletterHandler : null;
  const oldScorecard = typeof __attachScorecardHandler === 'function' ? __attachScorecardHandler : null;

  if (oldNewsletter) {
    const orig = oldNewsletter;
    __attachNewsletterHandler = function(){
      __log('attaching newsletter handler…');
      return orig.apply(this, arguments);
    };
  }
  if (oldScorecard) {
    const orig = oldScorecard;
    __attachScorecardHandler = function(){
      __log('attaching scorecard handler…');
      // wrap the submit success path by monkey-patching __postJSON result handling later if needed
      return orig.apply(this, arguments);
    };
  }
})();

/* ===== Mailchimp wiring + quiz gate (append-only, CSS-safe) ===== */

// Fallback for PWA update UI if your page hasn't defined one.
if (typeof window.showUpdateNotification !== 'function') {
  window.showUpdateNotification = function () {
    console.info('[PWA] Update available.');
    try { var n = document.getElementById('update-notification'); if (n) n.hidden = false; } catch (e) {}
  };
}

// Simple JSON POST helper
async function __postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data), credentials: 'same-origin'
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { message: text }; }
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

// Read value from form by common names or a fallback selector
function __read(form, names, fallbackSel) {
  for (const n of names) {
    const el = form.querySelector(`[name="${n}"]`);
    if (el && 'value' in el) return el.value;
  }
  if (fallbackSel) {
    const el = form.querySelector(fallbackSel);
    if (el && 'value' in el) return el.value;
  }
  return '';
}
// ID fallbacks to match your existing markup without changing CSS
function __readByIds(form, ids) {
  for (const id of ids) {
    const el = form.querySelector('#' + id);
    if (el && 'value' in el && String(el.value).trim()) return el.value;
  }
  return '';
}
function __checked(form, names, idFallbacks=[]) {
  for (const n of names) {
    const el = form.querySelector(`[name="${n}"]`);
    if (el && 'checked' in el) return !!el.checked;
  }
  for (const id of idFallbacks) {
    const el = form.querySelector('#' + id);
    if (el && 'checked' in el) return !!el.checked;
  }
  const el = form.querySelector('[data-field="consent"]');
  if (el && 'checked' in el) return !!el.checked;
  return false;
}

function __wireForm({ scope, id, dataAttr, statusSel, tag }) {
  let form = null;
  if (id) form = document.getElementById(id);
  if (!form && dataAttr) form = document.querySelector(`form[${dataAttr}]`);
  if (!form && scope) {
    const s = document.querySelector(scope);
    if (s) form = s.querySelector('form');
  }
  if (!form || form.__wired_mailchimp) return;
  form.__wired_mailchimp = true;

  const status = statusSel ? document.querySelector(statusSel) : (form.querySelector('[role="status"]') || null);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) status.textContent = 'Submitting…';

    // Flexible mapping (names, data-field, types) + ID fallbacks to your current markup
    const email    = (__read(form, ['email','EMAIL'], 'input[type="email"], [data-field="email"]') || __readByIds(form, ['newsletterEmail','scorecardEmail'])) .trim().toLowerCase();
    const fname    = (__read(form, ['fname','FNAME'], '[data-field="fname"]') || __readByIds(form, ['newsletterName','scorecardName'])) .trim();
    const lname    = (__read(form, ['lname','LNAME'], '[data-field="lname"]') || __readByIds(form, ['newsletterLastName','scorecardLastName'])) .trim();
    const jobtitle = (__read(form, ['jobtitle','JOBTITLE','title'], '[data-field="jobtitle"]') || __readByIds(form, ['newsletterJobTitle','scorecardJobTitle'])) .trim();
    const company  = (__read(form, ['company','COMPANY'], '[data-field="company"]') || __readByIds(form, ['newsletterCompany','scorecardCompany'])) .trim();
    const phone    = (__read(form, ['phone','PHONE'], 'input[type="tel"], [data-field="phone"]') || __readByIds(form, ['newsletterPhone','scorecardPhone'])) .trim();
    const consent  = __checked(form, ['consent','CONSENT'], ['consentCheckbox','scorecardConsent']);

    if (!email || !consent || !lname || !jobtitle) {
      if (status) status.textContent = 'Please enter email, last name, job title, and accept the privacy policy.';
      return;
    }

    try {
      await __postJSON('/api/subscribe', {
        source: tag.toLowerCase(),
        email, fname, lname, jobtitle, company, phone, consent,
        tags: [tag]
      });

      if (tag === 'Scorecard') {
        window.__scorecardSubscribed = true;
        if (status) status.textContent = 'Almost done! Please confirm via the email we just sent.';
        if (window.__deferredNavHref) {
          const href = window.__deferredNavHref; window.__deferredNavHref = null;
          setTimeout(() => location.href = href, 250);
        }
      } else {
        if (status) status.textContent = 'Check your inbox to confirm your subscription.';
      }

      // Optional: reset non-critical fields
      // form.reset();
    } catch (err) {
      if (status) status.textContent = `Oops: ${err.message}`;
      console.error('[Mailchimp] error', err);
    }
  });
}

(function(){
  const run = () => {
    // Newsletter: #newsletterForm OR any form with data-mailchimp="newsletter" OR a form inside #newsletter
    __wireForm({ scope: '#newsletter', id: 'newsletterForm', dataAttr: 'data-mailchimp="newsletter"', statusSel: '#newsletter-status', tag: 'Newsletter - PWA' });
    // Scorecard: #scorecardForm OR any form with data-mailchimp="scorecard" OR a form inside #scorecard
    __wireForm({ scope: '#scorecard', id: 'scorecardForm', dataAttr: 'data-mailchimp="scorecard"', statusSel: '#scorecard-status', tag: 'Scorecard - PWA' });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else run();
})();

/* ===== Results Gate ===== */
window.__scorecardSubscribed = window.__scorecardSubscribed || false;
window.__deferredNavHref = null;

// Gate clicks on anything marked as "show results" until scorecard subscribe succeeds
document.addEventListener('click', (e) => {
  const gateEl = e.target && e.target.closest && e.target.closest('[data-gate="scorecard-results"]');
  if (!gateEl) return;
  if (window.__scorecardSubscribed) return; // already allowed
  e.preventDefault();
  if (gateEl.tagName === 'A' && gateEl.href) window.__deferredNavHref = gateEl.href;

  // Nudge user to the scorecard form
  const form = document.getElementById('scorecardForm') ||
               document.querySelector('form[data-mailchimp="scorecard"]') ||
               document.querySelector('#scorecard form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const status = document.querySelector('#scorecard-status') ||
                   form.querySelector('[data-status]') ||
                   form.querySelector('[role="status"]');
    if (status) status.textContent = 'Please subscribe to receive your results.';
  }
});

// If your quiz renders results inline (no link), call this at the top:
window.requireScorecardSubscription = function() {
  if (window.__scorecardSubscribed) return true;
  // Trigger the same nudge as clicking a gated element
  const fake = document.createElement('a'); fake.setAttribute('data-gate', 'scorecard-results');
  const evt = new Event('click', { bubbles: true, cancelable: true });
  fake.dispatchEvent(evt);
  return false;
};
/* ===== DEBUG + INSTALL + GATE FIXES (append-only) ===== */

// 0) Debug toggle
window.__mailchimpDebug = true;
function __dbg(...a){ if (window.__mailchimpDebug && console && console.log) console.log('[CR]', ...a); }

// 1) Loud diagnostics for Newsletter/Scorecard wiring
(function(){
  const nl = document.getElementById('newsletterForm') || document.querySelector('form[data-mailchimp="newsletter"]') || document.querySelector('#newsletter form');
  const sc = document.getElementById('scorecardForm')  || document.querySelector('form[data-mailchimp="scorecard"]') || document.querySelector('#scorecard form');
  __dbg('newsletter form:', !!nl, nl);
  __dbg('scorecard form:', !!sc, sc);

  function val(form, sel){ const el = sel && form && form.querySelector(sel); return el && 'value' in el ? el.value : undefined; }
  if (nl) {
    __dbg('newsletter fields snapshot', {
      email: val(nl, 'input[type="email"]') || val(nl,'[name="email"]') || (nl.querySelector('#newsletterEmail')||{}).value,
      lname: val(nl, '[name="lname"]') || (nl.querySelector('#newsletterLastName')||{}).value,
      jobtitle: val(nl, '[name="jobtitle"]') || (nl.querySelector('#newsletterJobTitle')||{}).value,
      consent: !!(nl.querySelector('[name="consent"]') || document.getElementById('consentCheckbox'))?.checked
    });
  }
  if (sc) {
    __dbg('scorecard fields snapshot', {
      email: val(sc, 'input[type="email"]') || val(sc,'[name="email"]') || (sc.querySelector('#scorecardEmail')||{}).value,
      lname: val(sc, '[name="lname"]') || (sc.querySelector('#scorecardLastName')||{}).value,
      jobtitle: val(sc, '[name="jobtitle"]') || (sc.querySelector('#scorecardJobTitle')||{}).value,
      consent: !!(sc.querySelector('[name="consent"]') || document.getElementById('scorecardConsent'))?.checked
    });
  }
})();

// 2) Make submission logs obvious (wrap fetch)
(function(){
  const _post = (typeof __postJSON === 'function') ? __postJSON : null;
  if (!_post) { __dbg('WARN: __postJSON not found; Mailchimp wiring may not be loaded yet.'); return; }

  // Monkey-patch to add loud logs
  window.__postJSON = async function(url, data){
    __dbg('POST', url, { ...data, email: (data.email||'').replace(/(.{2}).+(@.*)/,'$1***$2') });
    try {
      const out = await _post(url, data);
      __dbg('POST OK', url, out);
      return out;
    } catch (e) {
      __dbg('POST FAIL', url, e?.message || e);
      throw e;
    }
  };
})();

// 3) Results gate (ensure it’s loud)
window.__scorecardSubscribed = window.__scorecardSubscribed || false;
window.__deferredNavHref = window.__deferredNavHref || null;

document.addEventListener('click', (e) => {
  const gateEl = e.target?.closest?.('[data-gate="scorecard-results"]');
  if (!gateEl) return;
  __dbg('gate clicked; subscribed?', window.__scorecardSubscribed);
  if (window.__scorecardSubscribed) return;
  e.preventDefault();
  if (gateEl.tagName === 'A' && gateEl.href) window.__deferredNavHref = gateEl.href;
  const form = document.getElementById('scorecardForm')
           || document.querySelector('form[data-mailchimp="scorecard"]')
           || document.querySelector('#scorecard form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const status = document.querySelector('#scorecard-status')
               || form.querySelector('[data-status]')
               || form.querySelector('[role="status"]');
    if (status) status.textContent = 'Please subscribe to receive your results.';
  }
});

window.requireScorecardSubscription = function(){
  __dbg('requireScorecardSubscription', window.__scorecardSubscribed);
  if (window.__scorecardSubscribed) return true;
  // emulate click on a gated thing to show the nudge
  const fake = document.createElement('a');
  fake.setAttribute('data-gate','scorecard-results');
  const ev = new Event('click', { bubbles: true, cancelable: true });
  fake.dispatchEvent(ev);
  return false;
};

// 4) PWA install flow — fix "preventDefault() called" warning by exposing a proper prompt()
(function(){
  let deferredPrompt = null;
  const findTrigger = () => document.querySelector('[data-install-trigger]') || document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // You likely call preventDefault elsewhere; do it here and store the event
    e.preventDefault();
    deferredPrompt = e;
    __dbg('[PWA] beforeinstallprompt captured. Waiting for user gesture to call prompt().');
    const btn = findTrigger();
    if (btn) { btn.hidden = false; btn.style.display = ''; }
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target?.closest?.('[data-install-trigger], #installBtn');
    if (!btn) return;
    if (!deferredPrompt) { __dbg('[PWA] No install prompt available yet.'); return; }
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      __dbg('[PWA] install outcome:', choice && choice.outcome);
      deferredPrompt = null;
    } catch (err) {
      __dbg('[PWA] prompt() error:', err?.message || err);
      deferredPrompt = null;
    }
  });

  window.addEventListener('appinstalled', () => {
    __dbg('[PWA] App installed.');
    const btn = findTrigger();
    if (btn) btn.style.display = 'none';
  });
})();
// ------------------------------------------------------------
// Hero Video Modal (Wistia) - Fixed Implementation
// ------------------------------------------------------------

function initHeroVideoModal() {
  const modal = document.getElementById('heroVideoModal');
  const iframe = document.getElementById('heroVideoFrame');
  const openBtns = document.querySelectorAll('[data-open-video], .hero-video-link');
  const closeBtns = modal ? modal.querySelectorAll('[data-close-modal], .cr-modal__close') : [];

  if (!modal || !iframe) {
    console.warn('[Modal] Missing #heroVideoModal or #heroVideoFrame');
    return;
  }

  // Prevent multiple initializations
  if (modal.__videoModalInitialized) {
    return;
  }
  modal.__videoModalInitialized = true;

  // Get the base video URL
  const baseVideoUrl = iframe.getAttribute('data-src') || 
                      iframe.getAttribute('src') || 
                      'https://fast.wistia.net/embed/iframe/f7fd076enf?videoFoam=true';

  // Clear the iframe src initially to prevent autoplay
  iframe.removeAttribute('src');

  function openModal(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    console.log('[Modal] Opening video modal');

    // Show modal
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.documentElement.classList.add('cr-modal-open');
    document.body.classList.add('cr-modal-open');

    // Load video with autoplay
    const videoUrl = new URL(baseVideoUrl, window.location.href);
    videoUrl.searchParams.set('autoPlay', 'true');
    videoUrl.searchParams.set('videoFoam', 'true');

    iframe.src = videoUrl.toString();
    console.log('[Modal] Video URL set to:', videoUrl.toString());
  }

  function closeModal(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    console.log('[Modal] Closing video modal');

    // Hide modal
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('cr-modal-open');
    document.body.classList.remove('cr-modal-open');

    // Stop video by clearing src
    iframe.src = '';
  }

  // Bind open buttons
  openBtns.forEach(btn => {
    // Remove any existing listeners to prevent duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', openModal, { passive: false });
    console.log('[Modal] Bound open button:', newBtn);
  });

  // Bind close buttons
  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeModal, { passive: false });
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal || 
        e.target.classList.contains('cr-modal__backdrop') ||
        e.target.hasAttribute('data-close-modal')) {
      closeModal(e);
    }
  }, { capture: true });

  // Close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeModal(e);
    }
  });

  console.log('[Modal] Video modal initialized successfully');
}

// ------------------------------------------------------------
// Initialize when DOM is ready
// ------------------------------------------------------------
function initVideoModal() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroVideoModal, { once: true });
  } else {
    initHeroVideoModal();
  }
}

// Call initialization
initVideoModal();
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    var el = document.getElementById('header-register');
    if (el && typeof wireProtectedLink === 'function') {
      try {
        wireProtectedLink(el, { whenInstalled: PASSION_APP_URL, whenNotInstalled: '/registration.html', changeLabel: false });
      } catch(e){}
    }
  });
})();


// BVA v3: submenu toggle for global nav
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    var trigger = document.querySelector('.cr-global-nav .has-submenu > .submenu-toggle');
    var item    = document.querySelector('.cr-global-nav .has-submenu');
    if (!trigger || !item) return;
    trigger.addEventListener('click', function(e){
      e.preventDefault();
      var open = item.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true':'false');
    }, { passive:false });
    document.addEventListener('click', function(e){
      if (!item.contains(e.target)) {
        item.classList.remove('open');
        trigger.setAttribute('aria-expanded','false');
      }
    }, { capture:true });
  });
})();

(function () {
  const PROMPT_KEY = 'onesignalPromptedAfterInstall';

  function onOS(fn) {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try { await fn(OneSignal); } catch (e) { console.error('[OneSignal]', e); }
    });
  }

  async function promptAndTag(OneSignal) {
    if (OneSignal.Slidedown?.promptPush) {
      await OneSignal.Slidedown.promptPush();
    } else if (OneSignal.Notifications?.requestPermission) {
      await OneSignal.Notifications.requestPermission();
    }


    const stamp = String(Date.now());
    await OneSignal.User.addTag('installed_pwa', 'true');
    await OneSignal.User.addTag('installed_pwa_at', stamp);

    try { localStorage.setItem(PROMPT_KEY, '1'); } catch (_) { }
  }

  if (localStorage.getItem('pwa-installed') === 'true' && !localStorage.getItem(PROMPT_KEY)) {
    onOS(promptAndTag);
  }
  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem('pwa-installed', 'true'); } catch (_) { }
    if (localStorage.getItem(PROMPT_KEY)) return;
    onOS(promptAndTag);
  });
})();
/* ================================
   PRICING TOGGLE: Monthly <-> Annual
   ================================ */
   document.addEventListener('DOMContentLoaded', () => {
    const toggle   = document.getElementById('online-toggle');
    const monthly  = document.getElementById('monthly-label-online');
    const annual   = document.getElementById('annual-label-online');
    const discount = document.getElementById('online-discount');
  
    const priceEl  = document.getElementById('bva-workbooks-price'); // "$47/month"
    const termsEl  = document.getElementById('bva-workbooks-terms');  // "Billed monthly..."
  
    if (!toggle || !priceEl || !termsEl) return;
  
    function setMode(isAnnual){
      toggle.classList.toggle('annual', isAnnual);
      if (monthly)  monthly.classList.toggle('active', !isAnnual);
      if (annual)   annual.classList.toggle('active',  isAnnual);
      if (discount) discount.style.display = isAnnual ? 'inline-block' : 'none';
  
      // Update visible price/terms (adjust numbers if you change pricing)
      if (isAnnual) {
        priceEl.textContent = '$470/year';
        termsEl.innerHTML = '<ul><li>Billed annually</li><li>Cancel anytime</li></ul>';
      } else {
        priceEl.textContent = '$47/month';
        termsEl.innerHTML = '<ul><li>Billed monthly</li><li>Cancel anytime</li></ul>';
      }
    }
  
    // Toggle on click
    toggle.addEventListener('click', () => {
      const isAnnual = !toggle.classList.contains('annual');
      setMode(isAnnual);
    });
  });
  

  document.addEventListener('DOMContentLoaded', () => {
    const PASSION_URL = 'https://command-results.passion.io/checkout/361d3339-e248-4257-aad9-aee65055cf83';
    const REG_PAGE    = 'registration.html';
  
    // Buttons/links that should follow this rule
    const targets = [
      document.getElementById('bva-app-enroll-button'),    // pricing card: "Get Started Free"
      document.getElementById('reviews-free-app-button'),  // reviews CTA
    ].filter(Boolean);
  
    function isInstalled() {
      // Prefer your existing helper if present
      try {
        if (typeof isAppInstalled === 'function') return !!isAppInstalled();
      } catch (e) {}
      // Fallback checks
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
             (navigator.standalone === true) ||
             ((document.referrer || '').startsWith('android-app://')) ||
             localStorage.getItem('pwa-installed') === 'true';
    }
  
    // Ensure anchors visibly point to PASSION when installed
    function syncHrefs() {
      const installed = isInstalled();
      targets.forEach(a => {
        if (!a) return;
        a.setAttribute('href', installed ? PASSION_URL : REG_PAGE);
      });
    }
  
    // First paint + on click safety
    syncHrefs();
    targets.forEach(a => {
      a.addEventListener('click', (ev) => {
        const installed = isInstalled();
        a.setAttribute('href', installed ? PASSION_URL : REG_PAGE);
        if (!installed) {
          ev.preventDefault();
          window.location.href = REG_PAGE;
        }
      }, { capture: true });
    });
  });


// Legacy contact URL guard
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href*="app.commandresults.com/contact"]').forEach(a => {
    a.href = '/contact.html'; // Route old deep links to the new contact page
  });
});


(function(){
  function $(sel,root=document){ return root.querySelector(sel); }
  function $all(sel,root=document){ return Array.from(root.querySelectorAll(sel)); }

  const card       = $('.bva2-card');
  if (!card) return;

  const screens    = $all('.bva2-screen', card);
  const progress   = $('.bva2-progress', card);
  const fill       = $('.bva2-progress-fill', card);
  const stepLabel  = $('.bva2-step', card);
  const startBtn   = $('.bva2-start', card);
  const form       = $('.bva2-form', card);
  const primaryCta = $('#bva2PrimaryCta');
  const scoreEl    = $('#bva2Score');
  const statusEl   = $('#bva2Status');
  const messageEl  = $('#bva2Message');

  const order = ['intro','q1','q2','q3','q4','q5','lead','results'];
  const answers = { q1:null,q2:null,q3:null,q4:null,q5:null };

  function show(screen){
    screens.forEach(s => s.hidden = (s.getAttribute('data-screen') !== screen));
    // update progress on Q screens
    const idx = order.indexOf(screen);
    const qIndex = Math.max(0, Math.min(idx-1, 5));
    const pct = (idx>=1 && idx<=5) ? (qIndex/5)*100 : (idx>5 ? 100 : 0);
    if (progress) {
      progress.setAttribute('aria-hidden', (idx<=0 || screen==='results') ? 'true' : 'false');
      if (fill) fill.style.width = pct + '%';
      if (stepLabel && idx>=1 && idx<=5) stepLabel.textContent = String(qIndex);
    }
  }

  function next(from){
    const i = order.indexOf(from);
    const nxt = order[i+1] || 'results';
    show(nxt);
  }

  function score(){
    return ['q1','q2','q3','q4','q5'].reduce((t,k)=> t + (Number(answers[k]||0)), 0);
  }

  function setRecommendation(total){
    // Low (<=10), Mid (11–18), High (19–25)
    let href = '#';
    let status = 'Getting Started';
    let msg = 'You’re early in your Lean-Agile journey. Start with core practices and quick wins.';
    if (total >= 19) {
      status = 'High Performer';
      msg = 'You’re operating at a strong level. Double down on flow, automation, and scaling.';
      href = '/recommendations/high.html';
    } else if (total >= 11) {
      status = 'On the Way';
      msg = 'Solid foundation. Focus on alignment, WIP limits, and feedback loops.';
      href = '/recommendations/mid.html';
    } else {
      href = '/recommendations/low.html';
    }
    if (scoreEl) scoreEl.textContent = String(total);
    if (statusEl) statusEl.textContent = status;
    if (messageEl) messageEl.textContent = msg;
    if (primaryCta) {
      primaryCta.href = href;
      primaryCta.setAttribute('data-gate','scorecard-results');
    }
  }

  // start
  if (startBtn) {
    startBtn.addEventListener('click', () => show('q1'));
  }

  // choose scale values and Next on each Q
  $all('.bva2-screen[data-screen^="q"]', card).forEach(screen => {
    const field = screen.querySelector('.bva2-scale');
    const nextBtn = screen.querySelector('.bva2-next');
    if (!field || !nextBtn) return;

    field.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-val]');
      if (!btn) return;
      $all('button', field).forEach(b => b.classList.toggle('active', b===btn));
      answers[field.getAttribute('data-field')] = Number(btn.getAttribute('data-val'));
    });

    nextBtn.addEventListener('click', () => {
      const key = field.getAttribute('data-field');
      if (!answers[key]) {
        field.classList.add('shake');
        setTimeout(() => field.classList.remove('shake'), 400);
        return;
      }
      // update progress step label (1..5)
      const idx = parseInt(key.slice(1),10);
      if (stepLabel) stepLabel.textContent = String(idx);
      next(screen.getAttribute('data-screen'));
    });
  });

  // Lead-capture submit -> compute score & show results
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // basic lead validation
      const name = $('#bva2Name')?.value?.trim?.();
      const email = $('#bva2Email')?.value?.trim?.();
      if (!name) { $('#bva2Name')?.classList?.add?.('bva2-invalid'); return; }
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $('#bva2Email')?.classList?.add?.('bva2-invalid'); return; }

      const total = score();
      setRecommendation(total);
      show('results');
    });
  }

  // Gate the CTA if subscription required
  if (primaryCta) {
    primaryCta.addEventListener('click', (e) => {
      if (typeof window.requireScorecardSubscription === 'function' && !window.__scorecardSubscribed) {
        const ok = window.requireScorecardSubscription();
        if (!ok) e.preventDefault();
      }
    }, { capture:true });
  }

  // Boot to intro
  show('intro');
})();

// === Auth UI Logic: Systeme.io & PWA install gating ===
(function authUiLogic(){
  const SYSTEME_LOGIN = 'https://1a01-gary.systeme.io/dashboard/en/login';

  function setAuthButtons(){
    const installed = isAppInstalled();
    const loginBtn = document.getElementById('auth-button');
    const regBtn   = document.getElementById('register-button');

    if (installed) {
      if (loginBtn) loginBtn.style.display = '';
      if (regBtn)   regBtn.style.display   = 'none';
      if (loginBtn) loginBtn.setAttribute('href', SYSTEME_LOGIN);
    } else {
      if (loginBtn) loginBtn.style.display = 'none';
      if (regBtn)   regBtn.style.display   = '';
    }
  }

  // Guard ALL auth links sitewide when NOT installed
  document.addEventListener('click', (e) => {
    const a = e.target && (e.target.closest ? e.target.closest('a') : null);
    if (!a) return;
    const href = (a.getAttribute('href') || '').trim();
    const isAuthLink = a.hasAttribute('data-auth-link') || href.includes('systeme.io/dashboard/en/login');
    if (!isAuthLink) return;
    if (!isAppInstalled()) {
      e.preventDefault();
      window.location.href = '/registration.html';
    }
  }, { capture: true });

  document.addEventListener('DOMContentLoaded', setAuthButtons);
  window.addEventListener('load', setAuthButtons);

  // When the PWA is installed, remember and go to Systeme.io login
  window.addEventListener('appinstalled', () => {
    try { localStorage.setItem('pwa-installed', 'true'); } catch {}
    window.location.href = SYSTEME_LOGIN;
  });
})();


// === Mobile hamburger toggle + Register link sync ===
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('mobileMenuToggle');
  const nav = document.querySelector('nav.cr-global-nav') || document.querySelector('.cr-global-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Ensure all Register buttons link to Systeme
  const REGISTER_URL = 'https://1a01-gary.systeme.io/80e7228b';
  const candidates = Array.from(document.querySelectorAll('a')).filter(a => {
    const text = (a.textContent || '').trim().toLowerCase();
    return text === 'register' || a.id === 'register-button' || a.dataset.registerLink !== undefined;
  });
  candidates.forEach(a => a.setAttribute('href', REGISTER_URL));

  // Deduplicate: keep first Register link inside header/global nav
  const scope = document.querySelector('header') || document;
  const regLinks = Array.from(scope.querySelectorAll(`a[href="https://1a01-gary.systeme.io/80e7228b"]`)).filter(a => /register/i.test((a.textContent||'')));
  regLinks.slice(1).forEach(a => a.remove());
});
