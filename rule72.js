/* ============================================================
   WEALTHDEMO — Rule of 72

   The rule itself is one division. A calculator that only does
   the division is a party trick, so this one answers the three
   questions the division raises and never answers:

     · 72 / rate is an APPROXIMATION. How wrong is it here?
     · Your money doubles in 9 years. Your BUYING POWER doesn't
       — inflation runs its own clock, and it is much slower.
     · Two clocks are running. If one of them belongs to a
       lender, when does their balance pass yours?

   Then it stops describing and decides: the spare money each
   month is run through every option, month by month, and the
   options are ranked by net worth at the end.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("r7Inv")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };
  const usd0 = function (n) {
    const a = Math.abs(n);
    if (a >= 1000000) return "$" + (n / 1000000).toFixed(a >= 10000000 ? 0 : 1) + "M";
    if (a >= 1000) return "$" + Math.round(n / 1000) + "k";
    return "$" + Math.round(n);
  };
  const yrs = function (n) { return n.toFixed(n < 10 ? 1 : 1); };

  const FIELDS = ["r7Inv", "r7IR", "r7Debt", "r7DR", "r7Years", "r7Infl", "r7Spare"];
  const STORE = "wealthdemo.tool.rule72";
  const DEFAULTS = { r7Inv: 50000, r7IR: 8, r7Debt: 12000, r7DR: 19.9, r7Years: 25, r7Infl: 3, r7Spare: 500 };

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    return {
      inv: Math.max(0, num("r7Inv", 50000)),
      ir: Math.max(0, Math.min(40, num("r7IR", 8))) / 100,
      debt: Math.max(0, num("r7Debt", 12000)),
      dr: Math.max(0, Math.min(60, num("r7DR", 19.9))) / 100,
      N: Math.max(1, Math.min(60, Math.round(num("r7Years", 25)))),
      infl: Math.max(0, Math.min(12, num("r7Infl", 3))) / 100,
      spare: Math.max(0, num("r7Spare", 500))
    };
  }

  /* ---------- the rule, and the truth ---------- */
  const LN2 = Math.LN2;
  function rule72(r) { return r > 0 ? 72 / (r * 100) : Infinity; }
  function exact(r) { return r > 0 ? LN2 / Math.log(1 + r) : Infinity; }
  function realRate(r, infl) { return (1 + r) / (1 + infl) - 1; }

  /* A rate can do one of three things over time, and a calculator that
     only knows about doubling goes to pieces on the other two. A zero
     rate never doubles; a negative real return halves. */
  function clockOf(r) {
    if (r > 0) return { rate: r, t: exact(r), r72: rule72(r), dir: "double" };
    if (r === 0) return { rate: r, t: Infinity, r72: Infinity, dir: "flat" };
    return { rate: r, t: Math.log(0.5) / Math.log(1 + r), r72: 72 / (-r * 100), dir: "halve" };
  }
  /* "every 9.0 years" / "never, at a flat 0%" / "halves every 14 years" */
  function every(c) {
    if (c.dir === "double") return "every " + yrs(c.t) + " years";
    if (c.dir === "flat") return "never — nothing is growing";
    return "never — it halves every " + yrs(c.t) + " years instead";
  }

  /* the year the debt balance passes the savings balance, both left alone */
  function crossover(p) {
    if (p.debt <= 0 || p.inv <= 0) return null;
    if (p.dr <= p.ir) return p.debt >= p.inv ? 0 : null;
    if (p.debt >= p.inv) return 0;
    return Math.log(p.inv / p.debt) / Math.log((1 + p.dr) / (1 + p.ir));
  }

  /* ---------- month-by-month, so the ranking is earned ---------- */
  function simulate(p, mode) {
    const im = p.ir / 12, dm = p.dr / 12, months = p.N * 12;
    let inv = p.inv, debt = p.debt, cleared = null;
    const invPath = [p.inv], debtPath = [p.debt];

    for (let m = 0; m < months; m++) {
      inv *= 1 + im;
      debt *= 1 + dm;
      let cash = p.spare, pay = 0;

      if (debt > 0) {
        if (mode === "debt") pay = Math.min(cash, debt);
        else if (mode === "split") pay = Math.min(cash * 0.5, debt);
        else if (mode === "flat") pay = Math.min(cash, Math.max(0, debt - p.debt));
        /* mode "invest" pays nothing */
        debt -= pay;
        cash -= pay;
        if (debt <= 0.01) { debt = 0; if (cleared === null) cleared = m + 1; }
      }
      inv += cash;
      if ((m + 1) % 12 === 0) { invPath.push(inv); debtPath.push(debt); }
    }
    return { inv: inv, debt: debt, net: inv - debt, cleared: cleared, invPath: invPath, debtPath: debtPath };
  }

  function moves(p) {
    const list = [];
    const hasDebt = p.debt > 0;

    if (hasDebt && p.spare > 0) {
      list.push({ id: "debt",   name: "Pay off the debt first, then save",   note: "You save nothing until the debt is gone." });
      list.push({ id: "split",  name: "Split it in half",            note: "Half to the debt, half to savings, every month." });
      list.push({ id: "flat",   name: "Save it, and pay only the interest", note: "What you owe never goes up or down." });
      list.push({ id: "invest", name: "Save it all and pay nothing off", note: "What happens if the debt is left alone." });
    } else if (p.spare > 0) {
      list.push({ id: "invest", name: "Put every spare dollar into savings", note: "Nothing else is competing for it." });
    }

    list.forEach(function (m) {
      const r = simulate(p, m.id);
      m.inv = r.inv; m.left = r.debt; m.net = r.net; m.cleared = r.cleared;
    });
    list.sort(function (a, b) { return b.net - a.net; });
    return list;
  }

  /* ---------- diagnosis ---------- */
  function diagnose(p, x, clocks) {
    const gapClock = clocks.debt.dir === "double" && clocks.money.dir === "double"
      ? clocks.money.t / clocks.debt.t : 0;

    if (p.debt > 0 && x !== null && x <= p.N) {
      const at = p.inv * Math.pow(1 + p.ir, x);
      return {
        title: x <= 0.01
          ? "You already owe more than you've saved."
          : "In " + yrs(x) + " years you'll owe more than you've saved.",
        body: x <= 0.01
          ? "The " + usd(p.debt) + " you owe is already bigger than the " + usd(p.inv) + " you've saved" +
            (gapClock ? ", and it's growing " + gapClock.toFixed(1) + " times faster." : ".")
          : "Both reach " + usd(at) + ". After that the debt keeps pulling away, and no rate of return catches it up — only paying it off.",
        s1: yrs(x), s1l: "Years until you owe more", s1t: "bad", s1u: "from today",
        s2: usd(p.debt * p.dr / 12), s2l: "Interest added each month", s2t: "warn", s2u: "before you pay anything off"
      };
    }

    if (p.debt > 0 && p.dr > p.ir) {
      return {
        title: "You owe less, but it's growing faster.",
        body: "Over " + p.N + " years it never passes your savings. But " + usd(p.debt * p.dr / 12) +
              " goes out in interest every month before you save a penny.",
        s1: (p.dr * 100).toFixed(1) + "%", s1l: "What paying it off earns you", s1t: "warn",
        s2: usd(p.debt * p.dr / 12), s2l: "Interest added each month", s2t: "bad", s2u: "before you save a penny"
      };
    }

    /* debt exists, but it is the slower clock — say so plainly */
    if (p.debt > 0) {
      return {
        title: "Your savings earn more than this debt costs.",
        body: "You pay " + (p.dr * 100).toFixed(1) + "% on the debt and earn " + (p.ir * 100).toFixed(1) +
              "% on the savings. Paying it off early buys peace of mind rather than extra money.",
        s1: ((p.ir - p.dr) * 100).toFixed(1) + " pts", s1l: "You earn this much more than it costs", s1t: "good",
        s2: usd(p.debt * p.dr / 12), s2l: "Interest each month", s2t: "warn", s2u: "to keep it"
      };
    }

    /* no debt at all — inflation is the opponent */
    const real = realRate(p.ir, p.infl);
    const nominalEnd = p.inv * Math.pow(1 + p.ir, p.N);
    const realEnd = p.inv * Math.pow(1 + real, p.N);
    const lost = nominalEnd - realEnd;

    if (clocks.real.dir !== "double") {
      return {
        title: clocks.money.dir === "double"
          ? "Your balance goes up. What it buys goes down."
          : "Your money isn't growing. Prices still are.",
        body: "After rising prices you're really earning " + (real * 100).toFixed(2) + "%. The statement will say " +
              usd(nominalEnd) + ", but it will only buy what " + usd(realEnd) + " buys today.",
        s1: (real * 100).toFixed(2) + "%", s1l: "What you really earn", s1t: "bad", s1u: "after rising prices",
        s2: usd(lost), s2l: "Lost to rising prices by year " + p.N, s2t: "bad", s2u: "in today's prices"
      };
    }

    return {
      title: "Prices go up too.",
      body: "In " + p.N + " years you'll have " + usd(nominalEnd) + ", but it will only buy what " + usd(realEnd) +
            " buys today. That's why what your money can buy takes " + yrs(clocks.real.t - clocks.money.t) + " years longer to double.",
      s1: yrs(clocks.real.t), s1l: "Years to double what it buys", s1t: "warn", s1u: "not " + yrs(clocks.money.t),
      s2: usd(lost), s2l: "The gap at year " + p.N, s2t: "bad", s2u: "in today's prices"
    };
  }

  /* ---------- the race chart ---------- */
  /* a 1040x300 viewBox squashes to 112px tall on a phone, so the
     narrow layout gets its own, much taller, frame */
  function geom() {
    return window.innerWidth < 720
      ? { CW: 420, CH: 400, PL: 54, PR: 14, PT: 20, PB: 40 }
      : { CW: 1040, CH: 300, PL: 66, PR: 24, PT: 18, PB: 40 };
  }

  function chart(p, x) {
    const g = geom();
    const CW = g.CW, CH = g.CH, PL = g.PL, PR = g.PR, PT = g.PT, PB = g.PB;
    const plotW = CW - PL - PR, plotH = CH - PT - PB;
    const invAt = function (t) { return p.inv * Math.pow(1 + p.ir, t); };
    const debtAt = function (t) { return p.debt * Math.pow(1 + p.dr, t); };

    let ymax = Math.max(invAt(p.N), debtAt(p.N), 1);
    const X = function (t) { return PL + (t / p.N) * plotW; };
    const Y = function (v) { return PT + plotH - Math.min(v, ymax) / ymax * plotH; };

    const STEPS = 120;
    const inv = [], debt = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = p.N * i / STEPS;
      inv.push([t, invAt(t)]);
      debt.push([t, debtAt(t)]);
    }
    const line = function (h) {
      return h.map(function (q) { return X(q[0]).toFixed(1) + "," + Y(q[1]).toFixed(1); }).join(" ");
    };

    /* the area between them, cut at the crossover so the colour tells the story */
    const band = function (from, to, cls) {
      const top = [], bot = [];
      for (let i = 0; i <= STEPS; i++) {
        const t = from + (to - from) * i / STEPS;
        top.push(X(t).toFixed(1) + "," + Y(invAt(t)).toFixed(1));
        bot.push(X(t).toFixed(1) + "," + Y(debtAt(t)).toFixed(1));
      }
      return '<polygon class="' + cls + '" points="' + top.join(" ") + " " + bot.reverse().join(" ") + '"/>';
    };

    let grid = "", labels = "";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      const y = PT + plotH - f * plotH;
      grid += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (CW - PR) + '" y2="' + y.toFixed(1) + '"/>';
      labels += '<text x="' + (PL - 9) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + usd0(ymax * f) + '</text>';
    });

    let ticks = "";
    const step = p.N > 30 ? 10 : p.N > 12 ? 5 : 2;
    for (let t = 0; t <= p.N; t += step) {
      ticks += '<text x="' + X(t).toFixed(1) + '" y="' + (PT + plotH + 19) + '" text-anchor="middle">' + t + '</text>';
    }

    let cross = "";
    if (x !== null && x > 0.02 && x <= p.N) {
      const cx = X(x), cy = Y(invAt(x));
      const flip = cx > CW - (CW < 600 ? 120 : 170);
      cross =
        '<line class="c-cross" x1="' + cx.toFixed(1) + '" y1="' + PT + '" x2="' + cx.toFixed(1) + '" y2="' + (PT + plotH) + '"/>' +
        '<circle class="c-cross-dot" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5.5"/>' +
        '<text class="c-cross-lab" x="' + (cx + (flip ? -10 : 10)).toFixed(1) + '" y="' + (PT + 16) +
          '" text-anchor="' + (flip ? "end" : "start") + '">Same size at year ' + yrs(x) + '</text>' +
        '<text class="c-cross-sub" x="' + (cx + (flip ? -10 : 10)).toFixed(1) + '" y="' + (PT + 32) +
          '" text-anchor="' + (flip ? "end" : "start") + '">' + usd(invAt(x)) + ' each</text>';
    }

    const hasDebt = p.debt > 0;
    const cut = (x !== null && x > 0 && x <= p.N) ? x : (hasDebt && debtAt(0) >= invAt(0) ? 0 : p.N);

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="wd-chart r7-chart" data-cs-say="gap" role="img" aria-label="Savings balance against debt balance over time">' +
      '<g class="c-grid">' + grid + '</g>' +
      (hasDebt && cut > 0 ? band(0, cut, "c-band-good") : "") +
      (hasDebt && cut < p.N ? band(cut, p.N, "c-band-bad") : "") +
      cross +
      (hasDebt ? '<polyline class="c-debt" points="' + line(debt) + '"/>' : "") +
      '<polyline class="c-inv" points="' + line(inv) + '"/>' +
      '<line class="c-base" x1="' + PL + '" y1="' + (PT + plotH) + '" x2="' + (CW - PR) + '" y2="' + (PT + plotH) + '"/>' +
      '<g class="c-axis">' + labels + ticks + '</g>' +
      '<text x="' + (PL + plotW / 2) + '" y="' + (CH - 5) + '" text-anchor="middle" class="c-axis-title">Years from today</text>' +
      '</svg>';
  }

  /* ---------- the doubling track ---------- */
  function track(c, N) {
    const t = c.t;
    if (c.dir === "flat" || !isFinite(t) || t <= 0) {
      return '<div class="dbl-track is-none"><span>nothing doubles at this rate</span></div>';
    }
    const n = N / t;
    const w = (t / N) * 100;
    const mark = c.dir === "halve" ? "÷2" : "×2";
    let html = '<div class="dbl-track">';
    for (let i = 0; i < Math.floor(n) && i < 12; i++) {
      html += '<i style="width:' + w.toFixed(3) + '%">' + mark + '</i>';
    }
    const rest = n - Math.floor(n);
    if (rest > 0.02 && Math.floor(n) < 12) html += '<i class="part" style="width:' + (rest * w).toFixed(3) + '%"></i>';
    if (n > 12) html += '<i class="over">&hellip;</i>';
    return html + '</div>';
  }

  /* ---------- render ---------- */
  function run() {
    const p = read();
    const real = realRate(p.ir, p.infl);
    const x = crossover(p);

    const clocks = { money: clockOf(p.ir), real: clockOf(real), debt: clockOf(p.dr) };

    /* ---- the one-line answer ---- */
    if (p.debt > 0 && x !== null && x <= p.N) {
      $("ansHeadline").innerHTML = x <= 0.01
        ? "…you already owe more than you've saved."
        : "…in year <span class=\"hot\">" + yrs(x) + "</span> you'll owe more than you've saved.";
      $("ansSub").innerHTML = "Your savings double <b>" + every(clocks.money) +
        "</b>. What you owe doubles <b>" + every(clocks.debt) + "</b>.";
    } else if (p.debt > 0) {
      $("ansHeadline").innerHTML = "…you stay ahead, by <span class=\"cool\">" +
        usd(p.inv * Math.pow(1 + p.ir, p.N) - p.debt * Math.pow(1 + p.dr, p.N)) + "</span>.";
      $("ansSub").innerHTML = "What you owe doubles <b>" + every(clocks.debt) +
        "</b>. Your savings double <b>" + every(clocks.money) + "</b>.";
    } else if (clocks.money.dir !== "double") {
      $("ansHeadline").innerHTML = "…at " + (p.ir * 100).toFixed(1) +
        "% your savings never double.";
      $("ansSub").innerHTML = "It stays at <b>" + usd(p.inv) + "</b>, and " + (p.infl * 100).toFixed(1) +
        "% rising prices cut what it can buy to <b>" + usd(p.inv * Math.pow(1 + real, p.N)) +
        "</b> buys today.";
    } else {
      const dbl = p.N / clocks.money.t;
      $("ansHeadline").innerHTML = "…your savings double <span class=\"cool\">" + dbl.toFixed(1) +
        " times</span>, to " + usd(p.inv * Math.pow(1 + p.ir, p.N)) + ".";
      $("ansSub").innerHTML = clocks.real.dir === "double"
        ? "But what it can <b>buy</b> only doubles " + (p.N / clocks.real.t).toFixed(1) +
          " times — that's " + usd(p.inv * Math.pow(1 + real, p.N)) + " in today's prices."
        : "But what it can <b>buy</b> never doubles — with prices rising " + (p.infl * 100).toFixed(1) +
          "% a year it only buys what " + usd(p.inv * Math.pow(1 + real, p.N)) + " buys today.";
    }

    /* ---- three clocks ---- */
    const pc = function (r) { return (r * 100).toFixed(Math.abs(r * 1000 % 10) > 0.001 ? 1 : 0) + "%"; };
    const cards = [
      { key: "money", tint: "mint", noun: "Your savings", plural: true, term: "rule72",
        sub: "Earning " + pc(p.ir) + " a year",
        end: usd(p.inv * Math.pow(1 + p.ir, p.N)), endL: "You'll have, at year " + p.N },
      { key: "real", tint: "ice", noun: "What it can buy", term: "realreturn",
        sub: "With prices rising " + pc(p.infl) + ", you really earn " + (real * 100).toFixed(2) + "%",
        end: usd(p.inv * Math.pow(1 + real, p.N)), endL: "Buys this much in today's prices" },
      { key: "debt", tint: "blush", noun: "What you owe", term: "compounding", bad: true,
        sub: "Costing " + pc(p.dr) + " a year",
        end: usd(p.debt * Math.pow(1 + p.dr, p.N)), endL: "You'll owe, if you never pay" }
    ];

    const grid = $("clockGrid");
    grid.innerHTML = "";
    cards.forEach(function (c) {
      const k = clocks[c.key];
      if (c.key === "debt" && p.debt <= 0) return;

      const halving = k.dir === "halve";
      const flat = k.dir === "flat";
      const el = document.createElement("article");
      el.className = "clock" + (c.bad || halving ? " is-bad" : "") +
                     (c.key === "real" && !halving ? " is-quiet" : "") + (flat ? " is-flat" : "");
      el.setAttribute("data-tint", halving ? "blush" : c.tint);

      const label = flat ? c.noun + (c.plural ? " never double" : " never doubles")
                  : halving ? c.noun + (c.plural ? " are cut in half every" : " is cut in half every")
                  : c.noun + (c.plural ? " double every" : " doubles every");

      const err = k.r72 - k.t;
      const errTxt = flat ? "There is no rate to divide 72 by"
        : Math.abs(err) < 0.05 ? "The 72 shortcut gets this exactly right"
        : "The 72 shortcut says " + yrs(k.r72) + " &mdash; about " +
          Math.abs(err * 12).toFixed(0) + " month" + (Math.abs(err * 12) >= 1.5 ? "s" : "") + " out";

      el.innerHTML =
        '<header><span class="clock-dot"></span><b data-term="' + c.term + '">' + label + '</b></header>' +
        '<div class="clock-big"><b>' + (flat ? "—" : yrs(k.t)) + '</b><span>' + (flat ? "" : "years") + '</span></div>' +
        '<small class="clock-sub">' + c.sub + '</small>' +
        '<p class="clock-err">' + errTxt + '</p>' +
        track(k, p.N) +
        '<footer><span>' + c.endL + '</span><b>' + c.end + '</b></footer>';
      grid.appendChild(el);
    });

    /* ---- the race ---- */
    $("raceWrap").innerHTML = chart(p, x);
    $("raceSub").textContent = p.debt > 0
      ? "If you pay nothing in and nothing off, for " + p.N + " years."
      : "You owe nothing, so there is only one line.";

    /* ---- diagnosis ---- */
    const dx = diagnose(p, x, clocks);
    $("dxTitle").textContent = dx.title;
    $("dxBody").textContent = dx.body;
    $("dxS1").textContent = dx.s1; $("dxS1L").textContent = dx.s1l; $("dxS1").className = "dx-figure " + dx.s1t;
    $("dxS2").textContent = dx.s2; $("dxS2L").textContent = dx.s2l; $("dxS2").className = "dx-figure " + dx.s2t;
    $("dxS1U").textContent = dx.s1u || ""; $("dxS2U").textContent = dx.s2u || "";

    /* ---- what the spare money should do ---- */
    const ms = moves(p);
    const list = $("moveList");
    list.innerHTML = "";
    $("moveBudget").textContent = p.spare > 0 ? usd(p.spare) + " a month to use" : "Nothing spare yet";

    if (!ms.length) {
      list.innerHTML = '<p class="move-empty">Open Assumptions and enter what you have spare each month, and these options get ranked for you.</p>';
      $("moveFoot").textContent = "";
    } else {
      const best = ms[0];
      ms.forEach(function (m, i) {
        const row = document.createElement("div");
        row.className = "move" + (i === 0 ? " is-best" : "") + (m.net < 0 ? " is-bad" : "");
        row.innerHTML =
          '<span class="move-rank">' + (i === 0 ? "BEST" : i + 1) + '</span>' +
          '<div class="move-copy"><b></b><small></small></div>' +
          '<div class="move-num"><span>You\'d be worth</span><b></b></div>' +
          '<div class="move-gap"><span></span><b></b></div>';
        row.querySelector(".move-copy b").textContent = m.name;
        row.querySelector(".move-copy small").textContent = m.cleared
          ? "Debt gone in " + (m.cleared / 12).toFixed(1) + " years \u00b7 " + m.note
          : m.left > 0 ? "You'd still owe " + usd(m.left) + " \u00b7 " + m.note : m.note;
        row.querySelector(".move-num b").textContent = usd(m.net);
        row.querySelector(".move-gap span").textContent = i === 0 ? "" : "You'd lose";
        row.querySelector(".move-gap b").textContent = i === 0 ? "—" : usd(best.net - m.net);
        list.appendChild(row);
      });

      const second = ms[1];
      $("moveFoot").textContent = second
        ? "Same " + usd(p.spare) + " a month either way \u2014 " + usd(best.net - second.net) + " difference."
        : "";
    }

    /* ---- say it ---- */
    let say;
    if (p.debt > 0 && x !== null && x <= p.N) {
      say = "“Your savings double " + every(clocks.money) + ". What you owe doubles " + every(clocks.debt) +
            ". Same maths, working against you — and in " + yrs(x) +
            " years the card is the bigger number. Paying it off earns you a certain " +
            (p.dr * 100).toFixed(1) + "% a year.”";
    } else if (p.debt > 0 && p.dr > p.ir) {
      say = "“You owe less than you've saved, but it grows faster — doubling " + every(clocks.debt) +
            " while your savings take " + yrs(clocks.money.t) + " years. Paying it off is the only " + (p.dr * 100).toFixed(1) +
            "% on this page that comes with no risk at all.”";
    } else if (p.debt > 0) {
      say = "“This one's unusual — your savings earn more than the debt costs you. Paying it off early buys peace of mind, not extra money.”";
    } else if (clocks.real.dir !== "double") {
      say = "“Earning " + (p.ir * 100).toFixed(1) + "% while prices rise " + (p.infl * 100).toFixed(1) +
            "% means the balance goes up and what it buys goes down. Same rule — just working against you.”";
    } else {
      say = "“Your savings double " + every(clocks.money) + ". But what they can buy only doubles " + every(clocks.real) +
            " — because prices are climbing too. That gap is why leaving money in cash isn't safe, it's just slow.”";
    }
    $("sayIt").textContent = say;

    /* ---- the accuracy ladder ---- */
    ladder(p);
    const e = clocks.money.r72 - clocks.money.t;
    $("accTeaser").textContent = clocks.money.dir !== "double"
      ? "Spot on at 7.85% — but there is nothing to divide by at 0%"
      : "At " + (p.ir * 100).toFixed(1) + "% the shortcut is " +
        (Math.abs(e) < 0.04 ? "exactly right" : "about " + Math.abs(e * 12).toFixed(0) + " month" + (Math.abs(e * 12) >= 1.5 ? "s" : "") + " out");

    scrub(p, x);
    paintSliders();
    paintChips();

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  const RATES = [3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 24, 30];
  function ladder(p) {
    const el = $("ladder");
    const near = function (r) { return Math.abs(r - p.ir * 100) < 0.26 || Math.abs(r - p.dr * 100) < 0.26; };
    let rows = "";
    RATES.forEach(function (r) {
      const t = exact(r / 100), q = 72 / r, err = q - t;
      const cls = near(r) ? " is-live" : Math.abs(err) < 0.06 ? " is-true" : "";
      rows +=
        '<button type="button" class="lad-row' + cls + '" data-rate="' + r + '">' +
          '<span class="lad-rate">' + r + '%</span>' +
          '<span class="lad-bar"><i style="width:' + Math.min(100, t / 24 * 100).toFixed(1) + '%"></i></span>' +
          '<span class="lad-n">' + q.toFixed(1) + '</span>' +
          '<span class="lad-n strong">' + t.toFixed(1) + '</span>' +
          '<span class="lad-err ' + (Math.abs(err) < 0.06 ? "ok" : err > 0 ? "over" : "under") + '">' +
            (Math.abs(err) < 0.06 ? "spot on" : Math.abs(err * 12).toFixed(0) + " mo") +
          '</span>' +
        '</button>';
    });
    el.innerHTML =
      '<div class="lad-head"><span>Rate</span><span></span><span>72 &divide; rate</span><span>Real answer</span><span>Out by</span></div>' + rows;
  }

  /* ---------- drag through the years ---------- */
  function scrub(p, x) {
    const sc = $("scrubber");
    if (!sc) return;

    sc.max = String(p.N);
    sc.step = p.N > 30 ? "1" : "0.5";
    let t = parseFloat(sc.value);
    if (!isFinite(t) || t > p.N || sc.dataset.held !== "1") {
      /* first paint, or the figures changed: park it on the interesting year */
      t = (x !== null && x > 0 && x <= p.N) ? Math.round(x * 2) / 2 : p.N;
      sc.value = String(t);
    }
    paintScrub(p, x, t);
  }

  function paintScrub(p, x, t) {
    const saved = p.inv * Math.pow(1 + p.ir, t);
    const owed = p.debt * Math.pow(1 + p.dr, t);
    /* head to head: the bigger of the two at THIS year fills the bar, so the
       comparison stays legible instead of shrinking into the year-25 scale */
    const top = Math.max(saved, owed, 1);

    $("scrubYear").textContent = t <= 0 ? "Today" : "Year " + (t % 1 ? t.toFixed(1) : t);
    $("barSave").style.width = Math.max(0, saved / top * 100).toFixed(2) + "%";
    $("barDebt").style.width = Math.max(0, owed / top * 100).toFixed(2) + "%";
    $("valSave").textContent = usd(saved);
    $("valDebt").textContent = p.debt > 0 ? usd(owed) : "nothing owed";

    const behind = p.debt > 0 && owed > saved;
    $("scrubFlag").hidden = !behind;
    $("barDebtRow").classList.toggle("is-ahead", behind);

    const fill = p.N > 0 ? (t / p.N) * 100 : 0;
    $("scrubber").style.setProperty("--fill", fill.toFixed(2) + "%");

    /* a pip on the track showing where the two meet */
    const pip = $("scrubPip");
    if (pip) {
      const show = x !== null && x > 0.05 && x <= p.N;
      pip.hidden = !show;
      if (show) pip.style.left = (x / p.N * 100).toFixed(2) + "%";
    }
  }

  /* ---------- sliders and chips ---------- */
  function paintSliders() {
    [["r7IRSlide", "r7IR"], ["r7DRSlide", "r7DR"]].forEach(function (pair) {
      const sl = $(pair[0]), input = $(pair[1]);
      if (!sl || !input) return;
      const v = parseFloat(input.value);
      if (isFinite(v)) sl.value = String(Math.min(parseFloat(sl.max), Math.max(0, v)));
      const f = (parseFloat(sl.value) - sl.min) / (sl.max - sl.min) * 100;
      sl.style.setProperty("--fill", f.toFixed(2) + "%");
    });
  }

  function paintChips() {
    document.querySelectorAll(".chips button[data-set]").forEach(function (b) {
      const cur = parseFloat($(b.getAttribute("data-set")).value);
      b.classList.toggle("on", Math.abs(cur - parseFloat(b.getAttribute("data-val"))) < 0.001);
    });
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
    $(f).addEventListener("input", function () {
      const sc = $("scrubber");
      if (sc) sc.dataset.held = "0";   /* figures changed: re-park the scrubber */
      run();
    });
    $(f).addEventListener("change", run);
  });

  /* a slider drives its number box, and the number box drives it back */
  [["r7IRSlide", "r7IR"], ["r7DRSlide", "r7DR"]].forEach(function (pair) {
    const sl = $(pair[0]), input = $(pair[1]);
    if (!sl || !input) return;
    sl.addEventListener("input", function () {
      input.value = sl.value;
      const sc = $("scrubber");
      if (sc) sc.dataset.held = "0";
      run();
    });
  });

  /* quick rates */
  document.querySelectorAll(".chips button[data-set]").forEach(function (b) {
    b.addEventListener("click", function () {
      $(b.getAttribute("data-set")).value = b.getAttribute("data-val");
      const sc = $("scrubber");
      if (sc) sc.dataset.held = "0";
      run();
    });
  });

  /* the year scrubber moves on its own, without re-parking itself */
  if ($("scrubber")) {
    $("scrubber").addEventListener("input", function () {
      this.dataset.held = "1";
      const p = read();
      paintScrub(p, crossover(p), parseFloat(this.value));
    });
  }

  $("ladder").addEventListener("click", function (e) {
    const b = e.target.closest("[data-rate]");
    if (!b) return;
    $("r7IR").value = b.getAttribute("data-rate");
    run();
    $("r7IR").focus();
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
    const sc = $("scrubber");
    if (sc) sc.dataset.held = "0";
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  }
  if ($("resetBtn")) $("resetBtn").addEventListener("click", resetAll);
  if ($("resetBtn2")) $("resetBtn2").addEventListener("click", resetAll);

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), real = realRate(p.ir, p.infl), x = crossover(p), ms = moves(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["Rule of 72 — WEALTHDEMO", "",
      usd(p.inv) + " growing at " + (p.ir * 100).toFixed(1) + "%  ·  " + usd(p.debt) + " owed at " + (p.dr * 100).toFixed(1) + "%",
      "Looking " + p.N + " years out  ·  inflation " + (p.infl * 100).toFixed(1) + "%", "",
      $("ansHeadline").textContent, $("ansSub").textContent, "",
      "HOW FAST THINGS DOUBLE",
      "  Your savings double        " + every(clockOf(p.ir)),
      "  What it can buy doubles    " + every(clockOf(real)),
      p.debt > 0 ? "  What you owe doubles       " + every(clockOf(p.dr)) : "",
      x !== null && x <= p.N ? "  Same size at year " + yrs(x) : "", "",
      "WHAT THIS MEANS", "  " + $("dxTitle").textContent, "  " + $("dxBody").textContent, ""];
    if (ms.length) {
      lines.push("WHERE " + usd(p.spare) + " A MONTH SHOULD GO");
      ms.forEach(function (m, i) {
        lines.push("  " + (i + 1) + ". " + m.name + " — you'd be worth " + usd(m.net) + " at year " + p.N +
          (m.cleared ? " (clear in " + (m.cleared / 12).toFixed(1) + "y)" : ""));
      });
      lines.push("");
    }
    lines.push($("sayIt").textContent, "",
      "Educational illustration only. 72 ÷ rate is a shortcut, exactly right at 7.85%. Tax on growth, fees, changing or promotional rates, minimum payments, late fees and penalty rates are not included, and a level return is assumed. Speak to a qualified tax or financial professional.");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.filter(function (l) { return l !== ""; }).join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  /* the chart frame changes at 720px, so redraw when that line is crossed */
  let wasNarrow = window.innerWidth < 720;
  let rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      const narrow = window.innerWidth < 720;
      if (narrow !== wasNarrow) { wasNarrow = narrow; run(); }
    }, 140);
  });

  load();
  run();
})();
