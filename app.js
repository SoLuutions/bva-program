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
// NEW: Update notification system (retained)
// ------------------------------------------------------------
function showUpdateNotification() {
  let updateNotify = $('#update-notification');
  if (!updateNotify) {
    updateNotify = document.createElement('div');
    updateNotify.id = 'update-notification';
    updateNotify.innerHTML = `
      <div class="update-content">
        <p>New version available!</p>
        <button id="refresh-btn">Update Now</button>
      </div>
    `;
    document.body.appendChild(updateNotify);
  }

  const refreshBtn = $('#refresh-btn', updateNotify);
  bindOnce(refreshBtn, 'click', () => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage('skipWaiting');
    }
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
          link: "https://unlockleanagile.thinkific.com/enroll/3332937?price_id=4401583"
        },
        annual: {
          price: 0,
          link: "https://unlockleanagile.thinkific.com/enroll/3332937?price_id=4401587"
        }
      },
      bvaWorkbooks: {
        monthly: {
          price: 47,
          link: "https://unlockleanagile.thinkific.com/enroll/3306293?price_id=4401598"
        },
        annual: {
          price: 497,
          link: "https://unlockleanagile.thinkific.com/enroll/3306293?price_id=4401600"
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
        <li>Continued access after the first year requires an 18% annual maintenance fee</li>
        <li>Cancel any time in the first 30 days</li>
      </ul>
    `;
  }
}

      if (bvaWorkbooksTerms) {
        bvaWorkbooksTerms.innerHTML = `
          <ul>
            <li>Pay one-time fee and save nearly $70 compared to monthly billing</li>
            <li>Continued access after the first year requires an 18% annual maintenance fee</li>
            <li>Cancel any time in the first 30 days</li>
          </ul>
        `;
      }
    } else {
      if (bvaAppPrice) bvaAppPrice.textContent = isBvaAppFreeMonthly ? 'Free' : `$${pricingData.online.bvaApp.monthly.price}/month for 12 months`;
      if (bvaWorkbooksPrice) bvaWorkbooksPrice.textContent = `$${pricingData.online.bvaWorkbooks.monthly.price}/month for 12 months`;

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
        <li>Continued access after the first year requires an 18% annual maintenance fee</li>
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