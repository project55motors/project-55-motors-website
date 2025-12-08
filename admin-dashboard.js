--- FILE START: admin-dashboard.js ---


// admin-dashboard.js — Airtable-connected admin panel

const API_BASE = "/api";

const tableContainer = document.getElementById("inventory-table-body");
const statusBox = document.getElementById("admin-status");

function setStatus(text, type = "info") {
    statusBox.textContent = text;
    statusBox.style.color = type === "error" ? "red" : "green";
}

// ---------------------------------------------------------------------------
// LOAD VEHICLES
// ---------------------------------------------------------------------------

async function loadCars() {
    setStatus("Loading vehicles...");

    try {
        const res = await fetch(`${API_BASE}/admin/all`, {
            credentials: "include"
        });

        if (!res.ok) {
            setStatus("Not authenticated — please log in again.", "error");
            return;
        }

        const html = await res.text();
        tableContainer.innerHTML = html;

        setStatus("Vehicles loaded.");
    } catch (err) {
        console.error(err);
        setStatus("Failed loading vehicles.", "error");
    }
}

// ---------------------------------------------------------------------------
// FORMAT DATE FOR AIRTABLE
// ---------------------------------------------------------------------------

function toAirtableDate(value) {
    if (!value) return null;

    // Browser gives YYYY-MM-DD
    const parts = value.split("-");
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${year}-${month}-${day}`;
    }
    return null;
}

// ---------------------------------------------------------------------------
// SAVE VEHICLE
// ---------------------------------------------------------------------------

async function save(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    const fields = {};

    row.querySelectorAll("input, textarea, select").forEach((el) => {
        let value = el.value.trim();

        // Convert number fields properly
        if (el.type === "number") {
            value = value === "" ? null : Number(value);
        }

        // Convert currency (Airtable expects number)
        if (el.name === "Price" && value !== null) {
            value = Number(value);
        }

        // Convert date to Airtable-compatible format
        if (el.type === "date" && value) {
            value = toAirtableDate(value);
        }

        if (value !== "" && value !== null && value !== undefined) {
            fields[el.name] = value;
        }
    });

    setStatus("Saving...");

    try {
        const res = await fetch(`${API_BASE}/admin/update`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, fields })
        });

        if (res.ok) {
            setStatus("Saved successfully.");
        } else {
            const msg = await res.text();
            console.error("Save failed:", msg);
            setStatus("Save failed — see console.", "error");
            alert("Save failed");
        }
    } catch (err) {
        console.error("Save error:", err);
        alert("Save failed — error in network request");
        setStatus("Save failed.", "error");
    }
}

// ---------------------------------------------------------------------------
// MARK AS SOLD
// ---------------------------------------------------------------------------

async function sold(id) {
    setStatus("Updating status...");

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
        setStatus("Marked as sold.");
        loadCars();
    } else {
        setStatus("Action failed.", "error");
    }
}

// ---------------------------------------------------------------------------
// CREATE NEW VEHICLE
// ---------------------------------------------------------------------------

async function createVehicle() {
    setStatus("Creating vehicle...");

    const res = await fetch(`${API_BASE}/admin/create`, {
        method: "POST",
        credentials: "include"
    });

    if (res.ok) {
        setStatus("Vehicle created.");
        loadCars();
    } else {
        setStatus("Create failed.", "error");
    }
}

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------

async function logout() {
    await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
    window.location.href = "index.html";
}

// ---------------------------------------------------------------------------
// Expose functions globally (for onclick buttons)
// ---------------------------------------------------------------------------

window.save = save;
window.sold = sold;
window.createVehicle = createVehicle;
window.logout = logout;

// ---------------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------------

loadCars();

--- FILE END ---
