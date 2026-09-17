/* ============================================================
   WEALTHDEMO — the prep sheet

   Ninety seconds, read standing up, before you walk into the
   meeting. Their words first, because that is what they
   actually came for. Then the three numbers to open with, then
   the one move worth making, then everything else folded away.

   This is the only place the judgement findings appear. The
   client's own page counted them and named the topics; here
   they are set out in full, because this is the person who is
   qualified to weigh them.
   ============================================================ */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  if (!$("roster")) return;

  const C = window.WD.client;
  const F = window.WD.findings;
  const P = window.WD.profile;

  const esc = function (s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  /* ============================================================
     something came back
     ============================================================ */
  let landed = null;

  function readHash() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return;
    const got = C.unpack(raw);
    if (!got || !got.extra || !got.extra.r) return;     /* r marks a returned run */
    landed = got;
  }

  function paintLanded() {
    if (!landed) { $("landed").hidden = true; return; }
    const name = landed.facts.name || "Someone";
    const n = Object.keys(landed.facts).length;
    $("landed").hidden = false;
    $("landedTitle").textContent = name + "'s answers are here";
    $("landedNote").textContent = n + " figures, plus what they said they want from the meeting. " +
      "Saving keeps them in this browser so every tool on the site opens already filled in.";
  }

  $("saveBtn").addEventListener("click", function () {
    if (!landed) return;
    const name = landed.facts.name || "";
    /* if this person is already on the list, update rather than duplicate */
    const existing = C.list().filter(function (r) {
      return name && r.name.toLowerCase() === name.toLowerCase();
    })[0];
    if (existing) C.open(existing.id); else C.create({}, "client");
    C.setMany(landed.facts, "client");
    C.derive();
    C.stamp("returned");
    const r = C.record();
    r.hes = (landed.extra && landed.extra.h) || {};
    r.answers = (landed.extra && landed.extra.a) || {};
    C.stamp("returned");
    landed = null;
    history.replaceState(null, "", location.pathname);
    paintLanded();
    paintRoster();
    paintPrep();
    window.scrollTo(0, 0);
  });

  /* ============================================================
     the roster
     ============================================================ */
  function when(ts) {
    if (!ts) return "";
    const d = Math.round((Date.now() - ts) / 864e5);
    if (d <= 0) return "today";
    if (d === 1) return "yesterday";
    if (d < 30) return d + " days ago";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function paintRoster() {
    const rows = C.list().filter(function (r) { return r.facts > 0; });
    const box = $("roster");
    if (!rows.length) {
      box.innerHTML = '<p class="dk-empty">Nothing here yet. Send an assessment and it will land on this page ' +
        'when they finish it.</p>';
      $("rosterNote").textContent = "Everyone whose assessment has come back.";
      return;
    }
    $("rosterNote").textContent = rows.length + (rows.length === 1 ? " client" : " clients") +
      " on this device.";
    const active = C.id();
    box.innerHTML = rows.map(function (r) {
      return '<button type="button" class="dk-row' + (r.id === active ? " is-on" : "") +
        '" data-id="' + esc(r.id) + '">' +
        '<span class="dk-ava">' + esc(ini(r.name)) + '</span>' +
        '<span class="dk-row-txt"><b>' + esc(r.name) + '</b>' +
          '<small>' + esc(r.email || (r.facts + " answers")) + '</small></span>' +
        '<span class="dk-row-when">' + esc(r.meetingAt ? meetText(r.meetingAt) : when(r.updated)) + '</span>' +
      '</button>';
    }).join("");
    box.querySelectorAll(".dk-row").forEach(function (b) {
      b.addEventListener("click", function () {
        C.open(b.getAttribute("data-id"));
        paintRoster(); paintPrep();
        $("prep").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function ini(name) {
    const b = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!b.length) return "?";
    return (b[0][0] + (b.length > 1 ? b[b.length - 1][0] : "")).toUpperCase();
  }

  function meetText(v) {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    const days = Math.round((d - new Date()) / 864e5);
    const s = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (days < 0) return s;
    if (days === 0) return s + " — today";
    if (days === 1) return s + " — tomorrow";
    return s + " — in " + days + " days";
  }

  /* ============================================================
     the prep sheet
     ============================================================ */
  function paintPrep() {
    const v = C.all();
    if (!Object.keys(v).length) { $("prep").hidden = true; return; }
    $("prep").hidden = false;

    const res = F.run(v);
    const lever = F.lever(res);
    const name = v.name || "This client";

    $("prepName").textContent = name;
    $("prepMeta").textContent = [
      v.age ? "Age " + v.age : "",
      v.dependents ? v.dependents + (v.dependents === 1 ? " child" : " children") : "",
      v.income ? F.usd(v.income) + " a year" : "",
      v.email || ""
    ].filter(Boolean).join("  ·  ");
    $("prepWhen").innerHTML = v.meetingAt
      ? '<small>Meeting</small><b>' + esc(meetText(v.meetingAt)) + '</b>'
      : '<small>Answers returned</small><b>' + esc(when(C.record().returnedAt || C.record().updated)) + '</b>';

    /* ---------- their words ---------- */
    if (v.goal) {
      $("quoteBox").hidden = false;
      $("quoteText").textContent = "“" + v.goal + "”";
      $("quoteWho").textContent = "— " + name + ", in their own words";
    } else { $("quoteBox").hidden = true; }

    /* ---------- the three numbers to open with ---------- */
    const three = F.top(res.raised, 3);
    $("threeBox").innerHTML = three.map(function (f, i) {
      return '<article class="dk-num" data-tone="' + (f.severity >= 80 ? "bad" : "warn") +
        '"><span class="dk-num-n">' + (i + 1) + '</span>' +
        '<b>' + esc(f.headline) + '</b>' +
        '<small>' + esc(f.lead || f.title) + '</small>' +
        '<em>' + esc(f.topic) + '</em></article>';
    }).join("") || '<p class="dk-empty">Nothing raised a flag on these answers.</p>';

    /* ---------- the one move ---------- */
    if (lever) {
      $("leverBox").hidden = false;
      $("leverTitle").textContent = lever.say + " — " + lever.label.toLowerCase();
      $("leverBody").textContent = "Of everything on this sheet, this removes the most risk for the least money. " +
        "It clears " + (lever.because.charAt(0).toLowerCase() + lever.because.slice(1)) + ".";
    } else { $("leverBox").hidden = true; }

    /* ---------- everything, including what the client did not see ---------- */
    const held = res.raised.filter(function (f) { return f.kind === "judgement"; }).length;
    $("allTitle").textContent = res.raised.length +
      (res.raised.length === 1 ? " flag" : " flags") + ", " + res.passed.length + " checks passed" +
      (held ? " — " + held + " of these were held back from " + name : "");
    $("allGrid").innerHTML = res.raised.map(function (f) {
      return '<article class="read" data-tone="' + (f.severity >= 80 ? "bad" : (f.severity >= 50 ? "warn" : "flat")) + '">' +
        '<small>' + esc(f.topic) + (f.kind === "judgement" ? " · held back" : "") + '</small>' +
        '<b>' + esc(f.headline) + '</b>' +
        '<p>' + esc(f.detail) + '</p>' +
      '</article>';
    }).join("") || '<p class="dk-empty">Every check passed.</p>';

    /* ---------- hesitation ---------- */
    paintHesitation();

    /* ---------- documents ---------- */
    const docs = F.documents(res);
    $("docList").innerHTML = docs.length
      ? docs.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("")
      : "<li>Nothing specific — a general statement pack will do.</li>";

    /* ---------- the record ---------- */
    paintFacts(v);

    /* ---------- how to open ---------- */
    $("openLine").textContent = openLine(v, res, lever, name);
  }

  function openLine(v, res, lever, name) {
    const first = (name || "").split(/\s+/)[0];
    if (v.goal) {
      /* quoting them back always reads correctly; rewriting their sentence does not */
      return "“Before anything else — you said: ‘" + shortGoal(v.goal) +
        "’ We'll get to that. But there's one thing I found on the way in that I want to show you first.”";
    }
    if (res.raised.length) {
      return "“" + first + ", thanks for filling that in. One thing jumped out at me: " +
        (res.raised[0].lead || res.raised[0].title).toLowerCase() + ". Can we start there?”";
    }
    return "“" + first + ", your answers came back clean — which is rarer than you'd think. " +
      "Let's talk about what you want to build next.”";
  }
  /* their sentence, trimmed but never reworded */
  function shortGoal(g) {
    const t = String(g).trim().replace(/\s+/g, " ");
    return t.length > 120 ? t.slice(0, 117).replace(/\s\S*$/, "") + "\u2026" : t;
  }

  /* ---------- where they hesitated ---------- */
  function paintHesitation() {
    const r = C.record();
    const hes = r.hes || {};
    const ids = Object.keys(hes);
    const A = window.WD.assess;
    if (!ids.length) {
      $("hesBox").innerHTML = '<p class="dk-empty">They answered everything straight through, with no ' +
        'reworking and nothing skipped. That is usually a sign the figures are close to hand.</p>';
      return;
    }
    $("hesBox").innerHTML = ids.map(function (id) {
      const h = hes[id];
      const q = A ? A.byId(id) : null;
      const why = [];
      if (h.s) why.push("skipped it");
      if (h.u) why.push("said they were not sure");
      if (h.e > 1) why.push("changed it " + h.e + " times");
      if (h.t > 25) why.push("spent " + h.t + " seconds on it");
      return '<article class="dk-hes">' +
        '<b>' + esc(q ? q.ask : id) + '</b>' +
        '<small>They ' + esc(why.join(", ") || "paused here") + '.</small>' +
      '</article>';
    }).join("");
  }

  /* ---------- the whole record, with provenance ---------- */
  const GROUPS = [
    ["Who", ["name", "email", "phone", "age", "partner", "dependents", "youngest"]],
    ["Coming in", ["income", "partnerInc", "retireAge"]],
    ["Going out", ["spending", "essentials", "rent", "mortgagePmt", "otherDebtPmt"]],
    ["Behind them", ["savings", "invested", "retirement", "collegeSaved", "cashValue"]],
    ["Owed", ["mortgageBal", "mortgageRate", "mortgageTerm", "otherDebt"]],
    ["In place", ["lifeCover", "employerCov", "hasDI", "disability", "elimination"]]
  ];

  function paintFacts(v) {
    const SRC = { client: "they told us", agent: "you entered",
                  derived: "worked out", assumed: "assumed" };
    let html = "";
    GROUPS.forEach(function (g) {
      const rows = g[1].filter(function (k) { return v[k] !== undefined && v[k] !== ""; });
      if (!rows.length) return;
      html += '<div class="dk-fact-group"><h4>' + esc(g[0]) + '</h4>' +
        rows.map(function (k) {
          const src = C.sourceOf(k) || "client";
          const why = C.whyOf(k);
          return '<div class="dk-fact">' +
            '<span>' + esc(C.FACTS[k].label) + '</span>' +
            '<b>' + esc(C.fmt(k)) + '</b>' +
            '<em data-src="' + esc(src) + '" title="' + esc(why || "") + '">' + esc(SRC[src] || src) + '</em>' +
          '</div>';
        }).join("") + '</div>';
    });
    $("factTable").innerHTML = html || '<p class="dk-empty">No figures recorded yet.</p>';
  }

  if ($("printBtn")) $("printBtn").addEventListener("click", function () { window.print(); });

  /* ============================================================
     go
     ============================================================ */
  readHash();
  paintLanded();
  paintRoster();
  paintPrep();
  window.addEventListener("hashchange", function () {
    landed = null; readHash(); paintLanded();
  });
})();
