# OPERATION LOOKSMAX

Offline-first PWA: 37 fixed daily missions, 4 trackers (water, sleep, school study, Spanish), final inspection, ranks, history, JSON export/import. All data stays in your browser (localStorage). No backend, no accounts, no paid services.

## Files
index.html · app.js · manifest.json · sw.js · icon-192.png · icon-512.png · README.md · test.js (optional logic tests: `node test.js`)

## Upload to GitHub (manual)
1. Open https://github.com/ereexpro/OPERATION-LOOKSMAX
2. Click **Add file → Upload files**, drag in all files above (test.js is optional), keep them in the repo root.
3. Click **Commit changes**.

## Activate GitHub Pages
1. Repo **Settings → Pages**.
2. Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**, **Save**.
3. After ~1 minute the site is live at https://ereexpro.github.io/OPERATION-LOOKSMAX/

## Install on Android
1. Open the URL in Chrome and wait for the page to load fully (this caches it for offline use).
2. Chrome menu (⋮) → **Install app** (or **Add to Home screen**).
3. Launch from the home screen; it runs standalone and works offline.

## Rules implemented
- Mission points = category points ÷ missions in category. DONE earns them, FAILED = 0, PENDING = 0 but stays in the possible total, N/A is excluded.
- Rank uses rolling 7-day blocks ending today; a block needs at least 5 logged days (days with at least one non-pending mission). RECRUIT until SOLDIER (latest block ≥80%), OPERATOR (2 consecutive blocks ≥85%), ELITE (4 consecutive blocks ≥90%).
- Updating the app: bump `CACHE` in sw.js so phones fetch the new files.
- Back up with DATA → EXPORT JSON; clearing browser site data erases the app's data.
