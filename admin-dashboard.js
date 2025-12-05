// admin-dashboard.js — MANAGEMENT TABLE



document.addEventListener("DOMContentLoaded", () => {

    loadAdminTable();

});



async function loadAdminTable() {

    const table = document.getElementById("admin-table-body");

    if (!table) return;



    try {

        const res = await fetch("https://project55motors.co.uk/api/admin/all", {

            credentials: "include" // REQUIRED

        });



        if (!res.ok) throw new Error("Not logged in");



        const html = await res.text();

        table.innerHTML = html;



    } catch (err) {

        table.innerHTML = `<tr><td colspan="10" style="color:red;">Login session expired. Please log in again.</td></tr>`;

        console.error(err);

    }

}



async function save(id) {

    const row = document.querySelector(`tr[data-id="${id}"]`);

    const fields = {};



    row.querySelectorAll("input, select, textarea").forEach(el => {

        fields[el.name] = el.value;

    });



    await fetch("https://project55motors.co.uk/api/admin/update", {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ id, fields })

    });



    alert("Saved");

}



async function sold(id) {

    await fetch("https://project55motors.co.uk/api/admin/update", {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ id, fields: { Status: "Sold" } })

    });



    alert("Marked as Sold");

    loadAdminTable();

}