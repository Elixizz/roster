/// <reference path="../pb_data/types.d.ts" />

// Draft status on each league. Only the league owner changes it, through the
// /api/roster/draft route in pb_hooks/roster_leagues.pb.js. Members read it to
// show the "draft is live" bar.
migrate((app) => {
  const leagues = app.findCollectionByNameOrId("roster_leagues");
  leagues.fields.add(new SelectField({ name: "draftStatus", values: ["live", "done"], maxSelect: 1 }));
  leagues.fields.add(new DateField({ name: "draftStartedAt" }));
  app.save(leagues);
}, (app) => {
  const leagues = app.findCollectionByNameOrId("roster_leagues");
  leagues.fields.removeByName("draftStatus");
  leagues.fields.removeByName("draftStartedAt");
  app.save(leagues);
});
