/// <reference path="../pb_data/types.d.ts" />

// Roster leagues. A league is created and joined through the hooks in
// pb_hooks/roster_leagues.pb.js, which generate the invite code on the server.
// Members can read the leagues they belong to; nobody can write them directly.
migrate((app) => {
  const users = app.findCollectionByNameOrId("roster_users");

  const leagues = new Collection({
    type: "base",
    name: "roster_leagues",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "name", type: "text", required: true, max: 60 },
      { name: "code", type: "text", required: true, min: 6, max: 6 },
      { name: "owner", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_roster_leagues_code ON roster_leagues (code)"
    ]
  });
  app.save(leagues);

  const members = new Collection({
    type: "base",
    name: "roster_league_members",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "league", type: "relation", required: true, collectionId: leagues.id, maxSelect: 1, cascadeDelete: true },
      { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: "role", type: "select", required: true, values: ["owner", "member"], maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_roster_league_members_pair ON roster_league_members (league, user)"
    ]
  });
  app.save(members);

  // Set after the members collection exists, because the rule reads from it.
  const memberRule = "@collection.roster_league_members.league ?= id && @collection.roster_league_members.user ?= @request.auth.id";
  const saved = app.findCollectionByNameOrId("roster_leagues");
  saved.listRule = memberRule;
  saved.viewRule = memberRule;
  app.save(saved);
}, (app) => {
  const m = app.findCollectionByNameOrId("roster_league_members");
  if (m) app.delete(m);
  const l = app.findCollectionByNameOrId("roster_leagues");
  if (l) app.delete(l);
});
