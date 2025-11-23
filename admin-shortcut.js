document.addEventListener('keydown', function(e){
    if(e.shiftKey && e.key.toLowerCase() === 'a'){
        const adminContainer = document.getElementById('admin-container');
        if(adminContainer){
            adminContainer.style.display = 'block';
            window.scrollTo(0,0);
        }
    }
});