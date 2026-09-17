/* ============================================================
   WEALTHDEMO — the adviser's own details

   Set once, then carried on everything the client sees: the
   assessment, the result they keep, the copy they forward to a
   spouse. Kept apart from the client record because it belongs
   to the person running the tools, not to anyone they meet.
   ============================================================ */
window.WD = window.WD || {};

(function () {
  "use strict";

  const KEY = "wealthdemo.profile";

  const BLANK = {
    name: "", firm: "", title: "", licence: "",
    email: "", phone: "", book: "", colour: "#0d4435",
    site: "",             /* where the published site lives, e.g. https://you.github.io/app/ */
    tier: "full"          /* full | core — which tools this account may send */
  };

  /* the packed form uses one-letter keys; a link is read on a phone
     over a mobile connection and every character is worth saving */
  /* initials are worked out from the name at the other end, so they are not
     worth the characters — every one saved is a smaller QR code */
  const SHORT = { name: "n", firm: "f", email: "e", phone: "p", book: "b", colour: "c" };

  function read() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    const out = {};
    Object.keys(BLANK).forEach(function (k) {
      out[k] = s && typeof s[k] === typeof BLANK[k] && s[k] !== "" ? s[k] : BLANK[k];
    });
    return out;
  }

  function write(next) {
    const cur = read();
    Object.keys(next || {}).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(BLANK, k)) cur[k] = next[k];
    });
    try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("wd:profile", { detail: cur }));
    return cur;
  }

  function initials(p) {
    const b = ((p || read()).name || "").trim().split(/\s+/).filter(Boolean);
    if (!b.length) return "";
    return (b[0][0] + (b.length > 1 ? b[b.length - 1][0] : "")).toUpperCase();
  }

  /* what travels in the invite — never the licence number or the tier */
  function forLink() {
    const p = read(), out = {};
    Object.keys(SHORT).forEach(function (k) {
      const v = p[k];
      if (v) out[SHORT[k]] = v;
    });
    return out;
  }

  function isReady() {
    const p = read();
    return !!(p.name && p.name.trim());
  }

  window.WD.profile = {
    read: read, write: write, initials: initials, forLink: forLink,
    isReady: isReady, BLANK: BLANK
  };
})();
