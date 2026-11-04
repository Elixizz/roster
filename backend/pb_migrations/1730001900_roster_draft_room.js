/// <reference path="../pb_data/types.d.ts" />

// Draft room: the draft order and clock on each league, every pick made, and
// each member's queue of players they want. Picks are only made through the
// /api/roster/draft route (pb_hooks/roster_draft.pb.js), which checks whose
// turn it is. Members can read their league's picks; queues are private.
migrate((app) => {
  const users = app.findCollectionByNameOrId("roster_users");
  const leagues = app.findCollectionByNameOrId("roster_leagues");

  leagues.fields.add(new NumberField({ name: "draftRounds", onlyInt: true, min: 0 }));
  leagues.fields.add(new NumberField({ name: "draftPickSeconds", onlyInt: true, min: 0 }));
  leagues.fields.add(new JSONField({ name: "draftOrder" }));
  leagues.fields.add(new NumberField({ name: "draftPickNo", onlyInt: true, min: 0 }));
  leagues.fields.add(new NumberField({ name: "draftClockMs", onlyInt: true, min: 0 }));
  app.save(leagues);

  const memberRule = "@collection.roster_league_members.league ?= league && @collection.roster_league_members.user ?= @request.auth.id";

  const picks = new Collection({
    type: "base",
    name: "roster_draft_picks",
    listRule: memberRule,
    viewRule: memberRule,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "league", type: "relation", required: true, collectionId: leagues.id, maxSelect: 1, cascadeDelete: true },
      { name: "pickNo", type: "number", onlyInt: true, min: 0 },
      { name: "round", type: "number", onlyInt: true, min: 1 },
      { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: false },
      { name: "playerId", type: "text", required: true, max: 120 },
      { name: "playerName", type: "text", max: 120 },
      { name: "playerPos", type: "text", max: 8 },
      { name: "playerTeam", type: "text", max: 8 },
      { name: "auto", type: "bool" },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_roster_draft_picks_slot ON roster_draft_picks (league, pickNo)",
      "CREATE UNIQUE INDEX idx_roster_draft_picks_player ON roster_draft_picks (league, playerId)"
    ]
  });
  app.save(picks);

  const queues = new Collection({
    type: "base",
    name: "roster_draft_queues",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "user = @request.auth.id && @collection.roster_league_members.league ?= @request.body.league && @collection.roster_league_members.user ?= @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    fields: [
      { name: "league", type: "relation", required: true, collectionId: leagues.id, maxSelect: 1, cascadeDelete: true },
      { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: "players", type: "json" },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_roster_draft_queues_pair ON roster_draft_queues (league, user)"
    ]
  });
  app.save(queues);
}, (app) => {
  const q = app.findCollectionByNameOrId("roster_draft_queues");
  if (q) app.delete(q);
  const p = app.findCollectionByNameOrId("roster_draft_picks");
  if (p) app.delete(p);
  const leagues = app.findCollectionByNameOrId("roster_leagues");
  ["draftRounds", "draftPickSeconds", "draftOrder", "draftPickNo", "draftClockMs"].forEach((name) => leagues.fields.removeByName(name));
  app.save(leagues);
});
