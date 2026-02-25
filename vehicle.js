(async function () {
  const container = document.getElementById("vehicle-container");
  const id = new URLSearchParams(location.search).get("id");

  if (!id) {
    showError();
    return;
  }

  try {
    const res = await fetch("/cars-api");
    const data = await res.json();

    const record = data.records.find(r => r.id === id);
    if (!record) throw new Error("Vehicle not found");

    renderVehicle(record);

  } catch (err) {
    showError();
  }

  function renderVehicle(record) {
    const f = record.fields || {};

    const price = f.Price
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
          maximumFractionDigits: 0
        }).format(f.Price)
      : "";

    const mileage = f.Mileage
      ? new Intl.NumberFormat("en-GB").format(f.Mileage) + " miles"
      : "";

    const firstPhoto = Array.isArray(f.Photos) && f.Photos.length
      ? f.Photos[0].url
      : "";

    document.title = (f.Make_Model || "Vehicle") + " | Project 55 Motors";

    container.innerHTML = `
      <h1>${escape(f.Make_Model || "")}</h1>
      ${f.Registration ? `<p><strong>Registration:</strong> ${escape(f.Registration)}</p>` : ""}
      ${price ? `<p><strong>Price:</strong> ${price}</p>` : ""}
      ${mileage ? `<p><strong>Mileage:</strong> ${mileage}</p>` : ""}
      ${f.Fuel_type ? `<p><strong>Fuel:</strong> ${escape(f.Fuel_type)}</p>` : ""}
      ${f.Transmission ? `<p><strong>Transmission:</strong> ${escape(f.Transmission)}</p>` : ""}
      ${firstPhoto ? `<img src="${firstPhoto}" alt="${escape(f.Make_Model || "")}" style="max-width:100%;border-radius:12px;margin-top:15px;">` : ""}
      ${f.Full_Description ? `<section style="margin-top:20px;"><h2>Description</h2><p>${escape(f.Full_Description)}</p></section>` : ""}
    `;
  }

  function showError() {
    container.innerHTML = `
      <h1>Vehicle not found</h1>
      <p>This vehicle may have been sold or removed.</p>
      <p><a href="/inventory">View current stock</a></p>
    `;
  }

  function escape(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();