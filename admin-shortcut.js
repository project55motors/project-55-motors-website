// admin-shortcut.js

// Enables Admin Login Modal via Shift+A (Desktop) and Triple-Tap on Logo (Touch)



document.addEventListener('DOMContentLoaded', () => {

    const adminModal = document.getElementById('admin-login-modal');

    if (!adminModal) {

        console.warn("Admin modal element not found.");

        return;

    }



    // --- 1. DESKTOP KEYBOARD SHORTCUT (Shift + A) ---

    document.addEventListener('keydown', (e) => {

        if (e.shiftKey && e.key === 'A') {

            e.preventDefault();

            adminModal.style.display = 'block';

        }

    });



    // --- 2. TOUCHSCREEN TRIPLE TAP GESTURE (on Logo) ---

    

    // Find the logo element (assuming the logo has the class 'logo' or an ID)

    const logoElement = document.querySelector('.logo') || document.querySelector('nav img'); 

    

    if (!logoElement) {

        console.warn("Logo element not found for touch gesture.");

        return;

    }



    let tapCount = 0;

    let lastTapTime = 0;

    const maxTapInterval = 400; // Time (in ms) between taps to count as a sequence



    logoElement.addEventListener('click', (e) => {

        // Stop default action (like navigating home)

        e.preventDefault(); 

        

        const currentTime = new Date().getTime();



        if (currentTime - lastTapTime < maxTapInterval) {

            // Consecutive tap detected

            tapCount++;

        } else {

            // Reset counter if too slow, or if this is the first tap

            tapCount = 1;

        }



        lastTapTime = currentTime;



        if (tapCount === 3) {

            // Triple tap achieved!

            tapCount = 0; // Reset for next use

            adminModal.style.display = 'block';

        }

    });



});

