// admin-dashboard.js — Airtable-connected admin panel



const API_BASE = "https://project55motors.co.uk/api";

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

// SAVE VEHICLE

// ---------------------------------------------------------------------------

async function save(id) {

    const row = document.querySelector(`tr[data-id="${id}"]`);

    if (!row) return;



    const fields = {};

    row.querySelectorAll("input, textarea, select").forEach((el) => {

        fields[el.name] = el.value;

    });



    setStatus("Saving...");



    const res = await fetch(`${API_BASE}/admin/update`, {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ id, fields })

    });



    if (res.ok) {

        setStatus("Saved successfully.");

    } else {

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

// Expose functions globally (required for inline button calls)

// ---------------------------------------------------------------------------

window.save = save;

window.sold = sold;

window.createVehicle = createVehicle;

window.logout = logout;



// ---------------------------------------------------------------------------

// Initial load

// ---------------------------------------------------------------------------

loadCars();