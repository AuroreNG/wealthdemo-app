/* ============================================================
   WEALTHDEMO — Debt Payoff & Interest

   A faithful rebuild of the existing calculator: same fields,
   same wording, same figures. Verified against the original on
   the default case — $10,000 at 22.9% paying $350 gives 42
   months, $4,590 of interest, $14,590 paid, 54.5% of the first
   payment going to interest, and a March 2030 payoff.

   The one thing added is a picture, because the single most
   useful fact here — that over half of an early payment is
   interest, and that the split flips around month seven — is
   invisible in a table of forty-two rows.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("dBal")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };
  const usd0 = function (n) {
    const a = Math.abs(n), s = n < 0 ? "−$" : "$";
    if (a >= 1000000) return s + (a / 1000000).toFixed(1) + "M";
    if (a >= 1000) return s + Math.round(a / 1000) + "k";
    return s + Math.round(a);
  };
  const span = function (m) {
    if (!isFinite(m) || m < 0) return "—";
    if (m === 0) return "Now";
    const y = Math.floor(m / 12), r = m % 12;
    if (y === 0) return r + (r === 1 ? " month" : " months");
    return y + " yr" + (y === 1 ? "" : "s") + (r ? " " + r + " mo" : "");
  };
  const MONTHS = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
  const dateIn = function (m) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + Math.round(m));
    return MONTHS[d.getMonth()] + " " + d.getFullYear();
  };

  const FIELDS = ["dBal", "dApr", "dPmt", "dExtra", "dOnce", "dBuy",
                  "cAmt", "cRate", "cTerm", "cFee"];
  const STORE = "wealthdemo.tool.debt";
  const DEFAULTS = { dBal: 10000, dApr: 22.9, dPmt: 350, dExtra: 0, dOnce: 0, dBuy: 0,
                     cAmt: 10000, cRate: 12.9, cTerm: 60, cFee: 3 };
  const CAP = 600;

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    return {
      bal: Math.max(0, num("dBal", 10000)),
      apr: Math.max(0, num("dApr", 22.9)),
      pmt: Math.max(0, num("dPmt", 350)),
      extra: Math.max(0, num("dExtra", 0)),
      once: Math.max(0, num("dOnce", 0)),
      buy: Math.max(0, num("dBuy", 0)),
      cAmt: Math.max(0, num("cAmt", 10000)),
      cRate: Math.max(0, num("cRate", 12.9)),
      cTerm: Math.max(1, num("cTerm", 60)),
      cFee: Math.max(0, num("cFee", 3))
    };
  }

  /* ---------- run the card down, month by month ---------- */
  function work(p, extraOverride) {
    const r = p.apr / 100 / 12;
    const extra = extraOverride === undefined ? p.extra : extraOverride;
    let bal = Math.max(0, p.bal - p.once);
    let interest = 0, paid = p.once, m = 0;
    const rows = [], ints = [], prins = [];

    while (bal > 0.005 && m < CAP) {
      const i = bal * r;
      const due = p.pmt + extra;
      /* a payment that cannot cover interest plus new charges never clears */
      if (due <= i + p.buy) { m = Infinity; break; }
      const pay = Math.min(due, bal + i + p.buy);
      const principal = pay - i - p.buy;
      interest += i; paid += pay;
      bal = bal + i + p.buy - pay;
      m++;
      rows.push({ m: m, pay: pay, i: i, p: principal, bal: Math.max(0, bal) });
      ints.push(i); prins.push(Math.max(0, principal));
    }

    const firstInterest = (p.bal - p.once) * r;
    let cross = null;
    for (let k = 0; k < rows.length; k++) {
      if (rows[k].p > rows[k].i) { cross = k + 1; break; }
    }

    return {
      months: m, interest: interest, paid: paid, rows: rows,
      ints: ints, prins: prins, cross: cross,
      firstInterest: firstInterest,
      firstPct: p.pmt + extra > 0 ? firstInterest / (p.pmt + extra) : 0
    };
  }

  /* ---------- the consolidation loan, for the second panel ---------- */
  function loan(p) {
    const financed = p.cAmt * (1 + p.cFee / 100);
    const r = p.cRate / 100 / 12, n = Math.round(p.cTerm);
    if (n <= 0) return null;
    const pay = r > 0 ? financed * r / (1 - Math.pow(1 + r, -n)) : financed / n;
    return { financed: financed, fee: p.cAmt * (p.cFee / 100),
             pay: pay, total: pay * n, cost: pay * n - p.cAmt, months: n };
  }

  /* ============================================================
     where the money goes
     ============================================================ */
  function geom() {
    const w = window.innerWidth;
    /* PT leaves a clear lane above the bars for the crossover flag */
    if (w < 700)  return { CW: 480,  CH: 222, PL: 46, PR: 14, PT: 32, PB: 34 };
    if (w < 1100) return { CW: 880,  CH: 262, PL: 56, PR: 20, PT: 34, PB: 36 };
    return         { CW: 1120, CH: 282, PL: 60, PR: 24, PT: 34, PB: 38 };
  }

  function chart(p, w) {
    const g = geom(), CW = g.CW, CH = g.CH;
    const plotW = CW - g.PL - g.PR, plotH = CH - g.PT - g.PB;
    const base = g.PT + plotH;
    const n = w.rows.length;
    if (!n) return "";

    const top = Math.max.apply(null, w.rows.map(function (x) { return x.pay; })) || 1;
    const bw = plotW / n;
    const X = function (i) { return g.PL + i * bw; };
    const Y = function (v) { return base - (v / top) * plotH; };

    let bars = "";
    const step = n > 160 ? Math.ceil(n / 160) : 1;
    for (let i = 0; i < n; i += step) {
      const row = w.rows[i];
      const x = X(i), wd = Math.max(1, bw * step - (bw > 3 ? 1 : 0));
      const iy = Y(row.i);
      bars += '<rect class="dt-int" x="' + x.toFixed(1) + '" y="' + iy.toFixed(1) +
        '" width="' + wd.toFixed(1) + '" height="' + (base - iy).toFixed(1) + '"/>';
      const py = Y(row.i + row.p);
      bars += '<rect class="dt-prin" x="' + x.toFixed(1) + '" y="' + py.toFixed(1) +
        '" width="' + wd.toFixed(1) + '" height="' + Math.max(0, iy - py).toFixed(1) + '"/>';
    }

    /* the month the split flips */
    let flag = "";
    if (w.cross && w.cross <= n) {
      const x = X(w.cross - 1);
      const lab = "MONTH " + w.cross + " &middot; PRINCIPAL TAKES OVER";
      const atEnd = x > g.PL + plotW * 0.55;
      const top0 = g.PT - 9;
      flag = '<line class="dt-cross-halo" x1="' + x.toFixed(1) + '" y1="' + top0 +
        '" x2="' + x.toFixed(1) + '" y2="' + base + '"/>' +
        '<line class="dt-cross" x1="' + x.toFixed(1) + '" y1="' + top0 +
        '" x2="' + x.toFixed(1) + '" y2="' + base + '"/>' +
        '<circle class="dt-cross-dot" cx="' + x.toFixed(1) + '" cy="' + top0 + '" r="3"/>' +
        '<text class="dt-cross-lab" x="' + (atEnd ? x - 9 : x + 9).toFixed(1) +
        '" y="' + (g.PT - 5.5) + '" text-anchor="' + (atEnd ? "end" : "start") + '">' + lab + '</text>';
    }

    let axis = '<line class="rb-base" x1="' + g.PL + '" y1="' + base +
      '" x2="' + (CW - g.PR) + '" y2="' + base + '"/>' +
      '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (g.PT + 4) + '" text-anchor="end">' + usd0(top) + '</text>' +
      '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (base + 4) + '" text-anchor="end">$0</text>';
    const years = Math.ceil(n / 12);
    const ystep = years > 20 ? 5 : (years > 8 ? 2 : 1);
    for (let y = 0; y <= years; y += ystep) {
      if (y * 12 > n) break;
      axis += '<text class="rb-tick" x="' + X(y * 12).toFixed(1) + '" y="' + (CH - 8) +
        '" text-anchor="middle">' + (y === 0 ? "now" : "yr " + y) + '</text>';
    }

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="dt-svg" role="img" ' +
      'data-cs-scale="' + base + ',0,' + Y(top).toFixed(2) + ',' + top + '" data-cs-xword="year" ' +
      'aria-label="Each monthly payment split into interest and principal">' +
      bars + flag + axis + '</svg>';
  }

  /* ============================================================
     render
     ============================================================ */
  function run() {
    const p = read();
    const w = work(p);
    const never = !isFinite(w.months);

    /* ---- banner ---- */
    if (p.bal <= 0) {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "The balance";
      $("bnSub").textContent = "what is on the card today";
    } else if (never) {
      $("bnLabel").textContent = "THIS NEVER CLEARS";
      $("bnBig").textContent = "The payment is too small";
      $("bnSub").textContent = p.buy > 0
        ? usd(p.pmt + p.extra) + " a month against " + usd(w.firstInterest) + " of interest plus " +
          usd(p.buy) + " of new charges"
        : usd(p.pmt + p.extra) + " a month does not cover the " + usd(w.firstInterest) + " of interest";
    } else {
      $("bnLabel").textContent = "ESTIMATED DEBT-FREE DATE";
      $("bnBig").textContent = dateIn(w.months);
      $("bnSub").textContent = span(w.months) + " at " + usd(p.pmt + p.extra) + " a month";
    }
    $("bnBig").parentNode.classList.toggle("is-short", never && p.bal > 0);

    /* ---- the four figures, exactly as the original ---- */
    $("statMonths").textContent = never ? "—" : w.months;
    $("statInterest").textContent = never ? "—" : usd(w.interest);
    $("statPaid").textContent = never ? "—" : usd(w.paid);
    $("statFirst").textContent = p.pmt + p.extra > 0
      ? (w.firstPct * 100).toFixed(1) + "%" : "—";

    $("balNote").textContent = p.once > 0
      ? usd(p.once) + " paid today leaves " + usd(Math.max(0, p.bal - p.once)) + "." : "";
    $("aprNote").textContent = p.bal > 0
      ? usd(w.firstInterest) + " of interest in the first month." : "";
    $("aprFact").textContent = p.bal > 0 ? usd(w.firstInterest) : "—";
    $("payFact").textContent = usd(p.pmt + p.extra) +
      (p.once > 0 ? "  + " + usd(p.once) + " once" : "");
    $("buyNote").textContent = p.buy > 0
      ? "Charging " + usd(p.buy) + " a month while paying it down." : "Use $0 to model no additional charges.";

    /* ---- the picture ---- */
    $("chartWrap").innerHTML = never ? "" : chart(p, w);
    $("chartLead").textContent = never
      ? "There is nothing to draw until the payment covers the interest."
      : (w.cross
        ? "Every bar is one payment, split into interest and principal. The first payment is " +
          (w.firstPct * 100).toFixed(1) + "% interest; month " + w.cross +
          " is the first where more of it goes to the balance than to the card."
        : "Every bar is one payment, split into interest and principal.");

    /* ---- what if you paid more ---- */
    const sl = $("moreSlide");
    const slide = parseFloat(sl.value) || 0;
    $("moreNum").value = slide;
    /* the track is painted from a custom property; keep it on the thumb */
    const lo = parseFloat(sl.min) || 0, hi = parseFloat(sl.max) || 1;
    sl.style.setProperty("--fill", ((slide - lo) / Math.max(1e-9, hi - lo) * 100).toFixed(2) + "%");
    if (slide > 0 && !never) {
      const alt = work(p, p.extra + slide);
      if (isFinite(alt.months)) {
        $("moreOut").innerHTML =
          "Paying <b>" + usd(p.pmt + p.extra + slide) + "</b> a month clears it in <b>" +
          span(alt.months) + "</b> — <b>" + (w.months - alt.months) + " months sooner</b>, and saves <b>" +
          usd(w.interest - alt.interest) + "</b> of interest.";
      }
    } else {
      $("moreOut").textContent = "Move the slider to see how an extra payment changes your payoff.";
    }

    /* ---- the schedule, exactly as the original ---- */
    const tb = $("schedBody");
    tb.innerHTML = "";
    const shown = w.rows.slice(0, 600);
    shown.forEach(function (row) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + row.m + "</td><td>" + usd(row.pay) + "</td><td>" + usd(row.i) +
        "</td><td>" + usd(row.p) + "</td><td>" + usd(row.bal) + "</td>";
      tb.appendChild(tr);
    });
    $("schedNote").textContent = never
      ? "No schedule — the balance never falls on these figures."
      : w.rows.length + (w.rows.length === 1 ? " payment" : " payments") + " in total.";

    /* ---- consolidation comparison ---- */
    const L = loan(p);
    if (L && p.bal > 0 && !never) {
      $("cPay").textContent = usd(L.pay);
      $("cTotal").textContent = usd(L.total);
      $("cCost").textContent = usd(L.cost);
      $("cFin").textContent = usd(L.financed) + (L.fee > 0 ? " (" + usd(L.fee) + " fee rolled in)" : "");
      $("cCardTotal").textContent = usd(w.paid);
      $("cCardCost").textContent = usd(w.interest);
      const diff = L.cost - w.interest;
      $("cVerdict").textContent = Math.abs(diff) < 1
        ? "The two come out level on these figures."
        : (diff < 0
          ? "On these figures the loan costs " + usd(-diff) + " less than staying on the card."
          : "On these figures the loan costs " + usd(diff) + " more than staying on the card, " +
            "even though the rate is lower — the longer term and the fee more than undo it.");
      $("cBox").classList.toggle("is-bad", diff > 0);
    } else {
      $("cVerdict").textContent = "Put a balance and a payment in to compare.";
      ["cPay", "cTotal", "cCost", "cFin", "cCardTotal", "cCardCost"].forEach(function (id) {
        $(id).textContent = "—";
      });
    }

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = {}; FIELDS.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    FIELDS.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
  }

  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", run);
    $(f).addEventListener("change", run);
  });

  $("moreSlide").addEventListener("input", run);
  $("moreNum").addEventListener("input", function () {
    const v = Math.max(0, Math.min(1000, parseFloat($("moreNum").value) || 0));
    $("moreSlide").value = v;
    run();
  });

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
    FIELDS.forEach(function (f) { $(f).value = DEFAULTS[f]; });
    $("moreSlide").value = 0;
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  }
  if ($("resetBtn")) $("resetBtn").addEventListener("click", resetAll);
  if ($("resetBtn2")) $("resetBtn2").addEventListener("click", resetAll);

  let rt = null, lastW = geom().CW;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      const n = geom().CW;
      if (n !== lastW) { lastW = n; run(); }
    }, 140);
  });

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), w = work(p), L = loan(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["Debt Payoff & Interest — WEALTHDEMO", "",
      "THE CARD",
      "  Current balance        " + usd(p.bal),
      "  APR                    " + p.apr.toFixed(2) + "%",
      "  Monthly payment        " + usd(p.pmt) + (p.extra > 0 ? "  + " + usd(p.extra) + " extra" : ""),
      p.once > 0 ? "  One-time extra         " + usd(p.once) : "",
      p.buy > 0 ? "  New purchases          " + usd(p.buy) + " a month" : "", "",
      "THE RESULT",
      isFinite(w.months)
        ? "  Debt-free              " + dateIn(w.months) + "   (" + w.months + " months)"
        : "  The payment does not cover the interest — this never clears.",
      isFinite(w.months) ? "  Total interest         " + usd(w.interest) : "",
      isFinite(w.months) ? "  Total paid             " + usd(w.paid) : "",
      "  First payment interest " + (w.firstPct * 100).toFixed(1) + "%", ""].filter(Boolean);
    if (L && isFinite(w.months)) {
      lines.push("CONSOLIDATION COMPARISON",
        "  Loan " + p.cRate.toFixed(2) + "% over " + Math.round(p.cTerm) + " months, " + p.cFee + "% fee",
        "  Payment                " + usd(L.pay),
        "  Total paid             " + usd(L.total) + "   (card: " + usd(w.paid) + ")",
        "  Cost of borrowing      " + usd(L.cost) + "   (card: " + usd(w.interest) + ")",
        "  " + $("cVerdict").textContent, "");
    }
    lines.push("Educational planning tool only. Results are estimates based on the values entered. " +
      "Actual card issuers may use daily periodic rates, different compounding methods, fees, " +
      "minimum-payment rules, transaction timing, or promotional rates that change actual results. " +
      "A consolidation loan may lower interest but can also include fees or other costs. " +
      "Review the actual account and loan terms before deciding.");

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
