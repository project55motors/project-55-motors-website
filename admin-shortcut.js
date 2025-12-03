// admin-shortcut.js — Premium, reliable admin access

// Shift + A  → admin-dashboard.html

// Triple-click logo → admin-dashboard.html



document.addEventListener("DOMContentLoaded", () => {

    const goAdmin = () => {

        window.location.href = "admin-dashboard.html";

    };



    // Keyboard shortcut: Shift + A

    document.addEventListener("keydown", (e) => {

        if (e.shiftKey && e.key.toLowerCase() === "a") {

            e.preventDefault();

            goAdmin();

        }

    });



    // Triple-click hero logo

    const logo = document.querySelector(".hero-logo");

    if (!logo) return;



    let clicks = 0;

    let timer = null;



    logo.addEventListener("click", () => {

        clicks++;



        if (clicks === 3) {

            goAdmin();

        }



        clearTimeout(timer);

        timer = setTimeout(() => {

            clicks = 0;

        }, 600);

    });

});