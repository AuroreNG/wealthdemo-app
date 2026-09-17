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
    calendar: '<rect x="4.5" y="6" width="15" height="13.5" rx="2.5"/><path d="M4.5 10.5h15"/><path d="M9 4.5V7M15 4.5V7"/>'
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
    {
      name: "Retirement", note: "Plan today for tomorrow.", icon: "leaf", tint: "mint",
      tools: [
        { name: "Will My Social Security Be Taxed?", icon: "clock", href: "tool.html",
          desc: "See how much of your benefit the IRS can reach." },
        { name: "Retirement Withdrawal Calculator", icon: "chart", href: "withdraw.html",
          desc: "How long your savings last at the pace you spend." },
        { name: "Retirement Account Match-Up", icon: "coins", href: "accounts.html",
          desc: "Which account should the money come out of, and what it costs." }
      ]
    },
    {
      name: "Wealth & Growth", note: "Grow with purpose.", icon: "chart", tint: "sage",
      tools: [
        { name: "Rule of 72", icon: "pct", href: "rule72.html",
          desc: "Two clocks are always running. See which one is winning." },
        { name: "Cost of Waiting", icon: "hourglass", href: "waiting.html",
          desc: "Same money, started later. See what the delay takes." },
        { name: "What a Loss Really Costs", icon: "trend", href: "loss.html",
          desc: "Fall 30% and you need 42.9% back. See why." }
      ]
    },
    {
      name: "Protection", note: "Help safeguard what matters.", icon: "shield", tint: "blush",
      tools: [
        { name: "How Much Life Insurance", icon: "shield", href: "dime.html",
          desc: "Four things to pay for, less what you already have." },
        { name: "What Would You Leave Behind?", icon: "heart", href: "legacy.html",
          desc: "What an estate looks like on paper, and what really arrives." },
        { name: "If the Paycheck Stopped", icon: "wallet", href: "paycheck.html",
          desc: "Month by month, who pays the bills — and when it gets tight." }
      ]
    },
    {
      name: "Real Estate", note: "Make informed housing decisions.", icon: "home", tint: "sand",
      tools: [
        { name: "Rent vs. Buy", icon: "home", href: "rentbuy.html",
          desc: "The year buying finally pulls ahead — or whether it does." },
        { name: "Mortgage Payoff Strategy", icon: "chart", href: "mortgage.html",
          desc: "A policy loan against the mortgage — and the fair test of it." },
        { name: "Debt Payoff & Interest Calculator", icon: "pct",
          desc: "Snowball or avalanche, and what each one saves." }
      ]
    },
    {
      name: "Taxes", note: "Keep more of what you earn.", icon: "doc", tint: "lilac",
      tools: [
        { name: "When Do You Want to Pay Taxes?", icon: "calendar", href: "blueprint.html?step=6&open=tax-timing-section",
          desc: "Pay now or pay later — see both timelines." },
        { name: "Tax Impact on Your Investments", icon: "doc", href: "blueprint.html?step=6",
          desc: "What your returns look like after tax drag." },
        { name: "State Tax Comparison", icon: "doc",
          desc: "What moving states would do to your take-home." }
      ]
    },
    {
      name: "College & Life Setup", note: "Invest in what's next.", icon: "cap", tint: "teal",
      tools: [
        { name: "Family College Funding Calculator", icon: "cap", href: "blueprint.html?step=2",
          desc: "What tuition costs by the year they start." },
        { name: "529 Plan Growth Estimator", icon: "chart",
          desc: "Project a 529 balance from today's contribution." },
        { name: "Build Their Future", icon: "target",
          desc: "Set a goal for a child and find the monthly number." }
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
  const TOOL_COUNT = ALL_TOOLS.length;
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

    VISIBLE().forEach(function (cat) {
      if (cat.hideInGrid) return;
      if (active !== "All" && cat.name !== active) return;
      const tools = cat.tools.filter(function (t) {
        return !q || t.name.toLowerCase().indexOf(q) > -1 || cat.name.toLowerCase().indexOf(q) > -1;
      }).slice().sort(SORTS[sort] || SORTS.featured);
      if (!tools.length) return;
      shown += tools.length;

      const card = document.createElement("section");
      card.className = "tool-card";
      card.setAttribute("data-tint", cat.tint || "mint");
      card.innerHTML =
        '<div class="tool-card-head">' +
          '<span class="ico">' + icon(cat.icon) + '</span>' +
          '<div><h3></h3><p></p></div>' +
          '<span class="count">' + tools.length + ' tool' + (tools.length === 1 ? '' : 's') + '</span>' +
        '</div><ul class="tool-list"></ul>';
      card.querySelector("h3").textContent = cat.name;
      card.querySelector("p").textContent = cat.note;

      const list = card.querySelector(".tool-list");
      tools.forEach(function (t) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = t.href || "#";
        a.className = t.href ? "" : "soon";
        if (!t.href) a.addEventListener("click", function (e) { e.preventDefault(); });
        a.innerHTML = '<span class="ti-wrap">' + icon(t.icon, "ti") + '</span><span class="label"></span>' +
          (t.href
            ? '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6l6 6-6 6"/></svg>'
            : '<span class="tag">Soon</span>');
        a.querySelector(".label").textContent = t.name;
        li.appendChild(a);
        list.appendChild(li);
      });

      grid.appendChild(card);
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

  function buildFilters() {
    if (!filters) return;
    filters.innerHTML = "";
    if (VISIBLE().every(function (c) { return c.name !== active; })) active = "All";
    ["All"].concat(VISIBLE().filter(function (c) { return !c.hideInGrid; }).map(function (c) { return c.name; })).forEach(function (name) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "filter-chip" + (name === active ? " active" : "");
      b.textContent = name;
      b.addEventListener("click", function () {
        active = name;
        Array.prototype.forEach.call(filters.children, function (c) { c.classList.remove("active"); });
        b.classList.add("active");
        render();
      });
      filters.appendChild(b);
    });
  }
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

  /* ---------- banner ---------- */
  const banner = document.getElementById("trialBanner");
  if (banner) {
    const left = daysLeft();
    banner.innerHTML =
      '<span class="trial-pill">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 2.3 5 5.2.6-3.9 3.5 1.1 5.1L12 15.6 7.3 18.2l1.1-5.1L4.5 9.6l5.2-.6Z"/></svg>' +
        'FREE TRIAL</span>' +
      '<strong class="trial-left"></strong>' +
      '<i class="trial-divider"></i>' +
      '<span class="trial-copy">All ' + TOOL_COUNT + ' tools are unlocked. Activate before your trial ends to keep them.</span>' +
      '<button type="button" class="trial-cta" data-billing>See plans' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg>' +
      '</button>';
    banner.querySelector(".trial-left").textContent =
      left === 0 ? "Trial ended" : left + (left === 1 ? " day left" : " days left");
    banner.hidden = false;
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
