// admin-shortcut.js — SECRET LOGIN TRIGGER



document.body.setAttribute("tabindex", "0");

setTimeout(() => document.body.focus(), 300);



const MODAL_ID = "adminLoginModal";

const loginModal = () => document.getElementById(MODAL_ID);



let keyBuffer = [];



document.addEventListener("keydown", (e) => {

    keyBuffer.push(e.code);

    keyBuffer = keyBuffer.slice(-2);



    if (keyBuffer.join(",") === "ShiftLeft,KeyA" || keyBuffer.join(",") === "ShiftRight,KeyA") {

        openAdminModal();

    }

});



document.addEventListener("click", (e) => {

    if (e.detail === 3 && e.target.classList.contains("hero-logo")) {

        openAdminModal();

    }

});



function openAdminModal() {

    loginModal().style.display = "flex";

}



function closeAdminModal() {

    loginModal().style.display = "none";

}



window.closeAdminModal = closeAdminModal;



async function submitAdminLogin(event) {

    event.preventDefault();



    const user = document.getElementById("adminUser").value.trim();

    const pass = document.getElementById("adminPass").value.trim();

    const errorBox = document.getElementById("admin-login-error");



    errorBox.style.display = "none";



    const res = await fetch("https://project55motors.co.uk/api/login", {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ username: user, password: pass })

    });



    if (res.ok) {

        window.location.href = "admin-dashboard.html";

    } else {

        errorBox.style.display = "block";

        errorBox.textContent = "Incorrect login.";

    }

}



window.submitAdminLogin = submitAdminLogin;