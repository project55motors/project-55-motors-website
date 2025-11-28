// cars.js – FINAL

(async () => {
  const grid = document.getElementById("car-grid");
  if (!grid) return; // nothing to do on pages without the grid

  grid.innerHTML = `<p style="text-align:center;margin-top:2rem;">Loading stock…</p>`;

  try {
    const res = await fetch("/api/cars");

    if (!res.ok) {
      throw new Error("Worker error: " + res.status);
    }

    const data = await res.json();
    const records = data.records || [];

    const available = records.filter(r => {
      const s = (r.fields.Status || "").toLowerCase();
      return s === "available"; // only show cars that are actually available
    });

    if (!available.length) {
      grid.innerHTML = `<p style="text-align:center;margin-top:2rem;">No vehicles currently in stock.</p>`;
      return;
    }

    grid.innerHTML = available.map(recordToCard).join("");

  } catch (err) {
    console.error("Error loading cars:", err);
    grid.innerHTML = `
      <p style="text-align:center;margin-top:2rem;color:#b91c1c;">
        Error loading stock.
      </p>
    `;
  }

  function recordToCard(r) {
    const f = r.fields || {};

    const makeModel = f.Make_Model || "Vehicle";
    const reg       = f.Registration || "";
    const mot       = f.MOT_Date || "";
    const mileage   = f.Mileage != null ? `${Number(f.Mileage).toLocaleString()} miles` : "";
    const price     = f.Price   != null ? `£${Number(f.Price).toLocaleString()}` : "";
    const shortDesc = f.Short_Description || "";

    // Use first photo (large thumb if available)
    let photoUrl = "";
    if (Array.isArray(f.Photos) && f.Photos.length) {
      const p = f.Photos[0];
      photoUrl =
        (p.thumbnails && p.thumbnails.large && p.thumbnails.large.url) ||
        p.url ||
        "";
    }

    const href = `/car.html?id=${encodeURIComponent(r.id)}`;

    return `
<a class="car-card" href="${href}">
  <div class="car-card-image-wrap">
    ${photoUrl ? `
      <img
        src="${photoUrl}"
        alt="${escapeHtml(makeModel)}"
        loading="lazy"
        style="width:100%;height:auto;display:block;border-radius:18px 18px 0 0;"
      >
    ` : ""}
  </div>

  <div class="car-card-body">
    <h3 class="car-title">${escapeHtml(makeModel)}</h3>

    <div class="car-card-row" style="display:flex;justify-content:space-between;font-size:0.9rem;margin-top:0.35rem;">
      <span>${escapeHtml(reg)}</span>
      <span>${mot ? `MOT: ${escapeHtml(mot)}` : ""}</span>
    </div>

    <div class="car-card-row" style="display:flex;justify-content:space-between;font-size:0.9rem;margin-top:0.35rem;font-weight:600;">
      <span>${price}</span>
      <span>${mileage}</span>
    </div>

    ${shortDesc
      ? `<p class="car-card-desc" style="margin-top:0.6rem;font-size:0.9rem;color:#4b5563;">
           ${escapeHtml(shortDesc)}
         </p>`
      : ""}
  </div>
</a>`;
  }

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, ch => {
      switch (ch) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return ch;
      }
    });
  }
})();
