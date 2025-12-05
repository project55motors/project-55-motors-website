/* ---------------------------------------------------------
   Project 55 Motors — Hidden Admin Login System
   Trigger: Shift + A  OR  Triple-click logo
   Auth: Uses Cloudflare Worker (/api/login)
--------------------------------------------------------- */

const LOGIN_ENDPOINT = "https://project55motors.co.uk/api/login";
const MODAL_ID = "adminLoginModal";
let keySequence = [];

/* ---------------------------------------------------------
   Modal Helpers
--------------------------------------------------------- */
function openAdminModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.style.display = "flex";
}

function closeAdminModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.style.display = "none";
}

/* ---------------------------------------------------------
   Secret Keyboard Trigger (Shift + A)
--------------------------------------------------------- */
document.addEventListener("keydown", (e) => {
    keySequence.push(e.code);

    if (keySequence.slice(-2).join(",") === "Shift,KeyA") {
        openAdminModal();
    }
});

/* ---------------------------------------------------------
   Secret Mouse Trigger (Triple click logo only)
--------------------------------------------------------- */
document.addEventListener("click", (e) => {
    if (e.detail === 3 && e.target.classList.contains("hero-logo")) {
        openAdminModal();
    }
});

/* ---------------------------------------------------------
   Login Handler (Calls Cloudflare Worker)
--------------------------------------------------------- */
async function submitAdminLogin(event) {
    event.preventDefault();

    const userEl = document.getElementById("adminUser");
    const passEl = document.getElementById("adminPass");
    const errorBox = document.getElementById("admin-login-error");

    if (!userEl || !passEl) return;

    const username = userEl.value.trim();
    const password = passEl.value.trim();

    errorBox.style.display = "none";

    try {
        const res = await fetch(LOGIN_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // REQUIRED so cookie works
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            closeAdminModal();
            window.location.href = "admin-dashboard.html";
        } else {
            errorBox.textContent = "Incorrect login — please try again.";
            errorBox.style.display = "block";
        }
    } catch (err) {
        console.error(err);
        errorBox.textContent = "Network error — please try again.";
        errorBox.style.display = "block";
    }
}

/* ---------------------------------------------------------
   Esc key closes modal
--------------------------------------------------------- */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAdminModal();
});

// Expose functions globally
window.submitAdminLogin = submitAdminLogin;
window.closeAdminModal = closeAdminModal;
