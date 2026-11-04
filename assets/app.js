// Shared app chrome for the roster site: the bottom tab bar and the back
// button in the top app bar. Pages opt out of the tab bar with
// <body data-no-tabs>.
(function () {
  "use strict";

  var BASE = "/roster/";
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    team: '<path d="M8 3 4 5.5 2.5 10l3 1.2V21h13v-9.8l3-1.2L20 5.5 16 3c-.6 1.6-2.2 2.6-4 2.6S8.6 4.6 8 3z"/>',
    league: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    players: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .8 3.5 2.8 3.5 5.7"/>',
    picks: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 13h3M8 17h6"/>'
  };
  var TABS = [
    { href: BASE, label: "Home", icon: "home", match: function (p) { return p === BASE || p === BASE + "index.html"; } },
    { href: BASE + "team/", label: "Team", icon: "team" },
    { href: BASE + "league/", label: "League", icon: "league" },
    { href: BASE + "free-agency/", label: "Players", icon: "players" },
    { href: BASE + "picks/", label: "Picks", icon: "picks" }
  ];

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

  window.rosterApp = { icon: svg };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { addTabbar(); wireBack(); });
  } else {
    addTabbar();
    wireBack();
  }
})();
