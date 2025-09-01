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
