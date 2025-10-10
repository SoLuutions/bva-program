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
  return window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone ||
    document.referrer.includes('android-app://');
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
(function () {
  function onReady(fn) { if (document.readyState !== 'loading') { fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }

  // Helper: GA4
  function trackGA(eventName, params) {
    try {
      if (window.gtag) { window.gtag('event', eventName, params || {}); }
    } catch (e) { /* no-op */ }
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
  function trackLI(key) {
    try {
      if (window.lintrk && LI_CONVERSIONS[key]) {
        window.lintrk('track', { conversion_id: LI_CONVERSIONS[key] });
      }
    } catch (e) { /* no-op */ }
  }

  // Attach handlers
  onReady(function () {
    // CTA buttons
    var appBtn = document.getElementById('app-btn');
    var trialBtn = document.getElementById('trial-btn');
    var purchaseBtn = document.getElementById('purchase-btn');

    function attachClick(el, id, label) {
      if (!el) return;
      el.addEventListener('click', function (e) {
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
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href]');
      if (!a) return;
      var url;
      try { url = new URL(a.href, window.location.href); } catch (e) { return; }
      if (url.host && url.host !== window.location.host) {
        trackGA('outbound_click', {
          link_url: url.href,
          link_text: (a.textContent || '').trim().slice(0, 120),
          link_host: url.host
        });
        trackLI('outbound_click');
      }
    }, { capture: true, passive: true });

    // Registration page hooks (if present in this build)
    // Fire on submit and on success redirect (?registered=1)
    var regForm = document.querySelector('form#registration-form, form[data-analytics="registration"]');
    if (regForm) {
      regForm.addEventListener('submit', function () {
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
    // Mobile nav → open right SideNav
    const navToggle = document.querySelector('.nav-toggle');
    const sideNav = document.getElementById('sideNav');
    const sideBackdrop = document.getElementById('sideNavBackdrop');
    function openSide() {
      if (!sideNav || !sideBackdrop) return;
      sideNav.classList.add('open');
      sideNav.setAttribute('aria-hidden', 'false');
      sideBackdrop.classList.add('open');
      sideBackdrop.hidden = false;
    }
    function closeSide() {
      if (!sideNav || !sideBackdrop) return;
      sideNav.classList.remove('open');
      sideNav.setAttribute('aria-hidden', 'true');
      sideBackdrop.classList.remove('open');
      sideBackdrop.hidden = true;
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    }
    if (navToggle) {
      navToggle.addEventListener('click', () => {
        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        if (expanded) closeSide(); else openSide();
      });
    }
    document.querySelector('[data-close-sidenav]')?.addEventListener('click', closeSide);
    sideBackdrop?.addEventListener('click', closeSide);

    // Collapses in SideNav
    document.querySelectorAll('.sidenav__toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-collapse');
        const panel = id ? document.getElementById(id) : null;
        if (!panel) return;
        const open = panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    // Submenu
    const submenuBtn = document.querySelector('.submenu-toggle');
    const submenu = document.querySelector('.submenu');
    if (submenuBtn && submenu) {
      submenuBtn.addEventListener('click', () => {
        const expanded = submenuBtn.getAttribute('aria-expanded') === 'true';
        submenuBtn.setAttribute('aria-expanded', String(!expanded));
        submenu.classList.toggle('open');
      });
    }

    // Video modal
    const modal = document.getElementById('heroVideoModal');
    const openBtns = document.querySelectorAll('[data-open-video]');
    const iframe = document.getElementById('heroVideoFrame');
    function openModal() { if (!modal) return; modal.setAttribute('aria-hidden', 'false'); document.documentElement.classList.add('modal-open'); }
    function closeModal() { if (!modal) return; modal.setAttribute('aria-hidden', 'true'); document.documentElement.classList.remove('modal-open'); if (iframe) iframe.src = iframe.src; }
    openBtns.forEach(btn => btn.addEventListener('click', openModal));
    if (modal) {
      modal.addEventListener('click', (e) => { if (e.target.matches('[data-close-modal], .modal, .modal__backdrop')) closeModal(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    }

    // FAQ accordion: one open at a time
    const dts = document.querySelectorAll('.accordion details');
    dts.forEach(dt => dt.addEventListener('toggle', () => { if (dt.open) dts.forEach(other => { if (other !== dt) other.open = false; }); }));

    // Pricing tabs: Pay in 3 vs One time (toggle aria state)
    const tabs = document.querySelectorAll('.pricing .tab');
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      // Placeholder: hook plan price changes if needed
    }));

    // Testimonials auto-scrolling carousel (duplicate content to loop)
    const track = document.querySelector('.testimonial-track');
    if (track) {
      // Clone nodes to enable seamless loop
      const cards = Array.from(track.children);
      cards.forEach(card => track.appendChild(card.cloneNode(true)));
      let offset = 0;
      function step() {
        offset += 0.5; // speed
        track.scrollLeft = offset;
        if (offset >= track.scrollWidth / 2) { offset = 0; }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    // Business Agility Scorecard interaction (parity with index: start → quiz → lead → results)
    const startBtn = document.getElementById('bva2Start');
    const progressWrap = document.getElementById('bva2Progress');
    const progressBar = document.getElementById('bva2Bar');
    const stepLabel = document.getElementById('bva2Step');
    const formEl = document.getElementById('bva2Form');
    const qEl = document.getElementById('bva2Question');
    const resultsEl = document.getElementById('bva2Results');
    const leadHtml = `
      <div id="bva2Lead" style="margin-top:10px">
        <p class="sub">Where should we send your tailored plan?</p>
        <div class="cta-row" style="justify-content:stretch">
          <input type="text" id="bva2Name" placeholder="Full name" style="flex:1;min-width:0;padding:10px;border:1px solid #e5e7eb;border-radius:10px">
          <input type="email" id="bva2Email" placeholder="Email" style="flex:1;min-width:0;padding:10px;border:1px solid #e5e7eb;border-radius:10px">
          <button class="btn btn-primary" id="bva2SeeResults" type="button">See my results</button>
        </div>
      </div>`;
    if (startBtn && progressWrap && progressBar && stepLabel && formEl && qEl && resultsEl) {
      const questions = [
        'Lean-Agile Foundations applied across teams',
        'Value streams aligned to outcomes',
        'Team collaboration across functions',
        'Decision-making guided by metrics',
        'End-to-end flow focus across value streams'
      ];
      let idx = 0; let score = 0;
      function showQ() {
        qEl.textContent = questions[idx];
        stepLabel.textContent = `${idx + 1}/5`;
        progressBar.style.width = `${(idx / 5) * 100}%`;
      }
      startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        progressWrap.style.display = 'block';
        formEl.style.display = 'block';
        idx = 0; score = 0; showQ();
      });
      formEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-val]'); if (!btn) return;
        score += parseInt(btn.dataset.val || '0', 10);
        idx++;
        if (idx < questions.length) { showQ(); }
        else {
          progressBar.style.width = '100%';
          stepLabel.textContent = '5/5';
          formEl.style.display = 'none';
          // Inject lead capture before results
          const wrap = formEl.parentElement;
          if (wrap && !document.getElementById('bva2Lead')) {
            wrap.insertAdjacentHTML('beforeend', leadHtml);
            const seeBtn = document.getElementById('bva2SeeResults');
            seeBtn?.addEventListener('click', () => {
              const name = (document.getElementById('bva2Name')||{}).value || '';
              const email = (document.getElementById('bva2Email')||{}).value || '';
              // Simple validate
              if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('Please enter a valid email.'); return; }
              resultsEl.style.display = 'block';
              document.getElementById('bva2Score').textContent = String(score);
              document.getElementById('bva2Lead').style.display = 'none';
            });
          }
        }
      });
    }

    // Service worker (kept)
    if ("serviceWorker" in navigator) {
      // navigator.serviceWorker.register('/sw.js'); // optional
    }

// Courses tabs: Workbooks / Apps / Free Stuff
(function() {
  const courseTabs = document.querySelectorAll('.course-tabs .tab');
  const panels = document.querySelectorAll('.course-panels .course-panel');

  function showPanel(key) {
    panels.forEach(p => {
      const active = p.getAttribute('data-tab') === key;
      p.classList.toggle('active', active);
    });
    courseTabs.forEach(t => {
      const selected = t.getAttribute('data-tab-target') === key;
      t.setAttribute('aria-selected', String(selected));
    });
  }

  // Deep link support: ?catalog=apps|workbooks|free or #courses-&lt;tab&gt;
  function initFromURL() {
    const usp = new URLSearchParams(window.location.search);
    const q = (usp.get('catalog') || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const viaHash = hash.startsWith('#courses-') ? hash.replace('#courses-', '') : '';
    const key = ['workbooks', 'apps', 'free'].includes(q) ? q :
                ['workbooks', 'apps', 'free'].includes(viaHash) ? viaHash : 'workbooks';
    showPanel(key);
  }

  courseTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.getAttribute('data-tab-target');
      if (!key) return;
      showPanel(key);
      // update hash without scrolling
      history.replaceState(null, '', '#courses-' + key);
    });
  });

  // Initialize
  initFromURL();
})();
