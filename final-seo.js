// final-seo.js
function injectSEO(record) {
    if (!record || !record.fields) return;

    const f = record.fields;

    const seoData = {
        "@context": "https://schema.org",
        "@type": "Car",
        "name": f.Make_Model || f.Name || "",
        "brand": f.Make_Model ? f.Make_Model.split(" ")[0] : "",
        "model": f.Make_Model || "",
        "vehicleIdentificationNumber": f.Registration || "",
        "vehicleEngine": f.Engine_size || "",
        "fuelType": f.Fuel_type || "",
        "mileageFromOdometer": f.Mileage || "",
        "description": f.Full_Description || f.Short_Description || "",
        "image": f.Photos ? f.Photos.map(p => p.url) : [],
        "offers": {
            "@type": "Offer",
            "price": f.Price || "",
            "priceCurrency": "GBP",
            "availability": f.Status === "Sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock"
        }
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(seoData, null, 2);
    document.head.appendChild(script);
}

// detail.js will call injectSEO(record) once the car loads
