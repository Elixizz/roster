# Roster

Your team. Free agency.

Roster is a static site (plain HTML, CSS, and JavaScript, no build step) that lives at **https://lapistudios.com/roster/**.

## Pages

| Path | What it is |
| --- | --- |
| `index.html` | Home screen with the buttons and the **Sync** button |
| `team/` | Your team |
| `free-agency/` | Free agency |
| `picks/` | Draft picks (`picks/data/league.js` holds the data) |
| `league/` | League view |
| `matchup/` | Matchup view |
| `changes/` | Repo changes feed (commits from the repo) |

## How the site gets to lapistudios.com

1. You push to the `main` branch of this repo.
2. Lapis Studios' server copies the site from `main` into `/var/www/lapistudios/roster/`. The copy runs:
   - automatically, if the scheduled job is installed on the server, and
   - whenever someone presses **Sync** on the page.
3. The page you see at `lapistudios.com/roster/` is that copy. It shows whatever was on `main` at the last sync.

The server side (sync script, sync service, and nginx route) is not in this repo. It lives on the Lapis Studios server.

## The Sync button

The **Sync** button in the top right of the home page:

- sends a `POST` to `api/sync` (which the server routes to `/roster/api/sync`),
- makes the server run the sync, and
- reloads the page when the sync finishes.

Rules:
- Only `POST` is accepted. Other request methods are refused.
- The server allows one sync per 60 seconds. Pressing it again sooner shows "Synced recently. Try again in a minute."
- A sync that is already running blocks a second one from starting.
- The button has no login. It is rate-limited instead, and a sync only re-copies this public repo, so the worst a spammer can do is cause a short wait.

## The changes feed

`scripts/build-changes.mjs` reads the recent commits from GitHub and writes them to `changes/data/changes.json`. A GitHub Action (`.github/workflows/update-changes.yml`) runs it hourly and after pushes to `main`, then commits the updated file.

The `changes/` page reads that feed from `changes/data/changes.json`, which the sync copies along with the rest of the site.

## Local development

Open `index.html` in a browser to see the static pages. The **Sync** button only works on the live site, because the server endpoint is not running on your PC.

Commits to `main` go live after the next sync. To see a change right away, press **Sync** on the live page.
