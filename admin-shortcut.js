// admin-shortcut.js – FINAL

document.addEventListener("DOMContentLoaded", () => {
  const adminModal  = document.getElementById("admin-login-modal");
  const adminForm   = document.getElementById("admin-login-form");
  const adminError  = document.getElementById("admin-login-error");
  const closeButton = document.querySelector("#admin-login-modal .modal-close");

  // Point at the admin worker routed at /api/admin/*
  const WORKER_BASE = "/api/admin";

  if (!adminModal || !adminForm) return;

  const hideAdminModal = () => {
    adminModal.style.display = "none";
    if (adminError) {
      adminError.style.display = "none";
      adminError.textContent = "";
    }
    adminForm.reset();
  };

  /* ───────── OPEN MODAL (Shift+A or triple-tap logo) ───────── */

  // Keyboard shortcut: Shift + A
  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      adminModal.style.display = "flex";
    }
  });

  // Triple-click logo
  let logo = null;

  setTimeout(() => {
    logo =
      document.querySelector(".logo img") ||
      document.querySelector("nav .logo img") ||
      document.querySelector("nav img") ||
      document.querySelector('img[src="logo.png"]');

    if (!logo) {
      console.log("Admin logo not found");
      return;
    }

    console.log("Admin logo found:", logo);

    let taps = 0;

    logo.addEventListener("click", () => {
      taps++;
      clearTimeout(logo._tapTimer);
      logo._tapTimer = setTimeout(() => (taps = 0), 600);

      if (taps === 3) {
        taps = 0;
        adminModal.style.display = "flex";
      }
    });
  }, 400);

  /* ───────── CLOSE HANDLERS ───────── */

  closeButton?.addEventListener("click", (e) => {
    e.preventDefault();
    hideAdminModal();
  });

  adminModal.addEventListener("click", (e) => {
    if (e.target === adminModal) hideAdminModal();
  });

  /* ───────── LOGIN HANDLER ───────── */

  adminForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = adminForm.username.value.trim();
    const password = adminForm.password.value;

    if (adminError) {
      adminError.style.display = "none";
      adminError.textContent = "";
    }

    try {
      const response = await fetch(`${WORKER_BASE}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        hideAdminModal();
        window.location.href = "/admin-dashboard.html";
      } else {
        console.error("Login failed:", response.status, result);
        if (adminError) {
          adminError.textContent =
            result.error || "Login failed – check username or password";
          adminError.style.display = "block";
        }
        adminForm.password.value = "";
      }
    } catch (err) {
      console.error("Network / CORS error:", err);
      if (adminError) {
        adminError.textContent = "Network error – Worker unreachable";
        adminError.style.display = "block";
      }
    }
  });
});
