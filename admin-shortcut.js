// admin-shortcut.js – REAL login against your secure Worker
document.addEventListener('DOMContentLoaded', () => {
    const adminModal   = document.getElementById('admin-login-modal');
    const adminForm    = document.getElementById('admin-login-form');
    const adminError   = document.getElementById('admin-login-error');
    const closeButton  = document.querySelector('#admin-login-modal .modal-close');

    if (!adminModal || !adminForm) return;

    const hideAdminModal = () => {
        adminModal.style.display = 'none';
        adminError.style.display = 'none';
        adminForm.reset();
    };

    // Open modal: Shift+A or triple-tap logo
    document.addEventListener('keydown', e => {
        if (e.shiftKey && e.key === 'A') {
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
            logo.timer = setTimeout(() => { taps = 0; }, 600);
            if (taps === 3) {
                taps = 0;
                adminModal.style.display = 'flex';
            }
        });
    }

    // Close modal
    closeButton?.addEventListener('click', e => { e.preventDefault(); hideAdminModal(); });
    adminModal.addEventListener('click', e => { if (e.target === adminModal) hideAdminModal(); });

    // REAL LOGIN
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = adminForm.username.value.trim();
        const password = adminForm.password.value;

        try {
            const response = await fetch('https://admin-worker.nathan-ed2.workers.dev/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                hideAdminModal();
                window.location.href = '/admin-dashboard.html';
            } else {
                adminError.textContent = result.error || 'Login failed – check credentials';
                adminError.style.display = 'block';
                adminForm.password.value = '';
            }
        } catch (err) {
            adminError.textContent = 'Network error – check Worker URL';
            adminError.style.display = 'block';
        }
    });
});