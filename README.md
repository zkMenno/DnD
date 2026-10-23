# Character sheets

One engine, two ways to run it:
- **claude.ai sheets** (Henry, AppTester-01, AppTester-02, Wick): one self-contained HTML file each → `dist/claude/`
- **Web app** (accounts, several sheets per account, party sharing): `dist/web/` served by PocketBase

## Layout
- `src/` the engine: `head.html`, `theme.css`, `app.css`, `themes.js`, `classes.js` (class/species modules: numbers, trackers, damage riders),
  and `engine/` (the main script, one file per section, joined in name order by the build; the map is in `engine/00-header.js`)
- `src/looks/` the looks players pick in ☰ → Theme (web app only), one file per look: colours, fonts, textures, words, dice (see below)
- `src/legal.html` + `src/site.json`: the web app's Privacy & terms page (operator, contact, email provider filled in from site.json)
- `packs/` per-character packs (`henry.js` is the full pirate pack; `bare.js` for everyone else)
- `data/` synced D&D Beyond data for the claude.ai sheets, and `items.json` (SRD 5.2 items for ➕ Add item, built by `tools/items.py`)
- `web/` web app pages: `index.html` (built), `index.js` (sign in, characters, add by link, verify, sharing), `sheet-boot.js` (loads a sheet; db on PocketBase), `home.css`,
  `sw.template.js` + `sw-register.js` (offline), `three.min.js` (r128) and `fonts/` (self-hosted: the app loads nothing from other sites but the characters' D&D Beyond portraits, see Privacy & terms)
- `server/` PocketBase: `pb_migrations/` (`1761000000_schema.js`: the whole schema, access rules and settings; later changes go in new files), `pb_hooks/` (security headers, D&D Beyond proxy with a 60 s cache, campaign + pack from the server, no-markup check on stored data, verify, email codes), `pocketbase-main.go` (PocketBase with JS hooks, and the sheet-link route: `/<username>/<id>` and `/<id>` get `sheet.html`; build with `go build`)
- `Dockerfile`: the app image (see Deploy)
- `tools/` `build.js`, `looks.js` (checks the looks, builds skins.css, the picker list, words and dice from them), `test.sh` (runs everything), `refresh.js` (fresh D&D Beyond data without resetting a tracker), `devserver.sh`, `apitest.py`, browser tests (`*.js`)

## Build and test
    node tools/build.js
    bash tools/test.sh                   # everything, ~10 min (or: sheets ~5 min · web ~2 min)
    bash tools/test.sh sheets            # lint + every browser test on the four claude.ai sheets
    bash tools/test.sh web               # fresh local server: rules, web e2e (incl. CSP watch), move, headers + rate limits
    node tools/refresh.js henry henry.html 170557047   # pull fresh D&D Beyond data into data/henry.json
    bash tools/devserver.sh reset        # needs the pocketbase binary at /home/claude/pbbin/pocketbase
    bash tools/devserver.sh reset fixtures   # same, but D&D Beyond answers come from tools/test/fixtures/ddb (no network)
    DDB_FIXTURES=tools/test/fixtures/ddb PB_BIN=/path/to/pocketbase bash tools/test.sh web   # what CI runs
Paths and ports are environment variables with this machine's values as defaults (PB_BIN, APP_DIR, PB_WORK, PB_PORT,
CHROMIUM, OUT, MAILSINK, MAILSINK_PORT: see the top of `tools/devserver.sh` and `tools/test.sh`). The fixtures are raw
D&D Beyond answers for the characters the tests use (170557047, 165157421, 172559988); to refresh one:
`curl -s "https://character-service.dndbeyond.com/character/v5/character/<id>?includeCustomItems=true" > tools/test/fixtures/ddb/<id>.json`.

## How to add a look (☰ → Theme)
1. Copy a file in `src/looks/` to the next number with the new key (`08-<key>.js`; the key becomes `<html data-skin>`) and
   change everything in it: label, emoji, swatch, light and dark colours, fonts, header line, texture, words, dice sets.
   The fields are explained at the top of `tools/looks.js`.
2. Draw its four floating symbols in `src/landing.html` (`<symbol id="g-<key>-0">` … `-3`) and give them slots in
   `src/bgdice.html` (`class="bd bdg bdg-<key>"`; copy another look's six).
3. New fonts: the files in `web/fonts/`, their `@font-face` in `web/fonts/fonts.css`, and the look's `fontFiles`.
4. `node tools/build.js` (or `node tools/looks.js` for just the check): the build stops and lists anything still missing
   (colour tokens, words, fonts, symbols, dice groups and sets).

## Deploy (shared server via AppInfra)
The live app runs at **dungeontracker.com** (www.dungeontracker.com and dnd.menno.vg redirect there) on the shared Hetzner server, managed by **github.com/zkMenno/AppInfra** (one Docker
Compose project `apps`, shared Caddy for HTTPS, service `dnd` behind profile `dnd`). This repo only builds the image.
- A push to `main` runs `.github/workflows/deploy.yml` (from AppInfra's `templates/app-deploy.yml`): tests (build + lint, then
  `tools/test.sh web` on a PocketBase built from `server/`, with the saved D&D Beyond answers), builds the arm64
  image `ghcr.io/zkmenno/dnd-tracker:<sha>` from `Dockerfile`, pushes it to GHCR, and runs `deploy dnd <sha>` on the server.
- The image: PocketBase + hooks + migrations + the built web app. Port 3000, `GET /health` → 200, data in the volume at
  `/pb/pb_data` (also PocketBase's nightly backups, 03:15, 7 kept), read-only filesystem except `/tmp`, `APP_URL` or `ORIGIN`.
- Settings that need the dashboard (SMTP for login codes, etc.): `https://dungeontracker.com/_/`, behind the Caddy password prompt.
- Arm: the server binary targets Armv8.2 (`GOARM64` in the Dockerfile; `--build-arg GOARM64=v8.0` for older Arm boards).
  Local build: `docker build -t dnd-tracker .` (registry mirror if rate-limited: `--build-arg REG=mirror.gcr.io/library/`).

## Data model (server)
- `users.username`: in every sheet link (`site/<username>/<D&D Beyond id>`). New accounts get `player-xxxxx`; changeable on the home page (links change with it).
- `characters`: one per account per D&D Beyond character (anyone can add any public sheet; each gets their own tracker). `handle` = the owner's username, server-set.
  `site/<D&D Beyond id>` opens (or adds) your own copy.
  `campaign` and `name` are set by the server from D&D Beyond. `verified` is set only by the verify flow.
- `play`: live tracker state; `notes`: scope `own` (character log) or `party` (campaign log, Notes → Party log sub-tab, `by` = posting character, server-set).
- Visibility: private · party (verified characters in the same campaign) · public (anyone signed in). Read-only for others.

## Moving a claude.ai sheet to the web app
On the claude.ai sheet: ☰ → Sync → 📦 Move to the web app → Copy code. In the web app, open your own copy of the same
character: ☰ → Sync → 📥 Bring over from claude.ai → paste. The tracker is replaced, the notes are added (no doubles).

## Security (what protects what)
- Access rules (migrations): trackers and notes are the owner's; sharing is read-only; nothing can be moved to another character.
- Server-set fields: name, campaign, pack, verified, party-log author. Stored data and trackers may not contain HTML.
- Content-Security-Policy from PocketBase (scripts from the app only), rate limits per IP behind the proxy, dashboard behind
  a password prompt in Caddy. `tools/test/web/limits.py` checks headers and limits.

## Licence
The code is © Menno (github.com/zkMenno) and licensed under the **GNU Affero General Public License v3.0 or later** (see `LICENSE`):
you may use, change and share it, and if you run a changed version as a website, you share its code too.

Not covered by that licence:
- the name and logo "Dungeon Tracker", and the character artwork in `web/media/` (all rights reserved);
- rules text: `data/items.json` comes from the System Reference Document 5.2 by Wizards of the Coast LLC, used under
  CC-BY-4.0. Dungeon Tracker is an unofficial fan project, not affiliated with Wizards of the Coast or D&D Beyond.
