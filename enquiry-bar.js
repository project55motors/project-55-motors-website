// enquiry-bar.js — sticky enquiry bar behaviour on vehicle page

document.addEventListener('DOMContentLoaded', () => {
  const bar = document.getElementById('enquiry-bar');
  const button = document.getElementById('enquiry-bar-button');
  if (!bar || !button) return;

  const titleEl = document.getElementById('vehicle-title');
  const regEl   = document.getElementById('spec-reg');
  const priceEl = document.getElementById('spec-price');

  const barTitle = document.getElementById('enquiry-bar-title');
  const barReg   = document.getElementById('enquiry-bar-reg');
  const barPrice = document.getElementById('enquiry-bar-price');

  function populateBar() {
    const title = titleEl ? titleEl.textContent.trim() : '';
    const reg   = regEl ? regEl.textContent.trim() : '';
    const price = priceEl ? priceEl.textContent.trim() : '';

    if (barTitle) barTitle.textContent = title || 'Vehicle enquiry';
    if (barReg)   barReg.textContent   = reg ? `Reg: ${reg}` : '';
    if (barPrice) barPrice.textContent = price || '';

    // Attach click handler
    button.onclick = () => {
      const params = new URLSearchParams();
      if (title) params.set('title', title);
      if (reg)   params.set('reg', reg);
      if (price) params.set('price', price);

      window.location.href = `enquiry.html?${params.toString()}`;
    };
  }

  // Wait until vehicle.js has populated the DOM
  let attempts = 0;
  (function waitForData() {
    const hasTitle = titleEl && titleEl.textContent.trim().length > 0;
    if (!hasTitle && attempts < 30) {
      attempts++;
      setTimeout(waitForData, 150);
      return;
    }
    populateBar();
  })();
});
