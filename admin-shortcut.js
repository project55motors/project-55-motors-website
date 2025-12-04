// ===============================
//  SECRET LOGIN TRIGGER SYSTEM
// ===============================

// Modal reference (consistent ID name)
const modal = document.getElementById("admin-login-modal");
const closeBtn = modal?.querySelector(".modal-close");
const form = document.getElementById("admin-login-form");

// -------------------------------
// Hidden Keys / Triple-Tap Unlock
// -------------------------------

let keyBuffer = [];

document.addEventListener("keydown", (e) => {
    keyBuffer.push(e.key);

    if (keyBuffer.slice(-2).join("+") === "Shift+a" || keyBuffer.slice(-2).join("+") === "Shift+A") {
        showModal();
    }
});

// Triple tap logo
document.addEventListener("click", (e) => {
    if (e.detail === 3) showModal();
});

// -------------------------------
// Modal Controls
// -------------------------------

function showModal() {
    modal.style.display = "flex";
}

function hideModal() {
    modal.style.display = "none";
}

closeBtn?.addEventListener("click", hideModal);


// -------------------------------
// LOGIN ACTION — CALLS ADMIN WORKER
// -------------------------------

form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const username = formData.get("username");
    const password = formData.get("password");

    const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include"
    });

    if (response.ok) {
        hideModal();

        window.location.href = "admin-dashboard.html";
    } else {
        document.getElementById("admin-login-error").innerText = "Invalid login";
        document.getElementById("admin-login-error").style.display = "block";
    }
});
