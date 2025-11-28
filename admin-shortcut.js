// admin-shortcut.js – FINAL (for project55motors.co.uk)

document.addEventListener('DOMContentLoaded', () => {

  const adminModal = document.getElementById('admin-login-modal');
  const adminForm  = document.getElementById('admin-login-form');
  const adminError = document.getElementById('admin-login-error');
  const closeBtn   = document.querySelector('.modal-close');

  const WORKER = 'https://project55motors.co.uk/api';

  if (!adminModal || !adminForm) return;

  // ---------- Open modal: Shift + A ----------
  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      adminModal.style.display = 'flex';
    }
  });

  // ---------- Open modal: Triple click logo ----------
  const findLogo = setInterval(() => {
    const logo =
      document.querySelector('.logo img') ||
      document.querySelector('nav img') ||
      document.querySelector('img[src="logo.png"]');

    if (logo) {
      clearInterval(findLogo);

      let clicks = 0;

      logo.addEventListener('click', () => {
        clicks++;
        clearTimeout(logo._timer);

        logo._timer = setTimeout(() => {
          clicks = 0;
        }, 600);

        if (clicks === 3) {
          clicks = 0;
          adminModal.style.display = 'flex';
        }
      });
    }
  }, 200);

  // ---------- Close modal ----------
  closeBtn?.addEventListener('click', e => {
    e.preventDefault();
    adminModal.style.display = 'none';
    adminError.style.display = 'none';
  });

  adminModal.addEventListener('click', e => {
    if (e.target === adminModal) {
      adminModal.style.display = 'none';
      adminError.style.display = 'none';
    }
  });

  // ---------- Login ----------
  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = adminForm.username.value.trim();
    const password = adminForm.password.value;

    adminError.style.display = 'none';

    try {
      const res = await fetch(`${WORKER}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok && result.success) {
        adminModal.style.display = 'none';
        window.location.href = '/admin-dashboard.html';
      } else {
        adminError.textContent = result.error || 'Login failed';
        adminError.style.display = 'block';
      }

    } catch (err) {
      console.error(err);
      adminError.textContent = 'Network error – worker unreachable';
      adminError.style.display = 'block';
    }

  });

});
