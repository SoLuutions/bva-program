// registration.js (updated to stop auto-redirect and guide install)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const companyEl = document.getElementById('company');
    const phoneEl = document.getElementById('phone');
  
    const loader = document.getElementById('loader');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const card = document.querySelector('.registration-card');
  
    // New install panel elements
    const installPanel = document.getElementById('installPanel');
    const installBtn = document.getElementById('installAppBtn');
    const iosInstructions = document.getElementById('iosInstructions');
    const installHint = document.getElementById('installHint');
  
    let deferredPrompt = null;
  
    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
  
    function setLoading(isLoading) {
      const submitBtn = form?.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = isLoading;
      if (loader) loader.style.display = isLoading ? 'block' : 'none';
    }
  
    // Capture install prompt when available (Android/desktop Chrome-like)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installPanel) installPanel.style.display = 'block';
      if (installHint) installHint.textContent = 'Tap Install App to add it to your home screen.';
    });
  
    // Basic iOS Safari detection for manual steps
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
    installBtn?.addEventListener('click', async () => {
      // If the browser supports the PWA prompt (non-iOS typically)
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice.outcome === 'accepted') {
            if (installHint) installHint.textContent = 'Installed! You can now open the app from your home screen.';
          } else {
            if (installHint) installHint.textContent = 'Installation dismissed. You can try again anytime.';
          }
        } catch {
          if (installHint) installHint.textContent = 'Installation prompt failed. You can try again later.';
        }
        return;
      }
  
      // No prompt (likely iOS Safari) — show manual instructions
      if (isIOS && isSafari) {
        if (iosInstructions) iosInstructions.style.display = 'block';
        if (installHint) installHint.textContent = 'Follow the steps below to add the app to your home screen.';
      } else {
        // Fallback for other unsupported combos
        if (installHint) installHint.textContent = 'Your browser may not support installation prompts. Try another browser or add manually.';
      }
    });
  
    async function submitToApi(payload) {
      // Original logging trimmed for clarity; keep if you need it
      const apiUrl = '/api/register';
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });
  
      const responseText = await resp.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Server returned invalid JSON response');
      }
  
      if (!resp.ok || !data.ok) {
        const msg = data?.error || `Request failed (${resp.status})`;
        throw new Error(msg);
      }
      return data;
    }
  
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const name = nameEl?.value.trim();
      const email = emailEl?.value.trim();
      const company = companyEl?.value.trim() || null;
      const phone = phoneEl?.value.trim() || null;
  
      // Front-end validation
      if (!name) {
        alert('Please enter your name.');
        nameEl?.focus();
        return;
      }
      if (!email || !validateEmail(email)) {
        alert('Please enter a valid email.');
        emailEl?.focus();
        return;
      }
  
      setLoading(true);
  
      try {
        await submitToApi({ name, email, company, phone });
  
        // Success UI (no auto-redirect)
        if (card) card.style.display = 'none';
        if (confirmationMessage) confirmationMessage.style.display = 'block';
  
        // Show install guidance:
        // - If we captured a prompt, show the install panel with the Install button
        // - If on iOS Safari, show manual steps
        if (deferredPrompt) {
          if (installPanel) installPanel.style.display = 'block';
          if (installHint) installHint.textContent = 'Tap Install App to add it to your home screen.';
        } else if (isIOS && isSafari) {
          if (installPanel) installPanel.style.display = 'block';
          if (iosInstructions) iosInstructions.style.display = 'block';
          if (installHint) installHint.textContent = 'Follow the steps below to add it to your home screen.';
        } else {
          if (installPanel) installPanel.style.display = 'block';
          if (installHint) installHint.textContent = 'If your browser supports PWA, it will show an install option.';
        }
  
        // NOTE: removed the 3s redirect from the original file:contentReference[oaicite:7]{index=7}
        // Users can use the "Open the app" link in the confirmation block at their own pace.
      } catch (err) {
        alert(err.message || 'Sorry, something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  });
  