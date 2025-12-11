// admin-shortcut.js — site-wide hidden staff login

const API_BASE = "/api";
const MODAL_ID = "adminLoginModal";

// Normalise / create the login modal
function getLoginModal() {
    let el = document.getElementById(MODAL_ID);

    // If no modal exists in the HTML, create one (so shortcuts still work on any page)
    if (!el) {
        el = document.createElement("div");
        el.id = MODAL_ID;
        el.className = "modal";
        el.style.display = "none";
        el.innerHTML = `
            <div class="modal-content">
                <span class="modal-close" onclick="closeAdminModal()">×</span>
                <h2>Staff Login</h2>

                <form onsubmit="submitAdminLogin(event)">
                    <input id="adminUser" type="text" placeholder="Username" required>
                    <input id="adminPass" type="password" placeholder="Password" required>
                    <button type="submit" class="modal-login-btn">Log In</button>
                </form>

                <p id="admin-login-error" class="modal-error" style="display:none;"></p>
            </div>
        `;
        document.body.appendChild(el);
    } else {
        // Ensure it starts hidden even if HTML forgot to set display:none
        if (!el.style.display || el.style.display === "flex" || el.style.display === "block") {
            el.style.display = "none";
        }
    }

    return el;
}

// Show / hide helpers
function openAdminModal() {
    const modal = getLoginModal();
    modal.style.display = "flex";
}

function closeAdminModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.style.display = "none";
}

// Expose close function for onclick in HTML
window.closeAdminModal = closeAdminModal;

// Secret keyboard + mouse triggers
let keyBuffer = [];

document.addEventListener("keydown", (e) => {
    keyBuffer.push(e.code);
    keyBuffer = keyBuffer.slice(-2);

    if (
        keyBuffer.join(",") === "ShiftLeft,KeyA" ||
        keyBuffer.join(",") === "ShiftRight,KeyA"
    ) {
        openAdminModal();
    }
});

// Triple-click hero logo or admin logo
document.addEventListener("click", (e) => {
    if (
        e.detail === 3 &&
        (e.target.classList.contains("hero-logo") ||
         e.target.closest(".hero-logo") ||
         e.target.classList.contains("admin-brand") ||
         e.target.closest(".admin-brand"))
    ) {
        openAdminModal();
    }
});

// Login submission
async function submitAdminLogin(event) {
    if (event) event.preventDefault();

    const userEl = document.getElementById("adminUser");
    const passEl = document.getElementById("adminPass");
    const errorBox = document.getElementById("admin-login-error");

    if (!userEl || !passEl || !errorBox) {
        alert("Login form not available on this page.");
        return;
    }

    const user = userEl.value.trim();
    const pass = passEl.value.trim();

    errorBox.style.display = "none";
    errorBox.textContent = "";

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        });

        if (res.ok) {
            // Cookie is set by the Worker; now go to the dashboard
            window.location.href = "admin-dashboard.html";
        } else {
            errorBox.style.display = "block";
            errorBox.textContent = "Incorrect login.";
        }
    } catch (err) {
        console.error("Login error:", err);
        errorBox.style.display = "block";
        errorBox.textContent = "Network error – please try again.";
    }
}

window.submitAdminLogin = submitAdminLogin;

// Ensure modal is normalised (hidden) once the DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", getLoginModal);
} else {
    getLoginModal();
}
