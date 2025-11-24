// admin-shortcut.js
// Enables Admin Login Modal via Shift+A (Desktop) and Triple-Tap on Logo (Touch)
// Includes functionality to close the modal and handle login (for demonstration)

document.addEventListener('DOMContentLoaded', () => {
    const adminModal = document.getElementById('admin-login-modal');
    const adminForm = document.getElementById('admin-login-form');
    const adminError = document.getElementById('admin-login-error');
    const closeButton = document.querySelector('#admin-login-modal .modal-close');

    if (!adminModal) {
        console.warn("Admin modal element not found.");
        return;
    }

    // --- HELPER FUNCTION: To Hide the Modal ---
    const hideAdminModal = () => {
        adminModal.style.display = 'none';
        adminError.style.display = 'none'; // Clear any error message
        adminForm.reset(); // Clear form fields
    };

    // --- 1. KEYBOARD/TAP SHORTCUTS (Open) ---
    // Desktop: Shift + A
    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key === 'A') {
            e.preventDefault();
            adminModal.style.display = 'flex'; // Use flex to ensure centering
        }
    });

    // Touch: Triple Tap on Logo
    const logoElement = document.querySelector('.logo') || document.querySelector('nav img'); 
    if (logoElement) {
        let tapCount = 0;
        let lastTapTime = 0;
        const maxTapInterval = 400;

        logoElement.addEventListener('click', (e) => {
            e.preventDefault(); 
            const currentTime = new Date().getTime();

            if (currentTime - lastTapTime < maxTapInterval) {
                tapCount++;
            } else {
                tapCount = 1;
            }
            lastTapTime = currentTime;

            if (tapCount === 3) {
                tapCount = 0; 
                adminModal.style.display = 'flex';
            }
        });
    }


    // --- 2. CLOSE MODAL FUNCTIONALITY ---
    if (closeButton) {
        // Stop default link behavior (navigating away) and close the modal
        closeButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            hideAdminModal();
        });
    }

    // Close modal if user clicks outside the content box
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            hideAdminModal();
        }
    });

    
    // --- 3. LOGIN HANDLING FIX (Prevent Clearing, Simulate Success/Failure) ---
    if (adminForm) {
        adminForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Stop the standard form submission (which caused the page to refresh/clear)
            
            const username = e.target.username.value;
            const password = e.target.password.value;
            
            // --- CRITICAL CHANGE: Implement your real login logic here ---
            // For now, we'll simulate a successful login for "admin" / "pass"
            if (username === 'admin' && password === 'pass') {
                // SUCCESS: Log the user in and redirect (or open the admin panel)
                console.log("Login Successful! Redirecting to admin...");
                
                // IMPORTANT: Change the line below to the actual URL of your admin panel
                window.location.href = '/admin-panel.html'; 

            } else {
                // FAILURE: Show error message
                adminError.textContent = 'Invalid username or password.';
                adminError.style.display = 'block';
                e.target.password.value = ''; // Clear only the password field
            }
        });
    }

});