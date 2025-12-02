// enquiry.js — populate enquiry page from query string

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const title = params.get('title') || '';
  const reg   = params.get('reg') || '';
  const price = params.get('price') || '';

  const summaryTitle = document.getElementById('enquiry-vehicle-title');
  const summaryMeta  = document.getElementById('enquiry-vehicle-meta');
  const msgField     = document.getElementById('enquiry-message');

  const hiddenTitle  = document.getElementById('hidden-vehicle-title');
  const hiddenReg    = document.getElementById('hidden-vehicle-reg');
  const hiddenPrice  = document.getElementById('hidden-vehicle-price');

  if (summaryTitle) {
    summaryTitle.textContent = title || 'Vehicle details not available';
  }

  if (summaryMeta) {
    const bits = [];
    if (reg)   bits.push(`Registration: ${reg}`);
    if (price) bits.push(`Price: ${price}`);
    summaryMeta.textContent = bits.join(' · ');
  }

  if (hiddenTitle) hiddenTitle.value = title;
  if (hiddenReg)   hiddenReg.value   = reg;
  if (hiddenPrice) hiddenPrice.value = price;

  if (msgField && !msgField.value) {
    const parts = [];
    if (title) parts.push(`I am interested in the ${title}`);
    if (reg)   parts.push(`with registration ${reg}`);
    if (price) parts.push(`(advertised price: ${price})`);
    const base = parts.join(' ');

    msgField.value = base
      ? `${base}.\n\nPlease can you let me know if it is still available?`
      : 'I am interested in one of your vehicles.';
  }
});
