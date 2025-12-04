// -------- SECRET LOGIN TRIGGERS --------
let keyHistory = [];

document.addEventListener("keydown", (e) => {
    keyHistory.push(e.code);
    if (keyHistory.slice(-2).join(",") === "Shift,KeyA") {
        openAdminModal();
    }
});

document.addEventListener("click", (e) => {
    if (e.detail === 3) openAdminModal();
});

// -------- MODAL CONTROL --------
function openAdminModal() {
    const modal = document.getElementById("adminLoginModal");
    if (modal) modal.style.display = "flex";
}

function closeAdminModal() {
    const modal = document.getElementById("adminLoginModal");
    if (modal) modal.style.display = "none";
}

// -------- LOGIN REQUEST (MATCHES WORKER FORMAT) --------
async function submitAdminLogin(e) {
    e.preventDefault();

    const username = document.getElementById("adminUser").value.trim();
    const password = document.getElementById("adminPass").value.trim();

    const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        window.location.href = "admin-dashboard.html";
    } else {
        document.getElementById("admin-login-error").style.display = "block";
        document.getElementById("admin-login-error").innerText = "Invalid login.";
    }
}

window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.submitAdminLogin = submitAdminLogin;
