(() => {
  const form = document.getElementById("px-form");
  const status = document.getElementById("px-status");
  const whatsapp = window.P55?.whatsapp?.phoneE164;
  const email = window.P55?.contact?.email;

  if (!/^\d{7,15}$/.test(whatsapp || "") || !email) {
    status.textContent = "Use ‘Other contact options’ to request your quote while this form is unavailable.";
    return;
  }

  const params = new URLSearchParams(location.search);
  const stockSlug = params.get("vehicle") || "";
  const stockTitle = (params.get("title") || "").replace(/\s+/g, " ").trim().slice(0, 120);
  let listingUrl;

  if (/^[a-z0-9][a-z0-9-]{0,159}$/i.test(stockSlug)) {
    const listing = document.getElementById("px-listing");
    listingUrl = "https://project55motors.co.uk/stock/" + stockSlug;
    listing.href = listingUrl;
    listing.textContent = stockTitle || "View vehicle";
    document.getElementById("px-selection").hidden = false;
  }

  const registration = document.getElementById("px-registration");
  const mileage = document.getElementById("px-mileage");
  const model = document.getElementById("px-model");
  const notes = document.getElementById("px-notes");

  form.addEventListener("input", (event) => {
    event.target.setCustomValidity("");
    status.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const plate = registration.value.trim().toUpperCase().replace(/\s+/g, " ");
    const miles = mileage.value.replace(/[,\s]/g, "");
    const vehicle = model.value.trim();

    registration.setCustomValidity(/^[A-Z0-9][A-Z0-9 -]*$/.test(plate) ? "" : "Enter your vehicle registration.");
    mileage.setCustomValidity(/^\d{1,7}$/.test(miles) ? "" : "Enter the mileage as a whole number.");
    model.setCustomValidity(vehicle ? "" : "Enter the make and model of your vehicle.");
    if (!form.reportValidity()) return;

    const message = [
      "Hi Nathan, I’d like a part-exchange quote.",
      "",
      "Registration: " + plate,
      "Mileage: " + Number(miles).toLocaleString("en-GB") + " miles",
      "Make and model: " + vehicle
    ];

    if (notes.value.trim()) message.push("Condition and notes: " + notes.value.trim());
    if (listingUrl) message.push("", "Interested in: " + (stockTitle || "This vehicle"), listingUrl);

    if (event.submitter?.value === "email") {
      const subject = encodeURIComponent("Part-exchange quote request");
      const body = encodeURIComponent(message.join("\r\n").replace(/\r?\n/g, "\r\n"));
      location.href = "mailto:" + email + "?subject=" + subject + "&body=" + body;
      status.textContent = "Review your email draft and press Send to request a quote.";
    } else {
      const text = encodeURIComponent(message.join("\n"));
      window.open("https://wa.me/" + whatsapp + "?text=" + text, "_blank", "noopener,noreferrer");
      status.textContent = "Review your WhatsApp draft and press Send to request a quote.";
    }
  });

  form.querySelector("fieldset").disabled = false;
})();
