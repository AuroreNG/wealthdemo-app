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

  function role() {
    try { return localStorage.getItem(KEY) === "agent" ? "agent" : "client"; } catch (err) { return "client"; }
  }

  function setRole(next) {
    try { localStorage.setItem(KEY, next === "agent" ? "agent" : "client"); } catch (err) {}
    apply();
    document.dispatchEvent(new CustomEvent("wd:role", { detail: { role: role() } }));
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

  /* ---------- the switch itself ---------- */
  function mountToggle() {
    const menu = document.getElementById("accountMenu");
    if (!menu || menu.querySelector(".role-switch")) return;

    const wrap = document.createElement("div");
    wrap.className = "role-switch";
    wrap.innerHTML =
      '<span class="role-label">Mode</span>' +
      '<div class="role-seg" role="group" aria-label="View mode">' +
        '<button type="button" data-role-set="client">Client</button>' +
        '<button type="button" data-role-set="agent">Agent</button>' +
      '</div>';
    menu.insertBefore(wrap, menu.firstChild.nextSibling);

    wrap.addEventListener("click", function (e) {
      const b = e.target.closest("[data-role-set]");
      if (!b) return;
      setRole(b.getAttribute("data-role-set"));
      paintToggle();
    });
    paintToggle();
  }

  function paintToggle() {
    document.querySelectorAll("[data-role-set]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-role-set") === role());
    });
    const flag = document.getElementById("agentFlag");
    if (flag) flag.hidden = role() !== "agent";
  }

  /* a standing marker so nobody presents to a client with internals showing */
  function mountFlag() {
    if (document.getElementById("agentFlag")) return;
    const el = document.createElement("div");
    el.className = "agent-flag";
    el.id = "agentFlag";
    el.hidden = role() !== "agent";
    el.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 5.5 6.2v5.1c0 4 2.7 7.6 6.5 9.2 3.8-1.6 6.5-5.2 6.5-9.2V6.2Z"/></svg>' +
      '<span>Agent mode — internal notes visible</span>' +
      '<button type="button" data-role-set="client">Switch to client view</button>';
    el.addEventListener("click", function (e) {
      const b = e.target.closest("[data-role-set]");
      if (b) { setRole("client"); paintToggle(); }
    });
    document.body.appendChild(el);
  }

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
