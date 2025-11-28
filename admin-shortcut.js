// admin-shortcut.js – FINAL (project55motors.co.uk/api, triple-click + Shift+A)



document.addEventListener('DOMContentLoaded', () => {

  const adminModal  = document.getElementById('admin-login-modal');

  const adminForm   = document.getElementById('admin-login-form');

  const adminError  = document.getElementById('admin-login-error');

  const closeButton = document.querySelector('#admin-login-modal .modal-close');



  // Talk to your admin-worker via the domain route

  const WORKER_BASE = 'https://project55motors.co.uk/api';



  // If this page doesn’t have the modal, do nothing

  if (!adminModal || !adminForm) return;



  // --- helpers ---



  const showAdminModal = () => {

    adminModal.style.display = 'flex';

    adminError.style.display = 'none';

    adminError.textContent   = '';

  };



  const hideAdminModal = () => {

    adminModal.style.display = 'none';

    adminError.style.display = 'none';

    adminError.textContent   = '';

    adminForm.reset();

  };



  // --- open modal: Shift + A ---



  document.addEventListener('keydown', (e) => {

    if (e.shiftKey && e.key.toLowerCase() === 'a') {

      e.preventDefault();

      showAdminModal();

    }

  });



  // --- open modal: triple-click logo ---



  let logo = null;



  // Give the DOM a moment for nav/logo to render

  setTimeout(() => {

    logo =

      document.querySelector('.logo img') ||

      document.querySelector('nav img')   ||

      document.querySelector('img[src="logo.png"]');



    console.log('Admin logo found:', logo);



    if (logo) {

      let taps = 0;



      logo.addEventListener('click', () => {

        taps++;

        console.log('LOGO CLICKS:', taps);



        clearTimeout(logo._timer);

        logo._timer = setTimeout(() => { taps = 0; }, 600);



        if (taps === 3) {

          taps = 0;

          console.log('ADMIN MODAL OPENING');

          showAdminModal();

        }

      });

    }

  }, 500);



  // --- close modal ---



  closeButton?.addEventListener('click', (e) => {

    e.preventDefault();

    hideAdminModal();

  });



  adminModal.addEventListener('click', (e) => {

    if (e.target === adminModal) hideAdminModal();

  });



  // --- submit login form ---



  adminForm.addEventListener('submit', async (e) => {

    e.preventDefault();



    const username = adminForm.username.value.trim();

    const password = adminForm.password.value;



    adminError.style.display = 'none';

    adminError.textContent   = '';



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

        // Go to the admin dashboard

        window.location.href = '/admin-dashboard.html';

      } else {

        console.error('Login failed:', response.status, result);

        adminError.textContent = result.error || 'Login failed – check username or password';

        adminError.style.display = 'block';

        adminForm.password.value = '';

      }

    } catch (err) {

      console.error('Network / CORS error:', err);

      adminError.textContent = 'Network error – Worker unreachable';

      adminError.style.display = 'block';

    }

  });

});