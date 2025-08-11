
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const companyEl = document.getElementById('company');
    const phoneEl = document.getElementById('phone');
  
    const loader = document.getElementById('loader'); // e.g., a spinner
    const confirmationMessage = document.getElementById('confirmationMessage');
    const card = document.querySelector('.registration-card'); // optional
  
    const submitBtn = form?.querySelector('[type="submit"]');
  
    function validateEmail(email) {
      // simple email check
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
  
    function setLoading(isLoading) {
      if (submitBtn) submitBtn.disabled = isLoading;
      if (loader) loader.style.display = isLoading ? 'block' : 'none';
    }
  
    async function submitToApi(payload) {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      const data = await resp.json().catch(() => ({}));
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
  
      // front-end validation (still validate on server!)
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
  
        // success UI
        if (card) card.style.display = 'none';
        if (confirmationMessage) confirmationMessage.style.display = 'block';
  
        // redirect after 3s (change if you like)
        setTimeout(() => {
          window.location.href = 'https://command-results.passion.io/app/products/285969';
        }, 3000);
      } catch (err) {
        console.error(err);
        alert(err.message || 'Sorry, something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  });
  