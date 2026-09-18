/* ============================================================
   WEALTHDEMO — the two public values

   Paste your Supabase project's URL and its **anon** key here.
   Both of these are meant to be public: they identify the
   project, they do not grant anything. Every table has row-level
   security on, so the anon key can only reach what the policies
   in schema.sql allow.

   Your Anthropic key does NOT go here, or anywhere else in this
   folder. It lives as a secret on the edge function, which is
   the only piece of this that runs on a server. Anything in
   these files can be read by anyone who opens the site.

   Find both values in Supabase under
   Project Settings → API → Project URL / Project API keys → anon public.

   Leave them empty and the whole site still works exactly as it
   does today: the deterministic assistant answers, assessments
   pass by code, and branding is remembered in the browser. The
   cloud is an upgrade, never a dependency.
   ============================================================ */
window.WD_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",

  /* the edge function's name, if you deploy it under another one */
  askFunction: "ask",

  /* how the assistant behaves when the cloud is not configured */
  offlineNotice: true
};
