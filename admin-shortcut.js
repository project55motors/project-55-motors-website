// -------- SECRET TRIGGER KEYS --------
const LOGIN_TRIGGER_KEYS = ["Shift", "KeyA"];
let keyHistory = [];

// -------- SHOW / HIDE MODAL --------
function showLoginModal() {
    const modal = document.getElementById("adminLoginModal");
    if (modal) modal.style.display = "flex";
}

function hideLoginModal() {
    const modal = document.getElementById("adminLoginModal");
    if (modal) modal.style.display = "none";
}

// Exposed for HTML buttons:
window.closeAdminModal = hideLoginModal;

// -------- SECRET SHORTCUTS --------
document.addEventListener("keydown", (e) => {
    keyHistory.push(e.code);

    if (keyHistory.slice(-2).join(",") === LOGIN_TRIGGER_KEYS.join(",")) {
        showLoginModal();
    }
});

document.addEventListener("click", (e) => {
    if (e.detail === 3) {
        showLoginModal();
    }
});

// -------- LOGIN HANDLER --------
async function submitAdminLogin(e) {
    if (e) e.preventDefault();

    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value.trim();

    const res = await fetch("/api/login", {   // 🔥 correct worker route
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass })
    });

    if (res.ok) {
        hideLoginModal();
        window.location.href = "admin-dashboard.html";
    } else {
        const msg = document.getElementById("admin-login-error");
        msg.style.display = "block";
        msg.textContent = "Incorrect login — try again.";
    }
}

window.submitAdminLogin = submitAdminLogin;
