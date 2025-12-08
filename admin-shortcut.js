// admin-shortcut.js
(function () {
    // Keyboard: Shift + A
    document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "a" && e.shiftKey) {
            window.location.href = "/admin-dashboard.html";
        }
    });

    // Optional: triple-click logo behaviour
    const logo = document.querySelector(".site-logo, .brand-logo, .nav-logo");
    if (!logo) return;

    let clickCount = 0;
    let clickTimer;

    logo.addEventListener("click", () => {
        clickCount += 1;
        if (clickCount === 3) {
            window.location.href = "/admin-dashboard.html";
        }

        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 650);
    });
})();
