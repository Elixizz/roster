// Free agent pool. Fill in real players here; the page sorts by points
// (highest first) and lets users filter by position.
//   name:   player name
//   pos:    QB, RB, WR, TE, K or DEF
//   team:   NFL team abbreviation, e.g. "KC"
//   points: total fantasy points (leave null until known)
(function () {
  var layout = { QB: 8, RB: 14, WR: 16, TE: 8, K: 4, DEF: 4 };
  var players = [];
  Object.keys(layout).forEach(function (pos) {
    for (var i = 1; i <= layout[pos]; i++) {
      players.push({ name: "", pos: pos, team: "", points: null });
    }
  });
  window.FREE_AGENTS = players;
})();
