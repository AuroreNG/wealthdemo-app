/* ============================================================
   WEALTHDEMO — Where You Stand

   What the client sees when the questions are done.

   The rule that governs this whole file: facts about their
   household are theirs and are shown in full. Judgements about
   products are not settled here — they are counted, named by
   topic, and held for the meeting. That is not a paywall, it is
   the honest line, and it is enforced by WD.findings.forClient
   rather than by anything on this page, so a rule marked
   "judgement" cannot leak into the client view by accident.
   ============================================================ */
window.WD = window.WD || {};

(function () {
  "use strict";

  const esc = function (s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  /* the eight things we check, and what each one needs before it can be judged */
  const TOPICS = [
    { id: "Cash",              label: "Cash buffer",       needs: ["savings", "essentials"] },
    { id: "Income protection", label: "If you can't work", needs: ["income"] },
    { id: "Life cover",        label: "Life cover",        needs: ["income"],
      /* nobody depending on the income means this is not a gap, it is simply
         not a question — a green tick here would be reassurance about a
         check that never ran */
      applies: function (v) {
        if (v.dependents === undefined && v.partner === undefined) return undefined;
        return (v.dependents || 0) > 0 || v.partner === true;
      },
      na: "No one depends on you" },
    { id: "The mortgage",      label: "The mortgage",      needs: ["mortgageBal"],
      applies: function (v) {
        if (v.housing === undefined && v.mortgageBal === undefined) return undefined;
        return (v.mortgageBal || 0) > 0;
      },
      na: function (v) { return v.housing === "rent" ? "You rent" : "Owned outright"; } },
    { id: "Retirement",        label: "Retirement",        needs: ["retirement", "spending"],
      dive: "retirement" },
    { id: "Education",         label: "Education",         needs: ["collegeKids"],
      applies: function (v) {
        if (v.dependents === undefined) return undefined;
        return (v.collegeKids || 0) > 0;
      },
      na: "No children to fund" },
    { id: "Debt",              label: "Other debt",        needs: ["otherDebt"],
      applies: function (v) { return v.otherDebt === undefined ? undefined : v.otherDebt > 0; },
      na: "Nothing owed", dive: "debt" },
    { id: "Policy loans",      label: "Policy cash value", needs: ["cashValue"],
      applies: function (v) { return v.cashValue === undefined ? undefined : v.cashValue > 0; },
      na: "No policy value" }
  ];

  function statusFor(topic, res, v) {
    /* applies() may answer true, false, or undefined for "we never asked" —
       and the difference between "doesn't apply" and "don't know" is exactly
       what makes the grid honest */
    if (topic.applies) {
      const a = topic.applies(v);
      if (a === false) {
        return { tone: "na",
                 word: (typeof topic.na === "function" ? topic.na(v) : topic.na) || "Doesn't apply" };
      }
      if (a === undefined) return { tone: "none", word: "Not asked" };
    }
    const ready = topic.needs.every(function (k) {
      return v[k] !== undefined && v[k] !== null && v[k] !== "";
    });
    if (!ready) return { tone: "none", word: "Not asked" };
    const hits = res.raised.filter(function (f) {
      return f.topic === topic.id || (f.topics && f.topics.indexOf(topic.id) >= 0);
    });
    if (!hits.length) return { tone: "ok", word: "Looks fine" };
    /* anything that raised at all is worth a look — a topic that produced a
       finding must never read as "looks fine" just because it scored low */
    const worst = hits[0].severity;
    return worst >= 80
      ? { tone: "bad", word: "Needs attention", f: hits[0] }
      : { tone: "warn", word: "Worth a look", f: hits[0] };
  }

  const ICON = {
    bad:  '<path d="M12 7.5v5.5"/><path d="M12 16.4h.01"/><circle cx="12" cy="12" r="8.5"/>',
    warn: '<path d="M12 7.5v5.5"/><path d="M12 16.4h.01"/><circle cx="12" cy="12" r="8.5"/>',
    ok:   '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    none: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.8a2.5 2.5 0 1 1 2.5 2.6v1.2"/><path d="M12 16.6h.01"/>',
    na:   '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/>'
  };

  /* the adviser decides what may be offered; the grid must respect it too */
  function allowDive(opts, id) {
    const allow = opts.invite && opts.invite.dives;
    if (allow && allow.indexOf(id) < 0) return false;
    return !!(opts.onDive && window.WD.assess);
  }

  function render(opts) {
    const C = window.WD.client, F = window.WD.findings;
    const v = C.all();
    const res = F.run(v);
    const client = F.forClient(res);
    const shown = F.top(client.raised, 3);
    const lever = F.lever({ raised: client.raised, facts: v });
    const agent = opts.invite ? opts.invite.agent : { name: "your adviser" };
    const first = (v.name || "").trim().split(/\s+/)[0];

    /* ---------- the one thing they will remember ----------
       a number big enough to read across a room, then a short line.
       The reasoning goes behind a tap, not in front of it. */
    const lead = client.raised.length ? shown[0] : null;

    let html = '<div class="st">';

    /* ---------- masthead ---------- */
    html += '<header class="st-head">' +
      '<p class="as-eyebrow">' + (first ? esc(first) + " \u2014 where you stand" : "Where you stand") + '</p>' +
      (lead
        ? '<p class="st-hero" data-tone="' + (lead.severity >= 80 ? "bad" : "warn") + '">' +
            '<b>' + esc(lead.headline) + '</b></p>' +
          '<h1 class="st-big">' + esc(lead.lead || lead.title) + '.</h1>' +
          (lead.means ? '<p class="st-means">' + esc(lead.means) + '</p>' : "") +
          scaleBar(lead.scale) +
          '<details class="st-open"><summary>How we worked that out</summary><p>' +
            esc(lead.detail) + (lead.why ? " (" + esc(lead.why) + ")" : "") + '</p></details>'
        : '<p class="st-hero" data-tone="good"><b>All clear</b></p>' +
          '<h1 class="st-big">Nothing here needs fixing today.</h1>') +
    '</header>';

    /* ---------- the grid ---------- */
    html += '<section class="st-grid">';
    TOPICS.forEach(function (t) {
      const s = statusFor(t, res, v);
      /* a grey tile that a 60-second dive would fill in is an invitation,
         not dead space */
      if (s.tone === "none" && t.dive && allowDive(opts, t.dive)) {
        s.word = "60 seconds to check";
        s.offer = t.dive;
      }
      const dive = (s.f && s.f.dive) || s.offer;
      const tag = dive ? "button" : "article";
      html += '<' + tag + ' class="st-cell' + (dive ? " is-tap" : "") + '" data-tone="' + s.tone + '"' +
        (dive ? ' type="button" data-dive="' + esc(dive) + '"' : "") + '>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[s.tone] + '</svg>' +
        '<b>' + esc(t.label) + '</b>' +
        '<small>' + esc(s.f ? s.f.headline : s.word) + '</small>' +
      '</' + tag + '>';
    });
    html += '</section>';
    /* counting "passes" that include checks which never applied is the same
       false comfort the green ticks were giving — count what was raised */
    const ran = res.passed.length + res.raised.length;
    html += '<p class="st-note">' +
      (client.raised.length
        ? client.raised.length + " of the " + ran + " things we could check on your answers need attention."
        : "All " + ran + " of the things we could check on your answers came back clear.") +
      '</p>';

    /* ---------- the lever ---------- */
    if (lever) {
      html += '<section class="st-lever">' +
        '<span class="st-lever-ico"><svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M4 15.5 13 6.5"/><path d="M9.5 5.5h5v5"/><path d="M4 19.5h16"/></svg></span>' +
        '<div>' +
          '<p class="as-eyebrow">Do one thing</p>' +
          '<h2>' + esc(lever.say) +
            (lever.overSay ? '<span class="st-or">or ' + esc(lever.overSay) + '</span>' : "") + '</h2>' +
          '<p>' + esc(lever.label) + '. Biggest change for the least money.</p>' +
        '</div>' +
      '</section>';
    }

    /* ---------- the rest ----------
       the first finding is already the masthead above; repeating it here
       word for word makes the page look padded, so the list starts at two */
    const rest = shown.slice(1);
    if (rest.length) {
      html += '<section class="st-list">';
      rest.forEach(function (f) {
        html += '<article class="st-find" data-tone="' + (f.severity >= 80 ? "bad" : "warn") + '">' +
          '<strong>' + esc(f.headline) + '</strong>' +
          '<b>' + esc(f.lead || f.title) + '</b>' +
          (f.means ? '<p class="st-means">' + esc(f.means) + '</p>' : "") +
          scaleBar(f.scale) +
          '<details class="st-open"><summary>Why</summary><p>' + esc(f.detail) +
            (f.why ? " (" + esc(f.why) + ")" : "") + '</p></details>' +
        '</article>';
      });
      html += '</section>';
    }
    if (client.raised.length > shown.length) {
      html += '<p class="st-note">' + (client.raised.length - shown.length) +
        ' more for your meeting.</p>';
    }

    /* ---------- the honest hook ---------- */
    if (client.held > 0) {
      html += '<section class="st-held">' +
        '<h2>' + client.held + (client.held === 1 ? " thing" : " things") +
          " a web page shouldn't decide</h2>" +
        '<p>Judgement calls. ' + esc(agent.name) + ' has them ready.</p>' +
        '<ul>' + heldTopics(res).map(function (t) {
          return '<li>' + esc(t) + '</li>';
        }).join("") + '</ul>' +
      '</section>';
    }

    /* ---------- go deeper ---------- */
    /* the adviser chose which extras to offer; anything not on that list
       is not shown, whatever the answers would otherwise allow */
    const allow = opts.invite && opts.invite.dives;
    const dives = (window.WD.assess ? window.WD.assess.divesFor(v, opts.answers || {}) : [])
      .filter(function (d) { return !allow || allow.indexOf(d.id) >= 0; });
    const left = dives.filter(function (d) {
      return window.WD.assess.dive(d.id, v, opts.answers || {}).some(function (q) {
        return !q.fact || v[q.fact] === undefined;
      });
    });
    if (left.length && opts.onDive) {
      html += '<section class="st-more">' +
        '<h2>Want a sharper answer?</h2>' +
        '<div class="st-dives">' + left.map(function (d) {
          return '<button type="button" class="st-dive" data-dive="' + esc(d.id) + '">' +
            '<b>' + esc(d.label) + '</b><small>' + esc(d.note) + '</small>' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg>' +
          '</button>';
        }).join("") + '</div>' +
      '</section>';
    }

    /* ---------- sending it back ---------- */
    html += '<section class="st-send" id="stSend">' +
      '<h2>Send this to ' + esc(agent.name) + '</h2>' +
      '<p>Nothing has left this device yet. You\u2019ll see exactly what goes.</p>' +
      '<button class="as-go" id="stMail">Send my answers' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5 10.5 13.5"/>' +
        '<path d="M20.5 3.5 14 20.5l-3.5-7-7-3.5Z"/></svg></button>' +
      (agent.book ? '<a class="st-book" href="' + esc(agent.book) + '" target="_blank" rel="noopener">' +
        'Book your meeting' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg></a>' : "") +
      '<div class="st-alt"><button class="as-skip" id="stCopy">Copy link</button>' +
      '<button class="as-skip" id="stPrint">Save a copy</button></div>' +
    '</section>';

    /* ---------- their card ---------- */
    html += '<footer class="st-card">' +
      '<span class="as-avatar">' + esc(agent.initials || ini(agent.name)) + '</span>' +
      '<div><b>' + esc(agent.name) + '</b>' +
        (agent.firm ? '<small>' + esc(agent.firm) + '</small>' : "") +
        '<small>' + [agent.email, agent.phone].filter(Boolean).map(esc).join(" &middot; ") + '</small>' +
      '</div>' +
    '</footer>';

    html += '<details class="st-open st-fine"><summary>About these numbers</summary><p>' +
      'Educational illustration only. Built from what you told us and from standard planning ' +
      'conventions \u2014 three months of essential bills as a minimum buffer, 25\u00d7 annual spending ' +
      'as a retirement target, a public in-state figure for education. Starting points for a ' +
      'conversation, not advice and not a guarantee.</p></details>';

    html += '</div>';

    opts.mount.className = "as-stage as-in st-stage";
    opts.mount.innerHTML = html;
    if (opts.top) opts.top(false, "");
    window.scrollTo(0, 0);

    /* ---------- wiring ---------- */
    opts.mount.querySelectorAll(".st-dive, .st-cell.is-tap").forEach(function (b) {
      b.addEventListener("click", function () { opts.onDive(b.getAttribute("data-dive")); });
    });

    const link = returnLink(opts);
    const mail = opts.mount.querySelector("#stMail");
    if (mail) mail.addEventListener("click", function () {
      const subject = "My answers — " + (v.name || "assessment");
      const body = "Here are my answers.\n\n" + link +
        "\n\n(Open that link and it will load everything I entered.)\n";
      location.href = "mailto:" + encodeURIComponent(agent.email || "") +
        "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });

    const copy = opts.mount.querySelector("#stCopy");
    if (copy) copy.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          copy.textContent = "Link copied — paste it wherever suits";
        }, function () { copy.textContent = "Couldn't copy — select the address bar instead"; });
      }
    });

    const pr = opts.mount.querySelector("#stPrint");
    if (pr) pr.addEventListener("click", function () { window.print(); });

    return { res: res, client: client, lever: lever };
  }

  /* a number on its own means nothing. This puts it on a line with the
     places that matter, so "9 days" lands next to "a 90-day wait". */
  function scaleBar(sc) {
    if (!sc || !isFinite(sc.at) || !(sc.max > 0)) return "";
    const pct = function (x) { return Math.max(0, Math.min(1, x / sc.max)) * 100; };
    const marks = sc.marks || [];
    return '<div class="st-scale">' +
      '<div class="st-scale-track"><i style="width:' + pct(sc.at).toFixed(1) + '%"></i>' +
        marks.map(function (m) {
          return m.at <= sc.max ? '<u style="left:' + pct(m.at).toFixed(1) + '%"></u>' : "";
        }).join("") +
      '</div>' +
      '<div class="st-scale-marks">' +
        marks.map(function (m) {
          return m.at <= sc.max
            ? '<span style="left:' + pct(m.at).toFixed(1) + '%">' + esc(m.label) + '</span>' : "";
        }).join("") +
      '</div></div>';
  }

  function heldTopics(res) {
    const seen = {}, out = [];
    res.raised.forEach(function (f) {
      if (f.kind !== "judgement") return;
      if (seen[f.topic]) return;
      seen[f.topic] = 1;
      out.push(f.topic);
    });
    return out;
  }

  function ini(name) {
    const b = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!b.length) return "•";
    return (b[0][0] + (b.length > 1 ? b[b.length - 1][0] : "")).toUpperCase();
  }

  /* the answers, packed back into a link the adviser can open */
  function returnLink(opts) {
    const C = window.WD.client;
    const base = location.origin + location.pathname.replace(/[^/]*$/, "") + "desk.html";
    const payload = C.pack({
      extra: { r: 1, h: slimLog(opts.log || {}), a: opts.answers || {} }
    });
    return base + "#" + payload;
  }

  /* only what tells the adviser something: slow answers, reworked answers, skips */
  function slimLog(log) {
    const out = {};
    Object.keys(log).forEach(function (id) {
      const l = log[id];
      const slow = l.ms > 25000;
      if (l.skipped || l.unsure || l.edits > 1 || slow) {
        out[id] = { s: l.skipped ? 1 : 0, u: l.unsure ? 1 : 0,
                    e: l.edits || 0, t: Math.round((l.ms || 0) / 1000) };
      }
    });
    return out;
  }

  window.WD.stand = { render: render, TOPICS: TOPICS, statusFor: statusFor, returnLink: returnLink };
})();
