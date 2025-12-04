// admin-shortcut.js
// Shift + A  → admin.html
// Triple-click hero logo → admin.html

document.addEventListener("DOMContentLoaded", () => {
  const goAdmin = () => {
    window.location.href = "admin.html";
  };

  // Keyboard: Shift + A
  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      goAdmin();
    }
  });

  // Triple-click logo
  const logo = document.querySelector(".hero-logo") ||
               document.querySelector('img[alt*="Project 55"]');

  if (!logo) return;

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
