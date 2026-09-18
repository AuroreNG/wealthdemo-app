/* ============================================================
   WEALTHDEMO — Supabase, by hand

   Roughly two hundred lines instead of a library, for one
   reason: this site has to keep working as a folder of files
   with nothing loaded from anywhere else. A CDN script is a
   dependency that can be blocked, can change under you, and does
   not exist at all inside a published artifact. Supabase's REST
   surface is plain HTTP, so writing to it directly costs less
   than depending on it.

   Everything here answers one of three shapes:

     auth     sign in, sign out, who am I
     table    select / insert / update, with the session's token
     rpc      call one of the SQL functions in schema.sql

   Every call returns { data, error }. Nothing throws at the call
   site, because a page that is offline should quietly fall back,
   not break.

   window.WD_CLOUD.ready is false when config.js is empty. Every
   caller checks it and takes the local path instead.
   ============================================================ */
(function () {
  "use strict";

  /* config.js is the real home for these, because it is what everyone who
     opens the site gets. But editing a file and pushing it to GitHub before
     you can find out whether the values even work is a slow way to make a
     typo, so the Studio can also put them in this browser only. A value set
     here wins, and it never reaches anyone else. */
  function local() {
    try { return JSON.parse(localStorage.getItem("wealthdemo.config") || "null") || {}; }
    catch (e) { return {}; }
  }

  const FILE = window.WD_CONFIG || {};
  const HERE = local();
  const CFG = {
    supabaseUrl: FILE.supabaseUrl || HERE.supabaseUrl || "",
    supabaseAnonKey: FILE.supabaseAnonKey || HERE.supabaseAnonKey || "",
    askFunction: FILE.askFunction || HERE.askFunction || "ask"
  };
  window.WD_CONFIG = CFG;

  const URL_BASE = (CFG.supabaseUrl || "").replace(/\/+$/, "");
  const ANON = CFG.supabaseAnonKey || "";
  const READY = !!(URL_BASE && ANON);
  const FROM_BROWSER = READY && !FILE.supabaseUrl;

  const SESSION_KEY = "wealthdemo.sb.session";

  let session = null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) session = JSON.parse(raw);
  } catch (e) { session = null; }

  function keep(s) {
    session = s;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    document.dispatchEvent(new CustomEvent("wd-auth", { detail: { user: s ? s.user : null } }));
  }

  /* a token that expired an hour ago is worse than no token — it makes
     every call fail in a way that looks like a bug rather than a sign-in */
  function live() {
    if (!session || !session.access_token) return false;
    const at = session.expires_at ? session.expires_at * 1000 : 0;
    return !at || at > Date.now() + 30000;
  }

  function headers(extra) {
    const h = {
      apikey: ANON,
      "Content-Type": "application/json",
      Authorization: "Bearer " + (live() ? session.access_token : ANON)
    };
    for (const k in (extra || {})) h[k] = extra[k];
    return h;
  }

  async function call(path, opts) {
    if (!READY) return { data: null, error: { message: "not configured" } };
    let r;
    try {
      r = await fetch(URL_BASE + path, opts);
    } catch (e) {
      return { data: null, error: { message: "offline", detail: String(e) } };
    }
    let body = null;
    const text = await r.text();
    if (text) { try { body = JSON.parse(text); } catch (e) { body = text; } }
    if (!r.ok) {
      return { data: null, error: { status: r.status, message: (body && (body.message || body.error_description || body.error)) || ("HTTP " + r.status), body: body } };
    }
    return { data: body, error: null };
  }

  /* ---------- refreshing, once, and shared ----------
     Several panels can wake at the same moment on one page. Without this
     they each spend the refresh token and all but one gets logged out. */
  let refreshing = null;
  async function refresh() {
    if (!session || !session.refresh_token) return false;
    if (refreshing) return refreshing;
    refreshing = (async function () {
      const r = await call("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      refreshing = null;
      if (r.error || !r.data || !r.data.access_token) { keep(null); return false; }
      keep(r.data);
      return true;
    })();
    return refreshing;
  }

  async function withAuth(fn) {
    if (session && !live()) await refresh();
    let out = await fn();
    if (out.error && out.error.status === 401 && session) {
      if (await refresh()) out = await fn();
    }
    return out;
  }

  /* ---------- auth ---------- */
  const auth = {
    user: function () { return session ? session.user : null; },
    signedIn: function () { return !!(session && session.user); },

    signIn: async function (email, password) {
      const r = await call("/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password })
      });
      if (r.error) return r;
      keep(r.data);
      return { data: r.data.user, error: null };
    },

    signUp: async function (email, password, fullName) {
      const r = await call("/auth/v1/signup", {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email, password: password,
          data: { full_name: fullName || "" }
        })
      });
      if (r.error) return r;
      /* a project with email confirmation on returns a user and no session */
      if (r.data && r.data.access_token) keep(r.data);
      return { data: r.data, error: null, needsConfirm: !(r.data && r.data.access_token) };
    },

    /* the no-password route, which suits advisers who forget them */
    magicLink: async function (email, redirect) {
      return call("/auth/v1/otp", {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, create_user: true, gotrue_meta_security: {},
                               options: { email_redirect_to: redirect || location.href } })
      });
    },

    signOut: async function () {
      if (live()) {
        await call("/auth/v1/logout", { method: "POST", headers: headers() });
      }
      keep(null);
    },

    /* a magic-link or confirmation click comes back with the tokens in the
       fragment, where they are invisible to servers and to the referrer */
    catchRedirect: function () {
      if (!location.hash || location.hash.indexOf("access_token") < 0) return false;
      const p = new URLSearchParams(location.hash.slice(1));
      const at = p.get("access_token");
      if (!at) return false;
      keep({
        access_token: at,
        refresh_token: p.get("refresh_token") || "",
        expires_at: Math.floor(Date.now() / 1000) + parseInt(p.get("expires_in") || "3600", 10),
        user: null
      });
      history.replaceState(null, "", location.pathname + location.search);
      return true;
    },

    /* the token carries the id but not the row, so fetch the profile once */
    me: async function () {
      if (!session) return { data: null, error: { message: "signed out" } };
      const r = await withAuth(function () {
        return call("/rest/v1/profiles?select=*&limit=1", { headers: headers() });
      });
      if (r.error) return r;
      const row = Array.isArray(r.data) ? r.data[0] : null;
      if (row && session) { session.user = row; keep(session); }
      return { data: row, error: null };
    }
  };

  /* ---------- tables ---------- */
  function table(name) {
    return {
      select: function (query) {
        return withAuth(function () {
          return call("/rest/v1/" + name + "?" + (query || "select=*"), { headers: headers() });
        });
      },
      insert: function (row, opts) {
        const pref = "return=representation" + ((opts && opts.upsert) ? ",resolution=merge-duplicates" : "");
        return withAuth(function () {
          return call("/rest/v1/" + name, {
            method: "POST",
            headers: headers({ Prefer: pref }),
            body: JSON.stringify(row)
          });
        });
      },
      update: function (query, patch) {
        return withAuth(function () {
          return call("/rest/v1/" + name + "?" + query, {
            method: "PATCH",
            headers: headers({ Prefer: "return=representation" }),
            body: JSON.stringify(patch)
          });
        });
      },
      remove: function (query) {
        return withAuth(function () {
          return call("/rest/v1/" + name + "?" + query, { method: "DELETE", headers: headers() });
        });
      }
    };
  }

  /* ---------- SQL functions ---------- */
  function rpc(name, args) {
    return withAuth(function () {
      return call("/rest/v1/rpc/" + name, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(args || {})
      });
    });
  }

  /* ---------- edge functions ---------- */
  function fn(name, payload) {
    return withAuth(function () {
      return call("/functions/v1/" + name, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload || {})
      });
    });
  }

  /* does the project answer at all, and does the key open the door?
     Asked without signing in, so it separates "wrong values" from
     "right values, no account yet" — which look identical otherwise. */
  async function check() {
    if (!READY) return { ok: false, why: "No project URL or key yet." };
    let r;
    try {
      r = await fetch(URL_BASE + "/rest/v1/", { headers: { apikey: ANON } });
    } catch (e) {
      return { ok: false, why: "That URL did not answer. Check it is the Project URL, not the dashboard address." };
    }
    if (r.status === 401 || r.status === 403) {
      return { ok: false, why: "The project answered, but rejected that key. Check you copied the anon public key." };
    }
    if (!r.ok && r.status !== 404) {
      return { ok: false, why: "The project answered with HTTP " + r.status + "." };
    }
    /* the tables only exist once schema.sql has been run */
    const t = await call("/rest/v1/profiles?select=id&limit=1", { headers: headers() });
    if (t.error && /does not exist|schema cache/i.test(t.error.message || "")) {
      return { ok: false, why: "Connected, but the tables are missing. Run schema.sql in the SQL editor." };
    }
    return { ok: true, why: "Connected, and the tables are there." };
  }

  /* what the assistant end of it says, without needing a question */
  async function checkAI() {
    if (!READY) return { ok: false, why: "No project connected." };
    const r = await fn(CFG.askFunction, { messages: [{ role: "user", content: "ping" }], context: "", mode: "client" });
    if (!r.error) return { ok: true, why: "The function answered. The key is set and the model replied." };
    const b = r.error.body || {};
    const code = b.error || "";
    if (r.error.status === 404) return { ok: false, why: "No function called \u201c" + CFG.askFunction + "\u201d is deployed yet." };
    if (code === "not_configured") return { ok: false, why: "The function is deployed, but ANTHROPIC_API_KEY is not set on it." };
    if (code === "not_signed_in") {
      /* the function checks its key BEFORE it checks the caller, so getting
         this far proves both the deploy and the secret. It is a pass. */
      return { ok: true, why: "Deployed, and the Anthropic key is set. Sign in to start using it." };
    }
    if (code === "cap_reached") return { ok: false, why: "Working, but today's cap is reached on this account." };
    return { ok: false, why: b.say || r.error.message || "The function answered with an error." };
  }

  function remember(url, key) {
    try {
      localStorage.setItem("wealthdemo.config",
        JSON.stringify({ supabaseUrl: (url || "").trim().replace(/\/+$/, ""), supabaseAnonKey: (key || "").trim() }));
    } catch (e) {}
  }
  function forget() {
    try { localStorage.removeItem("wealthdemo.config"); } catch (e) {}
  }

  window.WD_CLOUD = {
    ready: READY,
    fromBrowser: FROM_BROWSER,
    auth: auth,
    from: table,
    rpc: rpc,
    fn: fn,
    check: check,
    checkAI: checkAI,
    remember: remember,
    forget: forget
  };

  if (READY) auth.catchRedirect();
})();
