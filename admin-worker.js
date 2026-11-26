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
      if (!env.ADMIN_USER || !env.ADMIN_PASS) return json({error:"Staff login credentials are not configured."},503);
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

    if (path.startsWith('/api/vat/')) {
      let actor = 'staff';
      try { actor = JSON.parse(await sessionsKv.get(`${SESSION_PREFIX}${sessionToken}`)).user || actor; } catch {}
      return vatApi(req, env, base, headers, actor, kv);
    }

    const normaliseStatusForAirtable = (val) => {
      if (val === null || val === undefined) return null;
      const raw = String(val).trim();
      if (!raw) return null;

      const v = raw.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]+/g, "");
      if (v === "hidden") return null;
      if (v === "available") return "Available";
      if (v === "sold") return "Sold";
      if (v === "reserved") return "Reserved";
      if (v === "prep" || v === "in_prep" || v === "inprep") return "In_prep";
      if (v === "arriving_soon" || v === "arrivingsoon") return "Arriving_soon";

      // If Airtable has extra statuses you add later, pass through as-is.
      return raw;
    };

    if (path === "/api/all") {
      const r = await fetch(base, { headers });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = j?.error?.message || j?.error || `Airtable read failed (${r.status})`;
        return json({ error: msg, detail: j }, r.status);
      }
      return json((j.records || []).map(r => ({ id: r.id, ...r.fields })));
    }

    /* ---------- CREATE VEHICLE ---------- */
    if (path === "/api/create" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!env.VAT_DB) return json({error:'Private stock book must be configured before adding new vehicles.'},503);
      if(!/^[0-9a-f-]{36}$/i.test(String(body.requestKey||''))) return json({error:'A valid purchase request key is required. Reopen the new-car form.'},400);
      const previous = await env.VAT_DB.prepare('SELECT car_id FROM vat_stock WHERE request_key=?').bind(body.requestKey).first();
      if(previous) {
        if(!previous.car_id.startsWith('pending:')) return json({ok:true,id:previous.car_id,alreadyCreated:true});
        return json({error:'This purchase request is pending reconciliation. Do not create another car; inspect the pending entry first.'},409);
      }
      const purchaseCheck = vatValidate(body.purchase || {});
      if (Object.keys(purchaseCheck.errors).length) return json({error:'Complete purchase details before adding the car',errors:purchaseCheck.errors},422);
      if(!purchaseCheck.data.vin) return json({error:'Enter the VIN for a new purchase',errors:{vin:'VIN is required for new acquisitions'}},422);
      if(['Sold','Reserved'].includes(normaliseStatusForAirtable(body.fields?.Status))) return json({error:'Create the purchase first, then use its reservation or completion action.'},409);
      const advert = vatAdvertValidate(body.fields || {}, purchaseCheck.data);
      if(Object.keys(advert.errors).length) return json({error:'Check the vehicle/advert details',errors:advert.errors},422);
      const rawFields = advert.fields;
      purchaseCheck.data.advert = rawFields;
      if (['Sold','Reserved'].includes(normaliseStatusForAirtable(rawFields.Status))) return json({error:'Create the purchase first, then complete its sale from Accounts.'},409);
      const boundary = await env.VAT_DB.prepare("SELECT value FROM vat_config WHERE key='activated_at'").first();
      if(!boundary) return json({error:'Run the private stock-book schema before creating cars.'},503);
      const duplicate=await env.VAT_DB.prepare("SELECT stock_no FROM vat_stock WHERE completed_at IS NULL AND upper(json_extract(data,'$.vin'))=?").bind(purchaseCheck.data.vin).first();
      if(duplicate)return json({error:'An open purchase already uses this VIN. Check the existing stock-book entry before adding another.',errors:{vin:'Already recorded on open stock '+duplicate.stock_no}},409);
      const pendingId = `pending:${crypto.randomUUID()}`;
      const purchaseData = JSON.stringify(purchaseCheck.data);
      const claim = await env.VAT_DB.prepare('INSERT OR IGNORE INTO vat_stock(car_id,data,request_key) VALUES(?,?,?)').bind(pendingId,purchaseData,body.requestKey).run();
      if(claim.meta.changes!==1) return json({error:'This purchase request is already being processed. Reload before retrying.'},409);
      const fields = {};

      for (const [key, value] of Object.entries(rawFields)) {
        // Treat empty string as null (clear)
        if (value === "" || value === null) {
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

      // Share only vehicle identity with public advert fields, never financial data.
      fields.Make_Model = purchaseCheck.data.description;
      fields.Registration = purchaseCheck.data.registration || null;
      fields.VIN = purchaseCheck.data.vin || null;

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

      // Bind the private entry before reporting success. An unbound new car is blocked
      // by the activation boundary, even if this step fails after Airtable creation.
      try {
        await env.VAT_DB.batch([
          env.VAT_DB.prepare('UPDATE vat_stock SET car_id=? WHERE car_id=?').bind(j.id,pendingId),
          env.VAT_DB.prepare('INSERT INTO vat_audit(car_id,event,actor,payload) VALUES(?,?,?,?)').bind(j.id,'purchase_created',env.ADMIN_USER||'staff',purchaseData)
        ]);
      } catch {
        return json({error:'Vehicle created but private ledger linking failed. Do not create it again. Restore the ledger link using the recovery instructions.',id:j.id,pendingId},503);
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
      const id = path.split("/").pop();

      const body = await req.json().catch(() => ({}));
      const rawFields = body && typeof body === "object" ? (body.fields ?? body) : {};

      const fields = {};

      for (const [key, value] of Object.entries(rawFields)) {
        if (value === "" || value === null) {
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

      const accounting = await vatManaged(env,id,base,headers);
      if(accounting.blocked) return json({error:accounting.error},503);
      if(accounting.managed) {
        const allowed=new Set(['Make_Model','Registration','VIN','Price','Mileage','MOT_Date','Engine_size','Fuel_type','Transmission','Status','ETA_in_stock','Short_Description','Full_Description','V5C_number','HPI_report_number','Sort_Index','Video_URL','Photos']);
        if(Object.keys(fields).some(key=>!allowed.has(key)))return json({error:'Use the private vehicle record for accounting details; only approved advert fields can be written to Cars.'},422);
        if(!accounting.row) return json({error:'This new vehicle has no private purchase record. Restore its ledger link before updating.'},409);
        const identity = {Make_Model:'description',Registration:'registration',VIN:'vin'};
        for(const [field,key] of Object.entries(identity)) {
          if(Object.prototype.hasOwnProperty.call(fields,field) && String(fields[field]||'').trim() !== String(accounting.row.data[key]||'').trim()) return json({error:'Edit this vehicle identity in Accounts so its private stock-book record stays consistent.'},409);
        }
        if(Object.prototype.hasOwnProperty.call(fields,'Status')) {
          const status = String(fields.Status || '');
          if(status==='Sold' && !accounting.row.completed_at) return json({error:'Use Accounts → Check records & mark sold. Required stock-book details must be recorded first.'},409);
          if(accounting.row.completed_at && status!=='Sold') return json({error:'This sale has an issued accounting record and cannot be reopened through a status change.'},409);
          if(status==='Reserved' && !(vatMoney(accounting.row.data.depositAmount)>0 && accounting.row.data.depositDate && accounting.row.data.depositReference)) return json({error:'Save the deposit date, amount and reference in Accounts before reserving.'},409);
        }
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


// Private accounting module. Standalone: appended to the Cloudflare Worker.
const VAT_KEYS = ['purchaseDate','supplierName','supplierAddress','purchaseInvoice','purchaseEvidence','supplierType','purchaseClass','purchasePrice','purchaseVat','supplierStockNo','registration','vin','unregistered','description','depositDate','depositAmount','depositReference','buyerName','buyerAddress','saleDate','salePrice','salesInvoice','vatRecorded','vatAdjustmentReason','saleEvidence','eligibilityConfirmed','purchaseInvoiceChecked','saleConfirmed'];
const vatText = v => typeof v === 'string' ? v.trim() : '';
function vatMoney(value) {
  const s = String(value ?? '').trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, fraction = ''] = s.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
function vatDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
/**
 * Validated stock-book data: text fields, explicit checkbox booleans, and
 * optional approved public advert fields. Kept distinct for editor type checking.
 * @typedef {Object} P55VatData
 * @property {string} purchaseDate
 * @property {string} supplierName
 * @property {string} supplierAddress
 * @property {string} purchaseInvoice
 * @property {string} purchaseEvidence
 * @property {string} supplierType
 * @property {string} purchaseClass
 * @property {string} purchasePrice
 * @property {string} purchaseVat
 * @property {string} supplierStockNo
 * @property {string} registration
 * @property {string} vin
 * @property {boolean} unregistered
 * @property {string} description
 * @property {string} depositDate
 * @property {string} depositAmount
 * @property {string} depositReference
 * @property {string} buyerName
 * @property {string} buyerAddress
 * @property {string} saleDate
 * @property {string} salePrice
 * @property {string} salesInvoice
 * @property {string} vatRecorded
 * @property {string} vatAdjustmentReason
 * @property {string} saleEvidence
 * @property {boolean} eligibilityConfirmed
 * @property {boolean} purchaseInvoiceChecked
 * @property {boolean} saleConfirmed
 * @property {Record<string, string | number | null>} [advert]
 */
function vatValidate(input, sale = false, today = new Date().toISOString().slice(0,10)) {
  /** @type {P55VatData} */
  const d = {
    purchaseDate: vatText(input.purchaseDate),
    supplierName: vatText(input.supplierName),
    supplierAddress: vatText(input.supplierAddress),
    purchaseInvoice: vatText(input.purchaseInvoice),
    purchaseEvidence: vatText(input.purchaseEvidence),
    supplierType: vatText(input.supplierType),
    purchaseClass: vatText(input.purchaseClass),
    purchasePrice: vatText(input.purchasePrice),
    purchaseVat: vatText(input.purchaseVat),
    supplierStockNo: vatText(input.supplierStockNo),
    registration: vatText(input.registration),
    vin: vatText(input.vin),
    unregistered: input.unregistered === true,
    description: vatText(input.description),
    depositDate: vatText(input.depositDate),
    depositAmount: vatText(input.depositAmount),
    depositReference: vatText(input.depositReference),
    buyerName: vatText(input.buyerName),
    buyerAddress: vatText(input.buyerAddress),
    saleDate: vatText(input.saleDate),
    salePrice: vatText(input.salePrice),
    salesInvoice: vatText(input.salesInvoice),
    vatRecorded: vatText(input.vatRecorded),
    vatAdjustmentReason: vatText(input.vatAdjustmentReason),
    saleEvidence: vatText(input.saleEvidence),
    eligibilityConfirmed: input.eligibilityConfirmed === true,
    purchaseInvoiceChecked: input.purchaseInvoiceChecked === true,
    saleConfirmed: input.saleConfirmed === true,
  };
  d.vin=d.vin.toUpperCase().replace(/\s+/g,'');d.registration=d.registration.toUpperCase().replace(/\s+/g,' ');
  const errors = {};
  const required = ['purchaseDate','supplierName','purchaseInvoice','purchaseEvidence','supplierType','purchaseClass','purchasePrice','description'];
  if (sale) required.push('buyerName','saleDate','salePrice','salesInvoice','saleEvidence');
  for (const k of required) if (!d[k]) errors[k] = 'Required';
  for (const [k,v] of Object.entries(d)) if (typeof v === 'string' && v.length > 4000) errors[k] = 'Maximum 4,000 characters';
  if (!d.registration && !d.unregistered) errors.registration = 'Record the registration, or confirm the vehicle is unregistered';
  if (!d.registration && !d.vin) errors.registration = 'Enter the registration, or VIN if unregistered';
  if (!['margin','qualifying','unconfirmed'].includes(d.purchaseClass)) errors.purchaseClass = 'Select a purchase classification';
  if (!['vat_registered','private','other'].includes(d.supplierType)) errors.supplierType = 'Select supplier type';
  for (const k of ['purchaseDate',...(sale ? ['saleDate'] : []),...(d.depositDate ? ['depositDate'] : [])]) {
    if (!vatDate(d[k]) || d[k] > today) errors[k] = 'Enter a valid date, no later than today';
  }
  for (const k of ['purchasePrice',...(sale ? ['salePrice'] : []),...(d.purchaseVat ? ['purchaseVat'] : []),...(d.depositAmount ? ['depositAmount'] : [])]) {
    if (vatMoney(d[k]) === null) errors[k] = 'Use pounds and pence, for example 6750.00';
  }
  if (!d.purchaseInvoiceChecked) errors.purchaseInvoiceChecked = 'Confirm the purchase invoice and evidence have been checked';
  if (d.purchaseClass === 'margin') {
    if (!d.eligibilityConfirmed) errors.eligibilityConfirmed = 'Confirm the purchase is eligible for the Margin Scheme';
    if (vatMoney(d.purchaseVat || '0') !== 0) errors.purchaseVat = 'VAT charged separately is incompatible with the Margin Scheme';
    if (d.supplierType === 'vat_registered' && !d.supplierStockNo) errors.supplierStockNo = 'Record the supplier stock-book number from the invoice';
  }
  if (d.purchaseClass === 'qualifying' && vatMoney(d.purchaseVat) === null) errors.purchaseVat = 'Enter the separately invoiced purchase VAT';
  if (vatMoney(d.purchaseVat || '0') > vatMoney(d.purchasePrice)) errors.purchaseVat = 'VAT cannot exceed the gross purchase consideration';
  if (d.depositAmount && vatMoney(d.depositAmount) > 0 && (!d.depositDate || !d.depositReference)) errors.depositReference = 'Record the deposit date and payment reference';
  if (sale) {
    if (d.purchaseClass === 'unconfirmed') errors.purchaseClass = 'Resolve VAT treatment before completing the sale';
    if (vatDate(d.saleDate) && d.saleDate < d.purchaseDate) errors.saleDate = 'Sale cannot precede purchase';
    if (vatDate(d.saleDate) && d.saleDate < '2026-11-01') errors.saleDate = 'This workflow is for sales after VAT registration on 1 November 2026';
    if (!d.saleConfirmed) errors.saleConfirmed = 'Confirm the completed sale and that the Zoho invoice and supporting records have been checked';
    if (vatMoney(d.depositAmount || '0') > vatMoney(d.salePrice)) errors.depositAmount = 'Deposit cannot exceed sale consideration';
  }
  if(sale && d.vatRecorded && vatMoney(d.purchasePrice)!==null && vatMoney(d.salePrice)!==null) {
    const base=Math.round((d.purchaseClass==='margin'?Math.max(0,vatMoney(d.salePrice)-vatMoney(d.purchasePrice)):vatMoney(d.salePrice))/6),recorded=vatMoney(d.vatRecorded);
    if(recorded===null||Math.abs(recorded-base)>1||d.purchaseClass==='margin'&&vatMoney(d.salePrice)<=vatMoney(d.purchasePrice)&&recorded!==0)errors.vatRecorded='Only a 1p rounding difference is allowed; review larger discrepancies';
    else if(recorded!==base&&!d.vatAdjustmentReason)errors.vatAdjustmentReason='Record why the Zoho amount differs';
  }
  return { data:d, errors };
}
function vatCalculation(d) {
  const purchase = vatMoney(d.purchasePrice), sale = vatMoney(d.salePrice);
  if (purchase === null || sale === null) throw new Error('Invalid consideration');
  const margin = sale - purchase;
  const computedVat=Math.round((d.purchaseClass==='margin'?Math.max(0,margin):sale)/6);
  const recorded=d.vatRecorded?vatMoney(d.vatRecorded):computedVat;
  if(recorded===null || Math.abs(recorded-computedVat)>1 || recorded!==computedVat&&!d.vatAdjustmentReason || d.purchaseClass==='margin'&&margin<=0&&recorded!==0)throw new Error('Invalid VAT adjustment');
  return { purchase, sale, margin, computedVat, adjustment:recorded-computedVat, vat:recorded, treatment: d.purchaseClass === 'margin' ? 'Margin Scheme — second-hand goods' : 'Normal VAT — standard rate 20%', rate:20, version:1 };
}
function vatRow(row) { return row ? {...row, data:JSON.parse(row.data), snapshot:row.snapshot ? JSON.parse(row.snapshot) : null} : null; }
async function vatGet(db,id) { return vatRow(await db.prepare('SELECT * FROM vat_stock WHERE car_id = ?').bind(id).first()); }
function vatJson(d,status=200) { return new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}); }
async function vatManaged(env,id,base,headers) {
  if (!env.VAT_DB) return {blocked:true,error:'Private stock book is not configured. Bind VAT_DB before using this release.'};
  const row=await vatGet(env.VAT_DB,id);
  if (row) return {row,managed:true};
  const r=await fetch(`${base}/${encodeURIComponent(id)}`,{headers});
  if (!r.ok) return {blocked:true,error:'Unable to check whether this vehicle is historical'};
  const car=await r.json();
  const boundary=await env.VAT_DB.prepare("SELECT value FROM vat_config WHERE key='activated_at'").first();
  if (!boundary || !car.createdTime) return {blocked:true,error:'Stock-book activation boundary is unavailable'};
  return {managed:Date.parse(car.createdTime)>=Date.parse(boundary.value),car};
}
async function vatSync(env,row,base,headers,kv) {
  const r=await fetch(`${base}/${encodeURIComponent(row.car_id)}`,{method:'PATCH',headers,body:JSON.stringify({fields:{...(row.data.advert||{}),Status:'Sold'}})});
  if (!r.ok) return false;
  // Reuse the original completion time on every retry; do not extend sold visibility.
  if (kv) {
    await kv.put(`soldAt:${row.car_id}`,String(Date.parse(row.completed_at)));
    await kv.put('stock:version',String(Date.now()));
  }
  await env.VAT_DB.prepare('UPDATE vat_stock SET synced=1, advert_pending=0 WHERE car_id=? AND completed_at IS NOT NULL').bind(row.car_id).run();
  return true;
}
async function vatApi(req,env,base,headers,actor,kv) {
  const url=new URL(req.url), path=url.pathname, db=env.VAT_DB;
  if (!db) return vatJson({error:'Bind a private D1 database as VAT_DB and run schema.sql before using the stock book.'},503);
  if (req.method !== 'GET' && req.headers.get('Origin') && req.headers.get('Origin') !== url.origin) return vatJson({error:'Cross-origin accounting requests are not allowed'},403);
  try {
    if (path==='/api/vat/stock' && req.method==='GET') {
      const all=await db.prepare('SELECT * FROM vat_stock WHERE car_id NOT LIKE \'pending:%\' ORDER BY stock_no DESC').all();
      return vatJson({records:(all.results||[]).map(vatRow)});
    }
    const m=path.match(/^\/api\/vat\/car\/([A-Za-z0-9]+)(?:\/(complete|sync))?$/);
    if (!m) return vatJson({error:'Not found'},404);
    const id=m[1], action=m[2]; let row=await vatGet(db,id);
    if (req.method==='GET' && !action) {
      const check=await vatManaged(env,id,base,headers);
      if(check.blocked)return vatJson({error:check.error},503);
      let vehicle=check.car?.fields;
      if(!vehicle) {const r=await fetch(`${base}/${encodeURIComponent(id)}`,{headers});if(!r.ok)return vatJson({error:'Unable to load current vehicle details'},503);vehicle=(await r.json()).fields;}
      return vatJson({record:row,legacy:!check.managed,vehicle});
    }
    if(req.method!=='POST')return vatJson({error:'Method not allowed'},405);
    const body=await req.json();
    if(!row)return vatJson({error:'No managed purchase record. Historical vehicles remain outside this workflow.'},409);
    if(action==='sync') {
      if(!row.completed_at)return vatJson({error:'Sale is not complete'},409);
      const synced=await vatSync(env,row,base,headers,kv);return vatJson({ok:true,synced,record:await vatGet(db,id)});
    }
    if(row.completed_at) {
      if(action==='complete')return vatJson({ok:true,record:row,alreadyCompleted:true});
      return vatJson({error:'Issued stock-book entries are locked. Corrections require a separate documented accounting adjustment.'},409);
    }
    if(body.revision!==row.revision)return vatJson({error:'This record changed in another window. Reopen it before saving.'},409);
    const check=vatValidate(body.data||{},action==='complete');
    if(Object.keys(check.errors).length)return vatJson({error:'Complete the highlighted accounting details',errors:check.errors},422);
    const data=check.data;
    for(const key of ['description','registration','vin']) {
      if(data[key]!==String(row.data[key]||'')) return vatJson({error:'Vehicle identity is fixed to its purchase record in this version. Registration changes need a documented amendment before completion.'},409);
    }
    const advert = body.vehicle ? vatAdvertValidate(body.vehicle,data) : {fields:row.data.advert||{},errors:{}};
    if(Object.keys(advert.errors).length)return vatJson({error:'Check the vehicle/advert details',errors:advert.errors},422);
    data.advert=advert.fields;
    if(advert.fields.Status==='Reserved' && !(vatMoney(data.depositAmount)>0 && data.depositDate && data.depositReference)) return vatJson({error:'Record the deposit before reserving',errors:{depositAmount:'Enter the deposit, date and reference'}},422);
    const now=new Date().toISOString();
    let snapshot=null;
    if(action==='complete')snapshot={stockNo:row.stock_no,salesInvoice:data.salesInvoice,data,calculation:vatCalculation(data),recordedAt:now,actor};
    const result=await db.batch([
      db.prepare('UPDATE vat_stock SET data=?, revision=revision+1, completed_at=?, snapshot=?, advert_pending=? WHERE car_id=? AND revision=? AND completed_at IS NULL').bind(JSON.stringify(data),snapshot?now:null,snapshot?JSON.stringify(snapshot):null,body.vehicle?1:0,id,body.revision),
      db.prepare('INSERT INTO vat_audit(car_id,event,actor,payload) SELECT ?,?,?,? WHERE changes()=1').bind(id,snapshot?'sale_completed':'purchase_updated',actor,JSON.stringify({data,snapshot,revision:body.revision+1})),
    ]);
    if(result[0].meta.changes!==1)return vatJson({error:'Record changed while saving; reopen before continuing'},409);
    row=await vatGet(db,id);
    let synced=false,vehicleSynced=true;
    if(snapshot) { try {synced=await vatSync(env,row,base,headers,kv);}catch{} }
    else if(body.vehicle) {
      try {
        const r=await fetch(`${base}/${encodeURIComponent(id)}`,{method:'PATCH',headers,body:JSON.stringify({fields:advert.fields})});
        vehicleSynced=r.ok;
        if(r.ok)await db.prepare('UPDATE vat_stock SET advert_pending=0 WHERE car_id=? AND revision=?').bind(id,body.revision+1).run();
        if(r.ok && kv)await kv.put('stock:version',String(Date.now()));
      }catch{vehicleSynced=false;}
    }
    return vatJson({ok:true,record:await vatGet(db,id),synced,vehicleSynced});
  }catch(e){ console.error('Private stock-book operation failed',e?.name);return vatJson({error:'Stock-book operation failed. No success is assumed; reload the record before retrying.'},503); }
}

// Whitelist public advert fields so private financial data cannot enter Cars.
function vatAdvertValidate(raw,d) {
 const fields={Make_Model:d.description,Registration:d.registration||null,VIN:d.vin||null},errors={};
 const strings=['V5C_number','HPI_report_number','Short_Description','Full_Description','Fuel_type','Transmission'];
 for(const k of strings)if(Object.hasOwn(raw,k)){const v=vatText(raw[k]);if(v.length>40000)errors['advert_'+k]='Maximum 40,000 characters';fields[k]=v||null;}
 for(const k of ['Price','Mileage','Engine_size'])if(Object.hasOwn(raw,k)){
  const v=String(raw[k]??'').trim();
  if(!v){fields[k]=null;continue;}
  if(!/^\d{1,9}(\.\d{1,2})?$/.test(v)||(k==='Mileage'&&!/^\d{1,9}$/.test(v)))errors['advert_'+k]='Enter a valid non-negative number';
  else fields[k]=Number(v);
 }
 for(const k of ['MOT_Date','ETA_in_stock'])if(Object.hasOwn(raw,k)){const v=vatText(raw[k]);if(v&&!vatDate(v))errors['advert_'+k]='Enter a valid date';fields[k]=v||null;}
 if(Object.hasOwn(raw,'Status')){
  const status=vatText(raw.Status);
  if(!['Available','In_prep','Arriving_soon','Reserved','Inactive','Hidden','Sold'].includes(status))errors.advert_Status='Select a valid website status';
  else fields.Status=status;
 }
 if(fields.Status==='Sold')errors.advert_Status='Use the stock-book completion action to mark Sold';
 return {fields,errors};
}
