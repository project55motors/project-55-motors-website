export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    const cookie = req.headers.get("Cookie") || "";

    // Session-based auth (prevents simple cookie spoofing).
    // Prefer a dedicated KV binding (ADMIN_SESSIONS_KV). Falls back to TRAFFIC_KV if not provided.
    const sessionsKv = env.ADMIN_SESSIONS_KV || env.TRAFFIC_KV;
    const SESSION_COOKIE = "__Host-p55admin";
    const SESSION_PREFIX = "sess:";
    const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

    const getCookie = (cookieHeader, name) => {
      const m = (`; ${cookieHeader}`).match(new RegExp(`;\\s*${name}=([^;]+)`));
      return m ? decodeURIComponent(m[1]) : "";
    };

    const newToken = () => {
      const a = new Uint8Array(32);
      crypto.getRandomValues(a);
      return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
    };

    const isValidSession = async (token) => {
      if (!token || !sessionsKv) return false;
      const key = `${SESSION_PREFIX}${token}`;
      const raw = await sessionsKv.get(key).catch(() => null);
      return !!raw;
    };

    const setSession = async (token, meta = {}) => {
      if (!token || !sessionsKv) return;
      const key = `${SESSION_PREFIX}${token}`;
      const value = JSON.stringify({ ...meta, createdAt: Date.now() });
      await sessionsKv.put(key, value, { expirationTtl: SESSION_TTL_SECONDS });
    };

    const deleteSession = async (token) => {
      if (!token || !sessionsKv) return;
      const key = `${SESSION_PREFIX}${token}`;
      await sessionsKv.delete(key).catch(() => {});
    };

    const sessionToken = getCookie(cookie, SESSION_COOKIE);
    const loggedIn = await isValidSession(sessionToken);

    const json = (d, s = 200) =>
      new Response(JSON.stringify(d), {
        status: s,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });

    /* ---------- SETTINGS (KV) ---------- */
    const kv = env.TRAFFIC_KV; // reused for analytics + lightweight settings/versioning
    const SETTINGS_SOLD_KEY = "settings:sold";
    const STOCK_VERSION_KEY = "stock:version";
    const SOLD_AT_PREFIX = "soldAt:";

    const clampInt = (v, min, max, fallback) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(Math.max(Math.round(n), min), max);
    };

    async function getSoldSettings() {
      const def = { showSold: true, keepDays: 30, updatedAt: null };
      if (!kv) return def;
      const raw = await kv.get(SETTINGS_SOLD_KEY, { type: "json" }).catch(() => null);
      if (!raw || typeof raw !== "object") return def;
      return {
        showSold: typeof raw.showSold === "boolean" ? raw.showSold : def.showSold,
        keepDays: clampInt(raw.keepDays, 0, 365, def.keepDays),
        updatedAt: raw.updatedAt || null
      };
    }

    async function bumpStockVersion() {
      if (!kv) return null;
      const curRaw = await kv.get(STOCK_VERSION_KEY).catch(() => null);
      const cur = Number(curRaw || "1");
      const next = Number.isFinite(cur) ? cur + 1 : 2;
      await kv.put(STOCK_VERSION_KEY, String(next));
      return next;
    }

    
    /* ---------- LOGIN RATE LIMIT (KV) ---------- */
    // Brute-force protection (server-side). Uses ADMIN_SESSIONS_KV if present, else TRAFFIC_KV.
    const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 10 * 60; // 10 minutes
    const LOGIN_RATE_LIMIT_MAX = 12; // attempts per window per IP
    const loginKeyForIp = (ip) => `login:rl:${ip}`;

    const getClientIp = (req) => {
      // Cloudflare standard
      return (
        req.headers.get("CF-Connecting-IP") ||
        req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
        "unknown"
      );
    };

    const checkLoginRateLimit = async (ip) => {
      if (!sessionsKv) return { ok: true, remaining: LOGIN_RATE_LIMIT_MAX };
      const key = loginKeyForIp(ip);
      const raw = await sessionsKv.get(key).catch(() => null);
      const count = Number(raw || "0");
      if (Number.isFinite(count) && count >= LOGIN_RATE_LIMIT_MAX) {
        return { ok: false, remaining: 0 };
      }
      return { ok: true, remaining: Math.max(LOGIN_RATE_LIMIT_MAX - (count || 0), 0) };
    };

    const bumpLoginRateLimit = async (ip) => {
      if (!sessionsKv) return;
      const key = loginKeyForIp(ip);
      const raw = await sessionsKv.get(key).catch(() => null);
      const count = Number(raw || "0");
      const next = Number.isFinite(count) ? count + 1 : 1;
      await sessionsKv.put(key, String(next), { expirationTtl: LOGIN_RATE_LIMIT_WINDOW_SECONDS });
    };

    const clearLoginRateLimit = async (ip) => {
      if (!sessionsKv) return;
      const key = loginKeyForIp(ip);
      await sessionsKv.delete(key).catch(() => {});
    };


    /* ---------- AUTH ---------- */

    if (path === "/api/login" && req.method === "POST") {
      const ip = getClientIp(req);
      const rl = await checkLoginRateLimit(ip);
      if (!rl.ok) return json({ ok: false, error: "Too many attempts. Try again shortly." }, 429);

      const { username, password } = await req.json();

      if (username === env.ADMIN_USER && password === env.ADMIN_PASS) {
        if (!sessionsKv) {
          // Fail closed: do not allow login without session storage.
          return json({ ok: false, error: "ADMIN_SESSIONS_KV (or TRAFFIC_KV fallback) is not bound." }, 500);
        }

        const token = newToken();
        await setSession(token, { user: username });
        await clearLoginRateLimit(ip);

        const cookieVal = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;

        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Set-Cookie": cookieVal
          }
        });
      }

      await bumpLoginRateLimit(ip);
      return json({ ok: false }, 401);
    }

    if (path === "/api/logout" && (req.method === "POST" || req.method === "GET")) {
      try {
        await deleteSession(sessionToken);
      } catch {}

      return new Response(null, {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
        }
      });
    }

    if (path === "/api/login-check") {
      return json({ loggedIn, expiresInSeconds: loggedIn ? SESSION_TTL_SECONDS : 0 });
    }

    if (!loggedIn) return json({ error: "Unauthorized" }, 401);

    /* ---------- SETTINGS (Sold vehicles) ---------- */
    if (path === "/api/settings/sold" && req.method === "GET") {
      if (!kv) return json({ error: "TRAFFIC_KV not bound on admin-worker" }, 500);
      const sold = await getSoldSettings();
      return json({ ok: true, sold });
    }

    if (path === "/api/settings/sold" && req.method === "POST") {
      if (!kv) return json({ error: "TRAFFIC_KV not bound on admin-worker" }, 500);

      const body = await req.json().catch(() => ({}));
      const showSold = !!body.showSold;
      const keepDays = clampInt(body.keepDays, 0, 365, 30);

      const sold = { showSold, keepDays, updatedAt: Date.now() };
      await kv.put(SETTINGS_SOLD_KEY, JSON.stringify(sold));

      // Ensure public site picks this up immediately (cache-bust via version).
      await bumpStockVersion();

      return json({ ok: true, sold });
    }

    /* ---------- ANALYTICS (KV) ---------- */
    // Requires KV binding on THIS worker: TRAFFIC_KV
    if (path === "/api/analytics" && req.method === "GET") {
      const kv = env.TRAFFIC_KV;
      if (!kv) return json({ error: "TRAFFIC_KV not bound on admin-worker" }, 500);

      const daysParam = Number(url.searchParams.get("days") || "30");
      const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 90) : 30;

      const today = new Date();
      // UTC day strings
      const dayKeys = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        d.setUTCDate(d.getUTCDate() - i);
        const day = d.toISOString().slice(0, 10);
        dayKeys.push(day);
      }

      const series = [];
      const totals = { total: 0, byPath: {}, byCleanPath: {}, byCountry: {}, byReferrer: {}, byUtmSource: {} };

      const cleanAnalyticsPath = (raw) => {
        const s = String(raw || "").trim();
        if (!s) return "/";
        try {
          const u = new URL(s, "https://project55motors.co.uk");
          let pathname = u.pathname || "/";
          if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
          return pathname || "/";
        } catch {
          return s.split("?")[0].split("#")[0] || "/";
        }
      };

      for (const day of dayKeys.reverse()) {
        const key = `a:day:${day}`;
        const data =
          (await kv.get(key, { type: "json" })) || {
            day,
            total: 0,
            byPath: {},
            byCountry: {},
            byReferrer: {},
            byUtmSource: {}
          };

        series.push({ day, total: data.total || 0 });

        totals.total += data.total || 0;

        for (const [p, n] of Object.entries(data.byPath || {})) {
          const count = n || 0;
          totals.byPath[p] = (totals.byPath[p] || 0) + count;
          const cleanPath = cleanAnalyticsPath(p);
          totals.byCleanPath[cleanPath] = (totals.byCleanPath[cleanPath] || 0) + count;
        }
        for (const [c, n] of Object.entries(data.byCountry || {})) {
          totals.byCountry[c] = (totals.byCountry[c] || 0) + (n || 0);
        }
        for (const [r, n] of Object.entries(data.byReferrer || {})) {
          totals.byReferrer[r] = (totals.byReferrer[r] || 0) + (n || 0);
        }
        for (const [s, n] of Object.entries(data.byUtmSource || {})) {
          totals.byUtmSource[s] = (totals.byUtmSource[s] || 0) + (n || 0);
        }
      }

      const top = (obj, limit = 8) =>
        Object.entries(obj)
          .sort((a, b) => (b[1] || 0) - (a[1] || 0))
          .slice(0, limit)
          .map(([k, v]) => ({ key: k, count: v }));

      return json({
        ok: true,
        days,
        series,
        topPages: top(totals.byPath, 10),
        topCleanPages: top(totals.byCleanPath, 20),
        topCountries: top(totals.byCountry, 10),
        topReferrers: top(totals.byReferrer, 10),
        topUtmSources: top(totals.byUtmSource, 10),
        total: totals.total,
        generatedAt: Date.now()
      });
    }

    /* ---------- CONVERSION EVENTS (KV) ---------- */
    // Reads anonymous event aggregates written by cars-api (/cars-api/event)
    if (path === "/api/events" && req.method === "GET") {
      const kv = env.TRAFFIC_KV;
      if (!kv) return json({ error: "TRAFFIC_KV not bound on admin-worker" }, 500);

      const daysParam = Number(url.searchParams.get("days") || "30");
      const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 90) : 30;

      const today = new Date();
      const dayKeys = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        d.setUTCDate(d.getUTCDate() - i);
        const day = d.toISOString().slice(0, 10);
        dayKeys.push(day);
      }

      const series = [];
      const totals = { total: 0, byEvent: {}, byPath: {} };

      for (const day of dayKeys.reverse()) {
        const key = `e:day:${day}`;
        const data =
          (await kv.get(key, { type: "json" })) || {
            day,
            total: 0,
            byEvent: {},
            byPath: {}
          };

        series.push({ day, total: data.total || 0 });
        totals.total += data.total || 0;

        for (const [e, n] of Object.entries(data.byEvent || {})) {
          totals.byEvent[e] = (totals.byEvent[e] || 0) + (n || 0);
        }
        for (const [p, n] of Object.entries(data.byPath || {})) {
          totals.byPath[p] = (totals.byPath[p] || 0) + (n || 0);
        }
      }

      const top = (obj, limit = 8) =>
        Object.entries(obj)
          .sort((a, b) => (b[1] || 0) - (a[1] || 0))
          .slice(0, limit)
          .map(([k, v]) => ({ key: k, count: v }));

      return json({
        ok: true,
        days,
        series,
        topEvents: top(totals.byEvent, 10),
        topEventPages: top(totals.byPath, 10),
        total: totals.total,
        generatedAt: Date.now()
      });
    }

    /* ---------- AIRTABLE ---------- */

    const base = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_NAME}`;
    const headers = {
      Authorization: `Bearer ${env.AIRTABLE_PAT}`,
      "Content-Type": "application/json"
    };

    const normaliseStatusForAirtable = (val) => {
      if (val === null || val === undefined) return null;
      const raw = String(val).trim();
      if (!raw) return null;

      const v = raw.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]+/g, "");
      if (v === "hidden") return null;
      if (v === "available") return "Available";
      if (v === "sold") return "Sold";
      if (v === "prep" || v === "in_prep" || v === "inprep") return "In_prep";
      if (v === "arriving_soon" || v === "arrivingsoon") return "Arriving_soon";

      // If Airtable has extra statuses you add later, pass through as-is.
      return raw;
    };

    /* ---------- PRIVATE VAT STOCK BOOK ---------- */
    // This table must stay separate from Cars: the public stock API returns Cars fields.
    const bookBase = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(env.AIRTABLE_STOCK_BOOK_TABLE || "tbl3Z4BJLkDB3BjaB")}`;
    const bookKeys = ["VAT_Treatment", "Purchase_Date", "Purchase_Invoice_Number", "Purchase_Invoice_Self_Issued", "Purchase_Price", "Seller_Name", "Seller_Address", "Eligibility_Confirmed", "Sale_Date", "Sales_Invoice_Number", "Selling_Price", "Buyer_Name", "Buyer_Address", "Disposal_Method"];
    const present = v => v !== null && v !== undefined && String(v).trim() !== "";
    const validMoney = v => present(v) && /^\d+(\.\d{1,2})?$/.test(String(v)) && Number(v) <= 1000000000;
    const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
    function cleanBook(raw) {
      const fields = {};
      for (const key of bookKeys) {
        if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
        const value = raw[key];
        if (["Purchase_Invoice_Self_Issued", "Eligibility_Confirmed"].includes(key)) fields[key] = value === true;
        else if (["Purchase_Price", "Selling_Price"].includes(key)) fields[key] = validMoney(value) ? Number(value) : (present(value) ? "invalid" : null);
        else fields[key] = present(value) ? String(value).trim() : null;
      }
      return fields;
    }
    function bookErrors(book, car, requireSale = false) {
      const errors = [];
      if (!["Margin scheme", "Normal VAT"].includes(book.VAT_Treatment)) errors.push("Choose a VAT treatment.");
      if (!present(car.Make_Model)) errors.push("Make / model is required.");
      if (!present(car.Registration) && !present(car.VIN)) errors.push("Registration or VIN is required.");
      if (!validDate(book.Purchase_Date)) errors.push("A valid purchase date is required.");
      if (!validMoney(book.Purchase_Price)) errors.push("Purchase price must be a non-negative GBP amount with at most two decimal places.");
      if (!present(book.Seller_Name)) errors.push("Seller name is required.");
      if (!present(book.Seller_Address)) errors.push("Seller address is required for the purchase invoice record.");
      if (!present(book.Purchase_Invoice_Number) && book.Purchase_Invoice_Self_Issued !== true) errors.push("Purchase invoice number is required unless you made out the purchase invoice yourself.");
      if (book.VAT_Treatment === "Margin scheme" && book.Eligibility_Confirmed !== true) errors.push("Confirm margin scheme eligibility against the purchase invoice.");
      const hasSale = requireSale || ["Sale_Date", "Sales_Invoice_Number", "Selling_Price", "Buyer_Name", "Buyer_Address", "Disposal_Method"].some(k => present(book[k]));
      if (hasSale) {
        if (!validDate(book.Sale_Date)) errors.push("A valid sale / disposal date is required.");
        if (validDate(book.Sale_Date) && validDate(book.Purchase_Date) && book.Sale_Date < book.Purchase_Date) errors.push("Sale / disposal date cannot precede purchase date.");
        if (!present(book.Disposal_Method)) {
          if (!present(book.Sales_Invoice_Number)) errors.push("Sales invoice number is required.");
          if (!validMoney(book.Selling_Price)) errors.push("Actual selling price is required (GBP, at most two decimal places).");
          if (!present(book.Buyer_Name)) errors.push("Buyer name is required.");
          if (!present(book.Buyer_Address)) errors.push("Buyer address is required for the sales invoice record.");
        } else if (present(book.Selling_Price) || present(book.Sales_Invoice_Number)) errors.push("Use either sale details or a non-sale disposal method, not both.");
      }
      return errors;
    }
    async function airtableBook(url, method = "GET", fields) {
      const response = await fetch(url, { method, headers, ...(fields ? { body: JSON.stringify({ fields }) } : {}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || `Stock book request failed (${response.status}). Check the worker token has access to the stock book table.`);
      return data;
    }
    async function findBook(carId) {
      const query = new URL(bookBase);
      query.searchParams.set("filterByFormula", `{Car_ID}='${carId}'`);
      query.searchParams.set("maxRecords", "2");
      const data = await airtableBook(query.toString());
      if (data.records?.length > 1) throw new Error("Duplicate stock book records found. Resolve these in Airtable before editing.");
      return data.records?.[0] || null;
    }
    function calculateBook(book) {
      if (book.VAT_Treatment !== "Margin scheme" || !validDate(book.Sale_Date) || present(book.Disposal_Method) || !validMoney(book.Selling_Price) || !validMoney(book.Purchase_Price)) return { margin: null, vat: null };
      const marginPence = Math.round(Number(book.Selling_Price) * 100) - Math.round(Number(book.Purchase_Price) * 100);
      return { margin: marginPence / 100, vat: Math.round(Math.max(0, marginPence) / 6) / 100 };
    }
    function printBook(book, car) {
      const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      const money = v => present(v) ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v)) : "Pending";
      const calc = calculateBook(book);
      const errors = bookErrors(book, car, car.Status === "Sold");
      const rows = [
        ["Stock number", book.Stock_Number], ["VAT treatment", book.VAT_Treatment],
        ["Vehicle", book.Make_Model], ["Registration at purchase", book.Purchase_Registration || "No registration — see VIN"],
        ["Current registration", car.Registration || "No registration"], ["VIN at purchase", book.VIN],
        ["Purchase date", book.Purchase_Date], ["Purchase invoice", book.Purchase_Invoice_Number || (book.Purchase_Invoice_Self_Issued ? "Made out by dealer" : "Missing")],
        ["Purchase price", money(book.Purchase_Price)], ["Seller", book.Seller_Name], ["Seller address", book.Seller_Address],
        ["Sale / disposal date", book.Sale_Date || "Pending — unsold"], ["Sales invoice", book.Sales_Invoice_Number || "Pending / not applicable"],
        ["Buyer", book.Buyer_Name || "Pending / not applicable"], ["Buyer address", book.Buyer_Address || "Pending / not applicable"],
        ["Selling price", money(book.Selling_Price)], ["Non-sale disposal", book.Disposal_Method || "Not applicable"],
        ["Margin on sale", calc.margin === null ? "Pending / not applicable" : money(calc.margin)],
        ["Margin scheme VAT due", calc.vat === null ? "Pending / not applicable" : money(calc.vat)]
      ];
      return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Stock book ${esc(book.Stock_Number)} – Project 55 Motors</title>
      <style>body{font:15px Arial,sans-serif;max-width:850px;margin:30px auto;padding:0 20px;color:#111}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;border:1px solid #bbb;padding:9px;white-space:pre-wrap;overflow-wrap:anywhere}th{width:32%}aside{border:2px solid #a50;padding:12px;margin:15px 0}small{display:block;margin:20px 0;line-height:1.5}@media print{button{display:none}body{margin:0;font-size:11px}tr{break-inside:avoid}}</style>
      <h1>Project 55 Motors</h1><h2>${book.VAT_Treatment === "Margin scheme" ? "VAT margin scheme stock book" : "Normal VAT purchase / sale record"}</h2>
      <button onclick="window.print()">Print / Save as PDF</button>
      ${errors.length ? `<aside><strong>Incomplete record</strong><ul>${errors.map(e => `<li>${esc(e)}</li>`).join("")}</ul></aside>` : ""}
      <table>${rows.map(([label, value]) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`).join("")}</table>
      <small>Internal stock book record — this is not a customer invoice. Margin VAT uses the UK standard rate of 20% (one-sixth of a positive margin); no VAT is due on a zero or negative margin. Normal VAT records are excluded from this calculation. Purchase price excludes preparation costs. Retain purchase and sales invoices separately. Keep evidence of any registration change.</small>
      <small>Generated ${esc(new Date().toISOString())}. HMRC guidance: https://www.gov.uk/vat-margin-schemes/keeping-records</small></html>`;
    }
    if (path.startsWith("/api/stock-book/")) {
      const carId = path.split("/").pop();
      if (!/^rec[A-Za-z0-9]+$/.test(carId)) return json({ error: "Invalid vehicle ID." }, 400);
      if (!["GET", "POST"].includes(req.method)) return json({ error: "Method not allowed." }, 405);
      try {
        const carResponse = await fetch(`${base}/${carId}`, { headers });
        if (!carResponse.ok) return json({ error: "Vehicle could not be loaded." }, carResponse.status);
        const car = (await carResponse.json()).fields || {};
        const existing = await findBook(carId);
        if (req.method === "GET") {
          if (url.searchParams.get("print") === "1") {
            if (!existing) return json({ error: "Save the stock book details before printing." }, 404);
            return new Response(printBook(existing.fields, car), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
          }
          return json({ ok: true, stockBook: existing?.fields || null, car: { Make_Model: car.Make_Model, Registration: car.Registration, VIN: car.VIN, Status: car.Status } });
        }
        const body = await req.json().catch(() => ({}));
        const fields = { ...(existing?.fields || {}), ...cleanBook(body.fields || {}) };
        const errors = bookErrors(fields, car, car.Status === "Sold" || body.markSold === true);
        if (errors.length) return json({ error: errors.join("\n"), errors }, 422);
        const snapshot = existing ? {} : { Make_Model: car.Make_Model || "", Registration: car.Registration || "", Purchase_Registration: car.Registration || "", VIN: car.VIN || "" };
        const saved = await airtableBook(existing ? `${bookBase}/${existing.id}` : bookBase, existing ? "PATCH" : "POST", { ...snapshot, ...cleanBook(fields), Car_ID: carId });
        return json({ ok: true, stockBook: saved.fields });
      } catch (error) { return json({ error: error.message }, 502); }
    }


    if (path === "/api/all") {
      const records = [];
      let offset;
      do {
        const stockUrl = new URL(base);
        stockUrl.searchParams.set("pageSize", "100");
        if (offset) stockUrl.searchParams.set("offset", offset);
        const r = await fetch(stockUrl, { headers });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return json({ error: j?.error?.message || `Airtable read failed (${r.status})` }, r.status);
        records.push(...(j.records || []).map(r => ({ id: r.id, ...r.fields })));
        offset = j.offset;
      } while (offset);
      return json(records);
    }

    /* ---------- CREATE VEHICLE ---------- */
    if (path === "/api/create" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const rawFields = body && typeof body === "object" ? (body.fields ?? body) : {};
      const fields = {};

      for (const [key, value] of Object.entries(rawFields)) {
        // Treat empty string as null (clear)
        if (value === "") {
          fields[key] = null;
          continue;
        }

        if (key === "Status") {
          fields[key] = normaliseStatusForAirtable(value);
          continue;
        }

        if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(key)) {
          const n = Number(value);
          fields[key] = Number.isFinite(n) ? n : null;
          continue;
        }

        fields[key] = value;
      }

      const stockBook = cleanBook(body.stockBook || {});
      const purchaseErrors = bookErrors(stockBook, fields, fields.Status === "Sold");
      if (purchaseErrors.length) return json({ error: purchaseErrors.join("\n"), errors: purchaseErrors }, 422);

      // If Status was omitted entirely, do nothing (Airtable leaves it blank).
      if (fields.Status === undefined) {
        // no-op
      }

      const r = await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify({ fields })
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = j?.error?.message || j?.error || `Airtable create failed (${r.status})`;
        return json({ error: msg, detail: j }, r.status);
      }

      // Airtable has no multi-table transactions. Report the created vehicle explicitly
      // if the private write fails so the UI can repair it without creating a duplicate.
      try {
        await airtableBook(bookBase, "POST", {
          ...stockBook, Car_ID: j.id, Make_Model: fields.Make_Model || "",
          Registration: fields.Registration || "", Purchase_Registration: fields.Registration || "", VIN: fields.VIN || ""
        });
      } catch (error) {
        return json({ error: `Vehicle created, but its stock book was not saved: ${error.message}`, vehicleCreated: true, id: j.id }, 502);
      }

      // KV: bump stock version so the public site cache updates instantly after a create.
      if (kv) {
        try {
          const status = String(fields.Status || "").trim();
          if (status === "Sold") {
            const soldKey = `${SOLD_AT_PREFIX}${j.id}`;
            const existing = await kv.get(soldKey).catch(() => null);
            if (!existing) await kv.put(soldKey, String(Date.now()));
          }
          await bumpStockVersion();
        } catch (e) {
          console.error("KV post-create error:", e);
        }
      }

      return json({ ok: true, id: j.id, record: j }, 200);
    }

    /* ---------- GET SINGLE VEHICLE (for PDI) ---------- */
    if (path === "/api/car" && req.method === "GET") {
      const id = url.searchParams.get("id") || "";
      if (!id) return json({ error: "Missing id" }, 400);

      const r = await fetch(`${base}/${id}`, { headers });
      if (!r.ok) {
        const e = await r.json().catch(() => null);
        return json({ error: e?.error?.message || e?.error || `Airtable read failed (${r.status})`, detail: e }, 422);
      }

      const rec = await r.json();
      return json({ ok: true, id: rec.id, fields: rec.fields || {} });
    }

    /* ---------- PDI SAVE (stores full form state as JSON) ---------- */
    if (path === "/api/pdi/save" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      const pdi_json = String(body.pdi_json || "").trim();
      const mark_complete = !!body.mark_complete;
      const rect_summary = String(body.rect_summary || "").trim();

      if (!id) return json({ error: "Missing id" }, 400);
      if (!pdi_json) return json({ error: "Missing pdi_json" }, 400);

      // Read record once (for notes append + field existence).
      const getR = await fetch(`${base}/${id}`, { headers });
      if (!getR.ok) {
        const e = await getR.json().catch(() => null);
        return json({ error: e?.error?.message || e?.error || `Airtable read failed (${getR.status})`, detail: e }, 422);
      }
      const rec = await getR.json();
      const curFields = rec.fields || {};

      // Extract headline values from JSON so we can also keep VIN/HPI/V5C current on the car record.
      let pdiObj = null;
      try { pdiObj = JSON.parse(pdi_json); } catch { /* ignore */ }
      const pdiFields = (pdiObj && typeof pdiObj === "object" && pdiObj.fields && typeof pdiObj.fields === "object") ? pdiObj.fields : {};

      const vin = String(pdiFields.veh_vin || "").trim();
      const hpi = String(pdiFields.veh_hpi_report_no || "").trim();
      const v5c = String(pdiFields.veh_v5c_no || "").trim();

      const fields = {
        // Minimal required storage field (Long text) in Airtable car table
        PDI_JSON: pdi_json,
        ...(vin ? { VIN: vin } : {}),
        ...(hpi ? { HPI_report_number: hpi } : {}),
        ...(v5c ? { V5C_number: v5c } : {})
      };

      // Append a human-readable rectification trail into Notes (if that field exists).
      const NOTES_CANDIDATES = ["Notes", "Internal Notes", "Admin Notes"];
      const notesKey = NOTES_CANDIDATES.find(k => Object.prototype.hasOwnProperty.call(curFields, k));
      if (notesKey && (rect_summary || mark_complete)) {
        const reg = String(pdiFields.veh_reg || curFields.Registration || "").trim();
        const stamp = new Date().toISOString().slice(0, 10);
        const header = mark_complete ? "PDI marked complete" : "PDI updated";
        const rectLine = rect_summary ? `Rectifications: ${rect_summary}` : "Rectifications: none recorded";
        const block = `${header}${reg ? ` (${reg})` : ""} – ${stamp}\n${rectLine}`;

        const existing = String(curFields[notesKey] || "").trim();
        fields[notesKey] = existing ? `${existing}\n\n${block}` : block;
      }

      const r = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fields })
      });

      if (!r.ok) {
        const e = await r.json().catch(() => null);
        const msg =
          e?.error?.message ||
          e?.error ||
          (typeof e === "string" ? e : null) ||
          `Airtable update failed (${r.status})`;
        return json({ error: msg, detail: e }, 422);
      }

      // This does not affect the public stock API, but keeps admin cache/versioning consistent.
      if (kv) {
        try { await bumpStockVersion(); } catch (e) { console.error("KV bump version error:", e); }
      }

      return json({ ok: true });
    }

    /* ---------- AI HELPERS ---------- */

    const aiModel = env.OPENAI_MODEL || "gpt-4.1-mini";

    function txt(v) {
      return v == null ? "" : String(v).trim();
    }

    function numOrBlank(v) {
      if (v === null || v === undefined || v === "") return "";
      const n = Number(v);
      return Number.isFinite(n) ? n : "";
    }

    function inferMakeModelVariant(makeModelRaw) {
      const raw = txt(makeModelRaw);
      if (!raw) return { make: "", model: "", variant: "" };

      const parts = raw.split(/\s+/).filter(Boolean);
      if (!parts.length) return { make: "", model: "", variant: "" };

      const make = parts[0] || "";
      const model = parts[1] || "";
      const variant = parts.slice(2).join(" ");

      return { make, model, variant };
    }

    function buildAiInput(fields, recordId) {
      const mm = inferMakeModelVariant(fields.Make_Model);

      return {
        record_id: recordId,
        registration: txt(fields.Registration),
        make_model: txt(fields.Make_Model),
        inferred_make: mm.make,
        inferred_model: mm.model,
        inferred_variant_trim: mm.variant,
        price: numOrBlank(fields.Price),
        mileage: numOrBlank(fields.Mileage),
        mot_date: txt(fields.MOT_Date),
        transmission: txt(fields.Transmission),
        engine_size: numOrBlank(fields.Engine_size),
        fuel_type: txt(fields.Fuel_type),
        short_description: txt(fields.Short_Description),
        full_description: txt(fields.Full_Description),
        status: txt(fields.Status),
        colour: txt(fields.Colour),
        doors: numOrBlank(fields.Doors),
        seats: numOrBlank(fields.Seats),
        body_style: txt(fields.Body_Style),
        reg_date: txt(fields.Reg_Date),
        year_of_manufacture: numOrBlank(fields.Year_of_Manufacture),
        co2_g_mile: numOrBlank(fields.CO2_g_mile),
        insurance_group: numOrBlank(fields.Insurance_Group),
        number_of_owners: numOrBlank(fields.Number_of_Owners),
        number_of_keys: numOrBlank(fields.Number_of_Keys),
        number_of_remotes: numOrBlank(fields.Number_of_Remotes),
        service_history_type: txt(fields.Service_History_Type),
        video_url: txt(fields.Video_URL),
        slug: txt(fields.Slug),
        hpi_report_number: txt(fields.HPI_report_number),
        vin: txt(fields.VIN),
        v5c_number: txt(fields.V5C_number),
        notes: txt(fields.Notes),
        ai_hpi_notes: txt(fields.AI_HPI_Notes),
        ai_totalcarcheck_notes: txt(fields.AI_TotalCarCheck_Notes),
        ai_vehiclescore_notes: txt(fields.AI_VehicleScore_Notes),
        ai_motors_market_check_notes: txt(fields.AI_Motors_Market_Check_Notes),
        ai_autotrader_notes: txt(fields.AI_AutoTrader_Notes),
        ai_prep_completed: txt(fields.AI_Prep_Completed),
        ai_disclosure_notes: txt(fields.AI_Disclosure_Notes),
	ai_model_research: txt(fields.AI_Model_Research),
	ai_style_guide: txt(fields.AI_Style_Guide),
      };
    }

    async function generateAdvertPackWithOpenAI(env, input) {
      const systemPrompt = [
        "You write premium used car advert packs for Project 55 Motors in the UK.",
        "Return strict JSON only. No markdown. No commentary.",
        "Be accurate. Do not invent facts not supported by the input.",
        "Tone: premium independent dealer, factual, knowledgeable, understated and trustworthy.",
	"Avoid generic dealer clichés.",
	"Never invent specifications or features.",
	"Never exaggerate condition.",
	"Avoid repetition throughout the advert.",
	"Focus on why this particular example is desirable.",
        "Use UK English.",
        "Do not mention HPI report number, VIN, V5C number, or internal admin notes publicly unless clearly suitable.",
        "Use realistic used car advert language.",
        "The output must contain all keys shown in the schema."
      ].join(" ");
const userPrompt = `
Generate a structured advert pack for this vehicle.

INPUT JSON:
${JSON.stringify(input, null, 2)}

OUTPUT JSON SCHEMA:
{
  "sales_tagline": "max 50 characters if possible",
  "website_short_description": "one concise premium selling line",
  "website_full_description": "full Project 55 Motors website advert using the required structure",
  "motors_description": "Cazoo marketplace-ready advert description, direct and factual",
  "facebook_post": "shorter social post with call to action",
  "whatsapp_message": "polite prefilled enquiry message from a buyer",
  "seo_title": "SEO title for the vehicle page",
  "meta_description": "SEO meta description around 150-160 characters where possible",
  "sales_highlights": "plain text highlights separated by new lines",
  "risk_notes": "internal-only notes about missing data, disclosures, risks, or caution points",
  "pricing_note": "internal-only pricing summary using market notes provided"
}

PROJECT 55 MOTORS STYLE:

PROJECT 55 EXAMPLE WRITING STYLE

Example:

"Finished in Grey, this 2018 (68) Volkswagen Polo SEL 1.0 TSI 115 is an exceptional one owner example with just 8245 miles from new and a documented Volkswagen main dealer service history."

Example:

"The sixth-generation Polo is widely regarded as one of the best superminis ever produced. Built on Volkswagen's MQB platform, it offers a noticeably more refined, spacious and premium driving experience than many rivals."

Example:

"The Match Edition is one of the best-equipped Polo models, combining sought-after features such as Apple CarPlay, Android Auto, parking sensors and cruise control."

Do not begin adverts with:

This vehicle...
This example...
This car is distinguished by...
This model offers...

Begin naturally using:

Finished in [colour], this [year] [make] [model]...
Write in this style.
These instructions are mandatory for every advert.

The most important Project 55 Motors themes are:

1. Provenance
2. Preparation
3. Specification
4. Model knowledge

The advert should explain these themes in that order.

Write like a knowledgeable independent used car dealer in South Shropshire.

Tone must be professional, factual, confident, knowledgeable and understated.

Avoid generic dealer language.

Do not exaggerate.

Do not invent facts.

If a fact is missing, omit it or mention it only in risk_notes.

Use UK English.

Do not use emojis.

Do not use markdown.

Do not use asterisks.

Do not use sales clichés.

Never use:
- stunning
- desirable example
- compelling choice
- opportunity not to be missed
- appealing to buyers
- stand out in the market
- comfort and convenience
- statement of quality
- first to see will buy
- drives as it should
- immaculate
- showroom condition
- bargain
- must be seen
- perfect blend
- boasts
- under the bonnet

Do not use generic buyer-language such as:

- practical choice
- reliable choice
- modern driving needs
- today's market
- urban driving
- caters to
- offers peace of mind
- suitable for a wide range of buyers
- stands out in the market
- adds significant value

Instead explain specifically why the model, engine or specification is desirable.


Do not use:

- well-equipped choice
- ideal for
- perfect for
- suitable for
- both city and longer journeys

Instead explain specific model strengths.

HUMAN DEALER INSIGHT:

If dealer_insight is supplied, treat it as high-priority human dealer judgement.

Use dealer_insight to elevate the website_full_description, especially:
- the opening paragraph
- the preparation paragraph

Dealer insight must be visibly represented in the final website_full_description unless it is unsafe, unsupported or conflicts with the vehicle data.

If dealer_insight contains a strong factual selling point, include it clearly in natural dealer language.

Do not dilute dealer insight into vague wording.

If dealer_insight cannot be used, explain why in risk_notes.


- WHY THIS CAR STANDS OUT

Do not ignore dealer_insight.

Do not copy dealer_insight word-for-word if it can be written more professionally.

If dealer_insight conflicts with vehicle data, mention the conflict only in risk_notes.

EXISTING ADVERT RULE:

If full_description already contains a high-quality advert:
- use it as a style reference
- use it as a structure reference
- preserve useful dealer insight already present
- improve it only where vehicle data or ai_model_research adds value
- do not replace a strong advert with a weaker generic version

WEBSITE FULL DESCRIPTION STRUCTURE:

The website_full_description must follow this exact structure:

Opening paragraph:
Explain why this specific example is special. Focus on mileage, ownership, service history, rarity, provenance or preparation.

Second paragraph:
Explain preparation work, servicing, MOT, tyres, battery, brakes or other work completed.

Third paragraph:
Explain why the model, engine or trim is desirable. Use ai_model_research if supplied. Reviews and model research may explain general buyer appeal, but must not be used to claim this specific car has equipment unless vehicle data confirms it.

Each paragraph must be separated by a blank line.

Do not merge the opening, preparation and model-description paragraphs together.

Each paragraph must have a distinct purpose.

Then include these headings exactly:

HIGHLIGHTS

SPECIFICATION

CONDITION

WHY THIS CAR STANDS OUT

EXISTING ADVERT RULE:

If full_description already contains a high-quality advert:
- use it as a style reference
- use it as a structure reference
- preserve useful dealer insight already present
- improve it only where vehicle data or ai_model_research adds value
- do not replace a strong advert with a weaker generic version

WEBSITE FULL DESCRIPTION STRUCTURE:

The website_full_description must follow this exact structure:

Opening paragraph:
Explain why this specific example is special. Focus on mileage, ownership, service history, rarity, provenance or preparation.
Opening paragraph:

Start naturally using:

"Finished in [colour], this [year] [make] [model]..."

Do not start with:

- This vehicle
- This example
- This model
- This car is distinguished by

The opening paragraph must immediately explain why this specific example is special.

Focus on:
- mileage
- ownership
- service history
- provenance
- rarity
- preparation

Do not merely describe the vehicle.
Second paragraph:
Explain preparation work, servicing, MOT, tyres, battery, brakes or other work completed.

Third paragraph:
Explain why the model, engine or trim is desirable. Use ai_model_research if supplied. Reviews and model research may explain general buyer appeal, but must not be used to claim this specific car has equipment unless vehicle data confirms it.

Then include these headings exactly:

HIGHLIGHTS

SPECIFICATION

CONDITION

WHY THIS CAR STANDS OUT

Then include these headings exactly:

HIGHLIGHTS

SPECIFICATION

CONDITION

WHY THIS CAR STANDS OUT

HIGHLIGHTS:

Each item must appear on its own line.

Example:

2021 (21) Hyundai i10 Premium 1.2 MPI

Grey

15592 miles

Fresh service before sale

Fresh MOT before sale

Brand new battery (5 year warranty)

Supplied with 2 keys

Do not use:
* bullet points
* asterisks
* numbering
* hyphens

List only the strongest buying reasons.

SPECIFICATION:

Each item must appear on its own line.

Example:

1.2 MPI petrol engine

Manual gearbox

Premium trim

Apple CarPlay

Android Auto

Rear view camera

Do not use:
* bullet points
* asterisks
* numbering
* hyphens

List factual equipment and features only.

Do not claim equipment unless it appears in the vehicle data, notes, AI research notes, or descriptions.

CONDITION:
Describe condition, preparation and maintenance professionally. Be honest. Avoid overclaiming.

WHY THIS CAR STANDS OUT:

Explain why a buyer should choose this example over another similar vehicle.

Use specific reasons such as:
- mileage
- ownership
- service history
- provenance
- preparation
- specification
- tyres
- recent servicing
- MOT

Avoid generic phrases such as:
- excellent choice
- adds value
- desirable example
- standout vehicle
- excellent choice
- ideal for
- perfect for
- suited to
- both town driving and longer journeys

Use factual comparisons instead.
Explain the strength, not the use case.

Good:
"The 1.2 MPI engine combines low running costs with impressive refinement."

Avoid:
"making it an excellent choice for both town driving and longer journeys."

MANDATORY PROJECT 55 POINTS:
- Always include "Supplied with 2 keys".
- End website_full_description exactly with:

Prepared to a high standard by Project 55 Motors.

Nationwide delivery and warranty options available.

REPETITION CONTROL:
Do not use generic sales phrases such as:

excellent choice
stands out
adds value
desirable example
careful ownership
well maintained
optimal performance
enhances safety

Instead explain WHY using specific facts from the vehicle.

Opening paragraph rule:

The first paragraph must identify the three strongest selling points of the specific vehicle.

Usually these will be mileage, ownership, service history, provenance, rarity, specification or preparation.
WHY THIS CAR STANDS OUT:

Must compare this vehicle against typical examples currently available for sale.

Explain specifically why a buyer should choose this example over another.
Do not start by describing the car generically.
- Avoid repetition.
- Do not repeat the same selling point in multiple sections unless it adds new value.
- Each section must have a distinct purpose.
- Do not repeat phrases such as "well maintained", "carefully maintained", "excellent example", or "prepared to a high standard".
- Before finalising, self-check the advert and remove repeated ideas.

CAZOO DESCRIPTION:
- motors_description is now for Cazoo, formerly Motors.
- Keep the field name motors_description because the backend still uses AI_Motors_Description.
- Make it direct, clear and marketplace suitable.
- Avoid long sectioned formatting for this field.

FACEBOOK POST:
- Shorter, friendlier and more direct than the website version.
- Mention the strongest selling points.
- Include Project 55 Motors.
- Avoid emojis.

INTERNAL FIELDS:
- risk_notes and pricing_note are internal only.
- Do not make them customer-facing.
- risk_notes should flag missing information, possible overclaims, uncertain spec, or anything that needs human review.
`.trim();

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: aiModel,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      const aiJson = await aiRes.json().catch(() => ({}));

      if (!aiRes.ok) {
        return {
          ok: false,
          status: aiRes.status,
          error: aiJson?.error?.message || `OpenAI request failed (${aiRes.status})`,
          detail: aiJson
        };
      }

      const content = aiJson?.choices?.[0]?.message?.content;
      if (!content) {
        return {
          ok: false,
          status: 500,
          error: "OpenAI returned no message content",
          detail: aiJson
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        return {
          ok: false,
          status: 500,
          error: "OpenAI returned invalid JSON",
          detail: { content }
        };
      }

      return { ok: true, data: parsed };
    }
    /* ---------- AI RESEARCH TEST ---------- */

/* ---------- AI MODEL RESEARCH ---------- */

if (path.startsWith("/api/ai/research/") && req.method === "POST") {
  if (!env.OPENAI_API_KEY) {
    return json({ error: "Missing OPENAI_API_KEY secret on worker" }, 500);
  }

  const id = path.split("/").pop();
  if (!id) return json({ error: "Missing Airtable record id" }, 400);

  const getR = await fetch(`${base}/${id}`, { headers });
  if (!getR.ok) {
    const e = await getR.json().catch(() => null);
    return json({ error: e?.error?.message || "Airtable read failed", detail: e }, 422);
  }

  const rec = await getR.json();
  const fields = rec.fields || {};
  const input = buildAiInput(fields, id);

  const researchPrompt = `
You are preparing internal model research for Project 55 Motors.

Vehicle:
${JSON.stringify(input, null, 2)}

Create concise internal research to help write a premium used car advert.

Research should cover:
- model reputation
- engine appeal
- trim/specification appeal
- buyer profile
- key selling points
- ownership/running cost appeal
- cautions or things not to overclaim

Rules:
- Do not invent features fitted to this specific car.
- You may describe general model strengths.
- Keep it factual, useful and dealer-focused.
- Do not write a sales advert.
- Do not use emojis.
- Return plain text only.
`.trim();

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: aiModel,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You create concise internal used-car model research for a UK independent dealer. Be factual. Do not invent vehicle-specific features."
        },
        {
          role: "user",
          content: researchPrompt
        }
      ]
    })
  });

  const aiJson = await aiRes.json().catch(() => ({}));

  if (!aiRes.ok) {
    return json({
      error: aiJson?.error?.message || `OpenAI research failed (${aiRes.status})`,
      detail: aiJson
    }, aiRes.status);
  }

  const researchText = String(aiJson?.choices?.[0]?.message?.content || "").trim();

  if (!researchText) {
    return json({ error: "OpenAI returned no research text", detail: aiJson }, 500);
  }

  const patchR = await fetch(`${base}/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      fields: {
        AI_Model_Research: researchText
      }
    })
  });

  if (!patchR.ok) {
    const e = await patchR.json().catch(() => null);
    return json({ error: e?.error?.message || "Research update failed", detail: e }, 422);
  }

  return json({ ok: true, id, research: researchText });
}

    /* ---------- AI GENERATE ADVERT PACK ---------- */
    if (path.startsWith("/api/ai/generate/") && req.method === "POST") {
      if (!env.OPENAI_API_KEY) {
        return json({ error: "Missing OPENAI_API_KEY secret on worker" }, 500);
      }

      const id = path.split("/").pop();
      if (!id) return json({ error: "Missing Airtable record id" }, 400);

      const getR = await fetch(`${base}/${id}`, { headers });
      if (!getR.ok) {
        const e = await getR.json().catch(() => null);
        return json(
          { error: e?.error?.message || e?.error || `Airtable read failed (${getR.status})`, detail: e },
          422
        );
      }

      const body = await req.json().catch(() => ({}));
	const dealerInsight = txt(body.dealer_insight);

	const rec = await getR.json();
	const fields = rec.fields || {};
	const aiInput = {
  	...buildAiInput(fields, id),
  	dealer_insight: dealerInsight
	};

      const gen = await generateAdvertPackWithOpenAI(env, aiInput);
      if (!gen.ok) {
        return json({ error: gen.error, detail: gen.detail }, gen.status || 500);
      }

      const out = gen.data || {};

      const patchFields = {
        AI_Sales_Tagline: txt(out.sales_tagline),
        AI_Website_Short_Description: txt(out.website_short_description),
        AI_Website_Full_Description: txt(out.website_full_description),
        AI_Motors_Description: txt(out.motors_description),
        AI_Facebook_Post: txt(out.facebook_post),
        AI_WhatsApp_Message: txt(out.whatsapp_message),
        AI_SEO_Title: txt(out.seo_title),
        AI_Meta_Description: txt(out.meta_description),
        AI_Sales_Highlights: txt(out.sales_highlights),
        AI_Risk_Notes: txt(out.risk_notes),
        AI_Pricing_Note: txt(out.pricing_note),
        AI_Status: "Generated",
        AI_Last_Generated: new Date().toISOString().slice(0, 19),
        AI_Model_Version: aiModel,
        AI_Approved: false
      };

      const patchR = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fields: patchFields })
      });

      if (!patchR.ok) {
        const e = await patchR.json().catch(() => null);
        return json(
          { error: e?.error?.message || e?.error || `Airtable AI update failed (${patchR.status})`, detail: e },
          422
        );
      }

      return json({
        ok: true,
        id,
        generated: patchFields
      });
    }


    /* ---------- AI APPROVE WEBSITE COPY ---------- */
    if (path.startsWith("/api/ai/approve/") && req.method === "POST") {
      const id = path.split("/").pop();
      if (!id) return json({ error: "Missing Airtable record id" }, 400);

      const body = await req.json().catch(() => ({}));
      const editedShort = txt(body.short_description);
      const editedFull = txt(body.full_description);

      const getR = await fetch(`${base}/${id}`, { headers });
      if (!getR.ok) {
        const e = await getR.json().catch(() => null);
        return json(
          { error: e?.error?.message || e?.error || `Airtable read failed (${getR.status})`, detail: e },
          422
        );
      }

      const rec = await getR.json();
      const fields = rec.fields || {};

      const shortDescription = editedShort || txt(fields.AI_Website_Short_Description);
      const fullDescription = editedFull || txt(fields.AI_Website_Full_Description);

      if (!shortDescription && !fullDescription) {
        return json({ error: "No AI website description fields are available to approve." }, 400);
      }

      const patchFields = {
        ...(shortDescription ? { Short_Description: shortDescription } : {}),
        ...(fullDescription ? { Full_Description: fullDescription } : {}),
        ...(editedShort ? { AI_Website_Short_Description: editedShort } : {}),
        ...(editedFull ? { AI_Website_Full_Description: editedFull } : {}),
        AI_Approved: true
      };

      const patchR = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fields: patchFields })
      });

      if (!patchR.ok) {
        const e = await patchR.json().catch(() => null);
        return json(
          { error: e?.error?.message || e?.error || `Airtable approve failed (${patchR.status})`, detail: e },
          422
        );
      }

      if (kv) {
        try { await bumpStockVersion(); } catch (e) { console.error("KV bump version error:", e); }
      }

      return json({ ok: true, id, approved: patchFields });
    }

    /* ---------- PATCH VEHICLE ---------- */

    if (path.startsWith("/api/update/")) {
      if (!["POST", "PATCH"].includes(req.method)) return json({ error: "Method not allowed." }, 405);
      const id = path.split("/").pop();

      const body = await req.json().catch(() => ({}));
      const rawFields = body && typeof body === "object" ? (body.fields ?? body) : {};

      const fields = {};

      for (const [key, value] of Object.entries(rawFields)) {
        if (value === "") {
          fields[key] = null;
          continue;
        }

        if (key === "Status") {
          fields[key] = normaliseStatusForAirtable(value);
          continue;
        }

        if (["Price", "Mileage", "Engine_size", "Sort_Index"].includes(key)) {
          const n = Number(value);
          fields[key] = Number.isFinite(n) ? n : null;
          continue;
        }

        if (["Fuel_type", "Transmission", "Status"].includes(key)) {
          fields[key] = value;
          continue;
        }

        fields[key] = value;
      }

      if (!/^rec[A-Za-z0-9]+$/.test(id)) return json({ error: "Invalid vehicle ID." }, 400);
      if (["Status", "Make_Model", "Registration", "VIN"].some(k => Object.prototype.hasOwnProperty.call(fields, k))) {
        try {
          const currentResponse = await fetch(`${base}/${id}`, { headers });
          if (!currentResponse.ok) return json({ error: "Vehicle could not be loaded." }, currentResponse.status);
          const currentCar = (await currentResponse.json()).fields || {};
          const mergedCar = { ...currentCar, ...fields };
          const book = await findBook(id);
          if (mergedCar.Status === "Sold" && !book) return json({ error: "Open Stock book and save purchase and sale details before marking this car sold." }, 422);
          if (book) {
            const errors = bookErrors(book.fields, mergedCar, mergedCar.Status === "Sold");
            if (errors.length) return json({ error: `Complete Stock book first: ${errors.join(" ")}`, errors }, 422);
          }
        } catch (error) { return json({ error: error.message }, 502); }
      }

      const r = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fields })
      });

      if (!r.ok) {
        const e = await r.json().catch(() => null);
        const msg =
          e?.error?.message ||
          e?.error ||
          (typeof e === "string" ? e : null) ||
          `Airtable update failed (${r.status})`;
        return json({ error: msg, detail: e }, 422);
      }

      // KV: capture SOLD timestamp + bump stock version so public cache updates instantly
      if (kv) {
        try {
          if (Object.prototype.hasOwnProperty.call(fields, "Status")) {
            const status = String(fields.Status || "").trim();
            const soldKey = `${SOLD_AT_PREFIX}${id}`;

            if (status === "Sold") {
              const existing = await kv.get(soldKey).catch(() => null);
              if (!existing) await kv.put(soldKey, String(Date.now()));
            } else {
              // If a sale was set by mistake, removing SOLD clears the timestamp.
              await kv.delete(soldKey);
            }
          }

          await bumpStockVersion();
        } catch (e) {
          console.error("KV post-update error:", e);
        }
      }

      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  }
};
