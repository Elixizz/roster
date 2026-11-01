// Fetches recent commits for the repository and writes them to
// changes/data/changes.json so the static /changes page can display them.
//
// Usage: node scripts/build-changes.mjs
// Env:   GITHUB_REPOSITORY (owner/repo, set automatically in GitHub Actions)
//        GITHUB_TOKEN      (optional, avoids low anonymous rate limits)

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = process.env.GITHUB_REPOSITORY || "Elixizz/roster";
const token = process.env.GITHUB_TOKEN;
const PER_PAGE = 100;
const MAX_PAGES = 5; // up to 500 commits

// Commits made by this script itself are hidden from the feed.
const BOT_MESSAGE_PREFIX = "chore(changes):";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "..", "changes", "data", "changes.json");

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "roster-changes-builder",
};
if (token) headers.Authorization = `Bearer ${token}`;

async function fetchCommitPage(page) {
  const url = `https://api.github.com/repos/${repo}/commits?per_page=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, { headers });

  // An empty repository has no commits yet; GitHub answers 409 for that.
  if (res.status === 409) return { empty: true, items: [] };
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${url}: ${await res.text()}`);
  }
  return { empty: false, items: await res.json() };
}

function toEntry(c) {
  const message = c.commit.message || "";
  const [subject, ...rest] = message.split("\n");
  return {
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    title: subject.trim(),
    body: rest.join("\n").trim(),
    author: c.commit.author?.name || c.author?.login || "unknown",
    authorUrl: c.author?.html_url || null,
    date: c.commit.author?.date || c.commit.committer?.date || null,
    url: c.html_url,
  };
}

async function main() {
  const commits = [];
  let emptyRepo = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { empty, items } = await fetchCommitPage(page);
    if (empty) {
      emptyRepo = true;
      break;
    }
    for (const c of items) {
      if ((c.commit.message || "").startsWith(BOT_MESSAGE_PREFIX)) continue;
      commits.push(toEntry(c));
    }
    if (items.length < PER_PAGE) break;
  }

  const payload = {
    repo,
    repoUrl: `https://github.com/${repo}`,
    generatedAt: new Date().toISOString(),
    emptyRepo,
    count: commits.length,
    commits,
  };

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `Wrote ${commits.length} commit(s) to ${outFile}${emptyRepo ? " (repository is empty)" : ""}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
