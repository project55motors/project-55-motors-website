// detail.js – Fetches and renders a single car detail page with a gallery
async function loadCarDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const reg = urlParams.get('reg');
    const contentContainer = document.getElementById('detail-content');

    if (!reg) {
        contentContainer.innerHTML = '<h1 style="text-align:center;">Error: Vehicle Registration Not Found.</h1><p style="text-align:center;">Please return to the <a href="/inventory.html">Stock Page</a>.</p>';
        return;
    }

    try {
        const response = await fetch('https://cars-api.nathan-ed2.workers.dev');
        const data = await response.json();
        
        const car = data.records.find(car => car.fields.Registration === reg);

        if (!car) {
            contentContainer.innerHTML = `<h1 style="text-align:center;">Vehicle Not Available.</h1><p style="text-align:center;">The car with registration ${reg} could not be found or may have been sold.</p>`;
            return;
        }

        const f = car.fields;
        const photos = f.Photos || [];
        const price = f.Price ? `£${Number(f.Price).toLocaleString()} ono` : 'POA';
        const mot = f.MOT_Date ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'N/A';
        const model = f['Make & Model'] || 'Unknown Model';

        document.getElementById('page-title').textContent = `${model} | Reg: ${f.Registration} - Project 55 Motors`;

        // Determine if we have photos to render
        const photoSectionHTML = photos.length > 0 ? `
            <div class="photo-section">
                <div id="main-photo-container">
                    <img id="main-car-photo" src="${photos[0].url}" alt="${model} main photo">
                </div>

                <div id="thumbnail-gallery">
                    ${photos.map((p, index) => `
                        <div class="thumbnail ${index === 0 ? 'active' : ''}" data-url="${p.url}">
                            <img src="${p.url}" alt="${model} thumbnail ${index + 1}" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `<div class="photo-section"><p style="text-align:center; padding: 2rem;">No photos available for this vehicle.</p></div>`;


        // Render the content
        contentContainer.innerHTML = `
            <div class="detail-grid">
                ${photoSectionHTML}

                <div class="detail-specs">
                    <h1>${model}</h1>
                    <p style="font-size:1.4rem; font-weight:700; color:var(--brand-primary);">${price}</p>
                    
                    <div class="specs">
                        <div><strong>Registration</strong><br>${f.Registration || 'N/A'}</div>
                        <div><strong>Mileage</strong><br>${f.Mileage?.toLocaleString() || 'N/A'}</div>
                        <div><strong>MOT Expiry</strong><br>${mot}</div>
                    </div>
                    
                    <a href="/checkout.html?reg=${f.Registration}" class="cta" style="width:100%; text-align:center;">Reserve Car or Enquire</a>
                    
                    <h3 style="margin-top: 2rem;">Full Description</h3>
                    <div class="detail-description">${f.Full_Description || 'No detailed description provided.'}</div>
                </div>
            </div>
        `;

        // 2. Attach the click handler ONLY if photos were rendered
        if (photos.length > 0) {
            document.querySelectorAll('.thumbnail').forEach(thumbnail => {
                thumbnail.addEventListener('click', function() {
                    const newPhotoUrl = this.getAttribute('data-url');
                    const mainPhoto = document.getElementById('main-car-photo');
                    
                    // Update main photo source
                    mainPhoto.src = newPhotoUrl;
                    
                    // Update active class for visual feedback
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        }

    } catch (error) {
        console.error("Failed to load car details:", error);
        contentContainer.innerHTML = '<h1 style="text-align:center;">Error: Could not load data from the server.</h1>';
    }
}

document.addEventListener('DOMContentLoaded', loadCarDetail);
