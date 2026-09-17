/* ============================================================
   WEALTHDEMO — demo access gate
   A convenience lock for the preview, not security: everything
   happens in this browser and no credentials are sent anywhere.
   ============================================================ */
(function () {
  const KEY = "wealthdemo.session";
  const OWNER = "support@bizzallone.com";
  const page = document.body.getAttribute("data-page");

  function session() {
    try { return localStorage.getItem(KEY) || ""; } catch (err) { return ""; }
  }
  function signIn(email) {
    try { localStorage.setItem(KEY, email); } catch (err) {}
  }
  function signOut() {
    try { localStorage.removeItem(KEY); } catch (err) {}
    window.location.href = "./";
  }

  /* ---------- protected pages ---------- */
  if (page === "app") {
    if (!session()) { window.location.replace("./"); return; }
    const who = document.getElementById("accountEmail");
    if (who) who.textContent = session();
    document.querySelectorAll("[data-logout]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); signOut(); });
    });
    return;
  }

  /* ---------- the sign-in page ---------- */
  if (page !== "login") return;
  if (session()) { window.location.replace("home.html"); return; }

  const form = document.getElementById("signInForm");
  const email = document.getElementById("signInEmail");
  const note = document.getElementById("signInNote");
  const google = document.getElementById("googleBtn");
  const reveal = document.getElementById("revealPw");
  const password = document.getElementById("signInPassword");

  function say(message, ok) {
    if (!note) return;
    note.textContent = message;
    note.className = "sign-note " + (ok ? "ok" : "err");
  }

  function attempt(value) {
    const v = (value || "").trim().toLowerCase();
    if (!v) { say("Enter your email address to continue.", false); return; }
    if (v === OWNER || /@bizzallone\.com$/.test(v)) {
      signIn(v);
      say("Welcome back. Opening your tools…", true);
      setTimeout(function () { window.location.href = "home.html"; }, 420);
      return;
    }
    say("This preview is open to the WEALTHDEMO account only — use " + OWNER + ".", false);
  }

  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    attempt(email ? email.value : "");
  });
  if (google) google.addEventListener("click", function () {
    if (email) email.value = OWNER;
    say("Demo sign-in — no Google account is contacted.", true);
    setTimeout(function () { attempt(OWNER); }, 500);
  });
  if (reveal && password) reveal.addEventListener("click", function () {
    const shown = password.type === "text";
    password.type = shown ? "password" : "text";
    reveal.setAttribute("aria-label", shown ? "Show password" : "Hide password");
    reveal.classList.toggle("on", !shown);
  });
})();
