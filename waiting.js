/* ============================================================
   WEALTHDEMO — Cost of Waiting

   A four-button version answers one question: how much smaller
   is the pot. That is the scolding half. This one also answers
   the half a client actually asks next:

     · what would I have to pay to end up in the same place?
     · is the first year of waiting the cheap one or the dear one?
     · does "same money" mean the same TOTAL, or the same each
       MONTH?  They tell very different stories and both are true.
     · and if I have already waited, what gets me back?

   Every figure is a monthly run, not a yearly shortcut.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("wAge")) return;

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
  const pct = function (f) {
    const one = (f * 100).toFixed(1);
    return (one.slice(-2) === ".0" ? (f * 100).toFixed(0) : one) + "%";
  };
  const yr = function (n) { return n === 1 ? "1 year" : n + " years"; };

  const FIELDS = ["wAge", "wRet", "wAmt", "wRate"];
  const STORE = "wealthdemo.tool.waiting";
  const DEFAULTS = { wAge: 35, wRet: 65, wAmt: 90000, wRate: 7 };
  let MODE = "total";           /* "total" or "monthly" */
  let DELAY = 10;

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    const age = Math.max(16, Math.min(79, Math.round(num("wAge", 35))));
    let ret = Math.max(40, Math.min(85, Math.round(num("wRet", 65))));
    if (ret <= age) ret = age + 1;
    return {
      age: age, ret: ret, years: ret - age,
      amt: Math.max(0, num("wAmt", 90000)),
      r: Math.max(0, Math.min(20, num("wRate", 7))) / 100,
      mode: MODE,
      delay: Math.max(0, Math.min(ret - age, DELAY))
    };
  }

  /* ---------- the engine: what $1 a month becomes ---------- */
  function factor(years, r) {
    const n = Math.round(years * 12);
    if (n <= 0) return 0;
    const i = r / 12;
    return i === 0 ? n : (Math.pow(1 + i, n) - 1) / i;
  }

  /* what goes in each month if you start after waiting `w` years */
  function monthlyFor(p, w) {
    const left = p.years - w;
    if (left <= 0) return 0;
    return p.mode === "total" ? p.amt / (left * 12) : p.amt;
  }

  function outcome(p, w) {
    const left = Math.max(0, p.years - w);
    const mo = monthlyFor(p, w);
    return {
      wait: w, left: left, monthly: mo,
      paidIn: mo * left * 12,
      end: mo * factor(left, p.r),
      startAge: p.age + w
    };
  }

  /* ---------- the balance path, for the chart ---------- */
  function path(p, w, steps) {
    const out = [];
    for (let s = 0; s <= steps; s++) {
      const t = p.years * s / steps;
      const grown = Math.max(0, t - w);
      out.push([p.age + t, monthlyFor(p, w) * factor(grown, p.r)]);
    }
    return out;
  }

  /* ---------- ways back ---------- */
  function ways(p, now, late) {
    const list = [];
    if (p.delay <= 0) return list;

    list.push({
      id: "now", name: "Start this month instead",
      note: usd(now.monthly) + " a month for " + yr(p.years) + ".",
      end: now.end, paid: now.paidIn, best: true
    });

    /* pay the catch-up */
    const f = factor(late.left, p.r);
    if (f > 0) {
      const need = now.end / f;
      list.push({
        id: "catch", name: "Wait, then pay the catch-up",
        note: usd(need) + " a month instead of " + usd(now.monthly) + ", for " + yr(late.left) + ".",
        end: now.end, paid: need * late.left * 12
      });
    }

    /* work a little longer */
    [2, 4].forEach(function (extra) {
      const left = late.left + extra;
      const mo = p.mode === "total" ? p.amt / (left * 12) : p.amt;
      list.push({
        id: "later" + extra, name: "Wait, then stop working at " + (p.ret + extra),
        note: usd(mo) + " a month for " + yr(left) + ".",
        end: mo * factor(left, p.r), paid: mo * left * 12
      });
    });

    list.push({
      id: "late", name: "Wait " + yr(p.delay) + " and change nothing else",
      note: usd(late.monthly) + " a month for " + yr(late.left) + ".",
      end: late.end, paid: late.paidIn, isLate: true
    });

    /* best end balance first; where two end level, the cheaper one wins */
    list.sort(function (a, b) {
      if (Math.abs(a.end - b.end) > 1) return b.end - a.end;
      return a.paid - b.paid;
    });
    return list;
  }

  /* ---------- what this means ---------- */
  function diagnose(p, now, late, firstYear) {
    const gap = now.end - late.end;

    if (p.delay <= 0) {
      return {
        title: "Nothing is being put off — this is the best case.",
        body: "Drag the bar above to see what any amount of waiting would take off the end. The first year is always the most expensive one.",
        s1: usd(now.end), s1l: "Where you finish", s1t: "good", s1u: "at " + p.ret,
        s2: usd(firstYear), s2l: "What one year of waiting would cost", s2t: "warn", s2u: "starting from today"
      };
    }

    if (late.left <= 0) {
      return {
        title: "Wait that long and there's no time left at all.",
        body: "Putting it off " + yr(p.delay) + " takes you past " + p.ret +
              ". Nothing gets paid in and nothing gets the chance to grow.",
        s1: usd(now.end), s1l: "What starting now would give you", s1t: "good",
        s2: usd(0), s2l: "What waiting gives you", s2t: "bad"
      };
    }

    if (p.r <= 0) {
      return {
        title: "With no growth, waiting costs you nothing.",
        body: p.mode === "total"
          ? "The same " + usd(p.amt) + " goes in either way and nothing grows on top, so the finish is identical. Put a growth rate in and the picture changes completely."
          : "You'd pay in " + usd(now.paidIn - late.paidIn) + " less, and that is the whole difference — without growth there is nothing else to lose.",
        s1: usd(gap), s1l: "The difference", s1t: gap > 1 ? "warn" : "good",
        s2: "0%", s2l: "Growth assumed", s2t: "warn"
      };
    }

    if (p.mode === "monthly") {
      return {
        title: "Waiting costs you twice over.",
        body: "At " + usd(p.amt) + " a month you pay in " + usd(now.paidIn - late.paidIn) +
              " less, and what does go in has " + yr(p.delay) +
              " less time to grow. Together that is " + usd(gap) + " off the finish.",
        s1: usd(now.paidIn - late.paidIn), s1l: "Money you never put in", s1t: "warn",
        s2: usd(gap - (now.paidIn - late.paidIn)), s2l: "Growth you never got", s2t: "bad", s2u: "on top of that"
      };
    }

    return {
      title: "The most expensive year to wait is this one.",
      body: "Waiting the first year costs " + usd(firstYear) + ". The tenth costs less, because by then there is less time left for it to matter. " +
            "Exactly the same " + usd(p.amt) + " goes in either way — it just gets " + yr(p.delay) +
            " less time to work, and that alone is " + usd(gap) + ".",
      s1: usd(firstYear), s1l: "The first year alone", s1t: "warn", s1u: usd(firstYear / 365) + " a day",
      s2: usd(gap), s2l: "All " + yr(p.delay) + " together", s2t: "bad", s2u: pct(gap / Math.max(1, now.end)) + " of the finish"
    };
  }

  /* ---------- the chart ---------- */
  function geom() {
    return window.innerWidth < 720
      ? { CW: 420, CH: 400, PL: 54, PR: 14, PT: 20, PB: 40 }
      : { CW: 1040, CH: 300, PL: 66, PR: 24, PT: 18, PB: 40 };
  }

  function chart(p, now, late) {
    const g = geom(), CW = g.CW, CH = g.CH, PL = g.PL, PR = g.PR, PT = g.PT, PB = g.PB;
    const plotW = CW - PL - PR, plotH = CH - PT - PB;
    const STEPS = 120;

    const a = path(p, 0, STEPS), b = path(p, p.delay, STEPS);
    const ymax = Math.max(now.end, late.end, 1);

    const X = function (age) { return PL + (age - p.age) / p.years * plotW; };
    const Y = function (v) { return PT + plotH - Math.min(v, ymax) / ymax * plotH; };
    const line = function (h) {
      return h.map(function (q) { return X(q[0]).toFixed(1) + "," + Y(q[1]).toFixed(1); }).join(" ");
    };

    let grid = "", labels = "";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      const y = PT + plotH - f * plotH;
      grid += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (CW - PR) + '" y2="' + y.toFixed(1) + '"/>';
      labels += '<text x="' + (PL - 9) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + usd0(ymax * f) + '</text>';
    });

    let ticks = "";
    const step = p.years > 30 ? 10 : p.years > 12 ? 5 : 2;
    const marks = [];
    for (let age = p.age; age < p.ret - step * 0.4; age += step) marks.push(age);
    marks.push(p.ret);                      /* the finish line always gets its own label */
    marks.forEach(function (age, idx) {
      const last = idx === marks.length - 1;
      ticks += '<text x="' + X(age).toFixed(1) + '" y="' + (PT + plotH + 19) +
        '" text-anchor="' + (last ? "end" : idx === 0 ? "start" : "middle") + '">' + age + '</text>';
    });

    /* the shaded gap between the two paths */
    const band = line(a) + " " + b.slice().reverse().map(function (q) {
      return X(q[0]).toFixed(1) + "," + Y(q[1]).toFixed(1);
    }).join(" ");

    /* the years nothing is happening */
    const idle = p.delay > 0
      ? '<rect class="c-idle" x="' + PL + '" y="' + PT + '" width="' + (X(p.age + p.delay) - PL).toFixed(1) +
        '" height="' + plotH + '"/>' +
        '<text class="c-idle-lab" x="' + ((PL + X(p.age + p.delay)) / 2).toFixed(1) + '" y="' + (PT + 16) +
        '" text-anchor="middle">' + yr(p.delay).toUpperCase() + ' WAITING</text>'
      : "";

    const gapLab = p.delay > 0 && now.end - late.end > 1
      ? '<line class="c-gap" x1="' + (X(p.ret) - 1).toFixed(1) + '" y1="' + Y(now.end).toFixed(1) +
        '" x2="' + (X(p.ret) - 1).toFixed(1) + '" y2="' + Y(late.end).toFixed(1) + '"/>' +
        '<text class="c-gap-lab" x="' + (X(p.ret) - 9).toFixed(1) + '" y="' +
          ((Y(now.end) + Y(late.end)) / 2 + 4).toFixed(1) + '" text-anchor="end">' + usd(now.end - late.end) + ' gap</text>'
      : "";

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="wd-chart r7-chart wait-chart" role="img" aria-label="Balance by age, starting now against starting later">' +
      '<g class="c-grid">' + grid + '</g>' + idle +
      '<polygon class="c-band-gap" points="' + band + '"/>' +
      '<polyline class="c-late" points="' + line(b) + '"/>' +
      '<polyline class="c-inv" points="' + line(a) + '"/>' +
      '<circle class="c-end-now" cx="' + X(p.ret).toFixed(1) + '" cy="' + Y(now.end).toFixed(1) + '" r="5"/>' +
      '<circle class="c-end-late" cx="' + X(p.ret).toFixed(1) + '" cy="' + Y(late.end).toFixed(1) + '" r="5"/>' +
      gapLab +
      '<line class="c-base" x1="' + PL + '" y1="' + (PT + plotH) + '" x2="' + (CW - PR) + '" y2="' + (PT + plotH) + '"/>' +
      '<g class="c-axis">' + labels + ticks + '</g>' +
      '<text x="' + (PL + plotW / 2) + '" y="' + (CH - 5) + '" text-anchor="middle" class="c-axis-title">Your age</text>' +
      '</svg>';
  }

  /* ---------- render ---------- */
  function run() {
    const p = read();
    const now = outcome(p, 0);
    const late = outcome(p, p.delay);
    const gap = now.end - late.end;
    const firstYear = now.end - outcome(p, 1).end;

    /* the delay bar */
    const dl = $("delaySlide");
    dl.max = String(Math.max(1, p.years));
    if (parseInt(dl.value, 10) !== p.delay) dl.value = String(p.delay);
    dl.style.setProperty("--fill", (p.delay / Math.max(1, p.years) * 100).toFixed(2) + "%");
    $("delayYears").textContent = p.delay === 0 ? "not at all" : yr(p.delay);
    $("delayAge").textContent = p.delay === 0
      ? "starting this month"
      : "starting at " + (p.age + p.delay) + " instead of " + p.age;
    ticks(p);

    /* the mode strip */
    $("planTag").textContent = p.mode === "total" ? "SAME TOTAL" : "SAME EACH MONTH";
    $("amtLabel").textContent = p.mode === "total" ? "Total you'd put in" : "Each month you'd put in";
    $("modeNote").textContent = p.mode === "total"
      ? "The same " + usd(p.amt) + " goes in either way — just squeezed into fewer years, so the monthly amount goes up."
      : "The same " + usd(p.amt) + " a month either way — so waiting means less money goes in altogether.";

    /* the answer */
    if (p.delay <= 0) {
      $("ansHeadline").innerHTML = "…you finish with <span class=\"cool\">" + usd(now.end) + "</span>.";
      $("ansSub").innerHTML = "Putting it off by one year would cost <b>" + usd(firstYear) + "</b>.";
    } else if (late.left <= 0) {
      $("ansHeadline").innerHTML = "…there'd be <span class=\"hot\">nothing left to finish with</span>.";
      $("ansSub").innerHTML = "Waiting " + yr(p.delay) + " takes you past " + p.ret + ".";
    } else {
      $("ansHeadline").innerHTML = "…it costs you <span class=\"hot\">" + usd(gap) + "</span>.";
      $("ansSub").innerHTML = "That's <b>" + pct(gap / Math.max(1, now.end)) + "</b> of the finish, gone — for waiting " +
        yr(p.delay) + ".";
    }

    /* three cards */
    const cards = [
      { tint: "mint", label: "Start this month", big: usd(now.end),
        sub: usd(now.monthly) + " a month for " + yr(p.years),
        footL: "You put in", foot: usd(now.paidIn) },
      { tint: "blush", bad: true, label: "Start at " + (p.age + p.delay), big: usd(late.end),
        sub: late.left > 0 ? usd(late.monthly) + " a month for " + yr(late.left) : "no years left to pay in",
        footL: "You put in", foot: usd(late.paidIn) },
      { tint: "sun", bad: true, label: "What the wait costs", big: usd(gap),
        sub: pct(gap / Math.max(1, now.end)) + " of the finish",
        footL: "Every day you wait", foot: p.delay > 0 ? usd(gap / (p.delay * 365)) : "—" }
    ];
    const grid = $("cardGrid");
    grid.innerHTML = "";
    cards.forEach(function (c) {
      const el = document.createElement("article");
      el.className = "clock" + (c.bad ? " is-bad" : "");
      el.setAttribute("data-tint", c.tint);
      el.innerHTML =
        '<header><span class="clock-dot"></span><b></b></header>' +
        '<div class="clock-big"><b></b></div>' +
        '<small class="clock-sub"></small>' +
        '<footer><span></span><b></b></footer>';
      el.querySelector("header b").textContent = c.label;
      el.querySelector(".clock-big b").textContent = c.big;
      el.querySelector(".clock-sub").textContent = c.sub;
      el.querySelector("footer span").textContent = c.footL;
      el.querySelector("footer b").textContent = c.foot;
      grid.appendChild(el);
    });

    /* the catch-up */
    const f = factor(late.left, p.r);
    const cu = $("catchup");
    if (p.delay > 0 && f > 0 && gap > 1) {
      cu.hidden = false;
      const need = now.end / f;
      const needTotal = need * late.left * 12;
      $("cuTitle").textContent = usd(need) + " a month, not " + usd(now.monthly) + ".";
      $("cuBody").textContent = "That is what it takes to reach " + usd(now.end) + " after waiting " + yr(p.delay) +
        " — " + (need / Math.max(1, now.monthly)).toFixed(1) + " times the payment, and " +
        usd(Math.max(0, needTotal - now.paidIn)) + " more of your own money, to end up in exactly the same place.";
      $("cuMonthly").textContent = usd(need);
      $("cuMonthlyWas").textContent = "instead of " + usd(now.monthly);
      $("cuTotal").textContent = usd(needTotal);
      $("cuTotalWas").textContent = "instead of " + usd(now.paidIn);
    } else {
      cu.hidden = true;
    }

    /* the chart */
    $("raceWrap").innerHTML = chart(p, now, late);
    $("raceSub").textContent = p.delay > 0
      ? "Same finish line at " + p.ret + ". The lower line just starts " + yr(p.delay) + " later."
      : "Nothing is being put off, so there is only one line.";

    /* what it means */
    const dx = diagnose(p, now, late, firstYear);
    $("dxTitle").textContent = dx.title;
    $("dxBody").textContent = dx.body;
    $("dxS1").textContent = dx.s1; $("dxS1L").textContent = dx.s1l; $("dxS1").className = "dx-figure " + dx.s1t;
    $("dxS2").textContent = dx.s2; $("dxS2L").textContent = dx.s2l; $("dxS2").className = "dx-figure " + dx.s2t;
    $("dxS1U").textContent = dx.s1u || ""; $("dxS2U").textContent = dx.s2u || "";

    /* ways back */
    const ws = ways(p, now, late);
    const list = $("moveList");
    list.innerHTML = "";
    $("moveBudget").textContent = p.delay > 0 ? "after waiting " + yr(p.delay) : "nothing to undo";

    if (!ws.length) {
      list.innerHTML = '<p class="move-empty">Drag the bar above to put it off, and the ways back appear here.</p>';
      $("moveFoot").textContent = "";
    } else {
      const top = ws[0];
      ws.forEach(function (m, idx) {
        const row = document.createElement("div");
        row.className = "move" + (idx === 0 ? " is-best" : "") + (m.isLate ? " is-bad" : "");
        row.innerHTML =
          '<span class="move-rank">' + (idx === 0 ? "BEST" : idx + 1) + '</span>' +
          '<div class="move-copy"><b></b><small></small></div>' +
          '<div class="move-num"><span>You finish with</span><b></b></div>' +
          '<div class="move-gap"><span></span><b></b></div>';
        row.querySelector(".move-copy b").textContent = m.name;
        row.querySelector(".move-copy small").textContent = m.note + " You put in " + usd(m.paid) + ".";
        row.querySelector(".move-num b").textContent = usd(m.end);
        const short = top.end - m.end;
        row.querySelector(".move-gap span").textContent = short > 1 ? "Short by" : "";
        row.querySelector(".move-gap b").textContent = short > 1 ? usd(short) : "—";
        list.appendChild(row);
      });
      $("moveFoot").textContent = p.delay > 0
        ? "Starting now is the only one of these that costs you nothing extra."
        : "";
    }

    /* say it */
    let say;
    if (p.delay <= 0) {
      say = "“Start this month and you finish with " + usd(now.end) +
            ". Put it off just one year and that drops by " + usd(firstYear) +
            ". Not because you paid in less — because the money had a year less to work.”";
    } else if (late.left <= 0) {
      say = "“Wait that long and there's no time left at all. Every plan needs a runway, and that one has none.”";
    } else if (p.mode === "monthly") {
      say = "“Same " + usd(p.amt) + " a month either way. Start now and you finish with " + usd(now.end) +
            "; start in " + yr(p.delay) + " and it's " + usd(late.end) +
            ". You'd pay in " + usd(now.paidIn - late.paidIn) + " less and lose " + usd(gap) + ".”";
    } else {
      const need = f > 0 ? now.end / f : 0;
      say = "“Exactly the same " + usd(p.amt) + " goes in either way — and waiting " + yr(p.delay) +
            " still costs " + usd(gap) + ", because that money gets " + yr(p.delay) +
            " less time to grow. To finish in the same place after waiting, you'd have to find " + usd(need) +
            " a month instead of " + usd(now.monthly) + ". You can always find more money. You can never find more time.”";
    }
    $("sayIt").textContent = say;

    /* year by year */
    yearly(p, now);
    $("yearTeaser").textContent = p.r > 0
      ? "The first year costs " + usd(firstYear) + " — more than any year after it"
      : "With no growth there is nothing to lose by waiting";

    paintSliders(p);
    paintChips();
    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* ---------- the year-by-year strip ---------- */
  function yearly(p, now) {
    const el = $("yearly");
    const max = Math.min(p.years - 1, 20);
    if (max < 1) { el.innerHTML = ""; $("yearNote").textContent = ""; return; }

    const rows = [];
    let prev = now.end, worst = 0;
    for (let w = 1; w <= max; w++) {
      const e = outcome(p, w).end;
      const cost = prev - e;
      rows.push({ w: w, cost: cost, running: now.end - e, age: p.age + w });
      worst = Math.max(worst, cost);
      prev = e;
    }

    $("yearNote").textContent = p.r > 0
      ? "Each bar is what that one extra year of waiting takes off the finish. They get smaller as you go — which is why the year in front of you is the one that matters most."
      : "With no growth assumed, waiting costs nothing here.";

    el.innerHTML = rows.map(function (r) {
      return '<button type="button" class="yr-row' + (parseInt($("delaySlide").value, 10) === r.w ? " is-live" : "") +
        '" data-wait="' + r.w + '">' +
        '<span class="yr-n">Year ' + r.w + '</span>' +
        '<span class="yr-age">at ' + r.age + '</span>' +
        '<span class="yr-bar"><i style="width:' + (worst > 0 ? (r.cost / worst * 100).toFixed(1) : 0) + '%"></i></span>' +
        '<span class="yr-cost">' + usd(r.cost) + '</span>' +
        '<span class="yr-run">' + usd(r.running) + ' so far</span>' +
        '</button>';
    }).join("");
  }

  /* ---------- the ticks under the delay bar ---------- */
  function ticks(p) {
    const el = $("delayTicks");
    const span = Math.max(1, p.years);
    const marks = [0, 1, 5, 10, 15, 20].filter(function (m) { return m <= span; });
    el.innerHTML = marks.map(function (m) {
      return '<button type="button" class="tick' + (m === p.delay ? " on" : "") + '" data-wait="' + m + '">' +
        (m === 0 ? "now" : m) + '</button>';
    }).join("");
  }

  function paintSliders(p) {
    [["wAgeSlide", "wAge"], ["wRetSlide", "wRet"], ["wRateSlide", "wRate"]].forEach(function (pair) {
      const sl = $(pair[0]), input = $(pair[1]);
      if (!sl || !input) return;
      const v = parseFloat(input.value);
      if (isFinite(v)) sl.value = String(Math.min(parseFloat(sl.max), Math.max(parseFloat(sl.min), v)));
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
    const o = { mode: MODE, delay: DELAY };
    FIELDS.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    FIELDS.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
    if (s.mode === "monthly" || s.mode === "total") MODE = s.mode;
    if (typeof s.delay === "number") DELAY = s.delay;
    document.querySelectorAll("[data-mode]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-mode") === MODE);
    });
  }

  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", run);
    $(f).addEventListener("change", run);
  });

  [["wAgeSlide", "wAge"], ["wRetSlide", "wRet"], ["wRateSlide", "wRate"]].forEach(function (pair) {
    const sl = $(pair[0]), input = $(pair[1]);
    if (!sl || !input) return;
    sl.addEventListener("input", function () { input.value = sl.value; run(); });
  });

  document.querySelectorAll(".chips button[data-set]").forEach(function (b) {
    b.addEventListener("click", function () {
      $(b.getAttribute("data-set")).value = b.getAttribute("data-val");
      run();
    });
  });

  $("delaySlide").addEventListener("input", function () {
    DELAY = parseInt(this.value, 10) || 0;
    run();
  });

  $("delayTicks").addEventListener("click", function (e) {
    const b = e.target.closest("[data-wait]");
    if (!b) return;
    DELAY = parseInt(b.getAttribute("data-wait"), 10) || 0;
    run();
  });

  $("yearly").addEventListener("click", function (e) {
    const b = e.target.closest("[data-wait]");
    if (!b) return;
    DELAY = parseInt(b.getAttribute("data-wait"), 10) || 0;
    run();
  });

  document.querySelectorAll("[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      MODE = b.getAttribute("data-mode");
      document.querySelectorAll("[data-mode]").forEach(function (o) { o.classList.toggle("on", o === b); });
      /* carry the figure across so the comparison stays sensible */
      const p = read();
      const per = p.years * 12;
      if (MODE === "monthly") $("wAmt").value = Math.round(num("wAmt", 90000) / per);
      else $("wAmt").value = Math.round(num("wAmt", 250) * per);
      run();
    });
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
  if ($("resetBtn")) $("resetBtn").addEventListener("click", function () {
    FIELDS.forEach(function (f) { $(f).value = DEFAULTS[f]; });
    MODE = "total"; DELAY = 10;
    document.querySelectorAll("[data-mode]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-mode") === "total");
    });
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  });

  let rt = null, wasNarrow = window.innerWidth < 720;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      const n = window.innerWidth < 720;
      if (n !== wasNarrow) { wasNarrow = n; run(); }
    }, 140);
  });

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), now = outcome(p, 0), late = outcome(p, p.delay);
    const f = factor(late.left, p.r), need = f > 0 ? now.end / f : 0;
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["Cost of Waiting — WEALTHDEMO", "",
      "Age " + p.age + ", stopping at " + p.ret + "  ·  growing at " + (p.r * 100).toFixed(1) + "%",
      p.mode === "total" ? "Same " + usd(p.amt) + " total either way" : "Same " + usd(p.amt) + " a month either way", "",
      $("ansHeadline").textContent, $("ansSub").textContent, "",
      "START THIS MONTH   " + usd(now.end) + "   (" + usd(now.monthly) + "/mo for " + yr(p.years) + ")",
      "START AT " + (p.age + p.delay) + "        " + usd(late.end) + "   (" + usd(late.monthly) + "/mo for " + yr(late.left) + ")",
      "THE WAIT COSTS     " + usd(now.end - late.end), ""];
    if (need > 0) {
      lines.push("TO FINISH IN THE SAME PLACE AFTER WAITING",
        "  " + usd(need) + " a month instead of " + usd(now.monthly),
        "  " + usd(need * late.left * 12) + " of your own money instead of " + usd(now.paidIn), "");
    }
    lines.push("WHAT THIS MEANS", "  " + $("dxTitle").textContent, "  " + $("dxBody").textContent, "",
      $("sayIt").textContent, "",
      "Educational illustration only. Assumes a level return and level monthly paying-in, with no tax, fees, rising prices, employer matching or pay rises. Real returns arrive in an order and that order matters. Speak to a qualified tax or financial professional.");

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
