# victorlobe.me Analytics Worker

Eigenstaendige, datensparsame Besuchsmessung fuer `https://victorlobe.me/`.

## Einrichtung

1. D1 Datenbank anlegen:

```bash
npx wrangler d1 create victorlobe-home-analytics
```

2. Die ausgegebene `database_id` in `workers/analytics/wrangler.toml` eintragen.

3. Migration ausfuehren:

```bash
cd workers/analytics
npx wrangler d1 migrations apply victorlobe-home-analytics --remote
```

4. Admin Token setzen:

```bash
npx wrangler secret put HOME_ANALYTICS_ADMIN_TOKEN
```

5. Worker deployen:

```bash
npx wrangler deploy
```

## Daten abrufen

```bash
curl -H "Authorization: Bearer <TOKEN>" "https://victorlobe.me/api/track?limit=100"
```

Optional nach Land:

```bash
curl -H "Authorization: Bearer <TOKEN>" "https://victorlobe.me/api/track?country=DE&limit=100"
```
