// -------------------------------------------------------------
//  cars.js — Loads stock for homepage + inventory pages
//  Uses the public cars-api Worker (only returns non-sold cars)
// -------------------------------------------------------------

const API_URL = "https://project55motors.co.uk/cars-api";

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("car-grid");
    if (grid) loadCars(grid);
});

/* -------------------------------------------------------------
    LOAD ALL CARS
------------------------------------------------------------- */
async function loadCars(grid) {
    try {
        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("API Error " + res.status);

        const data = await res.json();
        const records = data.records || [];

        // Filter for AVAILABLE cars only
        const available = records.filter(r =>
            (r.fields.Status || "").toLowerCase() === "available"
        );

        if (!available.length) {
            grid.innerHTML = `<p style="text-align:center;">No vehicles are currently in stock.</p>`;
            return;
        }

        // Limit to 3 on home page
        const isHome = window.location.pathname.endsWith("index.html")
                    || window.location.pathname === "/";

        const carsToShow = isHome ? available.slice(0, 3) : available;

        // Clear grid
        grid.innerHTML = "";

        // Build each car card
        carsToShow.forEach(car => {
            const f = car.fields;

            const img = f.Photos?.[0]?.url || "assets/placeholder.jpg";
            const title = f.Make_Model || "Unnamed Vehicle";
            const reg = f.Registration || "";
            const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";
            const mileage = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "";
            const mot = f.MOT_Date || "";

            // Clean ID for use in query string
            const vehicleID = encodeURIComponent(car.id);

            const card = document.createElement("a");
            card.href = `vehicle.html?id=${vehicleID}`;
            card.className = "car-card";

            card.innerHTML = `
                <img src="${img}" alt="${title}">
                <div class="car-info">
                    <h3>${title}</h3>
                    <p class="reg">${reg}</p>
                    <p class="price">${price}</p>
                    ${mileage ? `<p>${mileage}</p>` : ""}
                    ${mot ? `<p>MOT: ${mot}</p>` : ""}
                </div>
            `;

            grid.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        grid.innerHTML = `<p style="text-align:center;color:red;">Unable to load stock.</p>`;
    }
}
