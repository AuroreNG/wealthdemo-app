/* ============================================================
   WEALTHDEMO — how to use this

   A short walk round the actual page, once, the first time
   someone opens a tool. It points at the real elements rather
   than describing them, skips any step whose target is not on
   this page, and never runs twice unless it is asked for.

   Most of what it says is written for the tool it is standing in
   — what this calculator is for, what its own questions mean,
   which of its numbers is the one that matters. Those steps live
   beside the rest of that tool's plan, in guide.js.

   A short shared tail follows: the chart, the fold and the ask
   box, which behave the same way everywhere. The steps are then
   put into page order, so the tour always walks downwards.
   ============================================================ */
(function () {
  "use strict";

  /* v2: the tour used to be generic. Now it is written for each tool, so
     a browser that dismissed the old one should still be shown this one. */
  const KEY = "wealthdemo.tour.v2";

  /* each step: where to point, what to say. First match wins; a step whose
     target is missing or hidden is dropped. */
  const SLUG = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "");

  /* what this tool is for, and what its own numbers mean */
  function ownSteps() {
    const plan = (window.WD_SIMPLE || {})[SLUG];
    return plan && plan.tour ? plan.tour.slice() : [];
  }

  /* and the handful of things that work the same on every page */
  const SHARED = [
    {
      find: [".sm-more", ".ask-more"],
      t: "The rest is one tap away",
      b: "Everything a calculator like this can ask is still here. It just waits until you want it."
    },
    {
      find: ['svg[data-cs="1"]', 'svg[data-cs="bars"]'],
      t: "The picture reads itself",
      b: "Run your finger along a line, or tap a bar, and it tells you what is true at that point \u2014 every figure, and which one is ahead."
    },
    {
      find: [".sm-bar"],
      t: "There is more underneath",
      b: "The workings, the comparisons and the fine print live behind this one line. Open it and the tour carries on through them.",
      /* opening it is the point: the rest of this tool is on the other side */
      act: function () {
        const bar = document.querySelector('.sm-bar[data-open="1"]') ? null : document.querySelector(".sm-bar button");
        if (bar) bar.click();
      }
    },
    {
      find: [".gd-open"],
      t: "And you can just ask",
      b: "Type a question in your own words \u2014 \u201cwhat if I paid $600 a month?\u201d \u2014 and it works the answer out on your figures.",
      spot: "tight"
    }
  ];

  /* a page with no tour of its own still gets something sensible */
  const FALLBACK = [
    {
      find: [".calc-sides", ".dime-inputs", ".rates", ".wd-fields", ".field-grid", ".fb-terms", ".ask", ".calc"],
      t: "Start with these",
      b: "Only the questions this tool really needs are on screen. Type over any of them \u2014 there is no Calculate button, the answer keeps up."
    },
    {
      find: [".bn-a", ".ans-copy", "#ansHeadline", ".verdict", ".results", ".banner", ".answer"],
      t: "This is the answer",
      b: "One number, in plain words, that moves the moment you change anything above."
    }
  ];

  function vis(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 5 || r.height < 5) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
  }

  function target(step) {
    for (let i = 0; i < step.find.length; i++) {
      const el = document.querySelector(step.find[i]);
      if (el && vis(el)) return el;
    }
    return null;
  }

  let box = null, card = null, live = [], queue = [], at = 0;

  /* whatever order they were written in, walk down the page */
  function order(list) {
    return list.slice().sort(function (x, y) {
      const ex = target(x), ey = target(y);
      if (!ex || !ey) return 0;
      const rel = ex.compareDocumentPosition(ey);
      if (rel & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (rel & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }

  function place() {
    if (!box || !card) return;
    const step = live[at];
    if (!step) { stop(); return; }
    const el = target(step);
    if (!el) { next(); return; }

    /* instant, not smooth: a rect measured mid-animation puts the card off screen */
    el.scrollIntoView({ block: "center" });
    setTimeout(function () {
      if (!box || !card) return;
      const raw = el.getBoundingClientRect();
      const pad = step.spot === "tight" ? 8 : 12;
      /* a section taller than the screen cannot be "highlighted" — spotlight
         the top of it, which is the part they are looking at anyway */
      const cap = window.innerHeight * 0.62;
      const r = {
        top: raw.top, left: raw.left, width: raw.width,
        height: Math.min(raw.height, cap),
        bottom: raw.top + Math.min(raw.height, cap)
      };
      box.style.top = (r.top - pad) + "px";
      box.style.left = (r.left - pad) + "px";
      box.style.width = (r.width + pad * 2) + "px";
      box.style.height = (r.height + pad * 2) + "px";
      box.setAttribute("data-show", "1");

      card.querySelector(".tr-step").textContent = (at + 1) + " of " + live.length;
      card.querySelector(".tr-t").textContent = step.t;
      card.querySelector(".tr-b").textContent = step.b;
      card.querySelector(".tr-next").textContent = at === live.length - 1 ? "Got it" : "Next";

      card.style.visibility = "hidden";
      card.setAttribute("data-show", "1");
      const cw = card.offsetWidth, ch = card.offsetHeight;
      const below = window.innerHeight - r.bottom;
      let top = below > ch + 26 ? r.bottom + 14 : Math.max(12, r.top - ch - 14);
      let left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), window.innerWidth - cw - 12);
      top = Math.max(12, Math.min(top, window.innerHeight - ch - 12));
      card.style.top = top + "px";
      card.style.left = left + "px";
      card.style.visibility = "";
    }, 90);
  }

  function next() {
    const done = live[at];
    at++;
    if (done && done.act) {
      try { done.act(); } catch (e) {}
      /* whatever that revealed may have steps of its own waiting */
      setTimeout(function () {
        if (!card) return;
        const seen = live.slice(0, at);
        const rest = queue.filter(function (s) {
          return seen.indexOf(s) < 0 && !!target(s);
        });
        live = seen.concat(order(rest));
        if (at >= live.length) { stop(); return; }
        place();
      }, 240);
      return;
    }
    if (at >= live.length) { stop(); return; }
    place();
  }

  function stop() {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    if (box) box.remove();
    if (card) card.remove();
    document.documentElement.classList.remove("tr-on");
    box = card = null;
  }

  function start() {
    const own = ownSteps();
    queue = (own.length ? own : FALLBACK).concat(SHARED);
    live = order(queue.filter(function (s) { return !!target(s); }));
    if (live.length < 2) return;
    at = 0;

    box = document.createElement("div");
    box.className = "tr-spot";
    document.body.appendChild(box);

    card = document.createElement("div");
    card.className = "tr-card";
    card.setAttribute("role", "dialog");
    card.innerHTML =
      '<span class="tr-step"></span><b class="tr-t"></b><p class="tr-b"></p>' +
      '<div class="tr-acts"><button type="button" class="tr-skip">Skip</button>' +
      '<button type="button" class="tr-next">Next</button></div>';
    document.body.appendChild(card);
    document.documentElement.classList.add("tr-on");

    card.querySelector(".tr-next").addEventListener("click", next);
    card.querySelector(".tr-skip").addEventListener("click", stop);
    box.addEventListener("click", next);
    document.addEventListener("keydown", function (e) {
      if (!card) return;
      if (e.key === "Escape") stop();
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); }
    });
    let rt = null;
    const again = function () {
      if (!card) return;
      clearTimeout(rt);
      rt = setTimeout(place, 140);
    };
    window.addEventListener("resize", again);
    window.addEventListener("scroll", again, { passive: true });

    place();
  }

  function boot() {
    if (document.body.getAttribute("data-page") !== "app") return;
    if (!document.querySelector(".tool-wrap")) return;

    /* always available, whether or not it has run */
    /* A way in that can actually be seen. Buried in an overflow menu it may
       as well not exist — which is exactly what happened. */
    const bar = document.querySelector(".tool-topbar .topbar-right") ||
                document.querySelector(".tool-topbar");
    if (bar) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tr-replay";
      b.setAttribute("aria-label", "How to use this tool");
      b.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/>' +
        '<path d="M9.8 9.5a2.3 2.3 0 1 1 2.9 2.2v1.4"/><path d="M12.6 16.4h.01"/></svg>' +
        "<span>How to use this</span>";
      b.addEventListener("click", function () { start(); });
      bar.insertBefore(b, bar.firstChild);
    }

    /* and keep the menu entry for anyone who looks there */
    const menu = document.getElementById("moreMenu");
    if (menu) {
      const m = document.createElement("button");
      m.type = "button";
      m.textContent = "How to use this tool";
      m.addEventListener("click", function () {
        menu.hidden = true;
        setTimeout(start, 60);
      });
      menu.insertBefore(m, menu.firstChild);
    }

    let seen = true;
    try { seen = !!localStorage.getItem(KEY); } catch (e) { seen = true; }
    /* let the tool draw its first answer, and the guide button appear */
    if (!seen) setTimeout(start, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
