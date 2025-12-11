// admin-shortcut.js – Shift+A + triple-click logo to open admin login

document.addEventListener("DOMContentLoaded", () => {
  const adminModal = document.getElementById("admin-login-modal");
  const adminForm = document.getElementById("admin-login-form");
  const adminError = document.getElementById("admin-login-error");
  const modalClose = adminModal ? adminModal.querySelector(".modal-close") : null;

  function openModal() {
    if (!adminModal) return;
    adminModal.style.display = "flex";
    adminError && (adminError.style.display = "none");
  }

  function closeModal() {
    if (!adminModal) return;
    adminModal.style.display = "none";
  }

  // Shift + A keyboard shortcut
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "a" && e.shiftKey) {
      e.preventDefault();
      openModal();
    }
  });

  // Triple-click / triple-tap on logo
  const logoImg =
    document.querySelector(".logo img") ||
    document.querySelector("nav img") ||
    document.querySelector("header img");

  if (logoImg) {
    let tapCount = 0;
    let lastTapTime = 0;

    const TAP_WINDOW = 700; // ms for 3 taps

    const handleTap = (e) => {
      const now = Date.now();
      if (now - lastTapTime > TAP_WINDOW) {
        tapCount = 0;
      }
      tapCount += 1;
      lastTapTime = now;

      if (tapCount >= 3) {
        tapCount = 0;
        e.preventDefault();
        openModal();
      }
    };

    logoImg.addEventListener("click", handleTap);
    logoImg.addEventListener("touchend", handleTap);
  }

  // Modal close
  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }
  if (adminModal) {
    adminModal.addEventListener("click", (e) => {
      if (e.target === adminModal) {
        closeModal();
      }
    });
  }

  // Login submit
  if (adminForm) {
    adminForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      adminError && (adminError.style.display = "none");

      const formData = new FormData(adminForm);
      const payload = {
        username: formData.get("username"),
        password: formData.get("password")
      };

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          window.location.href = "/admin-dashboard.html";
        } else {
          if (adminError) {
            adminError.textContent = "Login failed – check username or password.";
            adminError.style.display = "block";
          }
        }
      } catch (err) {
        console.error(err);
        if (adminError) {
          adminError.textContent = "Login error – please try again.";
          adminError.style.display = "block";
        }
      }
    });
  }
});
