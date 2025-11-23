const DETAIL_CONTAINER = document.getElementById("detail-container");
const MAIN_PHOTO = document.getElementById("main-photo");
const THUMBNAIL_CONTAINER = document.getElementById("thumbnails");
const WORKER_URL = "https://cars-api.nathan-ed2.workers.dev"; // your Cloudflare worker URL

// Get the car ID from URL
const params = new URLSearchParams(window.location.search);
const CAR_ID = params.get("id");

async function fetchCarDetails() {
    try {
        const response = await fetch(WORKER_URL);
        const data = await response.json();

        if (!data.records || data.records.length === 0) {
            DETAIL_CONTAINER.innerHTML = "<p>Car details not found.</p>";
            return;
        }

        const record = data.records.find(r => r.id === CAR_ID);
        if (!record) {
            DETAIL_CONTAINER.innerHTML = "<p>Car details not found.</p>";
            return;
        }

        const fields = record.fields;

        // Set main content
        document.getElementById("car-name").textContent = fields.Name || "Unknown Vehicle";
        document.getElementById("car-description").textContent = fields.Description || "";
        document.getElementById("car-registration").textContent = fields.Registration || "";
        document.getElementById("car-mileage").textContent = fields.Mileage || "";
        document.getElementById("car-mot").textContent = fields.MOT || "";
        document.getElementById("car-price").textContent = fields.Price || "";

        // Handle images
        const photos = fields.Photos || [];
        if (photos.length === 0) {
            MAIN_PHOTO.src = "placeholder.jpg";
        } else {
            MAIN_PHOTO.src = photos[0].url;
        }

        THUMBNAIL_CONTAINER.innerHTML = ""; // clear thumbnails

        photos.forEach((photo, index) => {
            const thumb = document.createElement("img");
            thumb.src = photo.url;
            thumb.className = "thumbnail";
            if (index === 0) thumb.classList.add("active");

            // Thumbnail click sets main image
            thumb.addEventListener("click", (e) => {
                e.preventDefault();
                MAIN_PHOTO.src = photo.url;
                document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"));
                thumb.classList.add("active");

                showFullScreenImage(photo.url); // optional: remove if full-screen only on main image
            });

            THUMBNAIL_CONTAINER.appendChild(thumb);
        });

        // Full-screen main image click
        MAIN_PHOTO.addEventListener("click", () => showFullScreenImage(MAIN_PHOTO.src));

    } catch (err) {
        console.error("Failed to fetch car details:", err);
        DETAIL_CONTAINER.innerHTML = "<p>Error loading car details. Please try again later.</p>";
    }
}

// Full-screen image overlay
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
fetchCarDetails();
