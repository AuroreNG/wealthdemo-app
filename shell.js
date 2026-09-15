/* ============================================================
   WEALTHDEMO — application shell
   Snapshot rail, progress ring, autosave, small UX fixes.
   Runs after app.js, which owns all of the financial math.
   ============================================================ */
(function () {
  const root = document.getElementById("wp-building-retirement");
  if (!root) return;

  const $ = function (id) { return document.getElementById(id); };
  const STORE_KEY = "wealthdemo.progress.v1";
  const TOTAL_STEPS = 7;

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(message) {
    const node = $("wdToast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("show"); }, 3200);
  }

  /* ---------- make the income-protection calculator reachable ----------
     app.js hides #disability-section on load, which leaves the
     "Health or Income Loss" path with nothing to open. */
  const disability = $("disability-section");
  const risksPage = $("guidedRisks");
  if (disability && risksPage) {
    disability.style.display = "";
    risksPage.appendChild(disability);
  }

  /* ---------- $ / % adornments on numeric fields ----------
     Purely presentational: the input node itself is untouched, so every
     listener and id app.js relies on keeps working. */
  const MONEY_CLASS = /(savings-balance|contrib-monthly|contrib-lump|cf-savings|cf-monthly)/;
  const PCT_CLASS = /(savings-rate|contrib-rate|contrib-cvpct)/;

  function labelFor(input) {
    const field = input.closest(".wp-field, .protection-field, .legacy-field, .college-field");
    if (!field) return null;
    return field.querySelector(".wp-label, label");
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
  const decorateObserver = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) decorate(node.matches('input[type="number"]') ? node.parentNode : node);
      });
    });
  });
  decorateObserver.observe(root, { childList: true, subtree: true });

  /* ---------- snapshot rail ---------- */
  const RING_LENGTH = 2 * Math.PI * 52;
  const steps = Array.prototype.slice.call(root.querySelectorAll(".client-progress span"));

  function activeStep() {
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].classList.contains("active")) return i;
    }
    return 0;
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0
    }).format(Math.max(0, Number(value) || 0));
  }

  function savedToday() {
    let total = 0;
    root.querySelectorAll(".savings-balance").forEach(function (input) {
      total += Math.max(0, Number(input.value) || 0);
    });
    root.querySelectorAll(".contrib-lump").forEach(function (input) {
      total += Math.max(0, Number(input.value) || 0);
    });
    return total;
  }

  function updateSnapshot() {
    const index = activeStep();
    const pct = Math.round(((index + 1) / TOTAL_STEPS) * 100);

    const pctNode = $("snapPct");
    if (pctNode) pctNode.textContent = pct + "%";

    const ring = $("snapRing");
    if (ring) ring.style.strokeDashoffset = String(RING_LENGTH * (1 - pct / 100));

    const savedNode = $("snapSaved");
    if (savedNode) savedNode.textContent = money(savedToday());

    const yearsNode = $("snapYears");
    const yearsSource = $("yearsToRetireOut");
    if (yearsNode) {
      if (yearsSource && yearsSource.textContent.trim()) {
        yearsNode.textContent = yearsSource.textContent.trim();
      } else {
        const age = Number(($("curAge2") || {}).value) || 0;
        const retire = Number(($("retireAge2") || {}).value) || 0;
        yearsNode.textContent = String(Math.max(0, retire - age));
      }
    }

    const trackNode = $("snapTrack");
    const trackSub = $("snapTrackSub");
    const statusBox = $("trackStatusBox");
    if (trackNode && statusBox) {
      const behind = statusBox.classList.contains("bad");
      trackNode.textContent = behind ? "Gap to Close" : "On Track";
      trackNode.className = behind ? "is-bad" : "is-good";
      if (trackSub) {
        trackSub.textContent = behind
          ? "Step 7 shows ways to close it"
          : "You're taking the right steps";
      }
    }

    // keep the current step visible in the stepper on small screens
    const current = steps[index];
    const bar = root.querySelector(".client-progress");
    if (current && bar && bar.scrollWidth > bar.clientWidth) {
      const target = current.offsetLeft - (bar.clientWidth - current.offsetWidth) / 2;
      bar.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }
  }

  let frame;
  function scheduleUpdate() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(updateSnapshot);
  }

  root.addEventListener("input", scheduleUpdate);
  root.addEventListener("change", scheduleUpdate);
  root.addEventListener("click", function () { setTimeout(scheduleUpdate, 30); });

  /* ---------- progress that survives a closed tab ---------- */
  function collect() {
    const data = {};
    root.querySelectorAll("input[id], select[id]").forEach(function (node) {
      if (node.type === "range" || node.type === "button") return;
      data[node.id] = node.value;
    });
    data.__step = activeStep();
    return data;
  }

  function save(announce) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(collect()));
      if (announce) toast("Progress saved — you can close this page and pick up where you left off.");
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

    const selects = [];
    const inputs = [];
    Object.keys(data).forEach(function (id) {
      if (id.indexOf("__") === 0) return;
      const node = $(id);
      if (!node || node.value === data[id]) return;
      node.value = data[id];
      (node.tagName === "SELECT" ? selects : inputs).push(node);
    });
    selects.forEach(function (n) { n.dispatchEvent(new Event("change", { bubbles: true })); });
    inputs.forEach(function (n) { n.dispatchEvent(new Event("input", { bubbles: true })); });

    if (typeof data.__step === "number" && data.__step > 0 && steps[data.__step]) {
      steps[data.__step].click();
    }
    return selects.length + inputs.length > 0 || data.__step > 0;
  }

  let saveTimer;
  root.addEventListener("input", function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { save(false); }, 900);
  });

  const saveExit = $("saveExitBtn");
  if (saveExit) {
    saveExit.addEventListener("click", function () { save(true); });
  }

  if (restore()) {
    toast("Welcome back — your saved answers were restored.");
  }

  updateSnapshot();
})();
