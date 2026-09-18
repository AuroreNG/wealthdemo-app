# Switching on the smart assistant

Twenty minutes, once. Nothing here costs money except the Anthropic usage itself —
Supabase's free tier covers everything below.

**The one thing to understand first.** Your Anthropic key must never be in a file you
upload to GitHub. Anything in a GitHub Pages site can be read by anyone who opens the
page, including a key. So the key goes in exactly one place: a small function that runs
on Supabase's servers. The site calls that function; the function calls Anthropic. The
browser never sees the key, and nobody can lift it out of your page and spend your
credit.

---

## 1 · Make the Supabase project

1. Go to **supabase.com** → **New project**.
2. Name it whatever you like. Pick the region closest to you. Save the database password
   somewhere — you will not need it for this, but you will one day.
3. Wait for it to finish building. Two minutes.

## 2 · Create the tables

1. In the project, open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this folder, copy the whole file, paste it in.
3. Press **Run**. It should say success. It is safe to run again later if you change it.

That gives you six tables — advisers, branding, assessments, answers, access grants and
AI usage — with row-level security on every one of them. An adviser can only ever read
their own rows. A client who opens an assessment link has no account at all and reaches
only two functions that take the link token and nothing else. It needs no extensions, so
there is nothing to enable first.

**This file has been run against a real Postgres 16 and every rule in it tested** — one
adviser reaching for another's rows, a client with only the link, a non-admin trying to
grant access. If you ever change it, `supabase/harness.sql` and `supabase/verify.sql` let
you prove it again on a throwaway database before it touches the live project. The steps
are in the comment at the top of `verify.sql`.

## 3 · Connect the site — try it before you commit anything

1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open **`studio.html`** on your site. A **Connect your project** card is waiting at the
   top. Paste both in and press **Connect and test**.

It then tells you, as three separate lines, exactly where things stand:

> ✓ **Project and tables** — Connected, and the tables are there.
> ✓ **Assistant** — Deployed, and the Anthropic key is set. Sign in to start using it.
> · **Not signed in yet** — Create an account under Assistant once the two above are green.

Each line says what was actually tried. If the URL is wrong you get *"that URL did not
answer"*; if the key is wrong, *"the project answered, but rejected that key"*; if you
skipped step 2, *"connected, but the tables are missing"*. You are never left guessing
which box to look at.

**Nothing is published at this stage.** Those two values live in your browser only, so
you can get them right without pushing anything to GitHub.

Once all three lines are green, make it real for everyone: open `config.js` and paste the
same two values in.

```js
window.WD_CONFIG = {
  supabaseUrl: "https://abcdefgh.supabase.co",
  supabaseAnonKey: "eyJhbGciOi…",
  askFunction: "ask",
  offlineNotice: true
};
```

Commit that, and the Connect card disappears — the file has taken over. Both values are
meant to be public. They identify the project; they do not grant anything. The policies
from step 2 are what decide who sees what.

## 4 · Deploy the function that holds the key

**The short way, no terminal.** In Supabase:

1. **Edge Functions** → **Create a function** (or *Deploy a new function → via editor*).
2. Name it exactly **`ask`**.
3. Delete the sample code, then paste the whole of
   `supabase/functions/ask/index.ts` from this folder. Deploy.
4. **Edge Functions → Secrets** → add `ANTHROPIC_API_KEY` with your `sk-ant-…` value.

**The other way,** if you'd rather use a terminal — with
[the Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref <your-project-ref>     # the bit before .supabase.co
supabase functions deploy ask
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Either way, that is the only time your Anthropic key is typed anywhere. It lives as a
secret on Supabase and is never sent to a browser.

Go back to the Studio and press **Connect and test** again. The Assistant line should
turn green.

**If `deploy` complains about the model name**, or the assistant later says something
about a model, set the model explicitly — Anthropic retires old ids:

```bash
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-5
```

The current list is at `docs.claude.com/en/docs/about-claude/models`. You can change
this any time without redeploying anything.

Two more you can set, both optional:

```bash
supabase secrets set AI_DAILY_CALLS=300      # per adviser per day (default 300)
supabase secrets set AI_CLIENT_CALLS=40      # per assessment link (default 40)
supabase secrets set ALLOWED_ORIGINS=https://auroreng.github.io
```

`ALLOWED_ORIGINS` is worth setting once you are live: it means only your own site can
call the function.

## 5 · Make yourself the admin

1. Open `studio.html` on your site → **Assistant** tab → **Create account** with your
   email and a password.
2. Back in Supabase **SQL Editor**, run one line:

```sql
update public.profiles set role = 'admin'
 where lower(email) = lower('support@bizzallone.com');
```

3. Reload the Studio. The **Access** tab now shows every account and lets you grant or
   revoke.

## 6 · Check it

Open any calculator, then the ask box:

- Type **"what is the dashed line"** — answers instantly, and **nothing is sent
  anywhere**. That is the page answering from its own figures.
- Type **"my brother says I should just retire earlier, is he right"** — you should see
  *Reading your figures*, then *Retiring at 62 instead*, then an answer with a small
  gold dot beside it. The dot means a model wrote that one.

The Studio's **Assistant** tab then shows the call against your account.

---

## What it costs

Only the second kind of question costs anything. Everything the calculator can answer
for itself — definitions, what-ifs, solving for a figure, what stands out, every chart
readout, the whole walkthrough — is measured off the page and never leaves it. In
testing, most sessions send nothing at all.

A question that does go out is roughly 1,500 tokens in and 150 out, plus one more round
trip if the model uses the calculator. On current Sonnet pricing that is a fraction of a
cent per question. The daily cap is there so a mistake cannot become a bill.

## What the model is and is not allowed to do

It may explain, compare, and reason out loud. It may **not** produce a figure of its own.
The system prompt on the function says so, and more importantly the only numbers it ever
sees are ones read off your calculator. When it needs a new one it has two tools —
*run a what-if* and *solve for a figure* — and both are executed **by the page**, using
the same engine that drew the answer on screen. It gets back what the page then says and
quotes that.

So the assistant can never contradict the calculator, because it never does the sum. That
is the whole reason it is built this way rather than by describing each tool to a
language model and hoping.

## If you do none of this

Leave `config.js` empty and the site behaves exactly as it does today. The deterministic
assistant still answers, assessments still pass by code, branding is still remembered in
the browser. The cloud is an upgrade, never a dependency.
