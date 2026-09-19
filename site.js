/* ============================================================
   WEALTHDEMO — tools hub
   Renders the calculator catalogue, search and filters.
   Live tools deep-link into the Financial Blueprint.
   ============================================================ */
(function () {
  const ICONS = {
    leaf: '<path d="M19 5c0 7.2-3.6 11-9 11-2 0-3.5-.6-3.5-.6S6 9 12.5 7.5"/><path d="M5.5 19c.7-2.6 1.8-4.6 3.2-6.2"/>',
    chart: '<path d="M5 19V11"/><path d="M12 19V5.5"/><path d="M19 19v-5.5"/>',
    shield: '<path d="M12 3.5 5.5 6.2v5.1c0 4 2.7 7.6 6.5 9.2 3.8-1.6 6.5-5.2 6.5-9.2V6.2Z"/>',
    home: '<path d="m4 11 8-6.5 8 6.5"/><path d="M6.5 10v9.5h11V10"/>',
    doc: '<path d="M8 3.5h5.5L18 8v12.5H8Z"/><path d="M13.5 3.5V8H18"/><path d="M10.5 12.5h5M10.5 16h5"/>',
    cap: '<path d="M12 4.5 21 9l-9 4.5L3 9Z"/><path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11"/>',
    clock: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v4l2.6 1.6"/>',
    coins: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v4.5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 11.5V16c0 1.7 3.1 3 7 3s7-1.3 7-3v-4.5"/>',
    target: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/>',
    trend: '<path d="M4 16.5 10 10l3.5 3L20 6"/><path d="M15 6h5v5"/>',
    heart: '<path d="M12 20s-6.5-3.9-6.5-8.6A3.7 3.7 0 0 1 12 8.6a3.7 3.7 0 0 1 6.5 2.8C18.5 16.1 12 20 12 20Z"/>',
    wallet: '<rect x="3.5" y="6.5" width="17" height="12" rx="2.5"/><path d="M16 12.5h2"/>',
    hourglass: '<path d="M7 4h10"/><path d="M7 20h10"/><path d="M8 4c0 4 4 4.5 4 8s-4 4-4 8"/><path d="M16 4c0 4-4 4.5-4 8s4 4 4 8"/>',
    pct: '<path d="M7 17 17 7"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/>',
    calendar: '<rect x="4.5" y="6" width="15" height="13.5" rx="2.5"/><path d="M4.5 10.5h15"/><path d="M9 4.5V7M15 4.5V7"/>',
    grid: '<circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><circle cx="8" cy="16" r="2.6"/><circle cx="16" cy="16" r="2.6"/>'
  };

  const CATEGORIES = [
    {
      name: "Before the meeting", note: "Send it out, get it back filled in.", icon: "calendar", tint: "mint", agentOnly: true,
      tools: [
        { name: "Send an Assessment", icon: "calendar", href: "send.html",
          desc: "Three minutes on their phone. Their numbers, and a prep sheet, before you sit down." }
      ]
    },
    {
      name: "Placement", note: "Match the client to the company.", icon: "shield", tint: "sage", agentOnly: true,
      tools: [
        { name: "Carrier Navigator", icon: "shield", href: "carriers.html",
          desc: "Pre-screen a case against what each carrier actually publishes." }
      ]
    },
    {
      name: "Planning", note: "One guided conversation.", icon: "target", tint: "mint", hideInGrid: true,
      tools: [
        { name: "Financial Blueprint", icon: "target", href: "blueprint.html",
          desc: "Your whole financial picture in seven guided steps." }
      ]
    },
    /* ------------------------------------------------------------
       Four, not six.

       Retirement, Wealth & Growth and College & Life Setup were three
       headings over one idea — money you are growing, keeping or
       making last — and splitting them meant a client's whole
       financial life was scattered across three squares. They are one
       now. "Will My Social Security Be Taxed?" moved with them into
       Taxes, where it always belonged: it is a tax question wearing a
       retirement hat.

       Four squares also fit one clean row on a phone, which six never
       did.
       ------------------------------------------------------------ */
    {
      name: "Money", note: "Grow it, keep it, make it last.", icon: "coins", tint: "mint",
      tools: [
        { name: "Retirement Readiness Scorecard", icon: "target", href: "form.html?f=retire-ready",
          desc: "Whether what they are putting away actually reaches what they want to spend." },
        { name: "Retirement Withdrawal Calculator", icon: "chart", href: "withdraw.html",
          desc: "How long your savings last at the pace you spend." },
        { name: "Retirement Account Match-Up", icon: "coins", href: "accounts.html",
          desc: "Which account should the money come out of, and what it costs." },
        { name: "Family Bank Goal Calculator", icon: "target", href: "family.html",
          desc: "Short-, mid- and long-term goals on one timeline \u2014 and whether one account covers all three." },
        { name: "Rule of 72", icon: "pct", href: "rule72.html",
          desc: "Two clocks are always running. See which one is winning." },
        { name: "Cost of Waiting", icon: "hourglass", href: "waiting.html",
          desc: "Same money, started later. See what the delay takes." },
        { name: "What a Loss Really Costs", icon: "trend", href: "loss.html",
          desc: "Fall 30% and you need 42.9% back. See why." },
        { name: "Family College Funding Calculator", icon: "cap", href: "college.html",
          desc: "The whole degree by the year they start \u2014 and the monthly number that gets you there." },
        { name: "529 Plan Growth Estimator", icon: "chart", href: "plan529.html",
          desc: "Project the balance \u2014 and what the tax break is worth against a taxable account." },
        { name: "Build Their Future", icon: "target", href: "future.html",
          desc: "Savings, a 529 and permanent life insurance side by side \u2014 what job the money is for." }
      ]
    },
    {
      name: "Taxes", note: "When you pay, and how much.", icon: "doc", tint: "sun",
      tools: [
        { name: "Tax Document Checklist", icon: "doc", href: "form.html?f=tax-docs",
          desc: "What this household has to send you — and nothing that does not apply to them." },
        { name: "Will My Social Security Be Taxed?", icon: "clock", href: "tool.html",
          desc: "See how much of your benefit the IRS can reach." },
        { name: "When Do You Want to Pay Taxes?", icon: "calendar", href: "taxes.html",
          desc: "Pay now, pay later, or pay first \u2014 the same money under three timings." },
        { name: "Tax Impact on Your Investments", icon: "doc", href: "taximpact.html",
          desc: "How much of what you own is taxed now, later, or not at all." },
        { name: "Tax Penalty Impact", icon: "pct", href: "penalty.html",
          desc: "What an early withdrawal costs in income tax and in penalty." },
        { name: "State Tax Comparison", icon: "home", href: "states.html",
          desc: "What moving states would really cost \u2014 income, property and sales tax together." }
      ]
    },
    {
      name: "Real Estate", note: "Buy, hold, or pay it down.", icon: "home", tint: "sand",
      tools: [
        { name: "Mortgage Readiness Assessment", icon: "home", href: "form.html?f=mortgage-ready",
          desc: "Whether a lender would take this file today, and what is standing in the way." },
        { name: "Borrower Document Checklist", icon: "doc", href: "form.html?f=borrower-docs",
          desc: "Only the documents this borrower has to produce — and what is still outstanding." },
        { name: "Buyer Readiness Assessment", icon: "target", href: "form.html?f=buyer-ready",
          desc: "Whether this buyer can transact, before you spend six Saturdays on them." },
        { name: "Prequalification Tracker", icon: "chart", href: "form.html?f=prequal",
          desc: "Everyone in the pipeline, and which stage each of them is stuck at." },
        { name: "Rent vs. Buy", icon: "home", href: "rentbuy.html",
          desc: "The year buying finally pulls ahead \u2014 or whether it does." },
        { name: "Mortgage Payoff Strategy", icon: "chart", href: "mortgage.html",
          desc: "A policy loan against the mortgage \u2014 and the fair test of it." },
        { name: "Debt Payoff & Interest Calculator", icon: "pct", href: "debt.html",
          desc: "The cost of the debt, what paying more does, and whether consolidating helps." }
      ]
    },
    {
      name: "Protection", note: "What happens if it stops.", icon: "shield", tint: "rose",
      tools: [
        { name: "Estate Document Checklist", icon: "heart", href: "form.html?f=estate-docs",
          desc: "What this family should have signed, and what is missing." },
        { name: "Policy Review Tracker", icon: "shield", href: "form.html?f=policy-review",
          desc: "Which policies are due a look, and where each conversation got to." },
        { name: "How Much Life Insurance", icon: "shield", href: "dime.html",
          desc: "Four things to pay for, less what you already have." },
        { name: "What Would You Leave Behind?", icon: "heart", href: "legacy.html",
          desc: "What an estate looks like on paper, and what really arrives." },
        { name: "If the Paycheck Stopped", icon: "wallet", href: "paycheck.html",
          desc: "Month by month, who pays the bills \u2014 and when it gets tight." }
      ]
    }
  ];

  const VISIBLE = function () {
    const agent = window.WD && window.WD.isAgent && window.WD.isAgent();
    return CATEGORIES.filter(function (c) { return agent || !c.agentOnly; });
  };

  const ALL_TOOLS = CATEGORIES.filter(function (c) { return !c.agentOnly; }).reduce(function (list, cat) {
    cat.tools.forEach(function (t) {
      list.push({ name: t.name, icon: t.icon, desc: t.desc || "", cat: cat.name, tint: cat.tint, href: t.href });
    });
    return list;
  }, []);
  /* ============================================================
     Who is using this

     The same engine serves three professions. They all need the
     identical four things — advise simply, send an assessment,
     collect the answers, communicate securely — so none of that
     is duplicated. What differs is only which calculators are in
     front of them.

     Deliberately broad, because a title is not a job:
       · financial   — planning, wealth management, insurance and
                       protection all sit here
       · tax         — CPA, EA, preparer
       · realestate  — agents, brokers and mortgage loan officers,
                       which is why it is "professional", not "agent"

     A tool may belong to more than one. State Tax Comparison is a
     tax tool and a real-estate tool, because property tax is half
     of what it answers, and pretending otherwise would hide it
     from the person who needs it most.

     Adding a fourth profession is one entry here plus its tools'
     tags. Nothing else in the file knows how many there are.
     ============================================================ */
  const PROFESSIONS = [
    { id: "financial",  name: "Financial professional",
      note: "Planning, wealth management, insurance and protection." },
    { id: "tax",        name: "Tax professional",
      note: "CPAs, EAs and preparers \u2014 the timing and the bill." },
    { id: "realestate", name: "Real estate professional",
      note: "Agents, brokers and mortgage loan officers." }
  ];

  const PRO = {
    "withdraw.html":  ["financial"],
    "accounts.html":  ["financial"],
    "rule72.html":    ["financial", "realestate"],
    "waiting.html":   ["financial"],
    "loss.html":      ["financial"],
    "family.html":    ["financial"],
    "future.html":    ["financial"],
    "college.html":   ["financial"],
    "plan529.html":   ["financial", "tax"],
    "dime.html":      ["financial"],
    "legacy.html":    ["financial", "tax"],
    "paycheck.html":  ["financial"],
    "carriers.html":  ["financial"],

    "tool.html":      ["tax", "financial"],
    "taxes.html":     ["tax", "financial"],
    "taximpact.html": ["tax", "financial"],
    "penalty.html":   ["tax", "financial"],
    "states.html":    ["tax", "realestate"],

    "rentbuy.html":   ["realestate"],
    "mortgage.html":  ["realestate", "financial"],
    "debt.html":      ["realestate", "financial"],

    /* the form engine's tools. They are keyed by the whole href, query
       string included, because that is what render() puts in the link. */
    "form.html?f=mortgage-ready": ["realestate", "financial"],
    "form.html?f=borrower-docs":  ["realestate"],
    "form.html?f=buyer-ready":    ["realestate"],
    "form.html?f=prequal":        ["realestate"],
    "form.html?f=retire-ready":   ["financial"],
    "form.html?f=tax-docs":       ["tax"],
    "form.html?f=policy-review":  ["financial"],
    "form.html?f=estate-docs":    ["financial", "tax"],

    /* the workflow pieces belong to everyone */
    "send.html":      ["financial", "tax", "realestate"],
    "blueprint.html": ["financial", "tax", "realestate"]
  };

  const PRO_KEY = "wealthdemo.pro";
  function pro() {
    try {
      const v = localStorage.getItem(PRO_KEY);
      return PROFESSIONS.some(function (p) { return p.id === v; }) ? v : "all";
    } catch (e) { return "all"; }
  }
  function setPro(id) {
    try { localStorage.setItem(PRO_KEY, id); } catch (e) {}
  }
  /* an untagged tool is shown to everyone rather than hidden from everyone —
     a new calculator should never vanish because somebody forgot a tag */
  function forPro(href, who) {
    if (who === "all") return true;
    const tags = PRO[href];
    return !tags || tags.indexOf(who) >= 0;
  }

  window.WD = window.WD || {};
  window.WD.professions = PROFESSIONS;
  window.WD.pro = pro;

  /* what the bar counts is what the banner must count: calculators you can
     press in the grid, which is neither the adviser's two nor the Blueprint */
  const TOOL_COUNT = CATEGORIES.reduce(function (n, c) {
    return (c.hideInGrid || c.agentOnly) ? n : n + (c.tools || []).length;
  }, 0);
  /* the Studio needs the same list to grant one tool at a time, and this is
     the only place it is defined — a second copy would go stale the first
     time a tool is added */
  window.WD = window.WD || {};
  window.WD.catalogue = CATEGORIES;
  window.WD.allTools = ALL_TOOLS;
  const PER_TOOL = 14.99;
  const SUITE = 89.99;

  const SORTS = {
    featured: function (a, b) { return 0; },
    az: function (a, b) { return a.name.localeCompare(b.name); },
    live: function (a, b) { return (b.href ? 1 : 0) - (a.href ? 1 : 0); }
  };

  const grid = document.getElementById("toolGrid");
  const filters = document.getElementById("toolFilters");
  const search = document.getElementById("toolSearch");
  const count = document.getElementById("toolCount");
  const empty = document.getElementById("toolEmpty");

  let active = "All";
  let query = "";
  let sort = "featured";

  function icon(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.chart) + '</svg>';
  }

  function render() {
    if (!grid) return;
    const q = query.trim().toLowerCase();
    grid.innerHTML = "";
    let shown = 0;

    /* Four columns while you are browsing; a plain grid of results the
       moment you narrow to one category or start typing, because at that
       point the column headings are telling you what you already know. */
    const narrow = active !== "All" || !!q;
    grid.classList.toggle("is-one", narrow);

    /* ---------- the adviser's own two, kept out of the calculator grid ----

       "Before the meeting" and "Placement" are not calculators. They are
       things you do around a client, and standing them in the grid as
       one-tool categories made them look like the runts of a list they
       do not belong to. They get their own strip, above everything, in
       the adviser's own colour. */
    const strip = document.getElementById("adviserRow");
    if (strip) {
      strip.innerHTML = "";
      CATEGORIES.filter(function (c) { return c.agentOnly; }).forEach(function (cat) {
        (cat.tools || []).forEach(function (t) {
          if (!forPro(t.href, pro())) return;
          const a = document.createElement("a");
          a.className = "adv-card";
          a.href = t.href || "#";
          a.innerHTML =
            '<span class="adv-ico">' + icon(cat.icon) + "</span>" +
            "<span class=\"adv-text\"><b></b><small></small></span>" +
            '<svg class="adv-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg>';
          a.querySelector("b").textContent = t.name;
          a.querySelector("small").textContent = t.desc || cat.note || "";
          strip.appendChild(a);
        });
      });
    }

    /* ---------- one tile per calculator ----------

       It used to be a box per category holding a plain list of names —
       boxes inside boxes, and the one-line description each tool already
       carries was never shown. Now the category is a quiet heading and
       every calculator is its own tile with its own sentence, which is
       both less furniture and more information. */
    VISIBLE().forEach(function (cat) {
      if (cat.hideInGrid || cat.agentOnly) return;
      if (active !== "All" && cat.name !== active) return;
      const who = pro();
      const tools = cat.tools.filter(function (t) {
        if (!forPro(t.href, who)) return false;
        return !q || t.name.toLowerCase().indexOf(q) > -1 ||
               (t.desc || "").toLowerCase().indexOf(q) > -1 ||
               cat.name.toLowerCase().indexOf(q) > -1;
      }).slice().sort(SORTS[sort] || SORTS.featured);
      if (!tools.length) return;
      shown += tools.length;

      const sec = document.createElement("section");
      sec.className = "cat";
      sec.setAttribute("data-tint", cat.tint || "mint");
      sec.innerHTML =
        '<header class="cat-head">' +
          '<span class="cat-ico">' + icon(cat.icon) + "</span>" +
          "<h3></h3><p></p>" +
          '<span class="cat-n">' + tools.length + "</span>" +
        '</header><div class="cat-grid"></div>';
      sec.querySelector("h3").textContent = cat.name;
      sec.querySelector("p").textContent = cat.note;
      /* the pressed square above already names it */
      if (active !== "All") sec.querySelector(".cat-head").hidden = true;

      const box = sec.querySelector(".cat-grid");
      tools.forEach(function (t) {
        const a = document.createElement("a");
        a.className = "calc" + (t.href ? "" : " soon");
        a.href = t.href || "#";
        if (!t.href) a.addEventListener("click", function (e) { e.preventDefault(); });
        /* One photograph per column, on the card at the top of it. A picture
           on all twenty-eight would be a wall of stock imagery and would cost
           more to load than the whole rest of the page. */
        a.innerHTML =
          '<span class="calc-ico">' + icon(t.icon) + "</span>" +
          '<b class="calc-name"></b>' +
          '<span class="calc-desc"></span>' +
          (t.href ? '<span class="calc-go">Open<svg viewBox="0 0 24 24" aria-hidden="true">' +
                    '<path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg></span>'
                  : '<span class="calc-go soon">Soon</span>');
        a.querySelector(".calc-name").textContent = t.name;
        a.querySelector(".calc-desc").textContent = t.desc || "";
        box.appendChild(a);
      });

      grid.appendChild(sec);
    });

    if (empty) empty.hidden = shown > 0;
    if (count) {
      const total = TOOL_COUNT;
      count.textContent = (q || active !== "All")
        ? shown + " of " + total + " calculators"
        : total + " calculators";
    }
  }

  /* ---------- search, sort, account ---------- */
  const navSearch = document.getElementById("navSearch");
  const sortSelect = document.getElementById("toolSort");

  if (navSearch) {
    navSearch.addEventListener("input", function () {
      query = navSearch.value;
      if (search) search.value = query;
      render();
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", function () { sort = sortSelect.value; render(); });
  }
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      (navSearch && navSearch.offsetParent !== null ? navSearch : search).focus();
    }
  });

  const accountBtn = document.getElementById("accountBtn");
  const accountMenu = document.getElementById("accountMenu");
  if (accountBtn && accountMenu) {
    accountBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = accountMenu.hasAttribute("hidden");
      accountMenu.toggleAttribute("hidden", !open);
      accountBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function () {
      accountMenu.setAttribute("hidden", "");
      accountBtn.setAttribute("aria-expanded", "false");
    });
    accountMenu.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  // greet by name: the Blueprint's first name if it is there, otherwise the address
  (function greet() {
    const nameEl = document.getElementById("accountName");
    const initialsEl = document.getElementById("accountInitials");
    if (!nameEl) return;
    let name = "";
    try {
      const saved = JSON.parse(localStorage.getItem("wealthdemo.progress.v2") || "{}");
      if (saved && typeof saved.firstName === "string") name = saved.firstName.trim();
    } catch (err) {}
    let email = "";
    try { email = localStorage.getItem("wealthdemo.session") || ""; } catch (err) {}
    if (!name && email) {
      name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    if (!name) name = "there";
    nameEl.textContent = name;
    if (initialsEl) {
      const parts = name.split(/\s+/).filter(Boolean);
      const domain = email.split("@")[1] || "";
      initialsEl.textContent = (parts.length > 1
        ? parts[0][0] + parts[1][0]
        : (parts[0] ? parts[0][0] : "W") + (domain ? domain[0] : "D")).toUpperCase();
    }
  })();

  /* The chooser. Three doors, switchable whenever they like, because one
     person genuinely can be a financial professional who also does taxes.
     It draws itself from PROFESSIONS, so a fourth needs no code here. */
  /* ------------------------------------------------------------
     The profession, as a control rather than a row.

     It used to be a band across the page with four buttons and
     four counts — a lot of furniture for a setting somebody
     changes about once. It now sits at the end of the bar and
     says only what it currently is; pressing it opens the list.
     ------------------------------------------------------------ */
  function buildChooser() {
    const btn = document.getElementById("proBtn");
    const pop = document.getElementById("proPop");
    if (!btn || !pop) return;

    const count = function (id) {
      let n = 0;
      CATEGORIES.forEach(function (cat) {
        if (cat.hideInGrid || cat.agentOnly) return;
        (cat.tools || []).forEach(function (t) { if (forPro(t.href, id)) n++; });
      });
      return n;
    };

    const who = pro();
    const me = PROFESSIONS.filter(function (p) { return p.id === who; })[0];
    const nameEl = document.getElementById("proBtnName");
    if (nameEl) nameEl.textContent = me ? me.name.replace(" professional", "") : "Everyone";

    pop.innerHTML = PROFESSIONS.map(function (p) {
      return '<button type="button" data-pro="' + p.id + '"' +
        (who === p.id ? ' aria-pressed="true"' : ' aria-pressed="false"') +
        '><b>' + p.name + '</b><small>' + p.note + ' \u00b7 ' + count(p.id) + ' tools</small></button>';
    }).join("") +
    '<button type="button" data-pro="all"' + (who === "all" ? ' aria-pressed="true"' : ' aria-pressed="false"') +
    '><b>Everyone</b><small>Every calculator on the site \u00b7 ' + count("all") + ' tools</small></button>';

    pop.querySelectorAll("[data-pro]").forEach(function (b2) {
      b2.addEventListener("click", function () {
        setPro(b2.getAttribute("data-pro"));
        pop.hidden = true;
        btn.setAttribute("aria-expanded", "false");
        active = "All";
        buildChooser();
        buildFilters();
        render();
      });
    });
  }

  /* opening and closing the list, once, however many times it is rebuilt */
  (function wirePro() {
    const btn = document.getElementById("proBtn");
    const pop = document.getElementById("proPop");
    if (!btn || !pop) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = pop.hidden;
      pop.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function () {
      pop.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    });
    pop.addEventListener("click", function (e) { e.stopPropagation(); });
  })();

  /* Categories as squares you can press.

     These used to be plain pills that listed the same names as the
     headings below them, which is why they were pulled. They are back as
     something that earns its place: each carries the category's own
     colour and icon, and pressing one narrows the page to that category
     alone — at which point its heading is hidden, because the pressed
     square is the heading. No name is ever on screen twice.

     They redraw whenever the profession changes, so a tax professional is
     never offered a category with nothing in it. */
  function buildFilters() {
    if (!filters) return;
    filters.hidden = false;
    filters.innerHTML = "";

    const who = pro();
    const live = VISIBLE().filter(function (c) {
      if (c.hideInGrid || c.agentOnly) return false;
      return (c.tools || []).some(function (t) { return forPro(t.href, who); });
    });
    if (live.every(function (c) { return c.name !== active; })) active = "All";

    const total = live.reduce(function (n, c) {
      return n + c.tools.filter(function (t) { return forPro(t.href, who); }).length;
    }, 0);

    /* One segment per category, plus Everything. No orb, no lozenge —
       a mark, a word and a figure, on the glass. */
    const seg = function (name, tint, ico, n, on) {
      const b2 = document.createElement("button");
      b2.type = "button";
      b2.className = "catbtn";
      b2.setAttribute("data-tint", tint || "mint");
      b2.setAttribute("aria-pressed", on ? "true" : "false");
      b2.innerHTML =
        '<span class="catbtn-ico">' + icon(ico) + "</span><b></b><small>" + n + "</small>";
      b2.querySelector("b").textContent = name;
      b2.addEventListener("click", function () {
        active = (active === name) ? "All" : name;
        buildFilters();
        render();
      });
      return b2;
    };

    filters.appendChild(seg("Everything", "", "grid", total, active === "All"));
    live.forEach(function (c) {
      const n = c.tools.filter(function (t) { return forPro(t.href, who); }).length;
      filters.appendChild(seg(c.name, c.tint, c.icon, n, active === c.name));
    });
  }

  buildChooser();
  buildFilters();

  document.addEventListener("wd:role", function () { buildFilters(); render(); });

  if (search) search.addEventListener("input", function () { query = search.value; render(); });

  render();

  /* ============================================================
     Free trial + billing
     ============================================================ */
  const TRIAL_DAYS = 7;
  const TRIAL_KEY = "wealthdemo.trial.start";

  function money(n) {
    return "$" + n.toFixed(2);
  }

  function daysLeft() {
    let start = 0;
    try { start = parseInt(localStorage.getItem(TRIAL_KEY) || "0", 10) || 0; } catch (err) {}
    if (!start) {
      start = Date.now();
      try { localStorage.setItem(TRIAL_KEY, String(start)); } catch (err) {}
    }
    const used = Math.floor((Date.now() - start) / 86400000);
    return Math.max(0, TRIAL_DAYS - used);
  }

  /* ---------- the trial, folded into the hero ----------

     It used to be a full-width strip between the hero and the tools,
     in a colour nothing else on the page used, saying a thing nobody
     needed twice. It is now a line inside the card already sitting in
     the hero — visible, not shouted. */
  const heroNote = document.getElementById("heroNote");
  if (heroNote) {
    const left = daysLeft();
    heroNote.innerHTML =
      "<b>A more<br>confident tomorrow</b><i></i>" +
      '<p><span class="trial-left"></span>' +
      (left === 0
        ? "Your trial has ended. Activate to keep all " + TOOL_COUNT + " tools."
        : "All " + TOOL_COUNT + " tools are unlocked. Activate before it ends to keep them.") +
      "</p>" +
      '<button type="button" class="hero-go" style="margin-top:16px" data-billing>See plans' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg>' +
      "</button>";
    heroNote.querySelector(".trial-left").textContent =
      left === 0 ? "Trial ended" : left + (left === 1 ? " day left" : " days left");
  }

  /* ---------- modal ---------- */
  let modal = null;
  let lastFocus = null;

  function toolRow(t) {
    const li = document.createElement("li");
    li.className = "bill-row";
    li.setAttribute("data-tint", t.tint || "mint");
    li.innerHTML =
      '<label class="bill-pick"><input type="checkbox"><span></span></label>' +
      '<span class="bill-ico">' + icon(t.icon) + '</span>' +
      '<div class="bill-text">' +
        '<b></b><span class="bill-tag"></span>' +
        '<p></p>' +
      '</div>' +
      '<span class="bill-price">' + money(PER_TOOL) + '<small>/mo</small></span>' +
      '<svg class="bill-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6l6 6-6 6"/></svg>';
    li.querySelector("b").textContent = t.name;
    li.querySelector(".bill-tag").textContent = t.cat;
    li.querySelector("p").textContent = t.desc;
    return li;
  }

  function buildModal() {
    const wrap = document.createElement("div");
    wrap.className = "bill-scrim";
    wrap.id = "billingModal";
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="bill-modal" role="dialog" aria-modal="true" aria-label="Billing and plans">' +
        '<header class="bill-top">' +
          '<a class="brand-identity" href="home.html">' +
            '<img src="wealthdemo-logo.webp" alt="" aria-hidden="true">' +
            '<span class="brand-wordmark"><strong>WEALTH<span>DEMO</span></strong>' +
            '<small>Plan Smarter. Live Brighter.</small></span>' +
          '</a>' +
          '<span class="bill-eyebrow">Financial tools for a brighter tomorrow</span>' +
          '<button type="button" class="bill-x" aria-label="Close">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>' +
          '</button>' +
        '</header>' +

        '<div class="bill-body">' +
          '<div class="bill-head">' +
            '<h2>Billing &amp; plans</h2>' +
            '<p>Powerful financial tools. A clearer tomorrow.</p>' +
          '</div>' +

          '<section class="bill-suite">' +
            '<svg class="bill-mark" viewBox="0 0 240 120" aria-hidden="true">' +
              '<circle cx="186" cy="40" r="20"/>' +
              '<path d="M8 104 62 44l30 34 26-30 46 56Z"/>' +
            '</svg>' +
            '<span class="bill-best">Best value</span>' +
            '<h3>Full suite — all ' + TOOL_COUNT + ' tools</h3>' +
            '<div class="bill-figure"><b>' + money(SUITE) + '</b><small>/month</small></div>' +
            '<p class="bill-compare">That’s just ' + money(SUITE / TOOL_COUNT) +
              ' per tool <em>(vs. ' + money(PER_TOOL) + ' individually)</em></p>' +
            '<button type="button" class="bill-go">Get full access' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg>' +
            '</button>' +
            '<ul class="bill-checks"></ul>' +
            '<span class="bill-watermark">A brighter financial tomorrow starts here.</span>' +
          '</section>' +

          '<div class="bill-split">' +
            '<span>Or choose individual tools</span>' +
            '<i></i>' +
            '<b>' + money(PER_TOOL) + '/mo each</b>' +
          '</div>' +

          '<ul class="bill-list"></ul>' +
        '</div>' +

        '<footer class="bill-foot">' +
          '<span class="bill-secure">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>' +
            'Secure billing · Cancel anytime · No long-term contract</span>' +
          '<span class="bill-sign">Same tools. A brighter tomorrow.</span>' +
        '</footer>' +
      '</div>';

    const checks = wrap.querySelector(".bill-checks");
    ["All " + TOOL_COUNT + " tools included", "One simple monthly price",
     "Cancel anytime", "Maximize your financial potential"].forEach(function (txt) {
      const li = document.createElement("li");
      li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg><span></span>';
      li.querySelector("span").textContent = txt;
      checks.appendChild(li);
    });

    const list = wrap.querySelector(".bill-list");
    ALL_TOOLS.forEach(function (t) { list.appendChild(toolRow(t)); });

    // running total as tools are ticked
    const goBtn = wrap.querySelector(".bill-go");
    const splitPrice = wrap.querySelector(".bill-split b");
    list.addEventListener("change", function () {
      const n = list.querySelectorAll("input:checked").length;
      splitPrice.textContent = n
        ? n + " selected · " + money(n * PER_TOOL) + "/mo"
        : money(PER_TOOL) + "/mo each";
      wrap.classList.toggle("has-picks", n > 0);
      if (n * PER_TOOL > SUITE) splitPrice.setAttribute("data-over", "");
      else splitPrice.removeAttribute("data-over");
    });

    goBtn.addEventListener("click", function () {
      goBtn.classList.add("is-done");
      goBtn.textContent = "Thanks — a demo, so nothing was charged.";
    });

    wrap.querySelector(".bill-x").addEventListener("click", closeBilling);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) closeBilling(); });
    document.body.appendChild(wrap);
    return wrap;
  }

  function openBilling() {
    if (!modal) modal = buildModal();
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("bill-open");
    requestAnimationFrame(function () { modal.classList.add("is-in"); });
    const x = modal.querySelector(".bill-x");
    if (x) x.focus();
  }

  function closeBilling() {
    if (!modal) return;
    modal.classList.remove("is-in");
    document.body.classList.remove("bill-open");
    setTimeout(function () { modal.hidden = true; }, 180);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    const t = e.target.closest("[data-billing]");
    if (!t) return;
    e.preventDefault();
    openBilling();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && !modal.hidden) closeBilling();
  });
})();
