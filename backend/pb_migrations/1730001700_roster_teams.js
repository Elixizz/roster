/// <reference path="../pb_data/types.d.ts" />

// Team names for each league member, and the league's member list. Members
// can see everyone in leagues they belong to, and can only name their own team.
migrate((app) => {
  const users = app.findCollectionByNameOrId("roster_users");
  const leagues = app.findCollectionByNameOrId("roster_leagues");
  const members = app.findCollectionByNameOrId("roster_league_members");

  // Anyone in a league can see its other members (needed for the league screen).
  members.listRule = "@collection.roster_league_members.league ?= league && @collection.roster_league_members.user ?= @request.auth.id";
  members.viewRule = "@collection.roster_league_members.league ?= league && @collection.roster_league_members.user ?= @request.auth.id";
  app.save(members);

  const teams = new Collection({
    type: "base",
    name: "roster_teams",
    listRule: "@collection.roster_league_members.league ?= league && @collection.roster_league_members.user ?= @request.auth.id",
    viewRule: "@collection.roster_league_members.league ?= league && @collection.roster_league_members.user ?= @request.auth.id",
    createRule: "user = @request.auth.id && @collection.roster_league_members.league ?= @request.body.league && @collection.roster_league_members.user ?= @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: null,
    fields: [
      { name: "league", type: "relation", required: true, collectionId: leagues.id, maxSelect: 1, cascadeDelete: true },
      { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: "name", type: "text", required: true, max: 40 },
      { name: "ownerName", type: "text", max: 80 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_roster_teams_pair ON roster_teams (league, user)"
    ]
  });
  app.save(teams);
}, (app) => {
  const t = app.findCollectionByNameOrId("roster_teams");
  if (t) app.delete(t);
  const members = app.findCollectionByNameOrId("roster_league_members");
  members.listRule = "user = @request.auth.id";
  members.viewRule = "user = @request.auth.id";
  app.save(members);
});
