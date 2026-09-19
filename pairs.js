/* ============================================================
   WEALTHDEMO — what they ask, and what you say

   The Guide's content, one entry per tool.

   Every pair is written the same way round: the client's own
   sentence first, then yours. That order matters. A talk-track
   sheet hands an adviser answers with no questions attached and
   nobody reads it; put the client's words on the left and an
   adviser can scan for the thing that was just said to them.

   Three kinds:

     question   they want to know something
     objection  they are pushing back
     check      they will never ask, but you should look

   Nothing here contains a figure. Where a number belongs, the
   text is a function that is handed the page — solve() and
   probe() drive the real calculator and hand back what it then
   says. The Guide therefore cannot disagree with the tool it is
   standing in, which is the whole point.
   ============================================================ */
(function () {
  "use strict";

  const M0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  function money(n) { return M0.format(Math.round(n || 0)); }

  /* A headline is a whole sentence — "The money lasts to about age 84." —
     which reads badly quoted inside another one: "moves from The money
     lasts to about age 84. to The money lasts to about age 82." So where
     two headlines are being compared, only the figure out of each is
     used. It is still the page's own word for it; nothing is worked out
     here. If a headline has no figure in it, the sentence is used whole
     rather than inventing one. */
  function fig(headline) {
    const t = String(headline || "");
    const age = /age\s*(\d{2,3})/i.exec(t);
    if (age) return "age " + age[1];
    const dollars = /\$[\d,]+/.exec(t);
    if (dollars) return dollars[0];
    const bare = /(\d[\d,.]*)/.exec(t);
    return bare ? bare[1] : t.replace(/\.$/, "");
  }

  window.WD_PAIRS = {

    /* ==========================================================
       Retirement Withdrawal Calculator
       ========================================================== */
    withdraw: [
      {
        kind: "question",
        tags: ["question"],
        said: "So how long does the money actually last?",
        text: function (P) {
          const head = P.say("ansHeadline");
          const sub = P.say("ansSub");
          if (!head) return "Fill the figures in and this answers itself.";
          return "<b>" + head + "</b> " + sub;
        },
        say: "The honest answer is a range, not a date. Same average return, different order of years, and it moves by several years either way.",
        ran: "Read straight off the page as it stands"
      },

      {
        kind: "objection",
        tags: ["objection", "likely"],
        said: "Can't we just retire earlier and enjoy it?",
        text: function (P) {
          const now = P.num("wRet");
          if (now === null) return "Set a retirement age and this will run it.";
          const before = P.say("ansHeadline");
          const after = P.whatIf({ wRet: Math.max(50, now - 3) }, "ansHeadline");
          if (!after) return "";
          return "Retiring at <b>" + Math.max(50, now - 3) + "</b> instead of <b>" + now +
                 "</b> moves the money running out from <b>" + fig(before) + "</b> to <b>" + fig(after) +
                 "</b>. Three years of not saving, three more years of drawing, and the growth those " +
                 "years would have done is gone as well.";
        },
        say: "I'm not going to tell you no. I am going to show you what three years costs, and then you decide whether it is worth it.",
        ran: "Set the retirement age back three years, read the headline, put it back"
      },

      {
        kind: "objection",
        tags: ["objection"],
        said: "The market always comes back, doesn't it?",
        text: function (P) {
          const lo = P.say("lblLo"), hi = P.say("lblHi");
          const spread = (lo && hi)
            ? " On this file that is the difference between <b>" + lo + "</b> and <b>" + hi + "</b> — same average return, different order."
            : "";
          return "It does come back. The trouble is that you are selling while it is down, so there is " +
                 "less left to come back with. That is why the two solid lines on the chart end in " +
                 "different places." + spread;
        },
        say: "It comes back for someone who is still paying in. It comes back differently for someone who is drawing out.",
        ran: "Both lines on the chart use the same average return"
      },

      {
        kind: "question",
        tags: ["question"],
        said: "How much would I need to be safe to 90?",
        text: function (P) {
          const need = P.solve("wNest", function (t) {
            const m = /(\d{2,3})/.exec(t || "");
            return m ? +m[1] >= 90 : false;
          }, "ansHeadline");
          if (need === null) return "Even at ten times what is there now, the headline does not reach 90 — something other than the pot has to move.";
          const have = P.num("wNest");
          const gap = need - (have || 0);
          return "About <b>" + money(need) + "</b> at retirement carries it to 90 on these figures" +
                 (gap > 0 ? ", which is <b>" + money(gap) + "</b> more than is there now." : " — which is already there.");
        },
        say: "Here is the number. Whether we get to it by saving more, spending less or working longer is the conversation.",
        ran: "Solved the pot by bisection against the page's own headline"
      },

      {
        kind: "question",
        tags: ["question"],
        said: "What if I just spent a bit less?",
        text: function (P) {
          const want = P.num("wWant");
          if (want === null) return "Set a monthly income and this will run it.";
          const cut = Math.round(want * 0.9);
          const before = P.say("ansHeadline");
          const after = P.whatIf({ wWant: cut }, "ansHeadline");
          if (!after) return "";
          return "Ten per cent less — <b>" + money(cut) + "</b> a month instead of <b>" + money(want) +
                 "</b> — moves it from <b>" + fig(before) + "</b> to <b>" + fig(after) + "</b>.";
        },
        say: "Spending is the lever you control completely. It is also the only one that works immediately.",
        ran: "Cut the monthly income by 10%, read the headline, put it back"
      },

      {
        kind: "check",
        tags: ["check"],
        said: "",
        text: function (P) {
          const ss = P.num("wSS"), age = P.num("wSSAge");
          if (ss === null) return "No social security has been entered. If they are entitled to it, this whole answer is pessimistic.";
          if (age !== null && age < 67) {
            const later = P.whatIf({ wSSAge: 70 }, "ansHeadline");
            return "They are claiming at <b>" + age + "</b>. Waiting to 70 raises the benefit permanently" +
                   (later ? " and moves the answer to <b>" + fig(later) + "</b>" : "") +
                   " — worth raising before anybody files.";
          }
          return "Social security is in at <b>" + money(ss) + "</b> a month from <b>" + age + "</b>. Worth checking that against their own statement rather than a guess.";
        },
        say: "",
        ran: "Ran the page with the claim age set to 70"
      },

      {
        kind: "check",
        tags: ["check"],
        said: "",
        text: function (P) {
          const g = P.num("wGrowth");
          if (g === null) return "";
          if (g > 7) {
            const lower = P.whatIf({ wGrowth: 5 }, "ansHeadline");
            return "Growth is set to <b>" + g + "%</b>. That is an optimistic assumption for money being drawn from. " +
                   (lower ? "At 5% it is <b>" + fig(lower) + "</b>, which is the number I would show them." : "");
          }
          return "Growth is <b>" + g + "%</b>, which is a defensible assumption. Say out loud that it is an assumption.";
        },
        say: "",
        ran: "Ran the page again at 5% growth"
      }
    ]
  };
})();
