/* ============================================================
   WEALTHDEMO — Carrier Navigator, screen
   Intake  →  screen  →  exact next action  →  case file
   ============================================================ */
(function () {
  const N = window.WD && window.WD.nav;
  const $ = function (id) { return document.getElementById(id); };
  if (!N || !$("intake")) return;

  const usd = N.usd;
  let list = N.load();

  const CASE = {
    path: "life", state: "TX", age: 45, amount: 500000,
    conditions: [],
    annuity: { funding: "", liquid: "", horizon: "", income: "" },
    existing: ""
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- intake ---------- */
  function buildIntake() {
    const pathWrap = $("pathGrid");
    N.PATHS.forEach(function (p) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "need-card" + (p.id === CASE.path ? " on" : "");
      b.innerHTML = '<b></b><small></small>';
      b.querySelector("b").textContent = p.label;
      b.querySelector("small").textContent = p.sub;
      b.addEventListener("click", function () {
        CASE.path = p.id;
        pathWrap.querySelectorAll(".need-card").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        run();
      });
      pathWrap.appendChild(b);
    });

    const cond = $("condRow");
    N.CONDITIONS.forEach(function (x) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "flag-chip";
      b.textContent = x.label;
      b.addEventListener("click", function () {
        const i = CASE.conditions.indexOf(x.id);
        if (i > -1) CASE.conditions.splice(i, 1); else CASE.conditions.push(x.id);
        b.classList.toggle("on", CASE.conditions.indexOf(x.id) > -1);
        run();
      });
      cond.appendChild(b);
    });

    const st = $("cState");
    ("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND " +
     "OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC").split(" ").forEach(function (s) {
      const o = document.createElement("option");
      o.value = s; o.textContent = s;
      if (s === CASE.state) o.selected = true;
      st.appendChild(o);
    });

    $("cAge").value = CASE.age;
    $("cAmount").value = CASE.amount;

    ["cAge", "cAmount", "cState", "cExisting", "aFunding", "aLiquid", "aHorizon", "aIncome"].forEach(function (id) {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", read);
      el.addEventListener("change", read);
    });
  }

  function read() {
    CASE.age = parseInt($("cAge").value, 10) || 0;
    CASE.amount = parseFloat($("cAmount").value) || 0;
    CASE.state = $("cState").value;
    CASE.existing = $("cExisting").value;
    CASE.annuity.funding = $("aFunding").value;
    CASE.annuity.liquid = $("aLiquid").value;
    CASE.annuity.horizon = $("aHorizon").value;
    CASE.annuity.income = $("aIncome").value;
    run();
  }

  /* ---------- carrier card ---------- */
  function statusPill(status) {
    const s = N.STATUS[status] || N.STATUS.guide;
    return '<span class="status-pill" data-tone="' + s.tone + '">' + esc(s.label) + '</span>';
  }

  function card(res) {
    const c = res.carrier;
    const s = N.STATUS[c.status] || N.STATUS.guide;
    const el = document.createElement("article");
    el.className = "nav-card" + (res.checks.some(function (x) { return x.ok; }) ? " is-clear" : "");

    el.innerHTML =
      '<div class="nc-head">' +
        '<div class="nc-name"><b></b><small></small></div>' +
        statusPill(c.status) +
      '</div>' +
      '<p class="nc-rule"></p>' +
      '<div class="nc-checks"></div>' +
      '<details class="nc-more"><summary>What the carrier publishes</summary>' +
        '<p class="nc-verified"></p>' +
        '<div class="nc-focus"></div>' +
      '</details>' +
      '<div class="nc-action">' +
        '<span class="na-title">Exact next action</span>' +
        '<p></p>' +
        '<div class="na-foot"><a class="na-src" target="_blank" rel="noopener noreferrer"></a><span class="na-as"></span></div>' +
      '</div>';

    el.querySelector(".nc-name b").textContent = c.name;
    el.querySelector(".nc-name small").textContent = c.use;
    el.querySelector(".nc-rule").textContent = c.ruleType + " — " + s.note;
    el.querySelector(".nc-verified").textContent = c.verified;

    const focus = el.querySelector(".nc-focus");
    c.focus.forEach(function (f) {
      const sp = document.createElement("span");
      sp.className = "focus-chip";
      sp.textContent = f;
      focus.appendChild(sp);
    });

    const checks = el.querySelector(".nc-checks");
    res.checks.forEach(function (ck) {
      const d = document.createElement("div");
      d.className = "check" + (ck.ok ? " ok" : " no");
      d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        (ck.ok ? '<path d="m5 12.5 4.5 4.5L19 7.5"/>' : '<path d="M12 7v7"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/>') +
        '</svg><div><b></b><span></span></div>';
      d.querySelector("b").textContent = ck.title;
      d.querySelector("span").textContent = ck.detail;
      checks.appendChild(d);
    });
    res.notes.forEach(function (n) {
      const d = document.createElement("div");
      d.className = "check info";
      d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6h.01"/></svg><div><span></span></div>';
      d.querySelector("span").textContent = n;
      checks.appendChild(d);
    });
    res.blockers.forEach(function (bk) {
      const d = document.createElement("div");
      d.className = "check no";
      d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg><div><b></b></div>';
      d.querySelector("b").textContent = bk;
      checks.appendChild(d);
    });
    if (!checks.children.length) {
      const d = document.createElement("div");
      d.className = "check info";
      d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6h.01"/></svg>' +
        '<div><span>No published limit to screen against. The guide decides this one.</span></div>';
      checks.appendChild(d);
    }

    el.querySelector(".nc-action p").textContent = c.nextAction;
    const src = el.querySelector(".na-src");
    if (c.source) { src.href = c.source; src.textContent = c.source.replace(/^https?:\/\//, "").replace(/\/$/, ""); }
    else src.remove();
    el.querySelector(".na-as").textContent = c.asOf ? "As of " + c.asOf : "";

    return el;
  }

  /* ---------- render ---------- */
  function run() {
    const out = N.navigate(list, CASE);
    const path = N.PATHS.find(function (p) { return p.id === CASE.path; });

    $("annuityBlock").hidden = out.kind !== "annuity";
    $("lifeBlock").hidden = out.kind === "annuity";

    const grid = $("navGrid");
    grid.innerHTML = "";
    out.inPath.forEach(function (r) { grid.appendChild(card(r)); });
    out.blocked.forEach(function (r) { grid.appendChild(card(r)); });

    const n = out.inPath.length + out.blocked.length;
    $("navCount").textContent = n + (n === 1 ? " carrier documented for " : " carriers documented for ") + path.label.toLowerCase();

    /* capture list */
    const caps = N.captureList(CASE.conditions);
    const capWrap = $("captureList");
    capWrap.innerHTML = "";
    caps.forEach(function (x) {
      const li = document.createElement("li");
      li.innerHTML = '<b></b><span></span>';
      li.querySelector("b").textContent = x.label;
      li.querySelector("span").textContent = x.capture;
      capWrap.appendChild(li);
    });
    $("captureBlock").hidden = caps.length === 0;
    $("captureCount").textContent = caps.length;

    /* undocumented roster */
    const rosterWrap = $("rosterList");
    rosterWrap.innerHTML = "";
    out.undocumented.forEach(function (r) {
      const sp = document.createElement("span");
      sp.className = "unset-chip";
      sp.textContent = r.carrier.name;
      rosterWrap.appendChild(sp);
    });
    $("rosterCount").textContent = out.undocumented.length;

    /* off path */
    const offWrap = $("offList");
    offWrap.innerHTML = "";
    out.offPath.forEach(function (r) {
      const li = document.createElement("li");
      li.innerHTML = '<b></b><span></span>';
      li.querySelector("b").textContent = r.carrier.name;
      li.querySelector("span").textContent = r.carrier.use;
      offWrap.appendChild(li);
    });
    $("offBlock").hidden = out.offPath.length === 0;
    $("offCount").textContent = out.offPath.length;

    $("navEmpty").hidden = n > 0;

    if (window.WD.applyRole) window.WD.applyRole();
  }

  /* ---------- case file ---------- */
  function caseFile() {
    const path = N.PATHS.find(function (p) { return p.id === CASE.path; });
    const out = N.navigate(list, CASE);
    const who = window.WD.clientName() || "Client";
    const lines = [];

    lines.push("PRE-SCREENING RECORD — " + who);
    lines.push("Run " + new Date().toLocaleString("en-US"));
    lines.push("");
    lines.push("CASE");
    lines.push("  Product path: " + path.label);
    lines.push("  State of residence: " + CASE.state);
    lines.push("  Age: " + CASE.age);
    lines.push("  Coverage amount or premium: " + usd(CASE.amount));
    if (CASE.existing) lines.push("  Existing and pending coverage: " + CASE.existing);

    if (path.kind === "annuity") {
      lines.push("  Funding source: " + (CASE.annuity.funding || "not captured"));
      lines.push("  Liquid assets after purchase: " + (CASE.annuity.liquid || "not captured"));
      lines.push("  Time horizon / surrender period: " + (CASE.annuity.horizon || "not captured"));
      lines.push("  Income need and risk tolerance: " + (CASE.annuity.income || "not captured"));
    }

    const caps = N.captureList(CASE.conditions);
    lines.push("");
    lines.push("FLAGGED — CAPTURE BEFORE QUOTING");
    if (!caps.length) lines.push("  None flagged.");
    caps.forEach(function (x) { lines.push("  " + x.label + ": " + x.capture); });

    lines.push("");
    lines.push("CARRIERS IN THIS PATH");
    out.inPath.concat(out.blocked).forEach(function (r) {
      const c = r.carrier;
      const s = N.STATUS[c.status] || N.STATUS.guide;
      lines.push("");
      lines.push("  " + c.name + " — " + s.label);
      lines.push("    Rule type: " + c.ruleType);
      r.checks.forEach(function (ck) { lines.push("    " + (ck.ok ? "[pass] " : "[check] ") + ck.title + " — " + ck.detail); });
      r.notes.forEach(function (n2) { lines.push("    [note] " + n2); });
      r.blockers.forEach(function (b2) { lines.push("    [stop] " + b2); });
      lines.push("    Next action: " + c.nextAction);
      if (c.source) lines.push("    Source: " + c.source + " (as of " + c.asOf + ")");
    });

    if (out.undocumented.length) {
      lines.push("");
      lines.push("NOT YET DOCUMENTED (" + out.undocumented.length + " partners): " +
                 out.undocumented.map(function (r) { return r.carrier.name; }).join(", "));
    }

    lines.push("");
    lines.push(N.DISCLAIMER);
    return lines.join("\n");
  }

  $("copyCase").addEventListener("click", function () {
    const btn = $("copyCase");
    const old = btn.innerHTML;
    const text = caseFile();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copied — paste into the case file";
        setTimeout(function () { btn.innerHTML = old; }, 2800);
      }, function () {
        btn.textContent = "Copy blocked by the browser";
        setTimeout(function () { btn.innerHTML = old; }, 2200);
      });
    }
  });

  $("printCase").addEventListener("click", function () { window.print(); });

  const nameField = $("clientName");
  if (nameField) {
    nameField.value = window.WD.clientName();
    nameField.addEventListener("input", function () { window.WD.setClientName(nameField.value); });
  }

  document.addEventListener("wd:role", run);

  buildIntake();
  run();
})();
