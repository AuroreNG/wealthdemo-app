/* ============================================================
   WEALTHDEMO — Adviser Studio

   Four things that belong to the adviser rather than to a
   client: who has been sent what, how you appear on a report,
   who is allowed in, and what the assistant has cost.

   Every one of them works twice over. With Supabase configured
   it reads and writes rows, so the same adviser sees the same
   list on a second device and a client's answers arrive without
   anybody pasting a code. With nothing configured it uses the
   browser, exactly as the rest of the site always has. The
   banner at the top says which of the two is happening, because
   quietly working on one device and quietly working across all
   of them look identical until the day they do not.
   ============================================================ */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  const C = window.WD_CLOUD && window.WD_CLOUD.ready ? window.WD_CLOUD : null;
  const P = (window.WD || {}).profile;

  const STD_FOOTER =
    "This report is provided for educational and informational purposes only and is not " +
    "intended as tax, legal, or investment advice. The information and projections presented " +
    "are based on the data and assumptions provided and are not guarantees of future results. " +
    "Financial products and strategies may vary based on individual circumstances, eligibility, " +
    "and applicable regulations.";

  /* ============================================================
     where we are
     ============================================================ */
  function signedIn() { return !!(C && C.auth.signedIn()); }

  function paintState() {
    const dot = document.querySelector(".st-dot");
    if (!C) {
      dot.setAttribute("data-on", "0");
      $("stStateB").textContent = "Working on this device";
      $("stStateS").textContent = "No project connected — everything is remembered in this browser.";
      return;
    }
    if (!signedIn()) {
      dot.setAttribute("data-on", "0");
      $("stStateB").textContent = "Connected, not signed in";
      $("stStateS").textContent = "Sign in under Assistant to reach your own clients and branding.";
      return;
    }
    const u = C.auth.user() || {};
    dot.setAttribute("data-on", "1");
    $("stStateB").textContent = "Signed in";
    $("stStateS").textContent = (u.email || "") + " — your clients and branding follow you to any device.";
  }

  /* ============================================================
     tabs
     ============================================================ */
  function tab(name) {
    document.querySelectorAll(".st-tabs button").forEach(function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-tab") === name ? "true" : "false");
    });
    document.querySelectorAll(".st-pane").forEach(function (p) {
      p.hidden = p.getAttribute("data-pane") !== name;
    });
    try { history.replaceState(null, "", "#" + name); } catch (e) {}
    if (name === "clients") loadClients();
    if (name === "access") loadAccess();
    if (name === "assistant") paintAssistant();
  }

  document.querySelectorAll(".st-tabs button").forEach(function (b) {
    b.addEventListener("click", function () { tab(b.getAttribute("data-tab")); });
  });

  /* ============================================================
     clients
     ============================================================ */
  let filter = "all";
  let rows = [];

  function when(ts) {
    if (!ts) return "";
    const d = new Date(ts), now = new Date();
    const days = Math.round((now - d) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return days + " days ago";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function initials(name) {
    const b = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!b.length) return "•";
    return (b[0][0] + (b.length > 1 ? b[b.length - 1][0] : "")).toUpperCase();
  }

  const SAYS = { returned: "Answered", opened: "Opened", sent: "Not opened", archived: "Archived" };

  function paintClients() {
    const box = $("stClients");
    const show = rows.filter(function (r) { return filter === "all" || r.status === filter; });
    box.innerHTML = show.map(function (r) {
      const n = (r.tools || []).length;
      return '<button type="button" class="st-row" data-id="' + esc(r.id) + '">' +
        '<span class="st-ava">' + esc(initials(r.client_name)) + "</span>" +
        "<span><b>" + esc(r.client_name || "Unnamed") + "</b><small>" +
        n + (n === 1 ? " calculator" : " calculators") +
        (r.client_email ? " · " + esc(r.client_email) : "") + "</small></span>" +
        '<span class="st-when">' + esc(when(r.returned_at || r.opened_at || r.created_at)) + "</span>" +
        '<span class="st-pill" data-s="' + esc(r.status) + '">' + esc(SAYS[r.status] || r.status) + "</span>" +
        "</button>";
    }).join("");
    $("stClientsEmpty").hidden = show.length > 0;
    if (!show.length && rows.length) {
      $("stClientsEmpty").textContent = "Nothing in this group. Try All.";
    }
    box.querySelectorAll(".st-row").forEach(function (b) {
      b.addEventListener("click", function () {
        location.href = "desk.html?a=" + encodeURIComponent(b.getAttribute("data-id"));
      });
    });
  }

  /* the local list has always been the clients the Desk has saved */
  function localRows() {
    let list = [];
    try {
      const C2 = (window.WD || {}).clients;
      if (C2 && C2.list) list = C2.list();
    } catch (e) { list = []; }
    return (list || []).map(function (r) {
      return {
        id: r.id || r.name,
        client_name: r.name,
        client_email: r.email || "",
        tools: r.tools || [],
        status: r.facts > 0 ? "returned" : "sent",
        created_at: r.ts || null,
        returned_at: r.facts > 0 ? (r.ts || null) : null
      };
    });
  }

  async function loadClients() {
    if (!signedIn()) { rows = localRows(); paintClients(); return; }
    const r = await C.from("assessments")
      .select("select=*&order=created_at.desc&limit=100");
    rows = r.error ? localRows() : (r.data || []);
    paintClients();
  }

  $("stFilters").querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      filter = b.getAttribute("data-filter");
      $("stFilters").querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      paintClients();
    });
  });

  /* ============================================================
     branding
     ============================================================ */
  const FIELDS = [
    ["bName", "name"], ["bFirm", "firm"], ["bPhone", "phone"], ["bEmail", "email"],
    ["bBook", "book"], ["bLic", "licence"], ["bFooter", "footer"], ["bColour", "colour"]
  ];

  let logoData = "";

  function readForm() {
    const out = {};
    FIELDS.forEach(function (p) { out[p[1]] = ($(p[0]).value || "").trim(); });
    out.logo = logoData;
    return out;
  }

  function fillForm(p) {
    FIELDS.forEach(function (pair) { $(pair[0]).value = p[pair[1]] || ""; });
    if (!$("bColour").value) $("bColour").value = "#0d4435";
    $("bColourHex").textContent = $("bColour").value;
    logoData = p.logo || "";
    $("bLogoClear").hidden = !logoData;
    paintPreview();
  }

  function paintPreview() {
    const p = readForm();
    const lines = [];
    if (p.phone) lines.push(esc(p.phone));
    if (p.email) lines.push(esc(p.email));
    if (p.book) lines.push('<a href="#" onclick="return false">Book a time</a>');
    if (p.licence) lines.push("Licence " + esc(p.licence));

    $("bPreview").innerHTML =
      '<div class="st-preview-top">' +
      (p.logo
        ? '<img src="' + esc(p.logo) + '" alt="">'
        : '<span class="st-ava" style="background:' + esc(p.colour || "#0d4435") + '">' +
          esc(initials(p.name)) + "</span>") +
      "<span><b>" + esc(p.name || "Your name") + "</b><small>" +
      esc(p.firm || "Your firm") + "</small></span></div>" +
      (lines.length ? '<div class="st-preview-lines">' + lines.join("<br>") + "</div>" : "") +
      "<hr>" +
      '<div class="st-preview-lines"><b>Retirement Withdrawal Calculator</b><br>' +
      "The money lasts to about age 84.</div>";

    $("bPreviewFoot").textContent = p.footer || "";
  }

  /* a phone photo is four megabytes and localStorage holds about five, so the
     file is redrawn small before it is ever stored */
  function shrink(file, cb) {
    const fr = new FileReader();
    fr.onload = function () {
      const img = new Image();
      img.onload = function () {
        const max = 320, scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/webp", 0.85));
      };
      img.onerror = function () { cb(""); };
      img.src = fr.result;
    };
    fr.onerror = function () { cb(""); };
    fr.readAsDataURL(file);
  }

  function said(id, text, bad) {
    const el = $(id);
    el.textContent = text;
    el.setAttribute("data-bad", bad ? "1" : "0");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.textContent = ""; }, 4000);
  }

  async function loadBranding() {
    let p = P ? P.read() : {};
    if (signedIn()) {
      const r = await C.from("branding").select("select=*&limit=1");
      const row = !r.error && Array.isArray(r.data) ? r.data[0] : null;
      if (row) {
        p = {
          name: row.display_name || "", firm: row.company || "", phone: row.phone || "",
          email: row.client_email || "", book: row.booking_url || "",
          licence: row.license_no || "", footer: row.compliance_footer || "",
          logo: row.logo_url || "", colour: p.colour || "#0d4435"
        };
        if (P) P.write(p);          /* so send.html and the reports see it too */
      }
    }
    fillForm(p);
  }

  async function saveBranding() {
    const p = readForm();
    if (P) P.write(p);              /* the local copy is always written first */

    if (!signedIn()) {
      said("bSaid", C ? "Saved on this device. Sign in to carry it across." : "Saved on this device.");
      return;
    }
    const u = C.auth.user() || {};
    const r = await C.from("branding").insert({
      adviser_id: u.id,
      display_name: p.name, company: p.firm, phone: p.phone,
      client_email: p.email, booking_url: p.book, license_no: p.licence,
      compliance_footer: p.footer, logo_url: p.logo,
      updated_at: new Date().toISOString()
    }, { upsert: true });

    if (r.error) said("bSaid", "Saved here, but not to your account: " + r.error.message, true);
    else said("bSaid", "Saved. Every report you send now carries it.");
  }

  FIELDS.forEach(function (pair) {
    $(pair[0]).addEventListener("input", function () {
      if (pair[0] === "bColour") $("bColourHex").textContent = $("bColour").value;
      paintPreview();
    });
  });
  $("bFooterStd").addEventListener("click", function () {
    $("bFooter").value = STD_FOOTER;
    paintPreview();
  });
  $("bLogo").addEventListener("change", function () {
    const f = this.files && this.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { said("bSaid", "That file is over 2 MB.", true); this.value = ""; return; }
    shrink(f, function (data) {
      logoData = data;
      $("bLogoClear").hidden = !data;
      paintPreview();
    });
  });
  $("bLogoClear").addEventListener("click", function () {
    logoData = "";
    $("bLogo").value = "";
    this.hidden = true;
    paintPreview();
  });
  $("bSave").addEventListener("click", saveBranding);

  /* ============================================================
     access
     ============================================================ */
  function toolList() {
    const out = [];
    try {
      ((window.WD && window.WD.catalogue) || []).forEach(function (g) {
        (g.tools || []).forEach(function (t) { out.push({ href: t.href, name: t.name }); });
      });
    } catch (e) {}
    return out;
  }

  function fillTools() {
    const sel = $("gTool");
    const list = toolList();
    sel.innerHTML = list.map(function (t) {
      return '<option value="' + esc(t.href) + '">' + esc(t.name) + "</option>";
    }).join("") || '<option value="">(no catalogue on this page)</option>';
  }

  $("gKind").addEventListener("change", function () {
    $("gToolWrap").hidden = this.value !== "tool";
  });

  async function loadAccess() {
    const body = $("gTable").querySelector("tbody");
    if (!signedIn()) {
      body.innerHTML = "";
      $("gEmpty").hidden = false;
      $("gEmpty").textContent = C
        ? "Sign in as an admin to see and change who has access."
        : "No project connected, so there is nobody to grant access to yet.";
      $("gApply").disabled = $("gRevoke").disabled = true;
      return;
    }
    const r = await C.rpc("access_table", {});
    if (r.error || !Array.isArray(r.data) || !r.data.length) {
      body.innerHTML = "";
      $("gEmpty").hidden = false;
      $("gEmpty").textContent = r.error
        ? "Could not read the list: " + r.error.message
        : "You are signed in, but this account is not an admin, so there is nothing to show.";
      $("gApply").disabled = $("gRevoke").disabled = true;
      return;
    }
    $("gApply").disabled = $("gRevoke").disabled = false;
    $("gEmpty").hidden = true;
    body.innerHTML = r.data.map(function (row) {
      const full = row.full_suite
        ? "Until " + new Date(row.full_suite).toLocaleDateString()
        : "—";
      return "<tr><td>" + esc(row.email) + "</td><td>" + esc(row.role) + "</td><td>" +
        esc(full) + "</td><td>" + (row.tools || 0) + "</td></tr>";
    }).join("");
  }

  async function grant(revoking) {
    const email = ($("gEmail").value || "").trim().toLowerCase();
    if (!email) { said("gSaid", "Put an email in first.", true); return; }
    if (!signedIn()) { said("gSaid", "Sign in first.", true); return; }

    const kind = $("gKind").value;
    const tool = kind === "tool" ? $("gTool").value : null;

    if (revoking) {
      let q = "email=eq." + encodeURIComponent(email) + "&kind=eq." + kind;
      if (tool) q += "&tool=eq." + encodeURIComponent(tool);
      const r = await C.from("access_grants").remove(q);
      said("gSaid", r.error ? r.error.message : "Access taken back from " + email, !!r.error);
    } else {
      const days = parseInt($("gDays").value, 10);
      const until = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
      const u = C.auth.user() || {};
      const r = await C.from("access_grants").insert({
        email: email, kind: kind, tool: tool, expires_at: until, granted_by: u.id
      });
      said("gSaid", r.error ? r.error.message
        : "Granted to " + email + (until ? " until " + new Date(until).toLocaleDateString() : ", with no end date"),
        !!r.error);
    }
    loadAccess();
  }

  $("gApply").addEventListener("click", function () { grant(false); });
  $("gRevoke").addEventListener("click", function () { grant(true); });

  /* ============================================================
     assistant
     ============================================================ */
  async function paintAssistant() {
    const box = $("stAI");
    const facts = [];

    facts.push(["Answered on the page, free", "always"]);

    if (!C) {
      facts.push(["Model answers", "not connected"]);
      box.innerHTML = facts.map(function (f) {
        return "<li><span>" + esc(f[0]) + "</span><b>" + esc(f[1]) + "</b></li>";
      }).join("");
      paintAuth();
      return;
    }

    if (signedIn()) {
      const r = await C.from("ai_usage").select("select=*&order=day.desc&limit=30");
      const list = (!r.error && r.data) || [];
      const today = new Date().toISOString().slice(0, 10);
      const t = list.filter(function (x) { return x.day === today; })[0];
      const month = list.reduce(function (a, x) { return a + (x.calls || 0); }, 0);
      facts.push(["Model answers today", String((t && t.calls) || 0)]);
      facts.push(["Over the last 30 days", String(month)]);
      const tok = list.reduce(function (a, x) {
        return a + (x.input_tokens || 0) + (x.output_tokens || 0);
      }, 0);
      facts.push(["Tokens used, 30 days", tok ? tok.toLocaleString() : "0"]);
    } else {
      facts.push(["Model answers", "sign in to see"]);
    }

    box.innerHTML = facts.map(function (f) {
      return "<li><span>" + esc(f[0]) + "</span><b>" + esc(f[1]) + "</b></li>";
    }).join("");
    paintAuth();
  }

  function paintAuth() {
    const box = $("stAuth");
    if (!C) {
      box.innerHTML = "<p>No Supabase project is configured, so there is nothing to sign in to. " +
        "Open <b>config.js</b> and paste your project URL and anon key, and this page starts " +
        "keeping your clients and branding for you.</p>";
      return;
    }
    if (signedIn()) {
      const u = C.auth.user() || {};
      box.innerHTML = "<p>Signed in as <b>" + esc(u.email || "") + "</b>.</p>" +
        '<button type="button" class="st-ghost" id="stOut">Sign out</button>';
      $("stOut").addEventListener("click", async function () {
        await C.auth.signOut();
        paintState(); paintAssistant(); loadClients(); loadAccess();
      });
      return;
    }
    box.innerHTML =
      '<div class="f-body"><label for="siEmail">Email</label>' +
      '<div class="control"><input id="siEmail" type="email" autocomplete="email" placeholder="you@firm.com"></div></div>' +
      '<div class="f-body"><label for="siPw">Password</label>' +
      '<div class="control"><input id="siPw" type="password" autocomplete="current-password"></div></div>' +
      '<div class="st-save"><button type="button" class="st-primary" id="siGo">Sign in</button>' +
      '<button type="button" class="st-ghost" id="siNew">Create account</button>' +
      '<span class="st-said" id="siSaid"></span></div>';

    $("siGo").addEventListener("click", async function () {
      const r = await C.auth.signIn($("siEmail").value.trim(), $("siPw").value);
      if (r.error) { said("siSaid", r.error.message, true); return; }
      await C.auth.me();
      paintState(); paintAssistant(); loadClients(); loadBranding();
    });
    $("siNew").addEventListener("click", async function () {
      const r = await C.auth.signUp($("siEmail").value.trim(), $("siPw").value);
      if (r.error) { said("siSaid", r.error.message, true); return; }
      if (r.needsConfirm) { said("siSaid", "Check your email to confirm, then sign in."); return; }
      await C.auth.me();
      paintState(); paintAssistant(); loadClients(); loadBranding();
    });
  }

  /* ============================================================
     connecting a project

     Three separate questions, answered separately, because they fail
     for completely different reasons and a single "it didn't work"
     sends people to the wrong box.
     ============================================================ */
  function checkRow(ok, title, detail) {
    return '<li data-ok="' + esc(ok) + '"><i>' +
      (ok === "1" ? "\u2713" : ok === "0" ? "!" : "\u00b7") + "</i>" +
      "<span><b>" + esc(title) + "</b><small>" + esc(detail) + "</small></span></li>";
  }

  async function runChecks() {
    const box = $("cfChecks");
    if (!C) { box.innerHTML = checkRow("0", "No project", "Nothing to test yet."); return; }

    box.innerHTML = checkRow("wait", "Reaching the project\u2026", "Asking whether the URL answers and the key opens it.");
    const one = await C.check();
    let html = checkRow(one.ok ? "1" : "0",
      one.ok ? "Project and tables" : "Project or tables", one.why);
    box.innerHTML = html + checkRow("wait", "Trying the assistant\u2026", "Calling the edge function.");

    const two = await C.checkAI();
    html += checkRow(two.ok ? "1" : "0",
      two.ok ? "Assistant" : "Assistant not ready yet", two.why);

    const u = C.auth.user();
    html += checkRow(u ? "1" : "wait",
      u ? "Signed in" : "Not signed in yet",
      u ? ("As " + (u.email || "")) : "Create an account under Assistant once the two above are green.");

    box.innerHTML = html;
  }

  function paintSetup() {
    const card = $("stSetup");
    if (!card) return;
    /* once it is in config.js this card has nothing left to offer */
    const fromFile = C && !C.fromBrowser;
    card.hidden = !!fromFile;
    if (fromFile) return;

    if (C) {
      const cfg = window.WD_CONFIG || {};
      $("cfUrl").value = cfg.supabaseUrl || "";
      $("cfKey").value = cfg.supabaseAnonKey || "";
      $("cfClear").hidden = false;
      runChecks();
    }
  }

  const setupCard = $("stSetup");
  if (setupCard) {
    $("cfGo").addEventListener("click", function () {
      const url = ($("cfUrl").value || "").trim();
      const key = ($("cfKey").value || "").trim();
      /* usually .supabase.co, but a project can sit behind a custom domain,
         so this only insists on a bare https host and says what it expected */
      if (!/^https?:\/\/[^\s/]+\.[^\s/]+\/?$/i.test(url)) {
        said("cfSaid", "That does not look like a Project URL \u2014 it usually ends .supabase.co", true);
        return;
      }
      if (key.length < 40) { said("cfSaid", "That key looks too short.", true); return; }
      (window.WD_CLOUD || {}).remember
        ? window.WD_CLOUD.remember(url, key)
        : localStorage.setItem("wealthdemo.config", JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key }));
      said("cfSaid", "Saved in this browser. Reloading\u2026");
      setTimeout(function () { location.reload(); }, 500);
    });
    $("cfClear").addEventListener("click", function () {
      if (window.WD_CLOUD && window.WD_CLOUD.forget) window.WD_CLOUD.forget();
      try { localStorage.removeItem("wealthdemo.sb.session"); } catch (e) {}
      location.reload();
    });
  }

  /* ============================================================
     go
     ============================================================ */
  fillTools();
  paintState();
  paintSetup();
  loadBranding();
  const start = (location.hash || "").replace("#", "");
  tab(["clients", "branding", "access", "assistant"].indexOf(start) >= 0 ? start : "clients");

  if (C) {
    C.auth.me().then(function () { paintState(); });
    document.addEventListener("wd-auth", function () { paintState(); });
  }
})();
