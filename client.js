/* ============================================================
   WEALTHDEMO — the shared client record

   Every tool used to keep its own localStorage bag, so the same
   person's income lived in four places and none of them agreed.
   This is the single record all of them read and write.

   Three things matter here:

   1. FACTS is the whole vocabulary. One line per fact — its
      short code for the link, its kind, and a label. Adding a
      fact anywhere on the site means adding a line here, not
      touching a codec.

   2. Every value carries where it came from: the client typed
      it, the agent typed it, or we worked it out. A page that
      cannot tell a stated figure from an assumed one will
      eventually present a guess as a fact, so the provenance
      travels with the number and never gets dropped.

   3. The record packs into a URL fragment. Fragments are never
      sent to a server, so an assessment link carries a whole
      household past GitHub Pages without anything being stored
      anywhere. That is the only reason this works with no
      backend at all.
   ============================================================ */
window.WD = window.WD || {};

(function () {
  "use strict";

  /* ============================================================
     the vocabulary
     code — two chars, used only in packed links (never reuse one)
     kind — money | rate | years | count | age | text | date | bool
     ============================================================ */
  const FACTS = {
    /* --- who --- */
    name:        { code: "nm", kind: "text",  label: "Name" },
    email:       { code: "em", kind: "text",  label: "Email" },
    phone:       { code: "ph", kind: "text",  label: "Phone" },
    age:         { code: "ag", kind: "age",   label: "Age" },
    partner:     { code: "pa", kind: "bool",  label: "Has a partner" },
    partnerAge:  { code: "pg", kind: "age",   label: "Partner's age" },
    dependents:  { code: "dp", kind: "count", label: "People who depend on you" },
    youngest:    { code: "yg", kind: "age",   label: "Youngest child's age" },

    /* --- coming in --- */
    income:      { code: "in", kind: "money", label: "Your income", per: "year" },
    partnerInc:  { code: "pi", kind: "money", label: "Partner's income", per: "year" },
    retireAge:   { code: "ra", kind: "age",   label: "Retirement age" },

    /* --- going out --- */
    essentials:  { code: "es", kind: "money", label: "Essential bills", per: "month" },
    spending:    { code: "sp", kind: "money", label: "Total spending", per: "month" },

    /* --- what is behind you --- */
    savings:     { code: "sv", kind: "money", label: "Cash savings" },
    invested:    { code: "iv", kind: "money", label: "Invested" },
    retirement:  { code: "rt", kind: "money", label: "Retirement accounts" },

    /* --- what is owed --- */
    mortgageBal: { code: "mb", kind: "money", label: "Mortgage balance" },
    mortgageRate:{ code: "mr", kind: "rate",  label: "Mortgage rate" },
    mortgageTerm:{ code: "mt", kind: "years", label: "Years left on the mortgage" },
    mortgagePmt: { code: "mp", kind: "money", label: "Mortgage payment", per: "month" },
    otherDebt:   { code: "od", kind: "money", label: "Other debt" },
    otherDebtPmt:{ code: "op", kind: "money", label: "Other debt payments", per: "month" },
    rent:        { code: "rn", kind: "money", label: "Rent", per: "month" },
    housing:     { code: "hs", kind: "text",  label: "Housing" },   /* own | rent */

    /* --- what is already in place --- */
    lifeCover:   { code: "lc", kind: "money", label: "Life cover in force" },
    hasDI:       { code: "hd", kind: "bool",  label: "Has income protection" },
    disability:  { code: "di", kind: "money", label: "Disability benefit", per: "month" },
    elimination: { code: "el", kind: "count", label: "Elimination period", per: "days" },
    cashValue:   { code: "cv", kind: "money", label: "Policy cash value" },
    employerCov: { code: "ec", kind: "bool",  label: "Cover through work" },

    /* --- ahead --- */
    collegeKids: { code: "ck", kind: "count", label: "Children to educate" },
    collegeSaved:{ code: "cs", kind: "money", label: "Saved for education" },

    /* --- what they told us in their own words --- */
    goal:        { code: "gl", kind: "text",  label: "What they want from the meeting" },
    worry:       { code: "wy", kind: "text",  label: "What keeps them up" },

    /* --- meeting --- */
    meetingAt:   { code: "ma", kind: "date",  label: "Meeting" }
  };

  /* reverse lookup, built once, and a guard against a duplicated code */
  const BY_CODE = {};
  Object.keys(FACTS).forEach(function (k) {
    const c = FACTS[k].code;
    if (BY_CODE[c]) throw new Error("WD.client: duplicate fact code " + c);
    BY_CODE[c] = k;
  });

  /* ============================================================
     provenance — a number is only as good as where it came from
     ============================================================ */
  const SOURCE = {
    client:  { rank: 3, label: "they told us" },
    agent:   { rank: 3, label: "you entered" },
    derived: { rank: 2, label: "worked out from their answers" },
    assumed: { rank: 1, label: "our assumption" }
  };

  const STORE = "wealthdemo.records";
  const ACTIVE = "wealthdemo.records.active";

  function now() { return Date.now(); }
  function uid() {
    return "c" + now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function blank(name) {
    return { id: uid(), created: now(), updated: now(),
             v: {}, src: {}, notes: [], returnedAt: 0, sentAt: 0 };
  }

  /* ---------- the roster ---------- */
  function readAll() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!raw || typeof raw !== "object") return {};
    /* drop anything that does not look like a record rather than trusting it */
    const out = {};
    Object.keys(raw).forEach(function (id) {
      const r = raw[id];
      if (r && typeof r === "object" && r.v && typeof r.v === "object") {
        r.src = r.src && typeof r.src === "object" ? r.src : {};
        r.notes = Array.isArray(r.notes) ? r.notes : [];
        out[id] = r;
      }
    });
    return out;
  }

  function writeAll(map) {
    try { localStorage.setItem(STORE, JSON.stringify(map)); } catch (e) {}
  }

  let roster = readAll();
  let activeId = null;
  try { activeId = localStorage.getItem(ACTIVE); } catch (e) {}
  if (!activeId || !roster[activeId]) activeId = Object.keys(roster)[0] || null;

  function current() {
    if (!activeId || !roster[activeId]) {
      const r = blank();
      roster[r.id] = r;
      activeId = r.id;
      persist();
    }
    return roster[activeId];
  }

  function persist() {
    const r = roster[activeId];
    if (r) r.updated = now();
    writeAll(roster);
    try { localStorage.setItem(ACTIVE, activeId || ""); } catch (e) {}
  }

  function fire(name, detail) {
    document.dispatchEvent(new CustomEvent("wd:record:" + name, { detail: detail || {} }));
  }

  /* ============================================================
     reading and writing
     ============================================================ */
  function get(key) {
    const r = current();
    return Object.prototype.hasOwnProperty.call(r.v, key) ? r.v[key] : undefined;
  }

  function num(key, fallback) {
    const x = get(key);
    return typeof x === "number" && isFinite(x) ? x : (fallback === undefined ? 0 : fallback);
  }

  function sourceOf(key) {
    const r = current();
    return r.src[key] || null;
  }

  /* a stated figure is never quietly replaced by a worked-out one */
  function set(key, value, source) {
    if (!FACTS[key]) throw new Error("WD.client: unknown fact " + key);
    const r = current();
    const src = SOURCE[source] ? source : "agent";
    const had = r.src[key];
    if (had && SOURCE[had].rank > SOURCE[src].rank) return false;
    if (value === undefined || value === null || value === "") {
      delete r.v[key]; delete r.src[key];
    } else {
      r.v[key] = value;
      r.src[key] = src;
    }
    persist();
    fire("change", { key: key, value: value, source: src });
    return true;
  }

  function setMany(obj, source) {
    let n = 0;
    Object.keys(obj || {}).forEach(function (k) {
      if (FACTS[k] && set(k, obj[k], source)) n++;
    });
    return n;
  }

  function all() {
    const r = current();
    const out = {};
    Object.keys(r.v).forEach(function (k) { out[k] = r.v[k]; });
    return out;
  }

  /* ============================================================
     what we can work out without asking

     Each entry says what it needs, what it produces, and whether
     it is arithmetic (derived) or a convention (assumed). The
     difference is shown to the user, so it has to be recorded
     honestly rather than flattened into one bucket.
     ============================================================ */
  const RULES = [
    { to: "retireAge", kind: "assumed", needs: [],
      why: "the usual planning age",
      run: function () { return 65; } },

    { to: "essentials", kind: "derived", needs: ["spending"],
      why: "about two thirds of total spending is usually non-negotiable",
      run: function (v) { return Math.round(v.spending * 0.65); } },

    { to: "spending", kind: "derived", needs: ["essentials"],
      why: "essentials are usually about two thirds of the total",
      run: function (v) { return Math.round(v.essentials / 0.65); } },

    { to: "mortgagePmt", kind: "derived", needs: ["mortgageBal", "mortgageRate", "mortgageTerm"],
      why: "a level payment on that balance, rate and term",
      run: function (v) {
        const r = v.mortgageRate / 100 / 12, n = Math.round(v.mortgageTerm * 12);
        if (n <= 0) return 0;
        if (r <= 0) return Math.round(v.mortgageBal / n);
        return Math.round(v.mortgageBal * r / (1 - Math.pow(1 + r, -n)));
      } },

    { to: "elimination", kind: "assumed", needs: ["disability"],
      why: "90 days is the most common waiting period",
      run: function () { return 90; } },

    { to: "collegeKids", kind: "derived", needs: ["dependents"],
      why: "taken from the number of dependents",
      run: function (v) { return v.dependents; } }
  ];

  function derive() {
    const r = current();
    let added = 0, pass = 0;
    /* rules can feed each other, so run to a fixed point rather than once */
    while (pass++ < 4) {
      let changedThisPass = 0;
      RULES.forEach(function (rule) {
        if (Object.prototype.hasOwnProperty.call(r.v, rule.to)) return;
        for (let i = 0; i < rule.needs.length; i++) {
          const need = rule.needs[i];
          if (typeof r.v[need] !== "number" || !isFinite(r.v[need])) return;
        }
        const out = rule.run(r.v);
        if (typeof out !== "number" || !isFinite(out)) return;
        r.v[rule.to] = out;
        r.src[rule.to] = rule.kind;
        r.why = r.why || {};
        r.why[rule.to] = rule.why;
        changedThisPass++;
      });
      added += changedThisPass;
      if (!changedThisPass) break;
    }
    if (added) { persist(); fire("change", { derived: added }); }
    return added;
  }

  function whyOf(key) {
    const r = current();
    return (r.why && r.why[key]) || null;
  }

  /* ============================================================
     the link

     Packed into the fragment, so it never reaches a server.
     Shape:  v1.<payload>.<check>
     A mangled link fails the check and is refused outright,
     rather than decoding into a half-record nobody can spot.
     ============================================================ */
  function b64url(s) {
    return btoa(unescape(encodeURIComponent(s)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64url(s) {
    let t = s.replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    return decodeURIComponent(escape(atob(t)));
  }
  function checksum(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* pack(opts) — opts.keys limits which facts travel, opts.extra rides along */
  function pack(opts) {
    opts = opts || {};
    const r = current();
    const short = {};
    const keys = opts.keys || Object.keys(r.v);
    keys.forEach(function (k) {
      if (!FACTS[k]) return;
      if (!Object.prototype.hasOwnProperty.call(r.v, k)) return;
      /* assumptions are not worth the characters — the other side re-derives */
      if (r.src[k] === "assumed" || r.src[k] === "derived") return;
      short[FACTS[k].code] = r.v[k];
    });
    const body = { f: short };
    if (opts.extra) body.x = opts.extra;
    const json = JSON.stringify(body);
    const payload = b64url(json);
    return "v1." + payload + "." + checksum(payload);
  }

  function unpack(str) {
    if (typeof str !== "string") return null;
    const bits = str.split(".");
    if (bits.length !== 3 || bits[0] !== "v1") return null;
    if (checksum(bits[1]) !== bits[2]) return null;
    let body = null;
    try { body = JSON.parse(unb64url(bits[1])); } catch (e) { return null; }
    if (!body || typeof body !== "object" || !body.f) return null;
    const facts = {};
    Object.keys(body.f).forEach(function (code) {
      const key = BY_CODE[code];
      if (key) facts[key] = body.f[code];
    });
    return { facts: facts, extra: body.x || null };
  }

  /* ---------- roster management ---------- */
  function list() {
    return Object.keys(roster).map(function (id) {
      const r = roster[id];
      return { id: id, name: r.v.name || "Unnamed", email: r.v.email || "",
               meetingAt: r.v.meetingAt || "", updated: r.updated,
               sentAt: r.sentAt || 0, returnedAt: r.returnedAt || 0,
               facts: Object.keys(r.v).length };
    }).sort(function (a, b) { return b.updated - a.updated; });
  }

  function open(id) {
    if (!roster[id]) return false;
    activeId = id; persist(); fire("open", { id: id });
    return true;
  }

  function create(seed, source) {
    const r = blank();
    roster[r.id] = r;
    activeId = r.id;
    if (seed) setMany(seed, source || "agent");
    persist(); fire("open", { id: r.id });
    return r.id;
  }

  function remove(id) {
    if (!roster[id]) return false;
    delete roster[id];
    if (activeId === id) activeId = Object.keys(roster)[0] || null;
    persist(); fire("open", { id: activeId });
    return true;
  }

  function stamp(what) {
    const r = current();
    if (what === "sent") r.sentAt = now();
    if (what === "returned") r.returnedAt = now();
    persist();
  }

  /* ---------- formatting, shared so every page agrees ---------- */
  function fmt(key, value) {
    const f = FACTS[key];
    const v = value === undefined ? get(key) : value;
    if (v === undefined || v === null || v === "") return "—";
    if (!f) return String(v);
    if (f.kind === "money") {
      return (v < 0 ? "−$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-US");
    }
    if (f.kind === "rate") return (+v).toFixed(2).replace(/\.00$/, "") + "%";
    if (f.kind === "years") return v + (v === 1 ? " year" : " years");
    if (f.kind === "age") return "age " + v;
    if (f.kind === "bool") return v ? "Yes" : "No";
    return String(v);
  }

  window.WD.client = {
    FACTS: FACTS, SOURCE: SOURCE,
    get: get, num: num, set: set, setMany: setMany, all: all,
    sourceOf: sourceOf, whyOf: whyOf, derive: derive,
    pack: pack, unpack: unpack, fmt: fmt,
    list: list, open: open, create: create, remove: remove,
    stamp: stamp,
    id: function () { return current().id; },
    record: current,
    has: function (k) { return get(k) !== undefined; },
    reset: function () { const r = current(); r.v = {}; r.src = {}; r.why = {}; persist(); fire("change", {}); }
  };
})();
