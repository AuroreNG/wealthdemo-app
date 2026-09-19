/* ============================================================
   WEALTHDEMO — one renderer for every form

   form.html?f=<id> is the only page. What it draws comes from
   forms.js, and the three shapes share everything they can:
   the same header, the same right-hand answer rail, the same
   saving, the same send.

   Nothing here knows any finance. A form's own compute(v) is
   the only place a figure is worked out, which is what keeps
   the assistant honest later: it asks this file what the page
   says, exactly as it asks a calculator.

   Answers live in this browser. With Supabase configured they
   also go to the adviser's own row, but the page works with
   neither.
   ============================================================ */
(function () {
  "use strict";

  const R = window.WD_FORMS;
  if (!R) return;

  const $ = function (id) { return document.getElementById(id); };
  const mount = $("formRoot");
  if (!mount) return;

  const esc = function (s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  const ICONS = {
    home:  '<path d="m4 11 8-6.5 8 6.5"/><path d="M6.5 10v9.5h11V10"/>',
    doc:   '<path d="M8 3.5h5.5L18 8v12.5H8Z"/><path d="M13.5 3.5V8H18"/><path d="M10.5 12.5h5M10.5 16h5"/>',
    chart: '<path d="M5 19V11"/><path d="M12 19V5.5"/><path d="M19 19v-5.5"/>',
    target:'<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/>',
    shield:'<path d="M12 3.5 5.5 6.2v5.1c0 4 2.7 7.6 6.5 9.2 3.8-1.6 6.5-5.2 6.5-9.2V6.2Z"/>',
    heart: '<path d="M12 20s-6.5-3.9-6.5-8.6A3.7 3.7 0 0 1 12 8.6a3.7 3.7 0 0 1 6.5 2.8C18.5 16.1 12 20 12 20Z"/>',
    tick:  '<path d="m5 13 4.5 4.5L19 7"/>',
    arrow: '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>',
    back:  '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    plus:  '<path d="M12 5.5v13M5.5 12h13"/>',
    cross: '<path d="m7 7 10 10M17 7 7 17"/>'
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' +
      (ICONS[name] || ICONS.chart) + "</svg>";
  }

  /* ============================================================
     which form, and what has been answered
     ============================================================ */
  function param(k) {
    try { return new URLSearchParams(location.search).get(k) || ""; } catch (e) { return ""; }
  }

  const FORM = R.byId(param("f")) || R.all[0];
  const KEY = "wealthdemo.form." + FORM.id + (param("c") ? "." + param("c") : "");

  /* ------------------------------------------------------------
     Two audiences, one page.

     The adviser gets the whole thing: every question, the score,
     the figures, the notes. The client gets the same form with
     the verdict taken away — because a readiness score is an
     adviser's judgement to deliver, not a number to read off a
     phone on the bus, and because half of these forms are asking
     a client for documents rather than telling them anything.

     ?as=client is set by the link the adviser sends. It is not a
     security boundary and is not pretending to be one; the link
     itself is the credential, exactly as the assessment's always
     has been.
     ------------------------------------------------------------ */
  const CLIENT = param("as") === "client";

  /* the adviser's name and firm ride along in the link so the page the
     client opens belongs to them rather than to us */
  const FROM = (function () {
    try {
      const p = new URLSearchParams(location.search);
      return { name: p.get("from") || "", firm: p.get("firm") || "", colour: p.get("c1") || "" };
    } catch (e) { return { name: "", firm: "", colour: "" }; }
  })();

  function unpack() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return null;
    try {
      const s = raw.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch (e) { return null; }
  }

  let V = {};       /* answers — for a check, the setup answers */
  let MARK = {};    /* check only: item id -> "need" | "have" | "na" */
  let ROWS = [];    /* track only */

  (function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    V = (s && s.v) || {};
    MARK = (s && s.mark) || {};
    ROWS = (s && s.rows) || [];

    /* a link carries what the adviser already filled in, so a client is
       never asked for something they have already been asked for. It wins
       over this browser's copy only where it actually says something. */
    const sent = unpack();
    if (sent) {
      for (const k in (sent.v || {})) V[k] = sent.v[k];
      for (const k in (sent.m || {})) if (MARK[k] === undefined) MARK[k] = sent.m[k];
    }

    /* a form may open with sensible defaults rather than an empty page */
    for (const k in (FORM.seed || {})) if (V[k] === undefined) V[k] = FORM.seed[k];
  })();

  /* ------------------------------------------------------------
     Saving.

     Typing is debounced, because writing to localStorage on every
     keystroke is wasteful. Everything else — a tick, a choice, a
     row moved — is written the moment it happens, because those
     are the actions someone takes and then immediately closes the
     tab. A client who ticks four documents on a train and shuts
     the phone must not lose them, and a 220ms debounce is exactly
     long enough to lose them.

     The page also flushes on the way out, for the keystroke that
     was still in flight.
     ------------------------------------------------------------ */
  let saveTimer = null;

  function writeNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: V, mark: MARK, rows: ROWS, at: Date.now() }));
    } catch (e) {}
    const s = $("fSaved");
    if (s) {
      s.textContent = "Saved"; s.classList.add("is-on");
      setTimeout(function () { s.classList.remove("is-on"); }, 1400);
    }
    document.dispatchEvent(new CustomEvent("wd:form-change", { detail: { form: FORM.id } }));
  }

  function save(now) {
    if (now) return writeNow();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 220);
  }

  window.addEventListener("pagehide", function () { if (saveTimer) writeNow(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden" && saveTimer) writeNow();
  });

  /* ============================================================
     fields
     ============================================================ */
  const M = R.math;

  function fieldHTML(it, val) {
    const id = "f_" + it.id;
    if (it.kind === "bool") {
      return '<div class="f-seg" role="group">' +
        '<button type="button" class="f-opt' + (val === true ? " is-on" : "") + '" data-v="true">Yes</button>' +
        '<button type="button" class="f-opt' + (val === false ? " is-on" : "") + '" data-v="false">No</button>' +
      "</div>";
    }
    if (it.kind === "choice") {
      return '<div class="f-seg" role="group">' + (it.options || []).map(function (o) {
        return '<button type="button" class="f-opt' + (String(val) === String(o.v) ? " is-on" : "") +
          '" data-v="' + esc(o.v) + '">' + esc(o.label) + "</button>";
      }).join("") + "</div>";
    }
    if (it.kind === "text") {
      return '<input id="' + id + '" type="text" class="f-in" autocomplete="off" value="' +
        esc(val === undefined ? "" : val) + '" placeholder="' + esc(it.placeholder || "") + '">';
    }
    const isMoney = it.kind === "money", isRate = it.kind === "rate";
    return '<span class="f-wrap' + (isMoney ? " has-pre" : "") + (isRate || it.per ? " has-post" : "") + '">' +
      (isMoney ? '<span class="f-pre">$</span>' : "") +
      '<input id="' + id + '" type="text" class="f-in" inputmode="' + (isRate ? "decimal" : "numeric") +
      '" autocomplete="off" value="' + esc(val === undefined ? "" : fmt(it, val)) + '">' +
      (isRate ? '<span class="f-post">%</span>'
              : (it.per ? '<span class="f-post">' + esc(it.per) + "</span>" : "")) +
    "</span>";
  }

  function fmt(it, v) {
    if (it.kind === "money") return Number(v).toLocaleString("en-US");
    return String(v);
  }
  function parse(it, raw) {
    if (it.kind === "text") return String(raw || "").trim();
    const n = parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
    if (!isFinite(n)) return undefined;
    if (it.min !== undefined && n < it.min) return undefined;
    if (it.max !== undefined && n > it.max) return undefined;
    if (n === 0 && !it.allowZero) return undefined;
    return n;
  }

  function wireField(box, it) {
    const input = box.querySelector("input");
    if (input) {
      input.addEventListener("input", function () {
        if (it.kind === "money") {
          const pos = input.selectionStart, before = input.value.length;
          const digits = input.value.replace(/[^0-9]/g, "");
          input.value = digits ? Number(digits).toLocaleString("en-US") : "";
          const after = input.value.length;
          try { input.setSelectionRange(Math.max(0, pos + (after - before)), Math.max(0, pos + (after - before))); } catch (e) {}
        }
        const val = parse(it, input.value);
        if (val === undefined) delete V[it.id]; else V[it.id] = val;
        box.classList.toggle("is-empty", val === undefined);
        changed();
      });
    }
    box.querySelectorAll(".f-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        const raw = b.getAttribute("data-v");
        V[it.id] = raw === "true" ? true : raw === "false" ? false : (isFinite(+raw) ? +raw : raw);
        box.querySelectorAll(".f-opt").forEach(function (o) { o.classList.remove("is-on"); });
        b.classList.add("is-on");
        changed(true);
      });
    });
  }

  /* one change may hide another question, so an ask re-renders its groups */
  function changed(now) {
    save(now);
    if (FORM.kind === "ask") { paintGroups(); paintAnswer(); }
    else if (FORM.kind === "check") { paintCheck(); }
  }

  /* ============================================================
     the shell
     ============================================================ */
  function initials(name) {
    const bits = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!bits.length) return "•";
    return (bits[0][0] + (bits.length > 1 ? bits[bits.length - 1][0] : "")).toUpperCase();
  }

  function shell() {
    document.title = (CLIENT ? FORM.name : FORM.name + " — WEALTHDEMO");

    const top = CLIENT
      ? '<header class="f-top is-client">' +
          '<span class="f-who"><span class="f-avatar"></span>' +
            "<span><b></b><small></small></span></span>" +
          '<span class="f-grow"></span>' +
          '<span class="f-saved" id="fSaved">Saved</span>' +
        "</header>"
      : '<header class="f-top">' +
          '<a class="f-back" href="home.html">' + svg("back") + "Tools</a>" +
          '<i class="f-div"></i>' +
          '<span class="f-cat" data-tint="' + esc(FORM.tint) + '">' + esc(FORM.cat) + "</span>" +
          '<h1 class="f-name"></h1>' +
          '<span class="f-grow"></span>' +
          '<span class="f-saved" id="fSaved">Saved</span>' +
        "</header>";

    /* ------------------------------------------------------------
       The hero.

       Every calculator on this site opens with a dark band that
       says what the tool is and what it has found. A form opened
       with a thin white strip and then grey — which is most of
       the reason it read as a different product altogether.

       The right-hand slot carries the live finding: the score,
       the number of documents outstanding, the value in the
       pipeline. That is the figure somebody wants at a glance,
       and it was previously a bare ring floating in the rail
       with nothing to say on an empty form.
       ------------------------------------------------------------ */
    const hero = CLIENT ? "" :
      '<section class="f-hero">' +
        '<span class="f-hero-tile">' + svg(FORM.icon || "doc") + "</span>" +
        '<div class="f-hero-text">' +
          '<span class="f-hero-eyebrow">' + esc(FORM.cat || "") +
            (FORM.who ? " · " + esc(FORM.who) : "") +
            (FORM.minutes ? " · about " + FORM.minutes + " min" : "") + "</span>" +
          "<h1></h1>" +
          "<p></p>" +
        "</div>" +
        '<div class="f-hero-fig" id="fHeroFig"></div>' +
      "</section>";

    mount.innerHTML = top + hero +
      '<div class="f-body">' +
        '<main class="f-main" id="fMain"></main>' +
        '<aside class="f-rail" id="fRail"></aside>' +
      "</div>";

    if (!CLIENT) {
      mount.querySelector(".f-hero h1").textContent = FORM.name;
      mount.querySelector(".f-hero p").textContent = FORM.lede || "";
    }

    if (CLIENT) {
      const name = FROM.name || "Your adviser";
      mount.querySelector(".f-who b").textContent = name;
      mount.querySelector(".f-who small").textContent = FROM.firm || "";
      mount.querySelector(".f-avatar").textContent = initials(name);
      /* an adviser's own colour, checked for legibility before it is used */
      const c = /^#?([0-9a-f]{6})$/i.exec(FROM.colour || "");
      if (c) {
        const n = parseInt(c[1], 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 <= 0.72) {
          mount.style.setProperty("--t", "#" + c[1]);
          mount.style.setProperty("--t-a", r + ", " + g + ", " + b);
        }
      }
    } else {
      mount.querySelector(".f-name").textContent = FORM.name;
    }

    mount.setAttribute("data-tint", FORM.tint || "mint");
    mount.setAttribute("data-kind", FORM.kind);
    mount.setAttribute("data-as", CLIENT ? "client" : "adviser");
  }

  /* ============================================================
     ASK — questions in groups, answer on the right
     ============================================================ */
  function paintGroups() {
    const main = $("fMain");
    const openBefore = {};
    main.querySelectorAll("[data-group]").forEach(function (g) {
      openBefore[g.getAttribute("data-group")] = true;
    });

    const html = [];
    /* the lede is in the hero now; a client has no hero, so it stays for them */
    if (CLIENT) html.push('<p class="f-lede">' + esc(FORM.lede) + "</p>");

    (FORM.groups || [{ id: "_", name: "" }]).forEach(function (g, gi) {
      const items = (FORM.items || []).filter(function (i) {
        return (i.group || "_") === g.id && R.applies(i, V);
      });
      if (!items.length) return;
      const done = items.filter(function (i) { return V[i.id] !== undefined; }).length;
      const all = done === items.length;

      html.push('<section class="f-group" data-group="' + esc(g.id) + '">');
      html.push('<div class="f-ghead">' +
        '<span class="f-gmark' + (all ? " is-done" : "") + '">' +
          (all ? svg("tick") : String(gi + 1)) + "</span>" +
        '<span class="f-gname">' + esc(g.name) + "</span>" +
        '<span class="f-grule"></span>' +
        '<span class="f-gn">' + done + "/" + items.length + "</span>" +
      "</div>");
      html.push('<div class="f-fields">');
      items.forEach(function (it) {
        const val = V[it.id];
        html.push('<div class="f-field' + (val === undefined ? " is-empty" : "") +
          (it.kind === "text" ? " is-wide" : "") + '" data-item="' + esc(it.id) + '">' +
          (it.kind === "bool" || it.kind === "choice"
            ? '<span class="f-label">' + esc(it.ask) + "</span>"
            : '<label class="f-label" for="f_' + esc(it.id) + '">' + esc(it.ask) + "</label>") +
          fieldHTML(it, val) +
          (it.hint ? '<span class="f-hint">' + esc(it.hint) + "</span>" : "") +
        "</div>");
      });
      html.push("</div></section>");
    });

    main.innerHTML = html.join("");
    (FORM.items || []).forEach(function (it) {
      const box = main.querySelector('[data-item="' + it.id + '"]');
      if (box) wireField(box, it);
    });
  }

  /* the finding, in the hero — the one figure somebody wants at a glance */
  function heroFig(parts) {
    const el = $("fHeroFig");
    if (!el) return;
    if (!parts) { el.innerHTML = ""; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML =
      '<span class="f-hero-eyebrow">' + esc(parts.label) + "</span>" +
      '<b data-tone="' + esc(parts.tone || "") + '">' + esc(parts.value) + "</b>" +
      (parts.note ? "<small>" + esc(parts.note) + "</small>" : "");
  }

  function ring(score) {
    const r = 52, c = 2 * Math.PI * r;
    const on = Math.max(0, Math.min(100, score)) / 100 * c;
    return '<svg class="f-ring" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="' + r + '" class="f-ring-bg"/>' +
      '<circle cx="60" cy="60" r="' + r + '" class="f-ring-on" ' +
        'stroke-dasharray="' + on.toFixed(1) + " " + c.toFixed(1) + '"/>' +
    "</svg>";
  }

  function ready() {
    const need = (FORM.items || []).filter(function (i) {
      return R.applies(i, V) && i.kind !== "text";
    });
    const have = need.filter(function (i) { return V[i.id] !== undefined; });
    return { have: have.length, need: need.length, ok: have.length === need.length };
  }

  /* ------------------------------------------------------------
     What the client sees instead of the verdict.

     Not a watered-down version of the adviser's panel — a
     different job. They need to know how far through they are
     and how to send it back, and nothing else. A readiness
     score belongs in a conversation, not on a phone screen.
     ------------------------------------------------------------ */
  function clientRail() {
    const rail = $("fRail");
    let done, of, line;

    if (FORM.kind === "check") {
      const s = checkStats();
      done = s.have.length; of = s.of;
      line = s.need.length
        ? s.need.length + (s.need.length === 1 ? " thing" : " things") + " left"
        : "That is everything";
    } else {
      const st = ready();
      done = st.have; of = st.need;
      line = st.ok ? "All answered" : (of - done) + " left";
    }
    const frac = of ? done / of : 0;

    rail.innerHTML =
      '<div class="f-cprog">' +
        "<b>" + esc(line) + "</b>" +
        '<span class="f-meter"><i style="width:' + Math.round(frac * 100) + '%"></i></span>' +
        "<small>" + done + " of " + of + " done</small>" +
      "</div>" +
      '<p class="f-quiet">Nothing is sent until you press the button. You can close this and come back — it remembers.</p>' +
      '<div class="f-actions">' +
        '<button type="button" class="f-btn" id="fReturn">Send it back' +
          (FROM.name ? " to " + esc(FROM.name.split(" ")[0]) : "") + "</button>" +
      "</div>" +
      '<div id="fReturnOut"></div>';

    $("fReturn").addEventListener("click", returnIt);
  }

  /* the answers go home the way the assessment's always have: inside the
     link, where no server ever sees them unless the adviser is signed in */
  function returnIt() {
    const out = $("fReturnOut");
    const url = location.origin + location.pathname + "?f=" + FORM.id +
                (param("c") ? "&c=" + encodeURIComponent(param("c")) : "") + "#" + pack();
    let copied = false;
    try { navigator.clipboard.writeText(url); copied = true; } catch (e) {}

    document.dispatchEvent(new CustomEvent("wd:form-returned", {
      detail: { form: FORM.id, v: V, mark: MARK }
    }));

    out.innerHTML =
      '<div class="f-done">' +
        '<span class="f-done-tick">' + svg("tick") + "</span>" +
        "<b>Ready to send</b>" +
        "<p>" + (copied ? "The link is on your clipboard. " : "") +
          "Paste it into a reply and " + esc(FROM.name || "your adviser") + " will see your answers.</p>" +
        '<label class="f-done-l" for="fReturnLink">Your link</label>' +
        '<input class="f-in" id="fReturnLink" readonly value="' + esc(url) + '">' +
      "</div>";
    const inp = $("fReturnLink");
    inp.addEventListener("focus", function () { inp.select(); });
    setTimeout(function () { try { inp.select(); } catch (e) {} }, 50);
  }

  /* the figures live in the main column, below the questions */
  function figuresInMain(out) {
    const main = $("fMain");
    if (!main) return;
    let box = $("fOut");
    if (!out || !(out.figures || []).length) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement("section");
      box.className = "f-out";
      box.id = "fOut";
      main.appendChild(box);
    }
    box.innerHTML =
      '<span class="f-eyebrow">What these answers come to</span>' +
      '<div class="f-figs">' +
      (out.figures || []).map(function (f) {
        return '<div class="f-fig' + (f.big ? " is-big" : "") + '" data-tone="' + esc(f.tone || "") +
          '" id="fig_' + esc(f.id) + '">' +
          '<span class="f-fig-l">' + esc(f.label) + "</span>" +
          '<b class="f-fig-v">' + esc(f.value) + "</b>" +
          (f.meter !== undefined
            ? '<span class="f-meter"><i style="width:' +
              Math.round(Math.max(0, Math.min(1, f.meter)) * 100) + '%"></i>' +
              (f.mark !== undefined ? '<em style="left:' + Math.round(f.mark * 100) + '%"></em>' : "") + "</span>"
            : "") +
          (f.note ? '<span class="f-fig-n">' + esc(f.note) + "</span>" : "") +
        "</div>";
      }).join("") +
      "</div>";
  }

  function paintAnswer() {
    const rail = $("fRail");
    if (CLIENT) return clientRail();
    const st = ready();

    if (!st.ok) {
      /* ----------------------------------------------------------
         What an unfinished form should say.

         It used to be a ring reading 0/10 and the sentence "the
         answer builds as you go" — a progress bar dressed as a
         verdict, on a page where the questions already carry their
         own n-of-m counters. It told nobody anything.

         Instead: which group is still open, and what the finished
         answer will actually tell them. The second half is the
         useful one — it is the reason to keep typing.

         The actions belong here too. Sending a blank form to a
         client is the commonest thing an adviser does with one,
         and hiding the button until the adviser has answered it
         themselves would be exactly backwards.
         ---------------------------------------------------------- */
      heroFig({ label: "Progress", value: st.have + " of " + st.need,
                note: st.have ? "answered" : "nothing answered yet" });
      figuresInMain(null);

      const groups = (FORM.groups || []).map(function (g) {
        const items = (FORM.items || []).filter(function (i) {
          return (i.group || "_") === g.id && R.applies(i, V) && i.kind !== "text";
        });
        const done = items.filter(function (i) { return V[i.id] !== undefined; }).length;
        return { name: g.name, done: done, of: items.length };
      }).filter(function (g) { return g.of; });

      const next = groups.filter(function (g) { return g.done < g.of; })[0];

      rail.innerHTML =
        '<div class="f-waiting">' +
          "<h2>" + (st.have
            ? esc((st.need - st.have) + " " + (st.need - st.have === 1 ? "answer" : "answers") + " to go")
            : "Start anywhere") + "</h2>" +
          "<p>" + (next
            ? "Next up is <b>" + esc(next.name.toLowerCase()) + "</b>."
            : "Fill the questions on the left and the verdict appears here.") +
            " Nothing is worked out until every question has an answer, so the number is never half-true.</p>" +
          '<div class="f-spine">' +
            groups.map(function (g) {
              return '<div class="f-spine-row' + (g.done === g.of ? " is-done" : "") + '">' +
                '<span class="f-spine-n">' + g.done + "/" + g.of + "</span>" +
                '<span class="f-spine-name">' + esc(g.name) + "</span>" +
                '<span class="f-meter"><i style="width:' +
                  Math.round((g.of ? g.done / g.of : 0) * 100) + '%"></i></span>' +
              "</div>";
            }).join("") +
          "</div>" +
        "</div>" +
        (FORM.bands && FORM.bands.length
          ? '<div class="f-preview"><span class="f-eyebrow">What it will tell you</span>' +
              FORM.bands.map(function (b, i, all) {
                /* a band's range, read off its neighbours — "85+", "65–84" */
                const hi = i === 0 ? null : all[i - 1].min - 1;
                return '<div class="f-band" data-tone="' + esc(b.tone || "") + '">' +
                  "<b>" + esc(b.label) + "</b>" +
                  '<span>' + (hi === null ? b.min + "+"
                            : (b.min === 0 ? "under " + (hi + 1) : b.min + "\u2013" + hi)) +
                  "</span></div>";
              }).join("") +
            "</div>"
          : "") +
        actions();
      wireActions();
      return;
    }

    const out = FORM.compute(V);
    const b = R.band(FORM.bands || [{ min: 0, label: "", tone: "" }], out.score);

    heroFig({ label: "Score", value: out.score + "/100", tone: b.tone || "", note: b.label });

    const html = [];
    html.push('<div class="f-verdict" data-tone="' + esc(b.tone || "") + '">' +
      '<div class="f-score">' + ring(out.score) + "<b>" + out.score + "<small>/100</small></b></div>" +
      "<div><h2>" + esc(b.label) + "</h2><p>" + esc(b.say || "") + "</p></div>" +
    "</div>");

    /* ----------------------------------------------------------
       The figures go under the questions, not in the rail.

       They are what the answers on the left add up to — the
       payment, the ratios, the deposit — and they read as the
       result of that column. Stacked in the rail they also left
       the left-hand side ending halfway up a tall page, which is
       what the empty half of this screen used to be.

       The rail keeps what it is for: the verdict, what would
       change it, and what to do with the form.
       ---------------------------------------------------------- */
    figuresInMain(out);

    if ((out.notes || []).length) {
      html.push('<div class="f-notes"><span class="f-eyebrow">What would change it</span>');
      out.notes.forEach(function (n) {
        html.push('<div class="f-note" data-tone="' + esc(n.tone || "") + '">' +
          "<b>" + esc(n.head) + "</b><span>" + esc(n.body) + "</span></div>");
      });
      html.push("</div>");
    }

    html.push(actions());
    rail.innerHTML = html.join("");
    wireActions();
  }

  /* ============================================================
     CHECK — a list that only shows what this case needs
     ============================================================ */
  const STATES = ["need", "have", "na"];
  const STATE_WORD = { need: "Still needed", have: "In", na: "Not needed" };

  function paintCheck() {
    const main = $("fMain");
    const html = [];
    /* the lede is in the hero now; a client has no hero, so it stays for them */
    if (CLIENT) html.push('<p class="f-lede">' + esc(FORM.lede) + "</p>");

    /* The setup row — the answers that decide what the list contains.
       The client never sees it: the adviser already decided which case
       this is, and asking a borrower whether they are self-employed
       twice is how a form starts feeling like paperwork. */
    if (!CLIENT) {
      html.push('<section class="f-setup"><span class="f-eyebrow">About this case</span><div class="f-setrow">');
      (FORM.setup || []).forEach(function (it) {
        if (!R.applies(it, V)) return;
        html.push('<div class="f-set" data-item="' + esc(it.id) + '">' +
          '<span class="f-set-q">' + esc(it.ask) + "</span>" +
          fieldHTML(it, V[it.id]) + "</div>");
      });
      html.push("</div></section>");
    }

    const items = (FORM.items || []).filter(function (i) { return R.applies(i, V); });
    (FORM.groups || []).forEach(function (g) {
      const mine = items.filter(function (i) { return i.group === g.id; });
      if (!mine.length) return;
      html.push('<section class="f-group"><div class="f-ghead">' +
        '<span class="f-gname">' + esc(g.name) + "</span>" +
        '<span class="f-grule"></span>' +
        '<span class="f-gn">' + mine.filter(function (i) { return MARK[i.id] === "have"; }).length +
          "/" + mine.filter(function (i) { return MARK[i.id] !== "na"; }).length + "</span>" +
      "</div><ul class=\"f-list\">");
      mine.forEach(function (i) {
        const s = MARK[i.id] || "need";
        html.push('<li class="f-item" data-state="' + s + '" data-id="' + esc(i.id) + '">' +
          '<button type="button" class="f-box" aria-label="' + esc(STATE_WORD[s]) + '">' +
            (s === "have" ? svg("tick") : (s === "na" ? svg("cross") : "")) + "</button>" +
          '<span class="f-item-t"><b>' + esc(i.name) + "</b>" +
            (i.note ? "<small>" + esc(i.note) + "</small>" : "") + "</span>" +
          '<span class="f-item-s">' + esc(STATE_WORD[s]) + "</span>" +
        "</li>");
      });
      html.push("</ul></section>");
    });

    main.innerHTML = html.join("");

    (FORM.setup || []).forEach(function (it) {
      const box = main.querySelector('.f-set[data-item="' + it.id + '"]');
      if (box) wireField(box, it);
    });
    main.querySelectorAll(".f-item").forEach(function (li) {
      li.querySelector(".f-box").addEventListener("click", function () {
        const id = li.getAttribute("data-id");
        const now = MARK[id] || "need";
        /* the client gets two states, not three. Deciding an item does
           not apply is the adviser's call, and a borrower who can tick
           "not needed" will tick it on the thing they cannot find. */
        const cycle = CLIENT ? ["need", "have"] : STATES;
        const at = cycle.indexOf(now);
        MARK[id] = cycle[(at < 0 ? 0 : at + 1) % cycle.length];
        save(true);
        paintCheck();
      });
    });
    paintCheckRail();
  }

  function checkStats() {
    const items = (FORM.items || []).filter(function (i) { return R.applies(i, V); });
    const na = items.filter(function (i) { return MARK[i.id] === "na"; });
    const have = items.filter(function (i) { return MARK[i.id] === "have"; });
    const need = items.filter(function (i) { return (MARK[i.id] || "need") === "need"; });
    return { items: items, na: na, have: have, need: need,
             of: items.length - na.length,
             pct: (items.length - na.length) ? have.length / (items.length - na.length) : 0 };
  }

  function paintCheckRail() {
    if (CLIENT) return clientRail();
    const s = checkStats();
    const html = [];

    heroFig({
      label: s.need.length ? "Outstanding" : "Status",
      value: s.need.length ? String(s.need.length) : "Complete",
      tone: s.need.length ? "warn" : "good",
      note: s.have.length + " of " + s.of + " in"
    });

    /* ------------------------------------------------------------
       The rail used to reprint the list.

       Every document was on the left, and then every outstanding
       document was on the right again under "Outstanding" — so on
       an untouched checklist the page said the same six things
       twice, which is the clearest way there is to tell somebody
       a screen has not been thought about.

       It now does the job the left column cannot: it says which
       group is holding the file up, names the single next thing
       to chase, and explains why this borrower's list is the
       length it is.
       ------------------------------------------------------------ */
    html.push('<div class="f-verdict" data-tone="' + (s.need.length ? "warn" : "good") + '">' +
      '<div class="f-score">' + ring(s.pct * 100) + "<b>" + s.have.length + "<small>/" + s.of + "</small></b></div>" +
      "<div><h2>" + (s.need.length ? s.need.length + " still needed" : "Everything is in") + "</h2>" +
      "<p>" + (s.need.length
        ? "Chase these and the file is ready to go out."
        : "Nothing outstanding on this file.") + "</p></div>" +
    "</div>");

    /* where the gaps are, by group — not item by item */
    const groups = (FORM.groups || []).map(function (g) {
      const mine = s.items.filter(function (i) { return (i.group || "_") === g.id; });
      const live = mine.filter(function (i) { return MARK[i.id] !== "na"; });
      const got = mine.filter(function (i) { return MARK[i.id] === "have"; });
      return { name: g.name, done: got.length, of: live.length };
    }).filter(function (g) { return g.of; });

    if (groups.length) {
      html.push('<div class="f-spine">' + groups.map(function (g) {
        return '<div class="f-spine-row' + (g.done === g.of ? " is-done" : "") + '">' +
          '<span class="f-spine-n">' + g.done + "/" + g.of + "</span>" +
          '<span class="f-spine-name">' + esc(g.name) + "</span>" +
          '<span class="f-meter"><i style="width:' +
            Math.round((g.of ? g.done / g.of : 0) * 100) + '%"></i></span>' +
        "</div>";
      }).join("") + "</div>");
    }

    /* one thing to chase, not a second copy of the list */
    if (s.need.length) {
      const n = s.need[0];
      html.push('<div class="f-next"><span class="f-eyebrow">Chase this one next</span>' +
        "<b>" + esc(n.name) + "</b>" +
        (n.note ? "<p>" + esc(n.note) + "</p>" : "") +
        (s.need.length > 1
          ? '<small>and ' + (s.need.length - 1) +
            (s.need.length - 1 === 1 ? " other" : " others") + " on the left</small>"
          : "") +
      "</div>");
    }

    /* why this list is the length it is */
    const why = (FORM.setup || []).filter(function (q) { return V[q.id] !== undefined; })
      .map(function (q) {
        const v = V[q.id];
        const said = q.kind === "bool" ? (v ? "Yes" : "No")
          : (q.options || []).filter(function (o) { return String(o.v) === String(v); })
              .map(function (o) { return o.label; })[0] || String(v);
        return { ask: q.ask, said: said };
      });
    if (why.length) {
      html.push('<div class="f-why"><span class="f-eyebrow">Why this list</span>' +
        why.map(function (w) {
          return '<div class="f-why-row"><span>' + esc(w.ask) + "</span><b>" + esc(w.said) + "</b></div>";
        }).join("") +
        (s.na.length
          ? "<small>" + s.na.length + (s.na.length === 1 ? " item is" : " items are") +
            " not needed because of these, and are not counted.</small>"
          : "") +
      "</div>");
    }

    html.push(actions());
    $("fRail").innerHTML = html.join("");
    wireActions();
  }

  /* ============================================================
     TRACK — rows that move between stages
     ============================================================ */
  function uid() { return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function paintTrack() {
    const main = $("fMain");
    const html = [];
    /* the lede is in the hero now; a client has no hero, so it stays for them */
    if (CLIENT) html.push('<p class="f-lede">' + esc(FORM.lede) + "</p>");
    html.push('<div class="f-board">');

    (FORM.stages || []).forEach(function (st) {
      const mine = ROWS.filter(function (r) { return r.stage === st.id; });
      html.push('<section class="f-col" data-tint="' + esc(st.tint || "mist") + '" data-stage="' + esc(st.id) + '">' +
        '<header class="f-col-h"><b>' + esc(st.name) + "</b><span>" + mine.length + "</span></header>" +
        '<div class="f-col-b">');
      mine.forEach(function (r) {
        const days = Math.floor((Date.now() - (r.at || Date.now())) / 86400000);
        const stale = FORM.staleAfter && days >= FORM.staleAfter &&
                      st.id !== "closed" && st.id !== "lost" && st.id !== "done" && st.id !== "nochange";
        html.push('<article class="f-card' + (stale ? " is-stale" : "") + '" data-row="' + esc(r.id) + '">' +
          '<b class="f-card-n"></b>' +
          (r.amount ? '<span class="f-card-a">' + esc(M.money(r.amount)) + "</span>" : "") +
          (r.note ? '<span class="f-card-note"></span>' : "") +
          '<div class="f-card-f">' +
            '<span class="f-card-d">' + (days === 0 ? "today" : days + "d") + "</span>" +
            '<select class="f-move" aria-label="Move">' +
              (FORM.stages).map(function (s2) {
                return '<option value="' + esc(s2.id) + '"' + (s2.id === st.id ? " selected" : "") + ">" +
                  esc(s2.name) + "</option>";
              }).join("") +
            "</select>" +
            '<button type="button" class="f-del" aria-label="Remove">' + svg("cross") + "</button>" +
          "</div>" +
        "</article>");
      });
      html.push('<button type="button" class="f-add" data-stage="' + esc(st.id) + '">' +
        svg("plus") + "Add</button>");
      html.push("</div></section>");
    });
    html.push("</div>");

    /* ------------------------------------------------------------
       Seven stages do not fit in one screen, and the board was
       simply cut off at five with nothing to say the other two
       existed. Same arrows as the tool hub's bands: hidden when
       everything already fits, so they never appear for nothing.
       ------------------------------------------------------------ */
    html.push('<div class="f-boardnav" hidden>' +
      '<button type="button" class="f-barrow" data-dir="-1" aria-label="Earlier stages">' +
        svg("back") + "</button>" +
      '<button type="button" class="f-barrow" data-dir="1" aria-label="Later stages">' +
        svg("arrow") + "</button>" +
    "</div>");

    main.innerHTML = html.join("");

    const board = main.querySelector(".f-board");
    const bnav = main.querySelector(".f-boardnav");
    if (board && bnav) {
      bnav.querySelectorAll(".f-barrow").forEach(function (b) {
        b.addEventListener("click", function () {
          board.scrollBy({ left: board.clientWidth * 0.8 * (+b.getAttribute("data-dir")),
                           behavior: "smooth" });
        });
      });
      const syncNav = function () {
        const room = board.scrollWidth - board.clientWidth;
        bnav.hidden = room < 8;
        bnav.querySelector('[data-dir="-1"]').disabled = board.scrollLeft < 8;
        bnav.querySelector('[data-dir="1"]').disabled = board.scrollLeft > room - 8;
      };
      board.addEventListener("scroll", syncNav, { passive: true });
      window.addEventListener("resize", syncNav);
      syncNav();
    }

    /* names and notes as text, never as markup */
    ROWS.forEach(function (r) {
      const el = main.querySelector('[data-row="' + r.id + '"]');
      if (!el) return;
      el.querySelector(".f-card-n").textContent = r.name || "Unnamed";
      const n = el.querySelector(".f-card-note");
      if (n) n.textContent = r.note;
    });

    main.querySelectorAll(".f-add").forEach(function (b) {
      b.addEventListener("click", function () { addRow(b.getAttribute("data-stage")); });
    });
    main.querySelectorAll(".f-card").forEach(function (card) {
      const id = card.getAttribute("data-row");
      card.querySelector(".f-move").addEventListener("change", function (e) {
        const row = ROWS.filter(function (r) { return r.id === id; })[0];
        if (row) { row.stage = e.target.value; row.at = Date.now(); }
        save(true); paintTrack();
      });
      card.querySelector(".f-del").addEventListener("click", function () {
        ROWS = ROWS.filter(function (r) { return r.id !== id; });
        save(true); paintTrack();
      });
      card.addEventListener("click", function (e) {
        if (e.target.closest(".f-card-f")) return;
        editRow(id);
      });
    });
    paintTrackRail();
  }

  function addRow(stage) {
    const row = { id: uid(), stage: stage, at: Date.now() };
    ROWS.push(row);
    save(true);
    paintTrack();
    editRow(row.id, true);
  }

  function editRow(id, isNew) {
    const row = ROWS.filter(function (r) { return r.id === id; })[0];
    if (!row) return;
    const wrap = document.createElement("div");
    wrap.className = "f-scrim";
    wrap.innerHTML = '<div class="f-modal" role="dialog" aria-modal="true" aria-label="Edit"></div>';
    const box = wrap.querySelector(".f-modal");

    const html = ['<h2>' + (isNew ? "New" : "Edit") + "</h2>"];
    (FORM.fields || []).forEach(function (f) {
      html.push('<div class="f-field' + (f.wide ? " is-wide" : "") + '" data-item="' + esc(f.id) + '">' +
        '<label class="f-label" for="f_' + esc(f.id) + '">' + esc(f.label) + "</label>" +
        fieldHTML({ id: f.id, kind: f.kind, placeholder: f.label }, row[f.id]) + "</div>");
    });
    html.push('<div class="f-modal-f">' +
      '<button type="button" class="f-btn ghost" data-x>Cancel</button>' +
      '<button type="button" class="f-btn" data-ok>Done</button></div>');
    box.innerHTML = html.join("");

    (FORM.fields || []).forEach(function (f) {
      const b2 = box.querySelector('[data-item="' + f.id + '"]');
      const input = b2.querySelector("input");
      if (!input) return;
      input.addEventListener("input", function () {
        if (f.kind === "money") {
          const digits = input.value.replace(/[^0-9]/g, "");
          input.value = digits ? Number(digits).toLocaleString("en-US") : "";
        }
        const live = ROWS.filter(function (r) { return r.id === id; })[0] || row;
        const val = parse({ kind: f.kind, allowZero: true }, input.value);
        live[f.id] = f.kind === "text" ? input.value : val;
      });
    });

    /* read the boxes on the way out as well as on the way through. Typing
       fires input events, but a paste, an autofill or a browser restoring a
       field does not always, and a row that silently loses its figure is
       worse than one that is read twice. */
    function harvest() {
      /* Look the row up again rather than trusting the one captured when
         this editor opened. Anything that rebuilds ROWS between opening
         and closing would leave that reference pointing at an object no
         longer in the list, and the edit would vanish silently — which is
         exactly the bug this chased for two runs out of four. */
      const live = ROWS.filter(function (r) { return r.id === id; })[0] || row;
      (FORM.fields || []).forEach(function (f) {
        const input = box.querySelector("#f_" + f.id);
        if (!input) return;
        if (f.kind === "text") { live[f.id] = input.value.trim(); return; }
        const val = parse({ kind: f.kind, allowZero: true }, input.value);
        if (val === undefined) delete live[f.id]; else live[f.id] = val;
      });
    }
    function close(keep) {
      if (keep) harvest();
      wrap.remove();
      save(true);
      paintTrack();
    }
    box.querySelector("[data-ok]").addEventListener("click", function () { close(true); });
    box.querySelector("[data-x]").addEventListener("click", function () {
      if (isNew) ROWS = ROWS.filter(function (r) { return r.id !== id; });
      close(false);
    });
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(true); });
    document.body.appendChild(wrap);
    const first = box.querySelector("input");
    if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 40);
  }

  function paintTrackRail() {
    const total = ROWS.length;
    const live = ROWS.filter(function (r) { return ["closed", "lost", "done", "nochange"].indexOf(r.stage) < 0; });
    const value = live.reduce(function (n, r) { return n + (r.amount || 0); }, 0);
    const stale = live.filter(function (r) {
      return FORM.staleAfter && (Date.now() - (r.at || Date.now())) / 86400000 >= FORM.staleAfter;
    });

    const html = [];

    heroFig(total
      ? { label: "In the pipeline", value: value ? M.money(value) : String(live.length),
          tone: stale.length ? "warn" : "good",
          note: live.length + (live.length === 1 ? " file live" : " files live") }
      : { label: "In the pipeline", value: "Empty", note: "nothing added yet" });

    /* ------------------------------------------------------------
       An empty board should say what to do with it, not report
       zero in the language of a full one. "Nothing valued yet ·
       0 live · everything has moved recently" was three sentences
       about no data.
       ------------------------------------------------------------ */
    if (!total) {
      html.push('<div class="f-empty">' +
        '<span class="f-empty-ico">' + svg("plus") + "</span>" +
        "<h2>Nothing in the pipeline yet</h2>" +
        "<p>Add the first one under <b>" + esc((FORM.stages[0] || {}).name || "the first stage") +
        "</b> on the left. Each card holds a name, an amount and what is holding it up — " +
        "move it along as it goes, and anything that stops moving for " +
        (FORM.staleAfter || 7) + " days shows up here.</p>" +
      "</div>");
      html.push(actions());
      $("fRail").innerHTML = html.join("");
      wireActions();
      return;
    }

    html.push('<div class="f-verdict" data-tone="' + (stale.length ? "warn" : "good") + '">' +
      '<div class="f-score is-plain"><b>' + live.length + "<small> live</small></b></div>" +
      "<div><h2>" + (value ? M.money(value) + " moving" : live.length + " on the board") + "</h2>" +
      "<p>" + (stale.length
        ? stale.length + (stale.length === 1 ? " row has" : " rows have") + " not moved in " +
          FORM.staleAfter + " days."
        : "Everything has moved recently.") + "</p></div></div>");

    /* the funnel — where the work actually is */
    const ENDED = ["closed", "lost", "done", "nochange"];
    const funnel = (FORM.stages || []).map(function (st) {
      const mine = ROWS.filter(function (r) { return r.stage === st.id; });
      return { name: st.name, tint: st.tint || "mist", n: mine.length,
               ended: ENDED.indexOf(st.id) >= 0,
               value: mine.reduce(function (a, r) { return a + (r.amount || 0); }, 0) };
    }).filter(function (f) { return f.n; });
    const most = funnel.reduce(function (a, f) { return Math.max(a, f.n); }, 0);

    if (funnel.length) {
      html.push('<div class="f-funnel"><span class="f-eyebrow">Where they are</span>' +
        funnel.map(function (f) {
          /* a finished row is still where it is, but it is not in the
             total above it — so it is shown and visibly set apart,
             rather than quietly swelling a bar that claims to be live */
          return '<div class="f-fun-row' + (f.ended ? " is-ended" : "") +
            '" data-tint="' + esc(f.tint) + '">' +
            '<span class="f-fun-name">' + esc(f.name) + "</span>" +
            '<span class="f-fun-bar"><i style="width:' +
              Math.round((most ? f.n / most : 0) * 100) + '%"></i></span>' +
            '<span class="f-fun-n">' + f.n + "</span>" +
            (f.value ? '<span class="f-fun-v">' + esc(M.money(f.value)) +
              (f.ended ? ' <em>done</em>' : "") + "</span>" : "") +
          "</div>";
        }).join("") + "</div>");
    }

    if (stale.length) {
      html.push('<div class="f-notes"><span class="f-eyebrow">Stuck</span>');
      stale.slice(0, 8).forEach(function (r) {
        const days = Math.floor((Date.now() - (r.at || Date.now())) / 86400000);
        html.push('<div class="f-note" data-tone="warn"><b class="js-name"></b>' +
          "<span>" + days + " days in this stage" + (r.note ? " · " : "") + '<em class="js-note"></em></span></div>');
      });
      html.push("</div>");
    }
    html.push('<p class="f-quiet">' + total + (total === 1 ? " row" : " rows") + " in total. " +
      "Closed and gone-quiet rows stay for the record but are not counted above.</p>");
    html.push(actions());
    $("fRail").innerHTML = html.join("");

    const notes = $("fRail").querySelectorAll(".f-note");
    stale.slice(0, 8).forEach(function (r, i) {
      if (!notes[i]) return;
      notes[i].querySelector(".js-name").textContent = r.name || "Unnamed";
      const e = notes[i].querySelector(".js-note");
      if (e) e.textContent = r.note || "";
    });
    wireActions();
  }

  /* ============================================================
     what you do with it once it is filled in
     ============================================================ */
  function actions() {
    return '<div class="f-actions">' +
      '<button type="button" class="f-btn" id="fSave">Save to their file</button>' +
      (FORM.sendable
        ? '<button type="button" class="f-btn ghost" id="fSend">Send it to them</button>'
        : "") +
      '<button type="button" class="f-btn ghost" id="fPrint">Print</button>' +
    "</div>";
  }

  function wireActions() {
    const s = $("fSave");
    if (s) s.addEventListener("click", function () {
      save();
      s.textContent = "Saved to their file";
      s.classList.add("is-done");
      setTimeout(function () { s.textContent = "Save to their file"; s.classList.remove("is-done"); }, 1800);
      document.dispatchEvent(new CustomEvent("wd:form-save", {
        detail: { form: FORM.id, v: V, mark: MARK, rows: ROWS, result: result() }
      }));
    });
    const p = $("fPrint");
    if (p) p.addEventListener("click", function () { window.print(); });
    const sd = $("fSend");
    if (sd) sd.addEventListener("click", function () {
      const url = sendLink();
      let copied = false;
      try { navigator.clipboard.writeText(url); copied = true; } catch (e) {}
      document.dispatchEvent(new CustomEvent("wd:form-send", {
        detail: { form: FORM.id, v: V, mark: MARK, url: url }
      }));
      sd.textContent = copied ? "Link copied" : "Link ready";
      showLink(url);
      setTimeout(function () { sd.textContent = "Send it to them"; }, 2200);
    });
  }

  /* the link the client opens: the same page, told who it is for and who
     it came from, with whatever the adviser already knows folded in */
  function sendLink() {
    const me = who();
    const q = ["f=" + FORM.id, "as=client"];
    if (me.name) q.push("from=" + encodeURIComponent(me.name));
    if (me.firm) q.push("firm=" + encodeURIComponent(me.firm));
    if (me.colour) q.push("c1=" + encodeURIComponent(me.colour.replace("#", "")));
    return location.origin + location.pathname + "?" + q.join("&") + "#" + pack();
  }

  /* whatever the Studio knows about this adviser, and nothing invented */
  function who() {
    let b = {};
    try { b = JSON.parse(localStorage.getItem("wealthdemo.brand") || "{}") || {}; } catch (e) {}
    let email = "";
    try { email = localStorage.getItem("wealthdemo.session") || ""; } catch (e) {}
    return {
      name: b.name || (email ? email.split("@")[0].replace(/[._-]+/g, " ")
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : ""),
      firm: b.firm || "",
      colour: b.colour || ""
    };
  }

  function showLink(url) {
    let box = $("fSendOut");
    if (!box) {
      box = document.createElement("div");
      box.id = "fSendOut";
      $("fRail").appendChild(box);
    }
    box.innerHTML =
      '<div class="f-done">' +
        "<b>Their link</b>" +
        "<p>Send it however you normally talk to them. It opens on a phone and remembers where they got to.</p>" +
        '<label class="f-done-l" for="fSendLink">Link</label>' +
        '<input class="f-in" id="fSendLink" readonly>' +
      "</div>";
    const inp = $("fSendLink");
    inp.value = url;
    inp.addEventListener("focus", function () { inp.select(); });
  }

  function pack() {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify({ v: V, m: MARK }))))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) { return ""; }
  }

  /* what this form currently says, in a shape anything else can read —
     the client file and the assistant both go through here */
  function result() {
    if (FORM.kind === "ask") {
      if (!ready().ok) return null;
      const out = FORM.compute(V);
      const b = R.band(FORM.bands || [{ min: 0, label: "" }], out.score);
      return { kind: "ask", score: out.score, label: b.label, tone: b.tone,
               figures: out.figures, notes: out.notes, raw: out.raw };
    }
    if (FORM.kind === "check") {
      const s = checkStats();
      return { kind: "check", have: s.have.length, of: s.of, score: Math.round(s.pct * 100),
               label: s.need.length ? s.need.length + " still needed" : "Everything is in",
               outstanding: s.need.map(function (i) { return i.name; }) };
    }
    const live = ROWS.filter(function (r) { return ["closed", "lost", "done", "nochange"].indexOf(r.stage) < 0; });
    return { kind: "track", live: live.length, total: ROWS.length,
             value: live.reduce(function (n, r) { return n + (r.amount || 0); }, 0) };
  }

  /* ============================================================
     go
     ============================================================ */
  shell();
  if (FORM.kind === "ask") { paintGroups(); paintAnswer(); }
  else if (FORM.kind === "check") { paintCheck(); }
  else { paintTrack(); }

  window.WD_FORMRUN = {
    form: FORM,
    values: function () { return V; },
    marks: function () { return MARK; },
    rows: function () { return ROWS; },
    result: result,
    set: function (id, val) {                /* used by tests and by the assistant */
      V[id] = val;
      if (FORM.kind === "ask") { paintGroups(); paintAnswer(); } else { paintCheck(); }
      return result();
    },
    reset: function () { V = {}; MARK = {}; ROWS = [];
      for (const k in (FORM.seed || {})) V[k] = FORM.seed[k];
      save();
      if (FORM.kind === "ask") { paintGroups(); paintAnswer(); }
      else if (FORM.kind === "check") paintCheck(); else paintTrack(); }
  };
})();
