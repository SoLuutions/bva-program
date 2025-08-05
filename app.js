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
  anchor.addEventListener('click', function(e) {
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