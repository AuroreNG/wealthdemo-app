/* ============================================================
   WEALTHDEMO — Family College Funding

   A faithful rebuild of the existing calculator: same fields,
   same wording, same figures. Their model, confirmed against
   the original to the dollar:

     cost    = cost today x (1 + inflation)^(years until start)
               x years of college
               (grown to the start year, then held for the degree)
     savings = saved x (1+r)^n + monthly x ((1+r)^n - 1) / r
               with r monthly and n months until they start

   Their case — a 10-year-old starting at 18, nothing saved,
   $300 a month, on $30,000 / 4 years / 5% / 6%:

     college cost      $177,295
     projected savings  $36,849
     gap               $140,446
     two of them       $354,589 / $73,697 / $280,892

   The totals are summed before rounding, which is why two
   children come to $354,589 and not $354,590.

   Added on top: the monthly figure that would actually close
   each gap, which is the same formula rearranged.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("kidRows")) return;

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

  const STORE = "wealthdemo.tool.college";
  const ASSUMP = ["aCost", "aYears", "aInfl", "aGrow"];
  const DEF_A = { aCost: 30000, aYears: 4, aInfl: 5, aGrow: 6 };
  const DEF_KIDS = [
    { name: "Child 1", age: 10, start: 18, saved: 0, monthly: 300 },
    { name: "Child 2", age: 10, start: 18, saved: 0, monthly: 300 }
  ];
  let KIDS = DEF_KIDS.map(function (k) { return Object.assign({}, k); });

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }
  function assumptions() {
    return {
      cost: Math.max(0, num("aCost", 30000)),
      years: Math.max(1, Math.min(10, num("aYears", 4))),
      infl: num("aInfl", 5),
      grow: num("aGrow", 6)
    };
  }

  /* ---------- their three numbers, per child ---------- */
  function figure(kid, a) {
    const startIn = Math.max(0, kid.start - kid.age);
    const n = Math.round(startIn * 12), r = a.grow / 100 / 12;
    const cost = a.cost * Math.pow(1 + a.infl / 100, startIn) * a.years;
    const grown = r === 0 ? kid.saved : kid.saved * Math.pow(1 + r, n);
    const fromMonthly = r === 0 ? kid.monthly * n
      : kid.monthly * (Math.pow(1 + r, n) - 1) / r;
    const savings = grown + fromMonthly;
    const gap = cost - savings;

    /* the same formula turned round: what monthly would close it */
    let need = 0;
    if (gap > 0.5) {
      need = r === 0
        ? (n > 0 ? (cost - grown) / n : Infinity)
        : (cost - grown) * r / (Math.pow(1 + r, n) - 1);
      if (!isFinite(need) || need < 0) need = 0;
    }
    return { startIn: startIn, cost: cost, savings: savings,
             gap: Math.max(0, gap), over: Math.max(0, -gap), need: need };
  }

  /* ---------- only write a list when it actually changed ---------- */
  const LAST = {};
  function redraw(el, html) {
    if (LAST[el.id] === html) return false;
    LAST[el.id] = html;
    el.innerHTML = html;
    return true;
  }

  /* ============================================================
     the rows
     ============================================================ */
  function drawRows() {
    const html = KIDS.map(function (k, i) {
      return '<div class="cl-kid">' +
        '<div class="cl-kid-head">' +
          '<b>' + esc(k.name || ("Child " + (i + 1))) + '</b>' +
          '<span class="cl-when">' + whenText(k) + '</span>' +
          (KIDS.length > 1
            ? '<button type="button" class="cl-drop" data-i="' + i + '">Remove</button>' : '') +
        '</div>' +
        '<div class="cl-kid-grid">' +
          '<div class="field"><label>Child Name</label>' +
            '<input class="cl-in cl-text" type="text" data-i="' + i + '" data-k="name" value="' +
              String(k.name).replace(/"/g, "&quot;") + '"></div>' +
          '<div class="field"><label>Current Age</label>' +
            '<div class="pct-in"><input type="number" min="0" max="25" step="1" inputmode="numeric" ' +
              'data-i="' + i + '" data-k="age" value="' + k.age + '"><i>yrs</i></div></div>' +
          '<div class="field"><label>College Start Age</label>' +
            '<div class="pct-in"><input type="number" min="0" max="40" step="1" inputmode="numeric" ' +
              'data-i="' + i + '" data-k="start" value="' + k.start + '"><i>yrs</i></div></div>' +
          '<div class="field"><label>Current Savings ($)</label>' +
            '<div class="money-in"><i>$</i><input type="number" min="0" step="500" inputmode="numeric" ' +
              'data-i="' + i + '" data-k="saved" value="' + k.saved + '"></div></div>' +
          '<div class="field"><label>Monthly Savings ($)</label>' +
            '<div class="money-in"><i>$</i><input type="number" min="0" step="25" inputmode="numeric" ' +
              'data-i="' + i + '" data-k="monthly" value="' + k.monthly + '"></div></div>' +
        '</div></div>';
    }).join("");

    if (!redraw($("kidRows"), html)) return;
    $("kidRows").querySelectorAll("[data-k]").forEach(function (el) {
      const i = +el.getAttribute("data-i"), k = el.getAttribute("data-k");
      const on = function () {
        KIDS[i][k] = k === "name" ? el.value : (parseFloat(el.value) || 0);
        /* the header follows the boxes without a full repaint, so the caret stays put */
        const head = el.closest(".cl-kid").querySelector(".cl-kid-head");
        if (k === "name") head.querySelector("b").textContent = KIDS[i].name || ("Child " + (i + 1));
        if (k === "age" || k === "start") head.querySelector(".cl-when").textContent = whenText(KIDS[i]);
        /* the user is typing straight into the DOM, so the cached markup no
           longer describes what is on screen. Drop it, or a later redraw that
           happens to produce the same string (Reset, say) would skip the write
           and leave their old typing in the boxes. */
        delete LAST.kidRows;
        run(true);
      };
      el.addEventListener("input", on);
      el.addEventListener("change", on);
    });
    $("kidRows").querySelectorAll(".cl-drop").forEach(function (b) {
      b.addEventListener("click", function () {
        if (KIDS.length < 2) return;
        KIDS.splice(+b.getAttribute("data-i"), 1);
        run();
      });
    });
  }

  function whenText(k) {
    const n = Math.max(0, (parseFloat(k.start) || 0) - (parseFloat(k.age) || 0));
    if (n <= 0) return "starting now";
    return "starts in " + n + (n === 1 ? " year" : " years");
  }

  /* ============================================================
     the picture: which calendar year each bill actually lands in
     ------------------------------------------------------------
     Their model holds the price flat across a child's degree, so a
     child's yearly bill is the same four times. Stacking those by
     calendar year is what shows the overlap — two children at
     college together is one year with twice the bill, and that is
     the number that catches families out.
     ============================================================ */
  function timeline(rows, a) {
    const years = {};
    rows.forEach(function (r, i) {
      const per = r.f.cost / a.years;
      for (let y = 0; y < a.years; y++) {
        const at = r.f.startIn + y;
        (years[at] = years[at] || []).push({ i: i, name: r.name, amt: per });
      }
    });
    const keys = Object.keys(years).map(Number).sort(function (x, y) { return x - y; });
    if (!keys.length) return { keys: [], years: years, peak: 0, peakYear: 0, overlap: 0, total: 0 };
    let peak = 0, peakYear = keys[0], overlap = 0, total = 0;
    keys.forEach(function (k) {
      const sum = years[k].reduce(function (s, x) { return s + x.amt; }, 0);
      total += sum;
      if (years[k].length > 1) overlap++;
      if (sum > peak) { peak = sum; peakYear = k; }
    });
    return { keys: keys, years: years, peak: peak, peakYear: peakYear,
             overlap: overlap, total: total };
  }

  const THISYEAR = new Date().getFullYear();

  function cols(tl) {
    if (!tl.keys.length) return "";
    const first = tl.keys[0], last = tl.keys[tl.keys.length - 1];
    const out = [];
    for (let k = first; k <= last; k++) {
      const here = tl.years[k] || [];
      const sum = here.reduce(function (s, x) { return s + x.amt; }, 0);
      const h = tl.peak > 0 ? sum / tl.peak * 100 : 0;
      out.push('<div class="cl-col' + (k === tl.peakYear ? " is-peak" : "") +
        (here.length > 1 ? " is-both" : "") + '" title="' +
        (THISYEAR + k) + " \u2014 " + usd(sum) + '">' +
        '<b>' + (sum > 0 ? usd0(sum) : "") + '</b>' +
        '<div class="cl-colbar" style="height:' + h.toFixed(1) + '%">' +
          here.map(function (x) {
            return '<u data-n="' + (x.i % 5) + '" style="height:' +
              (sum > 0 ? x.amt / sum * 100 : 0).toFixed(1) + '%"></u>';
          }).join("") +
        '</div>' +
        '<span>' + (THISYEAR + k) + '</span></div>');
    }
    return out.join("");
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ============================================================
     render
     ============================================================ */
  function run(skipRows) {
    const a = assumptions();
    if (!skipRows) drawRows();

    const rows = KIDS.map(function (k, i) {
      return { name: k.name || ("Child " + (i + 1)), f: figure(k, a) };
    });
    const tot = rows.reduce(function (s, r) {
      s.cost += r.f.cost; s.savings += r.f.savings; s.gap += r.f.gap; s.need += r.f.need;
      return s;
    }, { cost: 0, savings: 0, gap: 0, need: 0 });

    /* ---- their assumptions line, live ---- */
    $("assumpLine").innerHTML = "Planning assumptions: <b>" + usd(a.cost) +
      "</b> average annual college cost today &middot; <b>" + a.years +
      "</b> years of college &middot; <b>" + a.infl +
      "%</b> college-cost inflation &middot; <b>" + a.grow + "%</b> assumed savings growth.";

    /* ---- banner ---- */
    const kidWord = KIDS.length === 1 ? "one child" : KIDS.length + " children";
    if (a.cost <= 0) {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "A cost";
      $("bnSub").textContent = "what a year of college costs today";
    } else if (tot.gap <= 0.5) {
      $("bnLabel").textContent = "NO SHORTFALL";
      $("bnBig").textContent = "Covered";
      $("bnSub").textContent = "across " + kidWord + " — " + usd(tot.cost) +
        " of cost against " + usd(tot.savings) + " projected";
    } else {
      $("bnLabel").textContent = "ESTIMATED FAMILY SHORTFALL";
      $("bnBig").textContent = usd(tot.gap);
      $("bnSub").textContent = "across " + kidWord + " — " + usd(tot.cost) +
        " of cost against " + usd(tot.savings) + " projected";
    }

    /* ---- the table, exactly their four columns plus the one that helps ---- */
    redraw($("estRows"), rows.map(function (r) {
      return '<div class="cl-est' + (r.f.gap > 0.5 ? "" : " is-ok") + '">' +
        '<span class="cl-est-nm">' + esc(r.name) + '</span>' +
        '<span data-c="cost"><em>College cost</em><b>' + usd(r.f.cost) + '</b></span>' +
        '<span data-c="sav"><em>Projected savings</em><b>' + usd(r.f.savings) + '</b></span>' +
        '<span data-c="gap"><em>Gap</em><b>' + (r.f.gap > 0.5 ? usd(r.f.gap) : "None") + '</b></span>' +
        '<span data-c="need"><em>Monthly to close it</em><b>' +
          (r.f.need > 0.5 ? usd(r.f.need) : "—") + '</b></span>' +
      '</div>';
    }).join(""));

    $("totCost").textContent = usd(tot.cost);
    $("totSav").textContent = usd(tot.savings);
    $("totGap").textContent = usd(tot.gap);
    $("totNeed").textContent = tot.need > 0.5 ? usd(tot.need) + " a month" : "Nothing more needed";

    const nowMonthly = KIDS.reduce(function (s, k) { return s + (k.monthly || 0); }, 0);
    $("totNeedNote").textContent = tot.need > 0.5 && nowMonthly > 0
      ? usd(Math.max(0, tot.need - nowMonthly)) + " more than the " + usd(nowMonthly) + " going in now"
      : (tot.need > 0.5 ? "starting from today" : "the plan already covers it");

    /* ---- the picture ---- */
    const tl = timeline(rows, a);
    redraw($("yearCols"), cols(tl));
    redraw($("chartKey"), rows.map(function (r, i) {
      return '<span><i data-n="' + (i % 5) + '"></i>' + esc(r.name) + '</span>';
    }).join(""));

    const soonest = rows.slice().sort(function (x, y) { return x.f.startIn - y.f.startIn; })[0];
    $("chartLead").textContent = !soonest || !tl.keys.length
      ? "Add a child to see when the bills land."
      : "One bar a year, from " + (THISYEAR + tl.keys[0]) + " to " +
        (THISYEAR + tl.keys[tl.keys.length - 1]) + ". " + esc(soonest.name) + " is up first, in " +
        soonest.f.startIn + (soonest.f.startIn === 1 ? " year" : " years") + ".";

    if (!tl.keys.length) {
      $("peakNote").textContent = "\u2014";
    } else if (tl.overlap > 0) {
      $("peakNote").innerHTML = "<b>" + (THISYEAR + tl.peakYear) + " is the year to watch.</b> " +
        tl.overlap + (tl.overlap === 1 ? " year has" : " years have") +
        " more than one child at college at once, and the worst of them asks for <b>" +
        usd(tl.peak) + "</b> in a single year \u2014 " +
        (tot.cost > 0 ? Math.round(tl.peak / tot.cost * 100) + "% of the whole bill" : "") +
        " landing at the same time.";
      $("peakNote").setAttribute("data-tone", "warn");
    } else {
      $("peakNote").innerHTML = "The years do not overlap, so the heaviest single year is <b>" +
        usd(tl.peak) + "</b> in " + (THISYEAR + tl.peakYear) +
        ". Spreading them out like this is worth real money in any one year.";
      $("peakNote").setAttribute("data-tone", "ok");
    }

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = { kids: KIDS };
    ASSUMP.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    if (Array.isArray(s.kids) && s.kids.length) KIDS = s.kids;
    ASSUMP.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
  }

  ASSUMP.forEach(function (f) {
    $(f).addEventListener("input", function () { run(true); });
    $(f).addEventListener("change", function () { run(true); });
  });

  $("addKid").addEventListener("click", function () {
    const last = KIDS[KIDS.length - 1] || DEF_KIDS[0];
    KIDS.push({ name: "Child " + (KIDS.length + 1), age: last.age, start: last.start,
                saved: 0, monthly: last.monthly });
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
    KIDS = DEF_KIDS.map(function (k) { return Object.assign({}, k); });
    ASSUMP.forEach(function (f) { $(f).value = DEF_A[f]; });
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  }
  if ($("resetBtn")) $("resetBtn").addEventListener("click", resetAll);
  if ($("resetBtn2")) $("resetBtn2").addEventListener("click", resetAll);

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const a = assumptions();
    const rows = KIDS.map(function (k, i) {
      return { name: k.name || ("Child " + (i + 1)), k: k, f: figure(k, a) };
    });
    const tot = rows.reduce(function (s, r) {
      s.cost += r.f.cost; s.savings += r.f.savings; s.gap += r.f.gap; s.need += r.f.need; return s;
    }, { cost: 0, savings: 0, gap: 0, need: 0 });
    const btn = $("sendBtn"), old = btn.innerHTML;

    const lines = ["Family College Funding — WEALTHDEMO", "",
      "PLANNING ASSUMPTIONS",
      "  Average annual cost today   " + usd(a.cost),
      "  Years of college            " + a.years,
      "  College-cost inflation      " + a.infl + "%",
      "  Assumed savings growth      " + a.grow + "%", ""];
    rows.forEach(function (r) {
      lines.push(r.name.toUpperCase(),
        "  Age " + r.k.age + ", starts at " + r.k.start + "   (in " + r.f.startIn + " years)",
        "  Saved now / monthly         " + usd(r.k.saved) + " / " + usd(r.k.monthly),
        "  College cost                " + usd(r.f.cost),
        "  Projected savings           " + usd(r.f.savings),
        "  Gap                         " + (r.f.gap > 0.5 ? usd(r.f.gap) : "none"),
        r.f.need > 0.5 ? "  Monthly to close it         " + usd(r.f.need) : "", "");
    });
    lines.push("YOUR FAMILY COLLEGE ESTIMATE",
      "  Total college cost          " + usd(tot.cost),
      "  Total projected savings     " + usd(tot.savings),
      "  Estimated family shortfall  " + usd(tot.gap),
      tot.need > 0.5 ? "  Monthly to close it all     " + usd(tot.need) : "", "",
      "Educational estimate only. Actual college costs and investment results vary. " +
      "This calculator does not provide financial, investment, or tax advice.");

    const text = lines.filter(function (l) { return l !== ""; }).join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  load();
  run();
})();
