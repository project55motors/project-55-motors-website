// cars.js – auto-loads cars from Airtable via your secure Worker
async function loadCars() {
    const grid = document.getElementById('car-grid');
    if (!grid) {
        console.warn("car-grid element not found. Exiting loadCars.");
        return;
    }

    try {
        // --- 1. DATA FETCHING ---
        const response = await fetch('https://cars-api.nathan-ed2.workers.dev');

        if (!response.ok) {
            console.error(`Worker responded with HTTP Status: ${response.status}. Check your Worker logs.`);
            grid.innerHTML = `<p style='grid-column:1/-1;text-align:center;color:#c00;'>Error loading stock. Status: ${response.status}.</p>`;
            return;
        }

        const data = await response.json();
        
        const availableCars = data.records.filter(car => car.fields.Status !== "Sold");

        grid.innerHTML = '';
        
        // --- 2. GENERATE CAR CARDS (Matching Premium Structure) ---
        availableCars.forEach((car, index) => {
            const f = car.fields;

            const photos = f.Photos || [];
            const mainPhoto = photos[0]?.url || 'placeholder.jpg';

            const price = f.Price ? `£${Number(f.Price).toLocaleString()} ono` : 'POA';
            const mot = f.MOT_Date ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'N/A';
            const regDisplay = f.Registration || 'N/A';

            // Create car card <a> element (uses all premium CSS classes)
            const card = document.createElement('a');
            card.href = `#car${index}-modal`; // Links to the modal via hash
            card.className = 'car-card'; // Uses premium styling from styles.css

            card.innerHTML = `
                <img src="${mainPhoto}" alt="${f.Make_Model || 'Car'}">
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

            // --- 3. GENERATE MODAL (Also uses all premium CSS classes) ---
            const modal = document.createElement('div');
            modal.id = `car${index}-modal`;
            modal.className = 'modal'; 
            
            // Generate photo carousel images
            const photoHtml = photos.map(p => `<img src="${p.url}" alt="${f.Registration || 'Car'}">`).join('');
            
            // Format description for HTML display
            const descriptionHtml = (f.Full_Description || '').replace(/\n/g, '<br>');

            modal.innerHTML = `
                <a href="/" class="modal-close">×</a>
                <div class="modal-content">
                    <div class="photo-gallery-wrapper">
                        <div class="photo-gallery" id="gallery${index}">
                            ${photoHtml}
                        </div>
                        <div class="photo-nav prev" onclick="scrollGallery(${index}, -1)">‹</div>
                        <div class="photo-nav next" onclick="scrollGallery(${index}, 1)">›</div>
                    </div>
                    <div class="modal-details">
                        <h2>${f.Make_Model || 'Unknown Model'} – ${regDisplay}</h2>
                        <div class="full-description">${descriptionHtml}</div>
                        <div class="modal-specs">
                            <div><strong>Registration</strong><br>${regDisplay}</div>
                            <div><strong>Mileage</strong><br>${f.Mileage?.toLocaleString() || 'N/A'}</div>
                            <div><strong>MOT</strong><br>${mot}</div>
                            <div><strong>Price</strong><br>${price}</div>
                        </div>
                        <a href="/contact.html" class="cta">Enquire About This Vehicle</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        });
        
        // --- 4. Add premium 'Coming Soon' cards if there are available slots (up to 3 total on homepage) ---
        const totalCards = availableCars.length;
        if (grid.parentElement.querySelector('a[href="/inventory.html"]')) { // Only add placeholders on index.html
            for (let i = totalCards; i < 3; i++) {
                const comingSoonCard = document.createElement('div');
                comingSoonCard.className = 'car-card';
                comingSoonCard.style.opacity = '0.7'; // Use inline style from your premium static HTML
                
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
        const grid = document.getElementById('car-grid');
        if (grid) grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#c00;'>We are currently updating our stock list. Please check back shortly.</p>";
    }
}

// Function to scroll photo gallery - REQUIRED FOR MODAL GALLERY
function scrollGallery(index, direction) {
    const gallery = document.getElementById(`gallery${index}`);
    if (!gallery) return;
    const scrollAmount = gallery.clientWidth * 0.8;
    gallery.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// Initialize on DOMContentLoaded - REQUIRED TO START THE PROCESS
document.addEventListener('DOMContentLoaded', loadCars);