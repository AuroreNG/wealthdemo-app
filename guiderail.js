/* ============================================================
   WEALTHDEMO — the Guide, docked

   Draws the pairs from pairs.js into the rail calc.js built,
   and answers each one by driving the calculator that is already
   on the page.

   It never does arithmetic. Every figure it prints came back out
   of the tool: probe() sets an input, reads what the page then
   says, and puts the input back; solve() bisects the same way the
   calculators do. Both restore every value they touch, and there
   is a test that asserts zero drift — because a Guide that left
   an input changed would be worse than no Guide at all.

   With no pairs written for a tool, nothing appears: no tab, no
   pill, no empty panel.
   ============================================================ */
(function () {
  "use strict";

  const SLUG = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "");

  function boot() {
    const C = window.WD_CALC;
    const PAIRS = (window.WD_PAIRS || {})[SLUG];
    const H = window.WD_DRIVE;
    if (!C || !PAIRS || !PAIRS.length || !H) return;

    /* ============================================================
       what the Guide is allowed to do to the page
       ============================================================ */
    const P = {
      say: function (id) { return H.t(id) || ""; },

      num: function (id) {
        const el = H.el(id);
        if (!el) return null;
        const n = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ""));
        return isFinite(n) ? n : null;
      },

      /* set some inputs, read one readout, put everything back */
      whatIf: function (map, readId) {
        const back = H.set(map);
        if (!back) return "";
        const out = H.t(readId) || "";
        H.undo(back);
        return out;
      },

      /* the smallest value of `id` at which ok(readout) becomes true */
      solve: function (id, ok, watchId) {
        const el = H.el(id);
        if (!el) return null;
        const now = parseFloat(el.value) || 0;
        const hi = Math.max(now * 10, now + 100000, 100000);
        const found = H.solve(id, 0, hi, function () { return ok(H.t(watchId)); });
        return found === null ? null : Math.ceil(found);
      }
    };

    /* ============================================================
       drawing
       ============================================================ */
    const esc = function (s) {
      return String(s === undefined || s === null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    };

    const PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/></svg>';
    const TREND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5 10 10l3.5 3L20 6"/><path d="M15 6h5v5"/></svg>';

    let filter = "all";

    function render() {
      const pane = C.guidePane;
      const shown = PAIRS.filter(function (p) {
        return filter === "all" || p.kind === filter;
      });

      const html = [];
      html.push('<div class="gd-filter">' +
        chip("all", "All", PAIRS.length) +
        chip("question", "Questions", PAIRS.filter(function (p) { return p.kind === "question"; }).length) +
        chip("objection", "Objections", PAIRS.filter(function (p) { return p.kind === "objection"; }).length) +
        chip("check", "Checks", PAIRS.filter(function (p) { return p.kind === "check"; }).length) +
      "</div>");

      if (!shown.length) html.push('<p class="gd-empty">Nothing of that kind for this file.</p>');

      shown.forEach(function (p) {
        /* the answer is worked out now, against the page as it stands */
        let body = "";
        try { body = typeof p.text === "function" ? p.text(P) : (p.text || ""); }
        catch (e) { body = ""; }
        if (!body) return;

        html.push('<div class="gd-pair" data-kind="' + esc(p.kind) + '">');
        html.push('<div class="gd-said">' + PERSON +
          '<div class="gd-bubble">' +
            (p.said ? "“" + esc(p.said) + "”"
                    : "Nothing — they will not think to ask this one.") +
          "</div></div>");
        html.push('<div class="gd-answer">');
        html.push('<div class="gd-tags">' + (p.tags || [p.kind]).map(function (t) {
          return '<span class="gd-tag" data-t="' + esc(t) + '">' + esc(t) + "</span>";
        }).join("") + "</div>");
        html.push('<div class="gd-text">' + body + "</div>");
        if (p.say) html.push('<div class="gd-say"><span>Say it like this</span><q>' + esc(p.say) + "</q></div>");
        if (p.ran) html.push('<div class="gd-ran">' + TREND + esc(p.ran) + "</div>");
        html.push("</div></div>");
      });

      pane.innerHTML = html.join("");
      pane.querySelectorAll(".gd-chip").forEach(function (b) {
        b.addEventListener("click", function () {
          filter = b.getAttribute("data-f");
          render();
        });
      });
      C.setGuideCount(PAIRS.length);
    }

    function chip(id, label, n) {
      return '<button type="button" class="gd-chip" data-f="' + id + '"' +
        (filter === id ? ' aria-pressed="true"' : ' aria-pressed="false"') +
        ">" + label + (n ? " " + n : "") + "</button>";
    }

    /* ============================================================
       how it makes itself known

       There is already a floating button on every tool page — the
       one that opens the ask panel. A second one in the other
       corner reads as clutter, and the two would be mistaken for
       each other. So the Guide lives entirely on its own tab, and
       says so once: the tab carries the count, and blinks twice
       the first time a browser sees it on this tool.
       ============================================================ */
    const SEEN = "wealthdemo.guide.seen." + SLUG;
    let seen = true;
    try { seen = !!localStorage.getItem(SEEN); } catch (e) {}
    if (!seen) {
      setTimeout(function () {
        C.guideTab.setAttribute("data-note", "1");
        try { localStorage.setItem(SEEN, "1"); } catch (e) {}
        setTimeout(function () { C.guideTab.removeAttribute("data-note"); }, 2600);
      }, 1500);
    }

    /* the answers are worked out from the page, so they are redrawn when
       the page changes — but only while anybody is looking at them */
    let dirty = false;
    document.addEventListener("input", function () { dirty = true; }, true);
    setInterval(function () {
      if (!dirty) return;
      dirty = false;
      if (!C.guidePane.hidden) render();
    }, 1200);

    /* opening the tab is a request for the answers as they stand now,
       not as they stood when the page loaded */
    C.guideTab.addEventListener("click", function () { render(); });

    render();

    window.WD_GUIDE = { render: render, pairs: PAIRS, probe: P };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
