/* ============================================================
   WEALTHDEMO — the Tax Blueprint's engine, tax year 2026

   One function, compute(figures), and nothing else does tax
   arithmetic on the page. Every finding and every lever is this
   function run again on a patched copy of the figures — the same
   rule as the scorecards: never model anything twice.

   It must agree with taxref.py (the Python reference) to the cent;
   a drift test runs both over thousands of random returns.

   The rules, each checked against the IRS, Rev. Proc. 2025-32 or
   the statute:

     Standard deduction  S 16,100 · MFJ 32,200 · MFS 16,100 · HoH 24,150 · QSS = MFJ
     Brackets            BR below; HoH per Rev. Proc. 2025-32
     Long-term gains     LT below; MFS 15% top is half of joint (statute)
     SE tax              15.3% of 92.35% of profit; SS part capped at 184,500 less wages
     Additional Medicare 0.9% over 250k MFJ / 125k MFS / 200k others
     NIIT                3.8% over the same thresholds
     SALT                40,400 (MFS 20,200), less 30% of MAGI over 505,000 (252,500),
                         never below 10,000 (5,000)
     Charity             itemisers: only above 0.5% of AGI;
                         everyone else: cash up to 1,000 (MFJ 2,000) — see CHARITY_REDUCES_AGI
     Medical             above 7.5% of AGI
     QBI                 20% of (profit − ½SE − SEP), capped at 20% of (taxable − net gain)
     CTC / ODC           2,200 per child (1,700 refundable) / 500; −50 per 1,000 of AGI
                         over 400k MFJ, 200k others
     AOTC                100% of first 2,000 + 25% of next 2,000 a student, 40% refundable;
                         phases out 80–90k (S, HoH), 160–180k (MFJ, QSS); none if MFS
     SEP                 up to 20% of (profit − ½SE)

   Not modelled — the page says so rather than pretending: the 35%
   cap on itemised deductions in the 37% bracket, QBI limits above
   the threshold, capital losses, AMT.
   ============================================================ */
(function () {
  const STD = { single: 16100, mfj: 32200, mfs: 16100, hoh: 24150, qss: 32200 };
  const BR = {
    single: [12400, 50400, 105700, 201775, 256225, 640600],
    mfj:    [24800, 100800, 211400, 403550, 512450, 768700],
    mfs:    [12400, 50400, 105700, 201775, 256225, 384350],
    hoh:    [17700, 67450, 105700, 201775, 256200, 640600]
  };
  BR.qss = BR.mfj;
  const RATES = [.10, .12, .22, .24, .32, .35, .37];
  const LT = { single: [49450, 545500], mfj: [98900, 613700], mfs: [49450, 306850],
               hoh: [66200, 579600], qss: [98900, 613700] };
  const SS_BASE = 184500;
  const AOTC_RANGE = { single: [80000, 90000], hoh: [80000, 90000],
                       mfj: [160000, 180000], qss: [160000, 180000], mfs: null };

  /* The one 2026 rule the sources disagree on. Practitioner articles call
     the non-itemiser charity deduction "above the line"; none quotes the
     statute. Modelled as coming off AFTER AGI, as the 2021 version did —
     the cautious choice, because AGI is what phases the tuition credit out.
     Flip this, and taxref.py's, if a preparer confirms otherwise. */
  const CHARITY_REDUCES_AGI = false;

  function c2(x) {
    return x >= 0 ? Math.floor(x * 100 + 0.5) / 100 : -Math.floor(-x * 100 + 0.5) / 100;
  }
  function num(v) { const n = +v; return isFinite(n) ? n : 0; }

  function ordinaryTax(amount, s) {
    let tax = 0, lo = 0;
    const tops = BR[s].concat([Infinity]);
    for (let i = 0; i < RATES.length; i++) {
      if (amount <= lo) break;
      tax += (Math.min(amount, tops[i]) - lo) * RATES[i];
      lo = tops[i];
    }
    return tax;
  }

  function ltTax(ordinary, pref, s) {
    const z = LT[s][0], f = LT[s][1], top = ordinary + pref;
    const at15 = Math.max(0, Math.min(top, f) - Math.max(ordinary, z));
    const at20 = Math.max(0, top - Math.max(ordinary, f));
    return at15 * .15 + at20 * .20;
  }

  function compute(input) {
    const i = input || {};
    const s = STD[i.status] ? i.status : "mfj";
    const wages = num(i.wages), profit = Math.max(0, num(i.profit));
    const interest = num(i.interest), qdiv = num(i.qdiv), ltcg = Math.max(0, num(i.ltcg));

    let net = profit * .9235;
    if (net < 400) net = 0;
    const ss = Math.min(net, Math.max(0, SS_BASE - wages)) * .124;
    const se = ss + net * .029;
    const half = se / 2;
    const sepLimit = Math.max(0, .20 * (profit - half));
    const sep = Math.min(Math.max(0, num(i.sep)), sepLimit);

    const mt = s === "mfj" ? 250000 : s === "mfs" ? 125000 : 200000;
    const addMed = .009 * Math.max(0, wages - mt) + .009 * Math.max(0, net - Math.max(0, mt - wages));

    let agi = wages + profit + interest + qdiv + ltcg - half - sep;

    const isMfs = s === "mfs";
    const floor = isMfs ? 5000 : 10000;
    const cap = Math.max(floor, (isMfs ? 20200 : 40400) - .30 * Math.max(0, agi - (isMfs ? 252500 : 505000)));
    const salt = Math.min(num(i.proptax) + num(i.statetax), cap);
    const med = Math.max(0, num(i.medical) - .075 * agi);
    const charity = num(i.charity);
    const charItem = Math.max(0, charity - .005 * agi);
    const itemised = num(i.mort) + salt + med + charItem;
    const std = STD[s];
    const useItem = itemised > std;
    const deduction = useItem ? itemised : std;
    const charStd = useItem ? 0 : Math.min(charity, s === "mfj" ? 2000 : 1000);
    if (CHARITY_REDUCES_AGI) agi -= charStd;

    const beforeQbi = Math.max(0, agi - deduction - (CHARITY_REDUCES_AGI ? 0 : charStd));
    const prefAll = qdiv + ltcg;
    const qbiBase = Math.max(0, profit - half - sep);
    const qbi = Math.min(.20 * qbiBase, .20 * Math.max(0, beforeQbi - prefAll));
    const taxable = Math.max(0, beforeQbi - qbi);

    const pref = Math.min(prefAll, taxable);
    const ordinary = taxable - pref;
    const incomeTax = ordinaryTax(ordinary, s) + ltTax(ordinary, pref, s);

    const niit = .038 * Math.max(0, Math.min(interest + qdiv + ltcg, agi - mt));

    const kids = Math.max(0, Math.floor(num(i.kids)));
    const others = Math.max(0, Math.floor(num(i.otherDeps)));
    const students = Math.max(0, Math.floor(num(i.students)));
    const ct = s === "mfj" ? 400000 : 200000;
    const cut = 50 * Math.ceil(Math.max(0, agi - ct) / 1000);
    const ctc = Math.max(0, kids * 2200 + others * 500 - cut);

    const tuition = num(i.tuition);
    const per = Math.min(tuition, 2000) + .25 * Math.min(Math.max(tuition - 2000, 0), 2000);
    const aotcFull = students * per;
    const rng = AOTC_RANGE[s];
    let aotc;
    if (!rng) aotc = 0;
    else if (agi <= rng[0]) aotc = aotcFull;
    else if (agi >= rng[1]) aotc = 0;
    else aotc = aotcFull * (rng[1] - agi) / (rng[1] - rng[0]);

    const aotcRef = .40 * aotc;
    const aotcNon = aotc - aotcRef;
    let room = incomeTax;
    const useAotc = Math.min(aotcNon, room); room -= useAotc;
    const useCtc = Math.min(ctc, room); room -= useCtc;
    const earned = wages + Math.max(0, net);
    const kidPart = Math.min(kids * 2200, ctc);
    const actc = Math.max(0, Math.min(ctc - useCtc, Math.min(kidPart, kids * 1700), .15 * Math.max(0, earned - 2500)));

    const total = (incomeTax - useAotc - useCtc) + se + addMed + niit - aotcRef - actc;
    const paid = num(i.withheld) + num(i.estimated);

    let bracket = 0;
    BR[s].forEach(function (b) { if (ordinary > b) bracket++; });

    return {
      status: s, agi: c2(agi), se: c2(se), half: c2(half), sep: c2(sep), sepLimit: c2(sepLimit),
      addMed: c2(addMed), niit: c2(niit), itemised: c2(itemised), std: std, useItem: useItem,
      charStd: c2(charStd), salt: c2(salt), qbi: c2(qbi), taxable: c2(taxable),
      incomeTax: c2(incomeTax), ctc: c2(ctc), aotc: c2(aotc), aotcFull: c2(aotcFull),
      aotcLost: c2(aotcFull - aotc), total: c2(total), paid: c2(paid), due: c2(total - paid),
      marg: RATES[bracket], aotcRange: rng,
      topBracket: RATES[bracket] === .37
    };
  }

  window.WD = window.WD || {};
  window.WD.tax = { compute: compute, STD: STD, AOTC_RANGE: AOTC_RANGE, CHARITY_REDUCES_AGI: CHARITY_REDUCES_AGI };
  if (typeof module !== "undefined") module.exports = window.WD.tax;
})();
