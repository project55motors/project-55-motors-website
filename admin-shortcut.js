// admin-shortcut.js
console.log("Admin shortcut loaded");

// ALWAYS attach Shift+A (works even if logo is missing)
document.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.key.toLowerCase() === "a") {
    openAdminModal();
  }
});

// Try multiple selectors for the logo to avoid null issues
const logo = document.querySelector("nav img, #p55-logo, header img, .logo img");

if (logo) {
  let clicks = 0;
  let timer = null;

  logo.addEventListener("click", () => {
    clicks++;
    if (clicks === 3) {
      openAdminModal();
      clicks = 0;
      clearTimeout(timer);
    }
    timer = setTimeout(() => (clicks = 0), 400);
  });
} else {
  console.warn("Admin shortcut: No logo found on this page.");
}

// Open admin login modal
function openAdminModal() {
  const modal = document.getElementById("admin-login-modal");
  if (modal) {
    modal.style.display = "flex";
  } else {
    console.error("Admin modal not found in DOM.");
  }
}
