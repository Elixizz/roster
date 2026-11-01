/*
 * LEAGUE DATA: this is the only file you need to edit.
 *
 * How draft picks work:
 *   - Every team starts out owning its own pick in every round of every season listed below
 *     (53 rounds in the startup season, 7 rounds in every season after it).
 *   - Each entry in `trades` moves one pick from one team to another.
 *     Trades are applied in the order they appear, so keep them oldest -> newest.
 *   - Team ids in trades must match an `id` in `teams`.
 *
 * To add a trade, copy an entry in `trades`, change the values, and save.
 */
window.LEAGUE = {
  name: "Dynasty League",
  seasons: [2027, 2028, 2029],

  // Draft rounds.
  // The startup draft (the league's first draft) runs until every roster is full:
  // 53 rounds, one pick per team per round, reaching the 53-player max roster size.
  // Every draft after that is a 7-round rookie draft, one pick per team per round.
  startupSeason: 2027,
  startupRounds: 53,
  rounds: 7,

  teams: [
    { id: "t1",  name: "Team 1",  owner: "Owner 1" },
    { id: "t2",  name: "Team 2",  owner: "Owner 2" },
    { id: "t3",  name: "Team 3",  owner: "Owner 3" },
    { id: "t4",  name: "Team 4",  owner: "Owner 4" },
    { id: "t5",  name: "Team 5",  owner: "Owner 5" },
    { id: "t6",  name: "Team 6",  owner: "Owner 6" },
    { id: "t7",  name: "Team 7",  owner: "Owner 7" },
    { id: "t8",  name: "Team 8",  owner: "Owner 8" },
    { id: "t9",  name: "Team 9",  owner: "Owner 9" },
    { id: "t10", name: "Team 10", owner: "Owner 10" },
    { id: "t11", name: "Team 11", owner: "Owner 11" },
    { id: "t12", name: "Team 12", owner: "Owner 12" }
  ],

  // Optional: when a season's draft order is set, list team ids in pick order (1st pick first).
  // Picks then show as "1.03" and so on, instead of just the round.
  draftOrder: {
    // 2027: ["t5", "t2", "t9", "t1", "t12", "t3", "t7", "t10", "t4", "t8", "t11", "t6"]
  },

  // EXAMPLE TRADES: replace these with your league's real trades.
  trades: [
    { date: "2026-08-20", season: 2027, round: 1, original: "t3", from: "t3", to: "t7", note: "Example: for a WR" },
    { date: "2026-09-02", season: 2028, round: 2, original: "t1", from: "t1", to: "t4", note: "Example" },
    { date: "2026-10-15", season: 2027, round: 1, original: "t3", from: "t7", to: "t10", note: "Example: pick flipped again" }
  ]
};
