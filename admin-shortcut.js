document.addEventListener("DOMContentLoaded", () => {

  const adminModal = document.getElementById("admin-login-modal");
  const adminForm  = document.getElementById("admin-login-form");
  const adminError = document.getElementById("admin-login-error");

  const WORKER = "/api"; // admin-worker is routed to /api

  if (!adminModal || !adminForm) return;

  /* ---------- TRIPLE CLICK LOGO ---------- */

  setTimeout(() => {
    const logo =
      document.querySelector(".logo img") ||
      document.querySelector("nav img") ||
      document.querySelector('img[src="logo.png"]');

    if (!logo) return;

    let taps = 0;

    logo.addEventListener("click", () => {
      taps++;
      clearTimeout(logo._timer);

      logo._timer = setTimeout(() => (taps = 0), 600);

      if (taps === 3) {
        taps = 0;
        adminModal.style.display = "flex";
      }
    });

  }, 500);

  /* ---------- SHIFT + A ---------- */

  document.addEventListener("keydown", e => {
    if (e.shiftKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      adminModal.style.display = "flex";
    }
  });

  const hideModal = () => {
    adminModal.style.display = "none";
    adminError.style.display = "none";
    adminForm.reset();
  };

  adminModal.addEventListener("click", e => {
    if (e.target === adminModal) hideModal();
  });

  /* ---------- LOGIN ---------- */

  adminForm.addEventListener("submit", async e => {
    e.preventDefault();

    const username = adminForm.username.value.trim();
    const password = adminForm.password.value;

    try {
      const res = await fetch(`${WORKER}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok && result.success) {
        hideModal();
        window.location.href = "/admin-dashboard.html";
      } else {
        adminError.textContent = result.error || "Login failed";
        adminError.style.display = "block";
      }

    } catch (err) {
      console.error(err);
      adminError.textContent = "Network error – worker unreachable";
      adminError.style.display = "block";
    }
  });
});
