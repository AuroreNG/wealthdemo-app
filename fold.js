/* ============================================================
   WEALTHDEMO — the fold

   Every tool leads with the calculator: the inputs, the answer,
   and the one picture that carries it. Everything that explains,
   breaks down or qualifies that answer sits behind a fold and
   opens when it's wanted.

   A section opts in with one attribute:

     <section data-fold="The monthly breakdown"
              data-fold-note="Line by line, both sides">

   Nothing else changes. The node keeps its id and its children,
   so the tool's own script never knows it moved.
   ============================================================ */
(function () {
  const KEY = "wealthdemo.folds." + (location.pathname.split("/").pop() || "index");

  function openSet() {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
    catch (e) { return new Set(); }
  }
  function remember(set) {
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(set))); } catch (e) {}
  }

  const chevron =
    '<svg class="fold-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

  function build() {
    const open = openSet();
    const nodes = Array.prototype.slice.call(document.querySelectorAll("[data-fold]"));

    nodes.forEach(function (sec, k) {
      if (sec.closest(".fold")) return;                 /* already wrapped */

      const title = sec.getAttribute("data-fold") || "More";
      const note = sec.getAttribute("data-fold-note") || "";
      const id = sec.id || ("fold" + k);

      const d = document.createElement("details");
      d.className = "fold" + (sec.hasAttribute("data-fold-quiet") ? " is-quiet" : "");
      d.dataset.foldId = id;
      /* an explicit default wins the first time; after that the person's own choice does */
      d.open = open.size ? open.has(id) : sec.hasAttribute("data-fold-open");

      const sum = document.createElement("summary");
      sum.className = "fold-head";
      sum.innerHTML =
        '<span class="fold-copy"><b></b>' + (note ? "<small></small>" : "") + "</span>" +
        '<span class="fold-more"><i>Open</i>' + chevron + "</span>";
      sum.querySelector("b").textContent = title;
      if (note) sum.querySelector("small").textContent = note;

      const body = document.createElement("div");
      body.className = "fold-body";

      sec.parentNode.insertBefore(d, sec);
      d.appendChild(sum);
      d.appendChild(body);
      body.appendChild(sec);

      d.addEventListener("toggle", function () {
        const s = openSet();
        if (d.open) s.add(id); else s.delete(id);
        /* once anyone touches a fold, the remembered set is the source of truth */
        if (!s.size) s.add("__none__");
        remember(s);
        sum.querySelector(".fold-more i").textContent = d.open ? "Close" : "Open";
      });
      sum.querySelector(".fold-more i").textContent = d.open ? "Close" : "Open";
    });

    /* group consecutive folds so they read as one stack */
    document.querySelectorAll(".fold").forEach(function (f) {
      const prev = f.previousElementSibling;
      if (prev && prev.classList.contains("fold")) f.classList.add("is-stacked");
    });
  }

  /* printing should never hide anything */
  let reopen = [];
  window.addEventListener("beforeprint", function () {
    reopen = [];
    document.querySelectorAll(".fold").forEach(function (d) {
      if (!d.open) { reopen.push(d); d.open = true; }
    });
  });
  window.addEventListener("afterprint", function () {
    reopen.forEach(function (d) { d.open = false; });
    reopen = [];
  });

  /* an explain popover opening inside a closed fold would have nowhere to go */
  window.WD = window.WD || {};
  window.WD.openFoldFor = function (el) {
    const d = el && el.closest && el.closest(".fold");
    if (d && !d.open) d.open = true;
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
