// vehicle.js — WORLD CLASS VEHICLE DETAIL PAGE
// Source: https://project55motors.co.uk/cars-api

const API_URL = "https://project55motors.co.uk/cars-api";

// URL param: ?id=recXXXX
const CAR_ID = new URLSearchParams(window.location.search).get("id");

const MAIN_PHOTO = document.getElementById("vehicle-main-photo");
const THUMBS = document.getElementById("vehicle-thumbnails");

// Fullscreen elements
const FULLSCREEN = document.getElementById("fullscreen-overlay");
const FULL_IMG = document.getElementById("fullscreen-image");

async function loadVehicle() {

    if (!CAR_ID) {
        document.getElementById("vehicle-container").innerHTML =
            "<p style='color:red;'>Vehicle not found.</p>";
        return;
    }

    try {
        const res = await fetch(API_URL, { cache: "no-store" });
        const data = await res.json();

        const record = data.records.find(r => r.id === CAR_ID);
        if (!record) {
            document.getElementById("vehicle-container").innerHTML =
                "<p style='color:red;'>Vehicle not found.</p>";
            return;
        }

        const f = record.fields;

        // TITLE
        document.getElementById("vehicle-title").textContent = f.Make_Model || "";

        // SPECS
        document.getElementById("spec-reg").textContent = f.Registration || "";
        document.getElementById("spec-price").textContent = f.Price
            ? `£${Number(f.Price).toLocaleString()}`
            : "POA";

        document.getElementById("spec-mileage").textContent = f.Mileage
            ? `${Number(f.Mileage).toLocaleString()} miles`
            : "";

        document.getElementById("spec-mot").textContent = f.MOT_Date || "";
        document.getElementById("spec-engine").textContent = f.Engine_size || "";
        document.getElementById("spec-fuel").textContent = f.Fuel_type || "";

        // FULL DESCRIPTION
        document.getElementById("vehicle-description").innerHTML =
            `<p>${(f.Full_Description || "").replace(/\n/g, "<br>")}</p>`;

        // PHOTOS
        const photos = f.Photos || [];
        if (photos.length) {
            MAIN_PHOTO.src = photos[0].url;
        }

        THUMBS.innerHTML = "";
        photos.forEach((p, index) => {

            const t = document.createElement("img");
            t.src = p.url;
            t.className = "vehicle-thumb";
            if (index === 0) t.classList.add("active");

            t.addEventListener("click", () => {
                MAIN_PHOTO.src = p.url;
                document.querySelectorAll(".vehicle-thumb").forEach(x => x.classList.remove("active"));
                t.classList.add("active");
            });

            THUMBS.appendChild(t);
        });

        // FULLSCREEN CLICK
        MAIN_PHOTO.addEventListener("click", () => {
            FULL_IMAGESHOW(MAIN_PHOTO.src);
        });

    } catch (err) {
        console.error(err);
    }
}

function FULL_IMAGESHOW(src) {
    FULL_IMG.src = src;
    FULLSCREEN.style.display = "flex";
}

FULLSCREEN.addEventListener("click", () => {
    FULLSCREEN.style.display = "none";
});

loadVehicle();
