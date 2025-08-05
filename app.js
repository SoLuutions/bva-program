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
  
  // Show the install notification
  function showInstallNotification() {
    if (isAppInstalled()) return;
    
    setTimeout(() => {
      installNotification.classList.add('show');
      
      // Automatically hide after 30 seconds
      setTimeout(() => {
        if (installNotification.classList.contains('show')) {
          installNotification.classList.remove('show');
        }
      }, 30000);
    }, 10000); // Show after 10 seconds
  }
  
  // Listen for install prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallNotification();
  });
  
  // Install button handler
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    installNotification.classList.remove('show');
    deferredPrompt = null;
    
    if (outcome === 'accepted') {
      console.log('User installed the PWA');
    }
  });
  
  // Later button handler
  laterBtn.addEventListener('click', () => {
    installNotification.classList.remove('show');
    setTimeout(showInstallNotification, 3600000); // Show again after 1 hour
  });
  
  // Close button handler
  closeBtn.addEventListener('click', () => {
    installNotification.classList.remove('show');
    setTimeout(showInstallNotification, 86400000); // Show again after 24 hours
  });