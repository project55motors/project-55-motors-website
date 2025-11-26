// admin-shortcut.js – FINAL USING WORKERS.DEV (WORKING VERSION)

document.addEventListener('DOMContentLoaded', () => {
  const adminModal  = document.getElementById('admin-login-modal');
  const adminForm   = document.getElementById('admin-login-form');
  const adminError  = document.getElementById('admin-login-error');
  const closeButton = document.querySelector('#admin-login-modal .modal-close');

  // IMPORTANT: This must match your Worker that already works
  const WORKER_BASE = 'https://admin-worker.nathan-ed2.workers.dev';

  if (!adminModal || !adminForm) return;

  const hideAdminModal = () => {
    adminModal.style.display = 'none';
    adminError.style.display = 'none';
    adminForm.reset();
  };

  /* ───────── OPEN MODAL (Shift+A or triple-tap logo) ───────── */

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
      clearTimeout(logo._timer);
      logo._timer = setTimeout(() => { taps = 0; }, 600);
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

    adminError.style.display = 'none';
    adminError.textContent = '';

    try {
      const response = await fetch(`${WORKER_BASE}/login`, {
        method: 'POST',
        credentials: 'include',              // send / receive cookies for workers.dev
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      // If the fetch itself succeeded, parse JSON
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        // Login OK: hide modal and go to dashboard
        hideAdminModal();
        window.location.href = '/admin-dashboard.html';
      } else {
        console.error('Login failed:', response.status, result);
        adminError.textContent = result.error || 'Login failed – check username or password';
        adminError.style.display = 'block';
        adminForm.password.value = '';
      }

    } catch (err) {
      console.error('Network / CORS error talking to Worker:', err);
      adminError.textContent = 'Network error – Worker unreachable';
      adminError.style.display = 'block';
    }
  });
});
