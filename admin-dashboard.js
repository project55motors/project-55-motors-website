// admin-dashboard.js — Admin stock control for Project 55 Motors

const API_BASE = "/api";

const tableBody = document.getElementById("inventory-table-body");
const statusBar = document.getElementById("admin-status");
const toggleHiddenCheckbox = document.getElementById("toggle-hidden");
const refreshBtn = document.getElementById("btn-refresh");
const newVehicleBtn = document.getElementById("btn-new-vehicle");
const logoutBtn = document.getElementById("btn-logout");
const darkModeToggle = document.getElementById("btn-darkmode");

// ---------- Status helper ----------

function setStatus(message, type = "info") {
  if (!statusBar) return;
  statusBar.textContent = message;
  statusBar.className = "admin-status admin-status-" + type;
}

// ---------- Dark mode ----------

if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("admin-dark");
    const isDark = document.documentElement.classList.contains("admin-dark");
    darkModeToggle.textContent = isDark ? "Light Mode" : "Dark Mode";
  });
}

// ---------- Load cars ----------

async function loadCars() {
  setStatus("Loading vehicles...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/all`, {
      credentials: "include"
    });

    if (res.status === 401) {
      setStatus("Not authenticated — please log in via the hidden staff login.", "error");
      if (tableBody) tableBody.innerHTML = "";
      return;
    }

    if (!res.ok) {
      setStatus("Failed loading vehicles.", "error");
      return;
    }

    const html = await res.text();
    if (tableBody) {
      tableBody.innerHTML = html;
    }
    setStatus("Vehicles loaded.", "success");
  } catch (err) {
    console.error("Error loading vehicles:", err);
    setStatus("Failed loading vehicles.", "error");
  }
}

// ---------- Save / Sold / New vehicle ----------

async function save(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = {};
  row.querySelectorAll("input, textarea, select").forEach((el) => {
    if (!el.name) return;
    if (el.type === "number") {
      const num = el.value === "" ? null : Number(el.value);
      fields[el.name] = Number.isNaN(num) ? null : num;
    } else {
      fields[el.name] = el.value;
    }
  });

  setStatus("Saving...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields })
    });

    if (!res.ok) {
      setStatus("Save failed.", "error");
      return;
    }

    setStatus("Saved successfully.", "success");
  } catch (err) {
    console.error("Error saving vehicle:", err);
    setStatus("Save failed.", "error");
  }
}

async function sold(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const fields = { Status: "Sold" };
  const sortInput = row.querySelector('input[name="Sort_Index"]');
  if (sortInput && sortInput.value !== "") {
    const num = Number(sortInput.value);
    if (!Number.isNaN(num)) fields.Sort_Index = num;
  }

  setStatus("Updating status...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/update`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fields })
    });

    if (!res.ok) {
      setStatus("Action failed.", "error");
      return;
    }

    setStatus("Marked as sold.", "success");
    await loadCars();
  } catch (err) {
    console.error("Error marking sold:", err);
    setStatus("Action failed.", "error");
  }
}

async function createVehicle() {
  setStatus("Creating vehicle...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/create`, {
      method: "POST",
      credentials: "include"
    });

    if (!res.ok) {
      setStatus("Create failed.", "error");
      return;
    }

    setStatus("Vehicle created.", "success");
    await loadCars();
  } catch (err) {
    console.error("Error creating vehicle:", err);
    setStatus("Create failed.", "error");
  }
}

// ---------- Logout ----------

async function logout() {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (err) {
    console.error("Error logging out:", err);
  } finally {
    window.location.href = "/";
  }
}

// ---------- Row order (Sort_Index) helpers ----------

function moveRow(row, direction) {
  const sibling =
    direction === "up" ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) return;

  if (direction === "up") {
    row.parentNode.insertBefore(row, sibling);
  } else {
    row.parentNode.insertBefore(sibling, row);
  }

  // Re-number Sort_Index sequentially (1..N)
  const rows = Array.from(tableBody.querySelectorAll("tr[data-id]"));
  rows.forEach((r, index) => {
    const input = r.querySelector('input[name="Sort_Index"]');
    if (input) input.value = index + 1;
  });
}

window.moveUp = function (id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;
  moveRow(row, "up");
};

window.moveDown = function (id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;
  moveRow(row, "down");
};

// ---------- Full description inline editor ----------

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-edit-full]");
  if (!btn) return;

  const id = btn.getAttribute("data-edit-full");
  const row = btn.closest("tr[data-id]");
  if (!row || !id) return;

  const textarea = row.querySelector('textarea[name="Full_Description"]');
  if (!textarea) return;

  const current = textarea.value || "";
  const updated = window.prompt("Edit full description:", current);
  if (updated === null) return; // cancelled

  textarea.value = updated;
  save(id);
});

// ---------- Filters & buttons ----------

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => loadCars());
}

if (newVehicleBtn) {
  newVehicleBtn.addEventListener("click", () => createVehicle());
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => logout());
}

if (toggleHiddenCheckbox && tableBody) {
  toggleHiddenCheckbox.addEventListener("change", () => {
    const hideHidden = toggleHiddenCheckbox.checked;
    const rows = tableBody ? tableBody.querySelectorAll("tr[data-id]") : [];
    rows.forEach((row) => {
      const statusSelect = row.querySelector('select[name="Status"]');
      if (!statusSelect) return;
      const status = statusSelect.value || "";
      const isHidden = status === "Hidden" || status === "Sold";
      row.style.display = hideHidden && isHidden ? "none" : "";
    });
  });
}

// ---------- Initial load ----------

if (tableBody) {
  loadCars();
}

// Make main functions available globally for inline HTML onclicks from Worker output
window.save = save;
window.sold = sold;
window.createCar = createVehicle;
window.logout = logout;
