/* ============================================================
   WEALTHDEMO — giving a calculator page its shape

   Every tool page was one tall column: questions, then the
   answer, then the chart. So the moment anybody changed a figure
   the thing it changed was off the bottom of the screen, and the
   money boxes were as wide as the browser.

   This file rearranges what is already there. It moves nodes; it
   does not rebuild them, so every reference held by app.js,
   insight.js, chartsay.js and the rest still points at the same
   element. app.js and app.css are not touched, and never are.

   Three jobs:

     1 · the answer moves into a rail beside the questions and
         stays on screen while you type
     2 · money inputs get a line underneath saying the same
         number in words — the input itself keeps its raw digits,
         because withdraw.js and its siblings parse it with
         parseFloat and a comma would quietly break them
     3 · the Guide docks in that rail, behind a tab

   A page that has no answer section is left exactly as it was.
   ============================================================ */
(function () {
  "use strict";

  const wrap = document.querySelector(".tool-wrap");
  if (!wrap) return;

  const ask = wrap.querySelector(".panel.wd-ask, .panel.ask-panel, [data-calc-ask]");
  const answer = wrap.querySelector(".answer");
  if (!ask || !answer) return;

  /* ------------------------------------------------------------
     Tell simple mode this section exists.

     simple.js keeps the sections a tool's plan names and hides
     every other child of .tool-wrap. The wrapper built below is a
     new child it has never heard of, so without this line it is
     hidden the moment Simple is switched on — taking the
     questions and the answer with it.

     The plan is amended rather than simple.js, so each page that
     gets this treatment declares its own wrapper and nothing has
     to know in advance which pages those are.
     ------------------------------------------------------------ */
  const SLUG = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "");
  const plan = (window.WD_SIMPLE || {})[SLUG];
  if (plan && plan.keep && plan.keep.indexOf(".calc-split") < 0) plan.keep.push(".calc-split");

  /* ============================================================
     1 · questions on the left, answer on the right
     ============================================================ */
  const split = document.createElement("div");
  split.className = "calc-split";
  split.innerHTML = '<div class="calc-ask"></div><aside class="calc-rail"></aside>';
  ask.parentNode.insertBefore(split, ask);

  const askCol = split.querySelector(".calc-ask");
  const rail = split.querySelector(".calc-rail");

  askCol.appendChild(ask);

  rail.innerHTML =
    '<div class="calc-tabs" role="tablist">' +
      '<button type="button" class="calc-tab" role="tab" id="calcTabA" aria-selected="true" aria-controls="calcPaneA">The answer</button>' +
      '<button type="button" class="calc-tab" role="tab" id="calcTabG" aria-selected="false" aria-controls="calcPaneG" hidden>Guide <i></i></button>' +
    "</div>" +
    '<div class="calc-pane" id="calcPaneA" role="tabpanel" aria-labelledby="calcTabA"></div>' +
    '<div class="calc-pane gd-pane" id="calcPaneG" role="tabpanel" aria-labelledby="calcTabG" hidden></div>';

  /* ------------------------------------------------------------
     Only the answer goes in the rail.

     The first version put the diagnosis in there too, and the rail
     came out as tall as the screen — which quietly undid the one
     thing it was built for. A sticky element can only travel
     inside its own container, and the container is as tall as its
     tallest column; a rail that IS the tallest column has nowhere
     to travel and scrolls away like anything else.

     So the rail holds the headline, the shortfall, the timeline
     and the three figures, and stops. The diagnosis stays exactly
     where this tool's own plan put it — a child of .tool-wrap, so
     simple.js can still fold it away in Simple mode, which it
     could not do once it was nested in here.
     ------------------------------------------------------------ */
  const paneA = rail.querySelector("#calcPaneA");
  paneA.appendChild(answer);

  /* ------------------------------------------------------------
     And the left column takes everything else the tool keeps on
     screen — the chart, chiefly. That makes the left column the
     long one, which is what gives the rail room to stay put while
     you scroll the picture that produced it.

     Sections the plan does not keep are left where they are, so
     they stay children of .tool-wrap and stay foldable. Relative
     order is preserved on both sides.
     ------------------------------------------------------------ */
  const keeps = (plan && plan.keep) || [];
  const movable = function (n) {
    return n && n.tagName !== "FOOTER" && !n.classList.contains("tool-topbar") &&
      !n.classList.contains("sm-bar") &&
      keeps.some(function (sel) { return sel !== ".calc-split" && n.matches(sel); });
  };
  let after = split.nextElementSibling;
  while (after) {
    const nx = after.nextElementSibling;
    if (movable(after)) askCol.appendChild(after);
    after = nx;
  }

  /* ------------------------------------------------------------
     How far down the rail has to start.

     The site header is sticky at the top of every page, so a rail
     pinned to 0 slides underneath it — taking its own tabs with
     it, and the Guide tab is the only way into the Guide. The
     header's height is not a constant: it shrinks on a phone, and
     the agent bar can change it. So it is measured, published as
     a custom property, and measured again when the window moves.
     ------------------------------------------------------------ */
  const nav = document.querySelector(".site-nav");
  function navHeight() {
    const h = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--wd-nav-h", (h || 74) + "px");
  }
  navHeight();
  window.addEventListener("resize", navHeight);
  window.addEventListener("load", navHeight);

  const tabA = rail.querySelector("#calcTabA");
  const tabG = rail.querySelector("#calcTabG");
  const paneG = rail.querySelector("#calcPaneG");

  function show(which) {
    const guide = which === "guide";
    tabA.setAttribute("aria-selected", guide ? "false" : "true");
    tabG.setAttribute("aria-selected", guide ? "true" : "false");
    paneA.hidden = guide;
    paneG.hidden = !guide;
  }
  tabA.addEventListener("click", function () { show("answer"); });
  tabG.addEventListener("click", function () { show("guide"); });

  /* ============================================================
     2 · the number, in words

     The input keeps "520000" because that is what the page's own
     parser expects. Underneath it, quietly, "$520,000".
     ============================================================ */
  const M0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  function isMoney(input, label) {
    if (input.closest(".money-in")) return true;
    const t = (label || "").toLowerCase();
    return /\(\$\)|\$|amount|income|savings|saved|balance|cost|price|value|premium|benefit/.test(t);
  }

  function echoFor(input) {
    let e = input.parentNode.querySelector(":scope > .calc-echo");
    if (!e) {
      e = document.createElement("span");
      e.className = "calc-echo";
      e.setAttribute("aria-hidden", "true");   /* the field already says it */
      input.parentNode.insertBefore(e, input.nextSibling);
    }
    return e;
  }

  const echoes = [];
  askCol.querySelectorAll("label[for]").forEach(function (l) {
    const input = document.getElementById(l.getAttribute("for"));
    if (!input || input.tagName !== "INPUT") return;
    if (/slide$/i.test(input.id)) return;
    const label = (l.textContent || "").replace(/\s+/g, " ").trim();
    if (!isMoney(input, label)) return;
    const e = echoFor(input);
    const paint = function () {
      const n = parseFloat(String(input.value).replace(/[^0-9.\-]/g, ""));
      e.textContent = isFinite(n) && n !== 0 ? M0.format(n) : "";
    };
    input.addEventListener("input", paint);
    echoes.push(paint);
    paint();
  });

  /* anything that changes an input from code — a preset, the Blueprint,
     the assistant running a what-if — should move the echo too */
  document.addEventListener("wd:recalc", function () { echoes.forEach(function (f) { f(); }); });
  const repaint = function () { echoes.forEach(function (f) { f(); }); };
  setInterval(repaint, 900);

  /* and if simple mode got there first, undo its verdict on this one */
  function unhide() {
    if (split.getAttribute("data-sm") === "hide") split.removeAttribute("data-sm");
  }
  unhide();
  document.addEventListener("wd:simple", unhide);
  setTimeout(unhide, 0);
  setTimeout(unhide, 400);

  window.WD_CALC = {
    rail: rail,
    guidePane: paneG,
    guideTab: tabG,
    show: show,
    /* the Guide calls this once it knows how much it has to say */
    setGuideCount: function (n) {
      tabG.hidden = !n;
      const i = tabG.querySelector("i");
      if (i) i.textContent = n;
    }
  };
})();
