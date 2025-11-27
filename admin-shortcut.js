// admin-shortcut.js — FINAL PRODUCTION VERSION

// ✅ Uses https://project55motors.co.uk/api

// ✅ Shift + A OR triple click logo opens admin

// ✅ No workers.dev anywhere



document.addEventListener('DOMContentLoaded', () => {



  const WORKER_BASE = 'https://project55motors.co.uk/api';



  const adminModal  = document.getElementById('admin-login-modal');

  const adminForm   = document.getElementById('admin-login-form');

  const adminError  = document.getElementById('admin-login-error');

  const closeButton = document.querySelector('#admin-login-modal .modal-close');



  if (!adminModal || !adminForm) {

    console.warn('Admin modal or form not found');

    return;

  }



  /* ───────── UTIL ───────── */



  const hideAdminModal = () => {

    adminModal.style.display = 'none';

    adminError.style.display = 'none';

    adminForm.reset();

  };



  const showAdminModal = () => {

    adminModal.style.display = 'flex';

  };





  /* ───────── OPEN WITH SHIFT + A ───────── */



  document.addEventListener('keydown', e => {

    if (e.shiftKey && e.key.toLowerCase() === 'a') {

      e.preventDefault();

      console.log('Shift + A pressed → Open admin');

      showAdminModal();

    }

  });





  /* ───────── TRIPLE CLICK LOGO ───────── */



  setTimeout(() => {



    const logo =

      document.querySelector('.logo img') ||

      document.querySelector('nav img') ||

      document.querySelector('header img') ||

      document.querySelector('img[src*="logo"]');



    if (!logo) {

      console.warn('Admin logo not found for triple click');

      return;

    }



    console.log('Admin logo found:', logo);



    let taps = 0;



    logo.addEventListener('click', () => {

      taps++;

      console.log('Logo clicks:', taps);



      clearTimeout(logo._tapTimer);

      logo._tapTimer = setTimeout(() => (taps = 0), 600);



      if (taps === 3) {

        taps = 0;

        console.log('3 taps detected → Open admin');

        showAdminModal();

      }

    });



  }, 500);





  /* ───────── CLOSE MODAL ───────── */



  closeButton?.addEventListener('click', e => {

    e.preventDefault();

    hideAdminModal();

  });



  adminModal.addEventListener('click', e => {

    if (e.target === adminModal) hideAdminModal();

  });





  /* ───────── LOGIN HANDLER ───────── */



  adminForm.addEventListener('submit', async (e) => {

    e.preventDefault();



    const username = adminForm.username.value.trim();

    const password = adminForm.password.value;



    adminError.style.display = 'none';

    adminError.textContent = '';



    console.log('Attempt login…');



    try {

      const response = await fetch(`${WORKER_BASE}/login`, {

        method: 'POST',

        credentials: 'include',          // ✅ REQUIRED

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ username, password })

      });



      const result = await response.json().catch(() => ({}));



      console.log('Login response:', response.status, result);



      if (response.ok && result.success) {

        console.log('Login successful → redirect');

        hideAdminModal();

        window.location.href = '/admin-dashboard.html';

      } else {

        adminError.textContent = result.error || 'Login failed – check username or password';

        adminError.style.display = 'block';

        adminForm.password.value = '';

      }



    } catch (err) {

      console.error('Login failed – network or CORS error:', err);

      adminError.textContent = 'Network error – API unreachable';

      adminError.style.display = 'block';

    }

  });



});