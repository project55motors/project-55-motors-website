// admin-shortcut.js – FINAL STABLE VERSION FOR PROJECT 55 MOTORS



document.addEventListener("DOMContentLoaded", () => {



  const adminModal = document.getElementById("admin-login-modal");

  const adminForm = document.getElementById("admin-login-form");

  const adminError = document.getElementById("admin-login-error");

  const closeButton = document.querySelector("#admin-login-modal .modal-close");



  if (!adminModal || !adminForm) return;



  // ✅ ONLY worker used everywhere

  const WORKER_BASE = "https://project55motors.co.uk/api";



  // Prevent multiple binds

  if (window.__ADMIN_SHORTCUT_LOADED__) return;

  window.__ADMIN_SHORTCUT_LOADED__ = true;



  function hideModal() {

    adminModal.style.display = "none";

    adminError.style.display = "none";

    adminForm.reset();

  }



  function showModal() {

    adminModal.style.display = "flex";

  }



  /* ============= SHIFT + A ============= */



  document.addEventListener("keydown", (e) => {

    if (e.shiftKey && e.key.toLowerCase() === "a") {

      e.preventDefault();

      showModal();

    }

  });



  /* ============= TRIPLE CLICK LOGO ============= */



  function bindTripleClick() {

    const logo =

      document.querySelector(".logo img") ||

      document.querySelector("nav img") ||

      document.querySelector('img[src="logo.png"]');



    if (!logo) {

      console.warn("Admin logo not found yet. Retrying...");

      setTimeout(bindTripleClick, 500);

      return;

    }



    let taps = 0;



    logo.addEventListener("click", () => {

      taps++;

      clearTimeout(logo._resetTimer);



      logo._resetTimer = setTimeout(() => {

        taps = 0;

      }, 600);



      if (taps === 3) {

        taps = 0;

        console.log("ADMIN MODAL OPEN");

        showModal();

      }

    });



    console.log("✅ Admin logo bound for triple-click");

  }



  bindTripleClick();



  /* ============= CLOSE HANDLERS ============= */



  closeButton?.addEventListener("click", (e) => {

    e.preventDefault();

    hideModal();

  });



  adminModal.addEventListener("click", (e) => {

    if (e.target === adminModal) hideModal();

  });



  /* ============= LOGIN HANDLER ============= */



  adminForm.addEventListener("submit", async (e) => {

    e.preventDefault();



    const username = adminForm.username.value.trim();

    const password = adminForm.password.value;



    adminError.style.display = "none";

    adminError.textContent = "";



    try {

      const res = await fetch(`${WORKER_BASE}/login`, {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ username, password })

      });



      const data = await res.json().catch(() => ({}));



      if (res.ok && data.success) {

        hideModal();

        window.location.href = "/admin-dashboard.html";

      } else {

        adminError.textContent =

          data.error || "Login failed. Please try again.";

        adminError.style.display = "block";

      }



    } catch (err) {

      console.error("Worker error:", err);

      adminError.textContent = "Worker unreachable.";

      adminError.style.display = "block";

    }

  });



});