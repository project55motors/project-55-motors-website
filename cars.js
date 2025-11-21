// cars.js – pulls cars from your secure Worker (no password visible!)
async function loadCars() {
    const response = await fetch('https://cars-api.nathan-ed2.workers.dev');
    const data = await response.json();
    const cars = data.data.filter(car => car.fields.status !== "Sold").reverse();

    const grid = document.getElementById('car-grid');
    grid.innerHTML = '';

    cars.forEach((car, index) => {
        const photos = car.fields.photos || [];
        const mainPhoto = photos[0] || 'placeholder.jpg';
        const priceFormatted = `£${parseInt(car.fields.price).toLocaleString()} ono`;
        const motFormatted = new Date(car.fields.mot_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        const card = document.createElement('a');
        card.href = `#car${index}-modal`;
        card.className = 'car-card';
        card.style = 'display:block; text-decoration:none; color:inherit;';
        card.innerHTML = `
            <img src="${mainPhoto}" alt="${car.fields.registration}">
            <div class="car-details">
                <h2>${car.fields.make_model}</h2>
                <p>${car.fields.short_desc}</p>
                <div class="specs">
                    <div><strong>Reg</strong><br>${car.fields.registration}</div>
                    <div><strong>Mileage</strong><br>${car.fields.mileage}</div>
                    <div><strong>MOT</strong><br>${motFormatted}</div>
                    <div><strong>Price</strong><br>${priceFormatted}</div>
                </div>
                <div class="cta" style="margin-top:1rem;">View Full Details →</div>
            </div>
        `;
        grid.appendChild(card);

        // Modal
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
                        ${photos.map(photo => `<img src="${photo}" alt="${car.fields.registration}">`).join('')}
                    </div>
                </div>
                <div class="modal-details">
                    <h2>${car.fields.make_model} – ${car.fields.registration}</h2>
                    <div class="full-description">${car.fields.full_desc.replace(/\n/g, '<br>')}</div>
                    <div class="modal-specs">
                        <div><strong>Registration</strong><br>${car.fields.registration}</div>
                        <div><strong>Mileage</strong><br>${car.fields.mileage}</div>
                        <div><strong>MOT</strong><br>${motFormatted}</div>
                        <div><strong>Price</strong><br>${priceFormatted}</div>
                    </div>
                    <a href="/contact.html" class="cta">Enquire</a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

function scrollGallery(index, direction) {
    const gallery = document.getElementById(`gallery${index}`);
    const scrollAmount = gallery.clientWidth;
    gallery.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', loadCars);