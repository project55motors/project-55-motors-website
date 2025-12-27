export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    const cookie = req.headers.get("Cookie") || "";
    const loggedIn = cookie.includes("admin=1");

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
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            // Secure is important on your live HTTPS site
            "Set-Cookie": "admin=1; Path=/; HttpOnly; Secure; SameSite=Lax"
          }
        });
      }

      return json({ ok: false }, 401);
    }

    if (path === "/api/logout") {
      return new Response(null, {
        headers: {
          "Set-Cookie": "admin=; Path=/; Max-Age=0; Secure; SameSite=Lax"
        }
      });
    }

    if (path === "/api/login-check") {
      return json({ loggedIn });
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

    /* ---------- AIRTABLE ---------- */

    const base = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_NAME}`;
    const headers = {
      Authorization: `Bearer ${env.AIRTABLE_PAT}`,
      "Content-Type": "application/json"
    };

    if (path === "/api/all") {
      const r = await fetch(base, { headers });
      const j = await r.json();
      return json((j.records || []).map(r => ({ id: r.id, ...r.fields })));
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
