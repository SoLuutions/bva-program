// app.js
// FAQ toggle functionality
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const faqItem = question.parentElement;
    faqItem.classList.toggle('active');
  });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const headerHeight = document.querySelector('header').offsetHeight;
      window.scrollTo({
        top: target.offsetTop - headerHeight - 20,
        behavior: 'smooth'
      });
    }
  });
});

// Install Notification Logic
let deferredPrompt;
const installNotification = document.getElementById('install-notification');
const installBtn = document.getElementById('install-btn');
const laterBtn = document.getElementById('later-btn');
const closeBtn = document.getElementById('close-install');

// Check if app is installed
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone ||
    document.referrer.includes('android-app://');
}

// Show install notification
function showInstallNotification(force = false) {
  if (isAppInstalled()) return;
  
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  const now = Date.now();
  
  if (!force && dismissedTime && (now - parseInt(dismissedTime) < 1800000)) {
    return;
  }
  
  installNotification.classList.add('show');
  setTimeout(() => installNotification.classList.remove('show'), 30000);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(showInstallNotification, 30000);
});

window.addEventListener('load', () => {
  setTimeout(() => {
    if (!deferredPrompt && !isAppInstalled()) showInstallNotification(true);
  }, 5000);
});

installBtn.addEventListener('click', async () => {
  // If not installed, send them to registration first
  if (!isAppInstalled()) {
    installNotification.classList.remove('show');
    window.location.href = '/registration.html';
    return;
  }

  // If installed, preserve normal behavior or no-op
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      installNotification.classList.remove('show');
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-install-accepted', Date.now().toString());
      }
    } catch {
      installNotification.classList.remove('show');
    }
  } else {
    installNotification.classList.remove('show');
  }
});


laterBtn.addEventListener('click', () => {
  installNotification.classList.remove('show');
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  setTimeout(() => {
    localStorage.removeItem('pwa-install-dismissed');
    if (!isAppInstalled()) showInstallNotification(true);
  }, 1800000);
});

closeBtn.addEventListener('click', () => {
  installNotification.classList.remove('show');
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
});

window.addEventListener('appinstalled', () => {
  localStorage.setItem('pwa-installed', 'true');
});

// NEW: Update notification system
function showUpdateNotification() {
  const updateNotify = document.createElement('div');
  updateNotify.id = 'update-notification';
  updateNotify.innerHTML = `
    <div class="update-content">
      <p>New version available!</p>
      <button id="refresh-btn">Update Now</button>
    </div>
  `;
  document.body.appendChild(updateNotify);
  
  document.getElementById('refresh-btn').addEventListener('click', () => {
    navigator.serviceWorker.controller.postMessage('skipWaiting');
  });
}

// Service Worker Registration with update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Cache-busting query parameter
      const timestamp = new Date().getTime();
      const registration = await navigator.serviceWorker.register(
        `/sw.js?version=${timestamp}`, 
        { scope: '/' }
      );
      
      // Check for updates every 4 hours
      setInterval(() => registration.update(), 4 * 60 * 60 * 1000);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
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
}

// Force refresh when new SW takes control
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  console.log('Command Results Pricing Module loaded');

  // Updated pricing data with new links
  const pricingData = {
    online: {
      bvaApp: {
        monthly: {
          price: 47,
          link: "https://unlockleanagile.thinkific.com/enroll/3332937?price_id=4401583"
        },
        annual: {
          price: 497,
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

  // Toggle functionality for Online Training
  const onlineToggle = document.getElementById('online-toggle');
  const monthlyLabelOnline = document.getElementById('monthly-label-online');
  const annualLabelOnline = document.getElementById('annual-label-online');
  const onlineDiscount = document.getElementById('online-discount');
  const bvaAppPrice = document.getElementById('bva-app-price');
  const bvaWorkbooksPrice = document.getElementById('bva-workbooks-price');
  const bvaAppTerms = document.getElementById('bva-app-terms');
  const bvaWorkbooksTerms = document.getElementById('bva-workbooks-terms');
  const bvaAppButton = document.getElementById('bva-app-enroll-button');
  const bvaWorkbooksButton = document.getElementById('bva-workbooks-enroll-button');

  let onlineIsAnnual = false;

  function updateOnlinePricing() {
    const bvaAppPlan = onlineIsAnnual ? 'annual' : 'monthly';
    const bvaWorkbooksPlan = onlineIsAnnual ? 'annual' : 'monthly';

    if (onlineIsAnnual) {
      bvaAppPrice.textContent = `$${pricingData.online.bvaApp.annual.price} one-time payment`;
      bvaWorkbooksPrice.textContent = `$${pricingData.online.bvaWorkbooks.annual.price} one-time payment`;

      // Update terms with consistent bullet style
      bvaAppTerms.innerHTML = `
        <ul>
          <li>Pay one-time fee and save nearly $70 compared to monthly billing</li>
          <li>Continued access after the first year requires an 18% annual maintenance fee</li>
          <li>Cancel any time in the first 30 days</li>
        </ul>
      `;

      bvaWorkbooksTerms.innerHTML = `
        <ul>
          <li>Pay one-time fee and save nearly $70 compared to monthly billing</li>
          <li>Continued access after the first year requires an 18% annual maintenance fee</li>
          <li>Cancel any time in the first 30 days</li>
        </ul>
      `;
    } else {
      bvaAppPrice.textContent = `$${pricingData.online.bvaApp.monthly.price}/month for 12 months`;
      bvaWorkbooksPrice.textContent = `$${pricingData.online.bvaWorkbooks.monthly.price}/month for 12 months`;

      // Update terms with consistent bullet style
      bvaAppTerms.innerHTML = `
        <ul>
          <li>Billed monthly for 12 months</li>
          <li>Continued access after the first year requires an 18% annual maintenance fee</li>
          <li>Cancel any time in the first 30 days</li>
        </ul>
      `;

      bvaWorkbooksTerms.innerHTML = `
        <ul>
          <li>Billed monthly for 12 months</li>
          <li>Continued access after the first year requires an 18% annual maintenance fee</li>
          <li>Cancel any time in the first 30 days</li>
        </ul>
      `;
    }

    bvaAppButton.href = pricingData.online.bvaApp[bvaAppPlan].link;
    bvaWorkbooksButton.href = pricingData.online.bvaWorkbooks[bvaWorkbooksPlan].link;

    if (onlineIsAnnual) {
      onlineDiscount.style.display = 'inline';
      monthlyLabelOnline.classList.remove('active');
      annualLabelOnline.classList.add('active');
      onlineToggle.classList.add('annual');
    } else {
      onlineDiscount.style.display = 'none';
      monthlyLabelOnline.classList.add('active');
      annualLabelOnline.classList.remove('active');
      onlineToggle.classList.remove('annual');
    }
  }

  onlineToggle.addEventListener('click', function () {
    onlineIsAnnual = !onlineIsAnnual;
    updateOnlinePricing();
  });

  // Initialize pricing displays
  updateOnlinePricing();

  // Add toggle functionality to labels for better UX
  monthlyLabelOnline.addEventListener('click', function () {
    if (onlineIsAnnual) {
      onlineIsAnnual = false;
      updateOnlinePricing();
    }
  });

  annualLabelOnline.addEventListener('click', function () {
    if (!onlineIsAnnual) {
      onlineIsAnnual = true;
      updateOnlinePricing();
    }
  });
});

// Newsletter form submission
document.addEventListener('DOMContentLoaded', function() {
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      alert("Thank you for subscribing!");
      newsletterForm.reset();
    });
  }
});
function routeGetAppLinks() {
  if (isAppInstalled()) return;

  // Candidate selectors for "Get App" actions (expand if needed)
  const candidates = [
    '#hero-free-app-button',        // "Get Started Free" in hero:contentReference[oaicite:2]{index=2}
    '#final-free-app-button',       // "Get Started Free" in final CTA:contentReference[oaicite:3]{index=3}
    'a.btn',                        // buttons styled as .btn
    'a.cr-button'                   // pricing buttons
  ];

  const textIsGetApp = (t) => /get\s*(app|started)/i.test(t);

  const handled = new Set();

  candidates.forEach(sel => {
    document.querySelectorAll(sel).forEach(a => {
      if (handled.has(a)) return;
      const text = (a.textContent || '').trim();
      if (!textIsGetApp(text)) return;

      a.addEventListener('click', (e) => {
        if (!isAppInstalled()) {
          e.preventDefault();
          window.location.href = '/registration.html';
        }
      }, { capture: true });

      handled.add(a);
    });
  });
}

document.addEventListener('DOMContentLoaded', routeGetAppLinks);
document.addEventListener('DOMContentLoaded', () => {
  if (!isAppInstalled()) {
    const heroBtn = document.getElementById('hero-free-app-button');
    const finalBtn = document.getElementById('final-free-app-button');

    if (heroBtn) {
      heroBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
    }
    if (finalBtn) {
      finalBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
    }
  }
});
