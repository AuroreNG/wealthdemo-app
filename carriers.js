/* ============================================================
   WEALTHDEMO — Preferred Carrier Underwriting Navigator

   Data source: the WEALTHDEMO Preferred Carrier Underwriting
   Navigator workbook. Every claim below is carried across
   verbatim from that sheet, with its own source link and
   as-of date attached, and nothing has been added to it.

   A rule only screens automatically where the workbook marks
   it publicly verified. Everywhere else the navigator says
   which guide to open instead of guessing — final underwriting
   depends on the exact product, state, application date,
   medical records, Rx history, MIB, MVR, financial
   justification and the carrier's underwriter.
   ============================================================ */
window.WD = window.WD || {};

(function () {

  /* ---------- product paths ---------- */
  const PATHS = [
    { id: "life",      label: "Term / permanent life", sub: "Medical underwriting",       kind: "life" },
    { id: "iul",       label: "Indexed universal life", sub: "Medical + financial review", kind: "life" },
    { id: "fe",        label: "Final expense",          sub: "Simplified underwriting",    kind: "life" },
    { id: "fia",       label: "Fixed indexed annuity",  sub: "Suitability review",         kind: "annuity" },
    { id: "rila",      label: "RILA",                   sub: "Suitability review",         kind: "annuity" },
    { id: "immediate", label: "Immediate annuity",      sub: "Suitability review",         kind: "annuity" }
  ];

  /* ---------- what the intake must capture ----------
     Straight from the Case Intake sheet: the question, and why
     it matters. A flagged condition turns into the exact detail
     an underwriter will ask for.                              */
  const CONDITIONS = [
    { id: "tobacco",  label: "Tobacco / nicotine",
      capture: "Type, frequency and last-use date — each can change the rate class." },
    { id: "diabetes", label: "Diabetes",
      capture: "Type, age at diagnosis, latest A1c, complications and medications." },
    { id: "bp",       label: "Blood pressure / cholesterol",
      capture: "Readings, whether treated, and how well controlled." },
    { id: "heart",    label: "Heart or vascular history",
      capture: "Diagnosis, procedure, date, testing, current symptoms and follow-up." },
    { id: "cancer",   label: "Cancer history",
      capture: "Type, stage, treatment end date, any recurrence and current surveillance." },
    { id: "mental",   label: "Mental health / substance history",
      capture: "Diagnosis, treatment, any hospitalisation, stability and dates." },
    { id: "rx",       label: "Current prescriptions",
      capture: "Full list — pharmacy history affects both automated and manual review." },
    { id: "driving",  label: "Driving / criminal history",
      capture: "Recent violations, DUI or legal history may affect eligibility." },
    { id: "foreign",  label: "Foreign travel / residency",
      capture: "Destination, duration, immigration status and the state's own rules." },
    { id: "build",    label: "Build outside standard",
      capture: "Height and weight — drives the rate class or a decline." },
    { id: "cognitive", label: "Cognitive impairment / ADLs",
      capture: "Relevant to simplified-issue and final-expense knockout questions." }
  ];

  /* ---------- rule status ---------- */
  const STATUS = {
    public:  { label: "Public limits verified", tone: "good",
               note: "A published limit exists and is screened below. The impairment guide is still required." },
    guide:   { label: "Agent guide required",   tone: "warn",
               note: "No complete public underwriting manual. Open the carrier's current guide before quoting a class." },
    issuer:  { label: "Issuer must be identified", tone: "warn",
               note: "A platform, not the underwriter. Capture the issuing carrier and exact product first." },
    product: { label: "Product guide required",  tone: "warn",
               note: "Suitability and availability are product- and state-specific." }
  };

  /* ---------- the documented carriers ---------- */
  const DOCUMENTED = [
    {
      id: "corebridge", name: "Corebridge Financial",
      use: "Final expense and life insurance",
      ruleType: "Life medical / simplified underwriting",
      paths: ["fe", "life"],
      verified: "Corebridge publicly states that its streamlined term application may produce an underwriting decision and delivery within 24–48 hours. Exact final-expense knockout questions and rate classes are product-specific.",
      focus: ["Age", "Tobacco", "Build", "Prescriptions", "Major cardiac / cancer history", "Diabetes", "Cognitive impairment", "ADLs", "MIB / Rx / MVR"],
      status: "guide",
      fastTrack: "Streamlined term: decision and delivery may come within 24–48 hours.",
      nextAction: "Open Connext and download the current final-expense product and underwriting guide for the applicant's state.",
      source: "https://www.corebridgefinancial.com/", asOf: "09/15/2026"
    },
    {
      id: "fg", name: "F&G",
      use: "Retirement IUL and Million Dollar Baby IUL",
      ruleType: "Life medical / accelerated or full underwriting",
      paths: ["iul"],
      verified: "F&G offers life and annuity products. Public consumer material does not provide the complete condition-by-condition IUL underwriting manual.",
      focus: ["Age and face amount", "Build", "Tobacco", "Diabetes control", "Cardiovascular history", "Cancer history", "Labs", "Financial justification", "Foreign travel / residency"],
      status: "guide",
      nextAction: "Use the F&G agent portal and select the exact IUL product before quoting or presenting a likely class.",
      source: "https://www.fglife.com/", asOf: "09/15/2026"
    },
    {
      id: "ethos", name: "Ethos",
      use: "Digital term and IUL access",
      ruleType: "Platform rules plus issuing-carrier underwriting",
      paths: ["life", "iul"],
      verified: "Ethos explains that automated underwriting evaluates application answers and data sources. Manual underwriting can require an application, medical exam, medical records, lifestyle review, and financial review. Ethos is a platform; the issuing carrier and product control the final rules.",
      focus: ["Age", "Health and medication history", "Family history", "Tobacco / alcohol / drugs", "Hazardous activities", "Coverage amount and financial profile"],
      status: "issuer",
      nextAction: "Capture the exact Ethos product and issuing carrier shown before treating an approval rule as final.",
      source: "https://www.ethos.com/life-insurance/life-insurance-underwriting/", asOf: "09/15/2026"
    },
    {
      id: "ameritas", name: "Ameritas",
      use: "Term life with living benefits",
      ruleType: "Life medical / accelerated or full underwriting",
      paths: ["life"],
      verified: "Ameritas offers term and permanent life insurance and living-benefit features. Its public site does not publish a complete impairment manual or all accelerated-underwriting limits.",
      focus: ["Age", "Face amount", "Build", "Tobacco", "Blood pressure / lipids", "Diabetes", "Cardiac / cancer history", "Medications", "Labs and financial need"],
      status: "guide",
      nextAction: "Download the current term product guide, accelerated-underwriting eligibility guide, and state rider availability from the professional portal.",
      source: "https://www.ameritas.com/", asOf: "09/15/2026"
    },
    {
      id: "foresters", name: "Foresters Financial",
      use: "Value-focused term life",
      ruleType: "Life medical / non-medical / accelerated underwriting",
      paths: ["life"],
      verified: "Effective April 26, 2026, Foresters states accelerated underwriting may be available up to $2,000,000 for ages 18–60 and up to $1,000,000 for ages 61–65. Smokers and applicants taking hypertension or cholesterol medication may be eligible. Final determination remains with underwriting.",
      focus: ["Age and amount limits", "Tobacco", "Treated blood pressure / lipids", "Diabetes", "Build", "Medical history", "Prescriptions", "MIB / Rx / MVR"],
      status: "public",
      /* the one rule in the workbook that can actually be screened */
      accelerated: {
        effective: "April 26, 2026",
        bands: [{ ageMin: 18, ageMax: 60, maxFace: 2000000 },
                { ageMin: 61, ageMax: 65, maxFace: 1000000 }],
        tolerates: ["tobacco", "bp"],
        toleratesNote: "Smokers and applicants taking hypertension or cholesterol medication may be eligible."
      },
      nextAction: "Use the current U.S. Underwriting Guide and product-specific pre-screen in iPipeline iGO before submission.",
      source: "https://ezbiz.foresters.com/", asOf: "09/15/2026"
    },
    {
      id: "americanequity", name: "American Equity",
      use: "Fixed, fixed-index and immediate annuities",
      ruleType: "Annuity suitability / best-interest review",
      paths: ["fia", "immediate"],
      verified: "American Equity's public site identifies fixed, fixed-index and immediate annuities. Medical life underwriting generally does not apply to an annuity purchase.",
      focus: ["Owner / annuitant issue age", "State and product availability", "Funding source", "Surrender period", "Liquidity", "Replacement", "Time horizon", "Income need", "Risk tolerance and suitability"],
      status: "product",
      nextAction: "Use the current product brochure, disclosure, state availability chart, suitability form, and replacement requirements.",
      source: "https://www.american-equity.com/", asOf: "09/15/2026"
    },
    {
      id: "allianz", name: "Allianz Life",
      use: "Fixed-index annuities, RILAs and IUL",
      ruleType: "Annuity suitability plus life underwriting for IUL",
      paths: ["fia", "rila", "iul"],
      verified: "Allianz publicly offers annuities and indexed universal life. Product and feature availability varies by state and distribution channel. Annuity cases use suitability/best-interest review; Allianz IUL cases use life underwriting.",
      focus: ["Annuity: issue age, source of funds, liquidity, replacement, surrender horizon, income need and risk tolerance", "IUL: medical, lifestyle, financial and face-amount review"],
      status: "product",
      nextAction: "Identify whether the case is an Allianz annuity or IUL, then use that product's current professional guide and state forms.",
      source: "https://www.allianzlife.com/", asOf: "09/15/2026"
    }
  ];

  /* ---------- the rest of the partner board ----------
     On the credibility board but not yet in the workbook.
     Listed so nobody thinks they were forgotten, and held out
     of screening until someone documents them.               */
  const ROSTER = [
    "North American", "AuguStar Financial", "Mutual of Omaha", "Symetra", "Banner Life",
    "John Hancock", "American National", "Lincoln Financial Group", "Prudential",
    "Global Atlantic Financial Group", "SILAC Insurance Company", "National Western Life",
    "Nassau", "BMI", "OneAmerica Financial", "Securian Financial", "EquiTrust",
    "Pan-American Life Insurance Group", "SBLI", "American-Amicable", "United Home Life",
    "TruStage", "Security Mutual Life"
  ].map(function (n) {
    return {
      id: n.toLowerCase().replace(/[^a-z0-9]+/g, ""), name: n,
      use: "", ruleType: "", paths: [], verified: "", focus: [],
      status: "guide", nextAction: "", source: "", asOf: "",
      undocumented: true
    };
  });

  /* ---------- local overrides ---------- */
  const KEY = "wealthdemo.carriers.v2";

  function load() {
    const base = DOCUMENTED.concat(ROSTER).map(function (c) { return JSON.parse(JSON.stringify(c)); });
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (err) {}
    if (!Array.isArray(saved)) return base;
    return base.map(function (c) {
      const hit = saved.find(function (s) { return s.id === c.id; });
      if (!hit) return c;
      ["paths", "status", "nextAction", "source", "asOf", "use", "ruleType",
       "notes", "tier", "exclude", "undocumented"].forEach(function (k) {
        if (hit[k] !== undefined) c[k] = hit[k];
      });
      return c;
    });
  }

  function save(list) {
    const slim = list.map(function (c) {
      return { id: c.id, paths: c.paths, status: c.status, nextAction: c.nextAction,
               source: c.source, asOf: c.asOf, use: c.use, ruleType: c.ruleType,
               notes: c.notes || "", tier: c.tier || "", exclude: c.exclude || [],
               undocumented: !!c.undocumented };
    });
    try { localStorage.setItem(KEY, JSON.stringify(slim)); } catch (err) {}
  }

  /* ---------- screening ---------- */
  function usd(n) { return n == null ? "—" : "$" + Number(n).toLocaleString("en-US"); }

  function screen(carrier, c) {
    /* c: the case — path, age, amount, state, conditions[] */
    const out = { carrier: carrier, inPath: false, notes: [], checks: [], blockers: [] };

    if (carrier.undocumented) {
      out.undocumented = true;
      return out;
    }
    if (carrier.paths.indexOf(c.path) === -1) return out;
    out.inPath = true;

    if (carrier.exclude && c.state && carrier.exclude.indexOf(c.state) > -1) {
      out.blockers.push("You cannot write " + c.state + " with this carrier");
    }

    /* the one publicly verified rule that can be screened */
    if (carrier.accelerated && c.path === "life") {
      const a = carrier.accelerated;
      const band = a.bands.find(function (b) { return c.age >= b.ageMin && c.age <= b.ageMax; });
      if (!band) {
        out.checks.push({
          ok: false,
          title: "Outside the published accelerated-underwriting ages",
          detail: "Published bands run " + a.bands.map(function (b) { return b.ageMin + "–" + b.ageMax; }).join(" and ") +
                  ". At " + c.age + " this case falls outside them, so expect the full path."
        });
      } else if (c.amount > band.maxFace) {
        out.checks.push({
          ok: false,
          title: "Over the accelerated limit for this age",
          detail: "At age " + c.age + " the published limit is " + usd(band.maxFace) + ". This case is " +
                  usd(c.amount) + " — " + usd(c.amount - band.maxFace) + " over. Either reduce the face or plan for full underwriting."
        });
      } else {
        out.checks.push({
          ok: true,
          title: "Within the published accelerated-underwriting limit",
          detail: "At age " + c.age + " the published limit is " + usd(band.maxFace) + " and this case is " +
                  usd(c.amount) + ". Effective " + a.effective + ". Final determination still rests with underwriting."
        });
        const tolerated = (c.conditions || []).filter(function (x) { return a.tolerates.indexOf(x) > -1; });
        if (tolerated.length) {
          out.checks.push({ ok: true, title: "Flags this carrier publicly says may still qualify", detail: a.toleratesNote });
        }
      }
    }

    if (carrier.fastTrack && (c.path === "life" || c.path === "fe")) {
      out.notes.push(carrier.fastTrack);
    }

    return out;
  }

  function navigate(list, c) {
    const path = PATHS.find(function (p) { return p.id === c.path; });
    const kind = path ? path.kind : "life";
    const all = list.map(function (x) { return screen(x, c); });

    return {
      kind: kind,
      inPath: all.filter(function (r) { return r.inPath && !r.blockers.length; }),
      blocked: all.filter(function (r) { return r.inPath && r.blockers.length; }),
      undocumented: all.filter(function (r) { return r.undocumented; }),
      offPath: all.filter(function (r) { return !r.inPath && !r.undocumented; })
    };
  }

  /* what the agent must capture, given what they ticked */
  function captureList(conditions) {
    return CONDITIONS.filter(function (x) { return (conditions || []).indexOf(x.id) > -1; });
  }

  WD.nav = {
    PATHS: PATHS, CONDITIONS: CONDITIONS, STATUS: STATUS,
    DOCUMENTED: DOCUMENTED, ROSTER: ROSTER,
    load: load, save: save, navigate: navigate, screen: screen,
    captureList: captureList, usd: usd,
    DISCLAIMER: "Use this as a pre-screening navigator. Final underwriting decisions depend on the exact product, state, application date, medical records, prescription history, MIB data, motor vehicle records, financial justification, and the carrier underwriter."
  };
})();
