/* ============================================================
   WEALTHDEMO — Family Bank Goal Calculator

   Their model, kept exactly:

     One account. A fixed amount goes in every month and grows at a
     fixed rate, compounded monthly. Each goal is measured
     against what that account is worth in its target year — nothing
     is taken out along the way.

     value(y) = monthly · ((1+r)^(12y) − 1) / r,   r = rate/12

   Checked against their page: $1,500 a month at 5% gives
   $79,522 at year 4, $176,611 at year 8 and $616,551 at year 20,
   with $360,000 set aside. All four match to the dollar.

   One thing is added, and it is kept separate from their
   figures: a second pass that actually spends each goal in the
   year it arrives, so the later goals are measured against what
   would really be left. On their own example that is the
   difference between "on track" three times over and finishing
   $48,187 short.
   ============================================================ */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const usd = function (n) { return money.format(Math.round(n)); };

  const KEY = "wealthdemo.tool.family";

  const TERMS = [
    { k: "s", tag: "Short term", span: "1&ndash;5 Years", tint: "a" },
    { k: "m", tag: "Mid term", span: "5&ndash;10 Years", tint: "b" },
    { k: "l", tag: "Long term", span: "10+ Years", tint: "c" }
  ];

  const START = {
    s: { goal: "Buy a car", amt: 25000, year: 4 },
    m: { goal: "Grow my business", amt: 60000, year: 8 },
    l: { goal: "Retirement & legacy", amt: 500000, year: 20 },
    monthly: 1500,
    rate: 5
  };

  let S = null;

  /* ---------- the model ---------- */

  /* what a steady monthly amount is worth after y years, compounded monthly */
  function value(monthly, ratePct, years, start) {
    const r = ratePct / 100 / 12;
    const n = Math.round(years * 12);
    const s = start || 0;
    if (n <= 0) return s;
    if (r === 0) return s + monthly * n;
    const g = Math.pow(1 + r, n);
    return s * g + monthly * (g - 1) / r;
  }

  function work() {
    const rows = TERMS.map(function (t) {
      const g = S[t.k];
      const v = value(S.monthly, S.rate, g.year);
      return {
        k: t.k, tag: t.tag, tint: t.tint,
        goal: g.goal, amt: g.amt, year: g.year,
        value: v,
        ok: v >= g.amt,
        short: Math.max(0, g.amt - v)
      };
    });

    const horizon = Math.max.apply(null, rows.map(function (r) { return r.year; }));
    const put = S.monthly * 12 * horizon;
    const end = value(S.monthly, S.rate, horizon);

    /* the second pass: spend each goal in the year it lands */
    const order = rows.slice().sort(function (a, b) { return a.year - b.year; });
    let bal = 0, last = 0;
    const spent = order.map(function (r) {
      bal = value(S.monthly, S.rate, Math.max(0, r.year - last), bal);
      const before = bal;
      const covered = bal >= r.amt;
      bal = Math.max(0, bal - r.amt);
      last = r.year;
      return { row: r, before: before, covered: covered, gap: Math.max(0, r.amt - before), after: bal };
    });

    const longRow = rows[2];
    const realLong = spent[spent.length - 1];

    return {
      rows: rows, horizon: horizon, put: put, end: end,
      goalLong: longRow.amt,
      spent: spent,
      leftOver: bal,
      /* how the long-term goal looks once the earlier ones are actually paid for */
      realShort: realLong && !realLong.covered ? realLong.gap : 0,
      allOk: rows.every(function (r) { return r.ok; })
    };
  }

  /* ---------- the picture: one track, three markers ---------- */
  function track(f) {
    const W = 760, H = 168, L = 48, R = 30, T = 48, B = 40;
    const iw = W - L - R, ih = H - T - B;
    const top = Math.max(f.end, 1);
    const yrs = f.horizon || 1;
    const x = function (y) { return L + iw * (y / yrs); };
    const y = function (v) { return T + ih - ih * (v / top); };

    let d = "";
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const yr = yrs * i / steps;
      d += (i ? "L" : "M") + x(yr).toFixed(1) + " " + y(value(S.monthly, S.rate, yr)).toFixed(1);
    }
    const area = d + "L" + x(yrs).toFixed(1) + " " + y(0) + "L" + L + " " + y(0) + "Z";

    let marks = "";
    f.rows.slice().sort(function (a, b) { return a.year - b.year; }).forEach(function (r, i) {
      const px = x(r.year), py = y(r.value);
      const flip = px > L + iw * 0.72;
      marks +=
        '<line class="fb-tick" x1="' + px.toFixed(1) + '" y1="' + (T - 6) + '" x2="' + px.toFixed(1) + '" y2="' + y(0) + '"/>' +
        '<circle class="fb-dot" data-tint="' + r.tint + '" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5"/>' +
        '<text class="fb-mark" x="' + (flip ? px - 9 : px + 9).toFixed(1) + '" y="' + Math.max(16, py - 13).toFixed(1) +
        '" text-anchor="' + (flip ? "end" : "start") + '">' + esc(r.goal || r.tag) + "</text>" +
        '<text class="fb-markyr" x="' + px.toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle">Year ' + r.year + "</text>";
    });

    return '<svg class="fb-svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img" ' +
      'data-cs-scale="' + y(0).toFixed(2) + ',0,' + y(top).toFixed(2) + ',' + top.toFixed(2) + '" ' +
      'aria-label="What the account is worth in each goal year">' +
      '<path class="fb-area" d="' + area + '"/>' +
      '<path class="fb-line" d="' + d + '"/>' +
      marks +
      '<text class="fb-ax" x="' + (L - 8) + '" y="' + (T + 4) + '" text-anchor="end">' + short(f.end) + "</text>" +
      '<text class="fb-ax" x="' + (L - 8) + '" y="' + (y(0) + 4) + '" text-anchor="end">$0</text>' +
      "</svg>";
  }

  function short(n) {
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + "m";
    if (n >= 1e3) return "$" + Math.round(n / 1e3) + "k";
    return usd(n);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- paint ---------- */
  const LAST = {};
  function redraw(el, html) {
    if (!el || LAST[el.id] === html) return;
    LAST[el.id] = html;
    el.innerHTML = html;
  }

  function run() {
    const f = work();

    /* the banner answer */
    $("bnLabel").textContent = "Est. accumulated value at year " + f.horizon;
    $("bnBig").textContent = usd(f.end);
    $("bnSub").textContent = usd(f.put) + " of it is money you set aside; the rest is growth on this assumption.";

    $("roadLead").textContent =
      "Based on " + usd(S.monthly) + " per month and your chosen " + trim(S.rate) +
      "% annual growth assumption.";

    /* the three goal cards */
    redraw($("goalCards"), f.rows.map(function (r) {
      return '<article class="fb-card" data-tint="' + r.tint + '">' +
        "<small>Year " + r.year + "</small>" +
        "<h3>" + esc(r.goal || r.tag) + "</h3>" +
        "<b>" + usd(r.amt) + "</b>" +
        "<em>Estimated accumulated value</em>" +
        "<strong>" + usd(r.value) + "</strong>" +
        '<span class="fb-pill" data-ok="' + (r.ok ? "1" : "0") + '">' +
        (r.ok ? "On track in this estimate" : usd(r.short) + " short in this estimate") +
        "</span></article>";
    }).join(""));

    /* the strip */
    $("stripPut").textContent = usd(f.put);
    $("stripEnd").textContent = usd(f.end);
    $("stripGoal").textContent = usd(f.goalLong);

    redraw($("trackWrap"), track(f));

    /* the second pass */
    redraw($("spentRows"), f.spent.map(function (s) {
      return '<li data-ok="' + (s.covered ? "1" : "0") + '">' +
        "<span>Year " + s.row.year + " &middot; " + esc(s.row.goal || s.row.tag) + "</span>" +
        "<i>" + usd(s.before) + " in the account</i>" +
        "<em>less " + usd(s.row.amt) + "</em>" +
        "<b>" + usd(s.after) + " left</b></li>";
    }).join(""));

    const realLong = f.spent[f.spent.length - 1];
    $("spentLead").textContent = f.allOk && f.realShort > 0
      ? "Each goal on its own is covered. But it is one account — spend the earlier goals when they arrive and the last one comes up " +
        usd(f.realShort) + " short."
      : f.realShort > 0
        ? "Spending each goal as it arrives leaves the last one " + usd(f.realShort) + " short."
        : "Even after paying for every goal as it arrives, " + usd(f.leftOver) + " is still there at the end.";

    $("spentBadge").textContent = f.realShort > 0 ? usd(f.realShort) + " short" : usd(f.leftOver) + " left over";
    $("spentBadge").setAttribute("data-ok", f.realShort > 0 ? "0" : "1");

    save();
  }

  function trim(n) {
    return String(Math.round(n * 100) / 100);
  }

  /* ---------- wiring ---------- */
  function read() {
    TERMS.forEach(function (t) {
      S[t.k].goal = $("g_" + t.k).value;
      S[t.k].amt = Math.max(0, parseFloat($("a_" + t.k).value) || 0);
      S[t.k].year = Math.max(1, Math.min(60, parseFloat($("y_" + t.k).value) || 1));
    });
    S.monthly = Math.max(0, parseFloat($("fMonthly").value) || 0);
    S.rate = Math.max(0, Math.min(20, parseFloat($("fRate").value) || 0));
  }

  function write() {
    TERMS.forEach(function (t) {
      $("g_" + t.k).value = S[t.k].goal;
      $("a_" + t.k).value = S[t.k].amt;
      $("y_" + t.k).value = S[t.k].year;
    });
    $("fMonthly").value = S.monthly;
    $("fRate").value = S.rate;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  function load() {
    S = JSON.parse(JSON.stringify(START));
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && v.s && v.m && v.l) S = v;
    } catch (e) {}
  }

  function start() {
    load();
    write();

    document.querySelectorAll(".fb-in input").forEach(function (el) {
      el.addEventListener("input", function () { read(); run(); });
      el.addEventListener("change", function () { read(); write(); run(); });
    });

    $("roadBtn").addEventListener("click", function () {
      const r = document.querySelector(".fb-results");
      if (r) r.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const reset = function () {
      S = JSON.parse(JSON.stringify(START));
      write();
      run();
    };
    ["resetBtn", "resetBtn2"].forEach(function (id) {
      const b = $(id);
      if (b) b.addEventListener("click", reset);
    });

    run();
    window.addEventListener("resize", function () { run(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
