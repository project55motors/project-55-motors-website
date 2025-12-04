// cars.js — public stock for Home + Inventory
const CARS_API_URL = "https://project55motors.co.uk/cars-api/";


document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("car-grid");
    if (grid) loadCars();
});

async function loadCars() {
    const grid = document.getElementById("car-grid");
    if (!grid) return;

    try {
        const res = await fetch(CARS_API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("API error " + res.status);

        const data = await res.json();
        const records = data.records || [];

        if (!records.length) {
            grid.innerHTML = `<p>No vehicles available at the moment.</p>`;
            return;
        }

        const path = window.location.pathname;
        const isHome =
            path === "/" ||
            path.endsWith("/index.html") ||
            path.endsWith("index.html");

        const toShow = isHome ? records.slice(0, 3) : records;

        grid.innerHTML = "";

        toShow.forEach((rec) => {
            const f = rec.fields || {};
            const id = rec.id;
            const photo = (f.Photos && f.Photos[0] && f.Photos[0].url) || "";
            const title = f.Make_Model || "Vehicle";
            const reg = f.Registration || "";
            const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";

            const mileage = f.Mileage
                ? `${Number(f.Mileage).toLocaleString()} miles`
                : "";
            const mot = f.MOT_Date || "";
            const metaParts = [];
            if (mileage) metaParts.push(mileage);
            if (mot) metaParts.push(`MOT: ${mot}`);
            const meta = metaParts.join(" · ");

            const a = document.createElement("a");
            a.href = `vehicle.html?id=${encodeURIComponent(id)}`;
            a.className = "car-card";
            a.innerHTML = `
                <div class="car-card-img-wrapper">
                    <img src="${photo}" alt="${title}">
                </div>
                <div class="car-card-body">
                    <div class="car-card-title-row">
                        <h3>${title}</h3>
                        <div class="car-card-price">${price}</div>
                    </div>
                    <div class="car-card-reg">${reg}</div>
                    ${
                        meta
                            ? `<div class="car-card-meta">${meta}</div>`
                            : ""
                    }
                </div>
            `;
            grid.appendChild(a);
        });
    } catch (err) {
        console.error("Failed to load cars", err);
        grid.innerHTML = `<p style="color:red;">Failed to load stock.</p>`;
    }
}
