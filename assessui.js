/* ============================================================
   WEALTHDEMO — running the assessment

   The flow controller. Holds one question on screen, decides
   what comes next from what has been answered, and keeps a log
   of how the answering went.

   Nothing is sent anywhere. Progress is saved to this browser
   so a client can close the tab on the train and pick it up
   later, and the answers only leave when they press send, as a
   link they can see.
   ============================================================ */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  if (!$("asStage")) return;

  const A = window.WD.assess;
  const C = window.WD.client;

  /* ============================================================
     the invite
     ============================================================ */
  const DEFAULT_AGENT = { name: "Your adviser", firm: "", email: "", phone: "",
                          book: "", colour: "#0d7a5f", initials: "" };

  /* must match the order the compose page packs — see send.js ORDER */
  const DIVE_ORDER = ["protection", "mortgage", "retirement", "cover", "household", "education", "debt"];

  let invite = { agent: DEFAULT_AGENT, dives: null, show: "hook", client: {} };

  function readInvite() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return;
    const got = C.unpack(raw);
    if (!got) return;
    if (got.extra && got.extra.a) {
      const a = got.extra.a;
      invite.agent = {
        name: a.n || DEFAULT_AGENT.name, firm: a.f || "", email: a.e || "",
        phone: a.p || "", book: a.b || "", colour: a.c || "#0d7a5f", initials: a.i || ""
      };
    }
    if (got.extra && typeof got.extra.d === "number") {
      invite.dives = DIVE_ORDER.filter(function (id, i) { return (got.extra.d >> i) & 1; });
    } else if (got.extra && Array.isArray(got.extra.d)) {
      invite.dives = got.extra.d;          /* links made before the bitmask */
    }
    if (got.extra && got.extra.s) invite.show = got.extra.s;
    invite.client = got.facts || {};
  }

  function initials(name) {
    const bits = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!bits.length) return "•";
    return (bits[0][0] + (bits.length > 1 ? bits[bits.length - 1][0] : "")).toUpperCase();
  }

  /* a light colour would make white text unreadable, so check before trusting it */
  function safeColour(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!m) return "#0d7a5f";
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.72 ? "#0d7a5f" : "#" + m[1];
  }

  function paintBrand() {
    const c = safeColour(invite.agent.colour);
    const root = document.documentElement;
    root.style.setProperty("--a-c", c);
    root.style.setProperty("--a-ink", c);
    root.style.setProperty("--a-wash", hexA(c, 0.08));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", c);
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ============================================================
     state
     ============================================================ */
  const SAVE = "wealthdemo.assess.progress";
  let answers = {};      /* question id -> raw answer, including non-fact ones */
  let log = {};          /* question id -> { ms, edits, skipped } */
  let order = [];        /* the ids visited, so Back is honest about the path taken */
  let mode = "core";     /* core | dive:<id> */
  let cursor = 0;
  let startedAt = 0;

  function facts() { return C.all(); }

  function saveProgress() {
    try {
      localStorage.setItem(SAVE, JSON.stringify({
        answers: answers, log: log, order: order, mode: mode, cursor: cursor,
        v: C.all(), at: Date.now()
      }));
    } catch (e) {}
  }
  function loadProgress() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE) || "null"); } catch (e) {}
    if (!s || !s.answers) return null;
    /* a week-old half-finished run is noise, not a rescue */
    if (Date.now() - (s.at || 0) > 7 * 864e5) return null;
    return s;
  }
  function clearProgress() { try { localStorage.removeItem(SAVE); } catch (e) {} }

  /* ============================================================
     the list we are walking
     ============================================================ */
  function list() {
    if (mode === "core") return A.core(facts(), answers);
    return A.dive(mode.slice(5), facts(), answers);
  }

  /* ============================================================
     rendering
     ============================================================ */
  const stage = $("asStage");

  function show(html, cls) {
    stage.className = "as-stage as-in" + (cls ? " " + cls : "");
    stage.innerHTML = html;
    /* restart the entrance animation */
    void stage.offsetWidth;
  }

  function setProgress(frac) {
    $("asBar").style.width = Math.max(0, Math.min(1, frac)) * 100 + "%";
  }

  function paintTop(showBack, count) {
    $("asBack").hidden = !showBack;
    if (count && count.of) {
      /* dots, capped so a long branch never turns the header into a ruler */
      const of = Math.min(count.of, 14), at = Math.min(count.at, of);
      let d = "";
      for (let i = 1; i <= of; i++) {
        d += '<i class="as-dot' + (i === at ? " is-now" : (i < at ? " is-done" : "")) + '"></i>';
      }
      $("asCount").innerHTML = d;
    } else {
      $("asCount").innerHTML = "";
    }
    const ag = invite.agent;
    $("asWhoName").textContent = ag.name;
    $("asWhoFirm").textContent = ag.firm || "";
    $("asAvatar").textContent = ag.initials || initials(ag.name);
  }

  const esc = function (s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg>';

  const ICONS = {
    one:    '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/>',
    two:    '<circle cx="8.5" cy="8.5" r="3"/><circle cx="16" cy="9.5" r="2.4"/><path d="M2.5 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2"/><path d="M15 14.6c3 .1 5.5 1.9 5.5 4.9"/>',
    family: '<circle cx="7" cy="7.5" r="2.6"/><circle cx="15.5" cy="7.5" r="2.6"/><circle cx="11.5" cy="16" r="2"/><path d="M2.5 15c0-2.7 2-4.4 4.5-4.4s4.5 1.7 4.5 4.4"/><path d="M11.5 15c0-2.7 1.9-4.4 4.4-4.4S20.5 12.3 20.5 15"/><path d="M7.5 21.5c0-2 1.8-3.2 4-3.2s4 1.2 4 3.2"/>',
    solo:   '<circle cx="9" cy="7.5" r="2.8"/><circle cx="17" cy="13" r="2"/><path d="M3 18c0-3.2 2.6-5.2 6-5.2s6 2 6 5.2"/><path d="M14.5 21c0-1.8 1.2-2.9 2.8-2.9s2.7 1.1 2.7 2.9"/>',
    house:  '<path d="m3.8 10.6 8.2-6.4 8.2 6.4"/><path d="M6.2 9.6V20h11.6V9.6"/><path d="M10 20v-5.2h4V20"/>',
    key:    '<circle cx="8" cy="13" r="3.6"/><path d="m11 11 8-8"/><path d="m16.5 5.5 2.2 2.2"/><path d="m14 8 2.2 2.2"/>',
    keys:   '<rect x="3.5" y="5.5" width="17" height="13.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 14.5h4"/>',
    shield: '<path d="M12 3.4 5.6 6.1v5.2c0 4 2.7 7.6 6.4 9.2 3.7-1.6 6.4-5.2 6.4-9.2V6.1Z"/>',
    sun:    '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    umbrella: '<path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5h-17A8.5 8.5 0 0 1 12 3.5Z"/><path d="M12 12v6.5a2 2 0 0 0 4 0"/>',
    cap:    '<path d="M12 4.5 21 9l-9 4.5L3 9Z"/><path d="M7 11v4.6c0 1.4 2.2 2.4 5 2.4s5-1 5-2.4V11"/>',
    card:   '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18"/><path d="M6.5 14.5h3"/>',
    yes:    '<path d="m5 13 4.5 4.5L19 7"/>',
    no:     '<path d="M7 7l10 10M17 7 7 17"/>'
  };
  function icon(name) {
    return ICONS[name] ? '<span class="as-opt-ico"><svg viewBox="0 0 24 24" aria-hidden="true">' +
      ICONS[name] + '</svg></span>' : "";
  }

  /* ---------- welcome ---------- */
  function welcome() {
    const ag = invite.agent;
    const resumable = loadProgress();
    const name = invite.client.name ? esc(invite.client.name).split(" ")[0] : "";
    setProgress(0);
    paintTop(false, null);
    show(
      '<div class="as-hello">' +
        '<h1 class="as-q">' + (name ? "Hi " + name + "." : "Hello.") + '</h1>' +
        '<p class="as-lede">A few quick questions, then you\u2019ll see where you stand.</p>' +
        '<div class="as-card">' +
          '<span class="as-avatar">' + esc(ag.initials || initials(ag.name)) + '</span>' +
          '<span><b>' + esc(ag.name) + '</b><small>' +
            esc(ag.firm || "your adviser") + '</small></span>' +
        '</div>' +
        '<div class="as-meta">' +
          chip('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4l2.6 1.6"/>', "3 minutes") +
          chip('<path d="m5 13 4.5 4.5L19 7"/>', "No sign-up") +
          chip('<rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>', "Private") +
        '</div>' +
        '<button class="as-go" id="asStart">' +
          (resumable ? "Pick up where you left off" : "Let\u2019s go") + ARROW + '</button>' +
        (resumable ? '<button class="as-skip" id="asFresh">Start again</button>' : "") +
        '<p class="as-privacy">' +
          '<svg viewBox="0 0 24 24"><path d="M12 3.5 5.5 6.2v5.1c0 4 2.7 7.6 6.5 9.2 3.8-1.6 6.5-5.2 6.5-9.2V6.2Z"/></svg>' +
          'Your answers stay on this device until you choose to send them.' +
        '</p>' +
      '</div>', "as-hello");

    $("asStart").addEventListener("click", function () {
      if (resumable) restore(resumable); else begin();
    });
    if ($("asFresh")) $("asFresh").addEventListener("click", function () {
      clearProgress(); C.reset(); begin();
    });
  }

  function chip(path, label) {
    return '<span class="as-chip"><svg viewBox="0 0 24 24">' + path + '</svg>' + esc(label) + '</span>';
  }

  function begin() {
    answers = {}; log = {}; order = []; mode = "core"; cursor = 0;
    C.reset();
    if (invite.client) C.setMany(invite.client, "agent");
    step();
  }

  function restore(s) {
    answers = s.answers || {}; log = s.log || {}; order = s.order || [];
    mode = s.mode || "core"; cursor = s.cursor || 0;
    C.reset();
    C.setMany(s.v || {}, "client");
    step();
  }

  /* ---------- a question ---------- */
  function step() {
    const qs = list();
    if (cursor >= qs.length) return finishSection();
    const q = qs[cursor];
    order = order.filter(function (id) { return id !== q.id; });
    order.push(q.id);
    startedAt = Date.now();

    const isCore = mode === "core";
    const p = isCore ? A.progress(facts(), answers, q.id) : { at: cursor + 1, of: qs.length };
    setProgress(isCore ? (p.at - 1) / Math.max(1, p.of) : 1);
    paintTop(order.length > 1 || !isCore, p);

    show(body(q), "");
    wire(q);
    saveProgress();
  }

  function body(q) {
    const cur = answers[q.id];
    let field = "";

    if (q.kind === "choice" || q.kind === "bool") {
      const opts = q.kind === "bool"
        ? [{ v: true, label: "Yes", icon: "yes" }, { v: false, label: "No", icon: "no" }]
        : q.options;
      field = '<div class="as-opts">' + opts.map(function (o, i) {
        const on = cur !== undefined && String(cur) === String(o.v);
        return '<button type="button" class="as-opt' + (on ? " is-on" : "") +
          '" data-i="' + i + '">' + icon(o.icon) + '<span class="as-opt-txt">' + esc(o.label) +
          (o.note ? '<small>' + esc(o.note) + '</small>' : "") + '</span></button>';
      }).join("") + '</div>';
    } else if (q.kind === "text") {
      field = '<div class="as-field"><textarea id="asIn" rows="3" placeholder="' +
        esc(q.placeholder || "") + '">' + esc(cur || "") + '</textarea></div>';
    } else {
      const money = q.kind === "money";
      const rate = q.kind === "rate";
      field = '<div class="as-field' + (money ? " has-pre" : "") + '">' +
        (money ? '<span class="as-pre">$</span>' : "") +
        '<input id="asIn" type="text" inputmode="' + (rate ? "decimal" : "numeric") +
        '" autocomplete="off" value="' + esc(cur === undefined ? "" : fmtIn(q, cur)) +
        '" placeholder="' + (money ? "0" : (rate ? "0.0" : "")) + '">' +
        (rate ? '<span class="as-post">%</span>'
              : (q.per ? '<span class="as-post">' + esc(q.per) + '</span>' : "")) +
      '</div>';
    }

    const canSkip = q.kind !== "choice" && q.kind !== "bool";
    const slot = q.react ? '<div class="as-react" id="asReact" aria-live="polite">' +
      '<b id="asReactBig"></b><span class="as-react-body">' +
      '<span id="asReactLine"></span>' +
      '<span class="as-react-meter" id="asReactMeter" hidden><i></i></span>' +
      '</span></div>' : "";
    return '<div>' +
      '<h1 class="as-q">' + esc(q.ask) + '</h1>' +
      (q.hint ? '<p class="as-hint">' + esc(q.hint) + '</p>' : '<div style="height:10px"></div>') +
      field + slot +
      (q.kind === "choice" || q.kind === "bool" ? "" :
        '<button class="as-go" id="asNext">Continue' + ARROW + '</button>') +
      (canSkip ? '<button class="as-skip" id="asSkip">' +
        esc(q.zeroLabel || "I'm not sure") + '</button>' : "") +
      (q.kind === "text" ? "" :
        '<p class="as-kbd">Press <kbd>Enter</kbd> to continue</p>') +
    '</div>';
  }

  function fmtIn(q, v) {
    if (q.kind === "money") return Number(v).toLocaleString("en-US");
    return String(v);
  }

  function parse(q, raw) {
    if (q.kind === "text") return String(raw || "").trim();
    const n = parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
    if (!isFinite(n)) return null;
    if (q.min !== undefined && n < q.min) return null;
    if (q.max !== undefined && n > q.max) return null;
    if (n < 0) return null;
    if (n === 0 && !q.allowZero && q.kind !== "text") return null;
    return n;
  }

  function wire(q) {
    const input = $("asIn");
    const next = $("asNext");

    if (input) {
      setTimeout(function () { try { input.focus(); } catch (e) {} }, 60);

      if (q.kind === "money") {
        input.addEventListener("input", function () {
          const pos = input.selectionStart, before = input.value.length;
          const digits = input.value.replace(/[^0-9]/g, "");
          input.value = digits ? Number(digits).toLocaleString("en-US") : "";
          const after = input.value.length;
          try { input.setSelectionRange(Math.max(0, pos + (after - before)), Math.max(0, pos + (after - before))); } catch (e) {}
          check();
        });
      } else {
        input.addEventListener("input", check);
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(q); }
      });
    }

    if (next) next.addEventListener("click", function () { commit(q); });

    stage.querySelectorAll(".as-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        stage.querySelectorAll(".as-opt").forEach(function (b) { b.classList.remove("is-on"); });
        btn.classList.add("is-on");
        const i = +btn.getAttribute("data-i");
        const o = q.kind === "bool"
          ? [{ v: true }, { v: false }][i]
          : q.options[i];
        setTimeout(function () { commit(q, o); }, 170);
      });
    });

    if ($("asSkip")) $("asSkip").addEventListener("click", function () {
      note(q, true);
      if (q.allowZero && q.fact) C.set(q.fact, 0, "client");
      advance();
    });

    check();
    function check() {
      if (input) react(q, input.value);
      if (!next || !input) return;
      const ok = q.kind === "text" ? true : parse(q, input.value) !== null;
      next.disabled = !ok;
    }
  }

  /* the number under the field. It is the whole reward loop: every answer
     buys an immediate, honest fact about their own household. */
  function react(q, raw) {
    const box = $("asReact");
    if (!box || !q.react) return;
    const n = parse(q, raw);
    let out = null;
    if (n !== null) { try { out = q.react(facts(), n); } catch (e) { out = null; } }
    if (!out) { box.classList.remove("is-on"); return; }
    $("asReactBig").textContent = out.big;
    $("asReactLine").textContent = out.line;
    box.setAttribute("data-tone", out.tone || "");
    const m = $("asReactMeter");
    if (out.meter === undefined) { m.hidden = true; }
    else {
      m.hidden = false;
      m.firstChild.style.width = Math.max(0, Math.min(1, out.meter)) * 100 + "%";
    }
    box.classList.add("is-on");
  }

  function note(q, skipped) {
    const prev = log[q.id] || { ms: 0, edits: 0, skipped: false };
    log[q.id] = {
      ms: prev.ms + (Date.now() - startedAt),
      edits: prev.edits + (answers[q.id] !== undefined ? 1 : 0),
      skipped: !!skipped
    };
  }

  function commit(q, option) {
    if (option) {
      answers[q.id] = option.v;
      note(q, false);
      if (option.set) C.setMany(option.set, "client");
      if (q.fact && typeof option.v !== "string") C.set(q.fact, option.v, "client");
      if (q.fact && typeof option.v === "string") C.set(q.fact, option.v, "client");
      if (option.unsure) log[q.id].unsure = true;
      return advance();
    }
    const input = $("asIn");
    if (!input) return;
    const val = parse(q, input.value);
    if (val === null && q.kind !== "text") return;
    answers[q.id] = val;
    note(q, false);
    if (q.fact && val !== null && val !== "") C.set(q.fact, val, "client");
    advance();
  }

  function advance() {
    C.derive();
    cursor++;
    saveProgress();
    step();
  }

  function back() {
    if (cursor > 0) { cursor--; return step(); }
    if (mode !== "core") { mode = "core"; cursor = A.core(facts(), answers).length; return finishSection(); }
    welcome();
  }

  /* ---------- between sections ---------- */
  function finishSection() {
    setProgress(1);
    if (mode !== "core") { mode = "core"; return result(); }
    thinking();
  }

  function thinking() {
    paintTop(false, null);
    const lines = ["Reading your answers\u2026", "Checking them against each other\u2026"];
    show('<div class="as-think"><div class="as-pulse"><i></i><i></i><i></i></div>' +
      '<p id="asThink">' + lines[0] + '</p></div>', "as-think-wrap");
    let i = 0;
    const t = setInterval(function () {
      i++;
      if (i >= lines.length) { clearInterval(t); return; }
      const el = $("asThink");
      if (el) el.textContent = lines[i];
    }, 620);
    setTimeout(function () { clearInterval(t); result(); }, 1400);
  }

  function result() {
    clearProgress();
    C.derive();
    C.stamp("returned");
    if (window.WD.stand) {
      window.WD.stand.render({
        mount: stage, top: paintTop, invite: invite,
        answers: answers, log: log,
        onDive: function (id) { mode = "dive:" + id; cursor = 0; step(); }
      });
      setProgress(1);
    }
  }

  /* ============================================================
     go
     ============================================================ */
  readInvite();
  paintBrand();
  $("asBack").addEventListener("click", back);
  /* changing only the fragment does not reload the page, so an invite that
     arrives that way has to redraw the screen it landed on */
  window.addEventListener("hashchange", function () {
    readInvite();
    paintBrand();
    if (!order.length) welcome();
  });

  welcome();

  /* exposed for the walkthrough tests and for the agent preview */
  window.WD.assessRun = {
    answers: function () { return answers; },
    log: function () { return log; },
    invite: function () { return invite; },
    jumpToResult: result
  };
})();
