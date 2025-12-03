// ---------------------------------------------
//  VEHICLE.JS — Project 55 Motors (Premium Build)
// ---------------------------------------------

const API = "https://project55motors.co.uk/api";

// Utility: Get URL parameter
function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

// Fetch vehicle data from Worker API
async function loadVehicle() {
    const id = getParam("id");
    if (!id) return;

    const response = await fetch(`${API}/car?id=${id}`);
    const data = await response.json();

    if (!data || !data.fields) return;

    const car = data.fields;

    // --- MAIN IMAGE (Natural Fit) ---
    const mainPhoto = document.getElementById("vehicle-main-photo");
    const photos = Array.isArray(car.Photos)
        ? car.Photos.map(p => p.url)
        : [];

    if (photos.length > 0) {
        mainPhoto.src = photos[0];
        mainPhoto.alt = `${car.Make} ${car.Model}`;
    }

    // --- THUMBNAILS ---
    const thumbContainer = document.getElementById("vehicle-thumbnails");
    thumbContainer.innerHTML = "";

    photos.forEach((url, index) => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Thumbnail";

        img.addEventListener("click", () => {
            mainPhoto.src = url;
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        thumbContainer.appendChild(img);
    });

    // --- TITLE ---
    const title = `${car.Make || ""} ${car.Model || ""} ${car.Trim || ""}`.trim();
    document.getElementById("vehicle-title").textContent = title;

    // --- SPEC FIELDS ---
    document.getElementById("spec-reg").textContent = car.Registration || "-";
    document.getElementById("spec-mileage").textContent = car.Mileage
        ? `${car.Mileage.toLocaleString()} miles`
        : "-";
    document.getElementById("spec-engine").textContent = car.Engine_size || "-";
    document.getElementById("spec-fuel").textContent = car.Fuel_type || "-";
    document.getElementById("spec-mot").textContent = car.MOT || "-";

    if (car.Price) {
        document.getElementById("spec-price").textContent =
            "£" + Number(car.Price).toLocaleString();
    }

    // --- FULL DESCRIPTION ---
    document.getElementById("vehicle-description").innerHTML =
        (car.Full_description || "").replace(/\n/g, "<br>");

    // --- PREMIUM ENQUIRY BUTTON ---
    const enquireBtn = document.getElementById("enquire-btn");
    enquireBtn.addEventListener("click", () => {
        const msg = `Hello, I would like to enquire about the ${title} (${car.Registration}). Could you please provide availability and viewing options?`;

        // Redirect to contact page with pre-filled message
        window.location.href = `contact.html?msg=${encodeURIComponent(msg)}`;
    });
}

loadVehicle();
