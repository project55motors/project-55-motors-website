// cars.js — fetches available cars from cars-api worker
// and populates index (home-grid) + inventory (inventory-grid)

const API_URL = "https://project55motors.co.uk/cars-api";

document.addEventListener("DOMContentLoaded", () => {
  const homeGrid = document.getElementById("home-grid");
  const invGrid = document.getElementById("inventory-grid");

  if (!homeGrid && !invGrid) return;

  loadCars(homeGrid, invGrid);
});

async function loadCars(homeGrid, invGrid) {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("API error " + res.status);

    const data = await res.json();
    const records = data.records || [];

    // Only show Status = Available
    const available = records.filter(r =>
      (r.fields.Status || "").toLowerCase() === "available"
    );

    if (homeGrid) homeGrid.innerHTML = "";
    if (invGrid) invGrid.innerHTML = "";

    if (!available.length) {
      if (homeGrid) homeGrid.innerHTML = "<p>No vehicles available at the moment.</p>";
      if (invGrid) invGrid.innerHTML = "<p>No vehicles available at the moment.</p>";
      return;
    }

    const path = window.location.pathname;
    const isHome = path.endsWith("index.html") || path === "/" || path === "";

    const forHome = isHome ? available.slice(0, 3) : [];
    const forInv = available;

    if (homeGrid && forHome.length) {
      forHome.forEach(rec => homeGrid.appendChild(buildCard(rec)));
    }

    if (invGrid) {
      forInv.forEach(rec => invGrid.appendChild(buildCard(rec)));
    }

  } catch (err) {
    console.error("Error loading cars:", err);
    if (homeGrid) homeGrid.innerHTML = "<p>Failed to load vehicles.</p>";
    if (invGrid) invGrid.innerHTML = "<p>Failed to load vehicles.</p>";
  }
}

function buildCard(rec) {
  const f = rec.fields;
  const img = f.Photos?.[0]?.url || "assets/placeholder-car.png";
  const title = f.Make_Model || "";
  const reg = f.Registration || "";
  const price = f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA";

  const mileage = f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "";
  const mot = f.MOT_Date || "";

  const specParts = [];
  if (mileage) specParts.push(mileage);
  if (mot) specParts.push(`MOT: ${mot}`);
  const specLine = specParts.join(" · ");

  const slug = encodeURIComponent(reg.replace(/\s+/g, ""));

  const card = document.createElement("a");
  card.className = "car-card";
  card.href = `vehicle.html?reg=${slug}`;

  card.innerHTML = `
    <img src="${img}" alt="${title}" class="car-thumb">
    <div class="car-info">
      <h3>${title}</h3>
      <p class="reg">${reg}</p>
      <p class="price">${price}</p>
      ${specLine ? `<p class="card-spec-line">${specLine}</p>` : ""}
    </div>
  `;

  return card;
}
