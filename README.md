# Roster

Your team. Free agency.

Roster is a static site (plain HTML, CSS, and JavaScript, no build step) that lives at **https://lapistudios.com/roster/**.

## Pages

| Path | What it is |
| --- | --- |
| `index.html` | Home screen with the buttons and the **Sync** button |
| `team/` | Your team |
| `free-agency/` | Free agency |
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

## Editing safely

Nothing you push to `main` is checked before it goes live, so make changes on a branch first.

1. **Create a branch** from `main`, for example `edit/free-agency-names`.
2. **Make the change** on that branch and commit it.
3. **Check it locally.** Open the edited `.html` file in a browser. Pages that load data (like `free-agency/`) need `free-agency/data/players.js` to be valid JavaScript, so look for errors in the browser console (F12).
4. **Open a pull request** into `main` and review the diff. Make sure only the files you meant to change are in it.
5. **Merge the pull request.** The change is on `main` but not live yet.
6. **Press Sync** on `lapistudios.com/roster/`. The page reloads with the new version.

### Checking the live site

After Sync:
- Open the home page, then each page it links to (`team/`, `free-agency/`, `league/`, `matchup/`, `changes/`). Each should load with no blank areas.
- Press **F12** and check the Console tab for red errors.
- Hard-refresh with **Ctrl+F5** if you still see the old version. The site is set to not cache, but your browser may have kept an older copy.
- If the page doesn't change, Sync may have failed. The button shows "Sync failed." when that happens, and the old copy stays live.

### Things to know

- **Deleting a file on `main` does not delete it on the live site.** Sync copies files over the old ones but never removes them. To take a page down, replace it with a short message or remove the link to it, then tell whoever runs the server to clear the old file.
- **Sync only copies these paths:** `index.html`, `changes/`, `free-agency/`, `league/`, `matchup/`, `team/`, `login/`, and `assets/`. A new top-level folder will not go live until it is added to the sync script on the server.
- **Don't edit `changes/data/changes.json` by hand.** The GitHub Action rewrites it every hour and after each push to `main`.
- **Never commit secrets.** This repo is public, so anything committed is visible to everyone, including in its history. That includes API keys, tokens, passwords, and personal data.
- **To undo a change,** open a pull request that reverts the commit on `main`, merge it, and press **Sync**.
