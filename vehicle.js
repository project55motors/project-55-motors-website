// vehicle.js — Premium Vehicle Detail Page
// Uses the public cars-api worker (Available vehicles only)

const API_URL = "https://project55motors.co.uk/cars-api";

// URL param: ?id=recXXXX
const CAR_ID = new URLSearchParams(window.location.search).get("id");

const MAIN_PHOTO = document.getElementById("vehicle-main-photo");
const THUMBS     = document.getElementById("vehicle-thumbnails");

async function loadVehicle() {
    if (!CAR_ID) {
        console.error("No ?id parameter found in URL.");
        document.querySelector(".vehicle-page").innerHTML =
            "<p style='color:red;text-align:center;'>Vehicle not found.</p>";
        return;
    }

    try {
        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) {
            throw new Error(`API error ${res.status}`);
        }

        const data = await res.json();
        const records = data.records || data.records || [];

        const match = records.find(r => r.id === CAR_ID);
        if (!match) {
            console.error("No vehicle with id", CAR_ID);
            document.querySelector(".vehicle-page").innerHTML =
                "<p style='color:red;text-align:center;'>Vehicle not found.</p>";
            return;
        }

        const f = match.fields;

        // TITLE
        const title = f.Make_Model || "Vehicle";
        document.getElementById("vehicle-title").textContent = title;

        // MAIN PHOTO + THUMBNAILS
        const photos = Array.isArray(f.Photos) ? f.Photos : [];
        if (photos.length > 0) {
            MAIN_PHOTO.src = photos[0].url;
            MAIN_PHOTO.alt = title;
        } else {
            MAIN_PHOTO.src = "";
            MAIN_PHOTO.alt = "No photo available";
        }

        THUMBS.innerHTML = "";
        photos.forEach((p, index) => {
            const img = document.createElement("img");
            img.src = p.url;
            img.alt = `${title} photo ${index + 1}`;
            img.className = "vehicle-thumb";
            img.addEventListener("click", () => {
                MAIN_PHOTO.src = p.url;
            });
            THUMBS.appendChild(img);
        });

        // SPECS
        document.getElementById("spec-reg").textContent =
            f.Registration || "";

        document.getElementById("spec-price").textContent =
            f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";

        document.getElementById("spec-mileage").textContent =
            f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "";

        document.getElementById("spec-mot").textContent =
            f.MOT_Date || "";

        document.getElementById("spec-engine").textContent =
            f.Engine_size || "";

        document.getElementById("spec-fuel").textContent =
            f.Fuel_type || "";

        // FULL DESCRIPTION
        const descEl = document.getElementById("vehicle-description");
        const full = (f.Full_Description || "").trim();

        if (full) {
            // Preserve simple line breaks
            const paragraphs = full.split(/\n{2,}/).map(
                block => `<p>${block.replace(/\n/g, "<br>")}</p>`
            );
            descEl.innerHTML = paragraphs.join("");
        } else {
            descEl.innerHTML = "<p>No further description available.</p>";
        }

        // ENQUIRE BUTTON – pre-fill message on contact page
        const enquireBtn = document.getElementById("enquire-btn");
        if (enquireBtn) {
            const reg = f.Registration || "";
            const msg =
                `Hello, I would like to enquire about the ${title}` +
                (reg ? ` (registration ${reg})` : "") +
                `. Could you please provide availability and viewing options?`;

            enquireBtn.addEventListener("click", () => {
                const encoded = encodeURIComponent(msg);
                window.location.href = `contact.html?msg=${encoded}`;
            });
        }

    } catch (err) {
        console.error("Error loading vehicle:", err);
        document.querySelector(".vehicle-page").innerHTML =
            "<p style='color:red;text-align:center;'>Failed to load vehicle details.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadVehicle);
