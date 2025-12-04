// vehicle.js — vehicle detail page
const API_URL = "https://project55motors.co.uk/cars-api";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("vehicle-title");
  if (!container) return;
  loadVehicle();
});

async function loadVehicle() {
  const params = new URLSearchParams(window.location.search);
  const regQuery = params.get("reg");

  const titleEl = document.getElementById("vehicle-title");
  const descEl = document.getElementById("vehicle-description");

  if (!regQuery) {
    titleEl.textContent = "Vehicle not found.";
    return;
  }

  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("API error " + res.status);

    const data = await res.json();
    const records = data.records || [];

    const match = records.find(r => {
      const reg = (r.fields.Registration || "").replace(/\s+/g, "").toLowerCase();
      return reg === regQuery.toLowerCase();
    });

    if (!match) {
      titleEl.textContent = "Vehicle not found.";
      return;
    }

    const f = match.fields;

    // Images
    const photos = f.Photos || [];
    const mainImg = document.getElementById("vehicle-main-photo");
    const thumbsDiv = document.getElementById("vehicle-thumbnails");

    if (photos.length) {
      mainImg.src = photos[0].url;
      thumbsDiv.innerHTML = "";

      photos.forEach((p, idx) => {
        const img = document.createElement("img");
        img.src = p.url;
        img.className = "vehicle-thumb" + (idx === 0 ? " active" : "");
        img.addEventListener("click", () => {
          mainImg.src = p.url;
          document.querySelectorAll(".vehicle-thumb").forEach(t => t.classList.remove("active"));
          img.classList.add("active");
        });
        thumbsDiv.appendChild(img);
      });
    }

    // Title + subline
    titleEl.textContent = f.Make_Model || "";
    const sub = `${f.Registration || ""} · ${f.Year || ""}`.replace(/·\s*$/, "");
    document.getElementById("vehicle-sub").textContent = sub;

    // Specs
    const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";
    const mileage = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "";

    document.getElementById("spec-reg").textContent = f.Registration || "";
    document.getElementById("spec-price").textContent = price;
    document.getElementById("spec-mileage").textContent = mileage;
    document.getElementById("spec-mot").textContent = f.MOT_Date || "N/A";
    document.getElementById("spec-engine").textContent = f.Engine_size || "";
    document.getElementById("spec-fuel").textContent = f.Fuel_type || "";

    // Description (use Full_Description, fall back to Short)
    const full = f.Full_Description || f.Short_Description || "";
    descEl.textContent = full;

    // Enquiry link
    const enquireLink = document.getElementById("enquire-link");
    const msg = encodeURIComponent(
      `I am interested in the ${f.Make_Model || "vehicle"} with registration ${f.Registration || ""}.`
    );
    enquireLink.href = `contact.html?msg=${msg}`;

  } catch (err) {
    console.error("Failed to load vehicle:", err);
    titleEl.textContent = "Failed to load vehicle.";
  }
}
