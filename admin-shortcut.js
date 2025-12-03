
// admin-shortcut.js — 2025 FINAL VERSION
console.log("Admin shortcut loaded (global-safe mode)");

/* ============================================================
   1) ALWAYS ENABLE SHIFT + A (works on every page)
============================================================ */
document.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key.toLowerCase() === "a") {
        openAdminModal();
    }
});

/* ============================================================
   2) TRIPLE-CLICK LOGO (robust selectors for new header layout)
============================================================ */

// We search for ALL possible logo placements
function findLogo() {
    return document.querySelector(`
        .hero-logo,          /* homepage & banner pages */
        header img,          /* fallback */
        nav img,             /* older layout compatibility */
        .logo img,
        #p55-logo
    `);
}

function attachLogoListener() {
    const logo = findLogo();

    if (!logo) {
        console.warn("Admin shortcut: Logo not found yet. Retrying...");
        setTimeout(attachLogoListener, 500);
        return;
    }

    console.log("Admin shortcut: Logo detected → triple-click enabled.");

    let clicks = 0;
    let timer = null;

    logo.addEventListener("click", () => {
        clicks++;
        if (clicks >= 3) {
            openAdminModal();
            clicks = 0;
            clearTimeout(timer);
        }

        timer = setTimeout(() => (clicks = 0), 500);
    });
}

attachLogoListener();

/* ============================================================
   3) OPEN THE LOGIN MODAL
============================================================ */
function openAdminModal() {
    const modal = document.getElementById("admin-login-modal");

    if (modal) {
        modal.style.display = "flex";
        console.log("Admin modal opened.");
    } else {
        console.error("Admin modal not found in DOM.");
        alert("Admin login modal not found on this page.");
    }
}
