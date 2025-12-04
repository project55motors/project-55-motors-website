// -------- SETTINGS --------
const LOGIN_TRIGGER_KEYS = ["Shift", "KeyA"]; 
let keyHistory = [];

// -------- MODAL CONTROL --------
function showLoginModal() {
    const modal = document.getElementById("adminLoginModal");
    if (modal) modal.style.display = "flex";
}

function hideLoginModal() {
    const modal = document.getElementById("adminLoginModal");
    if (modal) modal.style.display = "none";
}

// -------- SECRET KEY TRIGGER --------
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

// -------- LOGIN SUBMIT --------
async function submitLogin() {
    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value.trim();

    const res = await fetch("/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass })
    });

    if (res.ok) {
        await res.text();
        window.location.href = "admin-dashboard.html";
    } else {
        alert("Incorrect login.");
    }
}

window.submitLogin = submitLogin;
window.hideLoginModal = hideLoginModal;
