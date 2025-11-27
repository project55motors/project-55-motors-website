// admin-shortcut.js — FINAL (NO workers.dev, uses /api)



document.addEventListener('DOMContentLoaded', () => {

  const adminModal  = document.getElementById('admin-login-modal');

  const adminForm   = document.getElementById('admin-login-form');

  const adminError  = document.getElementById('admin-login-error');

  const closeButton = document.querySelector('#admin-login-modal .modal-close');



  // ✅ Using your routed worker ONLY

  const WORKER_BASE = '/api';



  if (!adminModal || !adminForm) return;



  const hideAdminModal = () => {

    adminModal.style.display = 'none';

    adminError.style.display = 'none';

    adminForm.reset();

  };



  // ───────── OPEN MODAL (Shift + A) ─────────

  document.addEventListener('keydown', e => {

    if (e.shiftKey && e.key.toLowerCase() === 'a') {

      e.preventDefault();

      adminModal.style.display = 'flex';

    }

  });



  // ───────── OPEN MODAL (Triple click logo) ─────────

  setTimeout(() => {

    const logo =

      document.querySelector('.logo img') ||

      document.querySelector('nav img') ||

      document.querySelector('img[src="logo.png"]') ||

      document.querySelector('img[src="/logo.png"]');



    console.log('ADMIN LOGO FOUND:', logo);



    if (!logo) return;



    let taps = 0;



    logo.addEventListener('click', () => {

      taps++;

      clearTimeout(logo._timer);



      logo._timer = setTimeout(() => (taps = 0), 600);



      if (taps === 3) {

        taps = 0;

        console.log('ADMIN MODAL OPENED (triple click)');

        adminModal.style.display = 'flex';

      }

    });

  }, 500);



  // ───────── CLOSE MODAL ─────────

  closeButton?.addEventListener('click', e => {

    e.preventDefault();

    hideAdminModal();

  });



  adminModal.addEventListener('click', e => {

    if (e.target === adminModal) hideAdminModal();

  });



  // ───────── LOGIN HANDLER ─────────

  adminForm.addEventListener('submit', async (e) => {

    e.preventDefault();



    const username = adminForm.username.value.trim();

    const password = adminForm.password.value;



    adminError.style.display = 'none';

    adminError.textContent = '';



    try {

      const response = await fetch(`${WORKER_BASE}/login`, {

        method: 'POST',

        credentials: 'include',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ username, password })

      });



      const result = await response.json().catch(() => ({}));



      if (response.ok && result.success) {

        hideAdminModal();

        window.location.href = '/admin-dashboard.html';

      } else {

        adminError.textContent =

          result.error || 'Login failed – check username or password';

        adminError.style.display = 'block';

        adminForm.password.value = '';

      }



    } catch (err) {

      console.error('Network / Worker error:', err);

      adminError.textContent = 'Network error – Worker unreachable';

      adminError.style.display = 'block';

    }

  });

});