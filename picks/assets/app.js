(function () {
  "use strict";

  var L = window.LEAGUE;
  if (!L) {
    document.querySelector("main").innerHTML = '<p class="empty">Could not load data/league.js.</p>';
    return;
  }

  var teamsById = {};
  L.teams.forEach(function (t) { teamsById[t.id] = t; });
  var teamName = function (id) { return teamsById[id] ? teamsById[id].name : id; };

  // Build every pick, owned by its original team to start with.
  var picks = {}; // key "season|round|original" -> pick
  var key = function (s, r, o) { return s + "|" + r + "|" + o; };
  // Startup draft: enough rounds to fill a 53-man roster. Later drafts: 7 rounds.
  function roundsFor(season) {
    return season === L.startupSeason ? (L.startupRounds || 53) : (L.rounds || 7);
  }
  L.seasons.forEach(function (season) {
    for (var round = 1; round <= roundsFor(season); round++) {
      L.teams.forEach(function (t) {
        picks[key(season, round, t.id)] = { season: season, round: round, original: t.id, owner: t.id, history: [] };
      });
    }
  });

  // Apply the trades in order.
  var warnings = [];
  L.trades.forEach(function (tr, i) {
    var p = picks[key(tr.season, tr.round, tr.original)];
    if (!p) { warnings.push("Trade #" + (i + 1) + ": no such pick (" + tr.season + " round " + tr.round + ", " + tr.original + ")"); return; }
    if (!teamsById[tr.to]) { warnings.push("Trade #" + (i + 1) + ": unknown team '" + tr.to + "'"); return; }
    if (tr.from && tr.from !== p.owner) {
      warnings.push("Trade #" + (i + 1) + ": " + teamName(tr.from) + " didn't own that pick (owner was " + teamName(p.owner) + ")");
    }
    p.history.push(tr);
    p.owner = tr.to;
  });
  if (warnings.length) console.warn("League data problems:\n" + warnings.join("\n"));

  function pickLabel(p) {
    var order = L.draftOrder && L.draftOrder[p.season];
    if (order) {
      var slot = order.indexOf(p.original);
      if (slot >= 0) return p.round + "." + String(slot + 1).padStart(2, "0");
    }
    return "Rd " + p.round;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Controls
  var teamSel = document.getElementById("team-filter");
  var seasonSel = document.getElementById("season-filter");
  var tradedOnly = document.getElementById("traded-only");
  document.getElementById("league-name").textContent = L.name;
  document.title = L.name + " · Draft Picks";
  L.teams.forEach(function (t) { teamSel.add(new Option(t.name, t.id)); });
  L.seasons.forEach(function (s) { seasonSel.add(new Option(s, s)); });

  // Keep filters in the URL hash so a link can be shared, e.g. #team=t3
  function readHash() {
    var h = new URLSearchParams(location.hash.slice(1));
    teamSel.value = h.get("team") || "";
    seasonSel.value = h.get("season") || "";
    tradedOnly.checked = h.get("traded") === "1";
  }
  function writeHash() {
    var h = new URLSearchParams();
    if (teamSel.value) h.set("team", teamSel.value);
    if (seasonSel.value) h.set("season", seasonSel.value);
    if (tradedOnly.checked) h.set("traded", "1");
    history.replaceState(null, "", h.toString() ? "#" + h : location.pathname + location.search);
  }

  function render() {
    var team = teamSel.value;
    var seasons = seasonSel.value ? [Number(seasonSel.value)] : L.seasons;
    var all = Object.keys(picks).map(function (k) { return picks[k]; });
    var visible = all.filter(function (p) {
      return seasons.indexOf(p.season) >= 0 && (!tradedOnly.checked || p.owner !== p.original);
    });

    // Summary stats
    var summary = document.getElementById("summary");
    if (team) {
      var owned = visible.filter(function (p) { return p.owner === team; });
      var acquired = owned.filter(function (p) { return p.original !== team; }).length;
      var lost = visible.filter(function (p) { return p.original === team && p.owner !== team; }).length;
      var firsts = owned.filter(function (p) { return p.round === 1; }).length;
      summary.innerHTML =
        stat(owned.length, "picks owned") + stat(firsts, "1st-rounders") +
        stat(acquired, "acquired") + stat(lost, "traded away");
    } else {
      var traded = visible.filter(function (p) { return p.owner !== p.original; }).length;
      summary.innerHTML = stat(visible.length, "picks shown") + stat(traded, "have changed hands");
    }

    // Grid: one row per team, one column per season.
    // Each cell shows the team's own picks as round ranges, plus picks traded in and out.
    var rows = team ? L.teams.filter(function (t) { return t.id === team; }) : L.teams;

    var html = '<thead><tr><th class="team">Team</th>' + seasons.map(function (s) {
      var label = s === L.startupSeason ? "Startup draft" : "Rookie draft";
      return "<th>" + s + ' <span class="draft-type">' + label + " · " + roundsFor(s) + " rds</span></th>";
    }).join("") + "</tr></thead><tbody>";

    rows.forEach(function (t) {
      html += '<tr><td class="team"><b>' + esc(t.name) + '</b><div class="owner">' + esc(t.owner) + "</div></td>";
      seasons.forEach(function (s) {
        var inSeason = visible.filter(function (p) { return p.season === s; });
        var owned = inSeason.filter(function (p) { return p.owner === t.id; });
        var own = owned.filter(function (p) { return p.original === t.id; }).map(function (p) { return p.round; });
        var acquired = owned.filter(function (p) { return p.original !== t.id; });
        var lost = inSeason.filter(function (p) { return p.original === t.id && p.owner !== t.id; });
        var byRound = function (a, b) { return a.round - b.round; };
        acquired.sort(byRound); lost.sort(byRound);

        var cell = '<div class="count"><b>' + owned.length + "</b> pick" + (owned.length === 1 ? "" : "s") + "</div>";
        if (own.length && !tradedOnly.checked) cell += '<div class="own">Own: ' + ranges(own) + "</div>";
        cell += acquired.map(function (p) {
          return '<span class="chip traded" title="' + esc(historyText(p)) + '">' + esc(pickLabel(p)) +
            "<small>from " + esc(teamName(p.original)) + "</small></span>";
        }).join("");
        cell += lost.map(function (p) {
          return '<span class="chip lost" title="' + esc(historyText(p)) + '"><s>' + esc(pickLabel(p)) + "</s>" +
            "<small>to " + esc(teamName(p.owner)) + "</small></span>";
        }).join("");
        if (!owned.length && !lost.length) cell = '<span class="none">none</span>';
        html += '<td class="cell">' + cell + "</td>";
      });
      html += "</tr>";
    });
    document.getElementById("grid").innerHTML = html + "</tbody>";

    // Trade log, newest first
    var log = L.trades.map(function (t, i) { return { t: t, i: i }; }).filter(function (x) {
      var t = x.t;
      return seasons.indexOf(t.season) >= 0 &&
        (!team || t.from === team || t.to === team || t.original === team);
    }).reverse();

    document.getElementById("trades").innerHTML = log.length
      ? "<thead><tr><th>Date</th><th>Pick</th><th>From</th><th>To</th><th>Note</th></tr></thead><tbody>" +
        log.map(function (x) {
          var t = x.t;
          return "<tr><td>" + esc(t.date || "") + "</td><td>" + t.season + " Rd " + t.round +
            " <span class=\"none\">(" + esc(teamName(t.original)) + ")</span></td><td>" + esc(teamName(t.from || "?")) +
            "</td><td>" + esc(teamName(t.to)) + '</td><td class="note">' + esc(t.note || "") + "</td></tr>";
        }).join("") + "</tbody>"
      : '<tbody><tr><td class="empty">No pick trades match these filters.</td></tr></tbody>';
  }

  function historyText(p) {
    return p.history.map(function (h) { return h.date + ": " + teamName(h.from || "?") + " → " + teamName(h.to); }).join("\n");
  }

  // [1,2,3,5,7,8] -> "Rd 1–3, 5, 7–8"
  function ranges(nums) {
    nums = nums.slice().sort(function (a, b) { return a - b; });
    var out = [], i = 0;
    while (i < nums.length) {
      var j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      out.push(i === j ? String(nums[i]) : nums[i] + "–" + nums[j]);
      i = j + 1;
    }
    return "Rd " + out.join(", ");
  }

  function stat(n, label) { return '<div class="stat"><b>' + n + "</b> " + label + "</div>"; }

  [teamSel, seasonSel, tradedOnly].forEach(function (el) {
    el.addEventListener("change", function () { writeHash(); render(); });
  });
  window.addEventListener("hashchange", function () { readHash(); render(); });
  readHash();
  render();
})();
