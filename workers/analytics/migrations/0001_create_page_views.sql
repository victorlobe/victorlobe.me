CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  path TEXT,
  title TEXT,
  referrer TEXT,
  referrer_domain TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  timezone TEXT,
  latitude TEXT,
  longitude TEXT,
  colo TEXT,
  language TEXT,
  languages TEXT,
  browser TEXT,
  browser_major TEXT,
  os TEXT,
  device_type TEXT,
  surface TEXT,
  browser_timezone TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_country_created_at ON page_views (country, created_at DESC);
