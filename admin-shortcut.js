// admin-shortcut.js — FINAL (Shift+A + triple-click logo, uses /api on your domain)



document.addEventListener('DOMContentLoaded', () => {

  const adminModal  = document.getElementById('admin-login-modal');

  const adminForm   = document.getElementById('admin-login-form');

  const adminError  = document.getElementById('admin-login-error');

  const closeButton = document.querySelector('#admin-login-modal .modal-close');



  // Live Worker base (Cloudflare route): https://project55motors.co.uk/api/*

  const WORKER_BASE = 'https://project55motors.co.uk/api';



  // If a page doesn't have the modal + form, do nothing

  if (!adminModal || !adminForm) return;



  const hideAdminModal = () => {

    adminModal.style.display = 'none';

    if (adminError) {

      adminError.style.display = 'none';

      adminError.textContent = '';

    }

    adminForm.reset();

  };



  const showAdminModal = () => {

    adminModal.style.display = 'flex';

  };



  /* ───────── OPEN MODAL (Shift+A) ───────── */



  document.addEventListener('keydown', e => {

    if (e.shiftKey && e.key.toLowerCase() === 'a') {

      e.preventDefault();

      showAdminModal();

    }

  });



  /* ───────── TRIPLE-CLICK LOGO ───────── */



  let logo = null;



  // Delay a little so the logo is definitely in the DOM

  setTimeout(() => {

    logo =

      document.querySelector('.logo img') ||

      document.querySelector('nav img') ||

      document.querySelector('img[src="logo.png"]');



    if (!logo) return;



    let taps = 0;



    logo.addEventListener('click', () => {

      taps++;



      clearTimeout(logo._tapTimer);

      logo._tapTimer = setTimeout(() => {

        taps = 0;

      }, 600);



      if (taps === 3) {

        taps = 0;

        showAdminModal();

      }

    });

  }, 500);



  /* ───────── CLOSE MODAL (X + backdrop click) ───────── */



  if (closeButton) {

    closeButton.addEventListener('click', e => {

      e.preventDefault();

      hideAdminModal();

    });

  }



  adminModal.addEventListener('click', e => {

    if (e.target === adminModal) {

      hideAdminModal();

    }

  });



  /* ───────── LOGIN HANDLER ───────── */



  adminForm.addEventListener('submit', async e => {

    e.preventDefault();



    const username = adminForm.username.value.trim();

    const password = adminForm.password.value;



    if (adminError) {

      adminError.style.display = 'none';

      adminError.textContent = '';

    }



    try {

      const response = await fetch(`${WORKER_BASE}/login`, {

        method: 'POST',

        credentials: 'include', // required so the cookie comes back

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ username, password })

      });



      const result = await response.json().catch(() => ({}));



      if (response.ok && result.success) {

        hideAdminModal();

        window.location.href = '/admin-dashboard.html';

      } else {

        if (adminError) {

          adminError.textContent =

            result.error || 'Login failed – check username or password';

          adminError.style.display = 'block';

        }

        adminForm.password.value = '';

      }

    } catch (err) {

      console.error('Network / CORS error:', err);

      if (adminError) {

        adminError.textContent = 'Network error – unable to reach admin service';

        adminError.style.display = 'block';

      }

    }

  });

});