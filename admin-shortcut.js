// admin-shortcut.js – Stable + Secure

document.addEventListener('DOMContentLoaded', () => {
  const adminModal  = document.getElementById('admin-login-modal');
  const adminForm   = document.getElementById('admin-login-form');
  const adminError  = document.getElementById('admin-login-error');
  const closeButton = document.querySelector('#admin-login-modal .modal-close');

  if (!adminModal || !adminForm) return;

  const show = () => adminModal.style.display = 'flex';
  const hide = () => {
    adminModal.style.display = 'none';
    adminError.style.display = 'none';
    adminForm.reset();
  };

  // SHIFT + A
  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      show();
    }
  });

  // TRIPLE TAP LOGO
  const logo = document.querySelector('.logo img') || document.querySelector('nav img');
  if (logo) {
    let taps = 0;
    logo.addEventListener('click', () => {
      taps++;
      clearTimeout(logo.timer);
      logo.timer = setTimeout(() => taps = 0, 600);
      if (taps === 3) {
        taps = 0;
        show();
      }
    });
  }

  closeButton?.addEventListener('click', e => {
    e.preventDefault();
    hide();
  });

  adminModal.addEventListener('click', e => {
    if (e.target === adminModal) hide();
  });

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
        hide();
        window.location.href = '/admin-dashboard.html';
      }

      else {
        adminError.textContent = result.error || 'Invalid login';
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