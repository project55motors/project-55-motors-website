// admin-shortcut.js — trigger modal + login logic

let adminModal = null;

document.addEventListener("DOMContentLoaded", () => {
    adminModal = document.getElementById("adminLoginModal");

    // Triple-click logo only
    const logo = document.querySelector(".hero-logo");
    if (logo) {
        logo.addEventListener("click", detectTripleClick);
    }

    // Shift+A shortcut
    document.addEventListener("keydown", (e) => {
        if (e.shiftKey && e.key.toLowerCase() === "a") {
            openAdminModal();
        }
    });
});

let clickCount = 0;
let clickTimer = null;

function detectTripleClick() {
    clickCount++;
    if (clickCount === 3) {
        openAdminModal();
        clickCount = 0;
        return;
    }

    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => (clickCount = 0), 350);
}

function openAdminModal() {
    if (!adminModal) return;
    adminModal.style.display = "flex";
    document.getElementById("admin-login-error").textContent = "";
}

function closeAdminModal() {
    adminModal.style.display = "none";
}

/* ------------------ Login ------------------ */

async function submitAdminLogin(event) {
    event.preventDefault();

    const username = document.getElementById("adminUser").value.trim();
    const password = document.getElementById("adminPass").value.trim();
    const errorField = document.getElementById("admin-login-error");

    try {
        const res = await fetch("/api/login", {   // ← FIXED ROUTE
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            window.location.href = "admin-dashboard.html";
        } else {
            errorField.textContent = "Incorrect login — try again.";
        }

    } catch (err) {
        errorField.textContent = "Network error — try later.";
    }
}

window.submitAdminLogin = submitAdminLogin;
window.closeAdminModal = closeAdminModal;
