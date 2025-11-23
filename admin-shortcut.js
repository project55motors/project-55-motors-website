document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key.toLowerCase() === 'a') {
        window.location.href = '/admin.html';
    }
});