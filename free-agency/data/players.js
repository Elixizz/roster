// Free agent pool. Fill in real players here.
//   name: player name
//   pos:  one of the positions below, e.g. "QB", "LB", "LS"
//   team: NFL team abbreviation, e.g. "KC"
//
// Positions by group:
//   Offense:        QB, RB, WR, TE
//   Offensive line: C (center), G (guard), T (tackle)
//   Defense:        DE (defensive end), DT (defensive tackle), LB (linebacker),
//                   CB (cornerback), S (safety)
//   Special teams:  K (kicker), P (punter), LS (long snapper)
(function () {
  var layout = {
    QB: 8, RB: 12, WR: 14, TE: 8,
    C: 4, G: 6, T: 6,
    DE: 8, DT: 6, LB: 10, CB: 10, S: 8,
    K: 3, P: 3, LS: 2
  };
  var players = [];
  Object.keys(layout).forEach(function (pos) {
    for (var i = 1; i <= layout[pos]; i++) players.push({ name: "", pos: pos, team: "" });
  });
  window.FREE_AGENTS = players;
})();
