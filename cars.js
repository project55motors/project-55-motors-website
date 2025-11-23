const CAR_GRID = document.getElementById("car-grid");
const WORKER_URL = "https://cars-api.nathan-ed2.workers.dev"; // Cloudflare worker URL

async function fetchCars() {
    try {
        const response = await fetch(WORKER_URL);
        const data = await response.json();

        if (!data.records || data.records.length === 0) {
            CAR_GRID.innerHTML = "<p>No cars available at the moment.</p>";
            return;
        }

        CAR_GRID.innerHTML = ""; // clear grid before populating

        data.records.forEach(record => {
            const fields = record.fields;

            const carCard = document.createElement("a");
            carCard.href = `/inventory.html?id=${record.id}`;
            carCard.className = "car-card";

            const imgSrc = (fields.Photos && fields.Photos[0] && fields.Photos[0].url) || "placeholder.jpg";

            carCard.innerHTML = `
                <img src="${imgSrc}" alt="${fields.Name || "Car"}">
                <div class="car-details">
                    <h2>${fields.Name || "Unknown Vehicle"}</h2>
                    <p>${fields.Description || ""}</p>
                    <div class="specs">
                        <div><strong>Reg</strong><br>${fields.Registration || ""}</div>
                        <div><strong>Mileage</strong><br>${fields.Mileage || ""}</div>
                        <div><strong>MOT</strong><br>${fields.MOT || ""}</div>
                        <div><strong>Price</strong><br>${fields.Price || ""}</div>
                    </div>
                </div>
            `;

            CAR_GRID.appendChild(carCard);

            // Click image → full-screen
            carCard.querySelector("img").addEventListener("click", e => {
                e.preventDefault();
                showFullScreenImage(imgSrc);
            });
        });

    } catch (err) {
        console.error("Failed to fetch car data:", err);
        CAR_GRID.innerHTML = "<p>Error loading cars. Please try again later.</p>";
    }
}

// Full-screen overlay for car images
function showFullScreenImage(src) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0,0,0,0.85)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "10000";
    overlay.style.cursor = "pointer";

    const img = document.createElement("img");
    img.src = src;
    img.style.maxWidth = "95%";
    img.style.maxHeight = "95%";
    img.style.borderRadius = "12px";

    overlay.appendChild(img);
    overlay.addEventListener("click", () => document.body.removeChild(overlay));

    document.body.appendChild(overlay);
}

// Initialize
fetchCars();
