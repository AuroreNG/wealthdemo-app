/* ============================================================
   WEALTHDEMO — the assessment round trip

   The link has always carried the whole assessment inside its own
   address, and it still does. That is what makes it work with no
   account, no server and no sign-up for the client, and it is not
   being taken away: paste-a-code remains the path when nothing is
   configured, and the fallback when anything goes wrong.

   What this file adds, when the adviser is signed in, is the
   return leg. The link picks up one extra parameter — ?a=<token>
   — and when the client finishes, their answers go straight back
   to the adviser's own row. Nobody reads a code down a phone.

   The token is the only credential, and it reaches exactly two
   SQL functions that take a token and nothing else. Losing one
   exposes that single assessment. It cannot be used to read
   another client, or to find out that another client exists.
   ============================================================ */
(function () {
  "use strict";

  const C = window.WD_CLOUD && window.WD_CLOUD.ready ? window.WD_CLOUD : null;
  const PAGE = (location.pathname.split("/").pop() || "").replace(/\.html?$/, "");

  function signedIn() { return !!(C && C.auth.signedIn()); }
  function token() {
    try { return new URLSearchParams(location.search).get("a") || ""; } catch (e) { return ""; }
  }

  /* ============================================================
     the compose page — put a return address on the link
     ============================================================ */
  function wireSend() {
    const out = document.getElementById("linkOut");
    const copy = document.getElementById("copyBtn");
    if (!out || !copy) return;

    /* one row per link, not one per keystroke: the row is created at the
       moment they actually take the link away */
    let madeFor = "";
    let madeTok = "";

    async function ensure() {
      const url = out.value || "";
      if (!url) return url;
      if (!signedIn()) return url;
      if (url.indexOf("?a=") >= 0) return url;

      const payload = url.split("#")[1] || "";
      if (payload && payload === madeFor && madeTok) return withToken(url, madeTok);

      const name = (document.getElementById("cName") || {}).value || "";
      const email = (document.getElementById("cEmail") || {}).value || "";
      const meet = (document.getElementById("cMeet") || {}).value || "";
      const u = C.auth.user() || {};

      const r = await C.from("assessments").insert({
        adviser_id: u.id,
        client_name: (name || "").trim() || "Unnamed",
        client_email: (email || "").trim() || null,
        meet_at: meet ? new Date(meet).toISOString() : null,
        note: (document.getElementById("cNote") || {}).value || null,
        tools: tools()
      });
      const row = !r.error && Array.isArray(r.data) ? r.data[0] : null;
      if (!row || !row.token) return url;       /* quietly stay on the old path */

      madeFor = payload;
      madeTok = row.token;
      return withToken(url, row.token);
    }

    function withToken(url, tok) {
      const hash = url.indexOf("#");
      const head = hash < 0 ? url : url.slice(0, hash);
      const tail = hash < 0 ? "" : url.slice(hash);
      return head + (head.indexOf("?") >= 0 ? "&" : "?") + "a=" + encodeURIComponent(tok) + tail;
    }

    function tools() {
      const out2 = [];
      document.querySelectorAll("#topicList input[type=checkbox]").forEach(function (cb) {
        if (cb.checked && cb.value) out2.push(cb.value);
      });
      return out2;
    }

    /* capture, so the row exists before the page's own copy handler runs */
    copy.addEventListener("click", async function () {
      const url = await ensure();
      if (url && url !== out.value) {
        out.value = url;
        const pv = document.getElementById("previewBtn");
        if (pv) pv.href = url;
        try { await navigator.clipboard.writeText(url); } catch (e) {}
        note("Saved to your clients. Their answers will come back on their own.");
      }
    }, true);

    function note(text) {
      const el = document.getElementById("outNote");
      if (!el) return;
      el.textContent = text;
    }
  }

  /* ============================================================
     the client's page — send the answers home
     ============================================================ */
  function wireAssess() {
    const tok = token();
    if (!tok || !C) return;

    /* dress the page in the adviser's own branding, from their row rather
       than from what the link happened to carry */
    C.rpc("open_assessment", { p_token: tok }).then(function (r) {
      if (r.error || !r.data) return;
      const a = r.data.adviser || {};
      const P = (window.WD || {}).profile;
      if (P && a.display_name) {
        P.write({
          name: a.display_name, firm: a.company, phone: a.phone, email: a.email,
          book: a.booking_url, licence: a.license_no, footer: a.footer, logo: a.logo_url
        });
      }
      document.dispatchEvent(new CustomEvent("wd:invited", { detail: r.data }));
    });

    let sent = false;
    document.addEventListener("wd:returned", async function () {
      if (sent) return;
      sent = true;
      let all = {}, unsure = [];
      try {
        const CL = (window.WD || {}).client;
        if (CL && CL.all) all = CL.all() || {};
        if (CL && CL.raised) {
          unsure = (CL.raised() || [])
            .filter(function (f) { return f.kind === "judgement"; })
            .map(function (f) { return f.id || f.key || ""; })
            .filter(Boolean);
        }
      } catch (e) {}

      const r = await C.rpc("submit_answers", {
        p_token: tok,
        p_tool: "assessment",
        p_payload: all,
        p_unsure: unsure
      });
      /* a failure here is not the client's problem — the code on screen is
         still the answer, and it is still the thing that always works */
      document.dispatchEvent(new CustomEvent("wd:sent-home", { detail: { ok: !r.error } }));
    });
  }

  if (!C) return;
  if (PAGE === "send") wireSend();
  if (PAGE === "assess") wireAssess();
})();
