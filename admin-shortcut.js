// admin-shortcut.js – FINAL, MATCHED TO CLOUDFLARE ROUTES

document.addEventListener('DOMContentLoaded', () => {
  const adminModal  = document.getElementById('admin-login-modal');
  const adminForm   = document.getElementById('admin-login-form');
  const adminError  = document.getElementById('admin-login-error');
  const closeButton = document.querySelector('#admin-login-modal .modal-close');

  if (!adminModal || !adminForm) return;

  const hideAdminModal = () => {
    adminModal.style.display = 'none';
    adminError.style.display = 'none';
    adminForm.reset();
  };

  /* ───────── OPEN MODAL ───────── */

  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      adminModal.style.display = 'flex';
    }
  });

  const logo = document.querySelector('.logo img') || document.querySelector('nav img');
  if (logo) {
    let taps = 0;
    logo.addEventListener('click', () => {
      taps++;
      clearTimeout(logo.timer);
      logo.timer = setTimeout(() => taps = 0, 600);
      if (taps === 3) {
        taps = 0;
        adminModal.style.display = 'flex';
      }
    });
  }

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

    try {
      const response = await fetch('https://api.project55motors.co.uk/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        hideAdminModal();

        // HARD redirect to admin (same domain = cookies now work)
        window.location.href = '/admin-dashboard.html';

      } else {
        adminError.textContent = result.error || 'Login failed – wrong credentials';
        adminError.style.display = 'block';
        adminForm.password.value = '';
      }

    } catch (err) {
      console.error(err);
      adminError.textContent = 'Network error – Worker unreachable';
      adminError.style.display = 'block';
    }
  });
});
