document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("admin-login-modal");
  const form  = document.getElementById("admin-login-form");
  const error = document.getElementById("admin-login-error");
  if (!modal || !form) return;

  modal.style.display = "flex";  // delete this line after first test

  form.onsubmit = async e => {
    e.preventDefault();
    try {
      const r = await fetch("https://admin-worker.nathan-ed2.workers.dev/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username.value, password: form.password.value })
      });
      if (r.ok) location.href = "/admin-dashboard.html";
      else error.textContent = "Wrong credentials", error.style.display = "block";
    } catch {
      error.textContent = "Network error – check Worker URL";
      error.style.display = "block";
    }
  };
});