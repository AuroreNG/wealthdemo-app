/* ============================================================
   WEALTHDEMO — the assistant that can use the calculator

   ask.js answers first and always. It is instant, it costs
   nothing, and it is incapable of disagreeing with the page
   because every answer it gives was measured off the page. Only
   a question it cannot place comes here.

   What is different here is not that a model is involved. It is
   what the model is allowed to do:

     · It is handed the live state of the page — what is typed
       in, what the page currently says, what stands out.
     · It may ask the page to run a what-if, or to solve for a
       figure, and it gets back what the page then says.
     · It may not produce a number of its own. The system prompt
       on the edge function says so, and the only numbers it ever
       sees are ones this file read off the page.

   So the model reasons and writes; the calculator still does
   every sum. They can never drift apart, which is the whole
   reason this is built this way rather than by describing the
   model of each tool to a language model and hoping.

   With no Supabase configured, none of this exists and the page
   behaves exactly as it did before.
   ============================================================ */
(function () {
  "use strict";

  const SLUG = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "");
  const M = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  function cloud() { return window.WD_CLOUD && window.WD_CLOUD.ready ? window.WD_CLOUD : null; }
  function drive() { return window.WD_DRIVE || null; }

  /* an assessment link carries its own credential in the address */
  function linkToken() {
    try { return new URLSearchParams(location.search).get("a") || ""; } catch (e) { return ""; }
  }

  function available() {
    const c = cloud();
    if (!c) return false;
    return c.auth.signedIn() || !!linkToken();
  }

  /* ============================================================
     what the page currently is
     ============================================================ */

  function num(el) {
    const v = parseFloat(String(el.value).replace(/[,$\s]/g, ""));
    return isFinite(v) ? v : null;
  }

  function inputs() {
    const out = [];
    document.querySelectorAll(".tool-wrap label[for]").forEach(function (l) {
      const el = document.getElementById(l.getAttribute("for"));
      if (!el || (el.tagName !== "INPUT" && el.tagName !== "SELECT")) return;
      if (el.type === "hidden" || el.type === "checkbox") return;
      /* a slider that mirrors a box would be listed twice and invite the
         model to set one and read the other */
      if (/slide$/i.test(el.id)) return;
      const label = (l.textContent || "").replace(/\s+/g, " ").trim();
      const shown = el.offsetParent !== null || getComputedStyle(el).position === "fixed";
      out.push({
        id: el.id,
        label: label,
        value: el.tagName === "SELECT"
          ? (el.options[el.selectedIndex] || {}).text || el.value
          : el.value,
        n: el.tagName === "SELECT" ? null : num(el),
        kind: /%|rate|percent/i.test(label) ? "percent"
            : (el.closest(".money-in") || /\(\$\)|\$/.test(label)) ? "money"
            : el.tagName === "SELECT" ? "choice" : "number",
        shown: shown
      });
    });
    return out;
  }

  function readouts() {
    const seen = {}, out = [];
    document.querySelectorAll(".tool-wrap [id]").forEach(function (el) {
      if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") return;
      if (el.querySelector("[id]")) return;              /* a wrapper, not a figure */
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!t || t === "—" || t.length > 110) return;
      if (seen[t]) return;
      seen[t] = 1;
      /* the nearest words that say what this figure is */
      let lab = "";
      const box = el.closest("div, li, section");
      if (box) {
        const s = box.querySelector("small, .eyebrow, label, em");
        if (s && s !== el) lab = (s.textContent || "").replace(/\s+/g, " ").trim();
      }
      out.push({ id: el.id, label: lab, text: t });
    });
    return out.slice(0, 44);
  }

  function findings() {
    try {
      const f = window.WD_FINDINGS ? window.WD_FINDINGS(SLUG) : null;
      return (f || []).map(function (x) { return x.t + " — " + x.b; });
    } catch (e) { return []; }
  }

  function chartNames() {
    const out = [];
    document.querySelectorAll(".chart-key span, .cs-row .cs-name").forEach(function (s) {
      const t = (s.textContent || "").replace(/\s+/g, " ").trim();
      if (t && out.indexOf(t) < 0) out.push(t);
    });
    return out;
  }

  function context() {
    const plan = (window.WD_SIMPLE || {})[SLUG] || {};
    const g = plan.guide || {};
    const L = [];

    L.push("TOOL: " + (document.title || SLUG).replace(/\s*—.*$/, "").trim());
    if (g.title) L.push("WHAT IT ANSWERS: " + g.title + (g.sub ? " — " + g.sub : ""));

    L.push("");
    L.push("INPUTS (id — label — current value; you may change these with tools)");
    inputs().forEach(function (f) {
      L.push("  " + f.id + " — " + f.label + " — " + f.value +
             (f.shown ? "" : "  [folded away, still live]"));
    });

    L.push("");
    L.push("WHAT THE PAGE SAYS NOW (id — label — text)");
    readouts().forEach(function (r) {
      L.push("  " + r.id + " — " + (r.label || "—") + " — " + r.text);
    });

    const cn = chartNames();
    if (cn.length) { L.push(""); L.push("CHART SERIES: " + cn.join(" · ")); }

    const fs = findings();
    if (fs.length) {
      L.push("");
      L.push("WHAT STANDS OUT (already worked out on these figures)");
      fs.forEach(function (s) { L.push("  • " + s); });
    }
    return L.join("\n");
  }

  /* ============================================================
     the two things the model may ask the page to do
     ============================================================ */

  function headlineNow() {
    const H = drive();
    const ids = ["ansHeadline", "bnBig", "outTax"];
    for (let i = 0; i < ids.length; i++) {
      const t = H.t(ids[i]);
      if (t) return { id: ids[i], text: t };
    }
    return { id: "", text: "" };
  }

  function runWhatIf(input) {
    const H = drive();
    if (!H) return { error: "This page cannot be driven." };
    const changes = input && Array.isArray(input.changes) ? input.changes : [];
    if (!changes.length) return { error: "No changes given." };

    const map = {}, was = {};
    for (let i = 0; i < changes.length; i++) {
      const c = changes[i];
      const el = H.el(c.id);
      if (!el) return { error: "There is no input called " + c.id + " on this page." };
      was[c.id] = el.value;
      map[c.id] = c.value;
    }

    const back = H.set(map);
    if (!back) return { error: "Could not set those inputs." };

    /* read everything worth reading while the page is in the new state */
    const after = {};
    readouts().forEach(function (r) { after[r.id] = H.t(r.id); });
    H.undo(back);

    const before = {};
    readouts().forEach(function (r) { before[r.id] = H.t(r.id); });

    const moved = [];
    for (const id in after) {
      if (after[id] && after[id] !== before[id]) {
        moved.push({ id: id, was: before[id], now: after[id] });
      }
    }
    return {
      changed: changes.map(function (c) { return c.id + ": " + was[c.id] + " → " + c.value; }),
      moved: moved.slice(0, 18),
      note: moved.length ? "" : "Nothing on the page moved, so that input does not affect this answer."
    };
  }

  function figure(s) {
    const m = String(s || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function solveFor(input) {
    const H = drive();
    if (!H) return { error: "This page cannot be driven." };
    const id = input && input.id;
    const el = id ? H.el(id) : null;
    if (!el) return { error: "There is no input called " + id + " on this page." };

    const watch = (input && input.readout) || headlineNow().id;
    if (!watch || !H.el(watch)) return { error: "I could not find a readout to watch." };

    const target = Number(input.target);
    if (!isFinite(target)) return { error: "No target given." };
    const up = input.direction !== "at_most";

    /* search between something and ten times what is there now, which covers
       every case these tools produce without taking a guess at the range */
    const now = parseFloat(el.value) || 0;
    const lo = 0;
    const hi = Math.max(now * 10, now + 1000, 1000);

    const ok = function () {
      const v = figure(H.t(watch));
      if (v === null) return false;
      return up ? v >= target : v <= target;
    };

    const answer = H.solve(id, lo, hi, ok);
    if (answer === null) {
      return {
        found: false,
        say: "Even at " + hi + " for " + id + ", " + watch + " does not reach " + target +
             ". Something else has to move."
      };
    }
    /* say what the page reads at the answer, so the model quotes the page */
    const back = H.set({ [id]: Math.ceil(answer) });
    const at = {};
    readouts().forEach(function (r) { at[r.id] = H.t(r.id); });
    H.undo(back);

    return {
      found: true,
      id: id,
      value: Math.ceil(answer),
      was: el.value,
      readout: watch,
      page_then_says: at[watch] || "",
      headline_then: at.ansHeadline || at.bnBig || ""
    };
  }

  function runTool(name, input) {
    try {
      if (name === "run_what_if") return runWhatIf(input);
      if (name === "solve_for") return solveFor(input);
      return { error: "Unknown tool " + name };
    } catch (e) {
      return { error: String(e && e.message ? e.message : e) };
    }
  }

  /* ============================================================
     the loop
     ============================================================ */

  const MAX_TOOL_ROUNDS = 4;

  async function ask(question, history, onState) {
    const c = cloud();
    if (!c) return { error: "offline" };
    const say = onState || function () {};

    const mode = (function () {
      try { return localStorage.getItem("wealthdemo.role") === "agent" ? "advisor" : "client"; }
      catch (e) { return "client"; }
    })();

    const messages = (history || []).slice(-8).concat([{ role: "user", content: question }]);
    const ctx = context();
    const tok = linkToken();

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      say(round === 0 ? "thinking" : "working");

      const r = await c.fn((window.WD_CONFIG || {}).askFunction || "ask", {
        messages: messages,
        context: ctx,
        mode: mode,
        assessment_token: tok
      });

      if (r.error) {
        const b = r.error.body || {};
        return { error: r.error.message, say: b.say || "", code: b.error || "" };
      }

      const content = (r.data && r.data.content) || [];
      const uses = content.filter(function (b) { return b.type === "tool_use"; });
      const text = content.filter(function (b) { return b.type === "text"; })
                          .map(function (b) { return b.text; }).join("\n").trim();

      if (!uses.length || r.data.stop_reason !== "tool_use") {
        return { text: text, messages: messages };
      }

      /* let the reader see it is doing something real, and what */
      const why = uses.map(function (u) {
        return (u.input && u.input.why) ||
               (u.name === "solve_for" ? "solving on your figures" : "running it on your figures");
      })[0];
      say("working", why);

      messages.push({ role: "assistant", content: content });
      messages.push({
        role: "user",
        content: uses.map(function (u) {
          return {
            type: "tool_result",
            tool_use_id: u.id,
            content: JSON.stringify(runTool(u.name, u.input))
          };
        })
      });
    }

    return { error: "too_many_rounds", say: "That took more steps than I allow in one go. Try asking it in two parts." };
  }

  window.WD_AI = {
    available: available,
    ask: ask,
    context: context,     /* exported so a test can read what the model sees */
    runTool: runTool
  };
})();
