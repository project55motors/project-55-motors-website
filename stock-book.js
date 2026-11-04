/* Private stock book UI. Accounting data is fetched only through authenticated /api routes. */
(() => {
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let active = false;
  const style = document.createElement("style");
  style.textContent = `.stockbook-dialog{background:#152027;color:#fff;border:1px solid #52616c;border-radius:16px;width:min(780px,94vw);max-height:90vh;padding:24px;box-sizing:border-box}.stockbook-dialog::backdrop{background:#000b}.stockbook-dialog form{display:grid;gap:16px}.stockbook-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.stockbook-dialog label{display:grid;gap:6px;font-size:14px}.stockbook-dialog input:not([type=checkbox]),.stockbook-dialog select,.stockbook-dialog textarea{width:100%;box-sizing:border-box;background:#09151c;color:#fff;border:1px solid #73818b;border-radius:6px;padding:10px;font:inherit}.stockbook-dialog input[type=checkbox]{width:auto}.stockbook-dialog .stockbook-check{display:flex;align-items:flex-start;gap:10px;line-height:1.5}.stockbook-dialog p{line-height:1.5;color:#c4d2dc}.stockbook-dialog h2,.stockbook-dialog h3{margin:0}.stockbook-dialog fieldset{border:1px solid #52616c;padding:16px;border-radius:8px}.stockbook-error{color:#ffb6ac;white-space:pre-line}.stockbook-actions{display:flex;gap:10px;flex-wrap:wrap;position:sticky;bottom:-24px;background:#152027;padding:16px 0}.stockbook-dialog [hidden]{display:none!important}@media(max-width:600px){.stockbook-grid{grid-template-columns:1fr}.stockbook-dialog{padding:16px}}`;
  document.head.appendChild(style);

  function editor({ car, book = {}, markSold = false, onSave, onCancel }) {
    if (active) return false;
    active = true;
    const dialog = document.createElement("dialog");
    dialog.className = "stockbook-dialog";
    const text = (name, label, type = "text", required = false) => `<label>${label}<input name="${name}" type="${type}" value="${escape(book[name])}" ${type === "number" ? 'min="0" max="1000000000" step="0.01"' : ""} ${required ? "required" : ""}></label>`;
    const address = (name, label, required) => `<label>${label}<textarea name="${name}" rows="3" ${required ? "required" : ""}>${escape(book[name])}</textarea></label>`;
    const hasSale = markSold || car.Status === "Sold" || ["Sale_Date", "Selling_Price", "Buyer_Name", "Buyer_Address", "Sales_Invoice_Number", "Disposal_Method"].some(k => book[k] !== null && book[k] !== undefined && book[k] !== "");
    dialog.innerHTML = `<form>
      <h2>${book.Stock_Number ? `Stock book #${escape(book.Stock_Number)}` : "Purchase / stock book details"}</h2>
      <p>${escape(car.Make_Model)} · ${escape(car.Registration || car.VIN)}<br>Purchase details are required before a car can be added. Keep purchase and sales invoices separately.</p>
      <label>VAT treatment<select name="VAT_Treatment" required><option value="">Choose treatment</option><option${book.VAT_Treatment === "Margin scheme" ? " selected" : ""}>Margin scheme</option><option${book.VAT_Treatment === "Normal VAT" ? " selected" : ""}>Normal VAT</option></select></label>
      <fieldset><legend>Purchase</legend><div class="stockbook-grid">
      ${text("Purchase_Date", "Date of purchase", "date", true)}
      ${text("Purchase_Price", "Actual purchase price (£)", "number", true)}
      ${text("Seller_Name", "Seller name", "text", true)}
      ${text("Purchase_Invoice_Number", "Purchase invoice number", "text", true)}
      ${address("Seller_Address", "Seller address", true)}
      </div><label class="stockbook-check"><input name="Purchase_Invoice_Self_Issued" type="checkbox" ${book.Purchase_Invoice_Self_Issued ? "checked" : ""}>I made out the purchase invoice myself (invoice number may be omitted).</label>
      <p>Use the vehicle purchase price from the invoice. Do not add preparation, repair or overhead costs.</p>
      <label class="stockbook-check" data-eligibility><input name="Eligibility_Confirmed" type="checkbox" ${book.Eligibility_Confirmed ? "checked" : ""}>I checked the purchase invoice and HMRC rules: this is an eligible second-hand margin scheme vehicle, with no VAT shown separately on the purchase invoice (except qualifying zero-rated Motability purchases). This record uses the standard 20% VAT rate.</label>
      </fieldset>
      <label class="stockbook-check"><input name="hasSale" type="checkbox" ${hasSale ? "checked" : ""} ${markSold || car.Status === "Sold" ? "disabled" : ""}>Record a sale or other disposal</label>
      <fieldset data-sale><legend>Sale / disposal</legend><div class="stockbook-grid">
      ${text("Sale_Date", "Sale / disposal date", "date")}
      ${text("Disposal_Method", "Disposal method (only if not sold)")}
      ${text("Sales_Invoice_Number", "Sales invoice number")}
      ${text("Selling_Price", "Actual selling price (£)", "number")}
      ${text("Buyer_Name", "Buyer name")}
      ${address("Buyer_Address", "Buyer address", false)}
      </div><p>Use the actual invoice price, including any part-exchange allowance and amounts that belong in the vehicle consideration. The advertised dashboard price is not used. A non-sale disposal closes the record without calculating sale VAT; review its VAT treatment separately.</p></fieldset>
      <p>Margin scheme VAT is one-sixth of a positive margin. Normal VAT records have no margin scheme calculation. This stock book does not replace invoices.</p>
      <div class="stockbook-error" role="alert"></div>
      <div class="stockbook-actions"><button class="admin-btn primary" type="submit">${markSold ? "Save details and mark sold" : "Save details"}</button><button class="admin-btn ghost" type="button" data-cancel>Cancel</button>${book.Stock_Number ? '<button class="admin-btn ghost" type="button" data-print>Print saved record</button>' : ""}</div>
    </form>`;
    document.body.appendChild(dialog);
    const form = dialog.querySelector("form");
    const error = dialog.querySelector(".stockbook-error");
    const close = () => { active = false; dialog.close(); dialog.remove(); };
    let saving = false;
    const cancel = () => { if (saving) return; close(); onCancel?.(); };
    dialog.querySelector("[data-cancel]").onclick = cancel;
    dialog.addEventListener("cancel", e => { e.preventDefault(); cancel(); });
    dialog.querySelector("[data-print]")?.addEventListener("click", () => {
      window.open(`/api/stock-book/${encodeURIComponent(car.id)}?print=1`, "_blank", "noopener");
    });
    const saleKeys = ["Sale_Date", "Disposal_Method", "Sales_Invoice_Number", "Selling_Price", "Buyer_Name", "Buyer_Address"];
    const sync = () => {
      const margin = form.elements.VAT_Treatment.value === "Margin scheme";
      dialog.querySelector("[data-eligibility]").hidden = !margin;
      form.elements.Eligibility_Confirmed.required = margin;
      form.elements.Purchase_Invoice_Number.required = !form.elements.Purchase_Invoice_Self_Issued.checked;
      const sold = form.elements.hasSale.checked;
      dialog.querySelector("[data-sale]").hidden = !sold;
      const disposal = !!form.elements.Disposal_Method.value.trim();
      for (const k of saleKeys) {
        form.elements[k].disabled = !sold;
        form.elements[k].required = sold && (k === "Sale_Date" || (!disposal && k !== "Disposal_Method"));
      }
    };
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    sync();
    form.onsubmit = async event => {
      event.preventDefault();
      if (saving) return;
      sync();
      if (!form.reportValidity()) return;
      const fields = {};
      for (const el of form.elements) {
        if (!el.name || el.name === "hasSale") continue;
        fields[el.name] = el.type === "checkbox" ? el.checked : (el.disabled ? null : el.value.trim());
      }
      fields.Eligibility_Confirmed = fields.VAT_Treatment === "Margin scheme" && fields.Eligibility_Confirmed;
      saving = true;
      form.querySelector("[type=submit]").disabled = true;
      error.textContent = "";
      try { await onSave(fields); close(); }
      catch (err) { error.textContent = err.message; error.scrollIntoView({ block: "nearest" }); }
      finally { saving = false; if (dialog.isConnected) form.querySelector("[type=submit]").disabled = false; }
    };
    dialog.showModal();
    return true;
  }

  window.collectPurchaseDetails = (car, book = {}) => new Promise(resolve => {
    if (!editor({ car, book, onSave: fields => resolve(fields), onCancel: () => resolve(null) })) resolve(null);
  });
  window.openStockBook = async (id, markSold = false, initialBook = {}) => {
    if (active) return;
    try {
      const response = await fetch(`/api/stock-book/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the stock book.");
      editor({ car: { ...data.car, id }, book: data.stockBook || initialBook, markSold,
        onSave: async fields => {
          const response = await fetch(`/api/stock-book/${encodeURIComponent(id)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields, markSold }) });
          const saved = await response.json();
          if (!response.ok) throw new Error(saved.error || "Could not save the stock book.");
          if (markSold) {
            const update = await fetch(`/api/update/${encodeURIComponent(id)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Status: "Sold" }) });
            const result = await update.json();
            if (!update.ok) throw new Error(`Stock book saved; status was not changed. ${result.error || "Try saving again."}`);
          }
          await loadStock();
          refreshPublicStockCache();
        }
      });
    } catch (err) { alert(err.message); }
  };
})();
