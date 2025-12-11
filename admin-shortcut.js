// admin-shortcut.js — site-wide hidden staff login for Project 55 Motors

(function () {
  const MODAL_ID = "adminLoginModal";

  function getModal() {
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      // Fallback minimal modal if page doesn't define one
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      modal.className = "modal";
      modal.style.display = "none";
      modal.innerHTML = `
        <div class="modal-content">
          <span class="modal-close" data-admin-close>&times;</span>
          <h2>Staff Login</h2>
          <form id="adminLoginForm">
            <input id="adminUser" type="text" placeholder="Username" required />
            <input id="adminPass" type="password" placeholder="Password" required />
            <button type="submit" class="modal-login-btn">Log In</button>
          </form>
          <p id="admin-login-error" class="modal-error" style="display:none;"></p>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      // Ensure it starts hidden
      if (!modal.style.display || modal.style.display === "block" || modal.style.display === "flex") {
        modal.style.display = "none";
      }
    }
    return modal;
  }

  function openModal() {
    const modal = getModal();
    modal.style.display = "flex";
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.style.display = "none";
  }

  async function submitAdminLogin(event) {
    if (event) event.preventDefault();

    const userEl = document.getElementById("adminUser");
    const passEl = document.getElementById("adminPass");
    const errorBox = document.getElementById("admin-login-error");

    if (!userEl || !passEl || !errorBox) {
      alert("Login form not available on this page.");
      return;
    }

    const username = userEl.value.trim();
    const password = passEl.value.trim();

    errorBox.style.display = "none";
    errorBox.textContent = "";

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        // Cookie is set by Worker; now go to dashboard
        closeModal();
        window.location.href = "/admin-dashboard";
      } else {
        errorBox.style.display = "block";
        errorBox.textContent = "Incorrect login.";
      }
    } catch (err) {
      console.error("Admin login error:", err);
      errorBox.style.display = "block";
      errorBox.textContent = "Network error, please try again.";
    }
  }

  function attachHandlers() {
    const modal = getModal();

    // Close handler (click on X or backdrop)
    modal.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-admin-close") || e.target === modal) {
        closeModal();
      }
    });

    const form = modal.querySelector("form") || document.getElementById("adminLoginForm");
    if (form) {
      form.addEventListener("submit", submitAdminLogin);
    }

    // Secret triggers: Shift + A and triple-click on hero-logo/admin-brand
    let keyBuffer = [];
    document.addEventListener("keydown", (e) => {
      keyBuffer.push(e.code);
      keyBuffer = keyBuffer.slice(-2);
      if (
        keyBuffer.join(",") === "ShiftLeft,KeyA" ||
        keyBuffer.join(",") === "ShiftRight,KeyA"
      ) {
        openModal();
      }
    });

    document.addEventListener("click", (e) => {
      if (
        e.detail === 3 &&
        (e.target.classList.contains("hero-logo") ||
         e.target.closest(".hero-logo") ||
         e.target.classList.contains("admin-brand") ||
         e.target.closest(".admin-brand"))
      ) {
        openModal();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachHandlers);
  } else {
    attachHandlers();
  }

  // Expose for inline HTML (your existing markup)
  window.submitAdminLogin = submitAdminLogin;
  window.closeAdminModal = closeModal;
})();
