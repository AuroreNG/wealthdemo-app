/* ============================================================
   WEALTHDEMO — Tax Impact on Your Investments

   A faithful rebuild of the existing calculator: same fields,
   same wording, same figures. Verified against the original:

     22% today, 25% at withdrawal
     Tax Now    Savings $25,000 @ 4% / 20 yrs  ->  $46,217
     Tax Later  401(k)  $100,000 @ 6% / 20 yrs ->  $240,535
     Tax-Free   Roth    $50,000 @ 6% / 20 yrs  ->  $160,357
     $175,000 today — 14% / 57% / 29% — $447,109 projected

   The three engines:
     Tax Now    amount x (1 + r(1-t0))^y      tax drag each year
     Tax Later  amount x (1 + r)^y x (1-t1)   one bite at the end
     Tax-Free   amount x (1 + r)^y            no bite
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("tiNow")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };

  const BUCKETS = [
    { key: "now",   label: "Tax Now",              tint: "a",
      note: "May create current taxable interest, dividends, or gains.",
      types: ["Savings / checking / money market", "Brokerage or taxable investment account",
              "Certificates of deposit (CDs)", "Taxable bonds or bond funds",
              "Stocks or mutual funds (taxable)", "Other taxable account"] },
    { key: "later", label: "Tax Later",            tint: "b",
      note: "Generally defers taxes until money is withdrawn later.",
      types: ["Traditional 401(k)", "Traditional IRA", "403(b)", "457(b)", "SEP IRA",
              "SIMPLE IRA", "Deferred annuity", "Pension lump sum",
              "Other tax-deferred account"] },
    { key: "free",  label: "Potentially Tax-Free", tint: "c",
      note: "May allow qualified or properly structured tax-advantaged access.",
      types: ["Roth IRA", "Roth 401(k)", "Health savings account (HSA)",
              "Municipal bonds", "Cash value life insurance", "529 education plan",
              "Other potentially tax-free"] }
  ];
  const BY = {}; BUCKETS.forEach(function (b) { BY[b.key] = b; });

  const STORE = "wealthdemo.tool.taximpact";
  const DEFAULTS = function () {
    return {
      t0: 22, t1: 25,
      rows: {
        now:   [{ type: 0, amt: 25000,  ret: 4, yrs: 20 }],
        later: [{ type: 0, amt: 100000, ret: 6, yrs: 20 }],
        free:  [{ type: 0, amt: 50000,  ret: 6, yrs: 20 }]
      },
      happy: null, adjust: null, note: ""
    };
  };
  let S = DEFAULTS();

  /* ---------- the three engines ---------- */
  function project(key, row, t0, t1) {
    const amt = Math.max(0, row.amt), r = row.ret / 100, y = Math.max(0, row.yrs);
    if (key === "now")   return amt * Math.pow(1 + r * (1 - t0 / 100), y);
    if (key === "later") return amt * Math.pow(1 + r, y) * (1 - t1 / 100);
    return amt * Math.pow(1 + r, y);
  }

  function totals() {
    const t = { now: { amt: 0, proj: 0 }, later: { amt: 0, proj: 0 }, free: { amt: 0, proj: 0 } };
    BUCKETS.forEach(function (b) {
      S.rows[b.key].forEach(function (row) {
        t[b.key].amt += Math.max(0, row.amt);
        t[b.key].proj += project(b.key, row, S.t0, S.t1);
      });
    });
    t.amt = t.now.amt + t.later.amt + t.free.amt;
    t.proj = t.now.proj + t.later.proj + t.free.proj;
    return t;
  }

  const share = function (part, whole) { return whole > 0 ? part / whole * 100 : 0; };

  /* ============================================================
     the rows
     ============================================================ */
  function drawRows() {
    BUCKETS.forEach(function (b) {
      const wrap = $("rows_" + b.key);
      wrap.innerHTML = "";
      S.rows[b.key].forEach(function (row, i) {
        const el = document.createElement("div");
        el.className = "ti-row";
        el.innerHTML =
          '<div class="field ti-f-inv">' +
            '<label>Investment</label>' +
            '<select class="ti-sel" data-b="' + b.key + '" data-i="' + i + '" data-k="type">' +
              b.types.map(function (t, n) {
                return '<option value="' + n + '"' + (n === row.type ? " selected" : "") + '>' + t + '</option>';
              }).join("") +
            '</select>' +
          '</div>' +
          '<div class="field ti-f-amt">' +
            '<label>Amount ($)</label>' +
            '<div class="money-in"><i>$</i><input type="number" min="0" step="1000" inputmode="numeric" ' +
              'data-b="' + b.key + '" data-i="' + i + '" data-k="amt" value="' + row.amt + '"></div>' +
          '</div>' +
          '<div class="field ti-f-ret">' +
            '<label>Return %</label>' +
            '<div class="pct-in"><input type="number" min="-20" max="30" step="0.25" inputmode="decimal" ' +
              'data-b="' + b.key + '" data-i="' + i + '" data-k="ret" value="' + row.ret + '"><i>%</i></div>' +
          '</div>' +
          '<div class="field ti-f-yrs">' +
            '<label>Years</label>' +
            '<div class="pct-in"><input type="number" min="0" max="60" step="1" inputmode="numeric" ' +
              'data-b="' + b.key + '" data-i="' + i + '" data-k="yrs" value="' + row.yrs + '"><i>yrs</i></div>' +
          '</div>' +
          '<button type="button" class="ti-x" data-b="' + b.key + '" data-i="' + i + '" ' +
            'aria-label="Remove this investment"' + (S.rows[b.key].length < 2 ? " disabled" : "") + '>' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10"/><path d="M17 7 7 17"/></svg></button>' +
          '<p class="ti-proj">Projected value: <b>' + usd(project(b.key, row, S.t0, S.t1)) + '</b></p>';
        wrap.appendChild(el);
      });
    });
    bindRows();
  }

  function bindRows() {
    document.querySelectorAll(".ti-row [data-k]").forEach(function (el) {
      const b = el.getAttribute("data-b"), i = +el.getAttribute("data-i"), k = el.getAttribute("data-k");
      const handler = function () {
        const v = parseFloat(el.value);
        S.rows[b][i][k] = isFinite(v) ? v : 0;
        if (k === "type") { run(); return; }
        /* keep focus: repaint the figures, not the inputs */
        run(true);
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
    document.querySelectorAll(".ti-x").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const b = btn.getAttribute("data-b"), i = +btn.getAttribute("data-i");
        if (S.rows[b].length < 2) return;
        S.rows[b].splice(i, 1);
        run();
      });
    });
  }

  /* ============================================================
     render
     ============================================================ */
  function run(keepRows) {
    S.t0 = Math.min(100, Math.max(0, parseFloat($("tiNow").value) || 0));
    S.t1 = Math.min(100, Math.max(0, parseFloat($("tiLater").value) || 0));

    if (!keepRows) drawRows();
    else {
      /* just refresh the per-row projections in place */
      BUCKETS.forEach(function (b) {
        const ps = $("rows_" + b.key).querySelectorAll(".ti-proj b");
        S.rows[b.key].forEach(function (row, i) {
          if (ps[i]) ps[i].textContent = usd(project(b.key, row, S.t0, S.t1));
        });
      });
    }

    const t = totals();

    /* ---- banner: the biggest slice ---- */
    let big = BUCKETS[0], bigPct = share(t.now.amt, t.amt);
    BUCKETS.forEach(function (b) {
      const p = share(t[b.key].amt, t.amt);
      if (p > bigPct) { big = b; bigPct = p; }
    });
    if (t.amt <= 0) {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "What you own";
      $("bnSub").textContent = "put each holding under the tax section that applies";
    } else {
      $("bnLabel").textContent = "BIGGEST SHARE";
      $("bnBig").textContent = Math.round(bigPct) + "%";
      $("bnSub").textContent = "of " + usd(t.amt) + " sits in " + big.label +
        (big.key === "later" ? " — taxed on the way out" :
         big.key === "now" ? " — taxed along the way" : " — no tax bite illustrated");
    }

    /* ---- the three mix cards ---- */
    BUCKETS.forEach(function (b) {
      const p = share(t[b.key].amt, t.amt);
      $("mixPct_" + b.key).textContent = Math.round(p) + "%";
      $("mixAmt_" + b.key).textContent = usd(t[b.key].amt);
      $("mixProj_" + b.key).textContent = usd(t[b.key].proj);
      $("mixBar_" + b.key).style.width = Math.max(0, p).toFixed(2) + "%";
    });

    /* ---- the two stacked bars ---- */
    stack("stackNow", [t.now.amt, t.later.amt, t.free.amt], t.amt);
    stack("stackEnd", [t.now.proj, t.later.proj, t.free.proj], t.proj);
    $("stackNowTot").textContent = usd(t.amt);
    $("stackEndTot").textContent = usd(t.proj);

    /* ---- their summary sentence, word for word ---- */
    $("tiSum").innerHTML = t.amt <= 0
      ? "Add an amount under any section to see your mix."
      : "Your current portfolio totals <b>" + usd(t.amt) + "</b>. Approximately <b>" +
        Math.round(share(t.now.amt, t.amt)) + "%</b> is Tax Now, <b>" +
        Math.round(share(t.later.amt, t.amt)) + "%</b> is Tax Later, and <b>" +
        Math.round(share(t.free.amt, t.amt)) + "%</b> is Potentially Tax-Free. " +
        "Based on the assumptions entered, the combined projected value is approximately <b>" +
        usd(t.proj) + "</b>.";

    said(t);
    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  function stack(id, parts, tot) {
    const el = $(id);
    el.innerHTML = "";
    if (tot <= 0) { el.innerHTML = '<u data-tint="x" style="width:100%"></u>'; return; }
    BUCKETS.forEach(function (b, n) {
      const p = parts[n] / tot * 100;
      if (p <= 0) return;
      const u = document.createElement("u");
      u.setAttribute("data-tint", b.tint);
      u.style.width = p.toFixed(3) + "%";
      u.title = b.label + " — " + Math.round(p) + "%";
      if (p >= 9) u.textContent = Math.round(p) + "%";
      el.appendChild(u);
    });
  }

  function said(t) {
    const box = $("tiOut");
    if (!S.happy) {
      box.textContent = "Complete the questions above to capture your assessment.";
      box.classList.remove("is-set");
      return;
    }
    box.classList.add("is-set");
    let s;
    if (S.happy === "yes") {
      s = "You're happy with the mix as it stands — <b>" + Math.round(share(t.now.amt, t.amt)) +
        "%</b> Tax Now, <b>" + Math.round(share(t.later.amt, t.amt)) + "%</b> Tax Later, <b>" +
        Math.round(share(t.free.amt, t.amt)) + "%</b> Potentially Tax-Free.";
    } else {
      s = "You would change the mix.";
    }
    if (S.adjust) {
      const b = BY[S.adjust];
      s += " The category to explore increasing is <b>" + b.label + "</b> — today <b>" +
        Math.round(share(t[S.adjust].amt, t.amt)) + "%</b> of " + usd(t.amt) + ", or <b>" +
        usd(t[S.adjust].amt) + "</b>.";
    }
    const note = (S.note || "").trim();
    if (note) s += "<br><span class=\"ti-note\">Their note: &ldquo;" + esc(note) + "&rdquo;</span>";
    box.innerHTML = s;
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- plumbing ---------- */
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s || !s.rows) return;
    BUCKETS.forEach(function (b) { if (!Array.isArray(s.rows[b.key]) || !s.rows[b.key].length) s.rows[b.key] = DEFAULTS().rows[b.key]; });
    S = s;
    $("tiNow").value = S.t0;
    $("tiLater").value = S.t1;
    $("tiNote").value = S.note || "";
    paintChoices();
  }

  function paintChoices() {
    document.querySelectorAll(".ti-choice").forEach(function (btn) {
      const g = btn.getAttribute("data-group"), v = btn.getAttribute("data-val");
      const on = S[g] === v;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  $("tiNow").addEventListener("input", function () { run(true); });
  $("tiLater").addEventListener("input", function () { run(true); });

  BUCKETS.forEach(function (b) {
    $("add_" + b.key).addEventListener("click", function () {
      const last = S.rows[b.key][S.rows[b.key].length - 1] || { ret: 6, yrs: 20 };
      S.rows[b.key].push({ type: 0, amt: 0, ret: last.ret, yrs: last.yrs });
      run();
    });
  });

  document.querySelectorAll(".ti-choice").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const g = btn.getAttribute("data-group"), v = btn.getAttribute("data-val");
      S[g] = S[g] === v ? null : v;
      paintChoices();
      run(true);
    });
  });
  $("tiNote").addEventListener("input", function () { S.note = $("tiNote").value; run(true); });

  const moreBtn = $("moreBtn"), moreMenu = $("moreMenu");
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      moreMenu.toggleAttribute("hidden", !moreMenu.hasAttribute("hidden"));
    });
    document.addEventListener("click", function () { moreMenu.setAttribute("hidden", ""); });
    moreMenu.addEventListener("click", function (e) { e.stopPropagation(); });
  }
  if ($("printBtn")) $("printBtn").addEventListener("click", function () { window.print(); });

  function resetAll() {
    S = DEFAULTS();
    $("tiNow").value = S.t0;
    $("tiLater").value = S.t1;
    $("tiNote").value = "";
    paintChoices();
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  }
  if ($("resetBtn")) $("resetBtn").addEventListener("click", resetAll);
  if ($("resetBtn2")) $("resetBtn2").addEventListener("click", resetAll);

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const t = totals();
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["Tax Impact on Your Investments — WEALTHDEMO", "",
      "ASSUMPTIONS",
      "  Current tax rate        " + S.t0 + "%",
      "  Tax rate at withdrawal  " + S.t1 + "%", ""];
    BUCKETS.forEach(function (b) {
      lines.push(b.label.toUpperCase());
      S.rows[b.key].forEach(function (row) {
        lines.push("  " + b.types[row.type] + " — " + usd(row.amt) + " at " + row.ret +
          "% for " + row.yrs + " yrs  ->  " + usd(project(b.key, row, S.t0, S.t1)));
      });
      lines.push("  Subtotal                " + usd(t[b.key].amt) +
        "   (" + Math.round(share(t[b.key].amt, t.amt)) + "% of the portfolio)",
        "  Projected               " + usd(t[b.key].proj), "");
    });
    lines.push("PORTFOLIO",
      "  Total today             " + usd(t.amt),
      "  Mix                     " + Math.round(share(t.now.amt, t.amt)) + "% Tax Now / " +
        Math.round(share(t.later.amt, t.amt)) + "% Tax Later / " +
        Math.round(share(t.free.amt, t.amt)) + "% Potentially Tax-Free",
      "  Combined projected      " + usd(t.proj), "");
    if (S.happy) {
      lines.push("CLIENT RESPONSE",
        "  Happy with the mix      " + (S.happy === "yes" ? "Yes" : "No, would change it"));
      if (S.adjust) lines.push("  Would explore increasing " + BY[S.adjust].label);
      if ((S.note || "").trim()) lines.push("  Note                    " + S.note.trim());
      lines.push("");
    }
    lines.push("Educational illustration only. The investment lists are grouped using simplified " +
      "common tax-treatment assumptions. Actual treatment may differ based on contribution type, " +
      "ownership, basis, plan design, policy structure, distributions, qualification rules, and " +
      "applicable law. Tax Now uses the entered current tax rate as a simplified annual drag on the " +
      "expected return. Tax Later applies the entered future tax rate to the projected amount. " +
      "Potentially Tax-Free treatment is not automatic or guaranteed. Returns are hypothetical and " +
      "not guaranteed.");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  load();
  run();
})();
