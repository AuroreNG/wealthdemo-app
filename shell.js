/* ============================================================
   WEALTHDEMO — application shell
   Guided one-question-at-a-time flow, snapshot rail,
   personalization, autosave. app.js owns all of the math.
   ============================================================ */
(function () {
  const root = document.getElementById("wp-building-retirement");
  if (!root) return;

  const $ = function (id) { return document.getElementById(id); };
  const STORE_KEY = "wealthdemo.progress.v2";
  const TOTAL_STEPS = 7;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0
    }).format(Math.max(0, Number(value) || 0));
  }
  function num(id) {
    const node = $(id);
    return node ? Math.max(0, Number(node.value) || 0) : 0;
  }
  function textOf(id, fallback) {
    const node = $(id);
    return node && node.textContent.trim() ? node.textContent.trim() : (fallback || "");
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(message) {
    const node = $("wdToast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("show"); }, 3400);
  }

  /* ---------- make the income-protection calculator reachable ---------- */
  const disability = $("disability-section");
  if (disability) disability.style.display = "";

  /* ---------- $ / % adornments on numeric fields ----------
     Presentational only: the input node is never replaced, so every
     listener and id app.js relies on keeps working. */
  const MONEY_CLASS = /(savings-balance|contrib-monthly|contrib-lump|cf-savings|cf-monthly)/;
  const PCT_CLASS = /(savings-rate|contrib-rate|contrib-cvpct)/;

  function labelFor(input) {
    const field = input.closest(".wp-field, .protection-field, .legacy-field, .college-field");
    return field ? field.querySelector(".wp-label, label") : null;
  }
  function kindOf(input, label) {
    const cls = input.className || "";
    if (MONEY_CLASS.test(cls)) return "money";
    if (PCT_CLASS.test(cls)) return "pct";
    const text = label ? label.textContent : "";
    if (text.indexOf("($)") > -1 || /\(\$\/month\)/.test(text)) return "money";
    if (text.indexOf("(%)") > -1) return "pct";
    return null;
  }
  function tidyLabel(label) {
    if (!label) return;
    label.childNodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.nodeValue = node.nodeValue
          .replace(/\s*\(\$\/month\)/g, " per month")
          .replace(/\s*\(\$\)/g, "")
          .replace(/\s*\(%\)/g, "");
      }
    });
  }
  function decorate(scope) {
    (scope || root).querySelectorAll('input[type="number"]').forEach(function (input) {
      if (input.parentElement && input.parentElement.classList.contains("field-adorn")) return;
      const label = labelFor(input);
      const kind = kindOf(input, label);
      if (!kind) return;
      const wrap = document.createElement("span");
      wrap.className = "field-adorn " + kind;
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      tidyLabel(label);
    });
  }
  decorate(root);
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) decorate(node.matches('input[type="number"]') ? node.parentNode : node);
      });
    });
  }).observe(root, { childList: true, subtree: true });

  /* ============================================================
     GUIDED FLOW — one question at a time
     ============================================================ */
  function chosen(selector) {
    const btn = root.querySelector(selector + ".active");
    return btn ? btn : null;
  }
  function accountCount(scope) {
    const wrap = $(scope);
    return wrap ? wrap.querySelectorAll(".contrib-item").length : 0;
  }
  function savingsTotal() {
    let total = 0;
    root.querySelectorAll(".savings-balance").forEach(function (i) { total += Math.max(0, Number(i.value) || 0); });
    return total;
  }
  function contribTotal() {
    let total = 0;
    root.querySelectorAll(".contrib-monthly").forEach(function (i) { total += Math.max(0, Number(i.value) || 0); });
    return total;
  }

  const FLOW = {
    guidedAbout: [
      { id: "q-name", summary: function () {
          const v = ($("firstName") || {}).value;
          return v && v.trim() ? v.trim() : "Not shared";
        } },
      { id: "q-basics", summary: function () {
          return num("curAge2") + " years old · retiring at " + num("retireAge2") +
                 " · " + money(num("annualIncome")) + "/yr";
        } },
      { id: "q-savings", summary: function () {
          const n = accountCount("savingsItems");
          return money(savingsTotal()) + " across " + n + " account" + (n === 1 ? "" : "s");
        } },
      { id: "q-contrib", summary: function () {
          return money(contribTotal() + num("employerMatch")) + "/mo including employer match";
        } },
      { id: "q-lifestyle", summary: function () {
          return money(num("goalIncome")) + "/mo goal · " + money(num("socialSecurityMonthly")) + "/mo Social Security";
        } }
    ],
    guidedCollege: [
      { id: "q-college-gate", summary: function () {
          const yes = chosen('[data-college-choice="yes"]');
          const no = chosen('[data-college-choice="no"]');
          return yes ? "Yes — children under 18" : (no ? "No children under 18" : "Not answered");
        } },
      { id: "collegePlanner",
        ready: function () { const el = $("collegePlanner"); return el && el.classList.contains("show"); },
        summary: function () {
          const gap = root.querySelector("#collegeResults .college-stat.gap strong");
          const kids = root.querySelectorAll("#collegeChildren .college-child").length;
          return kids + (kids === 1 ? " child" : " children") +
                 (gap ? " · estimated gap " + gap.textContent.trim() : "");
        } }
    ],
    guidedProtection: [
      { id: "q-mortgage", summary: function () {
          if (!chosen('[data-mortgage-choice="yes"]')) return "No mortgage";
          return money(num("protMortgageMonthly")) + "/mo · " + money(num("protMortgageBalance")) + " remaining";
        } },
      { id: "q-income-protection", summary: function () {
          const years = root.querySelector("[data-protection-years].active");
          const y = years ? years.getAttribute("data-protection-years") : "1";
          return y + (y === "1" ? " year" : " years") + " tested · gap " + textOf("protIncomeGap", "$0");
        } },
      { id: "q-coordinated", open: true }
    ],
    guidedLegacy: [
      { id: "q-legacy-gate", summary: function () {
          const yes = chosen('[data-legacy-choice="yes"]');
          const no = chosen('[data-legacy-choice="no"]');
          return yes ? "Yes — legacy matters" : (no ? "Not a priority right now" : "Not answered");
        } },
      { id: "legacyPlanner",
        ready: function () { const el = $("legacyPlanner"); return el && el.classList.contains("show"); },
        summary: function () {
          return "Family receives " + textOf("legacyToday", "$0") + " · gap " + textOf("legacyGap", "$0");
        } }
    ],
    guidedRisks: [
      { id: "tax-section", summary: function () {
          const sel = $("taxFutureChoice");
          const label = sel && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : "Not answered";
          const pick = root.querySelector(".tax-btn.active strong");
          return label + (pick ? " · prefers " + pick.textContent.trim() : "");
        } },
      { id: "q-chaos", summary: function () {
          const pick = root.querySelector(".chaos-choice-btn.active .chaos-choice-label");
          return pick ? "Exploring " + pick.textContent.trim() : "Nothing explored yet";
        } }
    ]
  };

  const flowState = {};

  function blockEl(block) { return $(block.id); }
  function availableBlocks(key) {
    return FLOW[key].filter(function (b) { return (!b.ready || b.ready()) && blockEl(b); });
  }

  /* build the chrome once */
  Object.keys(FLOW).forEach(function (key) {
    const container = $(key);
    if (!container) return;
    flowState[key] = 0;

    FLOW[key].forEach(function (block, i) {
      const el = blockEl(block);
      if (!el || el.dataset.qBuilt) return;
      el.dataset.qBuilt = "1";

      const body = document.createElement("div");
      body.className = "q-body";
      while (el.firstChild) body.appendChild(el.firstChild);

      const head = document.createElement("div");
      head.className = "q-head";
      head.innerHTML =
        '<span class="q-index">' + (i + 1) + '</span>' +
        '<div class="q-headings">' +
          '<div class="q-title-row"><h3 class="q-title"></h3></div>' +
          '<p class="q-summary"></p>' +
        '</div>' +
        '<button type="button" class="q-edit">Edit</button>';
      head.querySelector(".q-title").textContent = el.dataset.title || "";

      // plain-language help, for anyone unsure what a question is asking
      if (el.dataset.help) {
        const helpBtn = document.createElement("button");
        helpBtn.type = "button";
        helpBtn.className = "q-help";
        helpBtn.textContent = "i";
        helpBtn.setAttribute("aria-expanded", "false");
        helpBtn.setAttribute("aria-label", "What this question means");
        head.querySelector(".q-title-row").appendChild(helpBtn);

        const panel = document.createElement("div");
        panel.className = "q-help-panel";
        panel.textContent = el.dataset.help;
        if (el.dataset.helpEg) {
          const eg = document.createElement("span");
          eg.className = "eg";
          eg.textContent = el.dataset.helpEg;
          panel.appendChild(eg);
        }
        head.appendChild(panel);

        helpBtn.addEventListener("click", function (event) {
          event.stopPropagation();
          const open = panel.classList.toggle("open");
          helpBtn.setAttribute("aria-expanded", open ? "true" : "false");
        });
      }

      el.appendChild(head);
      el.appendChild(body);

      if (!block.open) {
        const foot = document.createElement("div");
        foot.className = "q-foot";
        foot.innerHTML = '<button type="button" class="q-next">Continue' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg></button>';
        el.appendChild(foot);
        foot.querySelector(".q-next").addEventListener("click", function () { advance(key); });
      }

      head.addEventListener("click", function () {
        if (!el.classList.contains("is-done")) return;
        const list = availableBlocks(key);
        const index = list.indexOf(block);
        if (index > -1) { flowState[key] = index; refresh(key, true); }
      });
    });

    // put the question blocks first, in flow order, then anything else
    const ordered = FLOW[key].map(blockEl).filter(Boolean);
    const rest = Array.prototype.slice.call(container.children).filter(function (child) {
      return ordered.indexOf(child) === -1;
    });
    container.append.apply(container, ordered.concat(rest));
  });

  function pageOf(key) {
    const el = $(key);
    return el ? el.closest(".guided-page") : null;
  }

  function refresh(key, scrollToActive) {
    const list = availableBlocks(key);
    if (!list.length) return;
    const idx = Math.min(flowState[key], list.length);

    FLOW[key].forEach(function (block) {
      const el = blockEl(block);
      if (!el) return;
      el.classList.toggle("q-unavailable", list.indexOf(block) === -1);
    });

    list.forEach(function (block, i) {
      const el = blockEl(block);
      const done = i < idx;
      el.classList.toggle("is-done", !!(done && !block.open));
      el.classList.toggle("is-active", !!(i === idx || (block.open && i <= idx)));
      el.classList.toggle("is-locked", i > idx);
      const sum = el.querySelector(".q-summary");
      if (sum) sum.textContent = block.summary ? block.summary() : "";
      const next = el.querySelector(".q-next");
      if (next) next.textContent = i === list.length - 1 ? "Done with this step" : "Continue";
      if (next && !next.querySelector("svg")) {
        next.insertAdjacentHTML("beforeend",
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg>');
      }
    });

    const page = pageOf(key);
    if (page) {
      const nav = page.querySelector(".guided-nav .primary");
      if (nav) nav.classList.toggle("is-ready", idx >= list.length);
    }

    if (scrollToActive) {
      const active = list[Math.min(idx, list.length - 1)];
      const el = blockEl(active);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 170;
        window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
      }
    }
  }

  function advance(key) {
    const list = availableBlocks(key);
    flowState[key] = Math.min(flowState[key] + 1, list.length);
    refresh(key, true);
    save(false);
    if (flowState[key] >= list.length) {
      const page = pageOf(key);
      const nav = page && page.querySelector(".guided-nav .primary");
      if (nav) {
        setTimeout(function () {
          nav.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
        }, 180);
      }
    }
  }

  function refreshAll(scroll) {
    Object.keys(FLOW).forEach(function (key) { refresh(key, false); });
    if (scroll) { /* no-op */ }
  }

  /* ============================================================
     PERSONALIZATION
     ============================================================ */
  const nameLines = Array.prototype.slice.call(root.querySelectorAll("[data-name-line]"))
    .map(function (el) { return { el: el, withName: el.dataset.nameLine, plain: el.textContent }; });

  function firstName() {
    const v = ($("firstName") || {}).value || "";
    return v.trim().split(/\s+/)[0] || "";
  }

  function applyName() {
    const name = firstName();
    nameLines.forEach(function (line) {
      line.el.textContent = name ? line.withName.replace("{name}", name) : line.plain;
    });
    const title = $("snapTitle");
    if (title) title.textContent = name ? name + "'s Snapshot" : "Your Snapshot";
    const pdfName = $("clientName2");
    if (pdfName && name && (!pdfName.value.trim() || pdfName.dataset.autoName === "1")) {
      pdfName.value = name;
      pdfName.dataset.autoName = "1";
    }
  }

  /* ============================================================
     SNAPSHOT RAIL
     ============================================================ */
  const RING_LENGTH = 2 * Math.PI * 52;
  const steps = Array.prototype.slice.call(root.querySelectorAll(".client-progress span"));

  function activeStep() {
    for (let i = 0; i < steps.length; i++) if (steps[i].classList.contains("active")) return i;
    return 0;
  }

  const counters = new WeakMap();
  function setNumber(node, value, format) {
    if (!node) return;
    const from = counters.get(node);
    counters.set(node, value);
    if (reduceMotion || from === undefined || from === value || Math.abs(value - from) < 1) {
      node.textContent = format(value);
      return;
    }
    const start = performance.now();
    const duration = 420;
    (function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = format(from + (value - from) * eased);
      if (t < 1 && counters.get(node) === value) requestAnimationFrame(tick);
      else if (counters.get(node) === value) node.textContent = format(value);
    })(start);
  }

  function futureValue(monthly, rate, years) {
    const r = rate / 12, n = years * 12;
    return r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
  }

  function updateSnapshot() {
    const index = activeStep();
    const pct = Math.round(((index + 1) / TOTAL_STEPS) * 100);

    setNumber($("snapPct"), pct, function (v) { return Math.round(v) + "%"; });
    const ring = $("snapRing");
    if (ring) ring.style.strokeDashoffset = String(RING_LENGTH * (1 - pct / 100));
    const fill = $("stepperFill");
    if (fill) fill.style.width = pct + "%";

    setNumber($("snapSaved"), savingsTotal(), money);

    const years = Math.max(0, num("retireAge2") - num("curAge2"));
    setNumber($("snapYears"), years, function (v) { return String(Math.round(v)); });

    const trackNode = $("snapTrack");
    const trackSub = $("snapTrackSub");
    const statusBox = $("trackStatusBox");
    if (trackNode && statusBox) {
      const behind = statusBox.classList.contains("bad");
      trackNode.textContent = behind ? "Gap to Close" : "On Track";
      trackNode.className = behind ? "is-bad" : "is-good";
      if (trackSub) trackSub.textContent = behind ? "Step 7 shows ways to close it" : "You're taking the right steps";
    }

    // a line of real, personal context rather than filler
    const insight = $("snapInsight");
    if (insight) {
      const name = firstName();
      const monthly = contribTotal() + num("employerMatch");
      let line = "";
      if (years > 0 && monthly > 0) {
        line = (name ? name + ", your" : "Your") + " " + money(monthly) + "/mo has " + years +
               " years to compound — about " + money(futureValue(monthly, 0.07, years)) + " at 7%.";
      } else if (years > 0) {
        line = years + " years of compounding ahead of you. Adding even " + money(100) +
               "/mo now would be about " + money(futureValue(100, 0.07, years)) + " at 7%.";
      }
      insight.textContent = line;
      insight.style.display = line ? "" : "none";
    }

    const runway = $("insightRunway");
    if (runway) {
      const y = Math.max(0, num("retireAge2") - num("curAge2"));
      runway.innerHTML = y > 0
        ? "That gives you <strong>" + y + " years</strong> of compounding. At 7%, every <strong>$100/month</strong> you add is worth about <strong>" +
          money(futureValue(100, 0.07, y)) + "</strong> by age " + num("retireAge2") + "."
        : "Enter an age and a retirement age to see how much runway your money has.";
    }

    const bar = root.querySelector(".client-progress");
    const current = steps[index];
    if (current && bar && bar.scrollWidth > bar.clientWidth) {
      const target = current.offsetLeft - (bar.clientWidth - current.offsetWidth) / 2;
      bar.scrollTo({ left: Math.max(0, target), behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  let frame;
  function scheduleUpdate() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      applyName();
      updateSnapshot();
      refreshAll(false);
    });
  }

  root.addEventListener("input", scheduleUpdate);
  root.addEventListener("change", scheduleUpdate);
  root.addEventListener("click", function () { setTimeout(scheduleUpdate, 40); });

  /* ============================================================
     PROGRESS THAT SURVIVES A CLOSED TAB
     ============================================================ */
  function collect() {
    const data = { __flow: {}, __step: activeStep() };
    root.querySelectorAll("input[id], select[id]").forEach(function (node) {
      if (node.type === "range" || node.type === "button") return;
      data[node.id] = node.value;
    });
    Object.keys(flowState).forEach(function (key) { data.__flow[key] = flowState[key]; });
    return data;
  }

  function save(announce) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(collect()));
      if (announce) toast("Progress saved — close this page and pick up right where you left off.");
      return true;
    } catch (err) {
      if (announce) toast("This browser is blocking local storage, so progress can't be saved here.");
      return false;
    }
  }

  function restore() {
    let data;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      data = JSON.parse(raw);
    } catch (err) { return false; }
    if (!data || typeof data !== "object") return false;

    const selects = [], inputs = [];
    Object.keys(data).forEach(function (id) {
      if (id.indexOf("__") === 0) return;
      const node = $(id);
      if (!node || node.value === data[id]) return;
      node.value = data[id];
      (node.tagName === "SELECT" ? selects : inputs).push(node);
    });
    selects.forEach(function (n) { n.dispatchEvent(new Event("change", { bubbles: true })); });
    inputs.forEach(function (n) { n.dispatchEvent(new Event("input", { bubbles: true })); });

    if (data.__flow) {
      Object.keys(flowState).forEach(function (key) {
        if (typeof data.__flow[key] === "number") flowState[key] = data.__flow[key];
      });
    }
    if (typeof data.__step === "number" && data.__step > 0 && steps[data.__step]) steps[data.__step].click();
    return true;
  }

  let saveTimer;
  root.addEventListener("input", function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { save(false); }, 900);
  });

  const saveExit = $("saveExitBtn");
  if (saveExit) saveExit.addEventListener("click", function () { save(true); });

  /* ---------- how this works ---------- */
  const howBtn = $("howBtn"), howPanel = $("howPanel"), howClose = $("howClose");
  function setHow(open) {
    if (!howPanel) return;
    howPanel.classList.toggle("open", open);
    howPanel.setAttribute("aria-hidden", open ? "false" : "true");
    if (howBtn) howBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (howBtn) howBtn.addEventListener("click", function () {
    setHow(!howPanel.classList.contains("open"));
    if (howPanel.classList.contains("open")) {
      howPanel.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    }
  });
  if (howClose) howClose.addEventListener("click", function () {
    setHow(false);
    try { localStorage.setItem("wealthdemo.seenHow", "1"); } catch (err) {}
  });

  /* ---------- deep links from the tools hub ---------- */
  function openFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const step = parseInt(params.get("step"), 10);
    if (step >= 1 && step <= TOTAL_STEPS && steps[step - 1]) steps[step - 1].click();
    const panel = params.get("open");
    if (panel) {
      const el = $(panel);
      if (el) {
        el.style.display = "";
        el.classList.add("show");
        setTimeout(function () {
          el.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
        }, 320);
      }
    }
  }

  const restored = restore();
  openFromQuery();

  // first-time visitors get the explanation without having to ask for it
  try {
    if (!restored && !localStorage.getItem("wealthdemo.seenHow")) setHow(true);
  } catch (err) {}

  applyName();
  updateSnapshot();
  refreshAll(false);
  if (restored) toast("Welcome back — your saved answers were restored.");
})();
