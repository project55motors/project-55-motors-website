const MAIN_PHOTO = document.getElementById("main-photo");
const THUMBNAIL_CONTAINER = document.getElementById("thumbnails");
const WORKER_URL = "https://cars-api.nathan-ed2.workers.dev";

// Get Airtable record ID
const CAR_ID = new URLSearchParams(window.location.search).get("id");

// Load data
async function fetchCarDetails() {
    try {
        const response = await fetch(WORKER_URL);
        const data = await response.json();

        const record = data.records.find(r => r.id === CAR_ID);
        if (!record) {
            document.getElementById("detail-container").innerHTML =
                "<p>Vehicle not found.</p>";
            return;
        }

        const f = record.fields;

        // Set text fields
        document.getElementById("car-name").textContent = f.Make_Model || "";
        document.getElementById("car-description").textContent = f.Short_Description || "";
        document.getElementById("car-registration").textContent = f.Registration || "";
        document.getElementById("car-mileage").textContent = f.Mileage || "";
        document.getElementById("car-mot").textContent = f.MOT_Date || "";
        document.getElementById("car-engine").textContent = f.Engine_size || "";
        document.getElementById("car-fuel").textContent = f.Fuel_type || "";
        document.getElementById("car-price").textContent = f.Price || "";
        document.getElementById("car-full-description").textContent = f.Full_Description || "";

        // Images
        const photos = f.Photos || [];
        MAIN_PHOTO.src = photos.length ? photos[0].url : "placeholder.jpg";

        THUMBNAIL_CONTAINER.innerHTML = "";
        photos.forEach((photo, index) => {
            const thumb = document.createElement("img");
            thumb.src = photo.url;
            thumb.className = "thumbnail";
            if (index === 0) thumb.classList.add("active");

            thumb.addEventListener("click", () => {
                MAIN_PHOTO.src = photo.url;
                document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"));
                thumb.classList.add("active");
            });

            thumb.addEventListener("click", (e) => {
                e.preventDefault();
                showFullScreen(photo.url);
            });

            THUMBNAIL_CONTAINER.appendChild(thumb);
        });

        MAIN_PHOTO.addEventListener("click", () => showFullScreen(MAIN_PHOTO.src));

    } catch (err) {
        console.error(err);
        document.getElementById("detail-container").innerHTML =
            "<p>Error loading vehicle.</p>";
    }
}

// Full-screen viewer
function showFullScreen(src) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0,0,0,0.9)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "10000";
    overlay.style.cursor = "zoom-out";

    const img = document.createElement("img");
    img.src = src;
    img.style.maxWidth = "95%";
    img.style.maxHeight = "95%";
    img.style.borderRadius = "10px";

    overlay.appendChild(img);

    overlay.addEventListener("click", () => overlay.remove());

    document.body.appendChild(overlay);
}

fetchCarDetails();
