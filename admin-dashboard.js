// admin-dashboard.js – BMW-style premium admin

const API_BASE = "/api";

const qs  = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
    hideInactive: false,
    isLoading: false
};

document.addEventListener("DOMContentLoaded", () => {
    bindStaticUI();
    checkSessionAndInit();
});

// ─────────────────────────────────────────────────────────────
//  SESSION / LOGIN
// ─────────────────────────────────────────────────────────────

async function checkSessionAndInit() {
    try {
        const res = await fetch(`${API_BASE}/login-check`, {
            credentials: "include"
        });

        if (!res.ok) {
            showLoginModal();
            return;
        }

        const data = await res.json();
        if (data.loggedIn) {
            hideLoginModal();
            await loadTable();
        } else {
            showLoginModal();
        }
    } catch (err) {
        console.error("Login-check error:", err);
        showLoginModal();
    }
}

function bindStaticUI() {
    const loginForm = qs("#login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }

    const btnLogout = qs("#btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", logout);
    }

    const btnRefresh = qs("#btn-refresh");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", loadTable);
    }

    const btnAddVehicle = qs("#btn-add-vehicle");
    if (btnAddVehicle) {
        btnAddVehicle.addEventListener("click", createVehicle);
    }

    const btnHideInactive = qs("#btn-hide-inactive");
    if (btnHideInactive) {
        btnHideInactive.addEventListener("click", () => {
            state.hideInactive = !state.hideInactive;
            btnHideInactive.textContent = state.hideInactive
                ? "Show All"
                : "Hide Sold / Hidden";
            applyRowFilters();
        });
    }

    const scrollShell = qs(".admin-table-scroll");
    if (scrollShell) {
        scrollShell.addEventListener("scroll", handleScrollShadows);
    }
}

async function handleLogin() {
    const usernameInput = qs("#login-username");
    const passwordInput = qs("#login-password");
    const messageEl     = qs("#login-message");

    if (!usernameInput || !passwordInput || !messageEl) return;

    messageEl.textContent = "";
    messageEl.classList.remove("error");

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        messageEl.textContent = "Please enter username and password.";
        messageEl.classList.add("error");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            messageEl.textContent = "Login failed – check details.";
            messageEl.classList.add("error");
            return;
        }

        const data = await res.json();
        if (data.success) {
            hideLoginModal();
            await loadTable();
            showToast("Logged in");
        } else {
            messageEl.textContent = "Login failed – check details.";
            messageEl.classList.add("error");
        }
    } catch (err) {
        console.error("Login error:", err);
        messageEl.textContent = "Network error – please try again.";
        messageEl.classList.add("error");
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/logout`, {
            method: "POST",
            credentials: "include"
        });
    } catch (err) {
        console.error("Logout error:", err);
    }

    showLoginModal();
}

// ─────────────────────────────────────────────────────────────
//  TABLE LOAD + ENHANCEMENTS
// ─────────────────────────────────────────────────────────────

async function loadTable() {
    if (state.isLoading) return;
    state.isLoading = true;

    const shell = qs(".admin-table-shell");
    if (shell) shell.classList.add("loading");

    try {
        const res = await fetch(`${API_BASE}/admin/all`, {
            credentials: "include"
        });

        if (!res.ok) {
            console.error("Failed to load admin/all", res.status);
            showToast("Error loading stock", true);
            return;
        }

        const html = await res.text();
        const tbody = qs("#admin-table-body");
        if (tbody) {
            tbody.innerHTML = html;
        }

        enhanceRows();
        applyRowFilters();
        handleScrollShadows();
    } catch (err) {
        console.error("Error loading table:", err);
        showToast("Network error loading stock", true);
    } finally {
        state.isLoading = false;
        if (shell) shell.classList.remove("loading");
    }
}

function enhanceRows() {
    const tbody = qs("#admin-table-body");
    if (!tbody) return;

    const rows = qsa("tr[data-id]", tbody);

    rows.forEach((row, index) => {
        row.dataset.sortIndex = String(index + 1);

        // Mark row as "clean" initially
        row.classList.remove("row-dirty");

        // Auto-resize textareas & flag dirty on change
        qsa("textarea", row).forEach((ta) => {
            autoResizeTextarea(ta);
            ta.addEventListener("input", () => {
                autoResizeTextarea(ta);
                markRowDirty(row);
            });
        });

        qsa('input, select', row).forEach((el) => {
            el.addEventListener("input", () => markRowDirty(row));
            el.addEventListener("change", () => markRowDirty(row));
        });

        // Add move up/down buttons (for sort order)
        const actionsCell = row.querySelector("td:last-child");
        if (actionsCell && !actionsCell.classList.contains("enhanced-actions")) {
            actionsCell.classList.add("enhanced-actions");

            const controls = document.createElement("div");
            controls.className = "row-order-controls";

            const upBtn = document.createElement("button");
            upBtn.type = "button";
            upBtn.className = "admin-btn admin-btn-icon";
            upBtn.title = "Move up";
            upBtn.textContent = "↑";
            upBtn.addEventListener("click", () => moveRow(row, -1));

            const downBtn = document.createElement("button");
            downBtn.type = "button";
            downBtn.className = "admin-btn admin-btn-icon";
            downBtn.title = "Move down";
            downBtn.textContent = "↓";
            downBtn.addEventListener("click", () => moveRow(row, 1));

            controls.append(upBtn, downBtn);
            actionsCell.appendChild(controls);
        }
    });

    // Expose global functions for inline onclick="save('id')" / "sold('id')"
    window.save = saveRow;
    window.sold = markSold;
}

function markRowDirty(row) {
    row.classList.add("row-dirty");
}

function autoResizeTextarea(ta) {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
}

function moveRow(row, direction) {
    const tbody = row.parentElement;
    if (!tbody) return;

    const rows = qsa("tr[data-id]", tbody);
    const index = rows.indexOf(row);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rows.length) return;

    const referenceNode =
        direction > 0 ? rows[index + 1].nextSibling : rows[index];
    tbody.insertBefore(row, referenceNode);

    // Update sort indexes and persist
    updateSortIndexes(tbody);
    persistSortOrder();
}

function updateSortIndexes(tbody) {
    const rows = qsa("tr[data-id]", tbody);
    rows.forEach((row, idx) => {
        row.dataset.sortIndex = String(idx + 1);
    });
}

async function persistSortOrder() {
    const tbody = qs("#admin-table-body");
    if (!tbody) return;

    const rows = qsa("tr[data-id]", tbody);

    try {
        await Promise.all(
            rows.map((row, index) => {
                const id = row.dataset.id;
                if (!id) return Promise.resolve();

                const fields = { Sort_Index: index + 1 };
                return fetch(`${API_BASE}/admin/update`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({ id, fields })
                });
            })
        );
        showToast("Display order updated");
    } catch (err) {
        console.error("Error saving sort order:", err);
        showToast("Error saving order", true);
    }
}

// ─────────────────────────────────────────────────────────────
//  SAVE / SOLD HANDLERS (used by inline buttons)
// ─────────────────────────────────────────────────────────────

async function saveRow(id) {
    const tbody = qs("#admin-table-body");
    if (!tbody) return;

    const row = qs(`tr[data-id="${id}"]`, tbody);
    if (!row) {
        console.warn("Row not found for id", id);
        return;
    }

    const payloadFields = {};

    qsa("input[name], select[name], textarea[name]", row).forEach((el) => {
        const name = el.name;
        if (!name) return;

        let value = el.value;

        if (el.type === "number") {
            value = value === "" ? null : Number(value);
        }

        // Price / Mileage normalisation as numbers
        if (name === "Price" || name === "Mileage") {
            value = value === "" ? null : Number(value);
        }

        payloadFields[name] = value;
    });

    // Include Sort_Index based on visible order
    const index =
        qsa("tr[data-id]", tbody).indexOf(row) + 1;
    payloadFields.Sort_Index = index;

    try {
        const res = await fetch(`${API_BASE}/admin/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ id, fields: payloadFields })
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("Save failed:", text);
            showToast("Save failed", true);
            return;
        }

        row.classList.remove("row-dirty");
        showToast("Saved");
    } catch (err) {
        console.error("Save error:", err);
        showToast("Save failed", true);
    }
}

async function markSold(id) {
    const tbody = qs("#admin-table-body");
    if (!tbody) return;

    const row = qs(`tr[data-id="${id}"]`, tbody);
    if (!row) return;

    const fields = { Status: "Sold" };

    try {
        const res = await fetch(`${API_BASE}/admin/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id, fields })
        });

        if (!res.ok) {
            showToast("Unable to mark Sold", true);
            return;
        }

        // Update dropdown locally if present
        const statusSelect = row.querySelector('select[name="Status"]');
        if (statusSelect) {
            statusSelect.value = "Sold";
        }

        showToast("Marked as Sold");
        applyRowFilters();
    } catch (err) {
        console.error("Sold error:", err);
        showToast("Unable to mark Sold", true);
    }
}

// ─────────────────────────────────────────────────────────────
//  CREATE VEHICLE
// ─────────────────────────────────────────────────────────────

async function createVehicle() {
    try {
        const res = await fetch(`${API_BASE}/admin/create`, {
            method: "POST",
            credentials: "include"
        });

        if (!res.ok) {
            showToast("Unable to create vehicle", true);
            return;
        }

        await loadTable();
        showToast("New vehicle created");
    } catch (err) {
        console.error("Create error:", err);
        showToast("Unable to create vehicle", true);
    }
}

// ─────────────────────────────────────────────────────────────
//  ROW FILTERS & SCROLL SHADOWS
// ─────────────────────────────────────────────────────────────

function applyRowFilters() {
    const tbody = qs("#admin-table-body");
    if (!tbody) return;

    const rows = qsa("tr[data-id]", tbody);
    rows.forEach((row) => {
        const statusSelect = row.querySelector('select[name="Status"]');
        const status = statusSelect ? statusSelect.value : "";

        const hide =
            state.hideInactive &&
            (status === "Sold" || status === "Hidden");

        row.style.display = hide ? "none" : "";
    });
}

function handleScrollShadows() {
    const scroll = qs(".admin-table-scroll");
    if (!scroll) return;

    const topShadow = qs(".admin-scroll-shadow.top");
    const bottomShadow = qs(".admin-scroll-shadow.bottom");

    const scrollTop = scroll.scrollTop;
    const maxScroll = scroll.scrollHeight - scroll.clientHeight;

    if (topShadow) {
        topShadow.classList.toggle("visible", scrollTop > 0);
    }
    if (bottomShadow) {
        bottomShadow.classList.toggle("visible", scrollTop < maxScroll - 1);
    }
}

// ─────────────────────────────────────────────────────────────
//  MODALS & TOAST
// ─────────────────────────────────────────────────────────────

function showLoginModal() {
    const modal = qs("#login-modal");
    if (modal) modal.classList.add("visible");
}

function hideLoginModal() {
    const modal = qs("#login-modal");
    if (modal) modal.classList.remove("visible");
}

let toastTimeout;

function showToast(message, isError = false) {
    const toast = qs("#admin-toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("error", "visible");
    if (isError) toast.classList.add("error");

    // force reflow so animation restarts
    void toast.offsetWidth;

    toast.classList.add("visible");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("visible");
    }, 2600);
}
