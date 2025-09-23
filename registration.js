document.addEventListener('DOMContentLoaded', () => {
  // --- Elements
  const form = document.getElementById('registrationForm');
  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  const companyEl = document.getElementById('company');
  const phoneEl = document.getElementById('phone');

  const confirmationMessage = document.getElementById('confirmationMessage');

  // Inline install panel (success block)
  const installPanel = document.getElementById('installPanel');
  const installBtn = document.getElementById('installAppBtn');
  const installHint = document.getElementById('installHint');

  const iosInstructions = document.getElementById('iosInstructions');
  const androidInstructions = document.getElementById('androidInstructions');
  const desktopInstructions = document.getElementById('desktopInstructions');

  // NEW: Dedicated Install Help Modal
  const helpOpenBtn = document.getElementById('openInstallHelpModal');
  const helpModal = document.getElementById('installHelpModal');
  const helpCloseBtn = document.getElementById('installHelpClose');
  const helpInstallBtn = document.getElementById('helpInstallBtn');
  const helpHowBtn = document.getElementById('helpHowBtn');
  const helpHint = document.getElementById('helpHint');
  const helpIos = document.getElementById('helpIos');
  const helpAndroid = document.getElementById('helpAndroid');
  const helpDesktop = document.getElementById('helpDesktop');
  const helpBrowserNote = document.getElementById('helpBrowserNote');

  // Optional: a loader element (not required). If you add one, use id="loader"
  const loader = document.getElementById('loader');

  // --- Platform detection
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isDesktopChromeOrEdge = /Chrome|Edg\//.test(ua) && !/Mobile/.test(ua);
  const isDuckDuckGo = /DuckDuckGo/i.test(ua);
  const isFirefox = /Firefox\//i.test(ua);

  // --- Install prompt handling (works alongside app.js if present)
  let deferredPrompt = window.deferredPrompt || null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.deferredPrompt = e;
    // Show inline panel if we're on the success screen
    if (installPanel) installPanel.style.display = 'block';
    if (installHint) installHint.textContent = 'Tap Install App to add it to your device.';
  });

  window.addEventListener('appinstalled', () => {
    try { localStorage.setItem('pwa-installed', 'true'); } catch {}
    if (installPanel) installPanel.style.display = 'none';
    if (installHint) installHint.textContent = '';
    if (helpModal) closeHelpModal();
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
  const apiUrl = '/api/systeme/register';
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

  function showPlatformInstructionsInline() {
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

  function resetHelpSteps() {
    if (helpIos) helpIos.style.display = 'none';
    if (helpAndroid) helpAndroid.style.display = 'none';
    if (helpDesktop) helpDesktop.style.display = 'none';
  }

  function openHelpModal() {
    if (!helpModal) return;
    // Hint for all platforms
    if (helpHint) {
      helpHint.textContent = isIOS && isSafari
        ? 'Use Share → Add to Home Screen'
        : isAndroid
        ? 'Use ⋮ → Install app (or Add to Home screen)'
        : isDesktopChromeOrEdge
        ? 'Use the address-bar Install icon or Menu → Install app'
        : 'If your browser supports installation, use its menu to Install/Add to Home screen.';
    }
    // Unsupported browser note
    if (helpBrowserNote) {
      helpBrowserNote.textContent = (isDuckDuckGo || isFirefox)
        ? 'Note: Some browsers (DuckDuckGo, Firefox) may not show an Install option. Use Chrome/Edge on desktop, Chrome on Android, or Safari on iOS.'
        : '';
    }
    resetHelpSteps();
    helpModal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('cr-modal-open');
  }

  function closeHelpModal() {
    if (!helpModal) return;
    helpModal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('cr-modal-open');
    resetHelpSteps();
  }

  function showPlatformInstructionsInModal() {
    resetHelpSteps();
    if (isIOS && isSafari && helpIos) { helpIos.style.display = 'block'; return; }
    if (isAndroid && helpAndroid) { helpAndroid.style.display = 'block'; }
    if (isDesktopChromeOrEdge && helpDesktop) { helpDesktop.style.display = 'block'; }
  }

  // --- Install button (inline panel, after success)
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
          showPlatformInstructionsInline();
        } finally {
          deferredPrompt = null;
          window.deferredPrompt = null;
        }
      } else {
        showPlatformInstructionsInline();
      }
    });
  }

  // --- Dedicated Install Help Modal wiring
  if (helpOpenBtn) {
    helpOpenBtn.addEventListener('click', openHelpModal);
  }
  helpCloseBtn?.addEventListener('click', closeHelpModal);
  helpModal?.addEventListener('click', (ev) => {
    if (ev.target && ev.target.hasAttribute('data-close-modal')) closeHelpModal();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeHelpModal();
  });

  // Install now from modal
  if (helpInstallBtn) {
    helpInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            try { localStorage.setItem('pwa-install-accepted', Date.now().toString()); } catch {}
            closeHelpModal();
          } else {
            showPlatformInstructionsInModal();
          }
        } catch {
          showPlatformInstructionsInModal();
        } finally {
          deferredPrompt = null;
          window.deferredPrompt = null;
        }
      } else {
        // No native prompt available: show device-specific steps
        showPlatformInstructionsInModal();
      }
    });
  }

  // Show steps for my device (modal)
  helpHowBtn?.addEventListener('click', showPlatformInstructionsInModal);

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

        // Show confirmation & relevant install guidance (still supported after success)
        if (confirmationMessage) {
          confirmationMessage.style.display = 'block';
          showPlatformInstructionsInline();
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
