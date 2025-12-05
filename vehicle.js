// vehicle.js — premium vehicle detail script with swipe + fullscreen
const VEHICLE_API_URL = "https://project55motors.co.uk/cars-api/";

let currentPhotos = [];
let currentIndex = 0;
let lightboxEl = null;
let lightboxImgEl = null;

document.addEventListener("DOMContentLoaded", () => {
    loadVehicle();
});

/* ------------------------- Core loading ------------------------- */

async function loadVehicle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const container = document.getElementById("vehicle-page");
    if (!id || !container) {
        container.innerHTML = "<p style='color:red;'>Vehicle not found.</p>";
        return;
    }

    try {
        const res = await fetch(VEHICLE_API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("API error " + res.status);

        const data = await res.json();
        const record = (data.records || []).find(v => v.id === id);

        if (!record) {
            container.innerHTML = "<p style='color:red;'>Vehicle not found.</p>";
            return;
        }

        renderVehicle(record);

    } catch (err) {
        console.error("Error loading vehicle:", err);
        container.innerHTML = "<p style='color:red;'>Failed to load vehicle.</p>";
    }
}

/* ------------------------- Rendering ---------------------------- */

function renderVehicle(rec) {
    const f = rec.fields || {};

    // Text fields
    setText("vehicle-title", f.Make_Model || "");
    setText("vehicle-reg", f.Registration ? `Registration: ${f.Registration}` : "");
    setText("vehicle-price", f.Price ? `£${Number(f.Price).toLocaleString()}` : "POA");
    setText("vehicle-mileage", f.Mileage ? `${Number(f.Mileage).toLocaleString()} miles` : "—");
    setText("vehicle-mot", f.MOT_Date || "—");
    setText("vehicle-engine", f.Engine_size || "—");
    setText("vehicle-fuel", f.Fuel_type || "—");

    // Preserve paragraphs / bullet-like breaks in description
    const descEl = document.getElementById("vehicle-description");
    if (descEl) {
        descEl.innerHTML = (f.Full_Description || "")
            .replace(/\n\n/g, "<br><br>")
            .replace(/\n/g, "<br>");
    }

    // Photos
    currentPhotos = Array.isArray(f.Photos) ? f.Photos : [];
    const heroImg = document.getElementById("vehicle-hero");
    const thumbs = document.getElementById("vehicle-thumbs");

    if (!heroImg || !thumbs || !currentPhotos.length) {
        if (heroImg) {
            heroImg.style.display = "none";
        }
        return;
    }

    // Build thumbnails
    thumbs.innerHTML = "";
    currentPhotos.forEach((p, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vehicle-thumb" + (i === 0 ? " active" : "");
        btn.innerHTML = `<img src="${p.url}" alt="thumbnail ${i + 1}">`;
        btn.addEventListener("click", () => showIndex(i));
        thumbs.appendChild(btn);
    });

    // Ensure lightbox exists
    ensureLightbox();

    // Initial image
    showIndex(0);

    // Thumbnail strip arrows
    const leftStrip = document.getElementById("thumb-left");
    const rightStrip = document.getElementById("thumb-right");

    if (leftStrip) {
        leftStrip.onclick = () =>
            thumbs.scrollBy({ left: -thumbs.clientWidth * 0.6, behavior: "smooth" });
    }
    if (rightStrip) {
        rightStrip.onclick = () =>
            thumbs.scrollBy({ left: thumbs.clientWidth * 0.6, behavior: "smooth" });
    }

    // Enquiry button pre-fill
    const enquireBtn = document.getElementById("enquire-btn");
    if (enquireBtn) {
        enquireBtn.onclick = () => {
            const msg = encodeURIComponent(
                `I am interested in the ${f.Make_Model || "vehicle"}${f.Registration ? " (" + f.Registration + ")" : ""}.`
            );
            window.location.href = `contact.html?msg=${msg}`;
        };
    }

    /* --------- Swipe in normal hero view --------- */
    addSwipe(heroImg, () => showNext(), () => showPrev());

    /* --------- Double-click hero → fullscreen ---- */
    heroImg.addEventListener("dblclick", () => openLightbox());
}

/* ------------------------- Image navigation --------------------- */

function showIndex(i) {
    if (!currentPhotos.length) return;

    const heroImg = document.getElementById("vehicle-hero");
    const thumbs = document.getElementById("vehicle-thumbs");
    if (!heroImg || !thumbs) return;

    currentIndex = Math.max(0, Math.min(i, currentPhotos.length - 1));
    const photo = currentPhotos[currentIndex];

    heroImg.src = photo.url;
    heroImg.alt = `Vehicle photo ${currentIndex + 1}`;

    // Active thumbnail border
    thumbs.querySelectorAll(".vehicle-thumb").forEach((t, idx) => {
        t.classList.toggle("active", idx === currentIndex);
    });

    // Keep active thumb in view
    const active = thumbs.querySelector(".vehicle-thumb.active");
    if (active) {
        active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    // Sync lightbox image if open
    if (lightboxEl && lightboxEl.classList.contains("open") && lightboxImgEl) {
        lightboxImgEl.src = photo.url;
    }
}

function showNext() {
    if (!currentPhotos.length) return;
    const next = (currentIndex + 1) % currentPhotos.length;
    showIndex(next);
}

function showPrev() {
    if (!currentPhotos.length) return;
    const prev = (currentIndex - 1 + currentPhotos.length) % currentPhotos.length;
    showIndex(prev);
}

/* ------------------------- Lightbox / fullscreen ---------------- */

function ensureLightbox() {
    if (lightboxEl) return;

    lightboxEl = document.createElement("div");
    lightboxEl.className = "vehicle-lightbox";

    lightboxEl.innerHTML = `
        <div class="vehicle-lightbox-inner">
            <button class="vehicle-lightbox-close" aria-label="Close">&times;</button>
            <button class="vehicle-lightbox-arrow left" aria-label="Previous image">‹</button>
            <img class="vehicle-lightbox-img" alt="Vehicle fullscreen">
            <button class="vehicle-lightbox-arrow right" aria-label="Next image">›</button>
        </div>
    `;

    document.body.appendChild(lightboxEl);

    lightboxImgEl = lightboxEl.querySelector(".vehicle-lightbox-img");
    const closeBtn = lightboxEl.querySelector(".vehicle-lightbox-close");
    const leftBtn = lightboxEl.querySelector(".vehicle-lightbox-arrow.left");
    const rightBtn = lightboxEl.querySelector(".vehicle-lightbox-arrow.right");

    closeBtn.addEventListener("click", closeLightbox);
    leftBtn.addEventListener("click", showPrev);
    rightBtn.addEventListener("click", showNext);

    // Click outside inner box closes
    lightboxEl.addEventListener("click", (e) => {
        if (e.target === lightboxEl) closeLightbox();
    });

    // Swipe inside lightbox
    addSwipe(lightboxImgEl, () => showNext(), () => showPrev());

    // Keyboard controls when open
    document.addEventListener("keydown", (e) => {
        if (!lightboxEl.classList.contains("open")) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") showPrev();
        if (e.key === "ArrowRight") showNext();
    });
}

function openLightbox() {
    if (!currentPhotos.length || !lightboxEl || !lightboxImgEl) return;
    lightboxImgEl.src = currentPhotos[currentIndex].url;
    lightboxEl.classList.add("open");
    document.body.classList.add("no-scroll");
}

function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove("open");
    document.body.classList.remove("no-scroll");
}

/* ------------------------- Helpers ------------------------------ */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function addSwipe(el, onSwipeLeft, onSwipeRight) {
    if (!el) return;
    let startX = 0;

    el.addEventListener("touchstart", (e) => {
        if (!e.touches || !e.touches.length) return;
        startX = e.touches[0].clientX;
    }, { passive: true });

    el.addEventListener("touchend", (e) => {
        if (!e.changedTouches || !e.changedTouches.length) return;
        const endX = e.changedTouches[0].clientX;
        const dx = endX - startX;
        const threshold = 40; // px

        if (Math.abs(dx) > threshold) {
            if (dx < 0) {
                // swipe left → next image
                onSwipeLeft && onSwipeLeft();
            } else {
                // swipe right → previous
                onSwipeRight && onSwipeRight();
            }
        }
    }, { passive: true });
}
