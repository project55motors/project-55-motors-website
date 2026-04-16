/* Project 55 Motors - PDI Master (Admin)
   - Loads vehicle + existing PDI JSON from admin-worker endpoint
   - Enforces: if any item is marked "R" (Rectified), a note is required
   - Saves PDI JSON back to Airtable, and appends rectification summary to vehicle Notes
   - Print + "Save PDF" (downloads PDF) from the browser (no silent printing due to browser security)
*/

(() => {
  const API_BASE = "/api"; // adjust if your worker routes differ
  const NOTES_FIELD_CANDIDATES = ["Notes", "Internal Notes", "Admin Notes"];
  const PDI_JSON_FIELD_CANDIDATES = ["PDI JSON", "PDI_JSON", "PDI Json"];

  const toastEl = document.getElementById("toast");
  const statusEl = document.getElementById("pdiStatus");
  const errorsEl = document.getElementById("pdiErrors");
  const recordIdEl = document.getElementById("recordId");

  const btnBack = document.getElementById("btnBack");
  const btnSaveDraft = document.getElementById("btnSaveDraft");
  const btnMarkComplete = document.getElementById("btnMarkComplete");
  const btnPrint = document.getElementById("btnPrint");
  const btnPdf = document.getElementById("btnPdf");

  function qs(name) {
    const sp = new URLSearchParams(location.search);
    return sp.get(name);
  }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function showErrors(list) {
    if (!errorsEl) return;
    if (!list || !list.length) {
      errorsEl.style.display = "none";
      errorsEl.innerHTML = "";
      return;
    }
    errorsEl.style.display = "block";
    errorsEl.innerHTML = "<strong>Missing / required fixes:</strong><ul>" +
      list.map(x => `<li>${escapeHtml(x)}</li>`).join("") +
      "</ul>";
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
  }

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${t ? " — " + t : ""}`);
    }
    return res.json();
  }

  function getField(fields, candidates) {
    if (!fields) return "";
    for (const c of candidates) {
      if (fields[c] !== undefined && fields[c] !== null && fields[c] !== "") return fields[c];
    }
    return "";
  }

  function setInputByName(name, value, { onlyIfEmpty = true } = {}) {
    const el = document.querySelector(`[name="${CSS.escape(name)}"]`);
    if (!el) return;
    if (onlyIfEmpty && el.value) return;
    el.value = value ?? "";
  }

  function setRadioGroup(name, value) {
    const els = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
    if (!els.length) return;
    for (const r of els) r.checked = (r.value === value);
  }

  function getRadioValue(name) {
    const el = document.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
    return el ? el.value : "";
  }

  function gatherChecklistRadioGroups() {
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    const groups = new Map();
    for (const r of radios) {
      const name = r.name;
      if (!name) continue;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(r);
    }
    return groups;
  }

  function labelForGroup(name) {
    const one = document.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]`);
    if (!one) return name;
    const tr = one.closest("tr");
    if (!tr) return name;
    const itemCell = tr.querySelector("td.item");
    if (!itemCell) return name;
    return itemCell.textContent.trim() || name;
  }

  function noteInputForGroup(name) {
    const note = document.querySelector(`input[type="text"][name="${CSS.escape(name + "_note")}"]`);
    return note || null;
  }

  function validate({ strict = false } = {}) {
    const problems = [];
    const markReq = (el, on) => {
      if (!el) return;
      if (on) el.classList.add("req");
      else el.classList.remove("req");
    };

    const requiredFields = [
      { name: "veh_date", label: "Inspection date" },
      { name: "veh_inspector", label: "Inspected by" },
      { name: "veh_make_model", label: "Make & model" },
      { name: "veh_reg", label: "Registration" },
      { name: "veh_vin", label: "VIN / chassis" },
      { name: "veh_mileage_pdi", label: "Mileage at PDI" },
      { name: "veh_hpi_report_no", label: "HPI report number" },
      { name: "veh_v5c_no", label: "V5C number" },
    ];

    for (const f of requiredFields) {
      const el = document.querySelector(`[name="${CSS.escape(f.name)}"]`);
      if (!el) continue;
      const missing = strict && !String(el.value || "").trim();
      markReq(el, missing);
      if (missing) problems.push(`${f.label} is required`);
    }

    const hpiVal = getRadioValue("veh_hpi");
    if (strict && hpiVal === "fail") problems.push("HPI / finance / category check is marked FAILED — do not sell");

    const groups = gatherChecklistRadioGroups();
    for (const [name] of groups.entries()) {
      if (name === "veh_fuel" || name === "veh_hpi") continue;

      const val = getRadioValue(name);
      if (!val) continue;

      const noteEl = noteInputForGroup(name);
      const needsNote = (val === "rect");

      if (needsNote) {
        const note = noteEl ? String(noteEl.value || "").trim() : "";
        if (!note) {
          const label = labelForGroup(name);
          problems.push(`Rectified item needs a note: "${label}"`);
          if (noteEl) noteEl.classList.add("req");
        } else {
          if (noteEl) noteEl.classList.remove("req");
        }
      } else {
        if (noteEl) noteEl.classList.remove("req");
      }
    }

    const ack = document.querySelector('[name="customer_ack"]');
    if (strict && ack && !ack.checked) problems.push("Customer acknowledgement tick box (handover) is not checked");

    showErrors(problems);
    return problems;
  }

  function buildPdiObject({ status = "draft" } = {}) {
    const fields = {};
    const els = Array.from(document.querySelectorAll("input, textarea"));
    for (const el of els) {
      const name = el.name;
      if (!name) continue;

      if (el.type === "radio") continue;
      if (el.type === "checkbox") fields[name] = !!el.checked;
      else fields[name] = el.value ?? "";
    }

    const checks = {};
    const groups = gatherChecklistRadioGroups();
    for (const [name] of groups.entries()) {
      const val = getRadioValue(name);
      if (!val) continue;
      if (name === "veh_fuel" || name === "veh_hpi") {
        checks[name] = { status: val };
      } else {
        const noteEl = noteInputForGroup(name);
        checks[name] = { status: val, note: noteEl ? (noteEl.value ?? "") : "" };
      }
    }

    const rectified = rectifiedSummary();
    return {
      schema: "PDI-HO-01",
      version: "1.1",
      status,
      updatedAt: new Date().toISOString(),
      fields,
      checks,
      rectified
    };
  }

  function rectifiedSummary() {
    const groups = gatherChecklistRadioGroups();
    const list = [];
    for (const [name] of groups.entries()) {
      if (name === "veh_fuel" || name === "veh_hpi") continue;
      const val = getRadioValue(name);
      if (val !== "rect") continue;
      const label = labelForGroup(name);
      const noteEl = noteInputForGroup(name);
      const note = noteEl ? String(noteEl.value || "").trim() : "";
      list.push({ name, label, note });
    }
    return list;
  }

  function applyPdiObject(pdi) {
    if (!pdi) return;

    if (pdi.fields) {
      for (const [k, v] of Object.entries(pdi.fields)) {
        const el = document.querySelector(`[name="${CSS.escape(k)}"]`);
        if (!el) continue;
        if (el.type === "checkbox") el.checked = !!v;
        else el.value = v ?? "";
      }
    }

    if (pdi.checks) {
      for (const [name, obj] of Object.entries(pdi.checks)) {
        if (!obj) continue;
        if (obj.status) setRadioGroup(name, obj.status);
        const noteEl = noteInputForGroup(name);
        if (noteEl && obj.note !== undefined) noteEl.value = obj.note ?? "";
      }
    }
  }

  function autoAppendRectificationsToFinalNotes() {
    const rect = rectifiedSummary().filter(x => x.note);
    if (!rect.length) return;

    const finalNotes = document.querySelector('[name="final_notes"]');
    if (!finalNotes) return;

    const header = "Rectifications:";
    const existing = String(finalNotes.value || "");
    if (existing.includes(header)) return;

    const block = header + "\n" + rect.map(x => `- ${x.label}: ${x.note}`).join("\n");
    finalNotes.value = existing ? (existing.trim() + "\n\n" + block) : block;
  }

  async function save({ markComplete = false } = {}) {
    const id = recordIdEl.value || "";
    if (!id) throw new Error("Missing record id in URL");

    autoAppendRectificationsToFinalNotes();

    const problems = validate({ strict: markComplete });
    if (problems.length) {
      showToast("Fix required items first");
      return { ok: false, problems };
    }

    const pdi = buildPdiObject({ status: markComplete ? "complete" : "draft" });
    const rect = pdi.rectified || [];
    const rectSummary = rect.length
      ? rect.map(x => `${x.label}${x.note ? ": " + x.note : ""}`).join(" | ")
      : "";

    setStatus(markComplete ? "Saving (complete)…" : "Saving…");
    const payload = {
      id,
      pdi_json: JSON.stringify(pdi),
      mark_complete: markComplete,
      rect_summary: rectSummary
    };

    await fetchJSON(`${API_BASE}/pdi/save`, { method: "POST", body: JSON.stringify(payload) });

    setStatus(markComplete ? "Saved (complete)" : "Saved");
    showToast(markComplete ? "PDI saved as complete" : "PDI saved");
    return { ok: true };
  }

  async function load() {
    try {
      setStatus("Loading…");
      const id = qs("id") || qs("carId") || qs("recordId") || "";
      if (!id) {
        setStatus("No car selected");
        showErrors(["No car id found in URL. Open via the Admin Dashboard PDI button."]);
        return;
      }
      recordIdEl.value = id;

      const data = await fetchJSON(`${API_BASE}/car?id=${encodeURIComponent(id)}`);
      const fields = data.fields || {};

      const makeModel = getField(fields, ["Make & model", "Make & Model", "MakeModel", "Vehicle", "Title"]);
      const reg = getField(fields, ["Registration", "Reg", "VRM"]);
      const vin = getField(fields, ["VIN", "VIN / chassis", "VIN / Chassis"]);
      const mileage = getField(fields, ["Mileage", "Mileage at PDI", "Odometer"]);
      const mot = getField(fields, ["MOT expiry", "MOT Expiry", "MOT", "MOT expiry (if known)"]);
      const keys = getField(fields, ["Keys supplied", "Keys", "Key Count"]);
      const hpiReportNo = getField(fields, ["HPI_report_number", "HPI report number", "HPI Report Number", "HPI ref", "HPI Ref"]);
      const v5cNo = getField(fields, ["V5C_number", "V5C number", "V5C Number", "V5C Ref", "V5C"]);

      setInputByName("veh_make_model", makeModel);
      setInputByName("veh_reg", reg);
      setInputByName("veh_vin", vin);
      setInputByName("veh_mileage_pdi", mileage);
      setInputByName("veh_mot_exp", mot);
      setInputByName("veh_keys", keys);
      setInputByName("veh_hpi_report_no", hpiReportNo);
      setInputByName("veh_v5c_no", v5cNo);
      setInputByName("veh_hpi_report_no", hpiReportNo);
      setInputByName("veh_v5c_no", v5cNo);

      const pdiRaw = getField(fields, PDI_JSON_FIELD_CANDIDATES);
      if (pdiRaw) {
        try {
          const pdiObj = (typeof pdiRaw === "string") ? JSON.parse(pdiRaw) : pdiRaw;
          applyPdiObject(pdiObj);
          setStatus(pdiObj.status === "complete" ? "Loaded (complete)" : "Loaded");
        } catch (e) {
          console.warn("PDI JSON parse failed", e);
          setStatus("Loaded (PDI parse error)");
          showErrors(["PDI JSON exists but could not be parsed. You can still edit and re-save to overwrite it."]);
        }
      } else {
        setStatus("Loaded (new PDI)");
      }

      document.addEventListener("change", (ev) => {
        const t = ev.target;
        if (!t) return;
        if (t.type === "radio") {
          if (t.value === "rect") {
            const noteEl = noteInputForGroup(t.name);
            if (noteEl) noteEl.focus({ preventScroll: true });
          }
          validate({ strict: false });
        }
        if (t.name && t.name.endsWith("_note")) validate({ strict: false });
      });

    } catch (err) {
      console.error(err);
      setStatus("Load failed");
      showErrors([String(err.message || err)]);
    }
  }

  function printDoc() {
    showErrors([]);
    window.print();
  }

  async function downloadPdf() {
    showErrors([]);
    const original = document.getElementById("pdiDocument");
    if (!original) return;

    autoAppendRectificationsToFinalNotes();

    if (window.html2pdf) {
      setStatus("Generating PDF…");
      const id = recordIdEl.value || "pdi";
      const reg = (document.querySelector('[name="veh_reg"]')?.value || "").replace(/\s+/g, "");
      const filename = `PDI_${reg || id}.pdf`;

      const clone = original.cloneNode(true);
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-100000px";
      wrapper.style.top = "0";
      wrapper.style.width = "210mm";
      wrapper.style.background = "#fff";
      wrapper.style.padding = "0";
      wrapper.style.margin = "0";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const opt = {
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] }
      };

      try {
        await window.html2pdf().set(opt).from(wrapper).save();
        setStatus("PDF ready");
        showToast("PDF downloaded");
      } catch (e) {
        console.error(e);
        setStatus("PDF failed");
        showErrors(["PDF generation failed. Use Print → Save as PDF as a fallback."]);
      } finally {
        wrapper.remove();
      }
    } else {
      showErrors(["PDF library not available. Use Print → Save as PDF."]);
    }
  }

  btnBack?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.href = "/admin-dashboard";
  });

  btnSaveDraft?.addEventListener("click", () => save({ markComplete: false }).catch(e => {
    console.error(e); showErrors([String(e.message || e)]); setStatus("Save failed");
  }));

  btnMarkComplete?.addEventListener("click", () => save({ markComplete: true }).catch(e => {
    console.error(e); showErrors([String(e.message || e)]); setStatus("Save failed");
  }));

  btnPrint?.addEventListener("click", () => printDoc());
  btnPdf?.addEventListener("click", () => downloadPdf());

  load();
})();