/* ============================================================
   WEALTHDEMO — Simple mode + the built-in guide

   The complaint was fair: the tools asked too much and answered
   with too many numbers at once. This file fixes that without
   touching a single calculation.

   What it does, per page, from the plan in guide.js:

     ask   — the input ids that stay on screen. Every other
             input folds under one "More settings" line.
     keep  — the sections that stay on screen. Everything after
             them folds under one "Show me the detail" line.
     guide — plain sentences that read the live numbers off the
             page and explain them.

   The engines never know. Hidden inputs still hold their values,
   hidden sections still get written to, so every figure stays
   exactly what it was.
   ============================================================ */
(function () {
  "use strict";

  const KEY = "wealthdemo.simple";
  const SLUG = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "");

  /* ---------- run before paint so the page never flashes wide open ---------- */
  function wanted() {
    try {
      const v = localStorage.getItem(KEY);
      return v === null ? true : v === "1";          /* simple is the default */
    } catch (e) { return true; }
  }
  const root = document.documentElement;
  if (wanted()) root.classList.add("sm");

  const ICON = {
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
    shut: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg>',
    talk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 13.5c0 3.6-3.8 6.5-8.5 6.5a11 11 0 0 1-2.6-.3L4 21.5l1.4-3.8A6.2 6.2 0 0 1 3.5 13.5C3.5 9.9 7.3 7 12 7s8.5 2.9 8.5 6.5Z"/><path d="M9 12.5h6"/><path d="M9 15.5h3.5"/></svg>'
  };

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ============================================================
     1. Simple mode
     ============================================================ */

  /* the box that owns one question — varies by page, so try in order */
  function wrapOf(el) {
    return el.closest(".field") || el.closest(".rate-row") || el.closest(".di-row") ||
           el.closest(".f-body") || el.closest(".ax-fields > *") || el.parentElement;
  }

  /* every input the page asks a question with */
  function inputs() {
    return Array.prototype.slice.call(
      document.querySelectorAll(".tool-wrap input[id], .tool-wrap select[id]")
    ).filter(function (el) {
      return el.type !== "hidden" && el.id && !el.closest(".site-nav") &&
             el.id !== "navSearch" && !el.closest(".gd-panel");
    });
  }

  function foldToggle(cls, openWord, shutWord, targets) {
    const bar = document.createElement("div");
    bar.className = cls;
    bar.innerHTML = '<button type="button">' + esc(shutWord) + ICON.down + "</button>";
    const btn = bar.firstChild;
    btn.addEventListener("click", function () {
      const open = bar.getAttribute("data-open") === "1";
      bar.setAttribute("data-open", open ? "0" : "1");
      btn.innerHTML = esc(open ? shutWord : openWord) + ICON.down;
      targets.forEach(function (n) {
        if (open) n.removeAttribute("data-sm-open");
        else {
          n.setAttribute("data-sm-open", "1");
          /* revealing something already behind a fold shouldn't need a
             second click to read it */
          const f = n.closest("details.fold") || n.querySelector("details.fold");
          if (f) f.open = true;
        }
      });
      if (!open) window.dispatchEvent(new Event("resize"));   /* charts re-measure */
    });
    return bar;
  }

  function simplify(plan) {
    if (!plan) return;

    /* --- the questions --- */
    if (plan.ask && plan.ask.length) {
      const keepIds = {};
      plan.ask.forEach(function (id) { keepIds[id] = true; });

      /* a slider that drives a kept box is part of that question, not a
         separate one — lAmt keeps lAmtSlide, dKids keeps dKidsSlide */
      inputs().forEach(function (el) {
        if (keepIds[el.id]) return;
        for (let i = 0; i < plan.ask.length; i++) {
          if (el.id.length > plan.ask[i].length && el.id.indexOf(plan.ask[i]) === 0) {
            keepIds[el.id] = true;
            return;
          }
        }
      });

      const hiddenByPanel = new Map();
      inputs().forEach(function (el) {
        if (keepIds[el.id]) return;
        let w = wrapOf(el);
        if (!w || w === document.body) w = el;
        /* some pages hang a bare slider off the panel itself, with no box of
           its own. Then the wrapper we found is the whole panel — far too
           much to hide — so hide just this node instead. */
        if (w !== el && Array.prototype.some.call(w.querySelectorAll("input[id],select[id]"),
            function (i) { return keepIds[i.id]; })) w = el;
        w.setAttribute("data-sm", "hide");
        const panel = w.parentElement;
        if (!hiddenByPanel.has(panel)) hiddenByPanel.set(panel, []);
        hiddenByPanel.get(panel).push(w);
      });

      /* a whole side with nothing left to ask goes too */
      document.querySelectorAll(".tool-wrap .side, .tool-wrap .rate-side, .tool-wrap .di-col").forEach(function (side) {
        const live = Array.prototype.filter.call(side.querySelectorAll("input[id],select[id]"), function (i) {
          return keepIds[i.id];
        });
        if (!live.length && side.querySelector("input[id],select[id]")) {
          side.setAttribute("data-sm", "hide");
          const panel = side.parentElement;
          if (!hiddenByPanel.has(panel)) hiddenByPanel.set(panel, []);
          hiddenByPanel.get(panel).push(side);
        }
      });

      /* one line per input panel, not one per question */
      const panels = [];
      hiddenByPanel.forEach(function (list, panel) { panels.push([panel, list]); });
      const all = [];
      panels.forEach(function (p) { p[1].forEach(function (n) { all.push(n); }); });
      if (all.length) {
        const host = panels[0][0].closest(".calc, .rates, .dime-inputs, .ask, .wd-fields, .field-grid, .panel") || panels[0][0];
        const bar = foldToggle("sm-more", "Fewer settings", "More settings", all);
        host.appendChild(bar);
      }
    }

    /* --- the sections --- */
    if (plan.keep && plan.keep.length) {
      const wrap = document.querySelector(".tool-wrap");
      if (wrap) {
        const kids = Array.prototype.slice.call(wrap.children);
        const hidden = [];
        let lastKept = null;
        kids.forEach(function (n) {
          if (n.matches(".tool-topbar") || n.tagName === "FOOTER" || n.classList.contains("sm-bar")) return;
          if (plan.keep.some(function (sel) { return n.matches(sel); })) { lastKept = n; return; }
          n.setAttribute("data-sm", "hide");
          hidden.push(n);
        });
        if (hidden.length) {
          const bar = foldToggle("sm-bar", "Hide the detail", "Show me the detail", hidden);
          /* after everything that stays, so the line never lands mid-page */
          if (lastKept && lastKept.nextSibling) wrap.insertBefore(bar, lastKept.nextSibling);
          else if (lastKept) wrap.appendChild(bar);
          else wrap.insertBefore(bar, hidden[0]);
        }
      }
    }
  }

  /* ---------- the Simple / Everything switch ---------- */
  function addSwitch() {
    const host = document.querySelector(".tool-topbar .topbar-right") ||
                 document.querySelector(".tool-topbar");
    if (!host) return;
    const box = document.createElement("div");
    box.className = "sm-switch";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "How much to show");
    box.innerHTML =
      '<button type="button" data-mode="1">Simple</button>' +
      '<button type="button" data-mode="0">Everything</button>';
    const btns = box.querySelectorAll("button");
    function paint() {
      const simple = root.classList.contains("sm");
      btns[0].setAttribute("aria-pressed", simple ? "true" : "false");
      btns[1].setAttribute("aria-pressed", simple ? "false" : "true");
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        const simple = b.getAttribute("data-mode") === "1";
        root.classList.toggle("sm", simple);
        try { localStorage.setItem(KEY, simple ? "1" : "0"); } catch (e) {}
        paint();
        window.dispatchEvent(new Event("resize"));
      });
    });
    paint();
    if (host.classList.contains("topbar-right")) host.insertBefore(box, host.firstChild);
    else host.appendChild(box);
  }

  /* ============================================================
     2. The guide
     ============================================================ */

  /* {#id} reads what the page is showing, {$id} reads what was typed in */
  function fill(str) {
    let missing = false;
    const out = String(str).replace(/\{([#$])([A-Za-z0-9_]+)\}/g, function (m, kind, id) {
      const el = document.getElementById(id);
      if (!el) { missing = true; return ""; }
      let v;
      if (kind === "$") {
        if (el.tagName === "SELECT") v = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : "";
        else v = el.value;
        const n = parseFloat(v);
        if (isFinite(n) && el.closest(".money-in")) v = money.format(n);
      } else {
        v = el.textContent || "";
      }
      v = String(v).trim();
      if (!v || v === "—" || v === "—") { missing = true; return ""; }
      return "<b>" + esc(v) + "</b>";
    });
    return missing ? null : out;
  }

  let panel = null, veil = null, plan = null;
  const THREAD = [];                 /* what has been asked, newest first */

  function render() {
    if (!panel || !plan || !plan.guide) return;
    const g = plan.guide;
    const body = panel.querySelector(".gd-body");
    const open = {};
    body.querySelectorAll(".gd-q[data-open='1']").forEach(function (q) { open[q.getAttribute("data-k")] = true; });
    /* the panel re-renders on every keystroke, so what the reader chose to
       open has to survive that or it slams shut under their hands */
    body.querySelectorAll(".gd-more [data-on='1']").forEach(function (b) { open[b.getAttribute("data-more")] = true; });

    let html = "";

    if (THREAD.length) {
      html += '<section class="gd-thread">' + THREAD.map(function (a) {
        if (a.pending) {
          return '<article data-pending="1"><span class="gd-asked">' + esc(a.q) + "</span>" +
            '<b class="gd-work"><i></i><i></i><i></i>' + esc(a.pending) + "</b></article>";
        }
        return '<article' + (a.live ? ' data-live="1"' : '') + '><span class="gd-asked">' + esc(a.q) + "</span>" +
          "<b>" + esc(a.title) + (a.tag ? ' <i>' + esc(a.tag) + "</i>" : "") + "</b>" +
          "<p>" + esc(a.body) + "</p>" +
          (a.tries ? '<span class="gd-tries">' + a.tries.map(function (t) {
            return '<button type="button" data-try="' + esc(t) + '">' + esc(t) + "</button>";
          }).join("") + "</span>" : "") + "</article>";
      }).join("") + "</section>";
    }

    /* Once a question has been asked, the answer is the thing. Everything
       else — what stands out, the walkthrough, the common questions — goes
       behind one quiet row, because a wall of other content under an answer
       is how a panel stops being read at all. */
    const asked = THREAD.length > 0;

    let found = [];
    try { found = (window.WD_FINDINGS ? window.WD_FINDINGS(SLUG) : []) || []; } catch (e) { found = []; }
    if (found.length) {
      html += '<section class="gd-found"' + (asked && !open.found ? ' hidden' : '') +
        '><span>What stands out</span>' +
        found.map(function (f) {
          return '<article data-level="' + esc(f.level || "watch") + '">' +
            "<b>" + esc(f.t) + "</b><p>" + esc(f.b) + "</p></article>";
        }).join("") + "</section>";
    }

    const lead = g.lead ? fill(g.lead) : null;
    const steps = (g.steps || []).map(function (s) {
      const b = fill(s.b);
      return b ? "<li><strong>" + esc(s.t) + "</strong><p>" + b + "</p></li>" : "";
    }).filter(Boolean);

    if (lead || steps.length) {
      /* the walkthrough is still here; it just stops being the first thing */
      const openHow = (found.length || asked) ? "" : ' data-open="1"';
      html += '<section class="gd-how"' + openHow + (asked && !open.how ? ' hidden' : '') +
        '><button type="button">How this works' + ICON.down + "</button>" +
        '<div' + ((found.length || asked) ? " hidden" : "") + ">" +
        (lead ? '<p class="gd-lead">' + lead + "</p>" : "") +
        (steps.length ? '<ul class="gd-steps">' + steps.join("") + "</ul>" : "") +
        "</div></section>";
    }

    const qs = (g.qs || []).map(function (q, i) {
      const a = fill(q.a);
      if (!a) return "";
      return '<div class="gd-q" data-k="q' + i + '"' + (open["q" + i] ? ' data-open="1"' : "") + '>' +
             '<button type="button">' + esc(q.q) + ICON.down + "</button>" +
             "<div" + (open["q" + i] ? "" : ' hidden') + ">" + a + "</div></div>";
    }).filter(Boolean);
    if (qs.length) html += '<div class="gd-ask"' + (asked && !open.qs ? ' hidden' : '') +
      '><span>Questions people ask</span>' + qs.join("") + "</div>";

    /* the one row that puts it all back, only once there is an answer above */
    if (asked && (found.length || lead || steps.length || qs.length)) {
      const chip = function (k, label, on) {
        return '<button type="button" data-more="' + k + '"' + (on ? ' data-on="1"' : '') + '>' + label + "</button>";
      };
      html = html.replace('<section class="gd-found"',
        '<div class="gd-more">' +
        (found.length ? chip("found", "What stands out", !!open.found) : "") +
        ((lead || steps.length) ? chip("how", "How this works", !!open.how) : "") +
        (qs.length ? chip("qs", "Common questions", !!open.qs) : "") +
        "</div><section class=\"gd-found\"");
    }

    html += '<p class="gd-foot">' + (asked
      ? "Figures read off this page. An illustration, not advice."
      : "Every figure here is read straight off this page, so it moves when you change " +
        "a number. It is an illustration, not a quote, a policy or tax advice.") + "</p>";

    body.innerHTML = html;
    body.querySelectorAll("[data-try]").forEach(function (b) {
      b.addEventListener("click", function () {
        const f = panel.querySelector(".gd-askbox input");
        f.value = b.getAttribute("data-try");
        panel.querySelector(".gd-askbox").dispatchEvent(new Event("submit", { cancelable: true }));
      });
    });
    body.querySelectorAll(".gd-more button").forEach(function (b) {
      b.addEventListener("click", function () {
        const k = b.getAttribute("data-more");
        const on = b.getAttribute("data-on") === "1";
        const sel = k === "found" ? ".gd-found" : k === "how" ? ".gd-how" : ".gd-ask";
        const sec = body.querySelector(sel);
        if (!sec) return;
        b.setAttribute("data-on", on ? "0" : "1");
        sec.hidden = on;
        if (!on) sec.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    });

    const how = body.querySelector(".gd-how");
    if (how) {
      how.firstElementChild.addEventListener("click", function () {
        const isOpen = how.getAttribute("data-open") === "1";
        how.setAttribute("data-open", isOpen ? "0" : "1");
        how.lastElementChild.hidden = isOpen;
      });
    }
    body.querySelectorAll(".gd-q > button").forEach(function (b) {
      b.addEventListener("click", function () {
        const q = b.parentElement;
        const isOpen = q.getAttribute("data-open") === "1";
        q.setAttribute("data-open", isOpen ? "0" : "1");
        q.lastElementChild.hidden = isOpen;
      });
    });
  }

  function show(on) {
    if (!panel) return;
    if (on) render();
    panel.setAttribute("data-show", on ? "1" : "0");
    document.documentElement.classList.toggle("gd-open-panel", !!on);
    veil.setAttribute("data-show", on ? "1" : "0");
    veil.hidden = !on;
    panel.setAttribute("aria-hidden", on ? "false" : "true");
    if (on) panel.querySelector(".gd-shut").focus();
  }

  function buildGuide() {
    if (!plan || !plan.guide) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gd-open";
    btn.innerHTML = ICON.talk + "<span>" + esc(plan.guide.cta || "Walk me through this") + "</span>";
    /* the first time someone meets a tool, the button says so — once, then never again */
    let fresh = false;
    try { fresh = !localStorage.getItem("wealthdemo.guideSeen"); } catch (e) {}
    if (fresh) btn.setAttribute("data-new", "1");
    document.body.appendChild(btn);

    veil = document.createElement("div");
    veil.className = "gd-veil";
    veil.hidden = true;
    document.body.appendChild(veil);

    panel = document.createElement("aside");
    panel.className = "gd-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Walk me through this");
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML =
      '<div class="gd-top"><div><h2>' + esc(plan.guide.title || "Here's what this is saying") + "</h2>" +
      "<p>" + esc(plan.guide.sub || "In plain words, using your own numbers.") + "</p></div>" +
      '<button type="button" class="gd-shut" aria-label="Close">' + ICON.shut + "</button></div>" +
      '<div class="gd-body"></div>' +
      '<form class="gd-askbox"><input type="text" placeholder="Ask about your numbers\u2026" ' +
      'aria-label="Ask a question about this page" autocomplete="off">' +
      '<button type="submit" aria-label="Ask">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg>' +
      "</button></form>";
    document.body.appendChild(panel);

    const box = panel.querySelector(".gd-askbox");
    const field = box.querySelector("input");
    /* what has actually been said, in the shape the model expects, so a
       follow-up ("and if I retired a year later?") lands in context */
    let history = [];

    function place(entry) {
      THREAD.unshift(entry);
      if (THREAD.length > 6) THREAD.pop();
      render();
      const body = panel.querySelector(".gd-body");
      if (body) body.scrollTop = 0;
      return entry;
    }

    async function ask(q) {
      q = String(q || "").trim();
      if (!q) return;
      field.value = "";

      let a = null;
      try { a = window.WD_ASK ? window.WD_ASK(q) : null; } catch (e) { a = null; }

      /* answered off the page: instant, free, and incapable of disagreeing
         with the calculator. Nothing goes to a model. */
      if (a && !a.stuck) { a.q = q; place(a); return; }

      const AI = window.WD_AI;
      if (!AI || !AI.available()) {
        /* a client is not being sold short here — everything the page can
           work out, it already answered above. This is only the handful of
           questions that need a person, and saying so is more use than a
           shrug. */
        let client = false;
        try { client = localStorage.getItem("wealthdemo.role") !== "agent"; } catch (e) {}
        if (a && a.stuck && client) {
          a.title = "That one is worth asking your adviser";
          a.body = "I answer from the numbers on this page \u2014 I can change any of them and " +
                   "show you what happens, explain anything it uses, or say what stands out. " +
                   "Anything beyond that is a conversation, not a calculation.";
        }
        place(a || { q: q, title: "I can't answer that one",
                     body: "Try asking what happens if one of the numbers changes.", tag: "" });
        return;
      }

      const slot = place({ q: q, pending: "Reading your figures" });
      let out;
      try {
        out = await AI.ask(q, history, function (state, why) {
          slot.pending = state === "working"
            ? (why ? why.charAt(0).toUpperCase() + why.slice(1) : "Running it on your figures")
            : "Reading your figures";
          render();
        });
      } catch (e) {
        out = { error: String(e) };
      }

      const at = THREAD.indexOf(slot);
      if (at < 0) return;                       /* cleared while it was thinking */

      if (out && out.text) {
        history = (out.messages || []).concat([{ role: "assistant", content: out.text }]).slice(-8);
        THREAD[at] = { q: q, title: "Worked out on your figures", body: out.text, tag: "", live: true };
      } else {
        /* a failure says what failed. Silence here reads as a broken page. */
        THREAD[at] = {
          q: q,
          title: out && out.code === "cap_reached" ? "That's today's limit" : "I couldn't reach the assistant",
          body: (out && out.say) || "Everything else on this page still works \u2014 the figures, the chart and the walkthrough are all worked out here, not there.",
          tag: ""
        };
      }
      render();
    }
    box.addEventListener("submit", function (e) { e.preventDefault(); ask(field.value); });

    btn.addEventListener("click", function () {
      btn.removeAttribute("data-new");
      try { localStorage.setItem("wealthdemo.guideSeen", "1"); } catch (e) {}
      show(true);
    });
    veil.addEventListener("click", function () { show(false); });
    panel.querySelector(".gd-shut").addEventListener("click", function () { show(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.getAttribute("data-show") === "1") show(false);
    });

    /* while it's open it keeps up with whatever they change */
    let t = null;
    document.addEventListener("input", function () {
      if (panel.getAttribute("data-show") !== "1") return;
      clearTimeout(t);
      t = setTimeout(render, 160);
    });
    document.addEventListener("change", function () {
      if (panel.getAttribute("data-show") !== "1") return;
      clearTimeout(t);
      t = setTimeout(render, 160);
    });
  }

  /* ============================================================
     go
     ============================================================ */
  function start() {
    if (document.body.getAttribute("data-page") !== "app") return;
    plan = (window.WD_SIMPLE || {})[SLUG] || null;
    if (!plan) return;                       /* a page with no plan is left exactly as it was */
    /* a page that only carries a guide gets no switch — there is nothing to switch */
    if ((plan.ask && plan.ask.length) || (plan.keep && plan.keep.length)) addSwitch();
    /* let the tool paint its first answer before anything moves */
    setTimeout(function () { simplify(plan); }, 0);
    buildGuide();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
