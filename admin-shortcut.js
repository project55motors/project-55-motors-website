// admin-shortcut.js – FINAL

(function () {
  const ADMIN_URL = "/admin.html";

  function goAdmin() {
    window.location.href = ADMIN_URL;
  }

  // ===== Desktop: Shift + A =====
  document.addEventListener("keydown", function (e) {
    if (e.shiftKey && (e.key === "A" || e.key === "a")) {
      goAdmin();
    }
  });

  // ===== Triple click on logo =====
  window.addEventListener("DOMContentLoaded", () => {
    const logo = document.querySelector("img[alt*='Project'], .logo, #logo");

    if (!logo) return;

    let clicks = 0;
    let timer = null;

    logo.style.cursor = "pointer";

    logo.addEventListener("click", () => {
      clicks++;

      if (clicks >= 3) {
        goAdmin();
        clicks = 0;
        return;
      }

      clearTimeout(timer);
      timer = setTimeout(() => (clicks = 0), 800);
    });

    // ===== Mobile: 5 taps =====
    let taps = 0;
    let tapTimer = null;

    logo.addEventListener("touchend", () => {
      taps++;

      if (taps >= 5) {
        goAdmin();
        taps = 0;
        return;
      }

      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => (taps = 0), 1000);
    });
  });
})();
