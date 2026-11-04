/// <reference path="../pb_data/types.d.ts" />

// Shared draft logic for roster_draft.pb.js. PocketBase handlers don't see
// top-level functions, so each handler loads this file with
// require(`${__hooks}/roster_draft_lib.js`).

// The site's player list, synced from the repo. Picks are checked against it
// so a pick always records the real name, position, and NFL team.
const PLAYERS_FILE = "/var/www/lapistudios/roster/free-agency/data/players.js";

const ROUNDS = 26;
const PICK_SECONDS = [60, 300, 900, 3600, 14400, 28800, 86400];
const DEFAULT_PICK_SECONDS = 28800;

function playerKey(p) {
  return p.espn ? String(p.espn) : String(p.name || "") + "|" + String(p.team || "");
}

// Map of player id -> { id, name, pos, team }.
function loadPlayers() {
  const text = toString($os.readFile(PLAYERS_FILE));
  const start = text.indexOf("window.FREE_AGENTS = [");
  if (start < 0) throw new Error("player list not found");
  const open = text.indexOf("[", start);
  const close = text.indexOf("];", open);
  const list = JSON.parse(text.slice(open, close + 1));
  const byId = {};
  list.forEach((p) => {
    if (!p || !p.name || p.ir) return;
    const id = playerKey(p);
    byId[id] = { id: id, name: p.name, pos: p.pos, team: p.team };
  });
  return byId;
}

// JSON fields come back as raw bytes from record.get(), so read them as text.
function jsonList(record, field) {
  try {
    const parsed = JSON.parse(record.getString(field) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function order(league) {
  return jsonList(league, "draftOrder");
}

// Snake order: rounds alternate direction.
function onClock(league) {
  const teams = order(league);
  if (!teams.length) return null;
  const pickNo = league.getInt("draftPickNo");
  const round = Math.floor(pickNo / teams.length);
  const slot = pickNo % teams.length;
  return {
    user: teams[round % 2 === 0 ? slot : teams.length - 1 - slot],
    round: round + 1,
    pickNo: pickNo
  };
}

function isTaken(app, leagueId, playerId) {
  try {
    app.findFirstRecordByFilter("roster_draft_picks", "league = {:league} && playerId = {:player}",
      { league: leagueId, player: playerId });
    return true;
  } catch (err) {
    return false;
  }
}

// Records the pick for whoever is on the clock, then moves the clock on.
function makePick(app, league, playerId, players, auto) {
  const clock = onClock(league);
  if (!clock) throw new BadRequestError("The draft has no order yet.");
  const player = players[playerId];
  if (!player) throw new BadRequestError("That player isn't in the player list.");
  if (isTaken(app, league.id, playerId)) throw new BadRequestError(player.name + " has already been drafted.");

  const pick = new Record(app.findCollectionByNameOrId("roster_draft_picks"));
  pick.set("league", league.id);
  pick.set("pickNo", clock.pickNo);
  pick.set("round", clock.round);
  pick.set("user", clock.user);
  pick.set("playerId", player.id);
  pick.set("playerName", player.name);
  pick.set("playerPos", player.pos);
  pick.set("playerTeam", player.team);
  pick.set("auto", !!auto);
  app.save(pick);

  const total = order(league).length * (league.getInt("draftRounds") || ROUNDS);
  const next = clock.pickNo + 1;
  league.set("draftPickNo", next);
  league.set("draftClockMs", Date.now());
  if (next >= total) league.set("draftStatus", "done");
  app.save(league);
  return pick;
}

module.exports = {
  ROUNDS: ROUNDS,
  PICK_SECONDS: PICK_SECONDS,
  DEFAULT_PICK_SECONDS: DEFAULT_PICK_SECONDS,
  loadPlayers: loadPlayers,
  jsonList: jsonList,
  order: order,
  onClock: onClock,
  isTaken: isTaken,
  makePick: makePick
};
