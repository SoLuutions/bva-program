document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const companyEl = document.getElementById('company');
    const phoneEl = document.getElementById('phone');
  
    const loader = document.getElementById('loader');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const card = document.querySelector('.registration-card');
  
    const submitBtn = form?.querySelector('[type="submit"]');
  
    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
  
    function setLoading(isLoading) {
      if (submitBtn) submitBtn.disabled = isLoading;
      if (loader) loader.style.display = isLoading ? 'block' : 'none';
    }

    async function submitToApi(payload) {
      console.log('🔍 Submitting payload:', payload);
      console.log('🌐 Current URL:', window.location.href);
      console.log('🔗 API endpoint will be:', window.location.origin + '/api/register');
      
      try {
        const apiUrl = '/api/register';
        console.log('📡 Making fetch request to:', apiUrl);
        
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
        });

        console.log('📥 Response status:', resp.status);
        console.log('📥 Response ok:', resp.ok);
        console.log('📥 Response headers:', [...resp.headers.entries()]);
        
        // Try to get response text first to see what we actually received
        const responseText = await resp.text();
        console.log('📥 Raw response:', responseText);
        
        let data = {};
        try {
          data = JSON.parse(responseText);
          console.log('📥 Parsed response data:', data);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON response:', parseError);
          console.log('📄 Response was not JSON, raw content:', responseText);
          throw new Error('Server returned invalid JSON response');
        }

        if (!resp.ok || !data.ok) {
          const msg = data?.error || `Request failed (${resp.status})`;
          console.error('❌ API Error:', msg);
          throw new Error(msg);
        }
        
        console.log('✅ API Success:', data);
        return data;
      } catch (fetchError) {
        console.error('❌ Fetch Error:', fetchError);
        console.error('❌ Error details:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
        throw fetchError;
      }
    }
  
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('🚀 Form submitted');
  
      const name = nameEl?.value.trim();
      const email = emailEl?.value.trim();
      const company = companyEl?.value.trim() || null;
      const phone = phoneEl?.value.trim() || null;

      console.log('📝 Form data:', { name, email, company, phone });
  
      // Front-end validation
      if (!name) {
        console.log('❌ Validation failed: No name');
        alert('Please enter your name.');
        nameEl?.focus();
        return;
      }
      if (!email || !validateEmail(email)) {
        console.log('❌ Validation failed: Invalid email');
        alert('Please enter a valid email.');
        emailEl?.focus();
        return;
      }

      console.log('✅ Validation passed');
      setLoading(true);
  
      try {
        const result = await submitToApi({ name, email, company, phone });
        console.log('🎉 Registration successful:', result);
  
        // Success UI
        if (card) card.style.display = 'none';
        if (confirmationMessage) confirmationMessage.style.display = 'block';
  
        // Redirect after 3s
        setTimeout(() => {
          console.log('🔄 Redirecting to app...');
          window.location.href = 'https://command-results.passion.io/app/products/285969';
        }, 3000);
      } catch (err) {
        console.error('💥 Registration failed:', err);
        alert(err.message || 'Sorry, something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  });