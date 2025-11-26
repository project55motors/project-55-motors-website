// cars.js – auto-loads cars from Airtable via your secure Worker
// ✅ CORRECT ROUTE: https://api.project55motors.co.uk/cars

// Function to handle image switching (needs to be global)
function switchMainPhoto(element, url) {
    const modalContent = element.closest('.modal-content');
    if (!modalContent) return;

    const viewer = modalContent.querySelector('.gallery-main-viewer img');
    if (viewer) {
        viewer.src = url;
    }

    modalContent.querySelectorAll('.gallery-thumbnail-strip img').forEach(img => {
        img.classList.remove('active');
    });
    element.classList.add('active');
}

async function loadCars() {
    const grid = document.getElementById('car-grid');

    if (!grid) {
        console.warn("car-grid element not found. Exiting loadCars.");
        return;
    }

    try {
        // ✅ CORRECT CLOUDFLARE ROUTE FOR CARS
        const response = await fetch('https://api.project55motors.co.uk/cars');

        if (!response.ok) {
            console.error(`Worker responded with HTTP Status: ${response.status}`);
            grid.innerHTML = `<p style='grid-column:1/-1;text-align:center;color:#c00;'>Error loading stock. Status: ${response.status}.</p>`;
            return;
        }

        const data = await response.json();

        const availableCars = data.records.filter(car => car.fields.Status !== "Sold");

        grid.innerHTML = '';

        availableCars.forEach((car) => {
            const f = car.fields;

            let photos = f.Photos || [];
            const uniquePhotos = [];
            const seenUrls = new Set();

            photos.forEach(p => {
                if (p.url && !seenUrls.has(p.url)) {
                    uniquePhotos.push(p);
                    seenUrls.add(p.url);
                }
            });

            photos = uniquePhotos;

            const mainPhotoUrl = photos[0]?.url || 'placeholder.jpg';
            const price = f.Price ? `£${Number(f.Price).toLocaleString()} ono` : 'POA';
            const mot = f.MOT_Date
                ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : 'N/A';

            const regDisplay = f.Registration || 'N/A';

            const card = document.createElement('a');
            card.href = `/car.html?id=${car.id}`;
            card.className = 'car-card';

            card.innerHTML = `
                <img src="${mainPhotoUrl}" alt="${f.Make_Model || 'Car'}">
                <div class="car-details">
                    <h2>${f.Make_Model || 'Unknown Model'}</h2>
                    <p>${f.Short_Description || ''}</p>
                    <div class="specs">
                        <div><strong>Reg</strong><br>${regDisplay}</div>
                        <div><strong>Mileage</strong><br>${f.Mileage?.toLocaleString() || 'N/A'}</div>
                        <div><strong>MOT</strong><br>${mot}</div>
                        <div><strong>Price</strong><br>${price}</div>
                    </div>
                    <div class="cta" style="margin-top:1rem;">View Full Details →</div>
                </div>
            `;

            grid.appendChild(card);
        });

        // Optional "Coming Soon" cards
        const totalCards = availableCars.length;

        if (grid.parentElement.querySelector('a[href="/inventory.html"]')) {
            for (let i = totalCards; i < 3; i++) {
                const comingSoonCard = document.createElement('div');
                comingSoonCard.className = 'car-card';
                comingSoonCard.style.opacity = '0.7';

                comingSoonCard.innerHTML = `
                    <div style="background:#f0f0f0;height:300px;display:flex;align-items:center;justify-content:center;border-radius:18px 18px 0 0;">
                        <p style="font-size:1.4rem;color:#999;">Coming Soon</p>
                    </div>
                    <div class="car-details">
                        <h2 style="color:#999;">An exceptional vehicle</h2>
                        <p style="color:#999;">Hand-selected and prepared to the same exacting standards.</p>
                        <div class="specs" style="visibility:hidden;"></div>
                    </div>
                `;

                grid.appendChild(comingSoonCard);
            }
        }

    } catch (err) {
        console.error("CRITICAL FETCH/PARSING ERROR:", err);
        grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#c00;'>We are currently updating our stock list. Please check back shortly.</p>";
    }
}

document.addEventListener('DOMContentLoaded', loadCars);
