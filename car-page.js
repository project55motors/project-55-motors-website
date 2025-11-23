// car-page.js – Loads a single car's data onto the car.html page based on URL ID

// Function to handle image switching (same as in cars.js, needed here too)
function switchMainPhoto(element, url) {
    const mainViewer = document.querySelector('.gallery-main-viewer img');
    if (mainViewer) {
        mainViewer.src = url;
    }
    document.querySelectorAll('.gallery-thumbnail-strip img').forEach(img => {
        img.classList.remove('active');
    });
    element.classList.add('active');
}


async function loadSingleCar() {
    const container = document.getElementById('car-details-container');
    if (!container) return;

    // 1. Get the Car ID from the URL
    const params = new URLSearchParams(window.location.search);
    const carId = params.get('id');

    if (!carId) {
        container.innerHTML = "<h1 style='text-align:center;'>Error: Vehicle ID not found.</h1>";
        return;
    }

    try {
        // ... (data fetching remains the same) ...
        container.innerHTML = "<h1 style='text-align:center;'>Fetching data for ID: " + carId + "...</h1>";
        
        const response = await fetch('https://cars-api.nathan-ed2.workers.dev');
        
        if (!response.ok) {
            container.innerHTML = "<h1 style='text-align:center;color:red;'>Could not connect to stock API.</h1>";
            return;
        }

        const data = await response.json();
        
        // 3. Find the specific car
        const car = data.records.find(r => r.id === carId);

        if (!car || car.fields.Status === "Sold") {
            container.innerHTML = "<h1 style='text-align:center;'>Vehicle Not Found or No Longer Available.</h1>";
            return;
        }

        // --- 4. RENDER THE PREMIUM CAR DETAILS ---
        const f = car.fields;

        // --- Clean up photo data: USE A STRONG FILTER TO ENSURE NO DUPLICATES ---
        let photos = f.Photos || [];
        const uniqueUrls = new Set();
        const uniquePhotos = [];
        
        photos.forEach(p => {
            // Check if the URL is valid AND if we haven't seen it before
            if (p.url && !uniqueUrls.has(p.url)) {
                uniquePhotos.push(p);
                uniqueUrls.add(p.url);
            }
        });
        photos = uniquePhotos; 
        // -----------------------------------------------------------------------


        const mainPhotoUrl = photos[0]?.url || 'placeholder.jpg';
        const price = f.Price ? `£${Number(f.Price).toLocaleString()} ono` : 'POA';
        const mot = f.MOT_Date ? new Date(f.MOT_Date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'N/A';
        const regDisplay = f.Registration || 'N/A';
        const descriptionHtml = (f.Full_Description || '').replace(/\n/g, '<br>');

        document.title = `${f.Make_Model} (${regDisplay}) | Project 55 Motors`;

        // Generate Thumbnail strip HTML
        const thumbnailHtml = photos.map((p, i) => `
            <img src="${p.url}" 
                 alt="Thumbnail ${i + 1}" 
                 onclick="switchMainPhoto(this, '${p.url}')"
                 class="gallery-thumbnail ${i === 0 ? 'active' : ''}">
        `).join('');

        // Build the final content
        container.innerHTML = `
            <h1 style="font-size:3rem;margin-bottom:0.5rem;">${f.Make_Model || 'Unknown Model'}</h1>
            <h2 style="font-size:1.8rem;color:#444;margin-bottom:2rem;">${regDisplay} - ${price}</h2>
            
            <div class="modal-content">
                
                <div class="photo-gallery-wrapper">
                    <div class="gallery-main-viewer">
                        <img src="${mainPhotoUrl}" alt="${f.Make_Model} main photo">
                    </div>
                    
                    <div class="gallery-thumbnail-strip">
                        ${thumbnailHtml}
                    </div>
                </div>

                <div class="modal-details" style="padding:0;">
                    <div class="modal-specs" style="margin-bottom:2rem;">
                        <div><strong>Registration</strong><br>${regDisplay}</div>
                        <div><strong>Mileage</strong><br>${f.Mileage?.toLocaleString() || 'N/A'}</div>
                        <div><strong>MOT</strong><br>${mot}</div>
                        <div><strong>Price</strong><br>${price}</div>
                    </div>
                    
                    <a href="/contact.html?enquiry=${encodeURIComponent(f.Make_Model)}" class="cta" style="width:100%;margin-bottom:2rem;">Enquire About This Vehicle</a>

                    <div class="full-description">
                        <h3>Vehicle Overview</h3>
                        <p>${descriptionHtml}</p>
                    </div>
                </div>
            </div>
            <p style="text-align:center; margin-top:3rem;"><a href="/inventory.html">← Back to Stock List</a></p>
        `;


    } catch (err) {
        console.error("Error loading single car data:", err);
        container.innerHTML = "<h1 style='text-align:center;color:red;'>Failed to load vehicle details due to a network error.</h1>";
    }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', loadSingleCar);