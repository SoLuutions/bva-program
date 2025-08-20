document.addEventListener('DOMContentLoaded', () => {
  // --- Elements
  const form = document.getElementById('registrationForm');
  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  const companyEl = document.getElementById('company');
  const phoneEl = document.getElementById('phone');

  const confirmationMessage = document.getElementById('confirmationMessage');

  // Inline install panel & instructions (these are in registration.html)
  const installPanel = document.getElementById('installPanel');
  const installBtn = document.getElementById('installAppBtn');
  const installHint = document.getElementById('installHint');

  const iosInstructions = document.getElementById('iosInstructions');
  // Optional blocks you might add to registration.html:
  const androidInstructions = document.getElementById('androidInstructions');
  const desktopInstructions = document.getElementById('desktopInstructions');

  // Optional: a loader element (not required). If you add one, use id="loader"
  const loader = document.getElementById('loader');

  // --- Platform detection
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isDesktopChromeOrEdge = /Chrome|Edg\//.test(ua) && !/Mobile/.test(ua);

  // --- Install prompt handling (works alongside app.js if present)
  // Use a shared global if app.js also listens for beforeinstallprompt
  let deferredPrompt = window.deferredPrompt || null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Stop the browser's mini-infobar
    e.preventDefault();
    deferredPrompt = e;
    window.deferredPrompt = e; // make available to app.js too

    // If we’re currently on the registration page and user just finished,
    // we'll show the inline install panel; the banner (if any) is handled by app.js.
    if (installPanel) installPanel.style.display = 'block';
    if (installHint) installHint.textContent = 'Tap Install App to add it to your home screen.';
  });

  window.addEventListener('appinstalled', () => {
    try { localStorage.setItem('pwa-installed', 'true'); } catch {}
    if (installPanel) installPanel.style.display = 'none';
    if (installHint) installHint.textContent = '';
  });

  // --- Helper functions
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  }

  function setLoading(isLoading) {
    if (loader) loader.style.display = isLoading ? 'block' : 'none';
    if (!form) return;

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.ariaBusy = isLoading ? 'true' : 'false';
    }
    // Disable all inputs while loading
    Array.from(form.elements || []).forEach((el) => {
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        el.disabled = isLoading ? true : el.disabled && el.dataset.keepDisabled === 'true';
      }
    });
  }

  async function submitToApi(payload) {
    // Replace with your actual endpoint
    const apiUrl = (window.REG_API_URL || '/api/register');
    let resp;
    try {
      resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    } catch (e) {
      // If endpoint isn't configured, proceed optimistically
      return { ok: true, offline: true };
    }

    if (!resp.ok) {
      let msg = 'Registration failed. Please try again.';
      try {
        const data = await resp.json();
        if (data && data.error) msg = data.error;
      } catch {}
      throw new Error(msg);
    }
    try {
      return await resp.json();
    } catch {
      return { ok: true };
    }
  }

  function showPlatformInstructions() {
    // Always show the inline panel when we’re guiding installation
    if (installPanel) installPanel.style.display = 'block';

    // iOS (no native prompt): show iOS steps
    if (isIOS && isSafari) {
      if (iosInstructions) iosInstructions.style.display = 'block';
      if (installHint) installHint.textContent = 'Follow the steps below to add it to your home screen.';
      return;
    }

    // Android: show Android steps if available (even if prompt exists — helpful if dismissed)
    if (isAndroid && androidInstructions) {
      androidInstructions.style.display = 'block';
    }

    // Desktop Chrome/Edge
    if (isDesktopChromeOrEdge && desktopInstructions) {
      desktopInstructions.style.display = 'block';
    }

    // Generic hint
    if (installHint && (!isIOS || !isSafari)) {
      installHint.textContent = deferredPrompt
        ? 'Tap Install App to add it to your device.'
        : 'If your browser supports installation, use the menu to Install/Add to Home screen.';
    }
  }

  // --- Install button (inline panel)
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      // If we have a captured prompt, use it
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            try { localStorage.setItem('pwa-install-accepted', Date.now().toString()); } catch {}
          }
        } catch {
          // If prompt fails, fall back to showing instructions
          showPlatformInstructions();
        } finally {
          // one-time prompt
          deferredPrompt = null;
          window.deferredPrompt = null;
        }
      } else {
        // No native prompt available: show instructions for the current platform
        showPlatformInstructions();
      }
    });
  }

  // --- Form submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Basic validation (HTML required handles most)
      const name = (nameEl?.value || '').trim();
      const email = (emailEl?.value || '').trim();
      const company = (companyEl?.value || '').trim();
      const phone = (phoneEl?.value || '').trim();

      if (!name || !email || !company || !phone) {
        alert('Please complete all required fields.');
        return;
      }
      if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        emailEl?.focus();
        return;
      }

      // Submit
      setLoading(true);
      try {
        await submitToApi({ name, email, company, phone });

        // Show confirmation block
        if (confirmationMessage) {
          confirmationMessage.style.display = 'block';
          // Make sure users see it
          try { confirmationMessage.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
        }

        // After successful registration, nudge install:
        // 1) Show inline install panel
        // 2) Also show platform instructions as a fallback
        showPlatformInstructions();

        // 3) If your site has a global install banner (managed by app.js),
        //    try to open it by toggling its class (non-fatal if not present)
        const globalBanner = document.getElementById('install-notification');
        if (globalBanner && !globalBanner.classList.contains('show')) {
          globalBanner.classList.add('show');
          // Auto-hide after 30s like app.js does (defensive)
          setTimeout(() => globalBanner.classList.remove('show'), 30000);
        }
      } catch (err) {
        alert(err?.message || 'Sorry, something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  }

  // --- (Optional) Ensure a SW is registered so this page is PWA-eligible
  // If registration.html did not register yet, do it here.
  if ('serviceWorker' in navigator) {
    // Only register if no controller yet; harmless if already controlled
    if (!navigator.serviceWorker.controller) {
      const ts = Date.now();
      navigator.serviceWorker.register(`/sw.js?scope=/&v=${ts}`, { scope: '/' }).catch(() => {});
    }
  }
});  