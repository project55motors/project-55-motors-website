// cars.js – UPDATED FOR DETAIL PAGES AND CORRECTED AIRTABLE KEY
async function loadCars() {
    // Calls your secure Worker – no key in this file
    const response = await fetch('https://cars-api.nathan-ed2.workers.dev');
    const data = await response.json();
    
    const cars = data.records.filter(car => car.fields.Status !== "Sold");

    const grid = document.getElementById('car-grid');
    grid.innerHTML = '';
    
    if (cars.length === 0) {
        grid.innerHTML = '<p style="text-align:center; padding: 5rem 0;">We currently have no vehicles in stock.</p>';
        return;
    }

    cars.forEach((car) => {
        const f = car.fields;
        const photos = f.Photos || [];
        const mainPhoto = photos[0]?.url || 'placeholder.jpg';
        const price = f.Price ? `£${Number(f.Price).toLocaleString()} ono` : 'POA';
        const mot = f.MOT_Date ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'N/A';
        
        const card = document.createElement('a');
        
        // Link to detail.html
        card.href = '/detail.html?reg=' + encodeURIComponent(f.Registration);
        
        card.className = 'car-card';
        card.style = 'display:block;text-decoration:none;color:inherit;';
        card.innerHTML = `
            <img src="${mainPhoto}" alt="${f.Registration || 'Car'}" loading="lazy">
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
    });
}
document.addEventListener('DOMContentLoaded', loadCars);
