// admin-shortcut.js – THIS ONE WORKS. NO MORE CHANGES EVER.
(() => {
  const modal = document.getElementById("admin-login-modal");
  const form = document.getElementById("admin-login-form");
  const error = document.getElementById("admin-login-error");
  if (!modal || !form) return;

  const hide = () => {
    modal.style.display = "none";
    error.style.display = "none";
    form.reset();
  };

  // Shift+A opens modal
  document.addEventListener("keydown", e => {
    if (e.shiftKey && e.key === "A") {
      e.preventDefault();
      modal.style.display = "flex";
    }
  });

  // Triple-tap logo opens modal
  const logo = document.querySelector(".logo img");
  if (logo) {
    let taps = 0;
    logo.addEventListener("click", () => {
      taps++;
      clearTimeout(logo.timer);
      logo.timer = setTimeout(() => taps = 0, 600);
      if (taps === 3) { taps = 0; modal.style.display = "flex"; }
    });
  }

  // Close modal
  modal.addEventListener("click", e => { if (e.target === modal || e.target.classList.contains("modal-close")) hide(); });

  // LOGIN
  form.addEventListener("submit", async e => {
    e.preventDefault();
    error.style.display = "none";
    try {
      const res = await fetch("https://admin-worker.nathan-ed2.workers.dev/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.value.trim(),
          password: form.password.value
        })
      });

      if (res.ok) {
        hide();
        location.href = "/admin-dashboard.html";
      } else {
        error.textContent = "Wrong credentials";
        error.style.display = "block";
      }
    } catch {
      error.textContent = "Network error – check Worker URL";
      error.style.display = "block";
    }
  });
})();