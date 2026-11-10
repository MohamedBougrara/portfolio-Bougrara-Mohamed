// graphique.js
// A Shiny output binding for plotly.js. The server sends a figure as JSON
// ({data, layout, config}); the binding draws it with Plotly.react (which
// updates in place instead of redrawing), and sends clicks back to the server
// as the input <output id>_click.
//
// Why not the plotly R package: under webR (shinylive) it pulls ggplot2,
// tidyr, dplyr, stringi and data.table, 95 MB and over a minute and a half of
// loading in the browser. This binding needs plotly.js only.
(function () {
  // Static files published next to the app (see R/graphique.R).
  var STATIQUE = new URL("../", window.location.href).href;

  // Country shapes, fetched once: the server sends "monde" in place of the
  // GeoJSON, and only codes and values travel between R and the browser.
  var monde = null;
  function chargerMonde() {
    if (!monde) monde = fetch(STATIQUE + "monde.geojson").then(function (r) { return r.json(); });
    return monde;
  }
  chargerMonde();

  var binding = new Shiny.OutputBinding();

  binding.find = function (scope) {
    return $(scope).find(".graphique-output");
  };

  // Phones: legends and colour scales go under the chart, so that the plot
  // keeps the full width of the screen.
  var ETROIT = 576;
  function etroit(el) { return el.clientWidth > 0 && el.clientWidth < ETROIT; }
  function adapter(fig, petit) {
    if (!petit) return { data: fig.data, layout: fig.layout };
    var layout = Object.assign({}, fig.layout, {
      legend: Object.assign({}, fig.layout.legend, { orientation: "h", x: 0, xanchor: "left", y: -0.12, yanchor: "top" }),
      margin: Object.assign({}, fig.layout.margin, { r: 8 })
    });
    var data = fig.data.map(function (t) {
      if (!t.colorbar) return t;
      return Object.assign({}, t, { colorbar: Object.assign({}, t.colorbar,
        { orientation: "h", x: 0.5, xanchor: "center", y: 0, yanchor: "top", len: 0.9, thickness: 10 }) });
    });
    return { data: data, layout: layout };
  }
  function dessiner(el) {
    var fig = el._figure, petit = etroit(el), f = adapter(fig, petit);
    el._petit = petit;
    // No toolbar: the axes are fixed, and on a touch screen it covers the chart.
    var config = Object.assign({ responsive: true, displaylogo: false, displayModeBar: false,
      topojsonURL: STATIQUE + "topojson/" }, fig.config || {});
    return Plotly.react(el, f.data, f.layout, config);
  }

  binding.renderValue = function (el, fig) {
    if (!fig) { Plotly.purge(el); return; }
    var aGeo = fig.data.some(function (t) { return t.geojson === "monde"; });
    (aGeo ? chargerMonde() : Promise.resolve(null)).then(function (geo) {
      if (geo) fig.data.forEach(function (t) { if (t.geojson === "monde") t.geojson = geo; });
      el._figure = fig;
      return dessiner(el);
    }).then(function () {
      if (el._clicEcoute) return;
      el._clicEcoute = true;
      el.on("plotly_click", function (e) {
        var p = e && e.points && e.points[0];
        if (!p || p.customdata === undefined) return;
        Shiny.setInputValue(el.id + "_click", p.customdata, { priority: "event" });
      });
    });
  };

  binding.renderError = function (el, err) {
    Plotly.purge(el);
    el.innerHTML = '<p class="graphique-message">' + $("<div>").text(err.message).html() + "</p>";
  };
  binding.clearError = function (el) {
    var m = el.querySelector(".graphique-message");
    if (m) m.remove();
  };

  Shiny.outputBindings.register(binding, "mb.graphique");

  // Charts inside cards that change size (sidebar, full screen) follow.
  // (the script loads in <head>: wait for the page before observing it).
  // Crossing the phone width redraws the chart with the other layout.
  function redimensionner() {
    document.querySelectorAll(".graphique-output").forEach(function (g) {
      if (!g.data || !g._figure) return;
      if (etroit(g) !== g._petit) dessiner(g); else Plotly.Plots.resize(g);
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    if (window.ResizeObserver) new ResizeObserver(redimensionner).observe(document.body);
  });
  document.addEventListener("shown.bs.tab", redimensionner);

  // Language asked by the page that opens the app (?lang=fr). Under
  // shinylive the app runs in a frame of that page, on the same origin.
  $(document).on("shiny:connected", function () {
    var adresse = window.location.search;
    try { if (window.parent !== window) adresse = window.parent.location.search || adresse; } catch (e) {}
    var m = /[?&]lang=(fr|en)\b/.exec(adresse);
    if (m) Shiny.setInputValue("lang_url", m[1]);
  });

  // Relabels a download button when the language changes.
  Shiny.addCustomMessageHandler("libelle", function (m) {
    var b = document.getElementById(m.id); if (!b) return;
    var t = b.lastChild; if (t && t.nodeType === 3) t.nodeValue = " " + m.texte;
  });
})();
