// cars.js — PUBLIC STOCK DISPLAY (ROBUST CARD MEDIA LAYOUT)
//
// Fixes "thin strip" card images by giving images a dedicated fixed-height media area.
// Also supports Airtable thumbnails for faster loading where available.

const API_URL = "https://project55motors.co.uk/cars-api/";

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("car-grid")) loadCars();
});

function pickAttachmentUrl(att) {
  if (!att) return "";

  // Prefer Airtable thumbnails where available (faster than original full-size).
  // NOTE: Airtable thumbnail shapes can be square; original may be preferable if you dislike cropping.
  const thumbs = att.thumbnails || {};
  const large = thumbs.large?.url;
  const small = thumbs.small?.url;

  return large || small || att.url || "";
}

async function loadCars() {
  const grid = document.getElementById("car-grid");
  if (!grid) return;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    const records = data.records || [];

    grid.innerHTML = "";

    if (!records.length) {
      grid.innerHTML = `<p>No vehicles currently available.</p>`;
      return;
    }

    records.forEach((rec) => {
      const f = rec.fields || {};
      const title = f.Make_Model || "";
      const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";

      const firstPhoto = f.Photos?.[0] || null;
      const imgUrl = pickAttachmentUrl(firstPhoto);

      const card = document.createElement("a");
      card.className = "car-card";
      card.href = `vehicle.html?id=${rec.id}`;

      // Media wrapper (prevents image collapse causing "thin strip")
      const media = document.createElement("div");
      media.className = "car-card-media";

      const img = document.createElement("img");
      img.alt = title;
      img.loading = "lazy";
      img.decoding = "async";

      // Set URL if present; if missing, keep wrapper height stable and show placeholder styling.
      if (imgUrl) img.src = imgUrl;

      // Defensive inline styling: ensures layout works even if CSS is overridden elsewhere.
      img.style.setProperty("display", "block");
      img.style.setProperty("width", "100%");
      img.style.setProperty("height", "100%");
      img.style.setProperty("object-fit", "cover");
      img.style.setProperty("object-position", "center");

      img.addEventListener("error", () => {
        // If an Airtable URL is expired or blocked, keep card looking clean.
        img.removeAttribute("src");
        media.classList.add("is-missing");
      });

      media.appendChild(img);

      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `
        <h3>${title}</h3>
        <p>${price}</p>
      `;

      card.appendChild(media);
      card.appendChild(info);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="color:red;">Failed to load stock.</p>`;
  }
}
