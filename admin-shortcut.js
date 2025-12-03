// ------------------------------------------------------------
//  admin-shortcut.js — Hidden Admin Portal Access
// ------------------------------------------------------------

let adminTapCount = 0;
let adminTapTimer = null;

/* ------------------------------------------------------------
   1. SHIFT + A (Desktop Shortcut)
------------------------------------------------------------ */
document.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key.toLowerCase() === "a") {
        console.log("Admin shortcut: Shift + A");
        window.location.href = "admin.html";
    }
});

/* ------------------------------------------------------------
   2. TRIPLE-TAP LOGO (Mobile + Desktop)
------------------------------------------------------------ */

function bindLogoTrigger() {
    const logo = document.querySelector(".hero-logo");
    if (!logo) {
        // Retry if logo isn't loaded yet
        setTimeout(bindLogoTrigger, 300);
        return;
    }

    logo.addEventListener("click", () => {
        adminTapCount++;

        if (adminTapCount === 1) {
            // Reset counter after 700ms
            adminTapTimer = setTimeout(() => {
                adminTapCount = 0;
            }, 700);
        }

        if (adminTapCount >= 3) {
            clearTimeout(adminTapTimer);
            adminTapCount = 0;

            console.log("Admin shortcut: Triple-click Logo");
            window.location.href = "admin.html";
        }
    });
}

// Ensure binding happens after DOM is ready
document.addEventListener("DOMContentLoaded", bindLogoTrigger);
