// admin-shortcut.js — Simple, reliable staff access
// Shift + A  → admin.html
// Triple-click logo → admin.html

document.addEventListener("DOMContentLoaded", () => {
    const goAdmin = () => {
        window.location.href = "admin.html";
    };

    // Keyboard shortcut: Shift + A
    document.addEventListener("keydown", (e) => {
        if (e.shiftKey && e.key.toLowerCase() === "a") {
            e.preventDefault();
            goAdmin();
        }
    });

    // Triple-click on logo (hero or nav)
    const logos = document.querySelectorAll(".hero-logo, .main-nav img, nav img");
    logos.forEach((logo) => {
        let clicks = 0;
        let timer = null;

        logo.addEventListener("click", () => {
            clicks++;
            if (clicks === 3) {
                goAdmin();
            }
            clearTimeout(timer);
            timer = setTimeout(() => {
                clicks = 0;
            }, 600);
        });
    });
});
