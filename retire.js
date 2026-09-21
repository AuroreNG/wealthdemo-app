/* ============================================================
   WEALTHDEMO — Retirement Readiness (v69, colour pass v70)

   Bizzall's calculator, rebuilt in the new look. One model:
     accumulate → drawdown → evaluate
   and every answer on the page — the ways to close the gap, the
   tough-markets line, the earliest retirement — is that same
   evaluate() run on a patched copy of the inputs. Nothing is
   modelled twice. The Python reference (retref.py) matches it.
   ============================================================ */
(function () {
  "use strict";
  const KEY = "wealthdemo.retire";

  /* ---------------------------------------------------------
     accounts
     --------------------------------------------------------- */
  const TYPES = {
    "401k":      { label: "401(k) / 403(b)",   tax: "pre",     employer: true },
    "roth401k":  { label: "Roth 401(k)",       tax: "roth",    employer: true },
    "trad":      { label: "Traditional IRA",   tax: "pre" },
    "rothira":   { label: "Roth IRA",          tax: "roth" },
    "hsa":       { label: "HSA",               tax: "roth" },
    "brokerage": { label: "Brokerage",         tax: "taxable" },
    "cash":      { label: "Savings / cash",    tax: "taxable" }
  };
  const TAXWORD = { pre: "Taxed when you take it", roth: "Tax-free", taxable: "Only growth is taxed" };

  const DEFAULT = {
    age: 45, retireAge: 67, planAge: 92, inflation: 2.5, contribGrowth: 2, postReturn: 4,
    goal: 7000, social: 2800, ssAge: 67, other: 500, otherCola: false, taxRate: 15, extra: 0,
    saved: [{ type: "401k", bal: 125000, rate: 6 }, { type: "rothira", bal: 50000, rate: 6.5 }],
    contrib: [{ type: "401k", mo: 900, rate: 6, match: 50, cap: 400 },
              { type: "rothira", mo: 300, rate: 6.5, match: 0, cap: 0 }]
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function patch(s, kw) { return Object.assign(clone(s), kw); }

  /* ---------------------------------------------------------
     the model  (≡ retref.py)
     --------------------------------------------------------- */
  function ssFactor(a) {
    const m = Math.round((a - 67) * 12);
    if (m >= 0) return 1 + Math.min(m, 36) * (2 / 3) / 100;
    const e = -m;
    return 1 - (Math.min(e, 36) * 5 / 9 + Math.max(0, e - 36) * 5 / 12) / 100;
  }

  function accumulate(s) {
    const yrs = Math.max(0, s.retireAge - s.age), n = yrs * 12, g = s.contribGrowth / 100;
    const b = { pre: 0, roth: 0, taxable: 0 };
    const path = new Array(yrs + 1).fill(0);
    function run(bal, mo, match, cap, rate, bucket) {
      const r = rate / 100 / 12;
      let own = bal, emp = 0;
      path[0] += bal;
      for (let m = 0; m < n; m++) {
        const y = Math.floor(m / 12), grow = Math.pow(1 + g, y);
        const c = mo * grow;
        const mt = match ? Math.min(c * match / 100, cap * grow) : 0;
        own = own * (1 + r) + c;
        emp = emp * (1 + r) + mt;
        if ((m + 1) % 12 === 0) path[(m + 1) / 12] += own + emp;
      }
      b[bucket] += own;
      b.pre += emp;
    }
    s.saved.forEach(function (a) { run(a.bal, 0, 0, 0, a.rate, TYPES[a.type].tax); });
    let extraDone = false;
    s.contrib.forEach(function (a) {
      const mo = a.mo + (extraDone ? 0 : s.extra);
      extraDone = true;
      run(0, mo, TYPES[a.type].employer ? a.match : 0, a.cap, a.rate, TYPES[a.type].tax);
    });
    if (!extraDone && s.extra) run(0, s.extra, 0, 0, 6, "taxable");
    return { b: b, path: path };
  }

  function drawdown(s, total, blend, until) {
    until = until || 105;
    const i = s.inflation / 100, post = s.postReturn / 100;
    let bal = total, needed = 0, lasts = null;
    const rows = [];
    const end = Math.max(until, s.planAge);
    for (let a = s.retireAge, k = 0; a < end; a++, k++) {
      const t = a - s.age;
      const need = s.goal * 12 * Math.pow(1 + i, t);
      const ss = a >= s.ssAge ? s.social * 12 * Math.pow(1 + i, t) : 0;
      const oth = s.other * 12 * (s.otherCola ? Math.pow(1 + i, a - s.retireAge) : 1);
      const gross = Math.max(0, need - ss - oth) / (1 - blend);
      if (a < s.planAge) needed += gross / Math.pow(1 + post, k);
      rows.push({ age: a, bal: Math.max(bal, 0), need: need, ss: ss, other: oth, gross: gross });
      if (lasts === null && bal < gross - 1e-6) lasts = a;
      bal = (bal - gross) * (1 + post);
    }
    return { needed: needed, lasts: lasts === null ? until : lasts, rows: rows };
  }

  function evaluate(s) {
    const acc = accumulate(s), b = acc.b;
    const total = b.pre + b.roth + b.taxable;
    const blend = total ? (s.taxRate / 100) * (b.pre + 0.5 * b.taxable) / total : s.taxRate / 100;
    const d = drawdown(s, total, blend);
    return { total: total, buckets: b, blend: blend, needed: d.needed,
             score: d.needed ? total / d.needed : 9.99, lasts: d.lasts, path: acc.path, rows: d.rows };
  }

  function bisect(fn, lo, hi) {
    for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (fn(mid)) lo = mid; else hi = mid; }
    return lo;
  }
  const ok = function (s) { return evaluate(s).score >= 1; };
  function sustainable(s) { return bisect(function (g) { return ok(patch(s, { goal: g })); }, 0, 100000); }
  function suggestedExtra(s) {
    if (ok(s)) return 0;
    return 20000 - bisect(function (x) { return ok(patch(s, { extra: 20000 - x })); }, 0, 20000);
  }
  function laterRetirement(s) {
    for (let R = s.retireAge + 1; R <= Math.min(75, s.planAge - 1); R++) if (ok(patch(s, { retireAge: R }))) return R;
    return null;
  }
  function earliestRetirement(s) {
    let best = null;
    for (let R = s.retireAge - 1; R > s.age; R--) { if (ok(patch(s, { retireAge: R }))) best = R; else break; }
    return best;
  }
  function stressed(s) {
    const t = clone(s);
    t.postReturn -= 1; t.inflation += 1;
    t.saved.concat(t.contrib).forEach(function (a) { a.rate -= 1; });
    return t;
  }
  function claim70(s) {
    if (s.ssAge >= 70) return null;
    return patch(s, { ssAge: 70, social: s.social * ssFactor(70) / ssFactor(s.ssAge) });
  }

  /* exported for the tests and the drift check */
  window.WD = window.WD || {};
  WD.retire = { DEFAULT: DEFAULT, evaluate: evaluate, sustainable: sustainable, suggestedExtra: suggestedExtra,
                laterRetirement: laterRetirement, earliestRetirement: earliestRetirement,
                stressed: stressed, claim70: claim70, ssFactor: ssFactor, state: function () { return S; } };

  /* ---------------------------------------------------------
     state
     --------------------------------------------------------- */
  let S = clone(DEFAULT);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.saved && o.contrib) S = Object.assign(clone(DEFAULT), o); }
  } catch (e) {}
  let VIEW = "today";
  try { VIEW = localStorage.getItem(KEY + ".view") || "today"; } catch (e) {}
  let OPEN = 1;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------------------------------------------------------
     formatting
     --------------------------------------------------------- */
  const $ = function (id) { return document.getElementById(id); };
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(v) { return "$" + Math.round(v).toLocaleString("en-US"); }
  function big(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return "$" + (v / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
    if (a >= 1e4) return "$" + Math.round(v / 1e3) + "k";
    return money(v);
  }
  function pct(v, d) { return (+v).toFixed(d == null ? 1 : d).replace(/\.0$/, "") + "%"; }
  function num(v) { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; }
  function years(n) { return n + " year" + (n === 1 ? "" : "s"); }

  /* ---------------------------------------------------------
     the four steps
     --------------------------------------------------------- */
  const STEPS = [
    { n: 1, title: "Your timeline",     sum: function () { return S.age + " now · retire at " + S.retireAge + " · plan to " + S.planAge; } },
    { n: 2, title: "What's saved",      sum: function () { const t = S.saved.reduce(function (a, x) { return a + x.bal; }, 0); return big(t) + " across " + S.saved.length + " account" + (S.saved.length === 1 ? "" : "s"); } },
    { n: 3, title: "What goes in",      sum: function () { const t = S.contrib.reduce(function (a, x) { return a + x.mo; }, 0); const m = S.contrib.some(function (x) { return TYPES[x.type].employer && x.match; }); return money(t) + " a month" + (m ? " + employer match" : ""); } },
    { n: 4, title: "Living on",         sum: function () { return money(S.goal) + " a month · Social Security " + money(S.social) + " at " + S.ssAge; } }
  ];

  function field(o) {
    /* o: key, label, term, pre, suf, step, min, max, val, hint, path */
    return '<label class="rr-f' + (o.wide ? " is-wide" : "") + '">' +
      '<span class="rr-l">' + (o.term ? '<span data-term="' + o.term + '">' + esc(o.label) + "</span>" : esc(o.label)) + "</span>" +
      '<span class="rr-in">' + (o.pre ? "<i>" + o.pre + "</i>" : "") +
        '<input type="text" inputmode="decimal" data-k="' + o.key + '"' + (o.path ? ' data-path="' + o.path + '"' : "") +
        ' value="' + esc(o.val) + '" aria-label="' + esc(o.label) + '">' +
        (o.suf ? "<i>" + o.suf + "</i>" : "") + "</span>" +
      (o.hint ? '<small class="rr-h">' + o.hint + "</small>" : "") +
    "</label>";
  }
  function slider(key, label, min, max, term) {
    return '<div class="rr-sl">' +
      '<div class="rr-sl-h"><span class="rr-l">' + (term ? '<span data-term="' + term + '">' + label + "</span>" : label) + "</span>" +
      '<output id="o_' + key + '">' + S[key] + "</output></div>" +
      '<input type="range" data-k="' + key + '" min="' + min + '" max="' + max + '" step="1" value="' + S[key] + '" aria-label="' + label + '">' +
      '<div class="rr-sl-ends"><span>' + min + "</span><span>" + max + "</span></div></div>";
  }
  function typeSelect(path, v) {
    return '<span class="rr-sel"><select data-path="' + path + '" data-k="type" aria-label="Account type">' +
      Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (k === v ? " selected" : "") + ">" + TYPES[k].label + "</option>"; }).join("") +
      "</select></span>";
  }
  const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function body(n) {
    if (n === 1) return (
      slider("age", "Age now", 18, 80) +
      slider("retireAge", "Retire at", 40, 80) +
      slider("planAge", "Make it last to", 75, 105, "planage") +
      '<p class="rr-note">Ages are whole years. The money is tested from the day you stop work to the last age here.</p>');
    if (n === 2) return (
      '<div class="rr-accts">' + S.saved.map(function (a, i) {
        return '<div class="rr-acct">' + typeSelect("saved." + i, a.type) +
          '<span class="rr-tax is-' + TYPES[a.type].tax + '">' + TAXWORD[TYPES[a.type].tax] + "</span>" +
          '<div class="rr-grid2">' +
            field({ key: "bal", path: "saved." + i, label: "Balance", pre: "$", val: Math.round(a.bal).toLocaleString("en-US") }) +
            field({ key: "rate", path: "saved." + i, label: "Grows at", suf: "% a year", val: a.rate, term: "growthrate" }) +
          "</div>" +
          (S.saved.length > 1 ? '<button type="button" class="rr-x" data-del="saved.' + i + '" aria-label="Remove this account">' + X + "</button>" : "") +
        "</div>";
      }).join("") + "</div>" +
      '<button type="button" class="rr-add" data-add="saved">' + PLUS + "Add an account</button>");
    if (n === 3) return (
      '<div class="rr-accts">' + S.contrib.map(function (a, i) {
        const emp = TYPES[a.type].employer;
        return '<div class="rr-acct">' + typeSelect("contrib." + i, a.type) +
          '<div class="rr-grid2">' +
            field({ key: "mo", path: "contrib." + i, label: "You put in", pre: "$", suf: "/mo", val: Math.round(a.mo).toLocaleString("en-US") }) +
            field({ key: "rate", path: "contrib." + i, label: "Grows at", suf: "% a year", val: a.rate, term: "growthrate" }) +
            (emp
              ? field({ key: "match", path: "contrib." + i, label: "Employer adds", suf: "% of yours", val: a.match, term: "employermatch" }) +
                field({ key: "cap", path: "contrib." + i, label: "Up to", pre: "$", suf: "/mo", val: Math.round(a.cap).toLocaleString("en-US") })
              : "") +
          "</div>" +
          (S.contrib.length > 1 ? '<button type="button" class="rr-x" data-del="contrib.' + i + '" aria-label="Remove this contribution">' + X + "</button>" : "") +
        "</div>";
      }).join("") + "</div>" +
      '<button type="button" class="rr-add" data-add="contrib">' + PLUS + "Add a contribution</button>" +
      '<div class="rr-grid2 rr-mt">' + field({ key: "contribGrowth", label: "Raise it each year by", suf: "%", val: S.contribGrowth, hint: "Most people's contributions rise with pay." }) + "</div>");
    if (n === 4) return (
      '<div class="rr-grid2">' +
        field({ key: "goal", label: "Monthly spending", pre: "$", suf: "/mo", val: Math.round(S.goal).toLocaleString("en-US"), hint: "In today's money, before tax.", wide: true }) +
        field({ key: "social", label: "Social Security", pre: "$", suf: "/mo", val: Math.round(S.social).toLocaleString("en-US"), hint: "From your statement at ssa.gov.", wide: true }) +
      "</div>" +
      slider("ssAge", "Social Security starts at", 62, 70, "claimage") +
      '<div class="rr-grid2">' +
        field({ key: "other", label: "Pension", pre: "$", suf: "/mo", val: Math.round(S.other).toLocaleString("en-US"), hint: "Or any other steady income." }) +
        '<label class="rr-f rr-tog"><span class="rr-l"><span data-term="cola">Rises with prices</span></span>' +
          '<span class="rr-switch"><input type="checkbox" data-k="otherCola"' + (S.otherCola ? " checked" : "") + '><i></i><b>' + (S.otherCola ? "Yes" : "No") + "</b></span></label>" +
      "</div>" +
      '<details class="rr-more"' + (OPEN_MORE ? " open" : "") + '><summary>Assumptions<small>' +
        pct(S.inflation) + " inflation · " + pct(S.postReturn) + " return after · " + pct(S.taxRate, 0) + " tax</small>" +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>' +
        '<div class="rr-grid3">' +
          field({ key: "inflation", label: "Prices rise", suf: "% a year", val: S.inflation }) +
          field({ key: "postReturn", label: "Return in retirement", suf: "%", val: S.postReturn, term: "growthrate" }) +
          field({ key: "taxRate", label: "Tax on withdrawals", suf: "%", val: S.taxRate, term: "blendedtax" }) +
        "</div></details>");
    return "";
  }
  let OPEN_MORE = false;

  function drawSteps() {
    const host = $("rrSteps");
    host.innerHTML = STEPS.map(function (st) {
      const on = st.n === OPEN;
      return '<section class="rr-step' + (on ? " is-open" : "") + (st.n < OPEN ? " is-done" : "") + '" data-step="' + st.n + '">' +
        '<button type="button" class="rr-step-h" aria-expanded="' + on + '" data-go="' + st.n + '">' +
          '<span class="rr-num">' + (st.n < OPEN ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>' : st.n) + "</span>" +
          '<span class="rr-step-t"><b>' + st.title + '</b><small data-sum="' + st.n + '">' + esc(st.sum()) + "</small></span>" +
          '<span class="rr-edit">' + (on ? "" : "Edit") + '</span>' +
          '<svg class="rr-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
        "</button>" +
        (on ? '<div class="rr-step-b">' + body(st.n) +
          '<div class="rr-step-f">' +
            (st.n > 1 ? '<button type="button" class="rr-back" data-go="' + (st.n - 1) + '">Back</button>' : "<span></span>") +
            (st.n < 4 ? '<button type="button" class="nh-btn" data-go="' + (st.n + 1) + '">Next: ' + STEPS[st.n].title.toLowerCase() + ' <svg class="nh-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>'
                      : '<button type="button" class="nh-btn" data-go="0">Done <svg class="nh-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></button>') +
          "</div></div>" : "") +
      "</section>";
    }).join("");
    if (WD.explain) WD.explain.mark(host);
  }
  function refreshSums() {
    STEPS.forEach(function (st) { const el = document.querySelector('[data-sum="' + st.n + '"]'); if (el) el.textContent = st.sum(); });
    const m = document.querySelector(".rr-more small");
    if (m) m.textContent = pct(S.inflation) + " inflation · " + pct(S.postReturn) + " return after · " + pct(S.taxRate, 0) + " tax";
  }

  function target(el) {
    const p = el.getAttribute("data-path");
    if (!p) return S;
    const bits = p.split(".");
    return S[bits[0]][+bits[1]];
  }
  const INT = { age: 1, retireAge: 1, planAge: 1, ssAge: 1 };

  function keepAges() {
    S.age = Math.max(18, Math.min(79, S.age));
    if (S.retireAge <= S.age) S.retireAge = S.age + 1;
    if (S.planAge <= S.retireAge) S.planAge = S.retireAge + 1;
    S.ssAge = Math.max(62, Math.min(70, S.ssAge));
  }

  function wire() {
    const host = $("rrSteps");
    host.addEventListener("input", function (e) {
      const el = e.target, k = el.getAttribute("data-k");
      if (!k) return;
      const t = target(el);
      if (el.type === "checkbox") { t[k] = el.checked; const b = el.parentNode.querySelector("b"); if (b) b.textContent = el.checked ? "Yes" : "No"; }
      else if (k === "type") { t[k] = el.value; }
      else { t[k] = INT[k] ? Math.round(num(el.value)) : num(el.value); }
      if (el.type === "range") {
        keepAges();
        ["age", "retireAge", "planAge", "ssAge"].forEach(function (a) {
          const o = $("o_" + a), r = host.querySelector('input[type=range][data-k="' + a + '"]');
          if (o) o.textContent = S[a];
          if (r && +r.value !== S[a]) r.value = S[a];
        });
      }
      update();
      if (k === "type") { drawSteps(); }
    });
    host.addEventListener("change", function (e) {
      const el = e.target, k = el.getAttribute("data-k");
      if (!k || el.type === "range" || el.type === "checkbox" || k === "type") return;
      const t = target(el);
      if (/^(bal|mo|cap|goal|social|other)$/.test(k)) el.value = Math.round(t[k]).toLocaleString("en-US");
    });
    host.addEventListener("click", function (e) {
      const go = e.target.closest("[data-go]"), add = e.target.closest("[data-add]"), del = e.target.closest("[data-del]");
      const more = e.target.closest(".rr-more summary");
      if (more) { OPEN_MORE = !more.parentNode.open; return; }
      if (go) {
        const n = +go.getAttribute("data-go");
        OPEN = (n === OPEN && go.classList.contains("rr-step-h")) ? 0 : n;
        drawSteps();
        const open = host.querySelector(".rr-step.is-open");
        if (open && open.getBoundingClientRect().top < 70) open.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      if (add) {
        const w = add.getAttribute("data-add");
        S[w].push(w === "saved" ? { type: "brokerage", bal: 0, rate: 6 } : { type: "trad", mo: 0, rate: 6, match: 0, cap: 0 });
        drawSteps(); update();
        const rows = host.querySelectorAll(".rr-acct"); const last = rows[rows.length - 1];
        if (last) { const i = last.querySelector("input"); if (i) i.focus(); }
      }
      if (del) {
        const p = del.getAttribute("data-del").split(".");
        S[p[0]].splice(+p[1], 1);
        drawSteps(); update();
      }
    });
  }

  /* ---------------------------------------------------------
     the answer
     --------------------------------------------------------- */
  let R = null, ST = null;

  function toView(v, age) {
    return VIEW === "today" ? v / Math.pow(1 + S.inflation / 100, age - S.age) : v;
  }

  function drawAnswer() {
    const r = R, at = S.retireAge;
    const score = r.score, onTrack = score >= 1, close = score >= 0.85;
    const status = onTrack ? "On track" : close ? "Close" : "Short";
    const tone = onTrack ? "good" : close ? "warn" : "bad";
    const lastsTxt = r.lasts >= 105 ? "past 100" : String(r.lasts);
    const gap = r.total - r.needed;

    let head;
    if (onTrack) head = "Your money lasts " + (r.lasts >= 105 ? "past 100" : "to " + r.lasts) + " — " + (r.lasts >= 105 ? "well" : years(r.lasts - S.planAge)) + " beyond " + S.planAge + ".";
    else head = "Your money runs out at " + r.lasts + " — " + years(S.planAge - r.lasts) + " short of " + S.planAge + ".";
    if (onTrack && r.lasts < 105 && r.lasts === S.planAge) head = "Your money lasts to " + S.planAge + ", with nothing to spare.";

    /* the ring: a full circle is 100%; past it, a second lap in a lighter tint */
    const RAD = 58, C = 2 * Math.PI * RAD, lap1 = Math.min(score, 1), lap2 = Math.max(0, Math.min(score - 1, 1));
    const ring =
      '<svg class="rr-ring" viewBox="0 0 140 140" aria-hidden="true">' +
        '<circle class="trk" cx="70" cy="70" r="' + RAD + '"/>' +
        '<circle class="arc" cx="70" cy="70" r="' + RAD + '" stroke-dasharray="' + (C * lap1).toFixed(1) + " " + C.toFixed(1) + '"/>' +
        (lap2 ? '<circle class="arc2" cx="70" cy="70" r="' + RAD + '" stroke-dasharray="' + (C * lap2).toFixed(1) + " " + C.toFixed(1) + '"/>' : "") +
      "</svg>";
    const saved = toView(r.total, at), need = toView(r.needed, at), top = Math.max(saved, need);
    $("rrAnswer").setAttribute("data-state", tone);
    $("rrAnswer").innerHTML =
      '<div class="rr-a-main">' +
        '<div class="rr-gauge" role="img" aria-label="' + Math.round(score * 100) + '% ready">' + ring +
          '<div class="rr-gauge-t"><b>' + Math.round(score * 100) + '<i>%</i></b><span data-term="rrscore">ready</span></div></div>' +
        '<div class="rr-a-body">' +
          '<span class="rr-pill is-' + tone + '">' + status + "</span>" +
          '<h2 class="rr-a-h">' + esc(head) + "</h2>" +
          '<div class="rr-cmp">' +
            '<div class="rr-cmp-r is-saved"><span>Saved by ' + at + '</span><i><em style="width:' + (saved / top * 100).toFixed(1) + '%"></em></i><b>' + big(saved) + "</b></div>" +
            '<div class="rr-cmp-r is-need"><span><span data-term="rrneeded">Needed</span></span><i><em style="width:' + (need / top * 100).toFixed(1) + '%"></em></i><b>' + big(need) + "</b></div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<dl class="rr-stats">' +
        "<div><dt>" + (gap >= 0 ? "To spare" : "Gap") + "</dt><dd class=\"" + (gap >= 0 ? "is-good" : "is-bad") + "\">" + big(Math.abs(toView(gap, at))) + "</dd></div>" +
        "<div><dt>Lasts to</dt><dd>" + lastsTxt + "</dd></div>" +
        "<div><dt>You can spend</dt><dd>" + money(sustainable(S)) + "<small>/mo</small></dd></div>" +
      "</dl>";
    if (WD.explain) WD.explain.mark($("rrAnswer"));
  }

  /* where the first year's income comes from, in today's money */
  function drawMix() {
    const r = R, row = r.rows[0], d = VIEW === "today" ? Math.pow(1 + S.inflation / 100, S.retireAge - S.age) : 1;
    const m = function (v) { return v / 12 / d; };
    const ss = m(row.ss), oth = m(row.other), gross = m(row.gross);
    const tax = gross * r.blend, draw = gross - tax;
    const total = ss + oth + gross;
    const parts = [
      { k: "ss", label: "Social Security", v: ss, note: S.ssAge > S.retireAge ? "from " + S.ssAge : "" },
      { k: "oth", label: "Pension", v: oth },
      { k: "draw", label: "From savings", v: draw },
      { k: "tax", label: "Tax on it", v: tax }
    ].filter(function (p) { return p.v > 0.5; });
    $("rrMix").innerHTML =
      '<div class="rr-card-h"><h3>Your first year at ' + S.retireAge + "</h3><span>" + money(ss + oth + draw) + " a month to spend" + (VIEW === "today" ? ", in today's money" : "") + "</span></div>" +
      '<div class="rr-mix">' + parts.map(function (p) { return '<i class="is-' + p.k + '" style="flex:' + (p.v / total).toFixed(4) + '"></i>'; }).join("") + "</div>" +
      '<ul class="rr-mix-k">' + parts.map(function (p) {
        return '<li><i class="is-' + p.k + '"></i><span>' + (p.k === "tax" ? '<span data-term="blendedtax">' + p.label + "</span>" : p.label) + (p.note ? " <small>" + p.note + "</small>" : "") + "</span><b>" + money(p.v) + "</b></li>";
      }).join("") + "</ul>" +
      (S.ssAge > S.retireAge ? '<p class="rr-note">Until Social Security starts at ' + S.ssAge + ", savings cover all of it — " + money(gross) + " a month drawn in that first year.</p>" : "");
    if (WD.explain) WD.explain.mark($("rrMix"));
  }

  /* ---------------------------------------------------------
     the chart
     --------------------------------------------------------- */
  let SHOW_STRESS = true;
  function series(r) {
    const pts = [];
    r.path.forEach(function (v, k) { pts.push({ age: S.age + k, v: v }); });
    r.rows.forEach(function (row, k) { if (k > 0 && row.age <= S.planAge) pts.push({ age: row.age, v: row.bal }); });
    /* the year after the last withdrawal */
    const last = r.rows.filter(function (x) { return x.age === S.planAge; })[0];
    if (last) pts.push({ age: S.planAge, v: last.bal });
    const seen = {};
    return pts.filter(function (p) { if (seen[p.age]) return false; seen[p.age] = 1; return p.age <= S.planAge; })
              .map(function (p) { return { age: p.age, v: toView(p.v, p.age) }; });
  }

  function drawChart() {
    const box = $("rrChart");
    const W = Math.max(300, box.clientWidth), H = W < 480 ? 210 : 250;
    const P = { l: 46, r: 12, t: 16, b: 26 };
    const a = series(R), s = series(ST);
    const maxV = Math.max.apply(null, a.concat(SHOW_STRESS ? s : []).map(function (p) { return p.v; })) * 1.08 || 1;
    const x = function (age) { return P.l + (age - S.age) / (S.planAge - S.age) * (W - P.l - P.r); };
    const y = function (v) { return P.t + (1 - v / maxV) * (H - P.t - P.b); };
    const line = function (pts) { return pts.map(function (p, i) { return (i ? "L" : "M") + x(p.age).toFixed(1) + " " + y(p.v).toFixed(1); }).join(" "); };
    const areaOf = function (pts) { return pts.length < 2 ? "" : line(pts) + " L" + x(pts[pts.length - 1].age).toFixed(1) + " " + y(0) + " L" + x(pts[0].age).toFixed(1) + " " + y(0) + "Z"; };
    /* two phases, sharing the retirement point: saving (teal), then living on it (blue) */
    const aSave = a.filter(function (p) { return p.age <= S.retireAge; }), aSpend = a.filter(function (p) { return p.age >= S.retireAge; });

    /* y ticks */
    const step = niceStep(maxV / 3);
    let ticks = "";
    for (let v = 0; v <= maxV; v += step) {
      ticks += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="g"/>' +
               '<text x="' + (P.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + big(v).replace(".00M", "M") + "</text>";
    }
    /* x ticks every 5 or 10 years */
    let xt = "";
    const span = S.planAge - S.age, xs = span > 40 ? 10 : 5;
    for (let ag = Math.ceil(S.age / xs) * xs; ag <= S.planAge; ag += xs) {
      xt += '<text x="' + x(ag) + '" y="' + (H - 6) + '" text-anchor="middle">' + ag + "</text>";
    }
    /* markers */
    const mk = function (age, label, cls) {
      if (age < S.age || age > S.planAge) return "";
      return '<g class="mk ' + cls + '"><line x1="' + x(age) + '" x2="' + x(age) + '" y1="' + P.t + '" y2="' + y(0) + '"/>' +
             '<text x="' + x(age) + '" y="' + (P.t - 4) + '" text-anchor="' + (x(age) > W - 70 ? "end" : "middle") + '">' + label + "</text></g>";
    };
    let marks = mk(S.retireAge, "Retire " + S.retireAge, "is-ret");
    if (S.ssAge !== S.retireAge) marks += mk(S.ssAge, "SS " + S.ssAge, "is-ss");
    const out = R.lasts < S.planAge;
    const dot = out ? '<circle class="out" cx="' + x(R.lasts) + '" cy="' + y(0) + '" r="5"/><text class="out-t" x="' + x(R.lasts) + '" y="' + (y(0) - 18) + '" text-anchor="' + (x(R.lasts) > W - 90 ? "end" : "middle") + '">Runs out ' + R.lasts + "</text>" : "";

    box.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Savings by age">' +
        '<defs>' +
          '<linearGradient id="rrFillS" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0b5f58" stop-opacity=".22"/><stop offset="1" stop-color="#0b5f58" stop-opacity=".02"/></linearGradient>' +
          '<linearGradient id="rrFillD" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3f6fb5" stop-opacity=".20"/><stop offset="1" stop-color="#3f6fb5" stop-opacity=".02"/></linearGradient>' +
        '</defs>' +
        ticks + xt +
        '<rect class="ret-band" x="' + x(S.retireAge) + '" y="' + P.t + '" width="' + (x(S.planAge) - x(S.retireAge)) + '" height="' + (y(0) - P.t) + '"/>' +
        '<path class="ar is-save" d="' + areaOf(aSave) + '"/>' +
        '<path class="ar is-spend" d="' + areaOf(aSpend) + '"/>' +
        (SHOW_STRESS ? '<path class="st" d="' + line(s) + '"/>' : "") +
        '<path class="ln is-save" d="' + line(aSave) + '"/>' +
        (aSpend.length > 1 ? '<path class="ln is-spend" d="' + line(aSpend) + '"/>' : "") +
        '<circle class="peak" cx="' + x(S.retireAge) + '" cy="' + y(aSave[aSave.length - 1].v) + '" r="5"/>' +
        marks + dot +
        '<line class="hov" id="rrHovL" x1="0" x2="0" y1="' + P.t + '" y2="' + y(0) + '" style="display:none"/>' +
        '<circle class="hov-d" id="rrHovD" r="4.5" style="display:none"/>' +
      "</svg>" +
      '<div class="rr-tip" id="rrTip" hidden></div>';

    const svg = box.querySelector("svg"), tip = $("rrTip"), L = $("rrHovL"), D = $("rrHovD");
    function hover(clientX) {
      const rect = svg.getBoundingClientRect();
      const px = (clientX - rect.left) * (W / rect.width);
      const age = Math.round(S.age + (px - P.l) / (W - P.l - P.r) * (S.planAge - S.age));
      const p = a.filter(function (q) { return q.age === age; })[0];
      if (!p) { hide(); return; }
      const q = s.filter(function (z) { return z.age === age; })[0];
      L.setAttribute("x1", x(age)); L.setAttribute("x2", x(age)); L.style.display = "";
      D.setAttribute("cx", x(age)); D.setAttribute("cy", y(p.v)); D.style.display = ""; D.setAttribute("class", "hov-d" + (age > S.retireAge ? " is-spend" : ""));
      tip.innerHTML = "<b>Age " + age + "</b><span>" + big(p.v) + "</span>" + (SHOW_STRESS && q ? "<small>Tough markets " + big(q.v) + "</small>" : "");
      tip.hidden = false;
      const left = x(age) / W * rect.width;
      tip.style.left = Math.max(60, Math.min(rect.width - 60, left)) + "px";
      tip.style.top = Math.max(0, y(p.v) / H * rect.height - 58) + "px";
    }
    function hide() { tip.hidden = true; L.style.display = "none"; D.style.display = "none"; }
    svg.addEventListener("mousemove", function (e) { hover(e.clientX); });
    svg.addEventListener("mouseleave", hide);
    svg.addEventListener("touchmove", function (e) { if (e.touches[0]) hover(e.touches[0].clientX); }, { passive: true });
    svg.addEventListener("touchend", function () { setTimeout(hide, 1200); });

    const sl = ST.lasts, holds = sl >= S.planAge;
    $("rrStress").innerHTML =
      '<div class="rr-legend"><span class="rr-key is-save"><i></i>Saving</span><span class="rr-key is-spend"><i></i>Living on it</span>' +
      '<label class="rr-chk"><input type="checkbox" id="rrStressOn"' + (SHOW_STRESS ? " checked" : "") + '><i></i><span data-term="stresstest">Tough markets</span></label></div>' +
      '<span class="rr-stress-t ' + (holds ? "is-good" : "is-bad") + '">' +
        (holds ? "Still lasts to " + (sl >= 105 ? "past 100" : sl) : "Runs out at " + sl + " — " + years(S.planAge - sl) + " early") +
        " · " + Math.round(ST.score * 100) + "% ready</span>";
    if (WD.explain) WD.explain.mark($("rrStress"));
    $("rrStressOn").addEventListener("change", function (e) { SHOW_STRESS = e.target.checked; drawChart(); });
  }
  function niceStep(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v || 1))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }

  /* ---------------------------------------------------------
     ways to close the gap — each one is evaluate() on a copy
     --------------------------------------------------------- */
  function drawLevers() {
    const on = R.score >= 1;
    const items = [];
    if (!on) {
      const ex = suggestedExtra(S);
      if (ex > 0 && ex < 20000) {
        const amt = Math.ceil(ex / 25) * 25;
        items.push({ id: "extra", icon: "save", t: "Save " + money(amt - S.extra) + " more a month", s: "Into your " + (S.contrib[0] ? TYPES[S.contrib[0].type].label : "savings") + ", from now to " + S.retireAge + ".", r: evaluate(patch(S, { extra: amt })), apply: { extra: amt } });
      }
      const later = laterRetirement(S);
      if (later) items.push({ id: "later", icon: "clock", t: "Retire at " + later, s: years(later - S.retireAge) + " more of saving, and " + years(later - S.retireAge) + " less to fund.", r: evaluate(patch(S, { retireAge: later })), apply: { retireAge: later } });
      const g = Math.floor(sustainable(S) / 25) * 25;
      if (g > 0) items.push({ id: "spend", icon: "cut", t: "Spend " + money(g) + " a month", s: money(S.goal - g) + " less than planned, in today's money.", r: evaluate(patch(S, { goal: g })), apply: { goal: g } });
      const c = claim70(S);
      if (c) { const rc = evaluate(c); if (rc.score > R.score + 0.005) items.push({ id: "ss70", icon: "up", t: "Start Social Security at 70", s: money(c.social) + " a month instead of " + money(S.social) + ", for life.", r: rc, apply: { ssAge: 70, social: Math.round(c.social) }, term: "claimage" }); }
    } else {
      const e = earliestRetirement(S);
      if (e) items.push({ id: "earlier", icon: "clock", t: "You could retire at " + e, s: years(S.retireAge - e) + " sooner, still lasting to " + S.planAge + ".", r: evaluate(patch(S, { retireAge: e })), apply: { retireAge: e } });
      const g = Math.floor(sustainable(S) / 25) * 25;
      if (g > S.goal) items.push({ id: "spend", icon: "up", t: "Or spend " + money(g) + " a month", s: money(g - S.goal) + " more than planned, in today's money.", r: evaluate(patch(S, { goal: g })), apply: { goal: g } });
    }

    const ICON = {
      save: '<path d="M5 12h14M12 5v14"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
      cut: '<path d="M6 12h12"/>', up: '<path d="m7 14 5-5 5 5"/>'
    };
    $("rrLevers").innerHTML =
      '<div class="rr-card-h"><h3>' + (on ? "Room to spare" : "Ways to close the gap") + "</h3><span>" + (on ? "What the surplus could buy" : "What each change does on its own") + "</span></div>" +
      (items.length ? '<div class="rr-lv-list">' + items.map(function (it, i) {
        return '<div class="rr-lv">' +
          '<span class="rr-lv-i is-' + it.id + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[it.icon] + "</svg></span>" +
          '<span class="rr-lv-t"><b>' + (it.term ? '<span data-term="' + it.term + '">' + esc(it.t) + "</span>" : esc(it.t)) + "</b><small>" + esc(it.s) + "</small></span>" +
          '<span class="rr-lv-r"><b>' + Math.round(it.r.score * 100) + '%</b><small>lasts to ' + (it.r.lasts >= 105 ? "100+" : it.r.lasts) + "</small></span>" +
          '<button type="button" class="rr-try" data-lever="' + i + '">Try it</button>' +
        "</div>";
      }).join("") + "</div>" : '<p class="rr-note">No single change here closes it on its own — try combining two, or saving more with the slider below.</p>') +
      '<div class="rr-extra">' +
        '<div class="rr-sl-h"><span class="rr-l">Save extra each month</span><output id="rrExtraO">' + money(S.extra) + "</output></div>" +
        '<input type="range" id="rrExtra" min="0" max="3000" step="25" value="' + Math.min(3000, S.extra) + '" aria-label="Extra monthly savings">' +
        '<div class="rr-sl-ends"><span>$0</span><span>$3,000</span></div>' +
      "</div>";
    if (WD.explain) WD.explain.mark($("rrLevers"));
    $("rrLevers").querySelectorAll("[data-lever]").forEach(function (b) {
      b.addEventListener("click", function () {
        const it = items[+b.getAttribute("data-lever")];
        LAST = clone(S);
        Object.assign(S, it.apply);
        keepAges();
        drawSteps(); update();
        showUndo(it.t);
      });
    });
    $("rrExtra").addEventListener("input", function (e) {
      S.extra = +e.target.value;
      $("rrExtraO").textContent = money(S.extra);
      update(true);
    });
  }

  let LAST = null;
  function showUndo(what) {
    const u = $("rrUndo");
    u.innerHTML = "<span>Applied: " + esc(what) + '</span><button type="button">Undo</button>';
    u.hidden = false;
    u.querySelector("button").onclick = function () { if (LAST) { S = LAST; LAST = null; drawSteps(); update(); } u.hidden = true; };
    clearTimeout(showUndo.t);
    showUndo.t = setTimeout(function () { u.hidden = true; }, 6000);
  }

  /* ---------------------------------------------------------
     one update for everything
     --------------------------------------------------------- */
  function update(fromSlider) {
    R = evaluate(S);
    ST = evaluate(stressed(S));
    drawAnswer(); drawMix(); drawChart();
    if (!fromSlider) drawLevers();
    else refreshLeverNumbers();
    refreshSums();
    save();
    const m = $("rrMini");
    if (m) m.innerHTML = '<span class="rr-pill is-' + (R.score >= 1 ? "good" : R.score >= .85 ? "warn" : "bad") + '">' + Math.round(R.score * 100) + "%</span><span>Lasts to " + (R.lasts >= 105 ? "100+" : R.lasts) + '</span><span class="rr-see">See result</span>';
  }
  /* while the extra slider moves, keep it — redraw the list when it stops */
  let leverT = 0;
  function refreshLeverNumbers() { clearTimeout(leverT); leverT = setTimeout(function () {
    const v = S.extra; drawLevers(); const r = $("rrExtra"); if (r) r.value = v;
  }, 350); }

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  function boot() {
    if (!$("rrSteps")) return;
    keepAges();
    drawSteps(); wire();
    document.querySelectorAll("[data-view]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-view") === VIEW ? "true" : "false");
      b.addEventListener("click", function () {
        VIEW = b.getAttribute("data-view");
        try { localStorage.setItem(KEY + ".view", VIEW); } catch (e) {}
        document.querySelectorAll("[data-view]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        update();
      });
    });
    const reset = $("rrReset");
    if (reset) reset.addEventListener("click", function () { LAST = clone(S); S = clone(DEFAULT); OPEN = 1; drawSteps(); update(); showUndo("started over"); });
    update();
    const mini = $("rrMini");
    if (mini) {
      mini.addEventListener("click", function () { $("rrAnswer").scrollIntoView({ behavior: "smooth", block: "start" }); });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { mini.classList.toggle("is-away", e.isIntersecting); });
        }, { threshold: 0.05 }).observe(document.querySelector(".rr-out"));
      }
    }
    let w = window.innerWidth;
    window.addEventListener("resize", function () { if (window.innerWidth !== w) { w = window.innerWidth; drawChart(); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
