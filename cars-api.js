// PROJECT 55 MOTORS – PUBLIC STOCK API (CACHED + KV ANALYTICS)

// If you want to be strict, keep an allowlist of your real site origins:
const ALLOWED_ORIGINS = new Set([
  "https://project55motors.co.uk",
  "https://www.project55motors.co.uk"
]);

function buildCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  const reqHeaders = request.headers.get("Access-Control-Request-Headers") || "Content-Type";

  // Default for non-browser requests (no Origin) or unknown origins:
  // We keep it permissive for a public API. If you want strict lock-down,
  // change "*" to only your apex site.
  let allowOrigin = "*";
  let vary = "";

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    allowOrigin = origin;
    vary = "Origin";
  }

  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400"
  };

  if (vary) headers["Vary"] = vary;
  return headers;
}

function jsonResponse(request, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(request),
      ...extraHeaders
    }
  });
}

function normalisePath(pathname) {
  // Supports both workers.dev ("/track") and routed ("/cars-api/track")
  if (pathname === "/cars-api") return "/";
  if (pathname.startsWith("/cars-api/")) return pathname.slice("/cars-api".length);
  return pathname;
}

function isoDayUTC(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function safeKey(v, maxLen = 160) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function hostnameFromUrl(u) {
  if (!u) return "";
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function normaliseReferrerLabel(referrerUrl) {
  const host = hostnameFromUrl(referrerUrl);
  if (!host) return "direct";

  if (host.includes("google.")) return "google";
  if (host.includes("facebook.") || host === "fb.com" || host.endsWith(".fb.com")) return "facebook";
  if (host.includes("instagram.")) return "instagram";
  if (host.includes("bing.")) return "bing";
  if (host.includes("duckduckgo.")) return "duckduckgo";

  return host;
}

function getUtmParam(pageUrl, key) {
  try {
    const u = new URL(pageUrl);
    return safeKey(u.searchParams.get(key) || "", 80) || null;
  } catch {
    return null;
  }
}

async function incrementDailyAggregate(kv, { path, country, referrer, utmSource }) {
  const day = isoDayUTC();
  const key = `a:day:${day}`;

  const current = (await kv.get(key, { type: "json" })) || {
    day,
    total: 0,
    byPath: {},
    byCountry: {},
    byReferrer: {},
    byUtmSource: {}
  };

  current.byPath = current.byPath || {};
  current.byCountry = current.byCountry || {};
  current.byReferrer = current.byReferrer || {};
  current.byUtmSource = current.byUtmSource || {};
  current.total = Number(current.total || 0);

  current.total += 1;

  const p = safeKey(path || "/", 200) || "/";
  current.byPath[p] = (current.byPath[p] || 0) + 1;

  const c = safeKey(country || "--", 8) || "--";
  current.byCountry[c] = (current.byCountry[c] || 0) + 1;

  const r = safeKey(referrer || "direct", 120) || "direct";
  current.byReferrer[r] = (current.byReferrer[r] || 0) + 1;

  const s = utmSource ? safeKey(utmSource, 80) : null;
  if (s) current.byUtmSource[s] = (current.byUtmSource[s] || 0) + 1;

  await kv.put(key, JSON.stringify(current));
}


const SETTINGS_SOLD_KEY = "settings:sold";
const STOCK_VERSION_KEY = "stock:version";
const SOLD_AT_PREFIX = "soldAt:";

async function getStockVersion(kv) {
  if (!kv) return 1;
  const raw = await kv.get(STOCK_VERSION_KEY).catch(() => null);
  const n = Number(raw || "1");
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : 1;
}

async function getSoldSettings(kv) {
  const def = { showSold: true, keepDays: 30, updatedAt: null };
  if (!kv) return def;

  const raw = await kv.get(SETTINGS_SOLD_KEY, { type: "json" }).catch(() => null);
  if (!raw || typeof raw !== "object") return def;

  const keepDays = Number(raw.keepDays);
  return {
    showSold: typeof raw.showSold === "boolean" ? raw.showSold : def.showSold,
    keepDays: Number.isFinite(keepDays) ? Math.min(Math.max(Math.round(keepDays), 0), 365) : def.keepDays,
    updatedAt: raw.updatedAt || null
  };
}

async function attachSoldMeta(records, kv) {
  if (!kv || !Array.isArray(records) || records.length === 0) return;

  await Promise.all(
    records.map(async (r) => {
      try {
        const status = String(r?.fields?.Status || "").trim();
        if (status !== "Sold") return;

        const key = `${SOLD_AT_PREFIX}${r.id}`;
        const raw = await kv.get(key).catch(() => null);
        const ts = Number(raw || 0);

        if (Number.isFinite(ts) && ts > 0) {
          r.__p55 = { soldAtTs: ts, soldAt: new Date(ts).toISOString() };
        } else {
          r.__p55 = { soldAtTs: 0, soldAt: null };
        }
      } catch {
        // ignore
      }
    })
  );
}


async function fetchAllAirtableRecords({ baseId, tableName, pat }) {
  let records = [];
  let offset = null;

  // Table name can contain spaces; table ID is also fine.
  const tablePart = encodeURIComponent(tableName);

  do {
    const u = new URL(`https://api.airtable.com/v0/${baseId}/${tablePart}`);
    u.searchParams.set("sort[0][field]", "Sort_Index");
    u.searchParams.set("sort[0][direction]", "asc");
    u.searchParams.set("pageSize", "100");
    if (offset) u.searchParams.set("offset", offset);

    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${pat}` }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Airtable error ${res.status}: ${text}`);
    }

    const data = await res.json();
    records = records.concat(data.records || []);
    offset = data.offset || null;
  } while (offset);

  return records;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = normalisePath(url.pathname);

    const AIRTABLE_PAT = env.AIRTABLE_PAT;
    const BASE = env.AIRTABLE_BASE_ID;
    const TABLE = env.AIRTABLE_TABLE_NAME;

    const TRAFFIC_KV = env.TRAFFIC_KV;

    // 1) CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request) });
    }

    // 2) PUBLIC META ENDPOINTS (version + settings)
if (request.method === "GET" && path === "/version") {
  const version = await getStockVersion(TRAFFIC_KV);
  return jsonResponse(request, { ok: true, version }, 200, { "Cache-Control": "no-store" });
}

if (request.method === "GET" && path === "/settings") {
  const sold = await getSoldSettings(TRAFFIC_KV);
  const version = await getStockVersion(TRAFFIC_KV);
  return jsonResponse(request, { ok: true, version, sold }, 200, { "Cache-Control": "no-store" });
}

// 2) TRACKING ENDPOINT
    if (path === "/track" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));

        const pageUrl = request.headers.get("Referer") || "";
        let pagePath = "/";

        if (pageUrl) {
          try {
            const u = new URL(pageUrl);
            pagePath = `${u.pathname}${u.search}` || "/";
          } catch {
            pagePath = "/";
          }
        }

        const sourceRef = typeof body.referrer === "string" ? body.referrer : "";
        const referrerLabel = normaliseReferrerLabel(sourceRef);

        const utmSource = pageUrl ? getUtmParam(pageUrl, "utm_source") : null;

        const country = request.cf?.country || "--";

        if (TRAFFIC_KV) {
          ctx.waitUntil(
            incrementDailyAggregate(TRAFFIC_KV, {
              path: pagePath,
              country,
              referrer: referrerLabel,
              utmSource
            })
          );
        }
      } catch (err) {
        console.error("Track error:", err);
      }

      return jsonResponse(request, { ok: true });
    }

    // 3) PUBLIC STOCK (cached)
    if (request.method === "GET" && (path === "/" || path === "")) {
      if (url.searchParams.get("nocache") !== "1") {
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);

        const hit = await cache.match(cacheKey);
        if (hit) {
          // Re-wrap to apply correct CORS headers per-request (important when Origin varies)
          return new Response(hit.body, {
            status: hit.status,
            headers: {
              ...Object.fromEntries(hit.headers),
              ...buildCorsHeaders(request)
            }
          });
        }

        try {
          const records = await fetchAllAirtableRecords({
            baseId: BASE,
            tableName: TABLE,
            pat: AIRTABLE_PAT
          });


          await attachSoldMeta(records, TRAFFIC_KV);
          const sold = await getSoldSettings(TRAFFIC_KV);
          const version = await getStockVersion(TRAFFIC_KV);

          const resp = jsonResponse(
            request,
            { records, meta: { version, sold } },
            200,
            {
              "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
            }
          );

          ctx.waitUntil(cache.put(cacheKey, resp.clone()));
          return resp;
        } catch (err) {
          console.error("cars-api error:", err);
          return jsonResponse(request, { error: "Server error" }, 500);
        }
      }

      // nocache=1 path (forces Airtable read)
      try {
        const records = await fetchAllAirtableRecords({
          baseId: BASE,
          tableName: TABLE,
          pat: AIRTABLE_PAT
        });

        await attachSoldMeta(records, TRAFFIC_KV);
        const sold = await getSoldSettings(TRAFFIC_KV);
        const version = await getStockVersion(TRAFFIC_KV);

        return jsonResponse(request, { records, meta: { version, sold } });
      } catch (err) {
        console.error("cars-api error:", err);
        return jsonResponse(request, { error: "Server error" }, 500);
      }
    }

    return jsonResponse(request, { error: "Not found" }, 404);
  }
};
