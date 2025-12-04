// vehicle.js — world-class vehicle detail page
const VEHICLE_API_URL = "https://project55motors.co.uk/cars-api/";

document.addEventListener("DOMContentLoaded", () => {
    loadVehicle();
});

async function loadVehicle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const container = document.getElementById("vehicle-page");
    if (!id || !container) {
        if (container) {
            container.innerHTML =
                "<p style='color:red;'>Vehicle not found.</p>";
        }
        return;
    }

    try {
        const res = await fetch(VEHICLE_API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("API error " + res.status);

        const data = await res.json();
        const records = data.records || [];
        const match = records.find((r) => r.id === id);

        if (!match) {
            container.innerHTML =
                "<p style='color:red;'>Vehicle not found.</p>";
            return;
        }

        renderVehicle(match);
    } catch (err) {
        console.error("Error loading vehicle", err);
        if (container) {
            container.innerHTML =
                "<p style='color:red;'>Failed to load vehicle details.</p>";
        }
    }
}

function renderVehicle(rec) {
    const f = rec.fields || {};

    const titleEl = document.getElementById("vehicle-title");
    const regEl = document.getElementById("vehicle-reg");
    const priceEl = document.getElementById("vehicle-price");
    const mileageEl = document.getElementById("vehicle-mileage");
    const motEl = document.getElementById("vehicle-mot");
    const engineEl = document.getElementById("vehicle-engine");
    const fuelEl = document.getElementById("vehicle-fuel");
    const descEl = document.getElementById("vehicle-description");
    const heroImg = document.getElementById("vehicle-hero");
    const thumbs = document.getElementById("vehicle-thumbs");
    const enquireBtn = document.getElementById("enquire-btn");

    const title = f.Make_Model || "Vehicle";
    const reg = f.Registration || "";
    const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";
    const mileage = f.Mileage
        ? `${Number(f.Mileage).toLocaleString()} miles`
        : "—";
    const mot = f.MOT_Date || "N/A";
    const engine = f.Engine_size || "—";
    const fuel = f.Fuel_type || "—";
    const fullDesc = f.Full_Description || "";

    if (titleEl) titleEl.textContent = title;
    if (regEl) regEl.textContent = reg ? `Registration: ${reg}` : "";
    if (priceEl) priceEl.textContent = price;
    if (mileageEl) mileageEl.textContent = mileage;
    if (motEl) motEl.textContent = mot;
    if (engineEl) engineEl.textContent = engine;
    if (fuelEl) fuelEl.textContent = fuel;
    if (descEl) descEl.textContent = fullDesc;

    // Photos
    const photos = Array.isArray(f.Photos) ? f.Photos : [];
    let currentIndex = 0;

    function setHero(index) {
        if (!photos.length || !heroImg) return;
        const clamped = Math.max(0, Math.min(index, photos.length - 1));
        const p = photos[clamped];
        heroImg.src = p.url;
        heroImg.alt = title;
        currentIndex = clamped;

        // Update active thumb
        if (thumbs) {
            const allThumbs = thumbs.querySelectorAll(".vehicle-thumb");
            allThumbs.forEach((t, i) => {
                t.classList.toggle("active", i === clamped);
            });

            // Ensure active thumb is in view
            const active = allThumbs[clamped];
            if (active && thumbs.scrollTo) {
                const rect = active.getBoundingClientRect();
                const parentRect = thumbs.getBoundingClientRect();
                const offset = rect.left - parentRect.left - parentRect.width / 2 + rect.width / 2;
                thumbs.scrollBy({ left: offset, behavior: "smooth" });
            }
        }
    }

    if (thumbs) {
        thumbs.innerHTML = "";
        photos.forEach((p, idx) => {
            const thumb = document.createElement("button");
            thumb.type = "button";
            thumb.className = "vehicle-thumb" + (idx === 0 ? " active" : "");
            thumb.innerHTML = `<img src="${p.url}" alt="${title} photo ${idx + 1}">`;
            thumb.addEventListener("click", () => setHero(idx));
            thumbs.appendChild(thumb);
        });
    }

    if (photos.length && heroImg) {
        setHero(0);
    } else if (heroImg) {
        heroImg.src = "";
        heroImg.alt = "No photo available";
    }

    // Thumb arrows
    const leftBtn = document.getElementById("thumb-left");
    const rightBtn = document.getElementById("thumb-right");

    if (leftBtn && thumbs) {
        leftBtn.addEventListener("click", () => {
            thumbs.scrollBy({ left: -thumbs.clientWidth * 0.7, behavior: "smooth" });
        });
    }
    if (rightBtn && thumbs) {
        rightBtn.addEventListener("click", () => {
            thumbs.scrollBy({ left: thumbs.clientWidth * 0.7, behavior: "smooth" });
        });
    }

    // Enquire button → pre-populate contact form
    if (enquireBtn) {
        enquireBtn.addEventListener("click", () => {
            const msg = encodeURIComponent(
                `I am interested in the ${title}${reg ? " (" + reg + ")" : ""}.`
            );
            window.location.href = `contact.html?msg=${msg}`;
        });
    }
}
