// --- FILE START: admin-dashboard.js ---
//
// Admin dashboard for Project 55 Motors
//

const API_BASE = "/api";

const tableBody   = document.getElementById("admin-table-body");
const statusBar   = document.getElementById("admin-status");
const toastEl     = document.getElementById("admin-toast");
const btnHide     = document.getElementById("btn-hide-inactive");
const btnRefresh  = document.getElementById("btn-refresh");
const btnLogout   = document.getElementById("btn-logout");
const btnAdd      = document.getElementById("btn-add-vehicle");
const btnTheme    = document.getElementById("btn-theme");

const descModal    = document.getElementById("desc-modal");
const descTextarea = document.getElementById("desc-modal-text");
const descCancel   = document.getElementById("desc-cancel");
const descApply    = document.getElementById("desc-apply");

let hideInactive = false;
let descCurrentRow = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStatus(text, type = "info") {
    if (statusBar) {
        statusBar.textContent = text;
        statusBar.className = "admin-status-bar admin-status-" + type;
    }

    if (!toastEl) return;

    toastEl.textContent = text;
    toastEl.classList.remove("show", "error", "info", "success");
    toastEl.classList.add("show");

    if (type === "error") toastEl.classList.add("error");
    if (type === "success") toastEl.classList.add("success");

    setTimeout(() => {
        toastEl.classList.remove("show");
    }, 3000);
}

function toAirtableDate(value) {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${year}-${month}-${day}`;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Load vehicles
// ---------------------------------------------------------------------------

async function loadCars() {
    setStatus("Loading vehicles…", "info");

    try {
        const res = await fetch(`${API_BASE}/admin/all`, {
            credentials: "include"
        });

        if (res.status === 401) {
            // Not logged in – bounce back to home quietly
            window.location.href = "index.html";
            return;
        }

        if (!res.ok) {
            setStatus("Failed to load vehicles (HTTP " + res.status + ")", "error");
            return;
        }

        const html = await res.text();
        tableBody.innerHTML = html;

        // Re-attach behaviours to the freshly injected rows
        attachRowBehaviours();
        applyHideFilter();

        setStatus("Vehicles loaded.", "success");
    } catch (err) {
        console.error("loadCars error:", err);
        setStatus("Failed to load vehicles.", "error");
    }
}

// ---------------------------------------------------------------------------
// Save / Sold
// ---------------------------------------------------------------------------

async function save(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    const fields = {};

    row.querySelectorAll("input, textarea, select").forEach((el) => {
        if (!el.name) return;
        let value = el.value.trim();

        if (el.type === "number") {
            value = value === "" ? null : Number(value);
        }

        if (el.name === "Price" && value !== null && value !== "") {
            value = Number(value);
        }

        if (el.type === "date" && value) {
            value = toAirtableDate(value);
        }

        if (value !== "" && value !== null && value !== undefined) {
            fields[el.name] = value;
        }
    });

    setStatus("Saving changes…", "info");

    try {
        const res = await fetch(`${API_BASE}/admin/update`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, fields })
        });

        if (res.ok) {
            setStatus("Saved successfully.", "success");
        } else {
            let msg = "";
            try { msg = await res.text(); } catch (_) {}
            console.error("Save failed:", msg);
            setStatus("Save failed – see console for Airtable error.", "error");
            alert("Save failed – open DevTools → Network → admin/update for the Airtable error.");
        }
    } catch (err) {
        console.error("Save error:", err);
        setStatus("Save failed – network/script error.", "error");
        alert("Save failed – network or script error.");
    }
}

async function sold(id) {
    setStatus("Marking as sold…", "info");

    const res = await fetch(`${API_BASE}/admin/update`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id,
            fields: { Status: "Sold" }
        })
    });

    if (res.ok) {
        setStatus("Vehicle marked as sold.", "success");
        loadCars();
    } else {
        setStatus("Action failed.", "error");
    }
}

// ---------------------------------------------------------------------------
// Create vehicle
// ---------------------------------------------------------------------------

async function createVehicle() {
    setStatus("Creating new vehicle…", "info");

    const res = await fetch(`${API_BASE}/admin/create`, {
        method: "POST",
        credentials: "include"
    });

    if (res.ok) {
        setStatus("Vehicle created – refreshing.", "success");
        loadCars();
    } else {
        setStatus("Create failed.", "error");
    }
}

// ---------------------------------------------------------------------------
// Sort order (Sort_Index)
// ---------------------------------------------------------------------------

async function move(id, delta) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    const sortInput = row.querySelector('input[name="Sort_Index"]');
    let current = sortInput ? parseInt(sortInput.value, 10) : 0;
    if (isNaN(current)) current = 0;

    const next = current + delta;
    if (sortInput) sortInput.value = next;

    setStatus("Updating order…", "info");

    const res = await fetch(`${API_BASE}/admin/update`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id,
            fields: { Sort_Index: next }
        })
    });

    if (res.ok) {
        setStatus("Order updated.", "success");
        loadCars();
    } else {
        setStatus("Order update failed.", "error");
    }
}

// ---------------------------------------------------------------------------
// Full description modal
// ---------------------------------------------------------------------------

function openDesc(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    const textarea = row.querySelector('textarea[name="Full_Description"]');
    if (!textarea) return;

    descCurrentRow = row;
    descTextarea.value = textarea.value || "";

    descModal.classList.add("show");
    descTextarea.focus();
}

function closeDescModal() {
    descModal.classList.remove("show");
    descCurrentRow = null;
}

function applyDescModal() {
    if (!descCurrentRow) {
        closeDescModal();
        return;
    }
    const textarea = descCurrentRow.querySelector('textarea[name="Full_Description"]');
    if (textarea) {
        textarea.value = descTextarea.value;
    }
    closeDescModal();
}

// ---------------------------------------------------------------------------
// Hide sold / hidden
// ---------------------------------------------------------------------------

function applyHideFilter() {
    const rows = tableBody.querySelectorAll("tr[data-id]");
    rows.forEach((row) => {
        const statusSel = row.querySelector('select[name="Status"]');
        if (!statusSel) return;
        const value = statusSel.value || "";

        if (hideInactive && value !== "Available") {
            row.style.display = "none";
        } else {
            row.style.display = "";
        }
    });

    if (btnHide) {
        btnHide.textContent = hideInactive ? "Show All" : "Hide Sold / Hidden";
    }
}

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

const THEME_KEY = "p55_admin_theme";

function applyTheme(theme) {
    const body = document.body;
    if (!body) return;

    if (theme === "dark") {
        body.classList.add("admin-dark");
        if (btnTheme) btnTheme.textContent = "Light Mode";
    } else {
        body.classList.remove("admin-dark");
        if (btnTheme) btnTheme.textContent = "Dark Mode";
    }
}

function initTheme() {
    let saved = localStorage.getItem(THEME_KEY);
    if (!saved) {
        const hour = new Date().getHours();
        saved = (hour >= 18 || hour < 7) ? "dark" : "light";
    }
    applyTheme(saved);
}

function toggleTheme() {
    const isDark = document.body.classList.contains("admin-dark");
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

async function logout() {
    try {
        await fetch(`${API_BASE}/logout`, {
            method: "POST",
            credentials: "include"
        });
    } catch (err) {
        console.error("Logout error:", err);
    } finally {
        window.location.href = "index.html";
    }
}

// ---------------------------------------------------------------------------
// Attach behaviours after rows are injected
// ---------------------------------------------------------------------------

function attachRowBehaviours() {
    // Make short description boxes a bit nicer on focus
    tableBody.querySelectorAll('textarea[name="Short_Description"]').forEach((ta) => {
        ta.addEventListener("focus", () => {
            ta.style.minHeight = "4rem";
        });
    });

    // Wire Edit buttons for full description
    tableBody.querySelectorAll("[data-edit-full]").forEach((btn) => {
        const id = btn.getAttribute("data-edit-full");
        btn.addEventListener("click", () => openDesc(id));
    });
}

// ---------------------------------------------------------------------------
// Wire up top-level buttons and initialise
// ---------------------------------------------------------------------------

if (btnHide) {
    btnHide.addEventListener("click", () => {
        hideInactive = !hideInactive;
        applyHideFilter();
    });
}

if (btnRefresh) {
    btnRefresh.addEventListener("click", () => loadCars());
}

if (btnLogout) {
    btnLogout.addEventListener("click", () => logout());
}

if (btnAdd) {
    btnAdd.addEventListener("click", () => createVehicle());
}

if (btnTheme) {
    btnTheme.addEventListener("click", toggleTheme);
}

if (descCancel) {
    descCancel.addEventListener("click", closeDescModal);
}
if (descApply) {
    descApply.addEventListener("click", applyDescModal);
}

// Close description modal when clicking backdrop
if (descModal) {
    descModal.addEventListener("click", (e) => {
        if (e.target === descModal) closeDescModal();
    });
}

// ---------------------------------------------------------------------------
// Expose functions for inline onclick handlers from Worker HTML
// ---------------------------------------------------------------------------

window.save      = save;
window.sold      = sold;
window.createVehicle = createVehicle;
window.moveUp    = (id) => move(id, -1);
window.moveDown  = (id) => move(id, 1);
window.openDesc  = openDesc;

// Theme + initial load
initTheme();
loadCars();

// --- FILE END: admin-dashboard.js ---
