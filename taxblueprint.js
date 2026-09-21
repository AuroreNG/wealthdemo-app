/* ============================================================
   WEALTHDEMO — the Tax Blueprint (v65)

   One client file, four stages. This file does no tax arithmetic
   and no document logic of its own:

     stages 1–2  WD_FORMS.byId("tax-intake").compute(answers)
                 — the Tax Intake form's own derivation: the
                 document list, the likely schedules, the score
     stage 3     WD.tax.compute(figures)            (taxengine.js)
     every lever WD.tax.compute(a patched copy)     — run again,
                 never re-modelled; the drift test holds the
                 engine to the Python reference to the cent

   It opens on a worked example (the Ellerys), because a tool that
   opens empty is a tool nobody can evaluate. Editing a figure makes
   it theirs; "Start your own" clears it.
   ============================================================ */
(function () {
  const FORMS = window.WD_FORMS;
  const TAX = window.WD && window.WD.tax;
  const INTAKE = FORMS && FORMS.byId("tax-intake");
  if (!TAX || !INTAKE) return;

  const KEY = "wealthdemo.taxbp";
  const INTAKE_KEY = "wealthdemo.form.tax-intake";

  /* ---------- the worked example ---------- */
  const EX_NAME = "The Ellerys";
  const EX_INTAKE = {
    filing: "joint", deps: ["kids", "college"], life: ["home", "biz"],
    income: ["w2", "self", "invest"], deduct: ["bizexp", "edu", "mortgage", "charity"],
    paid: ["fed", "state"],
    files: [{ type: "Previous tax return", name: "2025-1040.pdf", size: "412 KB" },
            { type: "W-2", name: "w2-acme.pdf", size: "88 KB" },
            { type: "Investment statements", name: "brokerage-year-end.pdf", size: "1.2 MB" }]
  };
  const EX_FIGS = {
    status: "mfj", wages: 96000, withheld: 11400, profit: 58000, interest: 0, qdiv: 4200, ltcg: 11500,
    mort: 14800, proptax: 6400, statetax: 5900, charity: 3100, medical: 0,
    kids: 1, otherDeps: 1, students: 1, tuition: 4000, estimated: 3000
  };

  const STATUS_FROM_INTAKE = { single: "single", joint: "mfj", sep: "mfs", hoh: "hoh", widow: "qss" };
  const STATUS_NAME = { single: "Single", mfj: "Married filing jointly", mfs: "Married filing separately",
                        hoh: "Head of household", qss: "Qualifying surviving spouse" };

  /* ---------- the figures a preparer types in, and when each is asked ---------- */
  const FIELDS = [
    { g: "Income", id: "wages", label: "W-2 wages", when: ["income:w2"] },
    { g: "Income", id: "withheld", label: "Federal tax withheld", when: ["income:w2"] },
    { g: "Income", id: "profit", label: "Business profit, after expenses", term: "setax", when: ["income:self", "income:gig", "life:biz", "deduct:bizexp"] },
    { g: "Income", id: "interest", label: "Interest and other taxable income", when: ["income:invest", "income:retire", "income:unemp", "income:other", "income:rental"] },
    { g: "Income", id: "qdiv", label: "Qualified dividends", when: ["income:invest"] },
    { g: "Income", id: "ltcg", label: "Long-term capital gains", when: ["income:invest"] },
    { g: "Deductions", id: "mort", label: "Mortgage interest", term: "itemised", when: ["deduct:mortgage", "life:home"] },
    { g: "Deductions", id: "proptax", label: "Property tax", when: ["deduct:mortgage", "life:home"] },
    { g: "Deductions", id: "statetax", label: "State and local income tax", always: true },
    { g: "Deductions", id: "charity", label: "Cash gifts to charity", hint: "Not gifts to a donor-advised fund.", when: ["deduct:charity"] },
    { g: "Deductions", id: "medical", label: "Medical costs paid", when: ["deduct:medical"] },
    { g: "Family", id: "kids", label: "Children under 17", count: true, when: ["deps:kids", "life:baby"] },
    { g: "Family", id: "otherDeps", label: "Other dependents", count: true, hint: "A college student over 17, a parent.", when: ["deps:college", "deps:parents"] },
    { g: "Family", id: "students", label: "Students in their first four years of college", term: "aotc", count: true, when: ["deps:college", "deduct:edu"] },
    { g: "Family", id: "tuition", label: "Tuition paid, per student", when: ["deps:college", "deduct:edu"] },
    { g: "Paid in", id: "estimated", label: "Federal estimated payments made", when: ["paid:fed", "paid:ext"] }
  ];

  /* ---------- state ---------- */
  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function readIntake() {
    try {
      const s = JSON.parse(localStorage.getItem(INTAKE_KEY) || "null");
      return s && s.v && Object.keys(s.v).length ? s.v : null;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ example: S.example, name: S.name, figs: S.figs, all: S.all })); } catch (e) {}
  }
  function blankFigs(status) {
    const f = { status: status || "mfj" };
    FIELDS.forEach(function (d) { f[d.id] = 0; });
    return f;
  }

  const stored = readStore();
  const S = stored && stored.figs
    ? { example: !!stored.example, name: stored.name || "", figs: stored.figs, all: !!stored.all }
    : { example: true, name: EX_NAME, figs: Object.assign({}, EX_FIGS), all: false };

  function answers() { return S.example ? EX_INTAKE : readIntake(); }

  /* ---------- helpers ---------- */
  const $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function usd(n) {
    const v = Math.round(Math.abs(+n || 0));
    return (n < 0 ? "−" : "") + "$" + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function t(label, term) {
    return term ? '<span data-term="' + esc(term) + '">' + esc(label) + "</span>" : esc(label);
  }
  function has(v, id, val) { return !!v && Array.isArray(v[id]) && v[id].indexOf(val) >= 0; }
  function who() { return S.name && S.name.trim() ? S.name.trim() : "This client"; }
  /* "The Ellerys owe", "Dana owes", "This client owes" */
  function plural() {
    const n = (S.name || "").trim();
    return /^the\s/i.test(n) || /\sand\s|&/.test(n);
  }
  function verb(one, many) { return plural() ? many : one; }
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4.5 4.5L19 7"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg>';

  function run(patch) { return TAX.compute(Object.assign({}, S.figs, patch || {})); }

  /* ============================================================
     The findings. Every dollar figure below is compute() run
     again — nothing is estimated in prose.
     ============================================================ */
  function analyse() {
    const f = S.figs, base = run();
    const out = { base: base, findings: [], plan: { now: [], next: [] } };
    const v = answers() || {};
    const rng = base.aotcRange;

    /* ---- the tuition credit, and the SEP that brings it back ---- */
    let sepMove = null;
    if (base.aotcLost > 0.5 && rng) {
      out.phase = { lo: rng[0], hi: rng[1], agi: base.agi, full: base.aotcFull, now: base.aotc, lost: base.aotcLost };
    }
    if (+f.profit > 0 && base.sepLimit >= 500) {
      let amount, why;
      if (out.phase) {
        amount = Math.min(Math.ceil((base.agi - rng[0]) / 50) * 50, Math.floor(base.sepLimit / 50) * 50);
        why = "phase";
      } else {
        amount = Math.floor(base.sepLimit / 50) * 50;
        why = "max";
      }
      const after = run({ sep: amount });
      const saved = base.total - after.total;
      if (saved >= 50) {
        sepMove = { amount: amount, saved: saved, restored: after.aotc - base.aotc, after: after,
                    why: why, pct: Math.round(saved / amount * 100), full: after.aotcLost < 0.5 };
      }
    }
    out.sep = sepMove;

    /* ---- itemise or not ---- */
    const houseTicked = has(v, "life", "home") || has(v, "deduct", "mortgage") || +f.mort > 0;
    if (+f.mort > 0 || base.itemised > base.std * 0.5) {
      const gap = Math.abs(base.std - base.itemised);
      if (!base.useItem) {
        out.findings.push({
          id: "deduct", tone: "plain",
          head: houseTicked && +f.mort > 0 ? "It is not the house." : "The standard deduction wins.",
          body: (houseTicked && +f.mort > 0
            ? "The mortgage interest, the property tax and the charity come to <b>" + usd(base.itemised) + "</b>. The " + t("standard deduction", "stddeduction") + " is <b>" + usd(base.std) + "</b>. The house changes this year's tax by nothing at all."
            : "Everything that could be itemised comes to <b>" + usd(base.itemised) + "</b>, against a " + t("standard deduction", "stddeduction") + " of <b>" + usd(base.std) + "</b>.") +
            (base.charStd > 0 ? " They still get " + usd(base.charStd) + " for the charity — new for 2026, without itemising." : ""),
          bars: { a: base.itemised, b: base.std, gap: gap }
        });
      } else {
        out.findings.push({
          id: "deduct", tone: "plain", head: "Itemising is worth it.",
          body: "Listing the deductions comes to <b>" + usd(base.itemised) + "</b>, " + usd(gap) + " more than the " + t("standard deduction", "stddeduction") + ". Schedule A goes on this return.",
          bars: { a: base.itemised, b: base.std, gap: gap, itemWins: true }
        });
      }
    }

    /* ---- the credit ---- */
    if (out.phase) {
      out.findings.push({
        id: "aotc", tone: "money",
        head: +f.profit > 0 ? "The business is eating the tuition credit." : "Their income is eating the tuition credit.",
        body: "The " + t("American Opportunity Credit", "aotc") + " is worth <b>" + usd(base.aotcFull) + "</b> and starts to " + t("phase out", "phaseout") +
              " once " + t("AGI", "agi") + " passes <b>" + usd(rng[0]) + "</b>. This return's AGI is <b>" + usd(base.agi) + "</b>. Nothing on the return says a credit was lost — it just arrives smaller.",
        big: base.aotcLost, bigLabel: "Credit lost", bigNote: "of the " + usd(base.aotcFull)
      });
    }

    /* ---- the lever ---- */
    if (sepMove) {
      out.findings.push({
        id: "sep", tone: "lever",
        head: "A " + usd(sepMove.amount) + " SEP puts " + usd(sepMove.saved) + " back.",
        body: sepMove.why === "phase"
          ? "A " + t("SEP-IRA", "sepira") + " contribution can still be made for this year, up to the filing deadline. " +
            (sepMove.full ? "It takes AGI to exactly the line where the whole credit comes back" : "It moves AGI back toward the line and part of the credit returns") +
            ", and it lowers the tax underneath as well."
          : "A " + t("SEP-IRA", "sepira") + " contribution can still be made for this year, up to the filing deadline. This is the most the business profit allows.",
        stats: [
          { k: "Tax saved", v: usd(sepMove.saved), tone: "green" },
          sepMove.restored > 0.5 ? { k: "Credit restored", v: usd(sepMove.restored), tone: "gold" } : { k: "Contribution", v: usd(sepMove.amount), tone: "gold" },
          { k: "Return on " + usd(sepMove.amount), v: sepMove.pct + "%", tone: "green" }
        ]
      });
    }

    /* ---- bunching charity: two years' giving in one ---- */
    let bunch = null;
    if (!base.useItem && +f.charity > 0) {
      const one = run({ charity: +f.charity * 2 });
      const zero = run({ charity: 0 });
      const gain = 2 * base.total - (one.total + zero.total);
      if (gain >= 100) bunch = { gain: gain, gift: +f.charity * 2 };
    }

    /* ---- next year's safe harbour ---- */
    const high = base.agi > (base.status === "mfs" ? 75000 : 150000);
    const target = base.total * (high ? 1.10 : 1.00);
    const quarter = Math.max(0, Math.ceil((target - (+f.withheld || 0)) / 4 / 10) * 10);

    /* ---- the plan, from the findings ---- */
    const intakeOut = answers() ? INTAKE.compute(answers()) : null;
    const missing = intakeOut ? intakeOut.raw.needs.filter(function (n) { return !n.have; }) : [];
    if (sepMove) out.plan.now.push({ icon: "coin", head: "Open and fund a SEP-IRA — " + usd(sepMove.amount), note: "Allowed right up to the filing deadline, extensions included.", val: usd(sepMove.saved) });
    if (+f.students > 0) {
      const eduMissing = missing.some(function (n) { return /Education/.test(n.name); });
      if (eduMissing || !intakeOut) out.plan.now.push({ icon: "cap", head: "Get the 1098-T from the school", note: "The tuition credit cannot be claimed without it.", val: usd(base.aotcFull) });
    }
    if (missing.length) out.plan.now.push({ icon: "doc", head: "Collect the " + (missing.length === 1 ? "last document" : missing.length + " outstanding documents"), note: missing.slice(0, 3).map(function (n) { return n.name; }).join(", ") + (missing.length > 3 ? " and more" : "") + "." });

    if (quarter > 0 && (+f.profit > 0 || base.due > 1000)) {
      out.plan.next.push({ icon: "cal", head: "Pay " + usd(quarter) + " a quarter in estimated tax", note: "The " + t("safe harbour", "safeharbor") + ": " + (high ? "110%" : "all") + " of this year's " + usd(base.total) + ", less what the W-2 already withholds. No penalty, whatever next year brings." });
    }
    if (bunch) out.plan.next.push({ icon: "heart", head: "Give two years of charity in one", note: "Itemising is " + usd(base.std - base.itemised) + " short. Giving " + usd(bunch.gift) + " every other year is worth about " + usd(bunch.gain) + " over two years." });
    if (+f.students > 0 && rng && base.agi > rng[0] - 20000) {
      out.plan.next.push({ icon: "trend", head: "Watch the " + usd(rng[0]) + " line every year", note: "It is not raised for inflation, and income tends to rise into it while a child is still at college." });
    }
    if (+f.profit > 0 && !sepMove) out.plan.next.push({ icon: "coin", head: "Look at retirement contributions for the business", note: "Profit this size can carry a SEP or a solo 401(k) — both come off income before the tax is worked out." });

    out.intake = intakeOut;
    out.quarter = quarter;
    return out;
  }

  /* ============================================================
     Drawing
     ============================================================ */
  function drawBanner() {
    const el = $("tbExample");
    if (!el) return;
    el.hidden = !S.example;
  }

  function drawProof(a) {
    const el = $("tbProof");
    if (!el) return;
    const b = a.base, n = who();
    let line;
    if (b.due > 0.5 && a.phase && +S.figs.profit > 0) {
      line = esc(n) + " " + verb("owes", "owe") + " <em>" + usd(b.due) + "</em> this year — and <span class='g'>" + usd(a.phase.lost) + "</span> of it is the tuition credit, phased out by the business income.";
    } else if (b.due > 0.5 && a.phase) {
      line = esc(n) + " " + verb("owes", "owe") + " <em>" + usd(b.due) + "</em> this year — and <span class='g'>" + usd(a.phase.lost) + "</span> of the tuition credit has gone to a phase-out.";
    } else if (b.due > 0.5 && a.sep) {
      line = esc(n) + " " + verb("owes", "owe") + " <em>" + usd(b.due) + "</em> this year. A " + usd(a.sep.amount) + " SEP contribution would cut that by <span class='g'>" + usd(a.sep.saved) + "</span>.";
    } else if (b.due > 0.5) {
      line = esc(n) + " " + verb("owes", "owe") + " <em>" + usd(b.due) + "</em> this year.";
    } else if (b.due < -0.5) {
      line = esc(n) + " " + verb("is", "are") + " due a refund of <em>" + usd(-b.due) + "</em>." + (a.sep ? " A SEP contribution would add <span class='g'>" + usd(a.sep.saved) + "</span> to it." : "");
    } else {
      line = esc(n) + " " + verb("has", "have") + " paid in almost exactly what they owe.";
    }
    const blank = !(+S.figs.wages || +S.figs.profit || +S.figs.interest || +S.figs.qdiv || +S.figs.ltcg);
    el.innerHTML = blank
      ? '<p class="tb-proof-t">Fill in the figures in stage three and the finding appears here.</p>'
      : '<p class="tb-proof-t">' + line + "</p>";
    el.parentNode.classList.toggle("is-blank", blank);
  }

  function drawSpine(a) {
    const el = $("tbSpine");
    if (!el) return;
    const io = a.intake;
    const answered = io ? io.raw.answered : 0, asked = io ? io.raw.asked : 6;
    const docs = io ? io.raw.needs : [];
    const got = docs.filter(function (d) { return d.have; }).length;
    const findings = a.findings.length;
    const steps = a.plan.now.length + a.plan.next.length;
    const S4 = [
      { n: "01", name: "Intake", note: io ? answered + " of " + asked + " answered" : "Not started", done: io && answered === asked, href: "#stage1", icon: "clip" },
      { n: "02", name: "Documents", note: io ? got + " of " + docs.length + " in" : "Waiting on the intake", done: io && docs.length && got === docs.length, href: "#stage2", icon: "docs" },
      { n: "03", name: "Analysis", note: findings ? findings + (findings === 1 ? " finding" : " findings") : "Waiting on figures", done: false, hot: true, href: "#stage3", icon: "bars" },
      { n: "04", name: "The plan", note: steps ? steps + (steps === 1 ? " step" : " steps") : "—", done: false, href: "#stage4", icon: "cal" }
    ];
    el.innerHTML = S4.map(function (s) {
      return '<a class="tb-step' + (s.hot ? " is-hot" : "") + (s.done ? " is-done" : "") + '" href="' + s.href + '">' +
        '<span class="tb-step-top"><span class="tb-tile">' + ICON[s.icon] + "</span>" +
        (s.hot ? '<span class="tb-tag">Where the money is</span>' : '<span class="tb-step-n">' + s.n + "</span>") + "</span>" +
        "<b>" + s.name + "</b><small>" + esc(s.note) + "</small></a>";
    }).join("");
  }

  function drawIntake(a) {
    const el = $("tbIntake");
    if (!el) return;
    const v = answers(), io = a.intake;
    if (!v || !io) {
      el.innerHTML =
        '<div class="tb-empty"><p>No intake yet for this client. Send them the link, or fill it in together — it is all ticks, about four minutes.</p>' +
        '<div class="tb-acts"><a class="tb-btn" href="form.html?f=tax-intake">Open the intake' + CHEV + '</a>' +
        '<a class="tb-btn is-ghost" href="send.html">Send it to the client</a></div></div>';
      return;
    }
    const items = INTAKE.items.filter(function (i) { return i.kind === "multi" || i.kind === "select"; });
    const chips = [];
    items.forEach(function (it) {
      const val = v[it.id];
      const vals = Array.isArray(val) ? val : (val !== undefined ? [val] : []);
      vals.forEach(function (x) {
        const o = (it.options || []).filter(function (o) { return o.v === x; })[0];
        if (o && !o.only) chips.push(o.label);
      });
    });
    const sched = io.raw.schedules || [];
    el.innerHTML =
      '<div class="tb-split">' +
        '<div class="tb-split-a">' +
          '<h4 class="tb-mini">What they ticked</h4>' +
          '<ul class="tb-chips">' + chips.map(function (c) { return "<li>" + TICK + esc(c) + "</li>"; }).join("") + "</ul>" +
          '<a class="tb-link" href="form.html?f=tax-intake">' + (S.example ? "See the intake itself" : "Open the intake") + CHEV + "</a>" +
        "</div>" +
        '<div class="tb-split-b">' +
          '<h4 class="tb-mini">And the file now knows</h4>' +
          '<div class="tb-knows"><b>' + io.raw.needs.length + '</b><span><strong>documents this return needs</strong><small>the list their answers made, not a standard one</small></span></div>' +
          '<div class="tb-knows"><b>' + (sched.length || 1) + '</b><span><strong>' + (sched.length === 1 ? "schedule" : "schedules") + ' it is likely to need</strong><small>' + esc(sched.length ? sched.map(function (x) { return x.n.replace(/^Schedule ([A-Z]{1,2})\b/, "$1"); }).join(" · ") : "a straightforward 1040") + "</small></span></div>" +
          '<div class="tb-knows is-gold"><b>' + io.score + '</b><span><strong>out of 100 ready</strong><small>' + esc((FORMS.band(INTAKE.bands, io.score) || {}).label || "") + "</small></span></div>" +
        "</div>" +
      "</div>";
  }

  function drawDocs(a) {
    const el = $("tbDocs");
    if (!el) return;
    const io = a.intake;
    if (!io) { el.innerHTML = '<p class="tb-quiet">The list appears once the intake is answered — every document on it comes from something they ticked.</p>'; return; }
    const needs = io.raw.needs.slice().sort(function (x, y) { return (x.have ? 1 : 0) - (y.have ? 1 : 0); });
    const got = needs.filter(function (n) { return n.have; }).length;
    const pct = needs.length ? got / needs.length * 100 : 0;
    const head = $("tbDocsCount");
    if (head) head.innerHTML = '<span>Attached</span><b>' + got + ' <em>of ' + needs.length + '</em></b><i><s style="width:' + pct.toFixed(1) + '%"></s></i>';
    el.innerHTML = '<ul class="tb-docs">' + needs.map(function (n) {
      return '<li class="' + (n.have ? "is-in" : "is-out") + '">' +
        '<span class="tb-dot">' + (n.have ? TICK : "") + "</span>" +
        '<span class="tb-doc-t"><b>' + esc(n.name) + "</b><small>" + esc(n.why) + "</small></span>" +
        '<span class="tb-doc-s">' + (n.have ? "Attached" : "To collect") + "</span></li>";
    }).join("") + "</ul>";
  }

  /* ---------- the figures form: drawn once, then only read ---------- */
  function relevant(d) {
    if (S.all || d.always) return true;
    const v = answers();
    if (!v) return true;
    return (d.when || []).some(function (w) { const p = w.split(":"); return has(v, p[0], p[1]); }) || +S.figs[d.id] > 0;
  }

  function drawFigures() {
    const el = $("tbFigs");
    if (!el) return;
    const groups = {};
    FIELDS.forEach(function (d) { if (relevant(d)) (groups[d.g] = groups[d.g] || []).push(d); });
    const hidden = FIELDS.filter(function (d) { return !relevant(d); }).length;
    el.innerHTML =
      '<div class="tb-fig-top">' +
        '<label class="tb-field is-wide"><span>Client</span><input id="tbName" type="text" autocomplete="off" placeholder="e.g. The Ellerys" value="' + esc(S.name) + '"></label>' +
        '<label class="tb-field is-wide"><span>Filing status</span><select id="tbStatus">' +
          Object.keys(STATUS_NAME).map(function (k) { return '<option value="' + k + '"' + (S.figs.status === k ? " selected" : "") + ">" + STATUS_NAME[k] + "</option>"; }).join("") +
        "</select></label>" +
      "</div>" +
      Object.keys(groups).map(function (g) {
        return '<fieldset class="tb-fg"><legend>' + g + "</legend><div class=\"tb-fg-grid\">" +
          groups[g].map(function (d) {
            const val = +S.figs[d.id] || 0;
            return '<label class="tb-field' + (d.count ? " is-count" : "") + '"><span>' + t(d.label, d.term) + "</span>" +
              '<span class="tb-in">' + (d.count ? "" : "<i>$</i>") +
              '<input data-fig="' + d.id + '" type="text" inputmode="numeric" autocomplete="off" value="' + (val ? val : "") + '" placeholder="0"></span>' +
              (d.hint ? "<small>" + esc(d.hint) + "</small>" : "") + "</label>";
          }).join("") + "</div></fieldset>";
      }).join("") +
      (hidden || S.all ? '<button type="button" class="tb-more" id="tbAll">' + (S.all ? "Only the figures this return needs" : "Show every figure (" + hidden + " more)") + "</button>" : "");

    el.querySelectorAll("[data-fig]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        const clean = inp.value.replace(/[^\d]/g, "");
        if (clean !== inp.value) inp.value = clean;
        S.figs[inp.getAttribute("data-fig")] = clean ? +clean : 0;
        edited();
      });
    });
    const st = $("tbStatus");
    if (st) st.addEventListener("change", function () { S.figs.status = st.value; edited(); });
    const nm = $("tbName");
    if (nm) nm.addEventListener("input", function () { S.name = nm.value; edited(true); });
    const all = $("tbAll");
    if (all) all.addEventListener("click", function () { S.all = !S.all; save(); drawFigures(); });
    mark(el);
  }

  /* ---------- the findings ---------- */
  function drawFindings(a) {
    const el = $("tbFind");
    if (!el) return;
    const h = $("tbFindH");
    if (h) h.textContent = ["What the figures say", "One thing nobody noticed", "Two things nobody noticed",
                            "Three things nobody noticed", "Four things nobody noticed"][a.findings.length] || "What nobody noticed";
    if (!a.findings.length) {
      el.innerHTML = '<p class="tb-quiet">Nothing stands out yet. The findings come from the figures above — income, the deductions, the family.</p>';
      return;
    }
    let n = 0;
    el.innerHTML = a.findings.map(function (f) {
      n++;
      if (f.id === "deduct") {
        const max = Math.max(f.bars.a, f.bars.b) || 1;
        return '<article class="tb-find is-plain">' +
          '<div class="tb-find-t"><h4><span class="tb-num">' + n + "</span>" + esc(f.head) + "</h4><p>" + f.body + "</p></div>" +
          '<div class="tb-bars">' +
            '<div class="tb-bar"><span>If they itemise</span><i><s class="' + (f.bars.itemWins ? "is-win" : "is-lose") + '" style="width:' + (f.bars.a / max * 100).toFixed(1) + '%"><em>' + usd(f.bars.a) + "</em></s></i></div>" +
            '<div class="tb-bar"><span>' + t("Standard", "stddeduction") + '</span><i><s class="' + (f.bars.itemWins ? "is-lose" : "is-win") + '" style="width:' + (f.bars.b / max * 100).toFixed(1) + '%"><em>' + usd(f.bars.b) + "</em></s></i></div>" +
            '<p class="tb-bars-n">' + (f.bars.itemWins ? "Itemising" : "Standard") + " wins by <b>" + usd(f.bars.gap) + "</b></p>" +
          "</div></article>";
      }
      if (f.id === "aotc") {
        const p = a.phase;
        const lo = p.lo - (p.hi - p.lo) / 4, hi = p.hi + (p.hi - p.lo) / 4, span = hi - lo;
        const at = function (x) { return Math.max(0, Math.min(100, (x - lo) / span * 100)).toFixed(2); };
        return '<article class="tb-find is-money">' +
          '<div class="tb-find-row"><div class="tb-find-t"><h4><span class="tb-num">' + n + "</span>" + esc(f.head) + "</h4><p>" + f.body + "</p></div>" +
          '<div class="tb-big"><small>' + f.bigLabel + "</small><b>" + usd(f.big) + "</b><span>" + esc(f.bigNote) + "</span></div></div>" +
          '<figure class="tb-ramp" aria-label="The credit shrinks from ' + usd(p.full) + " at " + usd(p.lo) + " to nothing at " + usd(p.hi) + ". This return is at " + usd(p.agi) + '.">' +
            '<div class="tb-ramp-plot" style="--lo:' + at(p.lo) + "%;--hi:" + at(p.hi) + "%;--at:" + at(p.agi) + '%">' +
              '<span class="tb-ramp-full"></span><span class="tb-ramp-slope"></span>' +
              '<span class="tb-ramp-l is-lo"></span><span class="tb-ramp-l is-hi"></span>' +
              '<span class="tb-ramp-pin"></span><span class="tb-ramp-here">they are here</span>' +
              (a.sep && a.sep.full ? '<span class="tb-ramp-back"></span>' : "") +
            "</div>" +
            '<div class="tb-ramp-x" style="--lo:' + at(p.lo) + "%;--hi:" + at(p.hi) + "%;--at:" + at(p.agi) + '%">' +
              '<span class="is-lo"><b>' + usd(p.lo) + "</b>" + usd(p.full) + "</span>" +
              '<span class="is-at"><b>' + usd(p.agi) + "</b>" + usd(p.now) + "</span>" +
              '<span class="is-hi"><b>' + usd(p.hi) + "</b>$0</span>" +
            "</div>" +
          "</figure></article>";
      }
      if (f.id === "sep") {
        const s = a.sep;
        return '<div class="tb-find-pair">' +
          '<article class="tb-find is-lever"><div class="tb-find-t"><h4><span class="tb-num">' + n + "</span>" + esc(f.head) + "</h4><p>" + f.body + "</p></div>" +
          '<div class="tb-stats">' + f.stats.map(function (x) { return '<div><small>' + esc(x.k) + '</small><b class="is-' + x.tone + '">' + esc(x.v) + "</b></div>"; }).join("") + "</div></article>" +
          '<aside class="tb-owe"><small>' + (a.base.due >= 0 ? "What they owe" : "Their refund") + "</small>" +
            '<div class="tb-owe-n"><s>' + usd(Math.abs(a.base.due)) + "</s>" + ARROW + "<b>" + usd(Math.abs(s.after.due)) + "</b></div>" +
            '<p>Told in February it is a plan. Told in April it is a bill.</p></aside>' +
        "</div>";
      }
      return "";
    }).join("");
    mark(el);
  }

  function drawSums(a) {
    const el = $("tbSums");
    if (!el) return;
    const b = a.base;
    const rows = [
      [t("Adjusted gross income", "agi"), b.agi],
      [b.useItem ? t("Itemised deductions", "itemised") : t("Standard deduction", "stddeduction"), -(b.useItem ? b.itemised : b.std)],
      b.charStd > 0 ? ["Charity, without itemising", -b.charStd] : null,
      b.qbi > 0 ? [t("QBI deduction", "qbi"), -b.qbi] : null,
      ["Taxable income", b.taxable, "is-sub"],
      ["Income tax", b.incomeTax],
      b.se > 0 ? [t("Self-employment tax", "setax"), b.se] : null,
      b.addMed > 0 ? ["Additional Medicare tax", b.addMed] : null,
      b.niit > 0 ? ["Net investment income tax", b.niit] : null,
      /* exactly what the engine took off — total is the taxes less the credits */
      (b.ctc > 0 || b.aotc > 0) ? ["Credits", -(b.incomeTax + b.se + b.addMed + b.niit - b.total)] : null,
      ["Total tax", b.total, "is-sub"],
      ["Withheld and paid in", -b.paid],
      [b.due >= 0 ? "Owed" : "Refund", Math.abs(b.due), "is-total"]
    ].filter(Boolean);
    el.innerHTML = '<table class="tb-sums"><tbody>' + rows.map(function (r) {
      return '<tr class="' + (r[2] || "") + '"><th scope="row">' + r[0] + "</th><td>" + usd(r[1]) + "</td></tr>";
    }).join("") + "</tbody></table>" +
    (b.topBracket ? '<p class="tb-warn">This return reaches the 37% bracket. From 2026 itemised deductions are capped at a 35% benefit there, and that cap is not modelled here — check it on the return.</p>' : "") +
    /* the trigger uses the 2025 thresholds on purpose: 2026's are higher, so this warns a little
       early rather than a little late, and it prints no figure it cannot stand behind */
    (b.taxable > (b.status === "mfj" || b.status === "qss" ? 394600 : 197300) && b.qbi > 0 ? '<p class="tb-warn">Taxable income is above the level where the QBI deduction can be limited by the kind of business and its wages. The 20% figure here may be too generous.</p>' : "");
    mark(el);
  }

  function drawPlan(a) {
    const el = $("tbPlan");
    if (!el) return;
    const col = function (title, cls, list, empty) {
      return '<div class="tb-plan-col ' + cls + '"><h4>' + title + "</h4>" +
        (list.length ? list.map(function (p) {
          return '<div class="tb-plan-row"><span class="tb-plan-i">' + (ICON[p.icon] || ICON.doc) + "</span>" +
            '<span class="tb-plan-t"><b>' + esc(p.head) + "</b><small>" + p.note + "</small></span>" +
            (p.val ? '<span class="tb-plan-v">' + esc(p.val) + "</span>" : "") + "</div>";
        }).join("") : '<p class="tb-quiet">' + empty + "</p>") + "</div>";
    };
    el.innerHTML =
      col("Before the deadline", "is-now", a.plan.now, "Nothing that has to happen before this return is filed.") +
      col("Before next year", "is-next", a.plan.next, "Nothing to change for next year on these figures.");
    mark(el);
  }

  function mark(el) {
    if (window.WD && window.WD.explain && window.WD.explain.refresh) { try { window.WD.explain.refresh(); } catch (e) {} }
  }

  const ICON = {
    clip: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v2.5H9z"/><path d="m8.5 12 2 2 4-4"/><path d="M9 17h6"/></svg>',
    docs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4"/><path d="M4.5 7v13.5a1 1 0 0 0 1 1H15"/><path d="M10 13h5M10 16.5h5"/></svg>',
    bars: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20.5h16"/><rect x="5.5" y="12" width="3" height="6" rx=".5"/><rect x="10.5" y="8" width="3" height="10" rx=".5"/><rect x="15.5" y="4" width="3" height="14" rx=".5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/></svg>',
    coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18"/><path d="M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3.2-2 3-4.5 3-4.5-1.3-4.5-3"/></svg>',
    cap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5 12 5l9 4.5-9 4.5z"/><path d="M7 11.7v4.3c0 1.3 2.2 2.5 5 2.5s5-1.2 5-2.5v-4.3"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5V8h4"/><path d="M10 13h5M10 16.5h5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.2-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8c0 5-7 9.2-7 9.2z"/></svg>',
    trend: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18 10 12l3.5 3L20 8.5"/><path d="M15 8.5h5v5"/></svg>'
  };

  /* ============================================================
     Wiring
     ============================================================ */
  let last = null;
  function paint(all) {
    const a = analyse();
    last = a;
    drawBanner();
    drawProof(a);
    drawSpine(a);
    drawIntake(a);
    drawDocs(a);
    if (all) {
      drawFigures();
      /* the example opens on its findings; their own file opens on the figures */
      const box = $("tbFigsBox");
      if (box) box.open = !S.example;
    }
    drawFindings(a);
    drawSums(a);
    drawPlan(a);
  }

  let timer = null;
  function edited(nameOnly) {
    if (S.example) { S.example = false; drawBanner(); }
    save();
    clearTimeout(timer);
    timer = setTimeout(function () { paint(false); }, nameOnly ? 120 : 60);
  }

  function startOwn() {
    const v = readIntake();
    S.example = false;
    S.name = "";
    S.all = false;
    S.figs = blankFigs(v && STATUS_FROM_INTAKE[v.filing]);
    save();
    paint(true);
    const f = $("stage1");
    if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function loadExample() {
    S.example = true; S.name = EX_NAME; S.all = false; S.figs = Object.assign({}, EX_FIGS);
    save(); paint(true);
  }

  document.addEventListener("click", function (e) {
    const own = e.target.closest("[data-tb-own]");
    if (own) { e.preventDefault(); startOwn(); return; }
    const ex = e.target.closest("[data-tb-example]");
    if (ex) { e.preventDefault(); loadExample(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });

  paint(true);

  /* for the tests */
  window.WD.taxbp = { state: function () { return S; }, analyse: function () { return last; }, EX_FIGS: EX_FIGS };
})();
