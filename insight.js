/* ============================================================
   WEALTHDEMO — what stands out

   The guide used to recite the page. This reads it.

   Two techniques, and neither duplicates a calculator's maths:

     probe(set, out)      temporarily changes an input, lets the
                          page's own engine recompute, reads the
                          answer, and puts everything back. So a
                          "what if" can never disagree with the
                          tool — it IS the tool.

     solve(id, lo, hi, f) bisects an input until the page says
                          what you want it to say. That is how
                          "you would need $1,740 a month" is
                          found: by asking the page, twelve
                          times, in about a frame.

   Everything here is deterministic. No model, no server, no
   guessing — just the page, interrogated.

   Each finding is {level, t, b}: 'warn' something is wrong,
   'watch' something to know, 'good' something is working. Only
   the top three are shown, and a finding that merely repeats
   what the page already says does not belong here.
   ============================================================ */
(function () {
  "use strict";

  const M = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const H = {
    /* --- reading --- */
    el: function (id) { return document.getElementById(id); },
    v: function (id) { const e = H.el(id); return e ? (parseFloat(e.value) || 0) : NaN; },
    t: function (id) { const e = H.el(id); return e ? (e.textContent || "").trim() : ""; },
    has: function (id) { return !!H.el(id); },
    m: function (n) { return M.format(Math.round(n)); },
    pct: function (n) { return (Math.round(n * 10) / 10) + "%"; },

    /* --- driving the page --- */
    set: function (map) {
      const back = [];
      for (const id in map) {
        const e = H.el(id);
        if (!e) return null;
        back.push([e, e.value]);
        const cur = parseFloat(e.value);
        e.value = typeof map[id] === "function" ? map[id](cur) : map[id];
      }
      back.forEach(function (p) { p[0].dispatchEvent(new Event("input", { bubbles: true })); });
      return back;
    },
    undo: function (back) {
      if (!back) return;
      back.forEach(function (p) { p[0].value = p[1]; });
      back.forEach(function (p) { p[0].dispatchEvent(new Event("input", { bubbles: true })); });
    },
    /* change something, read something, put it back */
    probe: function (map, outId) {
      const back = H.set(map);
      if (!back) return null;
      const out = H.t(outId);
      H.undo(back);
      return out || null;
    },
    /* the smallest value of one input that makes the page say yes */
    solve: function (id, lo, hi, ok) {
      const e = H.el(id);
      if (!e) return null;
      const was = e.value;
      const test = function (x) {
        e.value = x;
        e.dispatchEvent(new Event("input", { bubbles: true }));
        return ok();
      };
      let answer = null;
      if (test(hi)) {
        let a = lo, b = hi;
        for (let i = 0; i < 12; i++) {
          const mid = (a + b) / 2;
          if (test(mid)) b = mid; else a = mid;
        }
        answer = b;
      }
      e.value = was;
      e.dispatchEvent(new Event("input", { bubbles: true }));
      return answer;
    },

    /* --- small closed forms, used only where nothing on the page has them --- */
    pmt: function (bal, aprPct, months) {
      const r = aprPct / 100 / 12;
      if (r === 0) return bal / months;
      return bal * r / (1 - Math.pow(1 + r, -months));
    },
    fv: function (lump, monthly, ratePct, months) {
      const r = ratePct / 100 / 12;
      if (r === 0) return lump + monthly * months;
      const g = Math.pow(1 + r, months);
      return lump * g + monthly * (g - 1) / r;
    },
    /* a headline quoted as its own sentence rather than spliced into one */
    say: function (s) {
      const t = String(s || "").replace(/^[\u2026.\s]+/, "").trim();
      return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
    },

    /* a number inside a string, so a headline can be compared */
    num: function (s) {
      const m = String(s).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      return m ? parseFloat(m[0]) : NaN;
    }
  };

  /* ============================================================
     one analyst per tool
     ============================================================ */
  const READ = {

    /* ---------------------------------------------------------- */
    debt: function () {
      const out = [];
      const bal = H.v("dBal"), apr = H.v("dApr"), pmt = H.v("dPmt"), buy = H.v("dBuy");
      const int0 = bal * apr / 100 / 12;
      const cut = pmt - int0;

      if (cut <= 0) {
        out.push({ level: "warn", t: "This one never finishes",
          b: "Interest adds " + H.m(int0) + " a month and the payment is " + H.m(pmt) + ". The balance goes up, not down." });
      } else if (int0 / pmt > 0.35) {
        out.push({ level: "watch", t: "Most of the payment is rent on the debt",
          b: H.m(int0) + " of every " + H.m(pmt) + " is interest. Only " + H.m(cut) + " reaches the balance." });
      }

      if (buy > 0 && cut > 0 && buy >= cut * 0.8) {
        out.push({ level: "warn", t: "New spending is cancelling the payment",
          b: H.m(buy) + " a month goes back on the card against " + H.m(cut) + " coming off. The plan and the card are fighting each other." });
      }

      if (cut > 0) {
        const p24 = H.pmt(bal, apr, 24);
        out.push({ level: "watch", t: "To be done in two years",
          b: H.m(p24) + " a month — " + H.m(p24 - pmt) + " more than now." });
      }

      const faster = H.probe({ dExtra: function (x) { return (x || 0) + 100; } }, "statMonths");
      const now = H.num(H.t("statMonths"));
      if (faster && isFinite(now)) {
        const then = H.num(faster);
        if (isFinite(then) && then < now) {
          out.push({ level: "good", t: "What another $100 a month buys",
            b: Math.round(now - then) + " months off the finish line, for " + H.m(100) + " a month." });
        }
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    plan529: function () {
      const out = [];
      const yrs = Math.max(0, H.v("pStart") - H.v("pAge"));
      const covers = H.num(H.t("statCovers"));
      const mo = H.v("pMonthly");

      if (yrs <= 7) {
        out.push({ level: "watch", t: "Not much runway left",
          b: yrs + " years to go, so most of this will be money you put in rather than growth. Contributions are doing the work here, not the market." });
      }

      if (isFinite(covers) && covers < 100) {
        /* statCovers is rounded, so 99.6% prints as 100%. Price it against
           the bill itself, which the note carries in full. */
        const bill = H.num((H.t("statCoversNote").match(/\$[\d,]+/) || [""])[0]);
        const need = H.solve("pMonthly", mo, Math.max(mo * 12, mo + 6000), function () {
          return isFinite(bill) ? H.num(H.t("statPlan")) >= bill : H.num(H.t("statCovers")) >= 100;
        });
        if (need) {
          out.push({ level: "watch", t: "To cover the whole bill",
            b: H.m(need) + " a month instead of " + H.m(mo) + ". Most families never aim for 100% — but it is worth knowing where the line is." });
        }
      }

      const worse = H.probe({ pRet: function (x) { return x - 2; } }, "statPlan");
      if (worse) {
        out.push({ level: "watch", t: "If it earns two points less",
          b: "The plan lands at " + worse + " instead of " + H.t("statPlan") + ". That gap is the cost of the assumption, not of anything you did." });
      }

      if (H.v("pState") === 0) {
        out.push({ level: "watch", t: "No state break counted",
          b: "The state deduction is set to zero, so nothing here credits you for one. Many states give something — it is worth ten minutes to check yours." });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    family: function () {
      const out = [];
      const mo = H.v("fMonthly");
      const badge = H.el("spentBadge");
      const short = badge && badge.getAttribute("data-ok") === "0";

      if (short) {
        out.push({ level: "warn", t: "Every goal is covered, but not all at once",
          b: H.t("spentLead") });
        const need = H.solve("fMonthly", mo, mo * 6 + 2000, function () {
          const b = H.el("spentBadge");
          return b && b.getAttribute("data-ok") === "1";
        });
        if (need) {
          out.push({ level: "watch", t: "What it would actually take",
            b: H.m(need) + " a month covers all three in order — " + H.m(need - mo) + " more than the plan assumes." });
        }
      } else {
        out.push({ level: "good", t: "The order works",
          b: "Even paying for each goal as it arrives, the account holds up. " + H.t("spentLead") });
      }

      const worse = H.probe({ fRate: function (x) { return Math.max(0, x - 2); } }, "stripEnd");
      if (worse) {
        out.push({ level: "watch", t: "Two points off the growth rate",
          b: "The finish drops to " + worse + " from " + H.t("stripEnd") + ". Test the plan there before you rely on it." });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    college: function () {
      const out = [];
      const infl = H.v("aInfl"), grow = H.v("aGrow");
      if (infl > grow) {
        out.push({ level: "warn", t: "The bill is outrunning the savings",
          b: "College costs are set to rise " + H.pct(infl) + " a year against " + H.pct(grow) + " growth. While that is true, waiting a year costs more than a year of saving adds." });
      }
      const worse = H.probe({ aInfl: function (x) { return x + 2; } }, "totGap");
      if (worse) {
        out.push({ level: "watch", t: "If costs rise two points faster",
          b: "The family shortfall becomes " + worse + " instead of " + H.t("totGap") + "." });
      }
      const peak = H.t("peakNote");
      if (peak) out.push({ level: "watch", t: "The year that hurts", b: peak });
      return out;
    },

    /* ---------------------------------------------------------- */
    withdraw: function () {
      const out = [];
      const nest = H.v("wNest"), want = H.v("wWant"), ss = H.v("wSS");
      const fromSavings = Math.max(0, want - ss) * 12;
      if (nest > 0 && fromSavings > 0) {
        const rate = fromSavings / nest * 100;
        if (rate > 5) {
          out.push({ level: "warn", t: "The first year draws heavily on the balance",
            b: H.pct(rate) + " of the balance comes out in year one. Above about 4–5% a plan starts leaning on good markets rather than on arithmetic." });
        } else {
          out.push({ level: "good", t: "The first year is within reach",
            b: "Year one draws " + H.pct(rate) + " of the balance — inside the range most plans are built on." });
        }
      }
      const worse = H.probe({ wGrowth: function (x) { return x - 2; } }, "ansHeadline");
      if (worse) {
        out.push({ level: "watch", t: "Two points off the return", b: H.say(worse) });
      }
      const inflUp = H.probe({ wInfl: function (x) { return x + 1; } }, "ansHeadline");
      if (inflUp) {
        out.push({ level: "watch", t: "One more point of inflation", b: H.say(inflUp) });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    taxes: function () {
      const out = [];
      const now = H.num(H.t("nowEnd")), later = H.num(H.t("laterEnd")), free = H.num(H.t("freeEnd"));
      const tNow = H.v("tNow"), tLater = H.v("tLater");
      if (isFinite(now) && isFinite(later)) {
        const best = Math.max(now, later, free);
        const worst = Math.min(now, later, free);
        out.push({ level: "watch", t: "The spread is the whole decision",
          b: H.m(best - worst) + " between the best timing and the worst, on identical money. Nothing about the investment changed." });
      }
      if (tLater < tNow) {
        const flip = H.solve("tLater", tLater, 60, function () {
          return H.num(H.t("laterEnd")) <= H.num(H.t("freeEnd"));
        });
        if (flip) {
          out.push({ level: "watch", t: "Where the answer flips",
            b: "Paying later stays ahead of paying once until your retirement rate reaches about " + H.pct(flip) + ". You have assumed " + tLater + "%." });
        }
      }
      out.push({ level: "watch", t: "Nobody knows the rate in thirty years",
        b: "Which is the argument for holding money in more than one of these, so the choice stays open rather than being made now." });
      return out;
    },

    /* ---------------------------------------------------------- */
    rentbuy: function () {
      const out = [];
      const cross = H.t("crossLead");
      const yrs = H.v("rYears");
      if (cross) out.push({ level: "watch", t: "Where it turns", b: cross });
      const worse = H.probe({ bAppr: function (x) { return Math.max(0, x - 2); } }, "bnBig");
      if (worse && worse !== H.t("bnBig")) {
        out.push({ level: "warn", t: "The answer depends on the house going up",
          b: "Two points off appreciation and the verdict changes to “" + worse + "”. That is the assumption doing the deciding, not the rent." });
      } else if (worse) {
        out.push({ level: "good", t: "It holds without the house going up",
          b: "Even with two points off appreciation the answer stays “" + worse + "”." });
      }
      if (yrs && yrs < 7) {
        out.push({ level: "warn", t: "A short stay favours renting",
          b: "At " + yrs + " years the buying costs — closing, selling, the early years of mostly-interest payments — have very little time to be earned back." });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    mortgage: function () {
      const out = [];
      const fair = H.t("fairBody");
      if (fair) out.push({ level: "watch", t: "The honest version", b: fair });
      const loan = H.v("pLoan"), cash = H.v("pCash");
      if (cash > 0 && loan / cash > 0.6) {
        out.push({ level: "warn", t: "That is a lot of the policy",
          b: H.pct(loan / cash * 100) + " of the cash value is borrowed. The less headroom there is, the less room a bad year leaves before the loan becomes a problem of its own." });
      }
      /* the question every client asks: would plain extra payments do this? */
      const extra = H.probe({ mExtra: function (x) { return (x || 0) + 200; }, pLoan: 0 }, "hdA");
      if (extra && extra !== H.t("hdA")) {
        out.push({ level: "watch", t: "What $200 a month would do on its own",
          b: "No policy loan, just " + H.m(200) + " extra at the mortgage: " + extra + " instead of " + H.t("hdA") + ". Worth knowing before borrowing anything." });
      }
      const rate = H.v("mRate");
      if (rate > 0) {
        out.push({ level: "watch", t: "What paying it off is really worth",
          b: "Clearing a " + H.pct(rate) + " mortgage is a guaranteed " + H.pct(rate) + " return. That is excellent against a low rate elsewhere and poor against a high one." });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    penalty: function () {
      const out = [];
      const amt = H.v("pAmt");
      const keep = H.num(H.t("lnKeep"));
      if (amt > 0 && isFinite(keep)) {
        const lost = (1 - keep / amt) * 100;
        out.push({ level: lost > 30 ? "warn" : "watch", t: "What it actually costs to take",
          b: H.pct(lost) + " of the withdrawal never reaches you. To end up with " + H.m(amt) + " in hand you would have to take more than that out." });
      }
      const older = H.probe({ pAge: 60 }, "lnKeep");
      if (older && older !== H.t("lnKeep")) {
        out.push({ level: "watch", t: "The same withdrawal at 60",
          b: "You would keep " + older + " instead of " + H.t("lnKeep") + ". The difference is the early-withdrawal penalty and nothing else." });
      }
      out.push({ level: "watch", t: "The cost the page cannot show",
        b: "The money also stops growing. A withdrawal today is that amount plus every year of growth it would have made between now and retirement." });
      return out;
    },

    /* ---------------------------------------------------------- */
    states: function () {
      const out = [];
      const a = H.num(H.t("tot_a")), b = H.num(H.t("tot_b"));
      const spend = H.v("sSpend") + H.v("sIncome");
      if (isFinite(a) && isFinite(b)) {
        const d = Math.abs(a - b);
        if (spend > 0 && d / spend < 0.01) {
          out.push({ level: "good", t: "This is not a tax decision",
            b: H.m(d) + " a year between them is under 1% of what you live on. Whatever decides this, it should not be the tax." });
        } else {
          out.push({ level: "watch", t: "Where the difference comes from",
            b: "The headline is " + H.m(d) + " a year, but the three taxes move in opposite directions — read the two cards, not the total." });
        }
      }
      const spendUp = H.probe({ sSpend: function (x) { return x * 1.5; } }, "overOut");
      if (spendUp) {
        out.push({ level: "watch", t: "If you spend half as much again",
          b: spendUp });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    dime: function () {
      const out = [];
      const inc = H.v("dIncome");
      const need = H.num(H.t("ansHeadline"));
      if (inc > 0 && isFinite(need)) {
        out.push({ level: "watch", t: "Against the rule of thumb",
          b: "This comes to " + (Math.round(need / inc * 10) / 10) + "× your income. The usual shorthand is ten times — where yours sits tells you which of the four pieces is unusual." });
      }
      const noKids = H.probe({ dKids: 0 }, "ansHeadline");
      if (noKids && noKids !== H.t("ansHeadline")) {
        out.push({ level: "watch", t: "What the children account for",
          b: "Set the education piece to zero and the answer becomes: " + H.say(noKids) + " The rest is debt, income and the house." });
      }
      out.push({ level: "watch", t: "The need shrinks over time",
        b: "A mortgage falls, children finish school. Cover is often layered rather than bought as one flat block for thirty years." });
      return out;
    },

    /* ---------------------------------------------------------- */
    legacy: function () {
      const out = [];
      const own = H.v("gHome") + H.v("gRetire") + H.v("gSave") + H.v("gLife");
      const reach = H.num(H.t("ansHeadline"));
      if (own > 0 && isFinite(reach)) {
        const lost = (1 - reach / own) * 100;
        out.push({ level: lost > 25 ? "warn" : "watch", t: "The leak between the two numbers",
          b: H.pct(lost) + " of what you own never reaches them. Debts, tax and settling take it before anyone sees it." });
      }
      const noTax = H.probe({ gTax: 0 }, "ansHeadline");
      if (noTax && noTax !== H.t("ansHeadline")) {
        out.push({ level: "watch", t: "What the heirs' tax rate costs",
          b: "With no tax on the inherited account it would be: " + H.say(noTax) + " That difference is the retirement account, not the house." });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    paycheck: function () {
      const out = [];
      const sav = H.num(H.t("aloneBig")), both = H.num(H.t("bothBig"));
      const wait = H.v("pWait");
      if (isFinite(sav) && isFinite(wait) && sav * 4.3 < wait) {
        out.push({ level: "warn", t: "Savings run out before the cover starts",
          b: "The waiting period is " + wait + " days and savings cover about " + H.t("aloneBig") + ". Those two numbers have to be chosen together." });
      }
      if (isFinite(sav) && isFinite(both) && both > sav) {
        out.push({ level: "good", t: "What the cover is actually buying",
          b: H.t("aloneBig") + " becomes " + H.t("bothBig") + ". That gap is the whole reason for the premium." });
      }
      const worse = H.probe({ pBills: function (x) { return x * 1.15; } }, "bothBig");
      if (worse && worse !== H.t("bothBig")) {
        out.push({ level: "watch", t: "If the bills were 15% higher",
          b: "The runway shortens to " + worse + ". Most households find their bills have drifted since they last added them up." });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    waiting: function () {
      const out = [];
      const cost = H.num(H.t("ansHeadline"));
      const amt = H.v("wAmt");
      if (isFinite(cost) && amt > 0) {
        out.push({ level: "warn", t: "The delay costs more than the money",
          b: "Putting it off costs " + H.m(cost) + " — against " + H.m(amt) + " of your own money going in. The waiting is more expensive than the saving." });
      }
      const half = H.probe({ delaySlide: function (x) { return Math.max(1, Math.round(x / 2)); } }, "ansHeadline");
      if (half) {
        out.push({ level: "watch", t: "Half the delay",
          b: "Cut the wait in half and it becomes: " + H.say(half) });
      }
      out.push({ level: "watch", t: "It is the last years you lose",
        b: "Not the first. The years given up are the ones where the balance was biggest, which is why the number is so much larger than it feels." });
      return out;
    },

    /* ---------------------------------------------------------- */
    loss: function () {
      const out = [];
      const drop = H.v("lLoss"), grow = H.v("lGrow");
      const needed = drop / (100 - drop) * 100;
      out.push({ level: "warn", t: "The gain has to be bigger than the fall",
        b: "Down " + drop + "% needs " + H.pct(needed) + " to get level, because the climb starts from the smaller number." });
      if (grow > 0) {
        const yrs = Math.log(1 / (1 - drop / 100)) / Math.log(1 + grow / 100);
        out.push({ level: "watch", t: "How long just to get back",
          b: (Math.round(yrs * 10) / 10) + " years at " + grow + "% simply to return to where you started — before a single dollar of progress." });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    rule72: function () {
      const out = [];
      const ir = H.v("r7IR"), dr = H.v("r7DR");
      if (ir > 0 && dr > 0) {
        const sd = 72 / ir, dd = 72 / dr;
        if (dd < sd) {
          out.push({ level: "warn", t: "The debt clock is the faster one",
            b: "What you owe doubles every " + (Math.round(dd * 10) / 10) + " years; what you save doubles every " + (Math.round(sd * 10) / 10) + ". A spare dollar does " + (Math.round(dr / ir * 10) / 10) + "× more work against the debt." });
        } else {
          out.push({ level: "good", t: "Your savings clock is the faster one",
            b: "Savings double every " + (Math.round(sd * 10) / 10) + " years against " + (Math.round(dd * 10) / 10) + " for the debt. That is the right way round." });
        }
      }
      const dx = H.t("dxBody");
      if (dx) out.push({ level: "watch", t: "Where the two lines meet", b: dx });
      return out;
    },

    /* ---------------------------------------------------------- */
    accounts: function () {
      const out = [];
      const age = H.v("aAge");
      if (age < 59.5) {
        const older = H.probe({ aAge: 60 }, "ansHeadline");
        if (older && older !== H.t("ansHeadline")) {
          out.push({ level: "warn", t: "Age is doing most of the deciding",
            b: "At 60 the same withdrawal gives a different answer: " + H.say(older) + " Below 59\u00bd the 10% penalty reorders the whole list." });
        }
      }
      const sub = H.t("ansSub");
      if (sub) out.push({ level: "watch", t: "The spread between best and worst", b: sub });
      out.push({ level: "watch", t: "You only get to spend it once",
        b: "Taking the cheapest money first makes this withdrawal cheap and every later one dearer. The order across a whole retirement matters more than any single choice." });
      return out;
    },

    /* ---------------------------------------------------------- */
    tool: function () {
      const out = [];
      const tax = H.num(H.t("outTax"));
      const extra = 10000;
      const more = H.probe({ qualified: function (x) { return x + extra; } }, "outTax");
      if (more && isFinite(tax)) {
        const t2 = H.num(more);
        if (isFinite(t2) && t2 > tax) {
          const eff = (t2 - tax) / extra * 100;
          out.push({ level: eff > H.num(H.t("bracket") || "0") ? "warn" : "watch",
            t: "The real cost of the next $10,000",
            b: H.m(t2 - tax) + " of extra tax — an effective " + H.pct(eff) + " on money you thought was taxed at your bracket. The withdrawal drags more of the benefit into being taxable too." });
        }
      }
      const ins = H.t("insightBody");
      if (ins) out.push({ level: "watch", t: "Where you sit", b: ins });
      return out;
    },

    /* ---------------------------------------------------------- */
    taximpact: function () {
      const out = [];
      const sum = H.t("tiSum");
      if (sum) out.push({ level: "watch", t: "Your mix today", b: sum });
      const later = H.num(H.t("mixProj_later"));
      if (isFinite(later) && later > 0) {
        out.push({ level: "warn", t: "What ten points of future tax would cost",
          b: H.m(later) + " is projected in the taxed-later bucket. Every extra point on the future rate takes " + H.m(later / 100) +
             " of it; ten points takes " + H.m(later / 10) + " — without a single investment changing." });
      }
      return out;
    },

    /* ---------------------------------------------------------- */
    future: function () {
      const out = [];
      const bank = H.num(H.t("bankBig")), plan = H.num(H.t("planBig"));
      if (isFinite(bank) && isFinite(plan) && plan > bank) {
        out.push({ level: "watch", t: "The cost of playing it safe",
          b: H.m(plan - bank) + " between the bank and the investment plan, on identical contributions. That gap is what the certainty costs." });
      }
      const worse = H.probe({ fReturn: function (x) { return x - 2; } }, "planBig");
      if (worse) {
        out.push({ level: "watch", t: "Two points off the return",
          b: "The plan reaches " + worse + " instead of " + H.t("planBig") + ", which is close enough to the other options to change the argument." });
      }
      out.push({ level: "watch", t: "The real question is not the biggest number",
        b: "It is what happens if they do not go to college. That is where these three stop looking alike." });
      return out;
    },

    /* ---------------------------------------------------------- */
    carriers: function () {
      const out = [];
      const n = H.num(H.t("navCount")), cap = H.num(H.t("captureCount"));
      if (isFinite(n) && n === 0) {
        out.push({ level: "warn", t: "Nothing fits on these inputs",
          b: "Usually one field is doing all the work — the amount, or something in the existing coverage. Loosen the one you are least sure of." });
      } else if (isFinite(n)) {
        out.push({ level: "watch", t: "A starting list, not an answer",
          b: n + " partners match the stated appetite. Nothing here has seen a medical record or a financial justification." });
      }
      if (isFinite(cap) && cap > 0) {
        out.push({ level: "watch", t: "Get these on the first call",
          b: cap + " items to capture before quoting. Chasing them later is what stalls a case two weeks in." });
      }
      return out;
    }
  };

  /* ============================================================
     the runner
     ============================================================ */
  /* the same hands the analyst uses, lent to the assistant so that a model
     can drive this calculator instead of doing arithmetic of its own */
  window.WD_DRIVE = H;

  window.WD_FINDINGS = function (slug) {
    const fn = READ[slug];
    if (!fn) return [];
    let list = [];
    try { list = fn() || []; } catch (e) { return []; }
    return list.filter(function (f) {
      return f && f.t && f.b && String(f.b).indexOf("NaN") < 0 &&
             String(f.b).indexOf("— ") !== 0 && String(f.b).trim() !== "—";
    }).slice(0, 3);
  };
})();
