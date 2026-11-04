// Login gate for the roster site. Every page except /roster/login/ includes
// this script. A page stays hidden until the saved login is confirmed by the
// server; otherwise the visitor is sent to the login page.
(function () {
  "use strict";

  var KEY = "roster_auth";
  var API = "/api/collections/roster_users";
  var LOGIN = "/roster/login/";

  function readAuth() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function writeAuth(value) {
    try {
      if (value) localStorage.setItem(KEY, JSON.stringify(value));
      else localStorage.removeItem(KEY);
    } catch (e) { /* storage blocked: the gate will just ask again */ }
  }

  // Asks the server whether the saved token is still valid. Returns a promise
  // of true/false and refreshes the saved token when it is.
  function verify() {
    var saved = readAuth();
    if (!saved || !saved.token) return Promise.resolve(false);
    return fetch(API + "/auth-refresh", { method: "POST", headers: { Authorization: saved.token } })
      .then(function (res) {
        if (!res.ok) { writeAuth(null); return false; }
        return res.json().then(function (data) {
          writeAuth({ token: data.token, email: data.record.email, name: data.record.name || "" });
          return true;
        });
      })
      .catch(function () { return false; });
  }

  window.rosterAuth = {
    current: readAuth,
    save: writeAuth,
    verify: verify,
    logout: function () {
      writeAuth(null);
      location.href = LOGIN;
    }
  };

  if (location.pathname.indexOf(LOGIN) === 0) return;

  document.documentElement.style.visibility = "hidden";
  verify().then(function (ok) {
    if (ok) {
      document.documentElement.style.visibility = "";
    } else {
      var next = encodeURIComponent(location.pathname + location.search);
      location.replace(LOGIN + "?next=" + next);
    }
  });
})();
