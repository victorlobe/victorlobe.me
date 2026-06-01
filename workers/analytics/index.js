const DEFAULT_ALLOWED_ORIGINS = "https://victorlobe.me,https://www.victorlobe.me";
const DEFAULT_MAX_LIMIT = 500;
const MAX_TEXT_LENGTH = 500;

function getAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = getAllowedOrigins(env);
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, follow, noarchive",
    "Vary": "Origin"
  };
}

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function trimText(value, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function boolToInteger(value) {
  return value === true ? 1 : 0;
}

function parsePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function isSameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isAuthorized(request, env) {
  const expected = env.HOME_ANALYTICS_ADMIN_TOKEN || "";
  const authorization = request.headers.get("Authorization") || "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  return isSameSecret(provided, expected);
}

function getViewportNumber(payload, key) {
  const value = payload?.viewport?.[key];
  return Number.isFinite(value) ? Math.round(value) : null;
}

function getClientContext(payload) {
  const utm = payload?.utm || {};

  return {
    language: trimText(payload?.language, 80),
    languages: trimText(
      Array.isArray(payload?.languages) ? payload.languages.join(",") : payload?.languages,
      300
    ),
    browser: trimText(payload?.browser, 80),
    browserMajor: trimText(payload?.browser_major, 20),
    os: trimText(payload?.os, 80),
    deviceType: trimText(payload?.device_type, 40),
    surface: trimText(payload?.surface || "home", 40),
    referrerDomain: trimText(payload?.referrer_domain, 255),
    browserTimezone: trimText(payload?.browser_timezone, 120),
    utmSource: trimText(utm.source || payload?.utm_source, 120),
    utmMedium: trimText(utm.medium || payload?.utm_medium, 120),
    utmCampaign: trimText(utm.campaign || payload?.utm_campaign, 180),
    viewportWidth: getViewportNumber(payload, "width"),
    viewportHeight: getViewportNumber(payload, "height")
  };
}

function getVisitorGeo(request) {
  const cf = request.cf || {};

  return {
    country: trimText(cf.country || "", 16),
    region: trimText(cf.region || "", 120),
    city: trimText(cf.city || "", 120),
    timezone: trimText(cf.timezone || "", 120),
    latitude: trimText(cf.latitude || "", 32),
    longitude: trimText(cf.longitude || "", 32),
    colo: trimText(cf.colo || "", 16)
  };
}

async function recordPageView(request, env, payload) {
  if (!env.HOME_ANALYTICS_DB) {
    return json(request, env, { success: false, error: "Missing HOME_ANALYTICS_DB binding" }, 500);
  }

  const doNotTrack = request.headers.get("DNT") === "1" || request.headers.get("Sec-GPC") === "1";
  if (doNotTrack) {
    return json(request, env, { success: true, tracked: false }, 200);
  }

  const geo = getVisitorGeo(request);
  const client = getClientContext(payload);
  const now = new Date().toISOString();

  await env.HOME_ANALYTICS_DB.prepare(`
    INSERT INTO page_views (
      created_at,
      path,
      title,
      referrer,
      referrer_domain,
      country,
      region,
      city,
      timezone,
      latitude,
      longitude,
      colo,
      language,
      languages,
      browser,
      browser_major,
      os,
      device_type,
      surface,
      browser_timezone,
      utm_source,
      utm_medium,
      utm_campaign,
      viewport_width,
      viewport_height
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      now,
      trimText(payload?.path, 500),
      trimText(payload?.title, 200),
      trimText(payload?.referrer, 1000),
      client.referrerDomain,
      geo.country,
      geo.region,
      geo.city,
      geo.timezone,
      geo.latitude,
      geo.longitude,
      geo.colo,
      client.language,
      client.languages,
      client.browser,
      client.browserMajor,
      client.os,
      client.deviceType,
      client.surface,
      client.browserTimezone,
      client.utmSource,
      client.utmMedium,
      client.utmCampaign,
      client.viewportWidth,
      client.viewportHeight
    )
    .run();

  return json(request, env, { success: true, tracked: true }, 200);
}

async function listPageViews(request, env) {
  if (!env.HOME_ANALYTICS_DB) {
    return json(request, env, { success: false, error: "Missing HOME_ANALYTICS_DB binding" }, 500);
  }

  if (!isAuthorized(request, env)) {
    return json(request, env, { success: false, error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 100, DEFAULT_MAX_LIMIT);
  const country = trimText(url.searchParams.get("country") || "", 16).toUpperCase();
  const hasCountryFilter = country.length > 0;

  const statement = hasCountryFilter
    ? env.HOME_ANALYTICS_DB.prepare(`
        SELECT *
        FROM page_views
        WHERE country = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(country, limit)
    : env.HOME_ANALYTICS_DB.prepare(`
        SELECT *
        FROM page_views
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(limit);

  const result = await statement.all();

  return json(request, env, {
    success: true,
    count: result.results.length,
    pageViews: result.results
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/track") {
      return json(request, env, { success: false, error: "Not found" }, 404);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env)
      });
    }

    if (request.method === "POST") {
      let payload;
      try {
        payload = await request.json();
      } catch (error) {
        return json(request, env, { success: false, error: "Invalid JSON" }, 400);
      }

      return recordPageView(request, env, payload);
    }

    if (request.method === "GET") {
      return listPageViews(request, env);
    }

    return json(request, env, { success: false, error: "Method not allowed" }, 405);
  }
};
