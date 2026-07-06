/* -------------------------------------------------------------
   Theme controller
   - Applies the saved color scheme + light/dark theme to <html>
     immediately (this file is loaded in <head>) to avoid a flash.
   - Renders a small fixed control (scheme <select> + light/dark
     toggle) and persists the user's choice in localStorage.

   Color values live in css/style.css, keyed off two attributes:
     <html data-scheme="..."> and <html data-theme="light|dark">
   ------------------------------------------------------------- */
(function () {
  "use strict";

  var SCHEMES = [
    { id: "default",       name: "Byng Classic" },
    { id: "ocean-pearl",   name: "Ocean Pearl" },
    { id: "cherry-lemon",  name: "Cherry Lemon Sky" },
    { id: "rustic-autumn", name: "Rustic Autumn Harvest" },
    { id: "neon-arctic",   name: "Neon Arctic Glow" },
    { id: "serenity",      name: "Minimalist Serenity" },
    { id: "minty-breeze",  name: "Minty Floral Breeze" },
    { id: "bold-tropical", name: "Bold Tropical Mix" }
  ];

  var SCHEME_KEY = "site-scheme";
  var THEME_KEY = "site-theme";
  var root = document.documentElement;

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function systemTheme() {
    return (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }

  function applyScheme(scheme) {
    if (scheme && scheme !== "default") {
      root.setAttribute("data-scheme", scheme);
    } else {
      root.removeAttribute("data-scheme");
    }
  }
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
  }

  // ---- Apply saved (or system) choice right away, before first paint ----
  var scheme = load(SCHEME_KEY) || "default";
  var theme = load(THEME_KEY) || systemTheme();
  applyScheme(scheme);
  applyTheme(theme);

  // ---- Build the control once the DOM is ready ----
  function buildControl() {
    if (document.querySelector(".theme-control")) { return; }

    var bar = document.createElement("div");
    bar.className = "theme-control";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Color scheme and theme");

    // Scheme selector
    var select = document.createElement("select");
    select.setAttribute("aria-label", "Color scheme");
    SCHEMES.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id === scheme) { opt.selected = true; }
      select.appendChild(opt);
    });
    select.addEventListener("change", function () {
      scheme = select.value;
      applyScheme(scheme);
      store(SCHEME_KEY, scheme);
    });

    // Light/dark toggle
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "theme-toggle";
    function refreshToggle() {
      var dark = theme === "dark";
      toggle.textContent = dark ? "☀" : "☾"; // sun when dark, moon when light
      toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      toggle.setAttribute("aria-pressed", String(dark));
      toggle.title = dark ? "Switch to light mode" : "Switch to dark mode";
    }
    toggle.addEventListener("click", function () {
      theme = (theme === "dark") ? "light" : "dark";
      applyTheme(theme);
      store(THEME_KEY, theme);
      refreshToggle();
    });
    refreshToggle();

    bar.appendChild(select);
    bar.appendChild(toggle);
    document.body.appendChild(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildControl);
  } else {
    buildControl();
  }
})();
