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
    if (timeSinceDismissed < 3600000) { // 1 hour
      console.log('Install notification recently dismissed');
      return;
    }
  }
  
  console.log('Showing install notification');
  installNotification.classList.add('show');
  
  // Automatically hide after 30 seconds
  const autoHideTimeout = setTimeout(() => {
      if (installNotification.classList.contains('show')) {
          installNotification.classList.remove('show');
      }
  }, 30000);
  
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
  
  // Show notification after a delay
  setTimeout(() => {
    showInstallNotification();
  }, 10000);
});

// Fallback: Show notification even without beforeinstallprompt
window.addEventListener('load', () => {
  checkPWAInstallCriteria();
  
  // If no beforeinstallprompt after 15 seconds, show fallback
  setTimeout(() => {
    if (!deferredPrompt && !isAppInstalled()) {
      console.log('No beforeinstallprompt detected, showing fallback notification');
      showInstallNotification(true);
    }
  }, 15000);
});

// Install button handler with fallback
installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    // Native install prompt
    console.log('Using native install prompt');
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
      showManualInstallInstructions();
    }
  } else {
    // Fallback: Show manual install instructions
    console.log('No native prompt available, showing manual instructions');
    showManualInstallInstructions();
  }
});

// Manual install instructions
function showManualInstallInstructions() {
  const userAgent = navigator.userAgent.toLowerCase();
  let instructions = '';
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    instructions = 'Click the install icon in your address bar, or go to Chrome menu > "Install BVA App"';
  } else if (userAgent.includes('firefox')) {
    instructions = 'Firefox: This site can be added to your home screen through the browser menu';
  } else if (userAgent.includes('safari')) {
    instructions = 'Safari: Tap the share button and select "Add to Home Screen"';
  } else if (userAgent.includes('edg')) {
    instructions = 'Edge: Click the install icon in your address bar, or go to Settings menu > "Install this site as an app"';
  } else {
    instructions = 'Look for an "Install" or "Add to Home Screen" option in your browser menu';
  }
  
  // Create and show custom modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  modal.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      text-align: center;
      position: relative;
    ">
      <button onclick="this.parentElement.parentElement.remove()" style="
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      ">&times;</button>
      <h3 style="color: #333; margin-bottom: 20px;">Install BVA App</h3>
      <p style="color: #666; line-height: 1.5; margin-bottom: 20px;">${instructions}</p>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
      ">Got it</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  installNotification.classList.remove('show');
}

// Later button handler
laterBtn.addEventListener('click', () => {
  installNotification.classList.remove('show');
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  
  // Show again after 1 hour
  setTimeout(() => {
    localStorage.removeItem('pwa-install-dismissed');
    if (!isAppInstalled()) {
      showInstallNotification(true);
    }
  }, 3600000);
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