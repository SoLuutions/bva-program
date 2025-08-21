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
  let deferredPrompt = window.deferredPrompt || null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.deferredPrompt = e;
    if (installPanel) installPanel.style.display = 'block';
    if (installHint) installHint.textContent = 'Tap Install App to add it to your home screen.';
  });

  window.addEventListener('appinstalled', () => {
    try { localStorage.setItem('pwa-installed', 'true'); } catch {}
    if (installPanel) installPanel.style.display = 'none';
    if (installHint) installHint.textContent = '';
  });

  // --- Helpers
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

    Array.from(form.elements || []).forEach((el) => {
      const keepDisabled = el.dataset && el.dataset.keepDisabled === 'true';
      if (isLoading) {
        el.disabled = true;
      } else if (!keepDisabled) {
        el.disabled = false;
      }
    });
  }

  async function submitToApi(payload) {
    // Replace with your actual endpoint
    const apiUrl = '/api/register';
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });

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
    if (installPanel) installPanel.style.display = 'block';

    if (isIOS && isSafari) {
      if (iosInstructions) iosInstructions.style.display = 'block';
      if (installHint) installHint.textContent = 'Follow the steps below to add it to your home screen.';
      return;
    }

    if (isAndroid && androidInstructions) {
      androidInstructions.style.display = 'block';
    }

    if (isDesktopChromeOrEdge && desktopInstructions) {
      desktopInstructions.style.display = 'block';
    }

    if (installHint && (!isIOS || !isSafari)) {
      installHint.textContent = deferredPrompt
        ? 'Tap Install App to add it to your device.'
        : 'If your browser supports installation, use the menu to Install/Add to Home screen.';
    }
  }

  // --- Install button (inline panel)
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
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

      setLoading(true);
      try {
        await submitToApi({ name, email, company, phone });

        // Hide the form & container card if present
        try {
          form.style.display = 'none';
          const formCard = form.closest('.card, .registration-card, .registration-section');
          if (formCard) formCard.style.display = 'none';
        } catch {}

        // Show confirmation & relevant install guidance
        if (confirmationMessage) {
          confirmationMessage.style.display = 'block';
          showPlatformInstructions();
          try { confirmationMessage.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
        }

      } catch (err) {
        alert(err?.message || 'Sorry, something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  }

  // NOTE: Service Worker registration happens in registration.html (stable).
});
