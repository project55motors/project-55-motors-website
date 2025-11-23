// Trigger modal with Shift + A
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key.toLowerCase() === 'a') {
    const modal = document.getElementById('admin-login-modal');
    if (modal) modal.style.display = 'flex';
  }
});

// Close modal if clicking outside modal content
document.addEventListener('click', (e) => {
  const modal = document.getElementById('admin-login-modal');
  if (!modal) return;
  if (e.target === modal) modal.style.display = 'none';
});

// Handle form submission
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const username = form.username.value.trim();
  const password = form.password.value;

  const response = await fetch('https://admin.nathan-ed2.workers.dev', { // <-- your admin worker URL
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();

  if (result.success) {
    alert('Login successful!');
    form.reset();
    document.getElementById('admin-login-modal').style.display = 'none';
    window.location.href = '/admin.html'; // Or redirect to admin dashboard page
  } else {
    const errorMsg = document.getElementById('admin-login-error');
    errorMsg.style.display = 'block';
    errorMsg.textContent = 'Invalid username or password';
  }
});
