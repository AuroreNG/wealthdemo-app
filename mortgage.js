/* ============================================================
   WEALTHDEMO — Mortgage Payoff Strategy

   The usual version of this illustration compares two paths:
   the mortgage on its own, and the mortgage with a policy loan
   thrown at it. The second one wins by a spectacular margin.

   It has to. The second path also puts a monthly loan repayment
   into the problem that the first path never sees — on the
   default figures, fifty-seven thousand dollars of it. A
   strategy that adds money to a debt will always beat one that
   doesn't, and almost none of that gap belongs to the policy.

   So this runs a third path: send that same repayment straight
   at the mortgage and borrow nothing. Whatever is left between
   that and the policy-loan path is what the loan is actually
   worth. It is a much smaller number, and it is the honest one.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("mBal")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };
  const usd0 = function (n) {
    const a = Math.abs(n), s = n < 0 ? "−$" : "$";
    if (a >= 1000000) return s + (a / 1000000).toFixed(a >= 10000000 ? 0 : 1) + "M";
    if (a >= 1000) return s + Math.round(a / 1000) + "k";
    return s + Math.round(a);
  };
  const span = function (m) {
    if (m === 0) return "Now";
    if (!isFinite(m) || m < 0) return "—";
    const y = Math.floor(m / 12), r = m % 12;
    if (y === 0) return r + (r === 1 ? " mo" : " mos");
    return y + " yr" + (y === 1 ? "" : "s") + (r ? " " + r + " mo" : "");
  };
  const spanTxt = function (m) {
    if (!isFinite(m) || m <= 0) return "no time";
    const y = Math.floor(m / 12), r = m % 12;
    const ys = y ? y + (y === 1 ? " year" : " years") : "";
    const rs = r ? r + (r === 1 ? " month" : " months") : "";
    return ys && rs ? ys + " and " + rs : (ys || rs);
  };
  const MONTHS = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const dateIn = function (m) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + Math.round(m));
    return MONTHS[d.getMonth()] + " " + d.getFullYear();
  };

  const FIELDS = ["mBal", "mRate", "mTerm", "mPmt", "mExtra",
                  "pCash", "pLoan", "pRate", "pRepay", "pGrow"];
  const STORE = "wealthdemo.tool.mortgage";
  const DEFAULTS = { mBal: 300000, mRate: 6.5, mTerm: 25, mPmt: 2026.21, mExtra: 0,
                     pCash: 100000, pLoan: 50000, pRate: 5.5, pRepay: 1000, pGrow: 0 };
  const CAP = 600;            /* months — 50 years is long enough for anything */

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    return {
      bal: Math.max(0, num("mBal", 300000)),
      rate: Math.max(0, num("mRate", 6.5)) / 100,
      term: Math.max(1, num("mTerm", 25)),
      pmt: Math.max(0, num("mPmt", 2026.21)),
      extra: Math.max(0, num("mExtra", 0)),
      cash: Math.max(0, num("pCash", 100000)),
      loan: Math.max(0, num("pLoan", 50000)),
      lrate: Math.max(0, num("pRate", 5.5)) / 100,
      repay: Math.max(0, num("pRepay", 1000)),
      grow: Math.max(0, num("pGrow", 0)) / 100
    };
  }

  /* ---------- run a balance down, month by month ---------- */
  function amortise(bal, pmt, r, extraFn) {
    const track = [bal];
    let interest = 0, paid = 0, m = 0;
    while (bal > 0.005 && m < CAP) {
      const i = bal * r;
      const e = extraFn ? extraFn(m) : 0;
      const due = pmt + e;
      if (due <= 0 || (due <= i && r > 0)) { m = Infinity; break; }   /* never pays off */
      const pay = Math.min(due, bal + i);
      interest += i; paid += pay;
      bal = bal + i - pay;
      m++;
      track.push(Math.max(0, bal));
    }
    return { months: m, interest: interest, paid: paid, track: track };
  }

  function work(p) {
    const r = p.rate / 12, lr = p.lrate / 12;
    const scheduled = p.bal > 0 && r > 0
      ? p.bal * r / (1 - Math.pow(1 + r, -Math.round(p.term * 12)))
      : (p.bal > 0 ? p.bal / Math.round(p.term * 12) : 0);

    /* 1 — the mortgage as it stands */
    const trad = amortise(p.bal, p.pmt, r, function () { return p.extra; });

    /* 2 — the policy loan, applied to principal on day one */
    const applied = Math.min(p.loan, p.bal);
    const strat = amortise(p.bal - applied, p.pmt, r, function () { return p.extra; });
    /* and the loan itself, repaid on its own schedule */
    const pol = amortise(applied, p.repay, lr, null);

    /* 3 — the fair control: the same repayment, straight at the mortgage */
    const ctrl = amortise(p.bal, p.pmt, r, function (m) {
      return p.extra + (m < pol.months ? p.repay : 0);
    });

    /* a repayment that cannot cover the interest means the loan grows, not shrinks */
    const firstInterest = applied * lr;
    const loanGrows = applied > 0 && (p.repay <= 0 || p.repay < firstInterest - 1e-9);
    let breachMonths = null;
    if (loanGrows && p.cash > applied) {
      let b = applied, m = 0;
      while (b < p.cash && m < CAP) { b = b * (1 + lr) - p.repay; m++; }
      breachMonths = m < CAP ? m : null;
    } else if (loanGrows) {
      breachMonths = 0;
    }
    /* amortise stops dead on a loan that never clears, so draw the rise by hand */
    if (loanGrows) {
      const horizon = Math.min(CAP, isFinite(trad.months) ? trad.months : 360);
      const t = [applied];
      let b = applied;
      for (let m = 0; m < horizon; m++) { b = b * (1 + lr) - p.repay; t.push(b); }
      pol.track = t;
      pol.ends = b;
      /* amortise bailed out at month zero, so book the interest that really accrues */
      pol.interest = (b - applied) + p.repay * horizon;
      pol.paid = p.repay * horizon;
    }

    /* what the borrowed cash value stops earning while it is out */
    const foregone = (p.grow > 0 && applied > 0 && isFinite(pol.months))
      ? applied * (Math.pow(1 + p.grow, pol.months / 12) - 1) : 0;

    const headline = trad.interest - strat.interest;          /* what the old version shows */
    const stratCost = strat.interest + pol.interest + foregone;
    const real = ctrl.interest - stratCost;                   /* what the loan actually adds */

    /* one flaw is enough to make every figure below it meaningless, so the
       page names it instead of quietly reporting a win that isn't there */
    const flaw = p.bal <= 0 ? "nobal"
      : (!isFinite(trad.months) ? "nopay"
      : (applied <= 0 ? "noloan"
      : (loanGrows ? "grows" : null)));

    return {
      scheduled: scheduled, applied: applied, flaw: flaw,
      trad: trad, strat: strat, pol: pol, ctrl: ctrl,
      loanGrows: loanGrows, breachMonths: breachMonths, firstInterest: firstInterest,
      wipesOut: applied >= p.bal - 0.5 && p.bal > 0,
      foregone: foregone,
      headline: headline, stratCost: stratCost, real: real,
      saved: isFinite(trad.months) && isFinite(strat.months) ? trad.months - strat.months : 0,
      savedVsCtrl: isFinite(ctrl.months) && isFinite(strat.months) ? ctrl.months - strat.months : 0,
      loanPct: p.cash > 0 ? applied / p.cash : (applied > 0 ? 1 : 0),
      /* the control path pays the repayment on for as long as the strategy
         would — which, if the loan never clears, is until the house is */
      extraMoney: p.repay * (isFinite(pol.months) ? pol.months
        : (isFinite(ctrl.months) ? ctrl.months : 0))
    };
  }

  /* ============================================================
     what's left to owe
     ============================================================ */
  function geom() {
    const w = window.innerWidth;
    if (w < 700)  return { CW: 480,  PL: 50, PR: 16, AH: 156, BH: 70, GAP: 44, PT: 22, AXH: 42, FS: 9 };
    if (w < 1100) return { CW: 880,  PL: 62, PR: 22, AH: 210, BH: 86, GAP: 48, PT: 22, AXH: 46, FS: 10 };
    return         { CW: 1120, PL: 68, PR: 26, AH: 240, BH: 96, GAP: 50, PT: 22, AXH: 48, FS: 10.5 };
  }

  const esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
  const clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  /* one SVG, two panels, one shared timeline.
     Top panel is the mortgage. Bottom panel is the policy loan, on its own
     scale — a $50k loan drawn against a $300k mortgage is an unreadable
     sliver, which is what made the old single-axis version confusing. */
  function chart(p, w, walk) {
    const g = geom(), CW = g.CW;
    const showB = w.applied > 0;
    const plotW = CW - g.PL - g.PR;

    const aTop = g.PT + 16, aBot = aTop + g.AH;              /* +16 leaves room for the panel label */
    const bTop = aBot + g.GAP, bBot = bTop + g.BH;
    const axisY = showB ? bBot : aBot;
    const CH = axisY + g.AXH;

    const N = Math.max(12, Math.min(CAP, isFinite(w.trad.months) ? w.trad.months : Math.round(p.term * 12)));
    const X = function (m) { return g.PL + Math.min(m, N) / N * plotW; };

    const aMax = Math.max(p.bal, 1);
    const YA = function (v) { return aBot - (clamp(v, 0, aMax) / aMax) * g.AH; };

    let bMax = Math.max(w.applied, 1);
    if (w.loanGrows) {
      for (let i = 0; i < w.pol.track.length; i++) bMax = Math.max(bMax, w.pol.track[i]);
      if (p.cash > 0) bMax = Math.max(bMax, p.cash);
    }
    const YB = function (v) { return bBot - (clamp(v, 0, bMax) / bMax) * g.BH; };

    const path = function (track, Y) {
      if (!track || !track.length) return "";
      const step = Math.max(1, Math.round(track.length / 400));
      let d = "";
      for (let i = 0; i < track.length; i += step) {
        d += (d ? "L" : "M") + X(i).toFixed(1) + " " + Y(track[i]).toFixed(1);
      }
      const last = track.length - 1;
      return d + "L" + X(last).toFixed(1) + " " + Y(track[last]).toFixed(1);
    };
    const line = function (track, Y, cls) {
      const d = path(track, Y);
      return d ? '<path class="' + cls + '" d="' + d + '"/>' : "";
    };
    const txt = function (x, y, cls, anchor, s) {
      return '<text class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
        '" text-anchor="' + anchor + '">' + s + '</text>';
    };

    let out = "";

    /* ---------- panel A: the mortgage ---------- */
    out += txt(g.PL, aTop - 9, "mg-pan", "start", "WHAT IS LEFT ON THE MORTGAGE");

    for (let k = 0; k <= 4; k++) {
      const v = aMax * k / 4, y = YA(v);
      out += '<line class="mg-grid' + (k === 0 ? " is-base" : "") + '" x1="' + g.PL +
        '" y1="' + y.toFixed(1) + '" x2="' + (CW - g.PR) + '" y2="' + y.toFixed(1) + '"/>' +
        txt(g.PL - 8, y + 3.5, "rb-ax", "end", k === 0 ? "$0" : usd0(v));
    }

    /* the lump sum, as the step down on day one */
    if (showB && w.applied / aMax > 0.035) {
      const y1 = YA(p.bal), y2 = YA(p.bal - w.applied);
      out += '<line class="mg-dropbar" x1="' + g.PL + '" y1="' + y1.toFixed(1) +
        '" x2="' + g.PL + '" y2="' + y2.toFixed(1) + '"/>' +
        '<path class="mg-droptip" d="M' + g.PL + ' ' + (y2 - 0.5).toFixed(1) +
        'l-3.4 -5.2h6.8Z"/>' +
        txt(g.PL + 9, y2 + g.FS + 7, "mg-droplab", "start",
          "&minus;" + usd0(w.applied) + " APPLIED ON DAY ONE");
    }

    /* green under blue would vanish — draw the thick strategy line first,
       then the dashed control on top, so an overlap reads as one band */
    out += line(w.trad.track, YA, "mg-l-trad");
    out += line(w.strat.track, YA, "mg-l-strat");
    out += line(w.ctrl.track, YA, "mg-l-ctrl");

    /* ---------- where each path reaches zero ---------- */
    const marks = [];
    const near = isFinite(w.strat.months) && isFinite(w.ctrl.months) &&
      Math.abs(w.ctrl.months - w.strat.months) <= Math.max(2, N * 0.02);

    if (near) {
      marks.push({ m: w.strat.months, cls: "is-both",
        lab: "BOTH CLEAR HERE &middot; " + span(w.strat.months).toUpperCase() });
    } else {
      if (isFinite(w.strat.months)) {
        marks.push({ m: w.strat.months, cls: "is-strat", lab: "WITH THE LOAN &middot; " + span(w.strat.months).toUpperCase() });
      }
      if (isFinite(w.ctrl.months) && showB) {
        marks.push({ m: w.ctrl.months, cls: "is-ctrl", lab: "SAME MONEY ON &middot; " + span(w.ctrl.months).toUpperCase() });
      }
    }
    if (isFinite(w.trad.months)) {
      marks.push({ m: w.trad.months, cls: "is-trad", lab: "DOING NOTHING &middot; " + span(w.trad.months).toUpperCase() });
    }

    /* lay the labels out so they never sit on top of each other */
    marks.sort(function (a, b) { return a.m - b.m; });
    const wide = g.FS * 0.66;
    let prevRight = -1e9, row = 0;
    marks.forEach(function (mk) {
      const x = X(mk.m);
      const lw = mk.lab.replace(/&middot;/g, "-").replace(/&minus;/g, "-").length * wide + 10;
      const anchor = x > g.PL + plotW * 0.62 ? "end" : "start";
      const tx = anchor === "end" ? x - 7 : x + 7;
      const left = anchor === "end" ? tx - lw : tx;
      row = left < prevRight + 6 ? row + 1 : 0;
      prevRight = left + lw;
      const ly = aBot - 12 - row * (g.FS + 7);
      out += '<line class="mg-mark ' + mk.cls + '" x1="' + x.toFixed(1) + '" y1="' + (ly + 3).toFixed(1) +
        '" x2="' + x.toFixed(1) + '" y2="' + aBot + '"/>' +
        '<circle class="mg-dot ' + mk.cls + '" cx="' + x.toFixed(1) + '" cy="' + aBot + '" r="3.2"/>' +
        txt(tx, ly, "mg-marklab " + mk.cls, anchor, mk.lab);
    });

    /* ---------- panel B: the policy loan, on its own scale ---------- */
    if (showB) {
      out += txt(g.PL, bTop - 9, "mg-pan", "start", "WHAT IS LEFT ON THE POLICY LOAN");
      if (w.loanGrows) {
        out += txt(CW - g.PR, bTop - 9, "mg-pan is-quiet", "end",
          "OWES " + usd0(w.pol.ends) + " WHEN THE HOUSE CLEARS");
      }

      out += '<line class="mg-grid is-base" x1="' + g.PL + '" y1="' + bBot +
        '" x2="' + (CW - g.PR) + '" y2="' + bBot + '"/>' +
        txt(g.PL - 8, bBot + 3.5, "rb-ax", "end", "$0") +
        txt(g.PL - 8, YB(bMax) + 3.5, "rb-ax", "end", usd0(bMax));

      /* the cash value the loan is secured against */
      if (p.cash > 0 && p.cash <= bMax * 1.001) {
        const cy = YB(p.cash);
        out += '<line class="mg-ceil" x1="' + g.PL + '" y1="' + cy.toFixed(1) +
          '" x2="' + (CW - g.PR) + '" y2="' + cy.toFixed(1) + '"/>' +
          txt(CW - g.PR - 2, cy - 5, "mg-ceil-lab", "end", "CASH VALUE &middot; " + usd0(p.cash));
      }

      const d = path(w.pol.track, YB);
      if (d) {
        const lastX = X(w.pol.track.length - 1);
        out += '<path class="mg-area" d="' + d + 'L' + lastX.toFixed(1) + ' ' + bBot +
          'L' + g.PL + ' ' + bBot + 'Z"/>';
        out += '<path class="mg-l-pol" d="' + d + '"/>';
      }

      /* where the loan reaches zero, marked on the line rather than in a corner */
      if (!w.loanGrows && isFinite(w.pol.months) && w.pol.months <= N) {
        const px = X(w.pol.months);
        const pEnd = px > g.PL + plotW * 0.62;
        out += '<circle class="mg-dot is-pol" cx="' + px.toFixed(1) + '" cy="' + bBot + '" r="3.2"/>' +
          txt(pEnd ? px - 7 : px + 7, bBot - 9, "mg-marklab is-pol", pEnd ? "end" : "start",
            "CLEARED &middot; " + span(w.pol.months).toUpperCase());
      }

      /* where a growing loan overtakes the cash value */
      if (w.loanGrows && w.breachMonths !== null && w.breachMonths > 0 && w.breachMonths <= N) {
        const bx = X(w.breachMonths);
        out += '<line class="mg-mark is-breach" x1="' + bx.toFixed(1) + '" y1="' + bTop +
          '" x2="' + bx.toFixed(1) + '" y2="' + bBot + '"/>' +
          txt(bx - 6, bTop + g.FS + 2, "mg-marklab is-breach", "end",
            "PASSES IT &middot; " + span(w.breachMonths).toUpperCase());
      }
    }

    /* ---------- the shared timeline ---------- */
    const years = Math.ceil(N / 12);
    const step = years > 20 ? 5 : (years > 10 ? 2 : 1);
    for (let y = 0; y <= years; y += step) {
      if (y * 12 > N) break;
      const x = X(y * 12);
      out += '<line class="mg-tickline" x1="' + x.toFixed(1) + '" y1="' + axisY +
        '" x2="' + x.toFixed(1) + '" y2="' + (axisY + 5) + '"/>' +
        txt(x, axisY + 17, "rb-tick", "middle", y === 0 ? "now" : y);
    }
    /* on its own row, so it never lands on the last tick */
    out += txt(CW - g.PR, axisY + 34, "mg-axname", "end", "years from now");

    /* ---------- the walkthrough ----------
       numbered pins on the picture, matched to plain sentences underneath.
       The pin is the whole explanation of where to look. */
    const notes = [];
    const at = function (x, y, tone, text) { notes.push({ x: x, y: y, tone: tone, t: text }); };
    const on = function (track, frac, Y) {
      const i = Math.max(0, Math.min(track.length - 1, Math.round((track.length - 1) * frac)));
      return { x: X(i), y: Y(track[i]) };
    };

    if (!showB) {
      const a = on(w.trad.track, 0.5, YA);
      at(a.x, a.y - 22, "trad", "This is the mortgage as it stands: " + span(w.trad.months) +
        " to go and " + usd(w.trad.interest) + " of interest still to pay.");
      at(g.PL + plotW * 0.5, aBot + g.GAP * 0.5, "flat",
        "Put a policy loan in and a second panel appears here for the loan itself, on the same timeline.");
    } else {
      const a = on(w.trad.track, 0.62, YA);
      at(a.x, a.y - 20, "trad", "Red is doing nothing — the mortgage runs its full " +
        span(w.trad.months) + ".");

      at(g.PL + 26, YA(p.bal - w.applied / 2), "strat",
        "Day one: " + usd(w.applied) + " borrowed from the policy goes straight onto the balance. " +
        "That is the step down at the very start.");

      if (w.flaw === "grows") {
        const s = on(w.strat.track, 0.55, YA);
        at(s.x, s.y + 24, "strat", "Green is the house after that lump sum. It does clear early — " +
          span(w.strat.months) + " — and that is the number the usual illustration shows you.");
        const b = on(w.pol.track, 0.35, YB);
        at(b.x, b.y - 16, "bad", "But look down here. The gold line is the loan, and it is going up, " +
          "not down: " + usd(p.repay) + " a month is less than the " + usd(w.firstInterest) + " of interest it is charged.");
        if (w.breachMonths !== null && w.breachMonths > 0 && w.breachMonths <= N) {
          at(X(w.breachMonths), YB(p.cash) + 20, "bad",
            "Here the loan passes the cash value holding it up. Past that line the policy is in lapse territory, " +
            "and the house being paid off does not fix it.");
        } else {
          at(X(N * 0.85), YB(bMax * 0.5), "bad",
            "It never gets repaid. Whatever is still owed comes off the death benefit.");
        }
      } else {
        /* below the line, so it never lands on the day-one label */
        const s = on(w.strat.track, 0.45, YA);
        at(s.x, s.y + 24, "strat", near
          ? "The thick green band is the borrow-and-apply strategy. The blue dashes riding inside it are the same " +
            usd(p.repay) + " a month paid straight at the mortgage instead — two different plans, one line."
          : "Thick green is borrow-and-apply. Blue dashes are the same " + usd(p.repay) +
            " a month paid straight at the mortgage. The gap between them is what the borrowing is worth.");

        if (isFinite(w.strat.months)) {
          at(X(w.strat.months) + 17, aBot - 15, near ? "strat" : "ctrl", near
            ? "They land in the same month. The money is doing the work, not the loan."
            : "The loan finishes " + span(Math.abs(w.savedVsCtrl)) + " " +
              (w.savedVsCtrl > 0 ? "ahead of" : "behind") + " simply paying the money on.");
        }

        const b = on(w.pol.track, 0.45, YB);
        at(b.x, b.y - 14, "pol", "The lower panel is the loan itself, on its own scale — " +
          usd(w.applied) + " paid back down to nothing over " + spanTxt(w.pol.months) + ".");
      }
    }

    if (walk) {
      /* nudge any pin that has landed on top of an earlier one */
      const placed = [];
      notes.forEach(function (nt) {
        let cx = clamp(nt.x, g.PL + 12, CW - g.PR - 12);
        let cy = clamp(nt.y, 14, CH - 14);
        let dir = 1, tries = 0;
        while (tries++ < 12 && placed.some(function (q) {
          return Math.abs(q.x - cx) < 24 && Math.abs(q.y - cy) < 24;
        })) {
          cy += dir * 25;
          if (cy > CH - 14 || cy < 14) { cy = clamp(nt.y, 14, CH - 14); dir = -dir; cx += 26; }
          cx = clamp(cx, g.PL + 12, CW - g.PR - 12);
          cy = clamp(cy, 14, CH - 14);
        }
        placed.push({ x: cx, y: cy });
      });
      notes.forEach(function (nt, i) {
        const cx = placed[i].x, cy = placed[i].y;
        out += '<circle class="mg-pin is-' + nt.tone + '" cx="' + cx.toFixed(1) +
          '" cy="' + cy.toFixed(1) + '" r="10.5"/>' +
          '<text class="mg-pin-n" x="' + cx.toFixed(1) + '" y="' + (cy + 3.8).toFixed(1) +
          '" text-anchor="middle">' + (i + 1) + '</text>';
      });
    }

    return {
      svg: '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="mg-svg" role="img" ' +
        'aria-label="Two panels on one timeline: the mortgage balance under three strategies, ' +
        'and the policy loan balance beneath it.">' + out + '</svg>',
      notes: notes
    };
  }

  /* ============================================================
     the three paths
     ============================================================ */
  function paths(p, w) {
    return [
      { key: "trad", tint: "a", name: "Traditional", tag: "NOTHING CHANGES",
        big: span(w.trad.months),
        lines: [
          { k: "Paid off", v: isFinite(w.trad.months) ? dateIn(w.trad.months) : "—" },
          { k: "Mortgage interest", v: usd(w.trad.interest) },
          { k: "Total paid", v: usd(w.trad.paid) }
        ],
        footL: "Interest", foot: usd(w.trad.interest) },

      { key: "ctrl", tint: "c", name: "Same money, straight on", tag: "NO LOAN AT ALL",
        big: span(w.ctrl.months),
        lines: [
          { k: "Paid off", v: isFinite(w.ctrl.months) ? dateIn(w.ctrl.months) : "—" },
          { k: "Mortgage interest", v: usd(w.ctrl.interest) },
          { k: "Extra put in", v: usd(w.extraMoney) }
        ],
        footL: "Interest", foot: usd(w.ctrl.interest) },

      { key: "strat", tint: "b", name: "Policy-loan strategy", tag: "BORROW AND APPLY",
        big: span(w.strat.months),
        lines: [
          { k: "Paid off", v: isFinite(w.strat.months) ? dateIn(w.strat.months) : "—" },
          { k: "Mortgage interest", v: usd(w.strat.interest) },
          { k: "Policy loan interest", v: usd(w.pol.interest) },
          w.loanGrows
            ? { k: "Loan cleared in", v: "Never" }
            : (w.foregone > 0
              ? { k: "Growth given up", v: usd(w.foregone) }
              : { k: "Loan cleared in", v: span(w.pol.months) })
        ],
        footL: w.loanGrows ? "Interest so far" : "Interest and cost",
        foot: w.loanGrows ? usd(w.strat.interest) : usd(w.stratCost) }
    ];
  }

  /* ============================================================
     reading it
     ============================================================ */
  function reads(p, w) {
    const out = [];
    if (w.flaw === "nobal") {
      return { title: "Put a mortgage balance in to build the comparison.", list: [
        { k: "Start here", v: "The balance", tone: "flat",
          d: "Everything on this page is measured against what is still owed today." }
      ]};
    }

    if (w.flaw === "nopay") {
      return { title: "Nothing below can be read until the payment covers the interest.", list: [
        { k: "Interest in month one", v: usd(p.bal * p.rate / 12), tone: "bad",
          d: "The payment is " + usd(p.pmt + p.extra) + ". The balance rises every month, so there is no payoff date to compare against." },
        { k: "A level payment would be", v: usd(w.scheduled), tone: "flat",
          d: "That is what clears " + usd(p.bal) + " at " + (p.rate * 100).toFixed(2) + "% over " + p.term +
             " years. Put that in, or the real payment from the statement, and the comparison rebuilds itself." }
      ]};
    }

    if (w.flaw === "noloan") {
      return { title: "Add a policy loan and this will test it against paying the same money on.", list: [
        { k: "Mortgage as it stands", v: span(w.trad.months), tone: "flat",
          d: usd(w.trad.interest) + " of interest, paid off " + dateIn(w.trad.months) + ". That is the baseline everything else is measured against." },
        { k: "What to enter", v: "Loan and repayment", tone: "flat",
          d: "The amount borrowed against the cash value, and what would be paid back each month. The repayment is the part that does most of the work — and the part the headline usually hides." }
      ]};
    }

    if (w.flaw === "grows") {
      return { title: "The loan never gets repaid, so there is no saving to report.", list: [
        { k: "Interest the loan charges", v: usd(w.firstInterest) + "/mo", tone: "bad",
          d: "Against a repayment of " + usd(p.repay) + ". The shortfall is added to the loan, and next month's interest is charged on the larger balance." },
        { k: "Loan balance at payoff", v: usd(w.pol.ends), tone: "bad",
          d: "Borrowed " + usd(w.applied) + ", owing " + usd(w.pol.ends) + " by the time the mortgage clears. That is still owed, and it comes off the death benefit." },
        { k: "Passes the cash value in", v: w.breachMonths === null ? "Not on these figures" : span(Math.max(1, w.breachMonths)),
          tone: w.breachMonths === null ? "warn" : "bad",
          d: w.breachMonths === null
            ? "The loan grows but doesn't overtake " + usd(p.cash) + " inside the horizon. It is still an unpaid, compounding debt against the contract."
            : "Once the loan exceeds the cash value securing it, the carrier can lapse the policy — and a lapsed loan is a taxable event." },
        { k: "The repayment that works", v: "Above " + usd(w.firstInterest), tone: "flat",
          d: "Anything over the first month's interest starts the balance falling. Raise it past that, or borrow less, and the page will run the real comparison." }
      ]};
    }

    out.push({
      k: "The loan really adds", v: w.real > 0 ? usd(w.real) : (Math.abs(w.real) < 1 ? "Nothing" : "−" + usd(-w.real)),
      tone: w.real > 0 ? "good" : "bad",
      d: "Measured against sending the same " + usd(p.repay) +
         " a month straight at the mortgage. The headline figure of " + usd(w.headline) +
         " is mostly the extra money, not the loan."
    });

    out.push({
      k: "Extra money the strategy uses", v: usd(w.extraMoney), tone: "warn",
      d: usd(p.repay) + " a month for " + spanTxt(w.pol.months) +
         ". The traditional path never sees a dollar of it, which is why it loses so heavily."
    });

    out.push({
      k: "Rate difference",
      v: (p.rate < p.lrate ? "−" : "") + Math.abs((p.rate - p.lrate) * 100).toFixed(2) + " pts",
      tone: p.rate > p.lrate ? "good" : "bad",
      d: p.rate > p.lrate
        ? "Borrowing at " + (p.lrate * 100).toFixed(2) + "% to retire debt at " + (p.rate * 100).toFixed(2) +
          "% is the whole mechanism. That spread is what the strategy is actually selling."
        : "The policy loan costs " + (p.lrate * 100).toFixed(2) + "% to retire debt at " + (p.rate * 100).toFixed(2) +
          "%. There is no spread to harvest here — the mechanism runs backwards."
    });

    if (w.foregone > 0) {
      out.push({
        k: "Growth the cash value gives up", v: usd(w.foregone), tone: "bad",
        d: usd(w.applied) + " at " + (p.grow * 100).toFixed(1) + "% for " + spanTxt(w.pol.months) +
           ". Many contracts credit loaned value at a lower rate, and that cost belongs on this side of the ledger."
      });
    } else {
      out.push({
        k: "Growth the cash value gives up", v: "Not counted", tone: "flat",
        d: "The crediting rate is set to zero, so the loaned money is assumed to earn nothing either way. Set it to test the assumption."
      });
    }

    out.push({
      k: "Loan against cash value", v: (w.loanPct * 100).toFixed(1) + "%",
      tone: w.loanPct >= 0.6 ? "bad" : (w.loanPct >= 0.4 ? "warn" : "good"),
      d: usd(w.applied) + " borrowed against " + usd(p.cash) +
         ". The higher this runs, the less room the policy has if a year goes badly."
    });

    if (w.wipesOut) {
      out.push({
        k: "The loan clears the whole mortgage", v: usd(w.applied), tone: "warn",
        d: "The house is paid off on day one, but " + usd(w.applied) + " is now owed to the policy at " +
           (p.lrate * 100).toFixed(2) + "% instead of to the bank at " + (p.rate * 100).toFixed(2) +
           "%. The debt moved; it did not go away, and it is secured against the death benefit rather than the house."
      });
    }

    out.push({
      k: "Months the loan buys you", v: w.savedVsCtrl > 0 ? w.savedVsCtrl + "" : "0",
      tone: w.savedVsCtrl > 0 ? "good" : "flat",
      d: "Against " + span(w.ctrl.months) + " on the control path and " + span(w.strat.months) +
         " on the strategy. The " + span(w.saved) + " in the headline is measured against a path with no extra money in it."
    });

    let title;
    if (w.wipesOut) title = "The loan clears the mortgage outright — which moves the debt, it doesn't retire it.";
    else if (w.real > 5000) title = "The loan earns its place, but by far less than the headline.";
    else if (w.real > 0) title = "Almost all of the headline saving is the extra money, not the loan.";
    else title = "On these figures the loan costs more than paying the same money straight on.";
    return { title: title, list: out };
  }

  /* ============================================================
     render
     ============================================================ */
  function run() {
    const p = read();
    const w = work(p);

    /* ---- banner ---- */
    if (w.flaw === "nobal") {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "The balance";
      $("bnSub").textContent = "everything here is measured against what's still owed";
    } else if (w.flaw === "nopay") {
      $("bnLabel").textContent = "THE PAYMENT";
      $("bnBig").textContent = "Doesn't cover the interest";
      $("bnSub").textContent = "at " + usd(p.pmt + p.extra) + " a month the balance never falls";
    } else if (w.flaw === "noloan") {
      $("bnLabel").textContent = "NO POLICY LOAN YET";
      $("bnBig").textContent = "Nothing to test";
      $("bnSub").textContent = "put in a loan amount and this compares it against paying the same money on";
    } else if (w.flaw === "grows") {
      $("bnLabel").textContent = "THE LOAN NEVER CLEARS";
      $("bnBig").textContent = "It grows, not shrinks";
      $("bnSub").textContent = p.repay > 0
        ? usd(p.repay) + " a month doesn't cover the " + usd(w.firstInterest) + " of loan interest"
        : "nothing is being repaid, so the interest compounds against the policy";
    } else {
      $("bnLabel").textContent = "THE LOAN REALLY ADDS";
      $("bnBig").textContent = w.real > 0 ? usd(w.real) : (Math.abs(w.real) < 1 ? "Nothing" : "−" + usd(-w.real));
      $("bnSub").textContent = "not the " + usd(w.headline) + " the headline shows";
    }
    $("bnBig").parentNode.classList.toggle("is-short",
      p.bal > 0 && (w.flaw === "nopay" || w.flaw === "grows" || (!w.flaw && w.real <= 0)));

    /* ---- the three heads ---- */
    $("hdA").textContent = span(w.trad.months);
    $("hdAS").textContent = isFinite(w.trad.months) ? dateIn(w.trad.months) : "never, on this payment";
    $("hdB").textContent = span(w.strat.months);
    $("hdBS").textContent = isFinite(w.strat.months) ? dateIn(w.strat.months) : "never, on this payment";
    $("hdD").textContent = w.saved > 0 ? span(w.saved) : "None";
    $("hdDS").textContent = w.flaw === "grows"
      ? "but the loan behind it is never repaid"
      : (w.savedVsCtrl > 0
        ? "only " + span(w.savedVsCtrl) + " of it from the loan"
        : "none of it from the loan itself");
    $("hdD").parentNode.classList.toggle("is-flip", w.savedVsCtrl > 0 && w.flaw !== "grows");

    /* ---- side facts ---- */
    $("factA").textContent = usd(w.trad.interest);
    $("factBL").textContent = "Loan cleared in";
    $("factB").textContent = w.loanGrows ? "Never" : span(w.pol.months);
    $("pmtNote").textContent = "A level payment on this balance and term would be " + usd(w.scheduled) + ".";
    $("loanPctNote").textContent = p.cash > 0
      ? (w.loanPct * 100).toFixed(1) + "% of the cash value" : "Enter a cash value to check this.";
    $("repayNote").textContent = w.loanGrows
      ? "Less than the " + usd(w.firstInterest) + " of interest the loan charges in month one."
      : (w.extraMoney > 0
        ? usd(w.extraMoney) + " in total, over " + spanTxt(w.pol.months) + "." : "—");

    /* ---- the picture ---- */
    const ch = chart(p, w, walkOn);
    $("chartWrap").innerHTML = ch.svg;
    $("chartWalk").innerHTML = walkOn ? ch.notes.map(function (nt, i) {
      return '<li data-tone="' + nt.tone + '"><i>' + (i + 1) + '</i><span></span></li>';
    }).join("") : "";
    if (walkOn) {
      const lis = $("chartWalk").children;
      for (let i = 0; i < lis.length; i++) lis[i].querySelector("span").textContent = ch.notes[i].t;
    }
    $("chartWalk").toggleAttribute("hidden", !walkOn);
    const together = isFinite(w.strat.months) && isFinite(w.ctrl.months) &&
      Math.abs(w.savedVsCtrl) <= Math.max(2, (isFinite(w.trad.months) ? w.trad.months : 300) * 0.02);
    $("chartLead").textContent = w.applied <= 0
      ? "Top panel is the house. Add a policy loan and a second panel appears beneath it for the loan itself, on the same timeline."
      : (w.flaw === "grows"
        ? "Top panel is the house, bottom panel is the loan. Watch the gold line: it climbs instead of falling, because " +
          usd(p.repay) + " a month is less than the interest it is charged."
        : (together
          ? "Top panel is the house, bottom panel is the loan. The thick green band and the blue dashed line sit on top of " +
            "each other — that is the whole finding. Borrow and apply, or just pay the same money on, and you land in the same place."
          : "Top panel is the house, bottom panel is the loan. Compare the green band with the blue dashed line: that gap is " +
            "what the borrowing is worth. The red line is doing nothing at all."));

    /* ---- the three path cards ---- */
    const pg = $("pathGrid");
    pg.innerHTML = "";
    paths(p, w).forEach(function (c) {
      const el = document.createElement("article");
      el.className = "mg-path";
      el.setAttribute("data-tint", c.tint);
      el.innerHTML = '<header><b></b><span class="vs-tag"></span></header>' +
        '<strong class="mg-big"></strong><ul class="rb-lines"></ul>' +
        '<footer><span></span><b></b></footer>';
      el.querySelector("header b").textContent = c.name;
      el.querySelector(".vs-tag").textContent = c.tag;
      el.querySelector(".mg-big").textContent = c.big;
      el.querySelector(".rb-lines").innerHTML = c.lines.map(function (l) {
        return "<li><span>" + l.k + "</span><b>" + l.v + "</b></li>";
      }).join("");
      el.querySelector("footer span").textContent = c.footL;
      el.querySelector("footer b").textContent = c.foot;
      pg.appendChild(el);
    });

    /* ---- the fair test ---- */
    $("fairHeadline").textContent = w.flaw ? "—" : usd(w.headline);
    $("fairRealL").textContent = w.flaw === "grows" ? "What the loan owes at payoff"
      : (w.real >= 0 ? "What the loan adds" : "What the loan costs");
    $("fairReal").textContent = w.flaw === "grows" ? usd(w.pol.ends)
      : (w.flaw ? "—" : (w.real >= 0 ? usd(w.real) : usd(-w.real)));
    $("fairRealNote").textContent = w.flaw === "grows"
      ? "borrowed " + usd(w.applied) + ", never repaid"
      : "against the same money paid straight on";
    $("fairBox").classList.toggle("is-bad", w.flaw === "grows" || w.flaw === "nopay" || (!w.flaw && w.real < 0));
    if (w.flaw === "nopay") {
      $("fairTitle").textContent = "The mortgage payment doesn't cover its own interest.";
      $("fairBody").textContent =
        "At " + usd(p.pmt + p.extra) + " a month against " + usd(p.bal * p.rate / 12) +
        " of interest, the balance rises every month no matter what the policy does. Fix the payment first — " +
        "a level payment on this balance and term is " + usd(w.scheduled) + " — and the comparison below becomes meaningful.";
    } else if (w.flaw === "grows") {
      $("fairTitle").textContent = "The loan is never repaid — it compounds against the policy.";
      $("fairBody").textContent =
        (p.repay > 0 ? usd(p.repay) + " a month is less than the " + usd(w.firstInterest) +
          " of interest the loan charges in its first month, " : "Nothing is being repaid, ") +
        "so the balance climbs from " + usd(w.applied) + " to " + usd(w.pol.ends) +
        " by the time the mortgage clears" +
        (w.breachMonths !== null
          ? ", passing the " + usd(p.cash) + " cash value behind it in " + spanTxt(Math.max(1, w.breachMonths)) + "."
          : ".") +
        " There is no saving to measure here — unpaid loan interest is a lapse problem, not a payoff strategy.";
    } else if (w.flaw === "noloan" || w.flaw === "nobal") {
      $("fairTitle").textContent = "No policy loan in the comparison yet.";
      $("fairBody").textContent = "Put in a loan amount and a monthly repayment, and this will test it against the same money paid straight onto the mortgage.";
    } else if (w.real > 0) {
      $("fairTitle").textContent = "Most of the headline is the extra money, not the loan.";
      $("fairBody").textContent =
        "The strategy pays " + usd(p.repay) + " a month into the policy loan for " + spanTxt(w.pol.months) +
        " — " + usd(w.extraMoney) + " the traditional path never sees. Send that same money straight at the mortgage and it clears in " +
        span(w.ctrl.months) + " instead of " + span(w.strat.months) + ". The loan's own contribution is " +
        usd(w.real) + ", not " + usd(w.headline) + ".";
    } else {
      $("fairTitle").textContent = "The loan costs more than simply paying the money on.";
      $("fairBody").textContent =
        "Sending " + usd(p.repay) + " a month straight at the mortgage clears it in " + span(w.ctrl.months) +
        " with " + usd(w.ctrl.interest) + " of interest. Routing it through the policy costs " + usd(w.stratCost) +
        " once the loan interest" + (w.foregone > 0 ? " and the growth given up are" : " is") +
        " counted — " + usd(-w.real) + " worse.";
    }

    /* ---- policy health ---- */
    const pct = Math.min(1, w.loanPct);
    $("gaugeFill").style.width = (w.loanGrows ? 100 : pct * 100).toFixed(1) + "%";
    $("gaugeFill").className = (w.loanGrows || pct >= 0.6) ? "is-bad" : (pct >= 0.4 ? "is-warn" : "is-ok");
    if (w.loanGrows) {
      $("healthTitle").textContent = "Critical — the loan is growing against the policy.";
      $("healthBody").textContent =
        "It starts at " + usd(w.applied) + (p.cash > 0 ? " against " + usd(p.cash) + " of cash value" : "") +
        " and rises every month, because the repayment doesn't cover the interest. " +
        (w.breachMonths !== null
          ? "On these figures it passes the cash value in " + spanTxt(Math.max(1, w.breachMonths)) +
            ", and from that point the policy is in lapse territory."
          : "Left alone, unpaid loan interest is what puts a policy into lapse.") +
        " Either raise the repayment above " + usd(w.firstInterest) + " a month or borrow less.";
    } else if (p.cash <= 0) {
      $("healthTitle").textContent = "No cash value entered.";
      $("healthBody").textContent = "Put the current cash value in and this will show how hard the loan is leaning on it.";
    } else if (pct >= 0.6) {
      $("healthTitle").textContent = "The loan is leaning hard on the policy — " + (pct * 100).toFixed(1) + "% of cash value.";
      $("healthBody").textContent = "At this level there is little room for a poor crediting year or for unpaid interest to compound. Ask the carrier for an in-force illustration showing the loan at the guaranteed rate, not the current one.";
    } else if (pct >= 0.4) {
      $("healthTitle").textContent = "A meaningful share of the policy is on loan — " + (pct * 100).toFixed(1) + "%.";
      $("healthBody").textContent = "Workable, but it needs watching. The figure that matters is not today's percentage; it is whether the loan is still growing faster than the cash value behind it.";
    } else {
      $("healthTitle").textContent = "The loan sits lightly on the policy — " + (pct * 100).toFixed(1) + "% of cash value.";
      $("healthBody").textContent = "There is room here for a bad year. Still worth confirming the carrier's actual loan rate, whether it is fixed or variable, and how loaned value is credited.";
    }

    /* ---- reading it ---- */
    const rd = reads(p, w);
    $("readTitle").textContent = rd.title;
    const rg = $("readGrid");
    rg.innerHTML = "";
    rd.list.forEach(function (r) {
      const el = document.createElement("article");
      el.className = "read";
      el.setAttribute("data-tone", r.tone || "flat");
      el.innerHTML = "<small></small><b></b><p></p>";
      el.querySelector("small").textContent = r.k;
      el.querySelector("b").textContent = r.v;
      el.querySelector("p").textContent = r.d;
      rg.appendChild(el);
    });

    $("forgetChips").innerHTML = ["The repayment is new money",
      "Loan interest accrues either way", "Loaned cash value may credit less",
      "Death benefit falls by what's owed", "Loan rates can be variable",
      "Mortgage interest may be deductible", "Lapse risk if interest compounds",
      "The liquidity you give up"].map(function (f) { return "<li>" + f + "</li>"; }).join("");
    $("keyQ").textContent = "A policy loan is a liquidity tool before it is an arbitrage. The question is not whether the mortgage clears sooner — extra money guarantees that — but whether borrowing against the policy beats simply paying the same money on, and whether the flexibility is worth the difference.";

    /* ---- say it ---- */
    let say;
    if (w.flaw === "nobal" || w.flaw === "noloan") {
      say = "“Let's put the real balance and a loan amount in, and then test it properly against just paying the money on.”";
    } else if (w.flaw === "nopay") {
      say = "“Before we look at the policy at all — the payment we've got in here doesn't cover the interest. Let's pull the real number off your statement.”";
    } else if (w.flaw === "grows") {
      say = "“I want to stop here, because at " + usd(p.repay) + " a month the loan isn't being repaid — it's growing. " +
            "Unpaid loan interest is how policies lapse. Let's either put " + usd(w.firstInterest) +
            " a month or more against it, or borrow less.”";
    } else if (w.real > 5000) {
      say = "“Yes, the headline says " + usd(w.headline) + ". Most of that is the " + usd(w.extraMoney) +
            " you'd be putting in either way. The loan itself is worth about " + usd(w.real) +
            " — still real, and now it's a number you can trust.”";
    } else if (w.real > 0) {
      say = "“The headline says " + usd(w.headline) + ". But if you just paid that same " + usd(p.repay) +
            " a month onto the mortgage you'd land within " + span(Math.max(1, w.savedVsCtrl)) +
            " of the same place. The loan isn't doing the work here — your cash flow is.”";
    } else {
      say = "“On these numbers, routing the money through the policy costs more than paying it straight onto the mortgage. If we do this, it should be for the flexibility, not because the maths is better.”";
    }
    $("sayIt").textContent = say;

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* ---------- plumbing ---------- */
  const WALK = "wealthdemo.mortgage.walk";
  let walkOn = true;                       /* on by default — it is the first thing a new reader needs */
  try { if (localStorage.getItem(WALK) === "0") walkOn = false; } catch (e) {}

  function paintWalkBtn() {
    const b = $("walkBtn");
    if (!b) return;
    b.setAttribute("aria-pressed", walkOn ? "true" : "false");
    $("walkBtnLabel").textContent = walkOn ? "Hide the walkthrough" : "Walk me through it";
  }
  if ($("walkBtn")) {
    $("walkBtn").addEventListener("click", function () {
      walkOn = !walkOn;
      try { localStorage.setItem(WALK, walkOn ? "1" : "0"); } catch (e) {}
      paintWalkBtn();
      run();
    });
  }

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
    const p = read(), w = work(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["Mortgage Payoff Strategy — WEALTHDEMO", "",
      "THE MORTGAGE",
      "  Balance                " + usd(p.bal),
      "  Rate                   " + (p.rate * 100).toFixed(2) + "%",
      "  Remaining term         " + p.term + " years",
      "  Monthly P&I            " + usd(p.pmt) + (p.extra > 0 ? "  + " + usd(p.extra) + " extra" : ""), "",
      "THE POLICY LOAN",
      "  Cash value             " + usd(p.cash),
      "  Loan applied           " + usd(w.applied) + "  (" + (w.loanPct * 100).toFixed(1) + "% of cash value)",
      "  Loan rate              " + (p.lrate * 100).toFixed(2) + "%",
      "  Monthly repayment      " + usd(p.repay), "",
      "THREE PATHS",
      "  1 Traditional          " + span(w.trad.months) + "   interest " + usd(w.trad.interest),
      "  2 Same money, paid on  " + span(w.ctrl.months) + "   interest " + usd(w.ctrl.interest),
      "  3 Policy-loan strategy " + span(w.strat.months) + "   interest and cost " + usd(w.stratCost),
      "      mortgage interest  " + usd(w.strat.interest),
      "      policy loan interest " + usd(w.pol.interest) +
        (w.foregone > 0 ? "\n      growth given up    " + usd(w.foregone) : ""), "",
      "THE FAIR TEST"];
    if (w.flaw === "grows") {
      lines.push("  !! The loan is never repaid. " + usd(p.repay) + " a month is less than the " +
        usd(w.firstInterest) + " of interest it is charged,",
        "     so the balance climbs from " + usd(w.applied) + " to " + usd(w.pol.ends) + " by the time the mortgage clears" +
        (w.breachMonths !== null ? ", passing the cash value in " + spanTxt(Math.max(1, w.breachMonths)) : "") + ".",
        "     There is no saving to report — this is a lapse risk, not a payoff strategy.", "");
    } else if (w.flaw === "nopay") {
      lines.push("  !! The mortgage payment does not cover its own interest, so no path pays off.",
        "     A level payment on this balance and term is " + usd(w.scheduled) + ".", "");
    } else if (w.flaw) {
      lines.push("  No policy loan entered yet.", "");
    } else {
      lines.push("  Headline saving        " + usd(w.headline) + "   (path 3 against path 1)",
        "  What the loan adds     " + (w.real >= 0 ? usd(w.real) : "−" + usd(-w.real)) + "   (path 3 against path 2)",
        "  Extra money used       " + usd(w.extraMoney) + "   that path 1 never sees", "");
    }
    const rd = reads(p, w);
    lines.push("READING THE COMPARISON", "  " + rd.title, "");
    rd.list.forEach(function (r) { lines.push("  " + r.k + ": " + r.v, "    " + r.d); });
    lines.push("", "POLICY HEALTH", "  " + $("healthTitle").textContent, "  " + $("healthBody").textContent, "",
      $("sayIt").textContent, "",
      "Educational illustration only, and not a guaranteed return assumption. Policy loan availability, loan rates, whether the rate is fixed or variable, how the loaned cash value is credited, policy charges and lapse risk all vary by carrier and contract. This does not model taxes, mortgage-interest deductibility, refinancing costs, or the death-benefit reduction a loan creates. Confirm the carrier's actual terms and run a full in-force illustration before using a real policy.");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  load();
  paintWalkBtn();
  run();
})();
