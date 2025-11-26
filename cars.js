// cars.js – Auto-loads cars from Airtable via Cloudflare Worker
// Connected to: https://api.project55motors.co.uk

async function loadCars() {
    const grid = document.getElementById('car-grid');
    if (!grid) {
        console.warn("car-grid element not found. Exiting loadCars.");
        return;
    }

    try {
        const response = await fetch('https://api.project55motors.co.uk', {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            console.error(`Worker response error: ${response.status}`);
            grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#c00;">
                Error loading stock. Status: ${response.status}
            </p>`;
            return;
        }

        const data = await response.json();

        if (!data.records || !data.records.length) {
            grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#555;">
                No stock available at the moment.
            </p>`;
            return;
        }

        const availableCars = data.records.filter(car => car.fields?.Status !== "Sold");

        grid.innerHTML = '';

        availableCars.forEach(car => {
            const f = car.fields;

            let photos = f.Photos || [];
            const mainPhoto = photos[0]?.url || 'placeholder.jpg';

            const price = f.Price
                ? `£${Number(f.Price).toLocaleString()}`
                : 'POA';

            const mot = f.MOT_Date
                ? new Date(f.MOT_Date).toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric'
                })
                : 'N/A';

            const card = document.createElement('a');
            card.href = `/car.html?id=${car.id}`;
            card.className = 'car-card';

            card.innerHTML = `
                <img src="${mainPhoto}" alt="${f.Make_Model || 'Car'}">
                <div class="car-details">
                    <h2>${f.Make_Model || 'Vehicle'}</h2>
                    <p>${f.Short_Description || ''}</p>

                    <div class="specs">
                        <div><strong>Reg</strong><br>${f.Registration || 'N/A'}</div>
                        <div><strong>Mileage</strong><br>${(f.Mileage || 0).toLocaleString()}</div>
                        <div><strong>MOT</strong><br>${mot}</div>
                        <div><strong>Price</strong><br>${price}</div>
                    </div>

                    <div class="cta" style="margin-top:1rem;">
                        View Full Details →
                    </div>
                </div>
            `;

            grid.appendChild(card);
        });

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#c00;">
            We are currently updating stock. Please check back shortly.
        </p>`;
    }
}

// Init
document.addEventListener('DOMContentLoaded', loadCars);
