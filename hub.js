/* ============================================================
   WEALTHDEMO — the hub, new look (v65)

   Draws home.html from what site.js already publishes:
     WD.catalogue   the categories and every tool in them
     WD.blueprints  the three Complete Client Blueprints
     WD.icons       the icon set
   Nothing here lists a tool by name. Add one to site.js and it
   appears in its tab, in search, and in the counts.

   What site.js still does on this page, unchanged: the account
   menu and greeting, the trial countdown (into #heroNote), the
   billing modal (anything with [data-billing]) and ⌘K (it
   focuses #navSearch).
   ============================================================ */
(function () {
  const WD = window.WD || {};
  const CATS = (WD.catalogue || []).filter(function (c) {
    return !c.hideInGrid && !c.agentOnly && (c.tools || []).length;
  });
  const PRACTICE = (WD.catalogue || []).filter(function (c) { return c.agentOnly; });
  const ICONS = WD.icons || {};
  const TAB_KEY = "wealthdemo.hub.tab";

  const $ = function (id) { return document.getElementById(id); };
  const tabsEl = $("nhTabs"), panel = $("nhPanel"), bpsEl = $("nhBlueprints"),
        pracEl = $("nhPractice"), search = $("navSearch"), note = $("nhToolsNote");
  if (!tabsEl || !panel) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.chart || "") + "</svg>";
  }
  const CHEV = '<svg class="nh-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

  /* What kind of tool it is, read off where it lives — so a new form
     is labelled correctly without anyone remembering to label it. */
  function kind(t) {
    const h = t.href || "";
    if (h.indexOf("form.html") !== 0) return "Calculator";
    if (/checklist/i.test(t.name)) return "Checklist";
    if (/tracker/i.test(t.name)) return "Tracker";
    if (/intake/i.test(t.name)) return "Intake";
    return "Scorecard";
  }

  function count(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  /* ---------------------------------------------------------
     The Blueprints
     --------------------------------------------------------- */
  function drawBlueprints() {
    if (!bpsEl) return;
    bpsEl.innerHTML = (WD.blueprints || []).map(function (b) {
      const live = !!b.href;
      return '<article class="nh-bp' + (b.isNew ? " is-new" : "") + (live ? "" : " is-soon") + '">' +
        (b.isNew ? '<span class="nh-flag">New</span>' : "") +
        '<div class="nh-bp-top">' +
          '<span class="nh-tile">' + icon(b.icon) + "</span>" +
          "<div><h3>" + esc(b.name) + "</h3><p>" + esc(b.desc) + "</p></div>" +
        "</div>" +
        '<ol class="nh-track" aria-label="Stages">' +
          (b.stages || []).map(function (s) { return "<li><i></i>" + esc(s) + "</li>"; }).join("") +
        "</ol>" +
        '<div class="nh-bp-foot">' +
          '<div class="nh-price"><b>$' + b.price.toFixed(2) + "</b><small>Complete suite</small></div>" +
          (live
            ? '<a class="nh-btn" href="' + esc(b.href) + '">Explore' + CHEV + "</a>"
            : '<span class="nh-btn is-off" aria-disabled="true">Coming soon</span>') +
        "</div>" +
      "</article>";
    }).join("");
  }

  /* ---------------------------------------------------------
     The tabs and the panel
     --------------------------------------------------------- */
  let active = "";
  try { active = localStorage.getItem(TAB_KEY) || ""; } catch (e) {}
  if (!CATS.some(function (c) { return c.name === active; })) active = CATS.length ? CATS[0].name : "";
  let query = "";

  function drawTabs() {
    const q = query.trim();
    tabsEl.innerHTML = CATS.map(function (c) {
      const on = !q && c.name === active;
      return '<button type="button" role="tab" class="nh-tab' + (on ? " is-on" : "") + '"' +
        ' aria-selected="' + (on ? "true" : "false") + '" data-cat="' + esc(c.name) + '">' +
        '<span class="nh-tile">' + icon(c.icon) + "</span>" +
        '<span class="nh-tab-t"><b>' + esc(c.name) + "</b><small>" + esc(c.note || "") + "</small></span>" +
        '<span class="nh-n">' + c.tools.length + "</span>" +
      "</button>";
    }).join("");
    tabsEl.querySelectorAll(".nh-tab").forEach(function (b) {
      b.addEventListener("click", function () {
        active = b.getAttribute("data-cat");
        try { localStorage.setItem(TAB_KEY, active); } catch (e) {}
        if (query) { query = ""; if (search) search.value = ""; }
        draw();
      });
    });
    tabsEl.classList.toggle("is-searching", !!q);
  }

  function row(t) {
    return '<a class="nh-row" href="' + esc(t.href || "#") + '">' +
      '<span class="nh-row-i">' + icon(t.icon) + "</span>" +
      '<span class="nh-row-t"><b>' + esc(t.name) + "</b><small>" + kind(t) + "</small></span>" +
      CHEV + "</a>";
  }

  function column(title, tools, sub) {
    return '<div class="nh-col">' +
      '<div class="nh-col-h"><h3>' + esc(title) + "</h3><span>" + esc(sub) + "</span></div>" +
      tools.map(row).join("") + "</div>";
  }

  function drawPanel() {
    const q = query.trim().toLowerCase();

    /* searching: every category, only what matches */
    if (q) {
      const hits = [];
      CATS.forEach(function (c) {
        const m = c.tools.filter(function (t) {
          return t.name.toLowerCase().indexOf(q) > -1 ||
                 (t.desc || "").toLowerCase().indexOf(q) > -1 ||
                 c.name.toLowerCase().indexOf(q) > -1;
        });
        if (m.length) hits.push({ c: c, m: m });
      });
      const n = hits.reduce(function (a, h) { return a + h.m.length; }, 0);
      if (note) note.textContent = n ? count(n, "tool") + " match “" + query.trim() + "”." : "Nothing matches “" + query.trim() + "”.";
      panel.className = "nh-panel is-search";
      panel.innerHTML = n
        ? '<div class="nh-cols" style="--n:' + Math.min(hits.length, 4) + '">' +
            hits.map(function (h) {
              return column(h.c.name, h.m, h.m.length === 1 ? "1 match" : h.m.length + " matches");
            }).join("") +
          "</div>"
        : '<p class="nh-empty">No tool matches that. Try a shorter word — “tax”, “home”, “retire”.</p>';
      return;
    }

    if (note) note.textContent = "One question, answered on the spot.";
    const cat = CATS.filter(function (c) { return c.name === active; })[0];
    if (!cat) { panel.innerHTML = ""; return; }

    /* the category's own sub-groups, in its own order; anything without
       one still shows, under "More" */
    const groups = (cat.subs || []).map(function (s) {
      return { name: s.name, tools: cat.tools.filter(function (t) { return t.sub === s.id; }) };
    }).filter(function (g) { return g.tools.length; });
    const loose = cat.tools.filter(function (t) {
      return !(cat.subs || []).some(function (s) { return s.id === t.sub; });
    });
    if (loose.length) groups.push({ name: groups.length ? "More" : cat.name, tools: loose });

    panel.className = "nh-panel";
    panel.setAttribute("data-cat", cat.name);
    panel.innerHTML = '<div class="nh-cols" style="--n:' + Math.min(groups.length, 4) + '">' +
      groups.map(function (g) { return column(g.name, g.tools, count(g.tools.length, "tool")); }).join("") +
      "</div>";
  }

  function draw() { drawTabs(); drawPanel(); }

  /* ---------------------------------------------------------
     For your practice: the adviser's own tools, plus the Desk
     --------------------------------------------------------- */
  function drawPractice() {
    if (!pracEl) return;
    const items = [];
    PRACTICE.forEach(function (c) {
      c.tools.forEach(function (t) { items.push({ name: t.name, href: t.href, note: c.note, icon: c.icon }); });
    });
    items.splice(1, 0, { name: "Your Desk", href: "desk.html", note: "Where finished assessments land.", icon: "grid" });
    pracEl.innerHTML = items.map(function (t) {
      return '<a class="nh-pc" href="' + esc(t.href) + '">' +
        '<span class="nh-pc-i">' + icon(t.icon) + "</span>" +
        '<span class="nh-row-t"><b>' + esc(t.name) + "</b><small>" + esc(t.note) + "</small></span>" +
        CHEV + "</a>";
    }).join("");
  }

  if (search) {
    search.addEventListener("input", function () { query = search.value; draw(); });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { search.value = ""; query = ""; draw(); }
    });
  }

  drawBlueprints();
  draw();
  drawPractice();

  /* exported for the tests */
  WD.hub = { active: function () { return active; }, cats: CATS };
})();
