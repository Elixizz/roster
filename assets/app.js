// Shared app chrome for the roster site: the bottom tab bar, the back button
// in the top app bar, and the "draft is live" bar that shows on every page
// while the picked league's draft is running. Pages opt out of the tab bar
// with <body data-no-tabs>.
(function () {
  "use strict";

  var BASE = "/roster/";
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    team: '<path d="M8 3 4 5.5 2.5 10l3 1.2V21h13v-9.8l3-1.2L20 5.5 16 3c-.6 1.6-2.2 2.6-4 2.6S8.6 4.6 8 3z"/>',
    league: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    players: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .8 3.5 2.8 3.5 5.7"/>'
  };
  var TABS = [
    { href: BASE, label: "Home", icon: "home", match: function (p) { return p === BASE || p === BASE + "index.html"; } },
    { href: BASE + "team/", label: "Team", icon: "team" },
    { href: BASE + "league/", label: "League", icon: "league" },
    { href: BASE + "free-agency/", label: "Players", icon: "players" }
  ];
  var DRAFT_POLL_MS = 30000;

  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
  }

  function addTabbar() {
    if (document.body.hasAttribute("data-no-tabs")) return;
    var path = location.pathname;
    var nav = document.createElement("nav");
    nav.className = "tabbar";
    nav.setAttribute("aria-label", "Main");
    nav.innerHTML = '<div class="tabbar-inner">' + TABS.map(function (tab) {
      var active = tab.match ? tab.match(path) : path.indexOf(tab.href) === 0;
      return '<a class="tab" href="' + tab.href + '"' + (active ? ' aria-current="page"' : "") + ">" +
        svg(tab.icon) + "<span>" + tab.label + "</span></a>";
    }).join("") + "</div>";
    document.body.appendChild(nav);
    document.body.classList.add("has-tabbar");
  }

  // Back buttons go to the previous roster page when there is one, otherwise home.
  function wireBack() {
    var buttons = document.querySelectorAll("[data-back]");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function (event) {
        var fromRoster = document.referrer && document.referrer.indexOf(location.origin + BASE) === 0;
        if (fromRoster && history.length > 1) {
          event.preventDefault();
          history.back();
        }
      });
    });
  }

  // ---------- Live draft bar ----------
  // Shows under the top app bar on every page while the picked league's draft
  // is live. The league owner also gets an End draft button in it.

  function auth() {
    return window.rosterAuth && window.rosterAuth.current();
  }

  function pickedLeague() {
    try { return localStorage.getItem("roster_league"); } catch (e) { return null; }
  }

  // extra: more fields for the action, e.g. { seconds: 28800 } when starting.
  function draftAction(leagueId, action, extra) {
    var saved = auth();
    var body = { league: leagueId, action: action };
    Object.keys(extra || {}).forEach(function (k) { body[k] = extra[k]; });
    return fetch("/api/roster/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: saved ? saved.token : "" },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) throw new Error(json.message || "Something went wrong.");
        return json;
      });
    });
  }

  // Snake order, the same rule the server uses.
  function onClock(league) {
    var o = Array.isArray(league.draftOrder) ? league.draftOrder : [];
    if (!o.length) return null;
    var no = league.draftPickNo || 0;
    var round = Math.floor(no / o.length), slot = no % o.length;
    return { user: o[round % 2 === 0 ? slot : o.length - 1 - slot], round: round + 1, inRound: slot + 1 };
  }

  // Team names for the bar, fetched once per league per page.
  var teamNames = {};
  function loadTeamNames(leagueId, token) {
    if (teamNames[leagueId]) return Promise.resolve(teamNames[leagueId]);
    var filter = encodeURIComponent('league="' + leagueId + '"');
    return fetch("/api/collections/roster_teams/records?perPage=100&filter=" + filter, { headers: { Authorization: token } })
      .then(function (res) { return res.ok ? res.json() : { items: [] }; })
      .then(function (data) {
        var names = {};
        data.items.forEach(function (t) { names[t.user] = t.name; });
        teamNames[leagueId] = names;
        return names;
      }, function () { return {}; });
  }

  function renderDraftBar(league, names) {
    var bar = document.getElementById("draft-bar");
    // The draft room shows its own clock, so it doesn't need the bar.
    var inRoom = location.pathname.indexOf(BASE + "draft/") === 0;
    var live = league && league.draftStatus === "live" && !inRoom;
    if (!live) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "draft-bar";
      bar.className = "draft-bar";
      bar.setAttribute("role", "status");
      var appbar = document.querySelector(".appbar");
      if (appbar) appbar.insertAdjacentElement("afterend", bar);
      else document.body.insertBefore(bar, document.body.firstChild);
    }
    var saved = auth();
    var clock = onClock(league);
    var mine = clock && saved && clock.user === saved.id;
    bar.classList.toggle("mine", !!mine);
    bar.innerHTML = '<div class="draft-bar-inner">' +
      '<span class="draft-dot" aria-hidden="true"></span>' +
      '<span class="draft-text"><b></b><small></small></span>' +
      '<a class="draft-end" href="' + BASE + 'draft/">' + (mine ? "Pick now" : "Draft room") + "</a>" +
      "</div>";
    bar.querySelector("b").textContent = mine ? "You're on the clock" : "The draft is live";
    bar.querySelector("small").textContent = clock
      ? "Round " + clock.round + ", pick " + clock.inRound + (mine ? "" : " · " + ((names || {})[clock.user] || "Unnamed team") + " is up")
      : "";
  }

  var draftListeners = [];
  function refreshDraft() {
    var saved = auth();
    var id = pickedLeague();
    if (!saved || !saved.token || !id || location.pathname.indexOf(BASE + "login/") === 0) {
      renderDraftBar(null);
      return Promise.resolve(null);
    }
    return fetch("/api/collections/roster_leagues/records/" + encodeURIComponent(id), {
      headers: { Authorization: saved.token }
    }).then(function (res) { return res.ok ? res.json() : null; })
      .then(function (league) {
        var names = league && league.draftStatus === "live" ? loadTeamNames(id, saved.token) : Promise.resolve({});
        return names.then(function (n) {
          renderDraftBar(league, n);
          draftListeners.forEach(function (fn) { fn(league); });
          return league;
        });
      }, function () { return null; });
  }

  window.rosterApp = {
    icon: svg,
    refreshDraft: refreshDraft,
    draftAction: draftAction,
    onDraft: function (fn) { draftListeners.push(fn); }
  };

  function start() {
    addTabbar();
    wireBack();
    refreshDraft();
    setInterval(function () { if (!document.hidden) refreshDraft(); }, DRAFT_POLL_MS);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshDraft(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
