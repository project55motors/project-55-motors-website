// cars.js – auto-loads cars from Airtable (unlimited photos, free forever, API key hidden in Worker)
async function loadCars() {
    // Calls your secure Cloudflare Worker – no key in this file
    const response = await fetch('https://cars-api.nathan-ed2.workers.dev');
    const data = await response.json();
    const cars = data.records.filter(car => car.fields.Status !== "Sold"); // hide sold cars

    const grid = document.getElementById('car-grid');
    grid.innerHTML = '';

    cars.forEach((car, index) => {
        const f = car.fields;
        const photos = f.Photos || [];
        const mainPhoto = photos[0]?.url || 'placeholder.jpg';
        const price = f.Price ? `£${Number(f.Price).toLocaleString()} ono` : 'POA';
        const mot = f.MOT_Date ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'N/A';

        const card = document.createElement('a');
        card.href = `#car${index}-modal`;
        card.className = 'car-card';
        card.style = 'display:block;text-decoration:none;color:inherit;';
        card.innerHTML = `
            <img src="${mainPhoto}" alt="${f.Registration || 'Car'}">
            <div class="car-details">
                <h2>${f.Make_Model || 'Unknown Model'}</h2>
                <p>${f.Short_Description || ''}</p>
                <div class="specs">
                    <div><strong>Reg</strong><br>${f.Registration || 'N/A'}</div>
                    <div><strong>Mileage</strong><br>${f.Mileage?.toLocaleString() || 'N/A'}</div>
                    <div><strong>MOT</strong><br>${mot}</div>
                    <div><strong>Price</strong><br>${price}</div>
                </div>
                <div class="cta" style="margin-top:1rem;">View Full Details →</div>
            </div>
        `;
        grid.appendChild(card);

        // Modal with all photos + scrollable description
        const modal = document.createElement('div');
        modal.id = `car${index}-modal`;
        modal.className = 'modal';
        modal.innerHTML = `
            <a href="/" class="modal-close">×</a>
            <div class="modal-content">
                <div class="photo-gallery-wrapper">
                    <div class="photo-gallery" id="gallery${index}">
                        <div class="photo-nav prev" onclick="scrollGallery(${index}, -1)">‹</div>
                        <div class="photo-nav next" onclick="scrollGallery(${index}, 1)">›</div>
                        ${photos.map(p => `<img src="${p.url}" alt="${f.Registration || 'Car'}">`).join('')}
                    </div>
                </div>
                <div class="modal-details">
                    <h2>${f.Make_Model || 'Unknown Model'} – ${f.Registration || 'N/A'}</h2>
                    <div class="full-description">${(f.Full_Description || '').replace(/\n/g, '<br>')}</div>
                    <div class="modal-specs">
                        <div><strong>Registration</strong><br>${f.Registration || 'N/A'}</div>
                        <div><strong>Mileage</strong><br>${f.Mileage?.toLocaleString() || 'N/A'}</div>
                        <div><strong>MOT</strong><br>${mot}</div>
                        <div><strong>Price</strong><br>${price}</div>
                    </div>
                    <a href="/contact.html"