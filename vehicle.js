// vehicle.js — premium vehicle detail script
const VEHICLE_API_URL = "https://project55motors.co.uk/cars-api/";

document.addEventListener("DOMContentLoaded", () => {
    loadVehicle();
});

async function loadVehicle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const container = document.getElementById("vehicle-page");
    if (!id || !container) {
        container.innerHTML = "<p style='color:red;'>Vehicle not found.</p>";
        return;
    }

    try {
        const res = await fetch(VEHICLE_API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        const record = data.records.find(v => v.id === id);

        if (!record) {
            container.innerHTML = "<p style='color:red;'>Vehicle not found.</p>";
            return;
        }

        renderVehicle(record);

    } catch (err) {
        console.error("Error loading vehicle:", err);
        container.innerHTML = "<p style='color:red;'>Failed to load vehicle.</p>";
    }
}

function renderVehicle(rec) {
    const f = rec.fields || {};

    // Assign text values
    document.getElementById("vehicle-title").textContent = f.Make_Model || "";
    document.getElementById("vehicle-reg").textContent = f.Registration ? `Registration: ${f.Registration}` : "";
    document.getElementById("vehicle-price").textContent = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";
    document.getElementById("vehicle-mileage").textContent = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "—";
    document.getElementById("vehicle-mot").textContent = f.MOT_Date || "—";
    document.getElementById("vehicle-engine").textContent = f.Engine_size || "—";
    document.getElementById("vehicle-fuel").textContent = f.Fuel_type || "—";

    // Preserve formatting in description
    const descEl = document.getElementById("vehicle-description");
    descEl.innerHTML = (f.Full_Description || "")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");

    // PHOTO HANDLING
    const photos = Array.isArray(f.Photos) ? f.Photos : [];
    const heroImg = document.getElementById("vehicle-hero");
    const thumbs = document.getElementById("vehicle-thumbs");

    if (!photos.length) {
        heroImg.style.display = "none";
        return;
    }

    let currentIndex = 0;

    // Apply hero image
    function setHero(index) {
        currentIndex = Math.max(0, Math.min(index, photos.length - 1));

        heroImg.src = photos[currentIndex].url;
        heroImg.alt = `${f.Make_Model} photo ${currentIndex + 1}`;

        // Update selected thumbnail styling
        document.querySelectorAll(".vehicle-thumb").forEach((thumb, i) => {
            thumb.classList.toggle("active", i === currentIndex);
        });

        // Auto-scroll thumbnail strip
        const activeThumb = document.querySelector(".vehicle-thumb.active");
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: "smooth", inline: "center" });
        }
    }

    // Build thumbnail strip
    thumbs.innerHTML = "";
    photos.forEach((p, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vehicle-thumb" + (i === 0 ? " active" : "");
        btn.innerHTML = `<img src="${p.url}" alt="thumbnail ${i + 1}">`;

        btn.addEventListener("click", () => setHero(i));
        thumbs.appendChild(btn);
    });

    // Initialize hero after thumbnails exist
    setTimeout(() => setHero(0), 100);

    // Carousel scroll arrows
    document.getElementById("thumb-left").onclick = () =>
        thumbs.scrollBy({ left: -thumbs.clientWidth * 0.6, behavior: "smooth" });

    document.getElementById("thumb-right").onclick = () =>
        thumbs.scrollBy({ left: thumbs.clientWidth * 0.6, behavior: "smooth" });

    // Pre-fill enquiry button
    document.getElementById("enquire-btn").onclick = () => {
        const msg = encodeURIComponent(`I am interested in the ${f.Make_Model} (${f.Registration}).`);
        window.location.href = `contact.html?msg=${msg}`;
    };
}
