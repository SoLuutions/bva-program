        document.addEventListener('DOMContentLoaded', function () {
            const form = document.getElementById('registrationForm');
            const confirmationMessage = document.getElementById('confirmationMessage');
            const loader = document.getElementById('loader');
            const appLink = document.getElementById('appLink');

            form.addEventListener('submit', function (e) {
                e.preventDefault();

                // Reset errors
                document.querySelectorAll('.error-message').forEach(el => {
                    el.style.display = 'none';
                });

                // Get form values
                const name = document.getElementById('name').value.trim();
                const email = document.getElementById('email').value.trim();
                const company = document.getElementById('company').value.trim();
                const phone = document.getElementById('phone').value.trim();

                // Validate form
                let isValid = true;

                if (!name) {
                    document.getElementById('name-error').style.display = 'block';
                    isValid = false;
                }

                if (!email || !validateEmail(email)) {
                    document.getElementById('email-error').style.display = 'block';
                    isValid = false;
                }

                if (!isValid) return;

                // Show loader
                loader.style.display = 'block';

                // In a real implementation, you would send this data to your backend
                // Here we simulate API call with setTimeout
                setTimeout(() => {
                    // Hide form, show confirmation
                    form.closest('.registration-card').style.display = 'none';
                    confirmationMessage.style.display = 'block';

                    // Redirect after 3 seconds
                    setTimeout(() => {
                        window.location.href = 'https://command-results.passion.io/app/products/285969';
                    }, 3000);
                }, 1500);
            });

            function validateEmail(email) {
                const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return re.test(String(email).toLowerCase());
            }
        });