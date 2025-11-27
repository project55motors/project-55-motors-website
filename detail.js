// detail.js – FIXED

const MAIN_PHOTO = document.getElementById("main-photo");
const THUMBNAIL_CONTAINER = document.getElementById("thumbnails");
const API_URL = "/api/all";

const CAR_ID = new URLSearchParams(window.location.search).get("id");

async function fetchCarDetails() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        const record = data.records.find(r => r.id === CAR_ID);

        if (!record) {
            document.getElementById("detail-container").innerHTML =
                "<p>Vehicle not found.</p>";
            return;
        }

        const f = record.fields;

        document.getElementById("car-name").textContent = f.Make_Model || "";
        document.getElementById("car-description").textContent = f.Short_Description || "";
        document.getElementById("car-registration").textContent = f.Registration || "";
        document.getElementById("car-mileage").textContent = f.Mileage?.toLocaleString() || "";
        document.getElementById("car-mot").textContent = f.MOT_Date || "";
        document.getElementById("car-engine").textContent = f.Engine_size || "";
        document.getElementById("car-fuel").textContent = f.Fuel_type || "";
        document.getElementById("car-price").textContent = f.Price || "";
        document.getElementById("car-full-description").innerHTML =
            (f.Full_Description || "").replace(/\n/g, "<br>");

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
                document.querySelectorAll(".thumbnail").forEach(t =>
                    t.classList.remove("active")
                );
                thumb.classList.add("active");
            });

            THUMBNAIL_CONTAINER.appendChild(thumb);
        });

    } catch (err) {
        console.error(err);
        document.getElementById("detail-container").innerHTML =
            "<p>Error loading vehicle.</p>";
    }
}

document.addEventListener("DOMContentLoaded", fetchCarDetails);
