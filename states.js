/* ============================================================
   WEALTHDEMO — State Tax Comparison

   Built from published rate tables, not from memory:
     income tax rates and brackets ... Tax Foundation, 2026
     state + average local sales tax .. Tax Foundation, Jan 2026
     effective property tax rate ...... WalletHub, 2026
     Social Security treatment ........ Kiplinger / AARP, 2026

   The bracket walk was checked against a hand calculation:
   California, $120,000 of taxable income for a single filer,
   gives $7,599 both ways.

   Brackets are single-filer figures and are applied as entered.
   Filing status changes the Social Security thresholds only.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("sIncome")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "\u2212$" : "$") + Math.round(a).toLocaleString("en-US");
  };

  const STATES = {"AK":{"inc":0,"n":"Alaska","prop":1.14,"sales":1.82},"AL":{"inc":[[2,0],[4,500],[5,3000]],"n":"Alabama","prop":0.38,"sales":9.46},"AR":{"inc":[[2,0],[3.9,4600]],"n":"Arkansas","prop":0.57,"sales":9.46},"AZ":{"inc":2.5,"n":"Arizona","prop":0.52,"sales":8.52},"CA":{"inc":[[1,0],[2,11079],[4,26264],[6,41452],[8,57542],[9.3,72724],[10.3,371479],[11.3,445771],[12.3,742953],[13.3,1000000]],"n":"California","prop":0.71,"sales":8.99},"CO":{"inc":4.4,"n":"Colorado","prop":0.49,"sales":7.89,"ssnote":"Fully deductible at 65 or older."},"CT":{"inc":[[2,0],[4.5,10000],[5.5,50000],[6,100000],[6.5,200000],[6.9,250000],[6.99,500000]],"n":"Connecticut","prop":1.92,"sales":6.35,"ss":{"joint":100000,"share":0.25,"single":75000},"ssnote":"Up to 25% of the benefit is taxed above the threshold."},"DC":{"inc":[[4,0],[6,10000],[6.5,40000],[8.5,60000],[9.25,250000],[9.75,500000],[10.75,1000000]],"n":"District of Columbia","prop":0.58,"sales":6.0},"DE":{"inc":[[0,0],[2.2,2000],[3.9,5000],[4.8,10000],[5.2,20000],[5.55,25000],[6.6,60000]],"n":"Delaware","prop":0.53,"sales":0.0},"FL":{"inc":0,"n":"Florida","prop":0.79,"sales":6.98},"GA":{"inc":5.19,"n":"Georgia","prop":0.81,"sales":7.49},"HI":{"inc":[[1.4,0],[3.2,9600],[5.5,14400],[6.4,19200],[6.8,24000],[7.2,36000],[7.6,48000],[7.9,125000],[8.25,175000],[9,225000],[10,275000],[11,325000]],"n":"Hawaii","prop":0.27,"sales":4.5},"IA":{"inc":3.8,"n":"Iowa","prop":1.43,"ret":true,"retnote":"No tax on retirement income at 55 or older.","sales":6.94},"ID":{"inc":5.3,"n":"Idaho","prop":0.53,"sales":6.03},"IL":{"inc":4.95,"n":"Illinois","prop":2.07,"ret":true,"retnote":"No tax on 401(k), IRA or pension income.","sales":8.96},"IN":{"inc":2.95,"n":"Indiana","prop":0.74,"sales":7.0},"KS":{"inc":[[5.2,0],[5.58,23000]],"n":"Kansas","prop":1.3,"sales":8.69},"KY":{"inc":3.5,"n":"Kentucky","prop":0.77,"sales":6.0},"LA":{"inc":3.0,"n":"Louisiana","prop":0.55,"sales":10.11},"MA":{"inc":[[5,0],[9,1083150]],"n":"Massachusetts","prop":1.11,"sales":6.25},"MD":{"inc":[[2,0],[3,1000],[4,2000],[4.75,3000],[5,100000],[5.25,125000],[5.5,150000],[5.75,250000],[6.25,500000],[6.5,1000000]],"n":"Maryland","prop":1.0,"sales":6.0},"ME":{"inc":[[5.8,0],[6.75,27399],[7.15,64849]],"n":"Maine","prop":1.1,"sales":5.5},"MI":{"inc":4.25,"n":"Michigan","prop":1.28,"ret":true,"retnote":"Pensions and 401(k)/IRA withdrawals fully exempt from 2026.","sales":6.0},"MN":{"inc":[[5.35,0],[6.8,33310],[7.85,109430],[9.85,203150]],"n":"Minnesota","prop":1.04,"sales":8.14,"ss":{"joint":108320,"share":0.85,"single":84490},"ssnote":"Fully exempt below the threshold."},"MO":{"inc":[[0,0],[2,1348],[2.5,2696],[3,4044],[3.5,5392],[4,6740],[4.5,8088],[4.7,9436]],"n":"Missouri","prop":0.88,"sales":8.44},"MS":{"inc":4.0,"n":"Mississippi","prop":0.74,"ret":true,"retnote":"No tax on qualified retirement income.","sales":7.06},"MT":{"inc":[[4.7,0],[5.65,47500]],"mtsub":5500,"n":"Montana","prop":0.75,"sales":0.0,"ss":{"joint":0,"share":0.85,"single":0},"ssnote":"Only a $5,500 subtraction at 65 or older."},"NC":{"inc":3.99,"n":"North Carolina","prop":0.7,"sales":7.0},"ND":{"inc":[[0,0],[1.95,48475],[2.5,244825]],"n":"North Dakota","prop":0.99,"sales":7.09},"NE":{"inc":[[2.46,0],[3.51,4130],[4.55,24760]],"n":"Nebraska","prop":1.5,"sales":6.98},"NH":{"inc":0,"n":"New Hampshire","prop":1.77,"sales":0.0},"NJ":{"inc":[[1.4,0],[1.75,20000],[3.5,35000],[5.53,40000],[6.37,75000],[8.97,500000],[10.75,1000000]],"n":"New Jersey","prop":2.23,"sales":6.6},"NM":{"inc":[[1.5,0],[3.2,5500],[4.3,16500],[4.7,33500],[4.9,66500],[5.9,210000]],"n":"New Mexico","prop":0.72,"sales":7.67,"ss":{"joint":150000,"share":0.85,"single":100000},"ssnote":"Fully exempt below the threshold."},"NV":{"inc":0,"n":"Nevada","prop":0.49,"sales":8.24},"NY":{"inc":[[3.9,0],[4.4,8500],[5.15,11700],[5.4,13900],[5.9,80650],[6.85,215400],[9.65,1077550],[10.3,5000000],[10.9,25000000]],"n":"New York","prop":1.6,"sales":8.54},"OH":{"inc":2.75,"n":"Ohio","prop":1.36,"sales":7.29},"OK":{"inc":[[0,0],[2.5,3750],[3.5,4900],[4.5,7200]],"n":"Oklahoma","prop":0.82,"sales":9.06},"OR":{"inc":[[4.75,0],[6.75,4550],[8.75,11400],[9.9,125000]],"n":"Oregon","prop":0.83,"sales":0.0},"PA":{"inc":3.07,"n":"Pennsylvania","prop":1.35,"ret":true,"retnote":"No tax on retirement income after 59\u00bd.","sales":6.34},"RI":{"inc":[[3.75,0],[4.75,82050],[5.99,186450]],"n":"Rhode Island","prop":1.32,"sales":7.0,"ss":{"joint":133750,"share":0.85,"single":107000},"ssnote":"Exempt at full retirement age below the threshold."},"SC":{"inc":[[0,0],[3,3640],[6,18230]],"n":"South Carolina","prop":0.51,"sales":7.49},"SD":{"inc":0,"n":"South Dakota","prop":1.09,"sales":6.11},"TN":{"inc":0,"n":"Tennessee","prop":0.55,"sales":9.61},"TX":{"inc":0,"n":"Texas","prop":1.58,"sales":8.2},"UT":{"inc":4.5,"n":"Utah","prop":0.53,"sales":7.42,"ss":{"joint":90000,"share":0.85,"single":54000},"ssnote":"A credit covers the benefit in full below the threshold."},"VA":{"inc":[[2,0],[3,3000],[5,5000],[5.75,17000]],"n":"Virginia","prop":0.74,"sales":5.77},"VT":{"inc":[[3.35,0],[6.6,49400],[7.6,119700],[8.75,249700]],"n":"Vermont","prop":1.71,"sales":6.39,"ss":{"joint":80000,"share":0.85,"single":65000},"ssnote":"Fully exempt below the threshold."},"WA":{"inc":0,"n":"Washington","note":"Taxes long-term capital gains above a threshold, but not wages or retirement income.","prop":0.84,"sales":9.51},"WI":{"inc":[[3.5,0],[4.4,15110],[5.3,51950],[7.65,332720]],"n":"Wisconsin","prop":1.51,"sales":5.72},"WV":{"inc":[[2.22,0],[2.96,10000],[3.33,25000],[4.44,40000],[4.82,60000]],"n":"West Virginia","prop":0.54,"sales":6.59},"WY":{"inc":0,"n":"Wyoming","prop":0.58,"sales":5.56}};

  const ABS = Object.keys(STATES).sort(function (a, b) {
    return STATES[a].n.localeCompare(STATES[b].n);
  });

  const FIELDS = ["sIncome", "sSS", "sHome", "sSpend", "sYears"];
  const STORE = "wealthdemo.tool.states";
  const DEFAULTS = { sFrom: "CA", sTo: "TX", sIncome: 80000, sSS: 36000,
                     sHome: 450000, sSpend: 45000, sYears: 20,
                     kind: "retirement", filing: "joint" };
  let kind = DEFAULTS.kind, filing = DEFAULTS.filing;

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    return {
      from: $("sFrom").value, to: $("sTo").value,
      income: Math.max(0, num("sIncome", 0)),
      ss: Math.max(0, num("sSS", 0)),
      home: Math.max(0, num("sHome", 0)),
      spend: Math.max(0, num("sSpend", 0)),
      years: Math.max(1, Math.min(40, num("sYears", 20))),
      joint: filing === "joint",
      retired: kind === "retirement"
    };
  }

  /* ---------- walk the brackets ---------- */
  function bracketTax(inc, taxable) {
    if (!inc || taxable <= 0) return 0;
    if (typeof inc === "number") return taxable * inc / 100;
    let t = 0;
    for (let i = 0; i < inc.length; i++) {
      const rate = inc[i][0], start = inc[i][1];
      const next = i + 1 < inc.length ? inc[i + 1][1] : Infinity;
      if (taxable > start) t += (Math.min(taxable, next) - start) * rate / 100;
    }
    return t;
  }

  /* ---------- one state's annual bill ---------- */
  function bill(ab, p) {
    const s = STATES[ab];
    const exempt = p.retired && !!s.ret;
    const ordinary = exempt ? 0 : p.income;

    let ssTaxed = 0;
    if (s.ss) {
      const thr = p.joint ? s.ss.joint : s.ss.single;
      if (thr === 0 || p.income + p.ss > thr) {
        ssTaxed = p.ss * s.ss.share;
        if (s.mtsub) ssTaxed = Math.max(0, ssTaxed - s.mtsub);
      }
    }

    const income = bracketTax(s.inc, ordinary + ssTaxed);
    const prop = p.home * s.prop / 100;
    const sales = p.spend * s.sales / 100;
    return { ab: ab, s: s, exempt: exempt, ssTaxed: ssTaxed,
             income: income, prop: prop, sales: sales,
             total: income + prop + sales };
  }

  function rank(p) {
    return ABS.map(function (ab) { return bill(ab, p); })
      .sort(function (a, b) { return a.total - b.total; });
  }

  function rateLabel(s) {
    if (!s.inc) return "no income tax";
    if (typeof s.inc === "number") return s.inc + "% flat";
    return s.inc[0][0] + "\u2013" + s.inc[s.inc.length - 1][0] + "%";
  }

  /* ============================================================
     render
     ============================================================ */
  function card(side, b, other) {
    $("nm_" + side).textContent = b.s.n;
    $("tot_" + side).textContent = usd(b.total);
    $("inc_" + side).textContent = usd(b.income);
    $("prp_" + side).textContent = usd(b.prop);
    $("sal_" + side).textContent = usd(b.sales);
    $("rate_" + side).textContent = rateLabel(b.s);
    const inflow = CUR.income + CUR.ss;
    $("eff_" + side).textContent = inflow > 0
      ? pctOne(b.total / inflow * 100) + " of what comes in" : "\u2014";
    $("mon_" + side).textContent = usd(b.total / 12) + " a month";
    $("prate_" + side).textContent = b.s.prop.toFixed(2) + "% of home value";
    $("srate_" + side).textContent = b.s.sales.toFixed(2) + "% on spending";

    const notes = [];
    if (!b.s.inc) notes.push("No state income tax at all — on wages, withdrawals or Social Security.");
    if (b.exempt && b.s.retnote) notes.push(b.s.retnote);
    else if (b.s.ret && !b.exempt) notes.push("Exempts retirement income \u2014 switch the toggle above to use it.");
    if (b.s.ssnote) notes.push("Social Security: " + b.s.ssnote.charAt(0).toLowerCase() + b.s.ssnote.slice(1));
    else if (b.s.inc) notes.push("Social Security is not taxed here.");
    if (b.s.note) notes.push(b.s.note);
    $("note_" + side).innerHTML = notes.map(function (n) { return "<li>" + n + "</li>"; }).join("");

    $("card_" + side).classList.toggle("is-cheaper", b.total < other.total);
  }

  const pctOne = function (n) { return (Math.round(n * 10) / 10) + "%"; };

  /* Writing innerHTML on every keystroke swaps the nodes out. If that happens
     between a mousedown and a mouseup the browser never fires the click, so a
     row tapped straight after typing did nothing. Only write when it changed. */
  const LAST = {};
  function redraw(el, html) {
    if (LAST[el.id] === html) return false;
    LAST[el.id] = html;
    el.innerHTML = html;
    return true;
  }

  let CUR = { income: 0, ss: 0 };

  function run() {
    const p = read();
    CUR = p;
    const A = bill(p.from, p), B = bill(p.to, p);
    const diff = A.total - B.total;

    /* ---- banner ---- */
    if (p.from === p.to) {
      $("bnLabel").textContent = "PICK TWO STATES";
      $("bnBig").textContent = STATES[p.from].n;
      $("bnSub").textContent = "choose a different state to compare against";
    } else if (Math.abs(diff) < 1) {
      $("bnLabel").textContent = "NO DIFFERENCE";
      $("bnBig").textContent = "Level";
      $("bnSub").textContent = "on these figures the two states cost the same";
    } else {
      const win = diff > 0 ? B : A, lose = diff > 0 ? A : B;
      $("bnLabel").textContent = "MOVING TO " + win.s.n.toUpperCase() + " SAVES";
      $("bnBig").textContent = usd(Math.abs(diff));
      $("bnSub").textContent = "a year against " + lose.s.n + " \u2014 " +
        usd(Math.abs(diff) * p.years) + " over " + Math.round(p.years) + " years";
    }

    $("factIn").textContent = usd(p.income + p.ss);
    $("factOwn").textContent = usd(A.prop + A.sales);
    $("hintOwn").textContent = A.prop + A.sales > 0
      ? "In " + A.s.n + " these two alone come to " +
        (p.income + p.ss > 0
          ? pctOne((A.prop + A.sales) / (p.income + p.ss) * 100) + " of what comes in."
          : "that much.") +
        " They follow the house and the spending, not the income."
      : "Add a home value or some spending to include these.";

    card("a", A, B);
    card("b", B, A);

    const yrs = Math.round(p.years);
    if (p.from === p.to || Math.abs(diff) < 1) {
      $("overOut").innerHTML = "Over <b>" + yrs + " years</b> the two come to the same thing.";
      $("overOut").classList.remove("is-set");
    } else {
      const win = diff > 0 ? B : A, lose = diff > 0 ? A : B;
      $("overOut").classList.add("is-set");
      $("overOut").innerHTML = "Over <b>" + yrs + " years</b>, staying in " + lose.s.n +
        " costs <b>" + usd(Math.abs(diff) * p.years) + "</b> more than " + win.s.n +
        " \u2014 and that is before a dollar of it is invested.";
    }

    /* ---- the bars ---- */
    const top = Math.max(A.total, B.total, 1);
    [["a", A], ["b", B]].forEach(function (x) {
      const el = $("bar_" + x[0]);
      el.innerHTML = "";
      el.style.width = (x[1].total / top * 100).toFixed(2) + "%";
      [["inc", x[1].income], ["prp", x[1].prop], ["sal", x[1].sales]].forEach(function (seg) {
        if (seg[1] <= 0) return;
        const u = document.createElement("u");
        u.setAttribute("data-k", seg[0]);
        u.style.width = (seg[1] / x[1].total * 100).toFixed(3) + "%";
        u.title = usd(seg[1]);
        el.appendChild(u);
      });
      $("barlab_" + x[0]).textContent = x[1].s.n;
      $("barval_" + x[0]).textContent = usd(x[1].total);
    });

    $("chartLead").innerHTML = p.from === p.to
      ? "Pick two different states to see the split."
      : "Each bar is one year of state tax, split three ways. " +
        (Math.abs(A.income - B.income) > Math.abs(A.prop - B.prop)
          ? "Income tax is the biggest single difference here."
          : "Property tax is the biggest single difference here \u2014 " +
            "which is why a state with no income tax is not automatically cheaper.");

    /* ---- where the money goes furthest ---- */
    const r = rank(p);
    const best = r[0], worst = r[r.length - 1];
    const mineA = r.findIndex(function (x) { return x.ab === p.from; }) + 1;
    $("rankLead").innerHTML = "Across all 51, <b>" + best.s.n + "</b> costs the least on these figures at <b>" +
      usd(best.total) + "</b> a year and <b>" + worst.s.n + "</b> the most at <b>" + usd(worst.total) +
      "</b>. " + STATES[p.from].n + " sits <b>" + mineA + nth(mineA) + "</b> cheapest.";
    const rtop = Math.max(1, worst.total);
    const here = bill(p.from, p).total;
    const rankHtml = r.map(function (x, i) {
      const me = x.ab === p.from || x.ab === p.to;
      const tone = x.ab === p.from ? "here" : (x.total < here - 0.5 ? "less" : "more");
      return '<div class="sx-rank' + (me ? " is-me" : "") + '" data-ab="' + x.ab +
        '" data-tone="' + tone + '" data-name="' + x.s.n.toLowerCase() + '">' +
        '<span class="sx-no">' + (i + 1) + '</span>' +
        '<span class="sx-nm">' + x.s.n + '</span>' +
        '<i><u style="width:' + (x.total / rtop * 100).toFixed(2) + '%"></u></i>' +
        '<b>' + usd(x.total) + '</b></div>';
    }).join("");
    if (redraw($("rankRows"), rankHtml)) {
      $("rankRows").querySelectorAll(".sx-rank").forEach(function (row) {
        row.addEventListener("click", function () {
          $("sTo").value = row.getAttribute("data-ab");
          run();
          document.querySelector(".sx-cards").scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
    }
    sift();
    quick(p);

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* the 51-row list needs a way in */
  function sift() {
    const q = ($("rankFind").value || "").trim().toLowerCase();
    let shown = 0;
    $("rankRows").querySelectorAll(".sx-rank").forEach(function (row) {
      const hit = !q || row.getAttribute("data-name").indexOf(q) !== -1;
      row.hidden = !hit;
      if (hit) shown++;
    });
    $("rankNone").hidden = shown !== 0;
  }

  /* the states people actually ask about, with the saving already on the chip */
  const QUICK = ["FL", "TX", "TN", "NV", "AZ", "SC", "NC", "WY"];
  function quick(p) {
    const here = bill(p.from, p).total;
    const chipHtml = QUICK.filter(function (ab) { return ab !== p.from; })
      .map(function (ab) {
        const d = here - bill(ab, p).total;
        return '<button type="button" class="sx-q" data-ab="' + ab + '"' +
          (ab === p.to ? ' data-on="1"' : '') + ' data-tone="' + (d > 0 ? "less" : "more") + '">' +
          STATES[ab].n + '<em>' + (Math.abs(d) < 1 ? "level"
            : (d > 0 ? "saves " : "costs ") + usd(Math.abs(d)) + (d > 0 ? "" : " more")) +
          '</em></button>';
      }).join("");
    if (redraw($("quickRow"), chipHtml)) {
      $("quickRow").querySelectorAll(".sx-q").forEach(function (b) {
        b.addEventListener("click", function () { $("sTo").value = b.getAttribute("data-ab"); run(); });
      });
    }
  }

  function nth(n) {
    if (n % 100 >= 11 && n % 100 <= 13) return "th";
    return ["th", "st", "nd", "rd"][n % 10] || "th";
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = { sFrom: $("sFrom").value, sTo: $("sTo").value, kind: kind, filing: filing };
    FIELDS.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    if (STATES[s.sFrom]) $("sFrom").value = s.sFrom;
    if (STATES[s.sTo]) $("sTo").value = s.sTo;
    if (s.kind) kind = s.kind;
    if (s.filing) filing = s.filing;
    FIELDS.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
    paint();
  }
  function paint() {
    document.querySelectorAll(".sx-seg button").forEach(function (b) {
      const g = b.getAttribute("data-group"), v = b.getAttribute("data-val");
      const on = (g === "kind" ? kind : filing) === v;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("incomeLab").textContent = kind === "retirement"
      ? "Yearly Withdrawals and Pension ($)" : "Yearly Taxable Income ($)";
  }

  const opts = ABS.map(function (ab) {
    return '<option value="' + ab + '">' + STATES[ab].n + '</option>';
  }).join("");
  $("sFrom").innerHTML = opts; $("sTo").innerHTML = opts;
  $("sFrom").value = DEFAULTS.sFrom; $("sTo").value = DEFAULTS.sTo;
  paint();

  ["sFrom", "sTo"].forEach(function (id) { $(id).addEventListener("change", run); });
  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", run);
    $(f).addEventListener("change", run);
  });
  document.querySelectorAll(".sx-seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      const g = b.getAttribute("data-group"), v = b.getAttribute("data-val");
      if (g === "kind") kind = v; else filing = v;
      paint(); run();
    });
  });
  $("rankFind").addEventListener("input", sift);
  if ($("swapBtn")) $("swapBtn").addEventListener("click", function () {
    const a = $("sFrom").value; $("sFrom").value = $("sTo").value; $("sTo").value = a; run();
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
    $("sFrom").value = DEFAULTS.sFrom; $("sTo").value = DEFAULTS.sTo;
    FIELDS.forEach(function (f) { $(f).value = DEFAULTS[f]; });
    kind = DEFAULTS.kind; filing = DEFAULTS.filing;
    paint();
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  }
  if ($("resetBtn")) $("resetBtn").addEventListener("click", resetAll);
  if ($("resetBtn2")) $("resetBtn2").addEventListener("click", resetAll);

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), A = bill(p.from, p), B = bill(p.to, p), r = rank(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const diff = A.total - B.total;
    const lines = ["State Tax Comparison \u2014 WEALTHDEMO", "",
      "THE HOUSEHOLD",
      "  " + (p.retired ? "Withdrawals and pension" : "Taxable income") + "   " + usd(p.income),
      "  Social Security          " + usd(p.ss),
      "  Home value               " + usd(p.home),
      "  Yearly spending          " + usd(p.spend),
      "  Filing                   " + (p.joint ? "Married filing jointly" : "Single"), ""];
    [A, B].forEach(function (x) {
      lines.push(x.s.n.toUpperCase(),
        "  Income tax               " + usd(x.income) + "   (" + rateLabel(x.s) + ")",
        "  Property tax             " + usd(x.prop) + "   (" + x.s.prop.toFixed(2) + "%)",
        "  Sales tax                " + usd(x.sales) + "   (" + x.s.sales.toFixed(2) + "%)",
        "  TOTAL A YEAR             " + usd(x.total), "");
    });
    if (Math.abs(diff) >= 1) {
      const win = diff > 0 ? B : A;
      lines.push("THE DIFFERENCE",
        "  " + win.s.n + " costs " + usd(Math.abs(diff)) + " a year less",
        "  Over " + Math.round(p.years) + " years        " + usd(Math.abs(diff) * p.years), "");
    }
    lines.push("CHEAPEST FIVE ON THESE FIGURES");
    r.slice(0, 5).forEach(function (x, i) {
      lines.push("  " + (i + 1) + ". " + x.s.n + "   " + usd(x.total));
    });
    lines.push("",
      "Educational estimate only. Income tax uses published single-filer brackets applied to the " +
      "amount entered; filing status here changes the Social Security thresholds only. Property " +
      "and sales tax use statewide averages, and both vary widely by county and city. This does " +
      "not model deductions, exemptions, credits, local income taxes, or the federal return. " +
      "Rates change. Confirm with a qualified tax professional before deciding to move.",
      "",
      "Rates: Tax Foundation (income, 2026; sales, January 2026), WalletHub (property, 2026), " +
      "Kiplinger and AARP (Social Security, 2026).");

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
