// -------------------------------------------------------------
//  vehicle.js — Premium Vehicle Detail Loader (Project 55 Motors)
//  Uses worker endpoint /api/car?id=RECORD_ID
// -------------------------------------------------------------

const API = "https://project55motors.co.uk/api";

/* -------------------------------------------------------------
   GET URL PARAMETER
------------------------------------------------------------- */
function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

/* -------------------------------------------------------------
   LOAD VEHICLE DETAILS
------------------------------------------------------------- */
async function loadVehicle() {
    const id = getParam("id");
    if (!id) {
        console.error("No vehicle ID found in URL.");
        return;
    }

    try {
        const res = await fetch(`${API}/car?id=${id}`);
        if (!res.ok) throw new Error("Vehicle API error");

        const data = await res.json();
        const f = data.fields || {};

        /* -----------------------------------------------------
           MAIN IMAGE (Natural Fit — Option V2)
        ----------------------------------------------------- */
        const photos = Array.isArray(f.Photos) ? f.Photos.map(p => p.url) : [];
        const main = document.getElementById("vehicle-main-photo");

        if (photos.length > 0) {
            main.src = photos[0];
            main.alt = f.Make_Model || "Vehicle";
        } else {
            main.src = "assets/placeholder.jpg";
        }

        /* -----------------------------------------------------
           THUMBNAIL STRIP
        ----------------------------------------------------- */
        const thumbs = document.getElementById("vehicle-thumbnails");
        thumbs.innerHTML = "";

        photos.forEach((url, index) => {
            const thumb = document.createElement("img");
            thumb.src = url;
            thumb.alt = "Thumbnail";

            thumb.addEventListener("click", () => {
                main.src = url;
                window.scrollTo({ top: 0, behavior: "smooth" });
            });

            thumbs.appendChild(thumb);
        });

        /* -----------------------------------------------------
           TITLE
        ----------------------------------------------------- */
        document.getElementById("vehicle-title").textContent =
            f.Make_Model || f.Make || "Vehicle";

        /* -----------------------------------------------------
           SPEC GRID POPULATION
        ----------------------------------------------------- */
        document.getElementById("spec-reg").textContent = f.Registration || "-";

        document.getElementById("spec-mileage").textContent =
            f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "-";

        document.getElementById("spec-engine").textContent =
            f.Engine_size || "-";

        document.getElementById("spec-fuel").textContent =
            f.Fuel_type || "-";

        document.getElementById("spec-mot").textContent =
            f.MOT_Date || f.MOT || "-";

        if (f.Price) {
            document.getElementById("spec-price").textContent =
                "£" + Number(f.Price).toLocaleString();
        } else {
            document.getElementById("spec-price").textContent = "POA";
        }

        /* -----------------------------------------------------
           FULL DESCRIPTION
        ----------------------------------------------------- */
        const desc = (f.Full_Description || f.Full_description || "")
            .replace(/\n/g, "<br>");

        document.getElementById("vehicle-description").innerHTML = desc;

        /* -----------------------------------------------------
           ENQUIRY BUTTON
        ----------------------------------------------------- */
        const enquire = document.getElementById("enquire-btn");

        const title = f.Make_Model || f.Make || "Vehicle";
        const reg = f.Registration || "N/A";

        const enquiryMessage =
            `Hello, I would like to enquire about the ${title} (${reg}). ` +
            `Could you please provide availability and viewing options?`;

        enquire.addEventListener("click", () => {
            window.location.href =
                `contact.html?msg=${encodeURIComponent(enquiryMessage)}`;
        });

    } catch (error) {
        console.error("Vehicle load error:", error);
    }
}

/* -------------------------------------------------------------
   INIT
------------------------------------------------------------- */
loadVehicle();
