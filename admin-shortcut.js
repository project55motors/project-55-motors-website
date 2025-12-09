// admin-shortcut.js – Shift+A and triple-click logo → admin dashboard

(function () {
  // Keyboard: Shift + A
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "a" && e.shiftKey) {
      window.location.href = "/admin-dashboard.html";
    }
  });

  // Triple-click / triple-tap logo
  const logo =
    document.querySelector(".hero-logo, .site-logo, .brand-logo, .nav-logo, .admin-brand-logo");

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
