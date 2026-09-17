/* ============================================================
   WEALTHDEMO — composing an assessment

   Builds the link. Everything the client will need — who sent
   it, their branding, which extra topics are on offer, the
   client's own name — is packed into the fragment, so the link
   is the whole product. Nothing is stored on a server because
   there is no server.

   The QR code is drawn here rather than fetched, because a
   remote QR service would mean handing a third party the very
   link that carries the client's details.
   ============================================================ */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  if (!$("linkOut")) return;

  const C = window.WD.client;
  const P = window.WD.profile;
  const A = window.WD.assess;

  /* which extras this account may offer, and what each is worth */
  const TOPICS = [
    { id: "protection", label: "If you couldn't work", note: "Benefit amount and waiting period", tier: "core" },
    { id: "mortgage",   label: "The mortgage",         note: "Rate, term and payment",            tier: "core" },
    { id: "retirement", label: "Retirement",           note: "What's saved, and when they'd stop", tier: "core" },
    { id: "cover",      label: "Life cover",           note: "Whether it is held through work",   tier: "core" },
    { id: "household",  label: "Household income",     note: "A partner's earnings",              tier: "full" },
    { id: "education",  label: "School and college",   note: "What's set aside for the children", tier: "full" },
    { id: "debt",       label: "Other debt",           note: "Cards, cars, student loans",        tier: "full" }
  ];

  /* the order is the wire format: a topic's position here is its bit, so
     new topics go on the end and existing links keep working */
  const ORDER = ["protection", "mortgage", "retirement", "cover", "household", "education", "debt"];

  const PICK = "wealthdemo.send.topics";
  let picked = null;
  try { picked = JSON.parse(localStorage.getItem(PICK) || "null"); } catch (e) {}
  if (!Array.isArray(picked)) picked = TOPICS.map(function (t) { return t.id; });

  const esc = function (s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  /* ============================================================
     the topic list, with anything above this tier shown locked
     ============================================================ */
  function paintTopics() {
    const tier = P.read().tier;
    $("topicList").innerHTML = TOPICS.map(function (t) {
      const locked = tier !== "full" && t.tier === "full";
      const on = !locked && picked.indexOf(t.id) >= 0;
      return '<label class="sd-topic' + (locked ? " is-locked" : "") + (on ? " is-on" : "") +
        '"><input type="checkbox" data-t="' + t.id + '"' + (on ? " checked" : "") +
        (locked ? " disabled" : "") + '>' +
        '<span class="sd-tick"></span>' +
        '<span class="sd-topic-txt"><b>' + esc(t.label) + '</b><small>' + esc(t.note) + '</small></span>' +
        (locked ? '<span class="sd-lock">Premium</span>' : "") +
      '</label>';
    }).join("");

    $("topicList").querySelectorAll("input[type=checkbox]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        const id = cb.getAttribute("data-t");
        const i = picked.indexOf(id);
        if (cb.checked && i < 0) picked.push(id);
        if (!cb.checked && i >= 0) picked.splice(i, 1);
        try { localStorage.setItem(PICK, JSON.stringify(picked)); } catch (e) {}
        cb.closest(".sd-topic").classList.toggle("is-on", cb.checked);
        build();
      });
    });
  }

  /* ============================================================
     the link
     ============================================================ */
  function base() {
    return location.origin + location.pathname.replace(/[^/]*$/, "");
  }

  function build() {
    const name = $("cName").value.trim();
    const email = $("cEmail").value.trim();
    const meet = $("cMeet").value;

    /* the compose page must not stamp itself over a real client record,
       so the invite is assembled in a scratch record of its own */
    const keep = C.id();
    C.open(keep);
    const before = C.all();

    C.reset();
    if (name) C.set("name", name, "agent");
    if (email) C.set("email", email, "agent");
    if (meet) C.set("meetingAt", meet, "agent");

    const tier = P.read().tier;
    const allowed = picked.filter(function (id) {
      const t = TOPICS.filter(function (x) { return x.id === id; })[0];
      return t && (tier === "full" || t.tier !== "full");
    });

    let bits = 0;
    allowed.forEach(function (id) {
      const i = ORDER.indexOf(id);
      if (i >= 0) bits |= (1 << i);
    });

    const payload = C.pack({
      keys: ["name", "email", "meetingAt"],
      extra: { a: P.forLink(), d: bits }
    });

    /* put back whatever was there */
    C.reset();
    C.setMany(before, "agent");

    const url = base() + "assess.html#" + payload;
    $("linkOut").value = url;
    $("previewBtn").href = url;

    $("outTitle").textContent = name ? "Ready for " + name : "Ready to send";
    $("bnBig").textContent = "3 min";
    $("meetNote").textContent = meet ? whenText(meet) : "Optional — adds a countdown to their invitation.";
    $("expNote").textContent = meet ? whenText(meet) : "Not set";

    qr(url);
    return url;
  }

  function whenText(v) {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "—";
    const days = Math.round((d - new Date()) / 864e5);
    const when = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
      " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (days < 0) return when + " (past)";
    if (days === 0) return when + " — today";
    if (days === 1) return when + " — tomorrow";
    return when + " — in " + days + " days";
  }

  /* ============================================================
     a QR code, drawn here

     Sending the link to a remote QR service would hand a stranger
     the client's details, so this is a small byte-mode encoder with
     the error correction and masking done locally.
     ============================================================ */
  function qr(text) {
    const box = $("qrBox");
    try {
      const m = QR.make(text);
      const n = m.length, cell = 4, pad = 3;
      const size = (n + pad * 2) * cell;
      const p = P.read();
      const ink = /^#[0-9a-f]{6}$/i.test(p.colour || "") ? p.colour : "#0d4435";

      /* the three finder patterns are drawn as rounded eyes, so they are
         excluded from the dot pass to avoid drawing over them */
      const inEye = function (r, c) {
        return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
      };

      let dots = "";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (!m[r][c] || inEye(r, c)) continue;
          const x = (c + pad) * cell + cell / 2;
          const y = (r + pad) * cell + cell / 2;
          /* full-radius dots touch their neighbours, so coverage matches a
             square module and scanners read it exactly as they would a plain one */
          dots += "M" + x + " " + (y - cell / 2) +
            "a" + (cell / 2) + " " + (cell / 2) + " 0 1 1 -0.01 0z";
        }
      }

      let eyes = "";
      [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (e) {
        const x = (e[1] + pad) * cell, y = (e[0] + pad) * cell, s7 = cell * 7;
        eyes +=
          '<rect x="' + (x + cell * 0.5) + '" y="' + (y + cell * 0.5) +
            '" width="' + (s7 - cell) + '" height="' + (s7 - cell) +
            '" rx="' + (cell * 1.9) + '" fill="none" stroke="' + ink +
            '" stroke-width="' + cell + '"/>' +
          '<rect x="' + (x + cell * 2) + '" y="' + (y + cell * 2) +
            '" width="' + (cell * 3) + '" height="' + (cell * 3) +
            '" rx="' + (cell * 1.05) + '" fill="' + ink + '"/>';
      });

      box.innerHTML = '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" ' +
        'aria-label="QR code for the assessment link">' +
        '<path d="' + dots + '" fill="' + ink + '"/>' + eyes + '</svg>';
      box.hidden = false;
    } catch (e) {
      box.hidden = true;     /* too long to encode — the link still works */
    }
  }

  /* ============================================================
     your details
     ============================================================ */
  const PF = [["pName", "name"], ["pFirm", "firm"], ["pEmail", "email"], ["pPhone", "phone"],
              ["pBook", "book"], ["pLic", "licence"], ["pColour", "colour"]];

  function loadProfile() {
    const p = P.read();
    PF.forEach(function (pair) { $(pair[0]).value = p[pair[1]] || ""; });
    $("colourHex").textContent = p.colour;
    paintPreview();
  }
  function paintPreview() {
    const p = { name: $("pName").value, firm: $("pFirm").value, colour: $("pColour").value };
    const ini = P.initials(p) || "•";
    $("brandPreview").innerHTML =
      '<span class="sd-ava" style="background:' + esc(p.colour) + '">' + esc(ini) + '</span>' +
      '<span><b>' + esc(p.name || "Your name") + '</b><small>' + esc(p.firm || "Your firm") + '</small></span>';
  }

  function openSheet() { $("brandSheet").hidden = false; document.body.style.overflow = "hidden"; $("pName").focus(); }
  function closeSheet() { $("brandSheet").hidden = true; document.body.style.overflow = ""; }

  $("brandBtn").addEventListener("click", openSheet);
  $("brandClose").addEventListener("click", closeSheet);
  $("brandSheet").addEventListener("click", function (e) { if (e.target === $("brandSheet")) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("brandSheet").hidden) closeSheet(); });

  ["pName", "pFirm", "pColour"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      if (id === "pColour") $("colourHex").textContent = $("pColour").value;
      paintPreview();
    });
  });

  $("brandSave").addEventListener("click", function () {
    const next = {};
    PF.forEach(function (pair) { next[pair[1]] = $(pair[0]).value.trim(); });
    P.write(next);
    closeSheet();
    paintTopics();
    build();
  });

  /* ============================================================
     acting on it
     ============================================================ */
  $("copyBtn").addEventListener("click", function () {
    const btn = $("copyBtn");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText($("linkOut").value).then(function () {
        btn.textContent = "Copied"; btn.classList.add("is-done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("is-done"); }, 2000);
      }, function () { $("linkOut").select(); });
    } else { $("linkOut").select(); }
  });

  $("mailBtn").addEventListener("click", function () {
    const p = P.read();
    const name = $("cName").value.trim();
    const meet = $("cMeet").value;
    const first = name.split(/\s+/)[0] || "there";
    const lines = [
      "Hi " + first + ",",
      "",
      "Before we meet" + (meet ? " on " + whenText(meet).split(" — ")[0] : "") +
        ", here are a few quick questions — about three minutes on your phone.",
      "",
      $("linkOut").value,
      "",
      "You'll see where you stand as soon as you finish, and it sends your answers straight back to me.",
      "",
      p.name || "",
      [p.firm, p.phone].filter(Boolean).join(" · ")
    ];
    location.href = "mailto:" + encodeURIComponent($("cEmail").value.trim()) +
      "?subject=" + encodeURIComponent("A few questions before we meet") +
      "&body=" + encodeURIComponent(lines.join("\n"));
  });

  /* a calendar file, written here — no service, no account */
  $("icsBtn").addEventListener("click", function () {
    const meet = $("cMeet").value;
    if (!meet) { $("cMeet").focus(); return; }
    const start = new Date(meet);
    if (isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + 60 * 60000);
    const z = function (d) {
      return d.getUTCFullYear() +
        String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0") + "T" +
        String(d.getUTCHours()).padStart(2, "0") + String(d.getUTCMinutes()).padStart(2, "0") + "00Z";
    };
    const name = $("cName").value.trim() || "Client";
    const p = P.read();
    /* long lines have to be folded or strict calendar clients reject the file */
    const fold = function (line) {
      const out = [];
      let s = line;
      while (s.length > 72) { out.push(s.slice(0, 72)); s = " " + s.slice(72); }
      out.push(s);
      return out.join("\r\n");
    };
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WEALTHDEMO//Assessment//EN",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "@wealthdemo",
      "DTSTAMP:" + z(new Date()),
      "DTSTART:" + z(start), "DTEND:" + z(end),
      fold("SUMMARY:Financial review — " + name),
      fold("DESCRIPTION:Their assessment link: " + $("linkOut").value.replace(/,/g, "\\,")),
      fold("ORGANIZER;CN=" + (p.name || "Adviser") + ":mailto:" + (p.email || "noreply@example.com")),
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "meeting-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".ics";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  ["cName", "cEmail", "cMeet"].forEach(function (id) {
    $(id).addEventListener("input", build);
    $(id).addEventListener("change", build);
  });

  /* ============================================================
     go
     ============================================================ */
  loadProfile();
  paintTopics();
  build();
  if (!P.isReady()) setTimeout(openSheet, 350);
})();
