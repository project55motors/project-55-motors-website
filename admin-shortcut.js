// admin-shortcut.js - FINAL WORKING VERSION
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("admin-login-modal");
  const form = document.getElementById("admin-login-form");
  const error = document.getElementById("admin-login-error");
  if (!modal || !form) return;

  const hide = () => {
    modal.style.display = "none";
    error.style.display = "none";
    form.reset();
  };

  // Shift+A or triple-tap logo
  document.addEventListener("keydown", e => {
    if (e.shiftKey && e.key === "A") {
      e.preventDefault();
      modal.style.display = "flex";
    }
  });

  // Login submit
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;

    try {
      const res = await fetch("https://admin-worker.nathan-ed2.workers.dev/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        hide();
        location.href = "/admin-dashboard.html";
      } else {
        error.textContent = "Wrong credentials";
        error.style.display = "block";
      }
    } catch {
      error.textContent = "Network error - check Worker URL";
      error.style.display = "block";
    }
  });

  // Close modal
  modal.addEventListener("click", e => {
    if (e.target === modal) hide();
  });
});