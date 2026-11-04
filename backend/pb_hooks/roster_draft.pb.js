/// <reference path="../pb_data/types.d.ts" />

// Draft room routes. Shared logic lives in roster_draft_lib.js.

// POST /api/roster/draft  { league, action, ... }
//   start  { seconds }  owner only: random snake order of members, 26 rounds,
//                       clears any earlier picks
//   end                 owner only: finishes the draft
//   undo                owner only: takes back the last pick
//   pick   { player }   the member on the clock (or the owner for them)
routerAdd("POST", "/api/roster/draft", (e) => {
  const lib = require(`${__hooks}/roster_draft_lib.js`);
  const auth = e.auth;
  if (!auth) throw new UnauthorizedError("Log in first.");

  const body = e.requestInfo().body || {};
  const action = String(body.action || "");

  let league;
  try {
    league = $app.findRecordById("roster_leagues", String(body.league || ""));
  } catch (err) {
    throw new NotFoundError("League not found.");
  }

  let member = false;
  try {
    $app.findFirstRecordByFilter("roster_league_members", "league = {:league} && user = {:user}",
      { league: league.id, user: auth.id });
    member = true;
  } catch (err) {}
  if (!member) throw new ForbiddenError("You're not in this league.");

  const isOwner = league.getString("owner") === auth.id;
  const status = league.getString("draftStatus");
  const summary = () => ({
    id: league.id,
    draftStatus: league.getString("draftStatus"),
    draftPickNo: league.getInt("draftPickNo"),
    draftClockMs: league.getInt("draftClockMs")
  });

  if (action === "start") {
    if (!isOwner) throw new ForbiddenError("Only the league owner can start the draft.");
    if (status === "live") throw new BadRequestError("The draft is already live.");

    const seconds = Number(body.seconds) || lib.DEFAULT_PICK_SECONDS;
    if (lib.PICK_SECONDS.indexOf(seconds) < 0) throw new BadRequestError("Pick a timer from the list.");

    const members = $app.findRecordsByFilter("roster_league_members", "league = {:league}", "", 0, 0, { league: league.id });
    const users = members.map((m) => m.getString("user"));
    for (let i = users.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = users[i]; users[i] = users[j]; users[j] = t;
    }

    $app.findRecordsByFilter("roster_draft_picks", "league = {:league}", "", 0, 0, { league: league.id })
      .forEach((p) => $app.delete(p));

    league.set("draftOrder", users);
    league.set("draftRounds", lib.ROUNDS);
    league.set("draftPickSeconds", seconds);
    league.set("draftPickNo", 0);
    league.set("draftClockMs", Date.now());
    league.set("draftStatus", "live");
    league.set("draftStartedAt", new Date().toISOString());
    $app.save(league);
    return e.json(200, { league: summary() });
  }

  if (action === "end") {
    if (!isOwner) throw new ForbiddenError("Only the league owner can end the draft.");
    league.set("draftStatus", "done");
    $app.save(league);
    return e.json(200, { league: summary() });
  }

  if (action === "undo") {
    if (!isOwner) throw new ForbiddenError("Only the league owner can undo a pick.");
    const last = league.getInt("draftPickNo") - 1;
    if (last < 0) throw new BadRequestError("There's no pick to undo.");
    try {
      const pick = $app.findFirstRecordByFilter("roster_draft_picks", "league = {:league} && pickNo = {:no}",
        { league: league.id, no: last });
      $app.delete(pick);
    } catch (err) {}
    league.set("draftPickNo", last);
    league.set("draftClockMs", Date.now());
    league.set("draftStatus", "live");
    $app.save(league);
    return e.json(200, { league: summary() });
  }

  if (action === "pick") {
    if (status !== "live") throw new BadRequestError("The draft isn't live.");
    const clock = lib.onClock(league);
    if (!clock) throw new BadRequestError("The draft has no order yet.");
    if (clock.user !== auth.id && !isOwner) throw new ForbiddenError("It's not your pick.");
    const pick = lib.makePick($app, league, String(body.player || ""), lib.loadPlayers(), false);
    return e.json(200, { league: summary(), pick: { id: pick.id, playerName: pick.getString("playerName") } });
  }

  throw new BadRequestError("Unknown draft action.");
}, $apis.requireAuth("roster_users"));

// Every minute: when someone's time is up, draft the first available player
// in their queue. With an empty queue the clock keeps running and the league
// owner can pick for them.
cronAdd("roster_draft_autopick", "* * * * *", () => {
  const lib = require(`${__hooks}/roster_draft_lib.js`);
  const live = $app.findRecordsByFilter("roster_leagues", "draftStatus = 'live'", "", 0, 0);
  if (!live.length) return;
  let players = null;

  live.forEach((league) => {
    const seconds = league.getInt("draftPickSeconds") || lib.DEFAULT_PICK_SECONDS;
    if (Date.now() - league.getInt("draftClockMs") < seconds * 1000) return;
    const clock = lib.onClock(league);
    if (!clock) return;

    let queue;
    try {
      queue = $app.findFirstRecordByFilter("roster_draft_queues", "league = {:league} && user = {:user}",
        { league: league.id, user: clock.user });
    } catch (err) {
      return;
    }
    const ids = lib.jsonList(queue, "players");
    if (!players) players = lib.loadPlayers();
    const next = ids.filter((id) => players[id] && !lib.isTaken($app, league.id, id))[0];
    if (!next) return;
    try {
      lib.makePick($app, league, next, players, true);
    } catch (err) {
      console.log("roster autopick failed for league " + league.id + ": " + err);
    }
  });
});
