/* ============================================================
   WEALTHDEMO — role switch

   Two modes share the same pages:
     client  — what a customer may see. The default, always.
     agent   — adds internal material: compensation, carrier
               notes, talk tracks, objection handling.

   Anything agent-only carries data-agent-only and is removed
   from the DOM in client mode, not merely hidden, so it cannot
   be read off the page during a meeting.
   ============================================================ */
window.WD = window.WD || {};

(function () {
  const KEY = "wealthdemo.role";
  const CLIENT_KEY = "wealthdemo.client.name";

  /* There is only one mode now. Everything that used to ask "which view is
     this?" still asks; it just always gets the same answer. */
  function role() { return "agent"; }

  function setRole(next) {
    try { localStorage.setItem(KEY, "agent"); } catch (err) {}
    apply();
    document.dispatchEvent(new CustomEvent("wd:role", { detail: { role: "agent" } }));
  }

  function clientName() {
    try { return (localStorage.getItem(CLIENT_KEY) || "").trim(); } catch (err) { return ""; }
  }
  function setClientName(v) {
    try { localStorage.setItem(CLIENT_KEY, (v || "").trim()); } catch (err) {}
    document.dispatchEvent(new CustomEvent("wd:client", { detail: { name: clientName() } }));
  }

  /* agent-only nodes are parked in a template until the mode is on */
  const parked = [];

  function apply() {
    const isAgent = role() === "agent";
    document.body.setAttribute("data-role", isAgent ? "agent" : "client");

    if (!isAgent) {
      document.querySelectorAll("[data-agent-only]").forEach(function (el) {
        const mark = document.createComment("agent-only");
        el.parentNode.insertBefore(mark, el);
        parked.push({ el: el, mark: mark });
        el.parentNode.removeChild(el);
      });
    } else {
      while (parked.length) {
        const p = parked.pop();
        if (p.mark.parentNode) p.mark.parentNode.replaceChild(p.el, p.mark);
      }
    }
  }

  /* ---------- no switch ----------

     There used to be a Client / Agent toggle in the account menu and a
     standing bar across the bottom of every page announcing which one you
     were in. Both are gone. This is an adviser's tool: it is always agent
     mode, so nothing has to be announced, nothing has to be remembered
     before a meeting, and two of the noisiest elements on the page stop
     existing. What a client sees is the assessment link, which was always
     a separate thing.

     setRole and the role() reader stay, because other files ask what mode
     this is. They are simply never told anything but "agent" now. */
  function mountToggle() {}
  function paintToggle() {}
  function mountFlag() {}

  WD.role = role;
  WD.setRole = setRole;
  WD.isAgent = function () { return role() === "agent"; };
  WD.clientName = clientName;
  WD.setClientName = setClientName;
  WD.applyRole = apply;

  function boot() { apply(); mountToggle(); mountFlag(); paintToggle(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
