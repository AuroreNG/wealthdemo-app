/* ============================================================
   WEALTHDEMO — "Will My Social Security Be Taxed?"
   IRS provisional-income test, worked live as you type.

   Provisional income = other income + tax-free interest + half
   of the Social Security benefit. It is compared against two
   thresholds that depend on filing status.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("ssIncome")) return;

  const THRESHOLDS = {
    single: { base: 25000, top: 34000, label: "Single / HOH / Qualifying Surviving Spouse" },
    joint:  { base: 32000, top: 44000, label: "Married Filing Jointly" },
    sep:    { base: 0,     top: 0,     label: "Married Filing Separately — lived with spouse" }
  };

  const DEFAULTS = { filing: "single", bracket: "22", ssIncome: 36000, qualified: 30000, other: 0, taxFree: 0, extra: 10000 };
  const STORE = "wealthdemo.tool.ss";

  const money = function (n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  };
  const num = function (id) {
    const v = parseFloat($(id).value);
    return isFinite(v) && v > 0 ? v : 0;
  };

  /* ---------- the test itself ---------- */
  function taxableSS(ss, otherIncome, filing) {
    const t = THRESHOLDS[filing] || THRESHOLDS.single;
    const provisional = otherIncome + ss / 2;

    let taxable;
    if (provisional <= t.base) {
      taxable = 0;
    } else if (provisional <= t.top) {
      taxable = Math.min(0.5 * (provisional - t.base), 0.5 * ss);
    } else {
      const firstTier = Math.min(0.5 * (t.top - t.base), 0.5 * ss);
      taxable = Math.min(0.85 * (provisional - t.top) + firstTier, 0.85 * ss);
    }
    return { provisional: provisional, taxable: Math.max(0, taxable), band: t };
  }

  function bandOf(provisional, t) {
    if (provisional <= t.base) return "low";
    if (provisional <= t.top) return "mid";
    return "high";
  }

  /* ---------- render ---------- */
  function run() {
    const filing = $("filing").value;
    const rate = parseFloat($("bracket").value) / 100;
    const ss = num("ssIncome");
    const otherIncome = num("qualified") + num("other") + num("taxFree");

    const now = taxableSS(ss, otherIncome, filing);
    const tax = now.taxable * rate;
    const pct = ss > 0 ? (now.taxable / ss) * 100 : 0;
    const band = bandOf(now.provisional, now.band);

    $("outProvisional").textContent = money(now.provisional);
    $("outTaxable").textContent = money(now.taxable);
    $("outTax").textContent = money(tax);

    /* meter */
    $("meterFlag").textContent = Math.round(pct) + "% currently taxable";
    const pos = Math.max(1.5, Math.min(98.5, pct));
    $("meterDot").style.left = pos + "%";
    $("meterFlag").style.left = pos + "%";

    /* verdict */
    const verdict = $("verdict");
    verdict.setAttribute("data-band", band);
    const titles = {
      low:  "You’re in the lower range.",
      mid:  "You’re in the middle range.",
      high: "You’re in the higher range."
    };
    const notes = {
      low:  "None of your benefits look taxable at this income.",
      mid:  "Up to half of your benefits may be taxable.",
      high: "A portion of your benefits may be taxable."
    };
    $("verdictTitle").textContent = titles[band];
    $("verdictNote").textContent = notes[band];

    /* key insight — the one thing worth doing next */
    const gapToBase = now.band.base - now.provisional;
    const gapToTop = now.band.top - now.provisional;
    let iTitle = titles[band];
    let iBody;

    if (filing === "sep") {
      iBody = "Filing separately while living with your spouse removes both thresholds, so benefits are taxed from the first dollar of other income. Filing jointly is usually worth comparing.";
    } else if (band === "low") {
      iBody = "None of your Social Security is taxable yet. You have about " + money(Math.max(0, gapToBase)) +
              " of extra income before the first threshold is crossed — useful room for a Roth conversion or a larger withdrawal this year.";
    } else if (band === "mid") {
      iBody = "You are " + money(Math.max(0, gapToTop)) + " below the 85% threshold. Keeping withdrawals under that line this year holds more of your benefit out of taxable income.";
    } else {
      const drop = Math.max(0, now.provisional - now.band.top);
      iTitle = "You’re in the higher range.";
      iBody = "You are " + money(drop) + " past the 85% threshold. Taking more retirement income from tax-advantaged sources — Roth withdrawals or cash savings — could help reduce your tax bill.";
    }
    $("insightTitle").textContent = iTitle;
    $("insightBody").textContent = iBody;

    /* what if */
    const extra = num("extra");
    const later = taxableSS(ss, otherIncome + extra, filing);
    const moreSS = Math.max(0, later.taxable - now.taxable);
    const addedIncome = extra + moreSS;

    $("outMoreSS").textContent = money(moreSS);
    $("outAddedIncome").textContent = money(addedIncome);
    $("outAddedTax").textContent = money(addedIncome * rate);

    save();
  }

  /* ---------- persistence ---------- */
  const FIELDS = ["filing", "bracket", "ssIncome", "qualified", "other", "taxFree", "extra"];

  function save() {
    const out = {};
    FIELDS.forEach(function (f) { out[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(out)); } catch (err) {}
  }

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (err) {}
    if (!saved) return;
    FIELDS.forEach(function (f) {
      if (typeof saved[f] === "string" && saved[f] !== "") $(f).value = saved[f];
    });
  }

  /* prefill from the Blueprint when it knows the person's numbers */
  function seedFromBlueprint() {
    let m = null;
    try { m = JSON.parse(localStorage.getItem("wealthdemo.progress.v2") || "null"); } catch (err) {}
    if (!m) return;
    const map = { ssIncome: ["socialSecurity", "ssIncome"], qualified: ["retirementIncome", "pensionIncome"] };
    Object.keys(map).forEach(function (id) {
      map[id].forEach(function (key) {
        const v = parseFloat(m[key]);
        if (isFinite(v) && v > 0 && !$(id).dataset.touched) $(id).value = v;
      });
    });
  }

  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", function () { $(f).dataset.touched = "1"; run(); });
    $(f).addEventListener("change", run);
  });

  /* ---------- topbar actions ---------- */
  const moreBtn = $("moreBtn");
  const moreMenu = $("moreMenu");
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = moreMenu.hasAttribute("hidden");
      moreMenu.toggleAttribute("hidden", !open);
      moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function () {
      moreMenu.setAttribute("hidden", "");
      moreBtn.setAttribute("aria-expanded", "false");
    });
    moreMenu.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  const printBtn = $("printBtn");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  const resetBtn = $("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      FIELDS.forEach(function (f) { $(f).value = DEFAULTS[f]; delete $(f).dataset.touched; });
      moreMenu.setAttribute("hidden", "");
      run();
    });
  }

  const sendBtn = $("sendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", function () {
      const lines = [
        "Will My Social Security Be Taxed? — WEALTHDEMO",
        "",
        "Filing status: " + (THRESHOLDS[$("filing").value] || {}).label,
        "Tax bracket: " + $("bracket").value + "%",
        "Social Security received: " + money(num("ssIncome")),
        "401(k), IRA & pension income: " + money(num("qualified")),
        "Other income: " + money(num("other")),
        "Tax-free interest: " + money(num("taxFree")),
        "",
        "Income used for tax test: " + $("outProvisional").textContent,
        "Social Security that may be taxable: " + $("outTaxable").textContent,
        "Estimated tax impact: " + $("outTax").textContent,
        "",
        $("insightTitle").textContent + " " + $("insightBody").textContent,
        "",
        "Simplified estimate — not a complete tax return. Consult a qualified tax professional."
      ].join("\n");

      const done = function (msg) {
        const old = sendBtn.innerHTML;
        sendBtn.classList.add("is-done");
        sendBtn.textContent = msg;
        setTimeout(function () { sendBtn.innerHTML = old; sendBtn.classList.remove("is-done"); }, 2600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lines).then(
          function () { done("Summary copied — paste it to your client"); },
          function () { done("Copy blocked by the browser"); }
        );
      } else {
        done("Summary ready");
      }
    });
  }

  load();
  seedFromBlueprint();
  run();
})();
