/// <reference path="../pb_data/types.d.ts" />

// Create a league and join one by invite code. Both need a logged-in roster
// user. Each handler is self-contained because PocketBase does not share
// top-level functions with handler bodies.

// POST /api/roster/leagues  { name }  -> { league: { id, name, code } }
routerAdd("POST", "/api/roster/leagues", (e) => {
  const auth = e.auth;
  if (!auth) throw new UnauthorizedError("Log in first.");

  const body = e.requestInfo().body || {};
  const name = String(body.name || "").trim();
  if (!name || name.length > 60) {
    throw new BadRequestError("Give your league a name (up to 60 characters).");
  }

  // 6 characters from letters and digits, leaving out 0, O, 1 and I so codes
  // are easy to read out loud.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const makeCode = () => {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return code;
  };

  const leagues = $app.findCollectionByNameOrId("roster_leagues");
  const members = $app.findCollectionByNameOrId("roster_league_members");

  let code = makeCode();
  for (let tries = 0; tries < 20; tries++) {
    try {
      $app.findFirstRecordByData("roster_leagues", "code", code);
      code = makeCode();
    } catch (err) {
      break;
    }
  }

  const league = new Record(leagues);
  league.set("name", name);
  league.set("code", code);
  league.set("owner", auth.id);
  $app.save(league);

  const membership = new Record(members);
  membership.set("league", league.id);
  membership.set("user", auth.id);
  membership.set("role", "owner");
  $app.save(membership);

  return e.json(200, { league: { id: league.id, name: league.getString("name"), code: code } });
}, $apis.requireAuth("roster_users"));

// POST /api/roster/join  { code }  -> { league: { id, name, code } }
routerAdd("POST", "/api/roster/join", (e) => {
  const auth = e.auth;
  if (!auth) throw new UnauthorizedError("Log in first.");

  const body = e.requestInfo().body || {};
  const code = String(body.code || "").trim().toUpperCase();
  if (code.length !== 6) {
    throw new BadRequestError("Invite codes are 6 characters.");
  }

  let league;
  try {
    league = $app.findFirstRecordByData("roster_leagues", "code", code);
  } catch (err) {
    throw new BadRequestError("No league uses that code. Check it and try again.");
  }

  const summary = { id: league.id, name: league.getString("name"), code: code };

  try {
    $app.findFirstRecordByFilter(
      "roster_league_members",
      "league = {:league} && user = {:user}",
      { league: league.id, user: auth.id }
    );
    return e.json(200, { league: summary, alreadyMember: true });
  } catch (err) {
    // Not a member yet; add them below.
  }

  const members = $app.findCollectionByNameOrId("roster_league_members");
  const membership = new Record(members);
  membership.set("league", league.id);
  membership.set("user", auth.id);
  membership.set("role", "member");
  $app.save(membership);

  return e.json(200, { league: summary, alreadyMember: false });
}, $apis.requireAuth("roster_users"));
