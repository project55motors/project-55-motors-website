document.addEventListener("DOMContentLoaded", () => {
  const loginModal = document.getElementById("login-modal");
  const adminApp = document.getElementById("admin-app");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  async function checkLogin() {
    const res = await fetch("/api/login-check", {
      credentials: "include"
    });
    const data = await res.json();

    if (data.loggedIn) {
      loginModal.style.display = "none";
      adminApp.style.display = "block";
    } else {
      loginModal.style.display = "block";
      adminApp.style.display = "none";
    }
  }

  loginBtn.addEventListener("click", async () => {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      alert("Enter username and password");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        await checkLogin();
      } else {
        alert(data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Login request failed");
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
      location.reload();
    });
  }

  checkLogin();
});
