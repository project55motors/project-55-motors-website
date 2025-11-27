// car-page.js – FINAL FIXED VERSION

const API_URL = "/api/all";

function switchMainPhoto(element, url) {
    const mainViewer = document.querySelector(".gallery-main-viewer img");
    if (mainViewer) {
        mainViewer.src = url;
    }

    document.querySelectorAll(".gallery-thumbnail").forEach(img =>
        img.classList.remove("active")
    );

    element.classList.add("active");
}

async function loadSingleCar() {
    const container = document.getElementById("car-details-container");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const carId = params.get("id");

    if (!carId) {
        container.innerHTML = "<h1 style='text-align:center;'>Vehicle ID missing.</h1>";
        return;
    }

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            container.innerHTML = `<h1 style="text-align:center;color:red;">Could not load vehicle data.</h1>`;
            return;
        }

        const data = await response.json();
        const car = data.records.find(r => r.id === carId);

        if (!car || car.fields.Status === "Sold") {
            container.innerHTML = `<h1 style="text-align:center;">Vehicle not found or sold.</h1>`;
            return;
        }

        const f = car.fields;

        let photos = f.Photos || [];

        const mainPhotoUrl = photos[0]?.url || "placeholder.jpg";
        const price = f.Price ? `£${Number(f.Price).toLocaleString()} ono` : "POA";

        const mot = f.MOT_Date
            ? new Date(f.MOT_Date).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
            : "N/A";

        const reg = f.Registration || "N/A";

        const rawShort = f.Short_Description || "";
        const rawFull = (f.Full_Description || "").replace(/\n/g, "<br>");

        const thumbnailHtml = photos.map((p, i) => `
            <img 
                src="${p.url}" 
                onclick="switchMainPhoto(this, '${p.url}')"
                class="gallery-thumbnail ${i === 0 ? "active" : ""}">
        `).join("");

        document.title = `${f.Make_Model} (${reg}) | Project 55 Motors`;

        container.innerHTML = `
            <h1 style="font-size:3rem;">${f.Make_Model}</h1>
            ${rawShort ? `<p style="font-size:1.3rem;">${rawShort}</p>` : ""}
            <h2>${reg} — ${price}</h2>

            <div class="modal-content">

                <div class="photo-gallery-wrapper">
                    <div class="gallery-main-viewer">
                        <img src="${mainPhotoUrl}">
                    </div>
                    <div class="gallery-thumbnail-strip">
                        ${thumbnailHtml}
                    </div>
                </div>

                <div class="modal-details">
                    <div class="modal-specs">
                        <div><strong>Registration</strong><br>${reg}</div>
                        <div><strong>Mileage</strong><br>${(f.Mileage || 0).toLocaleString()}</div>
                        <div><strong>MOT</strong><br>${mot}</div>
                        <div><strong>Fuel</strong><br>${f.Fuel_type || "N/A"}</div>
                    </div>
                </div>

            </div>

            ${rawFull ? `
                <div class="full-description">
                    <h3>Vehicle Overview</h3>
                    <p>${rawFull}</p>
                </div>` : ""}
        `;
    } catch (error) {
        console.error(error);
        container.innerHTML = `<p style="text-align:center;">Error loading vehicle</p>`;
    }
}

document.addEventListener("DOMContentLoaded", loadSingleCar);
