const WORKER_URL = "https://project55motors.co.uk/api";

// DOM ELEMENTS
const listContainer = document.getElementById("admin-car-list");
const editor = document.getElementById("admin-editor");
const closeEditorBtn = document.getElementById("closeEditor");
const saveBtn = document.getElementById("saveBtn");
const markSoldBtn = document.getElementById("markSoldBtn");
const createBtn = document.getElementById("createNewCar");

let activeRecordId = null;
let records = [];

// Load vehicle data
async function loadCars() {
    try {
        const res = await fetch(`${WORKER_URL}/admin/all`, { credentials: "include" });
        const text = await res.text();

        if (!res.ok) {
            listContainer.innerHTML = `<p style="color:red;">${text}</p>`;
            return;
        }

        records = JSON.parse(text.match(/{.*}/s)[0]).records;
        renderCarList();

    } catch (err) {
        listContainer.innerHTML = `<p style="color:red;">Failed to load vehicles.</p>`;
    }
}


// Render List
function renderCarList() {
    listContainer.innerHTML = "";

    records.forEach(r => {
        const f = r.fields;
        const row = document.createElement("div");
        row.className = "admin-row";
        row.dataset.id = r.id;

        row.innerHTML = `
            <span>${f.Make_Model || "Unnamed Vehicle"}</span>
            <span>${f.Registration || ""}</span>
            <span>£${Number(f.Price || 0).toLocaleString()}</span>
            <span>${f.Mileage ? Number(f.Mileage).toLocaleString() + " miles" : ""}</span>
            <span>${f.MOT_Date || "—"}</span>
        `;

        row.onclick = () => openEditor(r);
        listContainer.appendChild(row);
    });
}


// Open Editor Panel
function openEditor(record) {
    const f = record.fields;
    activeRecordId = record.id;

    document.getElementById("editor-title").textContent = f.Make_Model || "Vehicle";
    document.getElementById("editor-thumb").src = f.Photos?.[0]?.url || "";

    document.querySelector("#field-Make_Model").value = f.Make_Model || "";
    document.querySelector("#field-Registration").value = f.Registration || "";
    document.querySelector("#field-Price").value = f.Price || "";
    document.querySelector("#field-Mileage").value = f.Mileage || "";
    document.querySelector("#field-MOT_Date").value = f.MOT_Date || "";
    document.querySelector("#field-Status").value = f.Status || "Available";
    document.querySelector("#field-Full_Description").value = f.Full_Description || "";

    editor.classList.remove("hidden");
}


// Close Editor Panel
closeEditorBtn.onclick = () => editor.classList.add("hidden");


// Save Changes
saveBtn.onclick = async () => {
    if (!activeRecordId) return;

    const fields = {
        Make_Model: document.querySelector("#field-Make_Model").value,
        Registration: document.querySelector("#field-Registration").value,
        Price: Number(document.querySelector("#field-Price").value),
        Mileage: Number(document.querySelector("#field-Mileage").value),
        MOT_Date: document.querySelector("#field-MOT_Date").value,
        Status: document.querySelector("#field-Status").value,
        Full_Description: document.querySelector("#field-Full_Description").value
    };

    await fetch(`${WORKER_URL}/admin/update`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeRecordId, fields })
    });

    editor.classList.add("hidden");
    loadCars();
};


// Mark Sold
markSoldBtn.onclick = async () => {
    if (!activeRecordId) return;

    await fetch(`${WORKER_URL}/admin/update`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeRecordId, fields: { Status: "Sold" } })
    });

    editor.classList.add("hidden");
    loadCars();
};


// Create New Vehicle
createBtn.onclick = async () => {
    await fetch(`${WORKER_URL}/admin/create`, {
        method: "POST",
        credentials: "include"
    });

    loadCars();
};


// Init
loadCars();
