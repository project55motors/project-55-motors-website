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
        headers: { "Content-Type": "application/json" }
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

    /* ---------- AUTH ---------- */

    if (path === "/api/login" && req.method === "POST") {
      const { username, password } = await req.json();

      if (username === env.ADMIN_USER && password === env.ADMIN_PASS) {
        if (!sessionsKv) {
          // Fail closed: do not allow login without session storage.
          return json({ ok: false, error: "ADMIN_SESSIONS_KV (or TRAFFIC_KV fallback) is not bound." }, 500);
        }

        const token = newToken();
        await setSession(token, { user: username });

        const cookieVal = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;

        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Set-Cookie": cookieVal
          }
        });
      }

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
      const totals = { total: 0, byPath: {}, byCountry: {}, byReferrer: {}, byUtmSource: {} };

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
          totals.byPath[p] = (totals.byPath[p] || 0) + (n || 0);
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

    /* ---------- PATCH VEHICLE ---------- */

    if (path.startsWith("/api/update/")) {
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
