document.addEventListener("keydown", e => {
    if (e.shiftKey && e.key.toLowerCase() === "a") {
        window.location.href = "admin.html";
    }
});

let clicks = 0;
document.querySelector(".hero-logo")?.addEventListener("click", () => {
    clicks++;
    if (clicks === 3) {
        window.location.href = "admin.html";
    }
    setTimeout(() => clicks = 0, 600);
});
