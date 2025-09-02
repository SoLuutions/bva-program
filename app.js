
// --- Safe fallback for update UI ---
if (typeof showUpdateNotification !== 'function') {
  function showUpdateNotification() {
    try {
      const n = document.getElementById('update-notification');
      if (n) { n.hidden = false; }
      console.info('[PWA] Update available (fallback UI).');
    } catch (_) { console.info('[PWA] Update available.'); }
  }
}

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

// (section removed)
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
  // Legacy handler disabled so Mailchimp wiring (__wireForm) controls submission.
  // If you want a toast UI, attach it on successful response inside __wireForm instead.
  console.info('[Mailchimp] Legacy initNewsletter disabled; using __wireForm.');
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
    if (headerAuthBtn) { headerAuthBtn.innerHTML = 'Register'; headerAuthBtn.href = '/registration.html'; }

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
// BVA 2-Minute Assessment (inline quiz + results-first)
// ------------------------------------------------------------
function initBvaAssessment(){
  const wrap = $('#bva-assessment');
  if (!wrap) return;

  const el  = (sel, root=wrap) => root.querySelector(sel);
  const els = (sel, root=wrap) => Array.from(root.querySelectorAll(sel));

  const screens = {
    intro:   el('[data-screen="intro"]'),
    q1:      el('[data-screen="q1"]'),
    q2:      el('[data-screen="q2"]'),
    q3:      el('[data-screen="q3"]'),
    q4:      el('[data-screen="q4"]'),
    q5:      el('[data-screen="q5"]'),
    lead:    el('[data-screen="lead"]'),
    results: el('[data-screen="results"]')
  };

  const progress = {
    bar:  el('.bva2-progress'),
    fill: el('.bva2-progress-fill'),
    step: el('.bva2-progress .bva2-step')
  };

  const resultsEls = {
    score:      el('#bva2Score'),
    status:     el('#bva2Status'),
    message:    el('#bva2Message'),
    primaryCta: el('#bva2PrimaryCta'),
    altCta:     el('#bva2AltCta'),
  };

  const leadEls = {
    name:    el('#bva2Name'),
    email:   el('#bva2Email'),
    company: el('#bva2Company')
  };

  const order   = ['q1','q2','q3','q4','q5'];
  let answers   = { q1:null,q2:null,q3:null,q4:null,q5:null };
  let stepIndex = 0;

  function show(scr){
    Object.values(screens).forEach(s => s.hidden = true);
    screens[scr].hidden = false;
    if(order.includes(scr)){ progress.bar.removeAttribute('aria-hidden'); }
    else { progress.bar.setAttribute('aria-hidden','true'); }
  }
  function updateProgress(){
    const current = Math.min(stepIndex, order.length);
    progress.step.textContent = current;
    progress.fill.style.width = (current / order.length * 100) + '%';
  }
  function next(){
    if(stepIndex < order.length) show(order[stepIndex]);
    else show('lead');
    updateProgress();
  }

  // Start
  el('.bva2-start').addEventListener('click', ()=>{
    stepIndex = 0;
    updateProgress();
    next();
    if(window.gtag){ try{ gtag('event','bva2_start'); }catch(e){} }
  });

  // Rating choose
  els('.bva2-scale').forEach(group=>{
    group.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button[data-val]');
      if(!btn) return;
      els('button', group).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      answers[group.getAttribute('data-field')] = parseInt(btn.dataset.val,10);
    });
  });

  // Next
  els('.bva2-next').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = order[stepIndex];
      if(!answers[key]){
        const grp = el(`.bva2-scale[data-field="${key}"]`);
        grp.classList.add('shake'); setTimeout(()=>grp.classList.remove('shake'), 500);
        return;
      }
      stepIndex++; next();
    });
  });

  // Share
  const shareBtn = el('#bva2Share');
  if (shareBtn) {
    shareBtn.addEventListener('click', async ()=>{
      const url = location.href.split('#')[0];
      const text = 'Try this 2-minute Business Agility Scorecard';
      if(navigator.share){
        try{ await navigator.share({title:'Business Agility Scorecard', text, url}); }catch(e){}
      }else{
        try{ await navigator.clipboard.writeText(url); alert('Link copied to clipboard!'); }catch(e){}
      }
    });
  }

  // Submit -> results (no auto-redirect)
  el('.bva2-form').addEventListener('submit', (e)=>{
    e.preventDefault();

    if(!leadEls.name.value.trim() || !leadEls.email.validity.valid){
      [leadEls.name, leadEls.email].forEach(i=>{
        if(!i.value.trim() || (i.type==='email' && !i.validity.valid)){
          i.classList.add('bva2-invalid');
          setTimeout(()=>i.classList.remove('bva2-invalid'), 800);
        }
      });
      return;
    }

    // lightweight persistence + analytics
    try {
      localStorage.setItem('bva2_lead', JSON.stringify({
        name: leadEls.name.value.trim(),
        email: leadEls.email.value.trim(),
        company: leadEls.company.value.trim() || null,
        ts: Date.now()
      }));
    } catch(e){}
    if(window.gtag){ try{ gtag('event','bva2_lead_submit'); }catch(e){} }

    const total = Object.values(answers).reduce((a,b)=>a+(b||0),0);
    const outcome = interpret(total);

    resultsEls.score.textContent = total;
    resultsEls.status.textContent = outcome.label;
    resultsEls.message.textContent = outcome.message;
    resultsEls.primaryCta.textContent = outcome.ctaText;
    resultsEls.primaryCta.href = outcome.href;
    resultsEls.primaryCta.setAttribute('target', outcome.newTab ? '_blank' : '_self');

    show('results');  // ✅ show results and stop here (no auto-jump)
  });

  function interpret(score){
    // Map score → label/message/CTA
    if(score <= 10){
      return {
        label:'🚨 Starting Line',
        message:'You’re just getting started. Let’s build your baseline.',
        href:'https://unlockleanagile.thinkific.com/enroll/3332937?price_id=4401583',
        ctaText:'Start Lean-Agile Foundations (Free)'
      };
    } else if(score <= 15){
      return {
        label:'⚠️ Foundations Needed',
        message:'You’ve taken some steps — but key gaps remain.',
        href:'https://unlockleanagile.thinkific.com/enroll/3306293?price_id=4401598',
        ctaText:'Get the BVA Program'
      };
    } else if(score <= 20){
      return {
        label:'😐 Untapped Value',
        message:'You’re making it work — but there’s more value to unlock.',
        href:'https://calendly.com/cgrupp55/20min',
        ctaText:'Schedule 3-Day BVA Workshop'
      };
    } else if(score <= 23){
      return {
        label:'✅ Ready to Scale',
        message:'Solid execution. Time to optimize and scale.',
        href:'https://calendly.com/cgrupp55/20min',
        ctaText:'Talk about 1-Month Guided Program'
      };
    }
    return {
      label:'🌟 High Performer',
      message:'Operating at a high level. Ready to lead the next wave?',
      href:'https://calendly.com/cgrupp55/20min',
      ctaText:'Partner with Us'
    };
  }

  // Simple testimonial auto-rotate
  const quotes = els('.bva2-quote');
  let qi = 0;
  if (quotes.length){
    setInterval(()=>{
      quotes[qi].classList.remove('active');
      qi = (qi + 1) % quotes.length;
      quotes[qi].classList.add('active');
    }, 4000);
  }
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
  initBvaAssessment();
  initHeroVideoModal();
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
// Hero Video Modal (Wistia) — open from hero image
// ------------------------------------------------------------
function initHeroVideoModal() {
  const openBtn  = document.querySelector('[data-open-video]');
  const modal    = document.getElementById('heroVideoModal');
  const closeEls = modal ? modal.querySelectorAll('[data-close-modal]') : [];
  const iframe   = document.getElementById('heroVideoFrame');

  if (!openBtn || !modal || !iframe) return;

  const originalSrc = iframe.getAttribute('data-src') || iframe.src;

  const open = () => {
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('cr-modal-open');
    // restore + autoplay
    const url = new URL(originalSrc, window.location.href);
    url.searchParams.set('autoPlay', 'true');
    iframe.src = url.toString();
    setTimeout(() => { openBtn.blur?.(); }, 10);
  };

  const close = () => {
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('cr-modal-open');
    // fully unload to stop audio
    iframe.src = '';
    // restore base URL without autoplay
    const url = new URL(originalSrc, window.location.href);
    url.searchParams.set('autoPlay', 'false');
    iframe.src = url.toString();
  };

  openBtn.addEventListener('click', open);
  closeEls.forEach(el => el.addEventListener('click', close));
  // Close on Esc from anywhere
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  // Close when clicking backdrop
  modal.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('cr-modal__backdrop')) close();
  }, { capture: true });
};

  openBtn.addEventListener('click', open);
  closeEls.forEach(el => el.addEventListener('click', close));
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Also close if user taps outside dialog
  modal.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('cr-modal__backdrop')) close();
  }, { capture: true });


function initHeroVideoModal() {
  const modal = document.getElementById('heroVideoModal');
  const openBtn = document.querySelector('[data-open-video]');
  const closeBtns = modal?.querySelectorAll('[data-close-modal]');
  const iframe = document.getElementById('heroVideoFrame');
  const iframeSrc = iframe?.getAttribute('data-src') || 'https://fast.wistia.net/embed/iframe/f7fd076enf?autoPlay=true&videoFoam=true';

  if (!modal || !openBtn || !iframe) {
    console.warn('[Modal] Missing modal elements');
    return;
  }

  function openModal() {
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('cr-modal-open');
    iframe.setAttribute('src', iframeSrc);
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('cr-modal-open');
    iframe.setAttribute('src', '');
  }

  bindOnce(openBtn, 'click', openModal);
  closeBtns.forEach(btn => bindOnce(btn, 'click', closeModal));

  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close-modal')) {
      closeModal();
    }
  });
}
/* ==========================================================
   Hero Video Modal + Autoplay Hardened (app.js)
   ========================================================== */

/** Utility: add event listener once, even if called multiple times */
function bindOnce(el, type, handler, opts = { once: true }) {
  if (!el) return;
  const key = `__bound_${type}_${handler.name || 'fn'}`;
  if (el[key]) return;
  el.addEventListener(type, handler, opts);
  el[key] = true;
}

/** Utility: set or replace a URLSearchParam */
function withParam(url, key, val) {
  const u = new URL(url, window.location.href);
  u.searchParams.set(key, String(val));
  return u.toString();
}

/** Utility: normalize scroll lock (support html or body targets) */
function setScrollLock(locked) {
  const cls = 'cr-modal-open';
  document.documentElement.classList.toggle(cls, locked);
  document.body.classList.toggle(cls, locked);
}

/** Optional: resilient autoplay for a separate intro <audio id="intro-audio"> */
function initIntroAudioAutoplay() {
  const audio = document.getElementById('intro-audio');
  if (!audio) return;

  function attemptPlay() {
    audio.play().catch(() => {
      // Fallback on first user gesture (covers autoplay policy)
      const resume = () => {
        audio.play().catch(() => { /* give up silently */ });
        ['pointerdown','keydown','touchstart','scroll'].forEach(ev =>
          window.removeEventListener(ev, resume, { passive: true })
        );
      };
      ['pointerdown','keydown','touchstart','scroll'].forEach(ev =>
        window.addEventListener(ev, resume, { once: true, passive: true })
      );
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attemptPlay, { once: true });
  } else {
    attemptPlay();
  }
}

/** Main: Hero Video Modal (Wistia) */
function initHeroVideoModal() {
  // REQUIRED MARKUP:
  // <div id="heroVideoModal" class="cr-modal" aria-hidden="true">…</div>
  // <button data-open-video>Open</button> (can have multiple triggers)
  // <button data-close-modal>Close</button> or .cr-modal__close or backdrop
  // <iframe id="heroVideoFrame" class="wistia_embed" data-src="..."></iframe>

  const modal = document.getElementById('heroVideoModal');
  const iframe = document.getElementById('heroVideoFrame');
  const openBtns = document.querySelectorAll('[data-open-video], .hero-video-link');
  const closeBtns = modal ? modal.querySelectorAll('[data-close-modal], .cr-modal__close') : [];

  if (!modal || !iframe) {
    console.warn('[Modal] Missing #heroVideoModal or #heroVideoFrame');
    return;
  }

  // --- Ensure no autoplay on first paint ------------------------------------
  // If the iframe has an active src (e.g. ?autoPlay=true), move it to data-src and clear src.
  (function normalizeIframeSrc() {
    const liveSrc = iframe.getAttribute('src');
    const dataSrc = iframe.getAttribute('data-src');
    // Prefer explicit data-src. If not present, salvage the live src.
    if (!dataSrc && liveSrc) {
      iframe.setAttribute('data-src', liveSrc);
    }
    // Always clear src so nothing loads until open.
    iframe.removeAttribute('src');
  })();

  // Compute a safe base URL with autoPlay=false
  const baseRaw = iframe.getAttribute('data-src') || '';
  const baseSrc = baseRaw ? withParam(baseRaw, 'autoPlay', 'false') : '';

  function openModal(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    // Visible state (support both aria and .is-open for CSS/JS compatibility)
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    setScrollLock(true);

    // Load + play the video only now
    if (baseSrc) {
      // Ensure videoFoam remains enabled unless explicitly turned off in data-src
      const urlWithFoam = withParam(baseSrc, 'videoFoam', 'true');
      iframe.src = withParam(urlWithFoam, 'autoPlay', 'true');
    }
  }

  function closeModal(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    setScrollLock(false);

    // Unload iframe fully to stop audio and free resources
    iframe.src = '';
  }

  // Bind openers (can be multiple)
  openBtns.forEach(btn => bindOnce(btn, 'click', openModal));

  // Bind closers
  closeBtns.forEach(btn => bindOnce(btn, 'click', closeModal));

  // Backdrop click (clicks directly on backdrop or elements with data-close-modal)
  modal.addEventListener('click', (e) => {
    const target = e.target;
    const isBackdrop = target && (
      target.classList && target.classList.contains('cr-modal__backdrop')
    );
    const isExplicitClose = target && (
      target.hasAttribute && target.hasAttribute('data-close-modal')
    );
    if (isBackdrop || isExplicitClose) closeModal(e);
  }, { capture: true });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeModal(e);
    }
  });
}

/* ==========================================================
   Boot
   ========================================================== */
(function boot() {
  const start = () => {
    initHeroVideoModal();
    initIntroAudioAutoplay(); // safe: only runs if #intro-audio exists
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();


// Wire the new header Register button to respect install state
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
