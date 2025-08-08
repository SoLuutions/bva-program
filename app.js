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
      window.scrollTo({
        top: target.offsetTop - 80,
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

// Check if the app is already installed
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone ||
    document.referrer.includes('android-app://');
}

// Check PWA install criteria
function checkPWAInstallCriteria() {
  const hasManifest = document.querySelector('link[rel="manifest"]');
  const hasServiceWorker = 'serviceWorker' in navigator;
  const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';

  console.log('PWA Install Criteria Check:', {
    hasManifest: !!hasManifest,
    hasServiceWorker,
    isHTTPS,
    isInstalled: isAppInstalled(),
    userAgent: navigator.userAgent
  });

  return hasManifest && hasServiceWorker && isHTTPS;
}

// Show the install notification with fallback
function showInstallNotification(force = false) {
  if (isAppInstalled()) {
    console.log('App already installed, not showing notification');
    return;
  }

  // Check if user has dismissed recently
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  const now = Date.now();

  if (!force && dismissedTime) {
    const timeSinceDismissed = now - parseInt(dismissedTime);
    if (timeSinceDismissed < 1800000) { // 30 minutes instead of 1 hour
      console.log('Install notification recently dismissed');
      return;
    }
  }

  console.log('Showing install notification');
  installNotification.classList.add('show');

  // Automatically hide after 15 seconds (shorter)
  const autoHideTimeout = setTimeout(() => {
    if (installNotification.classList.contains('show')) {
      installNotification.classList.remove('show');
    }
  }, 15000);

  // Clear timeout if user interacts
  installNotification.addEventListener('click', () => {
    clearTimeout(autoHideTimeout);
  }, { once: true });
}

// Enhanced beforeinstallprompt handler
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt event fired');
  e.preventDefault();
  deferredPrompt = e;

  // Show notification quickly - just 3 seconds
  setTimeout(() => {
    showInstallNotification();
  }, 3000);
});

// Fallback: Show notification even without beforeinstallprompt
window.addEventListener('load', () => {
  checkPWAInstallCriteria();

  // If no beforeinstallprompt after 5 seconds, show fallback
  setTimeout(() => {
    if (!deferredPrompt && !isAppInstalled()) {
      console.log('No beforeinstallprompt detected, showing fallback notification');
      showInstallNotification(true);
    }
  }, 5000);
});

// Install button handler with direct install
installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    // Direct native install
    console.log('Installing PWA directly');
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      installNotification.classList.remove('show');
      deferredPrompt = null;

      if (outcome === 'accepted') {
        console.log('User installed the PWA');
        localStorage.setItem('pwa-install-accepted', Date.now().toString());
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
      // Just hide notification if install fails
      installNotification.classList.remove('show');
    }
  } else {
    // Try to trigger browser's native install if available
    if (window.BeforeInstallPromptEvent) {
      installNotification.classList.remove('show');
    } else {
      // Just hide - no big instructions popup
      installNotification.classList.remove('show');
    }
  }
});

// Removed manual install instructions function - no longer needed

// Later button handler
laterBtn.addEventListener('click', () => {
  installNotification.classList.remove('show');
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());

  // Show again after 30 minutes instead of 1 hour
  setTimeout(() => {
    localStorage.removeItem('pwa-install-dismissed');
    if (!isAppInstalled()) {
      showInstallNotification(true);
    }
  }, 1800000);
});

// Close button handler
closeBtn.addEventListener('click', () => {
  installNotification.classList.remove('show');
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
});

// Detect if app was installed
window.addEventListener('appinstalled', (evt) => {
  console.log('PWA was installed successfully');
  installNotification.classList.remove('show');
  localStorage.setItem('pwa-installed', 'true');
});

// Service Worker Registration with better error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('ServiceWorker registered successfully:', registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        console.log('New service worker version available');
      });

    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  });
}
// Update smooth scrolling to account for fixed header
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
// Enhanced video interaction
document.addEventListener('DOMContentLoaded', function () {
  const playButton = document.querySelector('.play-indicator');
  const videoContainer = document.querySelector('.video-container');

  // Remove play button when video is clicked
  if (videoContainer && playButton) {
    videoContainer.addEventListener('click', function () {
      playButton.style.opacity = '0';
      setTimeout(() => {
        playButton.style.display = 'none';
      }, 300);
    });
  }
});
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
// Add this function to detect PWA installation status
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone ||
    document.referrer.includes('android-app://');
}

// Add this code to update buttons based on installation status
document.addEventListener('DOMContentLoaded', function () {
  // Existing video interaction code...

  // New button logic for all Passion.io links
  const isInstalled = isAppInstalled();
  const registrationPage = 'registration.html';

  // Update header auth button
  const authButton = document.getElementById('auth-button');
  if (authButton) {
    if (isInstalled) {
      // App is installed - keep as login
      authButton.textContent = 'Log In';
      authButton.href = 'https://command-results.passion.io/login';
    } else {
      // App not installed - change to register
      authButton.textContent = 'Register';
      authButton.href = registrationPage;
    }
  }

  // Update hero free app button
  const heroFreeAppButton = document.getElementById('hero-free-app-button');
  if (heroFreeAppButton && !isInstalled) {
    heroFreeAppButton.href = registrationPage;
  }

  // Update final CTA free app button
  const finalFreeAppButton = document.getElementById('final-free-app-button');
  if (finalFreeAppButton && !isInstalled) {
    finalFreeAppButton.href = registrationPage;
  }

  // Update FAQ button if exists
  const faqFreeAppButton = document.querySelector('.faq-item a[href*="passion.io"]');
  if (faqFreeAppButton && !isInstalled) {
    faqFreeAppButton.href = registrationPage;
  }
});
// Newsletter form submission logic
document.addEventListener('DOMContentLoaded', function () {
  const newsletterForm = document.getElementById('newsletterForm');

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('newsletterEmail').value;

      console.log('Subscribing email:', email);

      alert("Thank you for subscribing! You'll receive our next newsletter soon.");
      newsletterForm.reset();
    });
  }
});
