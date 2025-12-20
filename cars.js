// cars.js — PUBLIC STOCK DISPLAY (FAST IMAGES EDITION)

const API_URL = "https://project55motors.co.uk/cars-api/";

// Pick the best Airtable attachment URL for a card image (thumbnail preferred).
function pickCardImage(attachment) {
  if (!attachment) return { src: "", srcset: "", width: null, height: null };

  const thumbs = attachment.thumbnails || {};
  const small = thumbs.small || null;
  const large = thumbs.large || null;

  // Fallback to original URL if no thumbnails are provided by Airtable.
  const original = attachment.url || "";

  // If both small & large exist, use small as default src and provide srcset.
  if (small?.url && large?.url) {
    const src = small.url;
    const srcset = `${small.url} ${small.width || 0}w, ${large.url} ${large.width || 0}w`.replace(
      /\s0w/g,
      ""
    );

    return {
      src,
      srcset,
      width: small.width || null,
      height: small.height || null
    };
  }

  // If only one thumbnail exists, use it.
  const one = large?.url ? large : small?.url ? small : null;
  if (one?.url) {
    return {
      src: one.url,
      srcset: "",
      width: one.width || null,
      height: one.height || null
    };
  }

  // Final fallback: original
  return { src: original, srcset: "", width: null, height: null };
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("car-grid")) loadCars();
});

async function loadCars() {
  const grid = document.getElementById("car-grid");
  if (!grid) return;

  try {
    // Let Cloudflare/browser caching work (your worker sets Cache-Control).
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
      const imgPick = pickCardImage(firstPhoto);

      const card = document.createElement("a");
      card.className = "car-card";
      card.href = `vehicle.html?id=${rec.id}`;

      const img = document.createElement("img");
      img.alt = title;
      img.loading = "lazy";
      img.decoding = "async";

      // If we have dimension hints, set them to reduce layout shift.
      if (imgPick.width) img.width = imgPick.width;
      if (imgPick.height) img.height = imgPick.height;

      // Prefer thumbnails.
      if (imgPick.src) img.src = imgPick.src;

      // If srcset exists, provide it with sensible sizes.
      if (imgPick.srcset) {
        img.srcset = imgPick.srcset;
        img.sizes = "(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw";
      }

      // If there's no image at all, keep it clean (no broken icon).
      if (!imgPick.src) {
        img.removeAttribute("src");
      }

      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `
        <h3>${title}</h3>
        <p>${price}</p>
      `;

      card.appendChild(img);
      card.appendChild(info);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="color:red;">Failed to load stock.</p>`;
  }
}
