// admin-shortcut.js – FINAL VERSION
// Project 55 Motors – Hidden Admin Access
// Triple-click the logo to open the admin dashboard
// Safe, clean, and duplication-proof

(function () {

    let clickCount = 0;
    let clickTimer = null;

    // Try multiple logo targets safely
    const logo =
        document.querySelector(".logo img") ||
        document.querySelector("header img") ||
        document.querySelector("img[src*='logo']");

    if (!logo) {
        console.warn("Admin shortcut: Logo not found.");
        return;
    }

    // Add small hint in dev tools only
    logo.setAttribute("title", "Project 55 Motors");

    logo.addEventListener("click", () => {
        clickCount++;

        // Reset timer every click
        if (clickTimer) clearTimeout(clickTimer);

        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 700); // 0.7s window

        if (clickCount === 3) {
            clickCount = 0;

            console.log("🔓 Admin shortcut triggered");

            // Prevent accidental multiple triggers
            setTimeout(() => {
                window.location.href = "/admin-dashboard.html";
            }, 50);
        }
    });

})();
