/* ============================================================
   WEALTHDEMO — Plan Intelligence
   Reads the live numbers, ranks what matters, and answers
   questions about them. Runs entirely in the browser.
   ============================================================ */
(function () {
  const root = document.getElementById("wp-building-retirement");
  if (!root) return;

  const $ = function (id) { return document.getElementById(id); };
  const money = function (v) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0
    }).format(Math.max(0, Math.round(Number(v) || 0)));
  };
  const pct = function (v) { return Math.round(Math.max(0, Number(v) || 0)) + "%"; };

  function val(id) {
    const el = $(id);
    return el ? Math.max(0, Number(el.value) || 0) : 0;
  }
  function read(id) {
    const el = $(id);
    if (!el) return 0;
    return Math.abs(Number(String(el.textContent).replace(/[^0-9.-]/g, "")) || 0);
  }
  function futureValue(start, monthly, annualRate, months) {
    const r = annualRate / 12;
    if (r === 0) return start + monthly * months;
    return start * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r);
  }

  /* ---------- the live model ---------- */
  function rows(selector, valueClass, rateClass) {
    return Array.prototype.slice.call(root.querySelectorAll(selector)).map(function (row) {
      const amount = row.querySelector(valueClass);
      const rate = row.querySelector(rateClass);
      return {
        amount: amount ? Math.max(0, Number(amount.value) || 0) : 0,
        rate: rate ? Math.max(0, Number(rate.value) || 0) / 100 : 0.07
      };
    });
  }

  function model() {
    const savingsRows = rows("#savingsItems .contrib-item", ".savings-balance", ".savings-rate");
    const contribRows = rows("#contribItems .contrib-item", ".contrib-monthly", ".contrib-rate");

    const age = val("curAge2");
    const retireAge = Math.max(age, val("retireAge2"));
    const years = Math.max(0, retireAge - age);
    const match = val("employerMatch");
    const savings = savingsRows.reduce(function (s, r) { return s + r.amount; }, 0);
    const contrib = contribRows.reduce(function (s, r) { return s + r.amount; }, 0);
    const monthly = contrib + match;

    const weighted = savingsRows.reduce(function (s, r) { return s + r.amount * r.rate; }, 0) +
                     contribRows.reduce(function (s, r) { return s + r.amount * r.rate; }, 0);
    const base = savings + contrib;
    const growth = base > 0 ? weighted / base : 0.07;

    function projectAt(y) {
      const months = y * 12;
      let total = 0;
      savingsRows.forEach(function (r) { total += futureValue(r.amount, 0, r.rate, months); });
      contribRows.forEach(function (r) { total += futureValue(0, r.amount, r.rate, months); });
      total += futureValue(0, match, growth, months);
      return total;
    }

    const inflation = val("inflationRate") / 100;
    const withdraw = Math.max(0.001, val("withdrawRate2") / 100);
    const goalIncome = val("goalIncome");
    const ss = val("socialSecurityMonthly");
    const income = val("annualIncome");

    const goalNestEgg = read("goalNestEggOut");
    const projected = read("projectedBalanceOut");
    const gap = Math.max(0, goalNestEgg - projected);

    function goalAt(y) {
      const futureIncome = goalIncome * Math.pow(1 + inflation, y);
      const fromSavings = Math.max(0, futureIncome - ss);
      return (fromSavings * 12) / withdraw;
    }

    const amounts = Array.prototype.slice.call(root.querySelectorAll("#taxResultGrid .amt"))
      .map(function (n) { return Math.abs(Number(String(n.textContent).replace(/[^0-9.-]/g, "")) || 0); });
    const buckets = { now: amounts[0] || 0, later: amounts[1] || 0, never: amounts[2] || 0 };
    buckets.total = buckets.now + buckets.later + buckets.never;

    const bills = val("protBills");
    const mortgagePmt = root.querySelector('[data-mortgage-choice="yes"].active') ? val("protMortgageMonthly") : 0;
    const mortgage = root.querySelector('[data-mortgage-choice="yes"].active') ? val("protMortgageBalance") : 0;
    const emergency = val("protSavings");
    const monthlyNeed = Math.max(0, bills + mortgagePmt - val("protContinue"));
    const monthsCovered = monthlyNeed > 0 ? emergency / monthlyNeed : (emergency > 0 ? Infinity : 0);

    const collegeGapNode = root.querySelector("#collegeResults .college-stat.gap strong");
    const collegeGap = collegeGapNode
      ? Math.abs(Number(collegeGapNode.textContent.replace(/[^0-9.-]/g, "")) || 0) : 0;

    const legacyOn = !!root.querySelector('[data-legacy-choice="yes"].active');

    const rate = growth > 0 ? growth / 12 : 0;
    const months = years * 12;
    const extraMonthly = gap > 0 && months > 0
      ? (rate > 0 ? gap * rate / (Math.pow(1 + rate, months) - 1) : gap / months)
      : 0;

    return {
      name: (($("firstName") || {}).value || "").trim().split(/\s+/)[0] || "",
      age: age, retireAge: retireAge, years: years, income: income,
      savings: savings, monthly: monthly, contrib: contrib, match: match,
      growth: growth, inflation: inflation, withdraw: withdraw,
      goalIncome: goalIncome, futureGoalIncome: goalIncome * Math.pow(1 + inflation, years),
      ss: ss, goalNestEgg: goalNestEgg, projected: projected, gap: gap,
      extraMonthly: extraMonthly,
      savingsRate: income > 0 ? (monthly * 12 / income) * 100 : 0,
      buckets: buckets,
      protection: {
        bills: bills, emergency: emergency, monthlyNeed: monthlyNeed,
        monthsCovered: monthsCovered, mortgage: mortgage, mortgagePmt: mortgagePmt,
        gap: read("protIncomeGap")
      },
      legacy: { on: legacyOn, today: read("legacyToday"), goal: val("legacyGoal"), gap: read("legacyGap"), insurance: val("legacyInsurance") },
      college: { gap: collegeGap, kids: root.querySelectorAll("#collegeChildren .college-child").length },
      marketRisk: read("chaosNumMarket"),
      projectAt: projectAt, goalAt: goalAt
    };
  }

  /* ---------- what matters, ranked ---------- */
  function insights(m) {
    const out = [];
    const add = function (o) { out.push(o); };

    if (m.gap > 0 && m.goalNestEgg > 0) {
      add({
        score: 100, tone: "warn", step: 6,
        title: "You're " + money(m.gap) + " short of your goal",
        body: "Your plan projects " + money(m.projected) + " by age " + m.retireAge +
              ", against the " + money(m.goalNestEgg) + " needed for the lifestyle you chose."
      });
      if (m.extraMonthly > 0) {
        add({
          score: 95, tone: "action", step: 4,
          title: "About " + money(Math.ceil(m.extraMonthly)) + "/month closes it",
          body: "On top of the " + money(m.monthly) + " you already save — " +
                money(m.monthly + Math.ceil(m.extraMonthly)) + "/month in total at your blended " +
                (m.growth * 100).toFixed(1) + "% assumption."
        });
      }
      if (m.years > 2) {
        const later = m.projectAt(m.years + 3);
        const gained = later - m.projected;
        if (gained > 0) add({
          score: 72, tone: "info", step: 4,
          title: "Three more years of work adds " + money(gained),
          body: "Retiring at " + (m.retireAge + 3) + " instead of " + m.retireAge +
                " would project " + money(later) + " — compounding does most of that work, not the extra contributions."
        });
      }
    } else if (m.goalNestEgg > 0) {
      add({
        score: 90, tone: "good", step: 4,
        title: "Your current path reaches the goal",
        body: "Projected " + money(m.projected) + " against " + money(m.goalNestEgg) +
              " needed. The work now shifts from building to protecting it."
      });
    }

    if (m.buckets.total > 0) {
      const laterShare = (m.buckets.later / m.buckets.total) * 100;
      if (laterShare >= 60) add({
        score: 88, tone: "warn", step: 5,
        title: pct(laterShare) + " of your future money is taxed on the way out",
        body: money(m.buckets.later) + " sits in Tax Later accounts. Whatever tax rates do between now and " +
              m.retireAge + ", that entire balance is exposed to the change."
      });
      if (m.buckets.never === 0) add({
        score: 66, tone: "info", step: 5,
        title: "Nothing in the tax-free bucket",
        body: "No Roth, HSA, or cash-value position is entered. It is the one bucket whose qualified withdrawals aren't repriced by future tax rates."
      });
    }

    if (m.match === 0) add({
      score: 80, tone: "action", step: 0,
      title: "No employer match entered",
      body: "If your employer offers one and it isn't recorded here, it's the highest-return money in the plan — and the projection above is understating you."
    });

    if (m.income > 0 && m.savingsRate < 12) add({
      score: 74, tone: "info", step: 0,
      title: "You're saving " + m.savingsRate.toFixed(1) + "% of income",
      body: money(m.monthly) + "/month against " + money(m.income) + " a year. Many planners use 15% as a working target — for you that's " +
            money(m.income * 0.15 / 12) + "/month."
    });

    if (m.protection.monthlyNeed > 0 && isFinite(m.protection.monthsCovered) && m.protection.monthsCovered < 6) add({
      score: 84, tone: "warn", step: 2,
      title: "Your emergency fund covers " + m.protection.monthsCovered.toFixed(1) + " months",
      body: money(m.protection.emergency) + " against " + money(m.protection.monthlyNeed) +
            " of monthly essentials. Six months would be " + money(m.protection.monthlyNeed * 6) + "."
    });

    if (m.protection.mortgage > 0 && m.legacy.insurance < m.protection.mortgage) add({
      score: 78, tone: "warn", step: 2,
      title: "The mortgage outruns your coverage",
      body: money(m.protection.mortgage) + " is still owed on the home against " +
            money(m.legacy.insurance) + " of life insurance recorded."
    });

    if (m.college.gap > 0) add({
      score: 70, tone: "warn", step: 1,
      title: money(m.college.gap) + " education gap",
      body: "Across " + m.college.kids + (m.college.kids === 1 ? " child" : " children") +
            ", projected college savings fall short of projected cost."
    });

    if (m.legacy.on && m.legacy.gap > 0) add({
      score: 68, tone: "warn", step: 3,
      title: money(m.legacy.gap) + " between intention and outcome",
      body: "Your family would receive " + money(m.legacy.today) + " today against the " +
            money(m.legacy.goal) + " you said you wanted to leave."
    });

    if (m.marketRisk > 0) add({
      score: 62, tone: "info", step: 5,
      title: "A 20% drop costs " + money(m.marketRisk),
      body: "That's the market-exposed share of your projection. A loss late in the runway is the one you have least time to recover from."
    });

    if (m.ss === 0) add({
      score: 60, tone: "info", step: 0,
      title: "No Social Security entered",
      body: "Adding your SSA estimate usually lowers what your savings have to produce, which lowers the goal itself."
    });

    if (m.goalIncome > 0 && m.years > 0) add({
      score: 58, tone: "info", step: 4,
      title: "Your " + money(m.goalIncome) + "/mo lifestyle costs " + money(m.futureGoalIncome) + "/mo at " + m.retireAge,
      body: "Same life, " + (m.inflation * 100).toFixed(1) + "% inflation, " + m.years +
            " years. Inflation is the quiet part of the number you're aiming at."
    });

    return out.sort(function (a, b) { return b.score - a.score; });
  }

  /* ---------- rendering ---------- */
  function goToStep(i) {
    const steps = root.querySelectorAll(".client-progress span");
    if (steps[i]) steps[i].click();
  }

  function card(item, withCta) {
    const el = document.createElement("article");
    el.className = "intel-item tone-" + item.tone;
    el.innerHTML =
      '<h4></h4><p></p>' +
      (withCta ? '<button type="button" class="intel-cta">Open this step<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg></button>' : '');
    el.querySelector("h4").textContent = item.title;
    el.querySelector("p").textContent = item.body;
    const cta = el.querySelector(".intel-cta");
    if (cta) cta.addEventListener("click", function () { goToStep(item.step); });
    return el;
  }

  function renderAll() {
    const m = model();
    const list = insights(m);

    const rail = $("intelRail");
    if (rail) {
      rail.innerHTML = "";
      list.slice(0, 3).forEach(function (item) {
        const li = document.createElement("li");
        li.className = "tone-" + item.tone;
        li.innerHTML = '<span class="intel-dot"></span><div><strong></strong></div>';
        li.querySelector("strong").textContent = item.title;
        li.addEventListener("click", function () { goToStep(item.step); });
        rail.appendChild(li);
      });
      const count = $("intelCount");
      if (count) count.textContent = list.length + (list.length === 1 ? " observation" : " observations");
    }

    const board = $("intelBoard");
    if (board) {
      board.innerHTML = "";
      list.slice(0, 6).forEach(function (item) { board.appendChild(card(item, true)); });
    }

    renderScenarioChips();
    drawChart(m);

    const actions = $("intelActions");
    if (actions) {
      actions.innerHTML = "";
      list.filter(function (i) { return i.tone === "action" || i.tone === "warn"; })
          .slice(0, 3).forEach(function (item) { actions.appendChild(card(item, true)); });
      if (!actions.children.length) actions.appendChild(card(list[0] || {
        tone: "good", title: "Nothing urgent stands out", body: "Fill in more of the assessment and this list will sharpen.", step: 0
      }, false));
    }
    return m;
  }


  /* ============================================================
     PROJECTION CHART
     ============================================================ */
  const SCENARIOS = [
    { id: "current", label: "Current plan" },
    { id: "p250", label: "+$250/mo", extra: 250 },
    { id: "p500", label: "+$500/mo", extra: 500 },
    { id: "later", label: "Retire 3 years later", addYears: 3 }
  ];
  let scenario = "current";

  function compact(v) {
    const n = Math.max(0, Number(v) || 0);
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
    return "$" + Math.round(n);
  }
  function svgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function drawChart(m) {
    const svg = $("planChart");
    const note = $("chartNote");
    if (!svg) return;
    svg.innerHTML = "";

    const opt = SCENARIOS.filter(function (s) { return s.id === scenario; })[0] || SCENARIOS[0];
    const extra = opt.extra || 0;
    const addYears = opt.addYears || 0;
    const span = m.years + addYears;

    if (span <= 0 || !m.goalNestEgg) {
      if (note) note.textContent = "Add your age, retirement age and accounts in step 1 to see the projection.";
      return;
    }

    const base = [], alt = [];
    for (let y = 0; y <= span; y++) {
      const core = m.projectAt(y);
      base.push(y <= m.years ? core : null);
      alt.push(core + (extra > 0 ? futureValue(0, extra, m.growth, y * 12) : 0));
    }
    const goal = addYears ? m.goalAt(span) : m.goalNestEgg;
    const endBase = m.projectAt(m.years);
    const endAlt = alt[span];
    // round the axis to a value a person would pick
    const raw = Math.max(goal, endAlt) * 1.1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw / 4)));
    const norm = (raw / 4) / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const top = step * 4;

    const W = 760, H = 330, L = 64, R = 128, T = 26, B = 42;
    const px = function (i) { return L + (i / span) * (W - L - R); };
    const py = function (v) { return H - B - (Math.max(0, v) / top) * (H - T - B); };

    // grid
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = (top / ticks) * i;
      const y = py(v);
      svg.appendChild(svgEl("line", { x1: L, y1: y, x2: W - R, y2: y, stroke: "#e7ebe9", "stroke-width": 1 }));
      const t = svgEl("text", { x: L - 10, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "#7b8781" });
      t.textContent = compact(v);
      svg.appendChild(t);
    }
    [0, Math.round(span / 2), span].forEach(function (i) {
      const t = svgEl("text", { x: px(i), y: H - 16, "text-anchor": i === 0 ? "start" : (i === span ? "end" : "middle"), "font-size": 11, fill: "#7b8781" });
      t.textContent = "age " + (m.age + i);
      svg.appendChild(t);
    });

    // goal line
    const gy = py(goal);
    svg.appendChild(svgEl("line", { x1: L, y1: gy, x2: W - R + 8, y2: gy, stroke: "#5f6d67", "stroke-width": 1.5, "stroke-dasharray": "6 5" }));
    const gl = svgEl("text", { x: W - R + 14, y: gy - 4, "font-size": 12, "font-weight": 700, fill: "#46554e" });
    gl.textContent = compact(goal);
    svg.appendChild(gl);
    const gl2 = svgEl("text", { x: W - R + 14, y: gy + 12, "font-size": 10.5, fill: "#7b8781" });
    gl2.textContent = "goal";
    svg.appendChild(gl2);

    // projected area
    const defs = svgEl("defs", {});
    defs.innerHTML = '<linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#167254" stop-opacity=".22"/>' +
      '<stop offset="1" stop-color="#167254" stop-opacity="0"/></linearGradient>';
    svg.appendChild(defs);

    let d = "";
    base.forEach(function (v, i) { if (v !== null) d += (i === 0 ? "M" : "L") + px(i) + " " + py(v); });
    svg.appendChild(svgEl("path", { d: d + "L" + px(m.years) + " " + py(0) + "L" + px(0) + " " + py(0) + "Z", fill: "url(#chartFill)", stroke: "none" }));
    svg.appendChild(svgEl("path", { d: d, fill: "none", stroke: "#0d4435", "stroke-width": 2.6, "stroke-linecap": "round" }));

    // scenario line
    if (extra > 0 || addYears > 0) {
      let ad = "";
      alt.forEach(function (v, i) { ad += (i === 0 ? "M" : "L") + px(i) + " " + py(v); });
      svg.appendChild(svgEl("path", { d: ad, fill: "none", stroke: "#1e9370", "stroke-width": 2.6, "stroke-dasharray": "7 5", "stroke-linecap": "round" }));
      svg.appendChild(svgEl("circle", { cx: px(span), cy: py(endAlt), r: 5, fill: "#fff", stroke: "#1e9370", "stroke-width": 2.6 }));
      const at = svgEl("text", { x: px(span) + 10, y: py(endAlt) + 4, "font-size": 12, "font-weight": 700, fill: "#146b4f" });
      at.textContent = compact(endAlt);
      svg.appendChild(at);
    }

    // gap bracket
    if (goal > endBase) {
      const x = px(m.years);
      svg.appendChild(svgEl("line", { x1: x, y1: py(endBase), x2: x, y2: gy, stroke: "#b3323f", "stroke-width": 8, "stroke-linecap": "round", opacity: ".18" }));
    }

    svg.appendChild(svgEl("circle", { cx: px(m.years), cy: py(endBase), r: 5, fill: "#fff", stroke: "#0d4435", "stroke-width": 2.6 }));
    const bt = svgEl("text", { x: px(m.years) + 10, y: py(endBase) + (goal > endBase ? 16 : -8), "font-size": 12, "font-weight": 700, fill: "#071a14" });
    bt.textContent = compact(endBase);
    svg.appendChild(bt);

    if (note) {
      if (extra > 0) {
        note.innerHTML = "Adding <strong>" + money(extra) + "/month</strong> projects <strong>" + money(endAlt) +
          "</strong> by " + m.retireAge + " — " + money(endAlt - endBase) + " more than your current plan, and " +
          (endAlt >= goal ? "enough to clear the goal." : money(goal - endAlt) + " short of the goal.");
      } else if (addYears > 0) {
        note.innerHTML = "Working to <strong>" + (m.retireAge + addYears) + "</strong> projects <strong>" + money(endAlt) +
          "</strong>, but inflation lifts the goal to " + money(goal) + " — leaving " +
          (endAlt >= goal ? "a surplus of " + money(endAlt - goal) : "a gap of " + money(goal - endAlt)) + ".";
      } else {
        note.innerHTML = "Your current plan projects <strong>" + money(endBase) + "</strong> at " + m.retireAge +
          " against a goal of " + money(goal) + ". " +
          (goal > endBase ? "The shaded bar is the " + money(goal - endBase) + " gap." : "You clear it.");
      }
    }
  }

  function renderScenarioChips() {
    const row = $("chartChips");
    if (!row || row.children.length) return;
    SCENARIOS.forEach(function (s) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chart-chip" + (s.id === scenario ? " active" : "");
      b.textContent = s.label;
      b.addEventListener("click", function () {
        scenario = s.id;
        Array.prototype.forEach.call(row.children, function (c) { c.classList.remove("active"); });
        b.classList.add("active");
        drawChart(model());
      });
      row.appendChild(b);
    });
  }

  /* ============================================================
     ASK — answers built from the same numbers
     ============================================================ */
  const INTENTS = [
    {
      keys: ["on track", "gap", "short", "behind", "enough", "how am i", "how do i look"],
      chip: "Am I on track?",
      answer: function (m) {
        if (!m.goalNestEgg) return { text: "Add a savings goal in step 1 and I can measure the gap." };
        if (m.gap <= 0) return {
          figure: money(m.projected), label: "projected at " + m.retireAge,
          text: "You're projected to reach " + money(m.projected) + " against a " + money(m.goalNestEgg) +
                " goal. You're ahead — the question shifts to protecting it from taxes, markets, and interruptions.",
          step: 5
        };
        return {
          figure: money(m.gap), label: "projected shortfall",
          text: "You're projected to reach " + money(m.projected) + " by " + m.retireAge + ", against " +
                money(m.goalNestEgg) + " needed. About " + money(Math.ceil(m.extraMonthly)) +
                "/month more would close it at your " + (m.growth * 100).toFixed(1) + "% blended assumption.",
          step: 6
        };
      }
    },
    {
      keys: ["save more", "how much should i save", "extra", "monthly", "contribute", "close the gap"],
      chip: "How much more should I save?",
      answer: function (m) {
        if (m.gap <= 0) return { text: "Nothing more is required to hit the goal you entered. Anything extra buys cushion, an earlier finish, or a bigger legacy." };
        const need = Math.ceil(m.extraMonthly);
        return {
          figure: money(need) + "/mo", label: "on top of " + money(m.monthly) + "/mo",
          text: "That brings you to " + money(m.monthly + need) + "/month. Half of it (" + money(Math.ceil(need / 2)) +
                "/month) would still cover about " + money(m.gap / 2) + " of the shortfall — partial moves aren't wasted.",
          step: 4
        };
      }
    },
    {
      keys: ["retire early", "earlier", "retire at", "sooner", "later", "work longer", "62", "67", "70"],
      chip: "What if I retired 3 years later?",
      answer: function (m) {
        const y = m.years + 3;
        const proj = m.projectAt(y);
        const goal = m.goalAt(y);
        const gap = Math.max(0, goal - proj);
        return {
          figure: money(proj), label: "projected at " + (m.retireAge + 3),
          text: "Three more years projects " + money(proj) + " (" + money(proj - m.projected) +
                " more), but the goal also rises with inflation to about " + money(goal) + ". Net effect: a gap of " +
                money(gap) + " instead of " + money(m.gap) + ".",
          step: 4
        };
      }
    },
    {
      keys: ["tax", "taxes", "roth", "bucket", "taxed"],
      chip: "Where do taxes hit me?",
      answer: function (m) {
        if (!m.buckets.total) return { text: "Add accounts in step 1 and I'll show how your money splits across the three tax treatments." };
        const share = (m.buckets.later / m.buckets.total) * 100;
        return {
          figure: pct(share), label: "taxed on withdrawal",
          text: money(m.buckets.later) + " is in Tax Later, " + money(m.buckets.now) + " in Tax Now, and " +
                money(m.buckets.never) + " in Tax-Free Later. The concentration matters more than the total: whatever rates do, they reprice that first number.",
          step: 5
        };
      }
    },
    {
      keys: ["risk", "biggest", "worry", "danger", "what should i do", "priority", "next"],
      chip: "What's my biggest risk?",
      answer: function (m) {
        const list = insights(m).filter(function (i) { return i.tone === "warn" || i.tone === "action"; });
        if (!list.length) return { text: "Nothing is flagged right now. Complete more of the assessment and I'll keep watching." };
        return { figure: null, text: list[0].title + ". " + list[0].body, step: list[0].step };
      }
    },
    {
      keys: ["market", "crash", "drop", "downturn", "recession", "lose"],
      chip: "What would a market drop cost me?",
      answer: function (m) {
        return {
          figure: money(m.marketRisk), label: "on a 20% decline",
          text: "That's the market-exposed share of your projection. Recovering a 20% loss needs a 25% gain, and a 30% loss needs 43% — the asymmetry is why timing near retirement matters.",
          step: 5
        };
      }
    },
    {
      keys: ["paycheck", "disability", "sick", "income stops", "emergency", "illness"],
      chip: "What if my paycheck stopped?",
      answer: function (m) {
        const p = m.protection;
        if (!p.monthlyNeed) return { text: "Enter your monthly essentials in step 3 and I'll work out how long the household could hold." };
        const months = isFinite(p.monthsCovered) ? p.monthsCovered.toFixed(1) : "∞";
        return {
          figure: months + " months", label: "covered by savings alone",
          text: money(p.emergency) + " of emergency savings against " + money(p.monthlyNeed) +
                " of monthly essentials. A full year would take " + money(p.monthlyNeed * 12) + ".",
          step: 2
        };
      }
    },
    {
      keys: ["social security", "ssa", "benefit"],
      chip: "How does Social Security fit in?",
      answer: function (m) {
        if (!m.ss) return { text: "No benefit is entered yet. Adding your SSA estimate lowers what your savings must produce — which lowers the goal itself." };
        return {
          figure: money(m.ss) + "/mo", label: "expected benefit",
          text: "Against a " + money(m.futureGoalIncome) + "/month lifestyle at " + m.retireAge +
                ", Social Security covers about " + pct((m.ss / m.futureGoalIncome) * 100) +
                " of it. Your savings carry the rest.",
          step: 4
        };
      }
    },
    {
      keys: ["inflation", "cost", "future cost", "worth"],
      chip: "What does inflation do to my goal?",
      answer: function (m) {
        return {
          figure: money(m.futureGoalIncome) + "/mo", label: "same lifestyle at " + m.retireAge,
          text: "You asked for " + money(m.goalIncome) + "/month in today's money. At " +
                (m.inflation * 100).toFixed(1) + "% over " + m.years + " years, the same life costs that much.",
          step: 4
        };
      }
    },
    {
      keys: ["college", "kids", "children", "school", "tuition"],
      chip: "Where does college stand?",
      answer: function (m) {
        if (!m.college.kids) return { text: "No children are entered in step 2, so college isn't part of your picture." };
        return {
          figure: money(m.college.gap), label: "education gap",
          text: "Across " + m.college.kids + (m.college.kids === 1 ? " child" : " children") +
                ", that's the distance between projected cost and projected savings.",
          step: 1
        };
      }
    },
    {
      keys: ["legacy", "family", "die", "death", "insurance", "leave"],
      chip: "What would my family receive?",
      answer: function (m) {
        if (!m.legacy.on) return { text: "Legacy is skipped in step 4. Turn it on there and I'll compare what your family would receive against what you intend to leave." };
        return {
          figure: money(m.legacy.today), label: "what your family receives today",
          text: "Against the " + money(m.legacy.goal) + " you'd like to leave — a difference of " +
                money(m.legacy.gap) + ".",
          step: 3
        };
      }
    }
  ];

  function respond(question) {
    const q = " " + question.toLowerCase().replace(/[^a-z0-9$% ]/g, " ").replace(/\s+/g, " ") + " ";
    let best = null, bestScore = 0;
    INTENTS.forEach(function (intent) {
      let score = 0;
      intent.keys.forEach(function (k) {
        if (q.indexOf(k) > -1) { score += k.length * 2; return; }
        const words = k.split(" ");
        // the words of a phrase, in any order, still point at the same question
        if (words.length > 1 && words.every(function (w) { return q.indexOf(" " + w) > -1; })) {
          score += k.length;
          return;
        }
        words.forEach(function (w) {
          if (w.length > 3 && q.indexOf(" " + w) > -1) score += 4;
        });
      });
      if (score > bestScore) { bestScore = score; best = intent; }
    });
    if (bestScore < 6) best = null;
    const m = model();
    if (!best) {
      return {
        text: "I can only answer from the numbers in this assessment — I can't look anything up. Try one of these:",
        chips: true
      };
    }
    return best.answer(m);
  }

  /* ---------- ask UI ---------- */
  const fab = $("askFab"), panel = $("askPanel"), log = $("askLog"),
        form = $("askForm"), input = $("askInput"), chipRow = $("askChips"), close = $("askClose");

  function bubble(who, content) {
    const el = document.createElement("div");
    el.className = "ask-msg " + who;
    if (typeof content === "string") {
      el.textContent = content;
    } else {
      if (content.figure) {
        const fig = document.createElement("div");
        fig.className = "ask-figure";
        fig.innerHTML = '<strong></strong><small></small>';
        fig.querySelector("strong").textContent = content.figure;
        fig.querySelector("small").textContent = content.label || "";
        el.appendChild(fig);
      }
      const p = document.createElement("p");
      p.textContent = content.text;
      el.appendChild(p);
      if (typeof content.step === "number") {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ask-jump";
        b.textContent = "Take me there";
        b.addEventListener("click", function () { goToStep(content.step); setPanel(false); });
        el.appendChild(b);
      }
    }
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function ask(question) {
    bubble("me", question);
    const thinking = bubble("bot", "…");
    setTimeout(function () {
      const reply = respond(question);
      thinking.remove();
      bubble("bot", reply);
      if (reply.chips) renderChips();
    }, 260);
  }

  function renderChips() {
    if (!chipRow) return;
    chipRow.innerHTML = "";
    INTENTS.slice(0, 6).forEach(function (intent) {
      if (!intent.chip) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ask-chip";
      b.textContent = intent.chip;
      b.addEventListener("click", function () { ask(intent.chip); });
      chipRow.appendChild(b);
    });
  }

  function setPanel(open) {
    if (!panel) return;
    panel.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (fab) fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      if (!log.children.length) {
        const m = model();
        bubble("bot", {
          text: (m.name ? m.name + ", ask" : "Ask") + " me anything about the plan you're building. I read the numbers on this page — nothing is sent anywhere."
        });
        renderChips();
      }
      setTimeout(function () { input && input.focus(); }, 120);
    }
  }

  if (fab) fab.addEventListener("click", function () { setPanel(!panel.classList.contains("open")); });
  if (close) close.addEventListener("click", function () { setPanel(false); });
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    ask(q);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel && panel.classList.contains("open")) setPanel(false);
  });
  const railAsk = $("intelAsk");
  if (railAsk) railAsk.addEventListener("click", function () { setPanel(true); });

  /* ---------- keep it current ---------- */
  let frame;
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(renderAll);
  }
  root.addEventListener("input", schedule);
  root.addEventListener("change", schedule);
  root.addEventListener("click", function () { setTimeout(schedule, 60); });
  setTimeout(renderAll, 60);
})();
