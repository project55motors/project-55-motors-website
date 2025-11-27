// admin-shortcut.js – FINAL FIXED VERSION (NO workers.dev, NO duplication)



document.addEventListener('DOMContentLoaded', () => {



  const adminModal  = document.getElementById('admin-login-modal');

  const adminForm   = document.getElementById('admin-login-form');

  const adminError  = document.getElementById('admin-login-error');

  const closeButton = document.querySelector('#admin-login-modal .modal-close');



  // ✅ Main API route

  const WORKER_BASE = 'https://project55motors.co.uk/api';



  if (!adminModal || !adminForm) {

    console.warn("Admin elements not found on this page");

    return;

  }



  function hideAdminModal() {

    adminModal.style.display = 'none';

    adminError.style.display = 'none';

    adminForm.reset();

  }



  /* ---------- KEYBOARD SHORTCUT ---------- */

  document.addEventListener('keydown', e => {

    if (e.shiftKey && e.key.toLowerCase() === 'a') {

      e.preventDefault();

      adminModal.style.display = 'flex';

      console.log('Admin modal opened by Shift + A');

    }

  });



  /* ---------- LOGO MULTI-SELECT (FIXES YOUR ISSUE) ---------- */

  setTimeout(() => {



    const possibleLogos = [

      document.querySelector('.logo img'),

      document.querySelector('nav img'),

      document.querySelector('img[src*="logo"]'),

      document.querySelector('header img'),

    ];



    const logo = possibleLogos.find(el => el !== null);



    console.log('Admin logo found:', logo);



    if (!logo) {

      console.warn("Logo not found for triple click");

      return;

    }



    let taps = 0;



    logo.addEventListener('click', () => {

      taps++;

      console.log('Logo clicks:', taps);



      clearTimeout(logo._timer);



      logo._timer = setTimeout(() => {

        taps = 0;

      }, 600);



      if (taps === 3) {

        taps = 0;

        console.log('ADMIN OPEN (triple click)');

        adminModal.style.display = 'flex';

      }

    });



  }, 400);



  /* ---------- CLOSE MODAL ---------- */

  closeButton?.addEventListener('click', (e) => {

    e.preventDefault();

    hideAdminModal();

  });



  adminModal.addEventListener('click', (e) => {

    if (e.target === adminModal) {

      hideAdminModal();

    }

  });



  /* ---------- LOGIN ---------- */

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

        console.error('Login failed:', response.status, result);

        adminError.textContent = result.error || 'Login failed';

        adminError.style.display = 'block';

        adminForm.password.value = '';

      }



    } catch (err) {

      console.error('Login error:', err);

      adminError.textContent = 'Connection error';

      adminError.style.display = 'block';

    }

  });



});