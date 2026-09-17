/* ============================================================
   WEALTHDEMO — Rent vs. Buy

   Two paths, one timeline, month by month.

     Renting  — pay rent, and invest both the money that was not
                handed over as a down payment and closing costs,
                and whatever the monthly difference happens to be
                that month.
     Buying   — pay the loan and the carrying costs, build equity,
                and be left holding the asset less the cost of
                selling it.

   One thing is done differently from the usual version of this
   calculation. Rent rises every year, so the amount a renter can
   actually invest SHRINKS every year. Holding that contribution
   flat at today's difference overstates the renting side, often
   by tens of thousands over ten years. Here it tracks the real
   monthly difference, and turns negative once rent overtakes the
   loan payment — at which point the renter draws the portfolio
   down, because that is what would really happen.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("rRent")) return;

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
  const plural = function (n, one, many) {
    return n + " " + (Math.abs(n - 1) < 0.001 ? one : (many || one + "s"));
  };
  const yrs = function (n) {
    const r = Math.round(n * 10) / 10;
    return r + (Math.abs(r - 1) < 0.05 ? " year" : " years");
  };

  /* ---------- the two modes ---------- */
  const MODES = {
    home: {
      eyebrow: "Real Estate", title: "Rent vs. Buy",
      lead: "What each choice costs today, what you'd own later, and the year one finally pulls ahead.",
      legA: "Renting", legB: "Buying",
      rent: "Monthly Rent", rins: "Renter's Insurance / mo", rinc: "Annual Rent Increase",
      price: "Home Price", down: "Down Payment", rate: "Mortgage Rate", term: "Loan Term",
      tax: "Property Tax / Year", bins: "Homeowners Insurance / Year", hoa: "HOA / Month",
      maint: "Maintenance / Year", close: "Closing Costs",
      appr: "Home Appreciation / Year", apprTerm: "appreciation",
      sell: "Selling Cost at End",
      hdA: "Rent monthly cost", hdB: "Buy monthly cost",
      colA: "What Renting Costs", colB: "What Buying Costs",
      keyA: "Rent & invest", keyB: "Buy & build equity",
      posA: "Renting After", posB: "Buying After",
      tagA: "RENT & INVEST", tagB: "BUY & BUILD EQUITY",
      cashA: "Total rent paid", cashB: "Total housing cash outflow",
      assetB: "Projected home value", oweB: "Mortgage remaining",
      terms: [15, 20, 30], maxYears: 30, crossTitle: "The Break-Even",
      forget: ["Property tax", "Insurance", "Maintenance", "HOA", "Closing costs",
               "Selling costs", "Down-payment opportunity cost", "Rent rising every year"],
      keyQ: "The cheapest monthly payment is not always the cheapest long-term decision. Look at both what leaves your pocket and what you'd still be holding at the end.",
      defaults: { rRent: 2300, rIns: 25, rInc: 3, rRet: 6, bPrice: 500000, bDown: 50000,
                  bRate: 6.5, bTerm: 30, bTax: 9000, bIns: 2400, bHoa: 100, bMaint: 5000,
                  bClose: 15000, bAppr: 3, bSell: 6, bTaxSav: 0, rYears: 10 }
    },
    car: {
      eyebrow: "Vehicles", title: "Lease vs. Buy",
      lead: "What each choice costs every month, what the car is worth when you're done, and which one costs less overall.",
      hdA: "Lease monthly cost", hdB: "Buy monthly cost",
      colA: "What Leasing Costs", colB: "What Buying Costs",
      keyA: "Lease net cost", keyB: "Buy net cost",
      posA: "Leasing After", posB: "Buying After",
      tagA: "NOTHING OWNED AT END", tagB: "VEHICLE EQUITY REMAINS",
      crossTitle: "Net Cost Over Time",
      maxYears: 15,
      forget: ["Depreciation", "Sales tax", "Registration and fees", "Maintenance",
               "Mileage charges", "Lease fees at every renewal", "Resale value",
               "The loan ends — the lease doesn't"],
      keyQ: "Leasing offers a lower payment and frequent replacement, and leaves you with nothing. Buying costs more until the loan ends, then costs almost nothing while you still own the car. Compare total net cost, not the monthly payment.",
      defaults: { cLease: 550, cLDown: 3000, cLTerm: 36, cLFees: 1200, cMiles: 0, cMileRate: 0.25,
                  cPrice: 42000, cDown: 5000, cApr: 6.5, cLoanTerm: 60, cSalesTax: 6.25,
                  cReg: 1200, cMaint: 1200, cResale: 21000, cRet: 0, rYears: 10 }
    }
  };
  let MODE = "home";
  const M = function () { return MODES[MODE]; };

  const HOME_FIELDS = ["rRent", "rIns", "rInc", "rRet", "bPrice", "bDown", "bRate", "bTerm",
                       "bTax", "bIns", "bHoa", "bMaint", "bClose", "bAppr", "bSell", "bTaxSav"];
  const CAR_FIELDS = ["cLease", "cLDown", "cLTerm", "cLFees", "cMiles", "cMileRate",
                      "cPrice", "cDown", "cApr", "cLoanTerm", "cSalesTax", "cReg",
                      "cMaint", "cResale", "cRet"];
  const FIELDS = HOME_FIELDS.concat(CAR_FIELDS, ["rYears"]);
  const STORE = "wealthdemo.tool.rentbuy";

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    const d = M().defaults;
    const yr = Math.max(1, Math.min(M().maxYears, Math.round(num("rYears", d.rYears))));
    if (MODE === "car") {
      return {
        mode: "car", years: yr,
        lease: Math.max(0, num("cLease", d.cLease)),
        ldown: Math.max(0, num("cLDown", d.cLDown)),
        lterm: Math.max(1, num("cLTerm", d.cLTerm)),
        lfees: Math.max(0, num("cLFees", d.cLFees)),
        miles: Math.max(0, num("cMiles", d.cMiles)),
        mrate: Math.max(0, num("cMileRate", d.cMileRate)),
        price: Math.max(0, num("cPrice", d.cPrice)),
        down: Math.max(0, num("cDown", d.cDown)),
        rate: Math.max(0, num("cApr", d.cApr)) / 100,
        term: Math.max(1, num("cLoanTerm", d.cLoanTerm)) / 12,
        stax: Math.max(0, num("cSalesTax", d.cSalesTax)) / 100,
        reg: Math.max(0, num("cReg", d.cReg)),
        maint: Math.max(0, num("cMaint", d.cMaint)),
        resale5: Math.max(0, num("cResale", d.cResale)),
        ret: Math.max(0, num("cRet", d.cRet)) / 100
      };
    }
    return {
      mode: "home", years: yr,
      rent: Math.max(0, num("rRent", d.rRent)),
      rins: Math.max(0, num("rIns", d.rIns)),
      rinc: num("rInc", d.rInc) / 100,
      ret: Math.max(0, num("rRet", d.rRet)) / 100,
      price: Math.max(0, num("bPrice", d.bPrice)),
      down: Math.max(0, num("bDown", d.bDown)),
      rate: Math.max(0, num("bRate", d.bRate)) / 100,
      term: Math.max(1, num("bTerm", d.bTerm)),
      tax: Math.max(0, num("bTax", d.bTax)),
      bins: Math.max(0, num("bIns", d.bIns)),
      hoa: Math.max(0, num("bHoa", d.bHoa)),
      maint: Math.max(0, num("bMaint", d.bMaint)),
      close: Math.max(0, num("bClose", d.bClose)),
      appr: num("bAppr", d.bAppr) / 100,
      sell: Math.max(0, num("bSell", d.bSell)) / 100,
      taxsav: Math.max(0, num("bTaxSav", d.bTaxSav))
    };
  }

  function pay(loan, r, n) {
    if (loan <= 0) return 0;
    return r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
  }

  /* ============================================================
     the engine — home
     ============================================================ */
  function workHome(p) {
    const loan = Math.max(0, p.price - p.down);
    const r = p.rate / 12, n = Math.round(p.term * 12);
    const pi = pay(loan, r, n);
    const carryM = p.tax / 12 + p.bins / 12 + p.hoa + p.maint / 12 - p.taxsav / 12;
    const buyM0 = pi + carryM;
    const rentM0 = p.rent + p.rins;

    const i = p.ret / 12;
    const H = Math.round(MODES.home.maxYears * 12);
    const track = [];
    let pool = p.down + p.close, bal = loan;
    let rcash = 0, bcash = p.down + p.close;
    let cross = null, costCross = null, payoff = null, snap = null;
    const want = p.years * 12;

    for (let m = 0; m < H; m++) {
      const y = Math.floor(m / 12);
      const rm = p.rent * Math.pow(1 + p.rinc, y) + p.rins;
      const inLoan = m < n && bal > 0.5;
      const bm = (inLoan ? pi : 0) + carryM;
      rcash += rm; bcash += bm;
      if (inLoan) {
        bal = Math.max(0, bal - (pi - bal * r));
        if (bal <= 0.5 && payoff === null) payoff = m + 1;
      }
      pool = pool * (1 + i) + (bm - rm);
      const hv = p.price * Math.pow(1 + p.appr, (m + 1) / 12);
      const bpos = hv * (1 - p.sell) - bal;
      if (costCross === null && rm > bm) costCross = m + 1;
      if (cross === null && bpos > pool && m > 0) cross = m + 1;
      track.push({ m: m + 1, a: pool, b: bpos });
      if (m + 1 === want) snap = { acash: rcash, bcash: bcash, bal: bal, hv: hv, b: bpos, a: pool };
    }
    const last = track[track.length - 1];
    if (!snap) snap = { acash: rcash, bcash: bcash, bal: bal, hv: p.price, b: last.b, a: last.a };

    return {
      higherIsBetter: true, pi: pi, carryM: carryM, buyM0: buyM0, rentM0: rentM0,
      diff: buyM0 - rentM0, track: track, snap: snap,
      cross: cross, costCross: costCross, payoff: payoff,
      gap: snap.a - snap.b, entry: p.down + p.close
    };
  }

  /* ============================================================
     the engine — car
     Net cost, because a car is an asset that shrinks. Cash paid
     so far, less whatever equity is left in the vehicle. Lower wins.
     ============================================================ */
  function workCar(p) {
    const loan = Math.max(0, p.price * (1 + p.stax) + p.reg - p.down);
    const r = p.rate / 12, n = Math.round(p.term * 12);
    const pi = pay(loan, r, n);
    const maintM = p.maint / 12;
    const mileM = p.miles * p.mrate / 12;
    const spreadM = (p.ldown + p.lfees) / p.lterm;

    const leaseM0 = p.lease + spreadM + mileM;
    const buyM0 = pi + maintM;

    /* value: straight line in log terms to the 5-year figure, then 12% a year */
    const k5 = p.price > 0 ? Math.pow(Math.max(1e-9, p.resale5 / p.price), 1 / 5) : 0;
    const value = function (t) {
      if (p.price <= 0) return 0;
      return t <= 5 ? p.price * Math.pow(k5, t) : p.resale5 * Math.pow(0.88, t - 5);
    };

    const i = p.ret / 12;
    const H = Math.round(MODES.car.maxYears * 12);
    const track = [];
    let bal = loan, acash = 0, bcash = 0;   /* the down payment lands in month one */
    let poolA = 0, poolB = 0, budget = 0;
    let cross = null, costCross = null, payoff = null, snap = null;
    const want = p.years * 12;

    for (let m = 0; m < H; m++) {
      /* every lease term starts with the down payment and the fees all over again */
      const renew = (m % p.lterm) === 0;
      const am = p.lease + mileM + (renew ? p.ldown + p.lfees : 0);
      const inLoan = m < n && bal > 0.5;
      const bm = (inLoan ? pi : 0) + maintM + (m === 0 ? p.down : 0);
      acash += am; bcash += bm;

      if (inLoan) {
        bal = Math.max(0, bal - (pi - bal * r));
        if (bal <= 0.5 && payoff === null) payoff = m + 1;
      }

      /* both paths draw on the same budget; whatever a path doesn't spend, it invests */
      const b = Math.max(am, bm);
      budget += b;
      poolA = poolA * (1 + i) + (b - am);
      poolB = poolB * (1 + i) + (b - bm);

      const v = value((m + 1) / 12);
      const equity = v - bal;
      /* net cost: everything the budget gave up, less what you still hold */
      const aCost = budget - poolA;
      const bCost = budget - poolB - equity;

      if (costCross === null && (p.lease + mileM) > ((inLoan ? pi : 0) + maintM)) costCross = m + 1;
      if (cross === null && bCost < aCost && m > 0) cross = m + 1;
      track.push({ m: m + 1, a: aCost, b: bCost });
      if (m + 1 === want) snap = { acash: acash, bcash: bcash, bal: bal, hv: v,
                                   equity: equity, a: aCost, b: bCost };
    }
    const last = track[track.length - 1];
    if (!snap) snap = { acash: acash, bcash: bcash, bal: bal, hv: value(p.years),
                        equity: value(p.years) - bal, a: last.a, b: last.b };

    return {
      higherIsBetter: false, pi: pi, carryM: maintM, buyM0: buyM0, rentM0: leaseM0,
      diff: buyM0 - leaseM0, track: track, snap: snap, spreadM: spreadM, mileM: mileM,
      loan: loan, cross: cross, costCross: costCross, payoff: payoff,
      gap: snap.a - snap.b,          /* >0 means buying costs less */
      entry: p.down
    };
  }

  function work(p) { return p.mode === "car" ? workCar(p) : workHome(p); }

  /* what assumption would flip the answer at the chosen horizon */
  function tip(p, field, lo, hi) {
    let a = lo, b = hi;
    const sign = function (v) {
      const q = Object.assign({}, p); q[field] = v;
      return work(q).gap;                       /* >0 means renting ahead */
    };
    if (sign(a) * sign(b) > 0) return null;     /* no crossing in this range */
    for (let k = 0; k < 60; k++) {
      const mid = (a + b) / 2;
      if (sign(a) * sign(mid) <= 0) b = mid; else a = mid;
    }
    return (a + b) / 2;
  }

  /* ============================================================
     the break-even picture
     ============================================================ */
  function geom() {
    const w = window.innerWidth;
    if (w < 700)  return { CW: 460, CH: 260, PL: 44, PR: 14, PT: 26, PB: 44, small: true };
    if (w < 1100) return { CW: 820, CH: 300, PL: 56, PR: 20, PT: 28, PB: 46, small: false };
    return { CW: 1100, CH: 320, PL: 62, PR: 24, PT: 28, PB: 48, small: false };
  }

  function chart(p, w) {
    const g = geom(), CW = g.CW, CH = g.CH;
    const plotW = CW - g.PL - g.PR, plotH = CH - g.PT - g.PB;
    const base = g.PT + plotH;
    const N = p.years * 12;
    const pts = w.track.slice(0, N);
    const up = w.higherIsBetter;
    const aWins = up ? (w.gap > 0) : (w.gap < 0);   /* is path A the better outcome? */

    let hi = 0, lo = 0;
    pts.forEach(function (t) {
      hi = Math.max(hi, t.a, t.b);
      lo = Math.min(lo, t.a, t.b);
    });
    if (hi <= lo) hi = lo + 1;
    const pad = (hi - lo) * 0.08;
    const hadNeg = lo < 0;
    hi += pad;
    lo = hadNeg ? lo - pad : 0;

    const X = function (m) { return g.PL + (m / N) * plotW; };
    const Y = function (v) { return base - ((v - lo) / (hi - lo)) * plotH; };

    const line = function (key) {
      return pts.map(function (t, k) {
        return (k ? "L" : "M") + X(t.m).toFixed(1) + " " + Y(t[key]).toFixed(1);
      }).join(" ");
    };
    const band = "M" + pts.map(function (t) { return X(t.m).toFixed(1) + " " + Y(t.a).toFixed(1); }).join(" L") +
      " L" + pts.slice().reverse().map(function (t) { return X(t.m).toFixed(1) + " " + Y(t.b).toFixed(1); }).join(" L") + " Z";

    let out = "";
    if (lo < 0 && hi > 0) {
      out += '<line class="rb-zero" x1="' + g.PL + '" y1="' + Y(0).toFixed(1) +
        '" x2="' + (CW - g.PR) + '" y2="' + Y(0).toFixed(1) + '"/>';
    }
    out += '<path class="rb-band' + (aWins ? " is-rent" : " is-buy") + '" d="' + band + '"/>';
    out += '<path class="rb-l-buy" d="' + line("b") + '"/>';
    out += '<path class="rb-l-rent" d="' + line("a") + '"/>';

    /* the point buying takes the lead */
    const A = MODE === "car" ? "LEASING" : "RENTING";
    if (w.cross && w.cross <= N && w.cross > 1) {
      const cx = X(w.cross), cy = Y(pts[w.cross - 1].b);
      const far = w.cross / N > 0.7;
      out += '<line class="rb-cross-line" x1="' + cx.toFixed(1) + '" y1="' + g.PT +
        '" x2="' + cx.toFixed(1) + '" y2="' + base + '"/>' +
        '<circle class="rb-dot" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5"/>' +
        '<text class="rb-cross-lab" x="' + (far ? cx - 9 : cx + 9).toFixed(1) + '" y="' + (g.PT + 12) +
        '" text-anchor="' + (far ? "end" : "start") + '">BUYING PULLS AHEAD &middot; YEAR ' +
        (Math.round(w.cross / 12 * 10) / 10) + '</text>';
    } else {
      const txt = (w.cross && w.cross <= 1)
        ? "BUYING COSTS LESS FROM THE START"
        : A + " STAYS AHEAD FOR ALL " + p.years + " YEARS";
      out += '<text class="rb-cross-lab is-none" x="' + (g.PL + 4) + '" y="' + (g.PT + 12) +
        '" text-anchor="start">' + txt + '</text>';
    }

    if (w.costCross && w.costCross <= N) {
      const mx = X(w.costCross);
      out += '<line class="rb-costx" x1="' + mx.toFixed(1) + '" y1="' + (base - 6) +
        '" x2="' + mx.toFixed(1) + '" y2="' + (base + 6) + '"/>' +
        '<text class="rb-costx-lab" x="' + mx.toFixed(1) + '" y="' + (base + 19) +
        '" text-anchor="middle">' + (MODE === "car" ? "lease" : "rent") + ' passes the payment</text>';
    }

    const last = pts[pts.length - 1];
    const capY = function (v, cls, txt) {
      return '<text class="' + cls + '" x="' + (CW - g.PR - 2) + '" y="' + (Y(v) - 7).toFixed(1) +
        '" text-anchor="end">' + txt + '</text>';
    };
    out += capY(last.a, "rb-cap-rent", usd0(last.a));
    out += capY(last.b, "rb-cap-buy", usd0(last.b));

    out += '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (g.PT + 4) + '" text-anchor="end">' + usd0(hi) + '</text>' +
      '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (base + 4) + '" text-anchor="end">' + usd0(lo) + '</text>' +
      '<line class="rb-base" x1="' + g.PL + '" y1="' + base + '" x2="' + (CW - g.PR) + '" y2="' + base + '"/>';
    const step = p.years > 20 ? 5 : (p.years > 10 ? 2 : 1);
    let ticks = "";
    for (let y = 0; y <= p.years; y += step) {
      ticks += '<text class="rb-tick" x="' + X(y * 12).toFixed(1) + '" y="' + (CH - 8) +
        '" text-anchor="middle">' + (y === 0 ? "now" : y) + '</text>';
    }
    out += ticks;

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="rb-svg' + (up ? "" : " is-cost") + '" role="img" ' +
      'aria-label="' + (up ? "Net position over time" : "Net cost over time") + ', two paths compared">' + out + '</svg>';
  }

  /* ============================================================
     reading it
     ============================================================ */
  function reads(p, w) {
    if (MODE === "car") return readsCar(p, w);
    return readsHome(p, w);
  }

  function readsCar(p, w) {
    const out = [];
    const buyWins = w.gap > 0;                 /* gap = leaseCost - buyCost */
    const tie = Math.abs(w.gap) < 1;

    out.push({
      k: buyWins ? "Buying costs less by" : "Leasing costs less by",
      v: tie ? "Line ball" : usd(Math.abs(w.gap)),
      tone: tie ? "flat" : (buyWins ? "good" : "warn"),
      d: "Net cost of " + usd(w.snap.a) + " to lease against " + usd(w.snap.b) +
         " to buy, over " + plural(p.years, "year") + ". Net cost is cash out, less whatever the car is still worth."
    });

    out.push({
      k: "The lease re-signs", v: plural(Math.ceil(p.years * 12 / p.lterm), "time"),
      tone: "warn",
      d: usd(p.ldown + p.lfees) + " of down payment and fees falls due at every signing — " +
         usd((p.ldown + p.lfees) * Math.ceil(p.years * 12 / p.lterm)) + " across " + plural(p.years, "year") +
         ", none of which buys any equity."
    });

    if (w.payoff && w.payoff <= p.years * 12) {
      out.push({
        k: "The loan ends", v: "Year " + (Math.round(w.payoff / 12 * 10) / 10), tone: "good",
        d: "After that the car costs " + usd(w.carryM) + " a month to keep, while the lease keeps charging " +
           usd(w.rentM0) + ". Everything past this point is where buying earns its case."
      });
    } else {
      out.push({
        k: "Still owing at " + plural(p.years, "year"), v: usd(w.snap.bal), tone: "warn",
        d: "The loan runs past the period you chose, so the comparison is being made before the cheap years arrive."
      });
    }

    out.push({
      k: "What the car is worth at the end", v: usd(w.snap.hv), tone: "flat",
      d: "From " + usd(p.price) + " today. That figure is the whole asset side of buying — worth checking against real listings."
    });

    /* the resale figure that would tip it */
    const need = tip(p, "resale5", 0, p.price * 1.2);
    if (need === null && buyWins && !tie) {
      out.push({
        k: "Buying still wins at a resale of", v: "$0", tone: "good",
        d: "Even if the car were worth nothing at the end, buying would still cost less than leasing over " +
           plural(p.years, "year") + ". The case here does not depend on resale value at all."
      });
    } else if (need !== null && !tie) {
      out.push({
        k: buyWins ? "Buying stops winning below" : "Buying would need a 5-year resale of",
        v: usd(need), tone: "flat",
        d: "Assumed at " + usd(p.resale5) + " now. At " + usd(need) +
           " the two paths cost the same over " + plural(p.years, "year") + "."
      });
    }

    if (p.miles > 0) {
      out.push({
        k: "Excess mileage over " + plural(p.years, "year"), v: usd(p.miles * p.mrate * p.years), tone: "warn",
        d: p.miles.toLocaleString("en-US") + " miles a year over the cap at " + usd(p.mrate) +
           " a mile. It is billed at the end of every term, not spread over it."
      });
    }

    let title;
    if (tie) title = "Nothing to separate them on these assumptions.";
    else if (buyWins && w.cross && w.cross <= 1) title = "Buying costs less from the first month.";
    else if (buyWins) title = "Buying costs less by year " + (Math.round(w.cross / 12 * 10) / 10) + ".";
    else title = "Leasing costs less over " + plural(p.years, "year") + " on these assumptions.";
    return { title: title, list: out };
  }

  function readsHome(p, w) {
    const out = [];
    const tie = Math.abs(w.gap) < 1;
    const rentWins = w.gap > 0;
    const A = MODE === "car" ? "Leasing" : "Renting";
    const a = MODE === "car" ? "leasing" : "renting";

    out.push({
      k: "Break-even", tone: w.cross ? "good" : "warn",
      v: w.cross ? "Year " + (Math.round(w.cross / 12 * 10) / 10) : "Not within " + M().maxYears + " yrs",
      d: w.cross
        ? "That is when buying's equity finally passes " + a + " and investing the difference. Before it, the entry costs are still being paid off."
        : "On these assumptions buying never overtakes " + a + " inside " + M().maxYears + " years. The entry costs and the carrying costs are too heavy to catch up."
    });

    out.push({
      k: tie ? "At " + p.years + " years" : "At " + p.years + " years, " + (rentWins ? a + " is ahead by" : "buying is ahead by"),
      v: tie ? "Line ball" : usd(Math.abs(w.gap)), tone: tie ? "flat" : (rentWins ? "warn" : "good"),
      d: "Financial position of " + usd(w.snap.a) + " against " + usd(w.snap.b) + ". Not cash spent — what you'd be holding."
    });

    /* what the growth assumption would have to be to flip it */
    if (p.price > 0) {
      const asDep = MODE === "car";
      if (!rentWins) {
        const dropTo = tip(p, "appr", p.appr - 0.25, p.appr);
        out.push({
          k: asDep ? "Buying stops winning above" : "Buying stops winning below",
          v: dropTo === null ? "Holds up" : (asDep ? (-dropTo * 100).toFixed(1) : (dropTo * 100).toFixed(1)) + "%",
          tone: "flat",
          d: dropTo === null
            ? "Buying wins right across the range tested, so this answer is not resting on the growth assumption."
            : (asDep
                ? "Losing value faster than " + (-dropTo * 100).toFixed(1) + "% a year instead of " +
                  (-p.appr * 100).toFixed(1) + "% would flip it."
                : "If the home grew below " + (dropTo * 100).toFixed(1) + "% a year instead of " +
                  (p.appr * 100).toFixed(1) + "%, the answer flips.")
        });
      } else {
        const needAppr = tip(p, "appr", p.appr, p.appr + 0.25);
        out.push({
          k: asDep ? "Depreciation would have to slow to" : "Appreciation would have to reach",
          v: needAppr === null ? "Out of range"
             : (asDep && needAppr > 0) ? "Out of reach"
             : (asDep ? (-needAppr * 100).toFixed(1) : (needAppr * 100).toFixed(1)) + "%",
          tone: "flat",
          d: needAppr === null
            ? "Even strong growth does not flip this inside the range tested — the gap is being driven by cost, not by the asset."
            : (asDep && needAppr > 0)
              ? "The car would have to gain value rather than lose it for buying to win at " + p.years +
                " years. On these numbers the lease is simply cheaper."
            : (asDep
                ? "Assumed at " + (-p.appr * 100).toFixed(1) + "% a year now. It would have to fall to " +
                  (-needAppr * 100).toFixed(1) + "% for the two paths to land together at " + p.years + " years."
                : "Assumed at " + (p.appr * 100).toFixed(1) + "% a year now. At " + (needAppr * 100).toFixed(1) +
                  "% the two paths land in the same place at " + p.years + " years.")
        });
      }
    }

    /* what the entry costs are, in months */
    const entry = p.down + p.close;
    out.push({
      k: "Cost to get in", v: usd(entry), tone: "flat",
      d: usd(p.down) + " down and " + usd(p.close) + " in " + (MODE === "car" ? "fees" : "closing costs") +
        ". That's " + Math.round(entry / Math.max(1, w.rentM0)) + " months of " + (MODE === "car" ? "lease payments" : "rent") +
        " sitting in the deal instead of invested."
    });

    /* the carrying cost nobody counts */
    out.push({
      k: "Owning costs beyond the loan", v: usd(w.carryM) + " / mo", tone: "flat",
      d: (MODE === "car" ? "Registration, insurance and maintenance" : "Tax, insurance, HOA and maintenance") +
        " — " + usd(w.carryM * 12) + " a year that builds no equity. That is " +
        (w.buyM0 > 0 ? Math.round(w.carryM / w.buyM0 * 100) : 0) + "% of the monthly cost of owning."
    });

    if (w.payoff && w.payoff <= p.years * 12) {
      out.push({
        k: "The loan ends", v: "Year " + (Math.round(w.payoff / 12 * 10) / 10), tone: "good",
        d: "After that the monthly cost of owning drops to " + usd(w.carryM) + " while " + a +
          " keeps rising. That is where the second half of the case for buying comes from."
      });
    } else if (w.costCross) {
      out.push({
        k: (MODE === "car" ? "Lease" : "Rent") + " passes the payment", v: "Year " + (Math.round(w.costCross / 12 * 10) / 10),
        tone: "flat",
        d: "Up to then " + a + " is cheaper every month. After it the buyer's payment is the smaller one, because the loan payment does not rise and " + a + " does."
      });
    }

    let title;
    if (tie) title = "Nothing to separate them on these assumptions.";
    else if (!w.cross) title = A + " stays ahead the whole way on these assumptions.";
    else if (w.cross <= p.years * 12) title = "Buying pulls ahead in year " + (Math.round(w.cross / 12 * 10) / 10) + " — inside the period you chose.";
    else title = "Buying does pull ahead, but not until year " + (Math.round(w.cross / 12 * 10) / 10) + ".";
    return { title: title, list: out };
  }

  /* ============================================================
     render
     ============================================================ */
  function labels() {
    const m = M();
    const car = MODE === "car";
    $("bnEyebrow").textContent = m.eyebrow;
    $("bnTitle").textContent = m.title;
    $("bnLead").textContent = m.lead;
    $("railHome").hidden = car;
    $("railCar").hidden = !car;
    $("hdAL").textContent = m.hdA;
    $("hdBL").textContent = m.hdB;
    $("colAHead").textContent = m.colA;
    $("colBHead").textContent = m.colB;
    $("keyA").textContent = m.keyA;
    $("keyB").textContent = m.keyB;
    $("posATag").textContent = m.tagA;
    $("posBTag").textContent = m.tagB;
    $("keyQ").textContent = m.keyQ;
    $("crossTitle").textContent = m.crossTitle;
    $("forgetChips").innerHTML = m.forget.map(function (f) { return "<li>" + f + "</li>"; }).join("");
    document.querySelector(".rb-forget .later-head h2").textContent =
      car ? "What People Often Forget About Leasing or Buying a Car"
          : "What People Often Forget About Buying a Home";
    document.querySelectorAll('.rb-versus .vs footer span [data-term], .rb-versus .vs footer span')
      .forEach(function () {});

    if (!car) {
      $("legA").textContent = m.legA;
      $("legB").textContent = m.legB;
      $("labRent").textContent = m.rent;
      $("labRIns").textContent = m.rins;
      $("labRInc").textContent = m.rinc;
      $("labPrice").textContent = m.price;
      $("labDown").textContent = m.down;
      $("labRate").textContent = m.rate;
      $("labTerm").textContent = m.term;
      $("labTax").innerHTML = m.tax;
      $("labBIns").textContent = m.bins;
      $("labHoa").textContent = m.hoa;
      $("labMaint").textContent = m.maint;
      $("labClose").textContent = m.close;
      $("labAppr").textContent = m.appr;
      $("labAppr").setAttribute("data-term", m.apprTerm);
      $("labAppr").parentNode.removeAttribute("data-term");
      $("labSell").textContent = m.sell;
      const sel = $("bTerm"), cur = parseFloat(sel.value);
      sel.innerHTML = m.terms.map(function (t) {
        return '<option value="' + t + '">' + t + " years</option>";
      }).join("");
      sel.value = m.terms.indexOf(cur) >= 0 ? String(cur) : String(m.defaults.bTerm);
    }

    const sl = $("rYears");
    sl.max = String(m.maxYears);
    if (parseFloat(sl.value) > m.maxYears) sl.value = String(m.defaults.rYears);

    $("modeHome").classList.toggle("on", !car);
    $("modeCar").classList.toggle("on", car);
  }

  function rows(list, el) {
    el.innerHTML = list.map(function (r) {
      return '<li' + (r.total ? ' class="is-total"' : '') + '><span></span><b></b></li>';
    }).join("");
    const li = el.querySelectorAll("li");
    list.forEach(function (r, k) {
      li[k].querySelector("span").innerHTML = r.k;
      li[k].querySelector("b").textContent = r.v;
    });
  }

  function run() {
    const p = read();
    const w = work(p);
    const m = M();
    const car = MODE === "car";
    const tie = Math.abs(w.gap) < 1;
    /* gap > 0 always means path A (renting / leasing) is the better outcome,
       except in car mode where the measure is cost, so A better = A cheaper */
    /* is path A — renting or leasing — the better outcome?
       home: gap is a position, so A better when positive.
       car:  gap is a cost, so A better when NEGATIVE (A costs less). */
    const aWins = w.gap > 0;
    const aBetter = car ? (w.gap < 0) : (w.gap > 0);
    const A = car ? "Leasing" : "Renting";

    /* ---- the banner ---- */
    $("bnLabel").textContent = "AFTER " + p.years + (p.years === 1 ? " YEAR" : " YEARS");
    if (tie) {
      $("bnBig").textContent = "Line ball";
      $("bnSub").textContent = "the two paths land in the same place";
    } else if (car) {
      $("bnBig").textContent = aBetter ? "Leasing costs less" : "Buying costs less";
      $("bnSub").textContent = "by " + usd(Math.abs(w.gap)) + " of total net cost";
    } else {
      $("bnBig").textContent = aWins ? A + " is ahead" : "Buying is ahead";
      $("bnSub").textContent = "by " + usd(Math.abs(w.gap)) + " of projected financial position";
    }
    $("bnBig").parentNode.classList.toggle("is-short", !tie && aBetter);

    /* ---- the three heads ---- */
    $("hdA").textContent = usd(w.rentM0);
    $("hdB").textContent = usd(w.buyM0);
    $("hdD").textContent = usd(Math.abs(w.diff));
    $("hdDS").textContent = w.diff >= 0
      ? "more to buy each month"
      : "more to " + (car ? "lease" : "rent") + " each month";
    $("hdD").parentNode.classList.toggle("is-flip", w.diff < 0);

    /* ---- the picture ---- */
    $("crossWrap").innerHTML = chart(p, w);
    if (car) {
      $("crossLead").textContent = w.cross && w.cross <= 1
        ? "Net cost is cash out less what the car is still worth. Buying is the cheaper line from the first month."
        : (w.cross
            ? "Net cost is cash out less what the car is still worth. Buying becomes the cheaper line in year " +
              (Math.round(w.cross / 12 * 10) / 10) + "."
            : "Net cost is cash out less what the car is still worth. Leasing stays cheaper across the whole period.");
    } else {
      $("crossLead").textContent = w.cross
        ? "Both paths start from the same day. Buying overtakes in year " +
          (Math.round(w.cross / 12 * 10) / 10) + "."
        : "Both paths start from the same day. Buying does not overtake inside " + m.maxYears +
          " years on these assumptions.";
    }
    $("yearsOut").textContent = p.years + (p.years === 1 ? " year" : " years");
    const sl = $("rYears");
    sl.style.setProperty("--fill", ((sl.value - sl.min) / (sl.max - sl.min) * 100).toFixed(1) + "%");

    /* ---- the monthly columns ---- */
    if (car) {
      rows([
        { k: "Monthly payment", v: usd(p.lease) },
        { k: "Down &amp; fees spread monthly", v: usd(w.spreadM) },
        { k: "Est. mileage charges", v: usd(w.mileM) },
        { k: "Effective monthly cost", v: usd(w.rentM0), total: true }
      ], $("colA"));
      rows([
        { k: "Loan payment", v: usd(w.pi) },
        { k: "Maintenance", v: usd(w.carryM) },
        { k: "Tax &amp; fees, financed", v: "in the loan" },
        { k: "Effective monthly cost", v: usd(w.buyM0), total: true }
      ], $("colB"));
    } else {
      rows([
        { k: "Rent", v: usd(p.rent) },
        { k: "Renter's insurance", v: usd(p.rins) },
        { k: "Total monthly cost", v: usd(w.rentM0), total: true }
      ], $("colA"));
      const bl = [{ k: "Principal &amp; interest", v: usd(w.pi) },
                  { k: "Property tax", v: usd(p.tax / 12) },
                  { k: "Insurance", v: usd(p.bins / 12) },
                  { k: "HOA", v: usd(p.hoa) },
                  { k: "Maintenance", v: usd(p.maint / 12) },
                  { k: "Est. tax savings", v: "−" + usd(p.taxsav / 12) },
                  { k: "Total monthly cost", v: usd(w.buyM0), total: true }];
      rows(bl, $("colB"));
    }

    /* ---- position at the horizon ---- */
    const yl = p.years + (p.years === 1 ? " Year" : " Years");
    $("posAHead").textContent = m.posA + " " + yl;
    $("posBHead").textContent = m.posB + " " + yl;
    $("posA").textContent = usd(w.snap.a);
    $("posB").textContent = usd(w.snap.b);
    $("posAFoot").textContent = usd(w.snap.a);
    $("posBFoot").textContent = usd(w.snap.b);
    if (car) {
      rows([
        { k: "Total cash paid", v: usd(w.snap.acash) },
        { k: "Vehicle owned at end", v: "No" },
        { k: "Value you keep", v: usd(0) }
      ], $("posALines"));
      rows([
        { k: "Total cash paid", v: usd(w.snap.bcash) },
        { k: "Loan remaining", v: usd(w.snap.bal) },
        { k: "Estimated vehicle value", v: usd(w.snap.hv) }
      ], $("posBLines"));
      document.querySelectorAll(".rb-versus footer span").forEach(function (el) {
        el.textContent = "Estimated net cost";
      });
    } else {
      rows([
        { k: m.cashA, v: usd(w.snap.acash) },
        { k: "Invested, and what it grew to", v: usd(w.snap.a) },
        { k: "Asset value owned", v: usd(0) }
      ], $("posALines"));
      rows([
        { k: m.cashB, v: usd(w.snap.bcash) },
        { k: m.oweB, v: usd(w.snap.bal) },
        { k: m.assetB, v: usd(w.snap.hv) }
      ], $("posBLines"));
      document.querySelectorAll(".rb-versus footer span").forEach(function (el) {
        el.textContent = "Estimated financial position";
      });
    }

    $("posA").parentNode.classList.toggle("is-short", !tie && !aBetter);
    $("posB").parentNode.classList.toggle("is-warn", !tie && aBetter);

    const dl = $("vsDelta");
    dl.innerHTML = tie ? "dead<b>heat</b>"
      : (car ? (aBetter ? "leasing saves" : "buying saves") : (aBetter ? "ahead by" : "behind by")) +
        "<b>" + usd0(Math.abs(w.gap)) + "</b>";
    dl.className = "vs-delta " + (tie ? "" : (aBetter ? "is-bad" : "is-good"));

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

    /* ---- the live fact at the foot of each side ---- */
    if (car) {
      $("factCAL").textContent = "Every month, all in";
      $("factCA").textContent = usd(w.rentM0);
      $("factCBL").textContent = w.payoff ? "Once the loan ends" : "Every month, all in";
      $("factCB").textContent = w.payoff ? usd(w.carryM) : usd(w.buyM0);
    } else {
      $("factAL").textContent = "Rent in year " + p.years;
      $("factA").textContent = usd(p.rent * Math.pow(1 + p.rinc, p.years - 1) + p.rins);
      $("factBL").textContent = "Every month, all in";
      $("factB").textContent = usd(w.buyM0);
    }

    /* ---- the little notes under the fields ---- */
    if (car) {
      $("cTermNote").textContent = "Due again at every renewal — " +
        Math.ceil(p.years * 12 / p.lterm) + " times over " + p.years + " years.";
      $("cLoanNote").textContent = "Financed with the price and the tax: loan of " + usd(w.loan) + ".";
      $("cResaleNote").textContent = "At " + p.years + " years this works out at " + usd(w.snap.hv) + ".";
    } else {
      $("downPct").textContent = p.price > 0
        ? (p.down / p.price * 100).toFixed(1) + "% of the price" : "—";
    }

    /* ---- say it ---- */
    let say;
    if (car) {
      if (tie) {
        say = "“On these numbers there's nothing in it. So the decision isn't financial — it's whether you'd rather keep a car or keep changing one.”";
      } else if (aWins) {
        say = "“Over " + plural(p.years, "year") + ", buying costs about " + usd(Math.abs(w.gap)) +
              " less. The lease is cheaper every month and you hand the car back with nothing to show for it.”";
      } else {
        say = "“On these numbers the lease actually costs less over " + plural(p.years, "year") +
              " — the car loses value faster than the loan pays down. Worth knowing before we assume owning is always cheaper.”";
      }
    } else if (!w.cross) {
      say = "“On your own numbers, buying never catches up inside " + m.maxYears +
            " years. That isn't an argument against buying — it's an argument for knowing what you're buying it for.”";
    } else if (w.cross <= p.years * 12) {
      say = "“Buying pulls ahead in year " + (Math.round(w.cross / 12 * 10) / 10) + ". You said " + p.years +
            " years, so on these assumptions it's worth doing — as long as you're still there when it happens.”";
    } else {
      say = "“Buying does win — in year " + (Math.round(w.cross / 12 * 10) / 10) + ". You're planning on " +
            p.years + ". That's the whole conversation right there: how long are you really staying?”";
    }
    $("sayIt").textContent = say;

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = { mode: MODE }; FIELDS.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    if (s.mode === "car" || s.mode === "home") MODE = s.mode;
    labels();
    FIELDS.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
  }
  function applyDefaults() {
    const d = M().defaults;
    FIELDS.forEach(function (f) { if (d[f] !== undefined) $(f).value = d[f]; });
    $("rYears").value = d.rYears;
  }

  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", run);
    $(f).addEventListener("change", run);
  });
  function setMode(next) {
    if (MODE === next) return;
    MODE = next;
    labels();
    applyDefaults();
    run();
  }
  $("modeHome").addEventListener("click", function () { setMode("home"); });
  $("modeCar").addEventListener("click", function () { setMode("car"); });

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
    applyDefaults();
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
    const p = read(), w = work(p), m = M();
    const btn = $("sendBtn"), old = btn.innerHTML;
    const A = MODE === "car" ? "LEASING" : "RENTING";
    const lines = [m.title + " — WEALTHDEMO", ""];
    if (MODE === "car") {
      lines.push("LEASING",
        "  Monthly payment        " + usd(p.lease),
        "  Down + fees per term   " + usd(p.ldown + p.lfees) + "  (" + p.lterm + " months)",
        "  Effective monthly      " + usd(w.rentM0), "",
        "BUYING",
        "  Vehicle price          " + usd(p.price),
        "  Down payment           " + usd(p.down),
        "  Loan (price + tax + fees − down)  " + usd(w.loan),
        "  Loan payment           " + usd(w.pi),
        "  Maintenance            " + usd(w.carryM) + " / mo",
        "  Effective monthly      " + usd(w.buyM0), "",
        "AFTER " + p.years + " YEARS",
        "  Leasing — cash paid    " + usd(w.snap.acash),
        "  Leasing — net cost     " + usd(w.snap.a),
        "  Buying  — cash paid    " + usd(w.snap.bcash),
        "  Buying  — vehicle value " + usd(w.snap.hv),
        "  Buying  — net cost     " + usd(w.snap.b),
        "  " + (w.gap > 0 ? "Buying costs less by " : "Leasing costs less by ") + usd(Math.abs(w.gap)), "");
    } else {
      lines.push("RENTING",
        "  Monthly rent           " + usd(p.rent),
        "  Monthly total          " + usd(w.rentM0),
        "  Rising                 " + (p.rinc * 100).toFixed(1) + "% a year", "",
        "BUYING",
        "  Price                  " + usd(p.price),
        "  Down + entry costs     " + usd(w.entry),
        "  Principal & interest   " + usd(w.pi),
        "  Carrying costs         " + usd(w.carryM) + " / mo",
        "  Monthly total          " + usd(w.buyM0), "",
        "AFTER " + p.years + " YEARS",
        "  " + m.posA + "  " + usd(w.snap.a),
        "  " + m.posB + "  " + usd(w.snap.b),
        "  " + (w.gap > 0 ? "Renting" : "Buying") + " ahead by " + usd(Math.abs(w.gap)), "",
        "BREAK-EVEN  " + (w.cross ? "year " + (Math.round(w.cross / 12 * 10) / 10)
                                  : "not within " + m.maxYears + " years"), "");
    }
    const rd = reads(p, w);
    lines.push("READING THE COMPARISON", "  " + rd.title, "");
    rd.list.forEach(function (r) { lines.push("  " + r.k + ": " + r.v, "    " + r.d); });
    lines.push("", $("sayIt").textContent, "",
      "Educational estimate only. Results depend entirely on the assumptions entered and do not account for every tax rule, deduction, financing term, repair, transaction cost, insurance change, vehicle wear, lease restriction or market condition. Home tax benefits vary by individual situation. Investment growth, home appreciation and vehicle resale values are not guaranteed. Consult a licensed professional before acting on any of this.");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  labels();
  load();
  labels();
  run();
})();
