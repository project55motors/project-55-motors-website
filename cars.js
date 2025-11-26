// cars.js — FINAL FIXED VERSION for Project 55 Motors

async function loadCars() {
    const grid = document.getElementById('car-grid');

    if (!grid) {
        console.warn("car-grid element not found. Exiting loadCars.");
        return;
    }

    try {
        const response = await fetch('https://cars-api.nathan-ed2.workers.dev', {
            method: 'GET',
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Worker responded with HTTP Status: ${response.status}`);
            grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#c00;">Error loading stock. Status: ${response.status}.</p>`;
            return;
        }

        const data = await response.json();

        if (!data.records || !data.records.length) {
            grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;">No vehicles currently available</p>`;
            return;
        }

        const availableCars = data.records.filter(car => car.fields.Status !== "Sold");

        grid.innerHTML = '';

        availableCars.forEach(car => {

            const f = car.fields;

            const photos = f.Photos || [];
            const mainPhotoUrl = photos[0]?.url || 'placeholder.jpg';

            const price = f.Price
                ? `£${Number(f.Price).toLocaleString()}`
                : 'POA';

            const mot = f.MOT_Date
                ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : 'N/A';

            const reg = f.Registration || 'N/A';

            const card = document.createElement('div');
            card.className = 'car-card';

            card.innerHTML = `
                <img src="${mainPhotoUrl}" alt="${f.Make_Model || 'Car'}">
                <div class="car-details">
                    <h2>${f.Make_Model || ''}</h2>
                    <p>${f.Short_Description || ''}</p>
                    <div class="specs">
                        <div><strong>Reg</strong><br>${reg}</div>
                        <div><strong>Mileage</strong><br>${f.Mileage?.toLocaleString() || 'N/A'}</div>
                        <div><strong>MOT</strong><br>${mot}</div>
                        <div><strong>Price</strong><br>${price}</div>
                    </div>
                </div>
            `;

            grid.appendChild(card);

        });

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#c00;">We’re updating our stock. Please try again shortly.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', loadCars);
