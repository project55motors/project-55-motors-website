/* ============================================================
   PROJECT 55 MOTORS — PREMIUM ADMIN DASHBOARD CONTROLLER
   Final, corrected, working version
   - Fully compatible with admin-worker.js
   - Save, Sold, Sorting functions restored
   - Premium UI behaviour preserved
   ============================================================ */

console.log("Admin Dashboard JS Loaded");

// -----------------------------
// DOM ELEMENTS
// -----------------------------
const tableBody = document.getElementById("inventory-table-body");
const newVehicleBtn = document.getElementById("new-vehicle-btn");
const logoutBtn = document.getElementById("logout-btn");

// Worker API Path (via Cloudflare)
const API_BASE = "/api";

// -----------------------------
// UTILITY — Show small toast
// -----------------------------
function showToast(message, type = "success") {
    let toast = document.createElement("div");
    toast.className = `admin-toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("visible"), 10);
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

// -----------------------------
// FETCH & RENDER INVENTORY
// -----------------------------
async function loadInventory() {
    try {
        const res = await fetch(`${API_BASE}/admin/all`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            console.error("Load error:", await res.text());
            showToast("Failed to load inventory", "error");
            return;
        }

        const html = await res.text();
        tableBody.innerHTML = html;

        // Re-bind all row controls
        enhanceRows();
        showToast("Inventory Loaded", "success");

    } catch (error) {
        console.error(error);
        showToast("Connection error", "error");
    }
}

// -----------------------------
// ROW ENHANCEMENT — Attach handlers
// -----------------------------
function enhanceRows() {
    // Save buttons already call global save(id)
    // Sold buttons call global sold(id)
    // Sort buttons call moveUp(id) / moveDown(id)

    // Mark edited rows visually
    tableBody.querySelectorAll("tr").forEach(row => {
        row.querySelectorAll("input, textarea, select").forEach(input => {
            input.addEventListener("input", () => {
                row.classList.add("dirty");
            });
        });
    });
}

// -----------------------------
// EXTRACT FIELDS FROM A ROW
// -----------------------------
function gatherRowFields(row) {
    return {
        Make_Model: row.querySelector("[name='Make_Model']").value.trim(),
        Registration: row.querySelector("[name='Registration']").value.trim(),
        Price: Number(row.querySelector("[name='Price']").value) || null,
        Mileage: Number(row.querySelector("[name='Mileage']").value) || null,
        MOT_Date: row.querySelector("[name='MOT_Date']").value,
        Engine_size: row.querySelector("[name='Engine_size']").value,
        Fuel_type: row.querySelector("[name='Fuel_type']").value,
        Transmission: row.querySelector("[name='Transmission']").value,
        Status: row.querySelector("[name='Status']").value,
        Short_Description: row.querySelector("[name='Short_Description']").value.trim(),
        Full_Description: row.querySelector("[name='Full_Description']").value.trim(),
        Sort_Index: Number(row.querySelector("[name='Sort_Index']").value) || 0
    };
}

// -----------------------------
// SAVE VEHICLE
// -----------------------------
async function save(id) {
    const row = document.getElementById(`row-${id}`);
    if (!row) {
        showToast("Row not found", "error");
        return;
    }

    const fields = gatherRowFields(row);

    try {
        const res = await fetch(`${API_BASE}/admin/update`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, fields })
        });

        if (!res.ok) {
            console.error(await res.text());
            showToast("Save failed", "error");
            return;
        }

        row.classList.remove("dirty");
        showToast("Saved", "success");

    } catch (error) {
        console.error(error);
        showToast("Save error", "error");
    }
}

window.save = save; // REQUIRED by Worker-generated HTML

// -----------------------------
// MARK VEHICLE AS SOLD
// -----------------------------
async function sold(id) {
    try {
        const row = document.getElementById(`row-${id}`);
        if (!row) return;

        const fields = { Status: "Sold" };

        const res = await fetch(`${API_BASE}/admin/update`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, fields })
        });

        if (!res.ok) {
            console.error(await res.text());
            showToast("Failed to set Sold", "error");
            return;
        }

        row.querySelector("[name='Status']").value = "Sold";
        row.classList.remove("dirty");
        showToast("Marked Sold", "success");
    } catch (error) {
        console.error(error);
        showToast("Error", "error");
    }
}

window.sold = sold;

// -----------------------------
// SORTING CONTROLS
// -----------------------------
async function moveUp(id) {
    changeSortIndex(id, -1);
}
async function moveDown(id) {
    changeSortIndex(id, +1);
}

async function changeSortIndex(id, delta) {
    try {
        const row = document.getElementById(`row-${id}`);
        if (!row) return;

        const sortInput = row.querySelector("[name='Sort_Index']");
        const newIndex = Number(sortInput.value || 0) + delta;

        const res = await fetch(`${API_BASE}/admin/update`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, fields: { Sort_Index: newIndex } })
        });

        if (!res.ok) {
            console.error(await res.text());
            showToast("Sort update failed", "error");
            return;
        }

        sortInput.value = newIndex;
        showToast("Sort updated", "success");

        loadInventory(); // Reload table for correct order

    } catch (error) {
        console.error(error);
        showToast("Sort error", "error");
    }
}

window.moveUp = moveUp;
window.moveDown = moveDown;

// -----------------------------
// CREATE NEW VEHICLE
// -----------------------------
async function createNewVehicle() {
    try {
        const res = await fetch(`${API_BASE}/admin/create`, {
            method: "POST",
            credentials: "include"
        });

        if (!res.ok) {
            console.error(await res.text());
            showToast("Create failed", "error");
            return;
        }

        showToast("Vehicle Created", "success");
        loadInventory();

    } catch (error) {
        console.error(error);
        showToast("Create error", "error");
    }
}

newVehicleBtn.addEventListener("click", createNewVehicle);

// -----------------------------
// LOG OUT
// -----------------------------
logoutBtn.addEventListener("click", async () => {
    await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include"
    });
    window.location.href = "/index.html";
});

// -----------------------------
// INITIAL LOAD
// -----------------------------
loadInventory();
