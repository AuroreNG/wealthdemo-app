/* ============================================================
   WEALTHDEMO — the plan for every tool

   Three things per tool, and nothing else:

     ask    the questions that stay on screen. Everything else
            still works, it just waits behind "More settings".
     keep   the sections that stay on screen. Everything after
            them waits behind "Show me the detail".
     guide  what to say, in plain sentences, about the numbers
            the page is already showing.

   In a guide line, {#someId} is read from what the page is
   displaying and {$someId} from what was typed in. If an id
   isn't on the page or hasn't got an answer yet, that line is
   left out rather than shown half-finished.

   No calculation lives here. This file only decides what a
   first-time visitor sees and hears.
   ============================================================ */
window.WD_SIMPLE = {

  /* ---------------------------------------------------------- */
  rule72: {
    tour: [
      { find: [".rates"], t: "Two clocks, both running",
        b: "The left side is what you have saved; the right is what you owe. Put a rate on each. Both are doubling \u2014 this tool is only about which doubles first." },
      { find: ["#ansHeadline"], t: "The year they meet",
        b: "Divide 72 by a rate and you get the years to double. Everything on this page comes from that one piece of arithmetic." },
      { find: [".clock-grid"], t: "How long each takes",
        b: "Two doubling times, side by side. The shorter one is the number moving fastest, and usually where a spare dollar does the most work." }
    ],
    ask: ["r7Inv", "r7IR", "r7Debt", "r7DR"],
    keep: [".tool-hero", ".rates", ".timing", ".ask-answer", ".ask-answer-sub", ".clock-grid"],
    guide: {
      title: "Why money doubles",
      sub: "The whole idea in four sentences.",
      lead: "Divide 72 by a rate and you get the years it takes for money to double. That one trick is the whole tool. {#ansSub}",
      steps: [
        { t: "Your savings", b: "You have {$r7Inv} earning {$r7IR}% a year. Seventy-two divided by that rate is how many years it takes to become twice as much — without you adding a cent." },
        { t: "Your debt", b: "What you owe does exactly the same thing. {$r7Debt} at {$r7DR}% doubles on its own clock, and that clock runs whether you look at it or not." },
        { t: "Which one wins", b: "{#ansHeadline}" },
        { t: "So what", b: "{#dxBody}" }
      ],
      qs: [
        { q: "Why 72 and not some other number?", a: "It is a shortcut that happens to land very close to the real compound-interest answer for rates between about 4% and 12%. At {$r7IR}% it is near enough to be useful in your head, which is the point of it." },
        { q: "Does this mean I should pay off debt first?", a: "Not always. Compare the two rates: money earning {$r7IR}% against money costing {$r7DR}%. The higher number is the one moving fastest, and that is usually where a spare dollar does the most work." },
        { q: "Is this a guarantee?", a: "No. It assumes the rate never changes, which no real investment does. Treat it as a way to feel the speed of compounding, not as a prediction." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  waiting: {
    tour: [
      { find: [".rates"], t: "Your plan, before any delay",
        b: "Your age, when you want to stop, what you would put in and what you assume it earns." },
      { find: [".delay"], t: "Now push the start back",
        b: "Drag this. Nothing else changes \u2014 same money, same rate, only the starting date. Watch the answer above move." },
      { find: ["#catchup"], t: "What catching up would take",
        b: "The monthly amount that gets you back to the same finish after the delay, and how much more of your own money that costs." }
    ],
    ask: ["wAge", "wRet", "wAmt", "delaySlide"],
    keep: [".tool-hero", ".rates", ".delay", ".ask-answer", ".ask-answer-sub", ".clock-grid"],
    guide: {
      title: "What waiting costs",
      sub: "The price of starting later, in dollars.",
      lead: "Two people save exactly the same money. One starts now, one starts later. {#ansHeadline}",
      steps: [
        { t: "The plan", b: "You are {$wAge} and want to stop working at {$wRet}, putting in {$wAmt} along the way." },
        { t: "The delay", b: "Now push the start back by {$delaySlide} years. Same money, same rate — only the starting date moves." },
        { t: "The damage", b: "{#ansSub}" },
        { t: "Catching up", b: "To land in the same place after the delay you would have to find {#cuMonthly} a month instead, and put in {#cuTotal} of your own money overall." }
      ],
      qs: [
        { q: "Why does a few years cost so much?", a: "The years you give up are the last ones, not the first. Those are the years the balance is biggest, so they are the years growth adds the most. Losing them at the front means losing the largest ones at the back." },
        { q: "What if I can't start with much?", a: "Starting small beats starting late. A small amount that has all {$wRet} minus {$wAge} years to work often ends up ahead of a larger amount with fewer years behind it." },
        { q: "Is the rate realistic?", a: "It is whatever you set it to, and it never varies here. Real returns move around year to year, so read this as the shape of the cost, not the exact figure." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  loss: {
    tour: [
      { find: [".rates"], t: "Three numbers, that is all",
        b: "What you had, how far it falls, and what it earns on the way back up." },
      { find: ["#ansHeadline"], t: "The gain has to be bigger than the fall",
        b: "Because the climb starts from the smaller pile. Down 30% needs nearly 43% to get level." },
      { find: ["#trap"], t: "Where it actually leaves you",
        b: "Grow back at your rate for the same number of years and see how far short you still are." }
    ],
    ask: ["lAmt", "lLoss", "lGrow"],
    keep: [".tool-hero", ".rates", ".timing", ".ask-answer", ".ask-answer-sub", ".loss-panel", ".clock-grid"],
    guide: {
      title: "Why a loss hurts twice",
      sub: "Down 50% needs up 100% to get level.",
      lead: "A fall and a recovery are not the same size, because the recovery has to work on a smaller pile. {#ansHeadline}",
      steps: [
        { t: "What you had", b: "You started with {$lAmt}." },
        { t: "The fall", b: "A drop of {$lLoss}% takes a slice off the top. What is left is what has to do all the climbing." },
        { t: "The climb", b: "{#ansSub}" },
        { t: "Where you land", b: "Growing back at {$lGrow}% a year you would be at {#trapA} — {#trapB} short of where you started." }
      ],
      qs: [
        { q: "Why isn't a 30% loss fixed by a 30% gain?", a: "Because the gain is measured against the smaller number. Lose 30% of $100 and you have $70; a 30% gain on $70 is $91, not $100. You need about 43% to get level." },
        { q: "Does this mean I should avoid risk?", a: "It means the size of a fall matters more than it looks. Avoiding risk entirely has its own cost, but money you will need soon is the money a fall can hurt most, because it has no time to climb." },
        { q: "What about money I'm adding along the way?", a: "This tool holds the amount still so you can see the arithmetic clearly. Regular contributions during a fall buy in cheaply and shorten the recovery, which this picture does not show." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  dime: {
    tour: [
      { find: [".dime-inputs"], t: "D, I, M, E",
        b: "Debts, Income, Mortgage, Education. Four things a family would still have to pay for, added up instead of guessed at with a rule of thumb." },
      { find: [".have-row"], t: "Then take off what exists already",
        b: "Cover in force and savings they could reach come straight off the total. This is why the answer is a gap, not a wish list." },
      { find: ["#ansHeadline"], t: "The number to actually ask for",
        b: "Rounded up, because policies are written in round numbers." }
    ],
    ask: ["dDebt", "dIncome", "dYears", "dMort", "dKids", "dPerKid", "dHaveIns", "dHaveSav"],
    keep: [".tool-hero", ".dime-inputs", ".have-row", ".ask-answer", ".ask-answer-sub", ".clock-grid"],
    guide: {
      title: "How the number is built",
      sub: "Four things added up. That's all DIME is.",
      lead: "Rather than a rule of thumb, this adds up what would actually have to be paid for. {#ansHeadline}",
      steps: [
        { t: "D — debt", b: "{$dDebt} of cards, loans and car payments that would have to be cleared straight away." },
        { t: "I — income", b: "{$dIncome} a year, replaced for {$dYears} years, so the household keeps running while it finds its feet." },
        { t: "M — mortgage", b: "{$dMort} still owing on the home, so nobody has to move at the worst possible moment." },
        { t: "E — education", b: "{$dKids} children at {$dPerKid} each, so their plans survive the loss too." },
        { t: "What you already have", b: "Cover already in force and savings they could reach come off the total: {#rcC} is the gap on that basis." }
      ],
      qs: [
        { q: "Isn't there a simpler rule, like ten times income?", a: "There is, and it is quick, but it ignores whether you have a mortgage, debts or children. Two households on the same income can need very different amounts. This adds up yours instead of guessing." },
        { q: "Why replace income for a set number of years?", a: "Because the need is not forever — it usually runs until the youngest child is grown or the surviving partner reaches their own retirement. You have set it to {$dYears} years; change it and watch the total move." },
        { q: "Should the whole amount be one policy?", a: "Not necessarily. Some of the need shrinks over time — a mortgage falls, children finish school — so cover is often layered, with cheaper term insurance over the years the need is biggest." },
        { q: "What does the lump sum lasting figure mean?", a: "It is how long the money would hold out if it were invested and drawn on, rather than spent straight away: {#rcLasts}." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  legacy: {
    tour: [
      { find: [".lg-rates"], t: "What you own, and what comes off it",
        b: "Everything on the left is the estate on paper. Everything on the right \u2014 debts, the heirs' tax rate, the cost of settling \u2014 is paid before anyone sees a share." },
      { find: [".goal-row"], t: "What you would like to leave",
        b: "Set the target here. The gap against it is the whole point of the page." },
      { find: ["#ansHeadline"], t: "What actually lands",
        b: "Not own-minus-owe. Tax and the settling process take a slice on the way through, and the two routes do not arrive the same size." }
    ],
    ask: ["gHome", "gRetire", "gSave", "gLife", "gDebt", "gGoal"],
    keep: [".tool-hero", ".lg-rates", ".goal-row", ".ask-answer", ".ask-answer-sub", ".clock-grid"],
    guide: {
      title: "On paper, and after",
      sub: "What you own is not what they receive.",
      lead: "Add up everything, take off what is owed and what the handover costs, and the number that reaches them is smaller than the one on paper. {#ansHeadline}",
      steps: [
        { t: "What you own", b: "Home equity of {$gHome}, {$gRetire} in retirement accounts, {$gSave} in savings and {$gLife} of life cover." },
        { t: "What comes off", b: "Debts of {$gDebt}, plus the cost of settling the estate. Those are paid before anything is shared out." },
        { t: "What actually lands", b: "{#ansSub}" },
        { t: "Why the route matters", b: "To put the same amount in their hands takes {#clA} through life insurance, which arrives whole — or {#clB} through the retirement account, because they pay income tax as they draw it out." }
      ],
      qs: [
        { q: "Why is the retirement account worth less to them?", a: "Money went in before tax, so tax is still owed. When an heir withdraws it, it is taxed as their income — at their rate, on top of whatever they already earn. Life insurance proceeds generally arrive income-tax-free." },
        { q: "Is the home really worth its equity?", a: "Only if they sell, and selling costs money and time. If they keep it, the value is real but not spendable, which matters when there are debts and costs to settle quickly." },
        { q: "What's the cheapest way to close a gap?", a: "Usually the route that transfers most cleanly. That is why a gap against your {$gGoal} goal is often talked about in terms of cover rather than more savings — the same dollar simply arrives larger." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  withdraw: {
    tour: [
      { find: [".wd-ask"], t: "Five questions",
        b: "What you have, when you stop, what you want to spend, what Social Security adds and what you assume it earns. Change any of them and everything above moves." },
      { find: [".ans-copy"], t: "One age, and the honest spread",
        b: "A single estimate to hold on to, with the range underneath. The order returns arrive in moves the answer by years, even at the same average." },
      { find: ["#shortBox"], t: "What would have been needed",
        b: "The balance that would have supported this spending from day one, against what you actually have." }
    ],
    ask: ["wNest", "wRet", "wWant", "wSS", "wGrowth"],
    keep: [".tool-hero", ".wd-ask", ".answer", ".wd-layout"],
    guide: {
      title: "Will it last?",
      sub: "What you have, against what you want to spend.",
      lead: "This runs your savings forward month by month, taking out what you want to spend and letting the rest grow. {#ansHeadline}",
      steps: [
        { t: "What you have", b: "{#figNest} by the time you stop working at {$wRet}, growing at {$wGrowth}% a year along the way." },
        { t: "What you want", b: "{#figWant} to live on, rising with prices every year after that." },
        { t: "What helps", b: "Social Security of {$wSS} a month covers part of it, so your savings only have to find the difference." },
        { t: "How it ends", b: "{#ansSub}" }
      ],
      qs: [
        { q: "Why does the money run out faster than I expect?", a: "Two reasons. Inflation quietly raises what you need every year, and every dollar you take out stops earning. Early withdrawals cost you the growth they would have made for the whole rest of retirement." },
        { q: "What single change buys the most years?", a: "Usually spending less early on, then delaying the start. Both work on the biggest balance, which is where growth does the most. The panel below the answer ranks them for your figures." },
        { q: "Is a fixed return realistic?", a: "No. Real returns arrive in a jagged order, and a bad run in the first few years of retirement does more damage than the same run later. Treat a level {$wGrowth}% as a middle estimate, not a promise." },
        { q: "Does this include tax?", a: "It uses the bracket you set to estimate what a withdrawal costs you. It cannot know your full return, so the tax figure is an estimate, not a filing." },
        { q: "What are the three lines on the chart?", a: "One solid line earns a level {$wGrowth}% every year. The other averages the same {$wGrowth}% but gets its bad years first \u2014 that is sequence-of-returns risk, and it is why the two end years apart. The dashed line is the safe withdrawal rate, the industry yardstick of about 4% rising with inflation: a ruler to measure your draw against, not a third plan." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  accounts: {
    tour: [
      { find: [".ask"], t: "One withdrawal, priced everywhere",
        b: "How much you need, at what age, at what tax rate. Every account below is priced on that same transaction \u2014 which is the only fair way to rank them." },
      { find: ["#acctGrid"], t: "What reaches you from each",
        b: "The spread between the best and the worst is decided by nothing except which account you take it from." }
    ],
    ask: ["aNeed", "aAge", "aRate"],
    keep: [".tool-hero", ".ask", ".ask-answer", ".ask-answer-sub", ".acct-grid"],
    guide: {
      title: "Which account to draw from",
      sub: "The same withdrawal costs different amounts.",
      lead: "You need money. Where you take it from changes what you actually keep. {#ansHeadline}",
      steps: [
        { t: "What you need", b: "{$aNeed}, at age {$aAge}, with an income-tax rate of {$aRate}%." },
        { t: "The comparison", b: "Every account is priced on that same withdrawal, so the ranking is a fair one — not one account at its best against another at its worst." },
        { t: "The verdict", b: "{#ansSub}" },
        { t: "The part people miss", b: "{#dxBody}" }
      ],
      qs: [
        { q: "Why not always take from the cheapest one?", a: "Because you use it once. Draining the tax-free money first makes this withdrawal cheap and every later one expensive. The order across a whole retirement matters more than the cost of any single withdrawal." },
        { q: "What is an RMD and why does it appear here?", a: "From a set age the law requires you to take a minimum amount out of pre-tax retirement accounts each year, whether you want it or not. Missing it carries a penalty, which is why it is worth seeing before it arrives." },
        { q: "Does age really change the answer?", a: "Sharply. Before 59½ most retirement accounts add a 10% penalty on top of the tax, which can move an account from the best choice to the worst one. You have set age {$aAge}." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  tool: {
    tour: [
      { find: [".field-grid"], t: "Your other income decides it",
        b: "The benefit itself is not what makes it taxable. Everything else you receive is what pushes it over the line." },
      { find: ["#verdict"], t: "Where you land",
        b: "The IRS adds your other income to half the benefit. That figure, not the benefit, is what the thresholds are tested against." },
      { find: ["#insightBody"], t: "The part that catches people",
        b: "An extra withdrawal is taxed twice over: once itself, and again by dragging more of the benefit into being taxable." }
    ],
    ask: ["filing", "bracket", "ssIncome", "qualified", "other"],
    keep: [".tool-hero", ".tool-layout"],
    guide: {
      title: "Is my Social Security taxed?",
      sub: "It depends on your other income, not on the benefit.",
      lead: "Social Security is only taxed once your other income crosses a line. {#verdictTitle}",
      steps: [
        { t: "The test income", b: "The IRS adds your other income to half your benefit. That figure — {#outProvisional} for you — is what decides it, not your benefit on its own." },
        { t: "How much is caught", b: "{#outTaxable} of your benefit counts as taxable income. At most 85% of it ever can be." },
        { t: "What it costs", b: "At a {$bracket} bracket, that works out to about {#outTax} of tax on the benefit itself." },
        { t: "The trap", b: "{#insightBody}" }
      ],
      qs: [
        { q: "Why does a small withdrawal cost so much?", a: "Because it does two things at once: the withdrawal is taxed, and it drags more of your benefit into being taxable as well. That is why an extra dollar can cost far more than your bracket suggests." },
        { q: "Which income counts?", a: "Withdrawals from 401(k)s, IRAs and pensions, plus wages, interest and most other income. Tax-free municipal interest is added back for this test even though it is not taxed itself." },
        { q: "Can I do anything about it?", a: "Sometimes. Money that does not show up as income on the test — Roth withdrawals, for example — does not push the benefit over the line. Which of those makes sense is worth a conversation, not a calculator." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  paycheck: {
    tour: [
      { find: [".calc-sides"], t: "Bills that do not stop",
        b: "What has to be paid each month, what income would still arrive, and what you have to bridge the gap with." },
      { find: [".results"], t: "How long the benefit lasts",
        b: "How many months you could cover. The first bar is savings alone; the second adds the income-protection benefit." },
      { find: [".later"], t: "If you do not need it straight away",
        b: "The same benefit, invested rather than spent, over the years you set." }
    ],
    ask: ["pBills", "pCont", "pSav", "pBen"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "If the paycheck stopped",
      sub: "How long the money holds out.",
      lead: "This is not about illness. It is about how many months of bills you could cover without a paycheck. On your numbers, {#bnBig}.",
      steps: [
        { t: "What has to be paid", b: "{$pBills} a month of bills that do not stop." },
        { t: "What still arrives", b: "{$pCont} a month keeps coming in. Only the difference has to be found somewhere else." },
        { t: "Savings alone", b: "{$pSav} of savings gives you {#aloneBig}." },
        { t: "Savings plus cover", b: "Add the income-protection benefit of {$pBen} a month and it becomes {#bothBig}." }
      ],
      qs: [
        { q: "Why does the waiting period matter so much?", a: "Because cover pays nothing during it. Those first weeks come entirely out of savings, so a longer wait means a bigger emergency fund — the two settings have to be chosen together." },
        { q: "How many months should I aim for?", a: "Long enough to outlast the thing that stopped the paycheck. Most claims are short, but the ones that are not tend to be much longer, which is what the picture above is showing." },
        { q: "Isn't this what an emergency fund is for?", a: "It is, up to a point. Savings are fast and flexible but finite; cover is slower to start and keeps going. Most plans use savings for the wait and cover for the length." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  rentbuy: {
    tour: [
      { find: [".calc-sides"], t: "Both sides, on the same terms",
        b: "Rent on the left, the purchase on the right. Everything else \u2014 tax, insurance, maintenance, selling costs \u2014 sits under the line that says so." },
      { find: [".rb-scrub"], t: "How long you would actually stay",
        b: "This is the single most important number here, and the one people skip. Every figure below the chart is measured at this year, and the chart stops here." },
      { find: [".rb-versus"], t: "What you would walk away with",
        b: "Not who pays less each month. The renter's invested deposit against the owner's equity after selling costs \u2014 that is the comparison that settles it." }
    ],
    ask: ["rRent", "bPrice", "bDown", "bRate", "rYears", "cLease", "cPrice", "cApr"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "Which one actually costs less",
      sub: "Over the years you'd really stay.",
      lead: "Buying is not automatically better, and renting is not throwing money away. It turns on how long you stay. On these figures, {#bnBig}.",
      steps: [
        { t: "The two paths", b: "Renting at {$rRent} a month, against buying at {$bPrice} with {$bDown} down at {$bRate}%." },
        { t: "Today's difference", b: "{#hdD} a month between them. That gap is not the answer — it is only the starting point." },
        { t: "Where it turns", b: "{#crossLead}" },
        { t: "Over your window", b: "Held for {$rYears} years, the two columns below show what each choice leaves you holding at the end. That comparison, not the monthly gap, is the answer." }
      ],
      qs: [
        { q: "Why isn't rent just wasted money?", a: "Because a lot of an owner's payment is not building anything either. Interest, property tax, insurance, maintenance and the cost of selling never come back. Only the principal portion and the appreciation do." },
        { q: "What does the money not spent on a deposit do?", a: "A renter who invests the deposit instead of handing it over is not standing still. The comparison assumes that money earns a return, which is why it matters what rate you set." },
        { q: "What is the break-even?", a: "The point where the running cost of owning finally catches up with the cost of renting plus the growth on the money you kept. Before it, renting is ahead; after it, buying is." },
        { q: "What gets left out?", a: "The things that do not fit in a spreadsheet: whether you can move for a job, whether you want to fix the roof yourself, and what a fixed payment feels like when rents rise." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  mortgage: {
    tour: [
      { find: [".calc-sides"], t: "The mortgage, and the policy",
        b: "The loan on the left; the cash value you would borrow against on the right." },
      { find: [".results"], t: "Two paths to nothing owed",
        b: "One line keeps paying as you are. The other applies the policy loan on day one." },
      { find: ["#fairBox"], t: "The honest version",
        b: "The headline saving is not free. This box takes off what the strategy actually costs \u2014 the repayments and the cash value that stopped working \u2014 and leaves the loan's own contribution." }
    ],
    ask: ["mBal", "mRate", "mTerm", "mPmt", "pCash", "pLoan"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "Paying it off sooner",
      sub: "What the policy loan changes, and what it costs.",
      lead: "Two ways to clear the same mortgage, side by side. The policy-loan route finishes {#hdD} sooner — but not for free.",
      steps: [
        { t: "Where you are", b: "{$mBal} still owing at {$mRate}%, with {$mTerm} to run and {$mPmt} going out each month." },
        { t: "The ordinary path", b: "Keep paying as you are and it is gone in {#hdA}." },
        { t: "With the policy loan", b: "Put {$pLoan} from the policy's cash value against the balance and it is gone in {#hdB} — {#hdD} sooner." },
        { t: "The honest version", b: "{#fairBody}" }
      ],
      qs: [
        { q: "Is the saving really free?", a: "No. The policy loan charges interest and the borrowed cash value stops working for you at its full rate. The headline saving of {#fairHeadline} is before that; the figure beside it is after." },
        { q: "What happens if I don't repay the policy loan?", a: "It keeps accruing interest against the policy and comes off what is eventually paid out. A loan that is never repaid can, in the worst case, put the policy itself at risk." },
        { q: "Would extra payments do the same thing?", a: "Often, yes, and with nothing borrowed. Put the extra-payment figure in and compare — if plain extra payments get close, they are the simpler answer." },
        { q: "Should I clear the mortgage at all?", a: "It depends on the rate. Clearing a {$mRate}% mortgage is a guaranteed {$mRate}% return, which is excellent against a low rate elsewhere and poor against a high one." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  debt: {
    tour: [
      { find: [".calc-sides"], t: "Balance, rate, payment",
        b: "Three numbers off your statement. The extra payment box is where the interesting part starts." },
      { find: [".results"], t: "Where each payment goes",
        b: "Every bar is one month, split into interest and the part that reaches the balance. Watch where the split flips." },
      { find: ["#cBox"], t: "Consolidation, run both ways",
        b: "The card as it stands against the loan including its fee, so the comparison is honest about what consolidating costs." }
    ],
    ask: ["dBal", "dApr", "dPmt", "dExtra"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "What the card really costs",
      sub: "Where each payment actually goes.",
      lead: "Most of an early payment goes to interest rather than to the balance. That is why the card feels stuck. At this pace it is clear in {#bnBig}.",
      steps: [
        { t: "Where you are", b: "{$dBal} at {$dApr}%, paying {$dPmt} a month." },
        { t: "How long", b: "{#statMonths} months at that pace, with {#statInterest} of interest paid along the way — on top of what you borrowed." },
        { t: "This month's payment", b: "Of the {$dPmt} you pay this month, {#statFirst} disappears into interest before any of it reaches the balance." },
        { t: "Adding a little", b: "Put anything into the extra-payment box and the finish line moves. Extra money skips the interest queue and lands straight on the balance." }
      ],
      qs: [
        { q: "Why does the balance barely move?", a: "Because interest is charged first. Until the payment is comfortably bigger than the monthly interest, most of it never reaches the balance at all." },
        { q: "Does a small extra payment really matter?", a: "More than it looks. Extra money skips the interest queue and goes straight at the balance, so it saves not only itself but every future month of interest it prevents." },
        { q: "Should I consolidate?", a: "Only if the new rate is genuinely lower after fees, and only if the card stays at zero afterwards. The panel below runs your numbers both ways." },
        { q: "What if I keep spending on it?", a: "New purchases join the balance and start earning interest immediately. A payoff plan and an open card are usually two plans fighting each other." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  taxes: {
    tour: [
      { find: [".calc-sides"], t: "One account, two tax rates",
        b: "The money you have, what you think you pay now, and what you think you will pay in retirement. That second guess is what the whole page turns on." },
      { find: [".results"], t: "The same money, three timings",
        b: "Pay tax now, pay it later, or pay it once and never again. Nothing about the investment changes \u2014 only when the tax is taken." },
      { find: [".tx-pickbox"], t: "Which one, and why",
        b: "There is no universally right answer. It depends on whether your rate in retirement is higher or lower than it is today." }
    ],
    ask: ["tMoney", "tAge", "tRet", "tNow", "tGrow", "tLater"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "Pay tax now, later, or never again",
      sub: "The same money, three timings.",
      lead: "It is not about avoiding tax. It is about choosing when you pay it — and on your numbers the gap between the best timing and the worst is {#bnBig}.",
      steps: [
        { t: "The money", b: "{$tMoney} today, growing at {$tGrow}% until you are {$tRet}." },
        { t: "Pay now", b: "Tax comes off at {$tNow}% before it ever gets invested, and the growth is taxed along the way too. You finish with {#nowEnd}." },
        { t: "Pay later", b: "Nothing is taken today, so the full amount grows — but the whole balance is taxed at {$tLater}% at the end. You keep {#laterEnd}." },
        { t: "Pay once", b: "Tax comes off today and nothing is owed afterwards. You keep {#freeEnd}." }
      ],
      qs: [
        { q: "Why does 'pay now' fall behind?", a: "Two bites, not one. The tax up front shrinks what gets invested, and then the growth is taxed each year as it happens. The smaller amount compounds at a slower net rate." },
        { q: "So is 'later' always best?", a: "Only if your rate in retirement is lower than it is today. You have set {$tNow}% now against {$tLater}% later — change the second one and watch the ranking move." },
        { q: "Nobody knows future tax rates. So what?", a: "Which is the argument for having money in more than one bucket. Then whatever rates do, you have a choice about which account to draw from — that flexibility is worth something on its own." },
        { q: "Is this a real account?", a: "These are tax treatments, not products. Which accounts give which treatment, and what they cost, is the next conversation." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  taximpact: {
    tour: [
      { find: [".ti-add"], t: "Add what you actually hold",
        b: "Each holding goes into one of three buckets by how it is taxed: now, later, or never again." },
      { find: [".results"], t: "Your mix, and where it lands",
        b: "Most people are heavily in one bucket without ever having chosen to be." },
      { find: [".ti-ask"], t: "The question underneath",
        b: "A dollar in each bucket is worth a different amount to you. That is why the mix matters as much as the total." }
    ],
    ask: ["tiNow", "tiLater"],
    keep: [".banner", ".calc", ".ti-add", ".results"],
    guide: {
      title: "Your mix, and what it costs",
      sub: "How much of your money is already promised to tax.",
      lead: "Most people end up heavily in one bucket without ever choosing to be — and which bucket decides how much of the money is really theirs.",
      steps: [
        { t: "What you hold", b: "Each holding you add is sorted by how it is taxed — now, later, or never again." },
        { t: "Today's picture", b: "{#stackNowTot} across the three buckets, and the bar shows how lopsided it is." },
        { t: "At the finish", b: "Projected forward it becomes {#stackEndTot} — but not all of that is yours." },
        { t: "The bite", b: "{#tiSum}" }
      ],
      qs: [
        { q: "Why does the mix matter if the total is the same?", a: "Because a dollar in each bucket is worth a different amount to you. A taxed-later dollar is worth whatever is left after your future rate; a taxed-never dollar is worth all of it." },
        { q: "What's a good mix?", a: "There is no single right answer, but being almost entirely in one bucket is a bet on future tax rates that most people never meant to make." },
        { q: "Why does the future rate change everything?", a: "It sets the size of the bill on the largest bucket. You have assumed {$tiLater}% — try it a few points higher and see how much of the ending balance moves." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  penalty: {
    tour: [
      { find: [".calc-sides"], t: "The withdrawal you are considering",
        b: "The account, your age, what it is for and how much. The reason matters \u2014 it is what decides whether a penalty applies at all." },
      { find: [".results"], t: "What actually reaches you",
        b: "Income tax first, then the penalty if one applies. What is left is the figure to compare against whatever you needed the money for." },
      { find: ["#avoidBox"], t: "Ways round the penalty",
        b: "The rules list specific exceptions, and they differ by account type. Each one here shows the dollars it would save on your figures." },
      { find: [".pn-gross"], t: "Working backwards",
        b: "If you need a set amount in hand, this finds what you would have to withdraw to end up with it." }
    ],
    ask: ["pAcct", "pAge", "pUse", "pAmt", "pRate"],
    keep: [".banner", ".calc", ".pn-warn", ".results"],
    guide: {
      title: "What the withdrawal really costs",
      sub: "Tax, penalty, and what is left in your hand.",
      lead: "The amount you ask for and the amount that reaches you are two different numbers. Here, {#bnBig} is what actually lands in your hand.",
      steps: [
        { t: "What you're taking", b: "{$pAmt} from a {$pAcct}, at age {$pAge}." },
        { t: "Income tax", b: "{#lnIncome} at your {$pRate}% rate, because the taxable part counts as income in the year you take it." },
        { t: "The penalty", b: "{#lnExtra}" },
        { t: "What reaches you", b: "{#lnKeep}. That is the figure to compare against whatever you were going to use it for." }
      ],
      qs: [
        { q: "Can the penalty be avoided?", a: "Sometimes. The rules list specific reasons — and they differ by account type. The panel below shows which ones apply to a {$pAcct}." },
        { q: "How much do I have to take out to end up with what I need?", a: "More than you think, because the extra you withdraw is taxed too. Put the amount you need in hand into the box below and it works the gross figure out for you." },
        { q: "Is the real cost just the tax and penalty?", a: "No. The money also stops growing. A withdrawal today is that amount plus every year of growth it would have made between now and retirement." },
        { q: "Is there a cheaper account to take it from?", a: "Often. The comparison further down prices the identical withdrawal against every account type, so you can see which one costs least." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  states: {
    tour: [
      { find: [".calc-sides"], t: "Your household, not a ranking",
        b: "Withdrawals, Social Security, the home and what you spend. A state's rank means nothing until it is applied to your numbers." },
      { find: [".results"], t: "Three taxes, not one",
        b: "Income, property and sales. A state with no income tax usually collects it in the other two \u2014 read both cards, not the total." },
      { find: [".sx-rankbox"], t: "All fifty-one, on your figures",
        b: "Every jurisdiction ranked by what it would actually cost you, with where you live marked." }
    ],
    ask: ["sIncome", "sSS", "sSpend", "sFrom", "sTo"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "What moving would change",
      sub: "Income, property and sales tax, side by side.",
      lead: "A state with no income tax is not automatically cheaper. It usually collects the same money somewhere else — in property tax, in sales tax, or both.",
      steps: [
        { t: "Your household", b: "{$sIncome} of withdrawals and pension, plus {$sSS} of Social Security." },
        { t: "Where you are", b: "{#nm_a} takes {#tot_a} a year, which is {#mon_a}." },
        { t: "Where you're thinking of", b: "{#nm_b} takes {#tot_b} a year." },
        { t: "The difference", b: "{#overOut}" }
      ],
      qs: [
        { q: "Why is the no-income-tax state not always cheaper?", a: "Because the money has to come from somewhere. States without an income tax usually lean harder on property tax, sales tax, or both — and those hit spending and housing rather than income." },
        { q: "Is Social Security taxed by states?", a: "Most do not tax it at all. A handful do, in part. The card for each state says which applies, because it can swing the comparison on its own." },
        { q: "What about retirement income specifically?", a: "Several states exempt part or all of pension and retirement-account withdrawals, sometimes with an age or income limit. Those exemptions are built into the figures on each card." },
        { q: "Should tax decide where I live?", a: "It is one line in a much longer list. Over {$sYears} years the difference adds up to a real number, but so does being near the people you actually want to see." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  college: {
    tour: [
      { find: [".calc"], t: "The four assumptions",
        b: "Today's cost, how many years, how fast college prices rise, and what your savings earn. These apply to every child below." },
      { find: [".cl-kids"], t: "One panel per child",
        b: "Add as many as you have. Each carries its own age, start age, savings and monthly amount." },
      { find: [".results"], t: "The whole family, on one timeline",
        b: "Not one child at a time. The years where two are in college at once are marked, because that is where it hurts." }
    ],
    ask: ["aCost", "aYears"],
    keep: [".banner", ".calc", ".cl-kids", ".results"],
    guide: {
      title: "What college will cost your family",
      sub: "Every child, on one timeline.",
      lead: "Not one child at a time — the whole family, including the years when two of them are in college at once.",
      steps: [
        { t: "Today's price", b: "{$aCost} a year, for {$aYears} years of college." },
        { t: "Tomorrow's price", b: "College costs rise faster than most things, so by the time each child arrives the bill is bigger. Added up across the family, that is {#totCost}." },
        { t: "What you're on track for", b: "What you have saved plus what you add along the way grows to {#totSav}." },
        { t: "The gap", b: "{#totGap}, which needs {#totNeed} a month between now and then to close." }
      ],
      qs: [
        { q: "Why is the future number so much bigger?", a: "Because the price compounds too. A cost rising a few percent a year roughly doubles over a young child's childhood, so the bill you plan for is not the bill on today's website." },
        { q: "What about the overlap years?", a: "Those are the hard ones — two children in college at once means two bills in the same twelve months. The timeline under the answer marks the peak year for exactly that reason." },
        { q: "Do I have to cover all of it?", a: "Very few families do. Scholarships, grants, work and loans all sit between the number here and what you actually write a cheque for. This is the whole bill, not your share of it." },
        { q: "Is saving more the only answer?", a: "No. Starting earlier, choosing differently, and spreading the cost across more years all move the same number. The monthly figure is simply the cost of doing nothing else." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  future: {
    tour: [
      { find: [".calc"], t: "The same money, three homes",
        b: "One contribution, one timeline. What changes is where it goes." },
      { find: [".ft-assump"], t: "Where the illustration goes",
        b: "The four cash values and death benefits from a carrier illustration belong here. Everything else on the page is a projection; these are the only figures that come from a document." },
      { find: [".results"], t: "At eighteen",
        b: "The bank, the plan and the policy side by side \u2014 and, further down, what each does if life turns out differently." }
    ],
    ask: ["fAge", "fLump", "fMonthly", "fUntil"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "Three homes for the same money",
      sub: "What each one looks like at 18.",
      lead: "Identical contributions, three different places to put them. At 18 the range across the three is {#bnBig}.",
      steps: [
        { t: "The money", b: "{$fLump} to start and {$fMonthly} a month, from age {$fAge} until {$fUntil}." },
        { t: "In the bank", b: "{#bankBig}. Safe, reachable, and quietly losing ground to inflation." },
        { t: "In an investment plan", b: "{#planBig}. More growth, more movement, and a tax bill if the money is not used for school." },
        { t: "In a policy", b: "{#mdbBig} of cash value — and a death benefit from day one, which the other two do not have." }
      ],
      qs: [
        { q: "Which one is best?", a: "It depends on what the money is for. If it is certainly for college, the plan built for that is hard to beat. If it might be for anything, the flexible option matters more than the highest projection." },
        { q: "Why does the policy show a smaller number?", a: "Because part of every payment buys the death benefit rather than building cash value. What you get for that is protection that exists from the first month, not just at the end." },
        { q: "What if they don't go to college?", a: "That is the question the comparison is really about. The panel below runs the same money through the situations life actually produces — and the answers differ sharply by option." },
        { q: "Are these figures guaranteed?", a: "No. The bank rate can change, the investment return is an assumption, and the policy values come from an illustration. Only the guaranteed columns of an illustration are promises." }
      ]
    }
  },

  /* ------- the three adviser tools: a guide, but nothing to hide ------- */
  carriers: {
    tour: [
      { find: ["#pathGrid", ".match-layout"], t: "The case in front of you",
        b: "Age, state and amount. Change the state and partners drop off \u2014 availability and filings are state by state." },
      { find: [".results"], t: "A starting list, not a decision",
        b: "Appetite matching only. Nothing here has seen a medical record, an APS or a financial justification." },
      { find: ["#captureBlock"], t: "Get these on the first call",
        b: "The items to have in hand before quoting. Chasing them later is what stalls a case two weeks in." }
    ],
    guide: {
      cta: "How this works",
      title: "How the shortlist is made",
      sub: "For you, not the client — what the screen is doing.",
      lead: "This is appetite matching, not underwriting. It compares the case in front of you against what each partner has said they will look at, and sorts them into three piles.",
      steps: [
        { t: "The case", b: "A {$cAge}-year-old in {$cState} at {$cAmount}. Change any of the three and the piles resort as you watch." },
        { t: "Worth a call", b: "{#navCount} partners whose stated appetite fits this case. It is a starting list, not a decision — underwriting still decides." },
        { t: "Capture before you quote", b: "{#captureCount} things to have in hand first. Getting them on the first call is what stops a case stalling two weeks in." },
        { t: "On a different path", b: "{#offCount} partners this case does not suit on the information given. Knowing why is often more useful than the shortlist." }
      ],
      qs: [
        { q: "Can I show this to a client?", a: "It is built for your side of the desk. The language is appetite and process, not benefit — a client reading it would take a shortlist for an offer." },
        { q: "Why does a partner drop off when I change the state?", a: "Because product availability, filings and rate class definitions are state by state. A partner that is ideal in one state may not be admitted in the next one." },
        { q: "Is a shortlist a pre-approval?", a: "No. Nothing here has seen a medical record, an APS or a financial justification. It narrows where to spend the first call; every decision after that belongs to underwriting." },
        { q: "What if nothing fits?", a: "Usually it means one input is doing all the work — the amount, or something in the existing coverage. Loosen the one you are least sure about and see what comes back." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  send: {
    tour: [
      { find: [".calc-sides"], t: "Who it goes to",
        b: "Their name and email fill the invitation, so it arrives looking like it came from you." },
      { find: [".sd-topics"], t: "What you ask about",
        b: "Fewer topics means a shorter assessment and a better chance it gets finished. Three minutes is the target." },
      { find: [".results"], t: "How they open it",
        b: "The link, the QR code and the calendar file all point at the same assessment \u2014 use whichever suits how you are talking to them." }
    ],
    guide: {
      cta: "How this works",
      title: "Sending an assessment",
      sub: "What the client gets, and what comes back to you.",
      lead: "You are sending a link, not a form. The client answers on their own phone, in their own time, and what they say lands on your desk before the meeting.",
      steps: [
        { t: "Who it goes to", b: "Their name and email fill the invitation, so it arrives looking like it came from you rather than from a system." },
        { t: "What you ask about", b: "Pick the topics. Fewer topics means a shorter assessment and a higher chance it gets finished — three minutes is the target, not ten." },
        { t: "How they open it", b: "{#outTitle} — the link, the QR code and the calendar file all point at the same assessment, so use whichever suits how you are talking to them." },
        { t: "What comes back", b: "Their answers arrive on the Desk, with the slow and reworked ones flagged. Those hesitations are usually the conversation worth having." }
      ],
      qs: [
        { q: "Do they need an account?", a: "No. The link opens the assessment straight away. Nothing is asked of them beyond the questions themselves." },
        { q: "How long should I leave it before the meeting?", a: "Long enough that they answer calmly and recently enough that it is fresh — a few days ahead tends to beat a fortnight." },
        { q: "What if they don't finish it?", a: "A partly finished assessment still tells you where they stopped, which is information. Ask about that section first." },
        { q: "Can I put my own branding on it?", a: "Yes — the brand sheet sets your name, firm, contact details, licence number and colour, and it carries through to what the client sees." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  desk: {
    tour: [
      { find: ["#rosterBox"], t: "Who has answered",
        b: "Everyone who has finished an assessment, newest first. Open one to prepare for that meeting." },
      { find: [".dk-three"], t: "Three things before you speak",
        b: "Not a report to read out. Who they are, one line in their own words, and the single move worth getting to." },
      { find: [".dk-hesitate"], t: "Where they hesitated",
        b: "The answers they were slowest on, or went back and changed. That is where they are least sure, and where the real conversation is." }
    ],
    guide: {
      cta: "How to read this sheet",
      title: "Before you sit down",
      sub: "Reading the assessment in the five minutes you have.",
      lead: "This is not a report to read out. It is three things to know before you open your mouth, and one thing to do about them.",
      steps: [
        { t: "Who you are seeing", b: "The top of the sheet is who the meeting is with and when, carried over from the assessment they filled in." },
        { t: "In their own words", b: "One line they wrote themselves. Read it before any figure — it sets the tone of the meeting better than a number can." },
        { t: "The one move", b: "A single priority, picked from what they actually said rather than from what you sell most of." },
        { t: "On this sheet", b: "{#leverTitle} — {#leverBody}" },
        { t: "Where they hesitated", b: "The answers they were slowest on, or went back and changed, are folded below. Those are the places they are least sure, which is usually where the real conversation is." }
      ],
      qs: [
        { q: "Should I lead with the one move?", a: "Rarely. It is where the conversation should end up, not where it should start. Lead with what they told you, then let them arrive at it." },
        { q: "What does a hesitation actually mean?", a: "It means they were not certain, not that they were wrong. Treat it as an invitation to ask rather than a gap to correct." },
        { q: "How much of this do I show them?", a: "The facts and their own words travel well. The prioritisation is for you — a client seeing themselves sorted and ranked tends to get defensive." },
        { q: "What if the assessment is thin?", a: "Then the meeting is the assessment. Open with the topic they skipped; skipping is itself an answer." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  family: {
    tour: [
      { find: [".fb-terms"], t: "Three goals, three dates",
        b: "A near one, a middle one and a far one. Name them, price them, and say which year you want each by." },
      { find: [".fb-shared"], t: "One habit pays for all three",
        b: "A single monthly amount and a growth assumption. That is the entire engine." },
      { find: [".fb-cards"], t: "Each goal, measured",
        b: "Every card compares its goal against what the account is worth in that year." },
      { find: [".fb-real"], t: "But it is one account",
        b: "The cards each measure against the same untouched balance. This panel spends each goal in the year it arrives, so the last one is measured against what is really left. That is usually a different story." }
    ],
    ask: ["g_s", "a_s", "y_s", "g_m", "a_m", "y_m", "g_l", "a_l", "y_l", "fMonthly", "fRate"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "Your goals on one timeline",
      sub: "What one steady habit reaches, and when.",
      lead: "Your goals do not all happen at retirement. This puts the near ones and the far ones on the same line so you can see them together.",
      steps: [
        { t: "The habit", b: "{$fMonthly} a month, growing at {$fRate}% a year, compounded monthly. That is the only engine here." },
        { t: "The near goal", b: "{$g_s} needs {$a_s} by year {$y_s}. By then the account is worth what the first card shows." },
        { t: "The far goal", b: "{$g_l} needs {$a_l} by year {$y_l}. By then you will have set aside {#stripPut} of your own money and the balance is at {#stripEnd}." },
        { t: "The catch", b: "Each card measures its goal against the same untouched balance. Spend the earlier goals as they arrive and the last one is measured against what is left — the panel below does that second sum." }
      ],
      qs: [
        { q: "Why is the accumulated value so much bigger than what I put in?", a: "Because every dollar you set aside keeps earning for the rest of the timeline. Of the {#stripEnd} at the end, {#stripPut} is yours and the rest is what those dollars earned while they sat there." },
        { q: "Can one account really cover all three goals?", a: "That is exactly the question the panel below answers. On its own each goal may look covered; taken in order, with the money actually spent, the picture is often different." },
        { q: "What does SAVE → BUILD → ACCESS → REPAY mean?", a: "It is the idea behind a family bank: you build the balance, borrow against it when a goal arrives rather than emptying it, and repay yourself so it keeps compounding. Whether that is available to you depends on what the money is held in." },
        { q: "Is the growth rate realistic?", a: "It is whatever you set, held perfectly steady, which nothing real does. Try it two points lower than {$fRate}% — if the plan still works there, it is a plan rather than a hope." }
      ]
    }
  },

  /* ---------------------------------------------------------- */
  plan529: {
    tour: [
      { find: [".calc-sides"], t: "The child, and the money",
        b: "How old they are, when the money is needed, what goes in. The right-hand side is only there to price the comparison and the bill." },
      { find: [".pl-stats"], t: "What it becomes",
        b: "What you put in, what the growth added, and what share of a four-year degree that covers at the prices you set." },
      { find: [".pl-edge"], t: "What the tax break is worth",
        b: "The point of a 529 is not that it grows faster \u2014 it is that the growth is not taxed on the way. This is that difference, in dollars." },
      { find: [".pl-ladder"], t: "What other amounts reach",
        b: "Tap any rung to load it into the calculator above." }
    ],
    ask: ["pAge", "pStart", "pLump", "pMonthly", "pRet"],
    keep: [".banner", ".calc", ".results"],
    guide: {
      title: "What the 529 is worth",
      sub: "Against the same money in an ordinary account.",
      lead: "The point of a 529 is not that it grows faster. It is that the growth is not taxed along the way. On your numbers it reaches {#bnBig}.",
      steps: [
        { t: "What you put in", b: "{$pLump} to start, then {$pMonthly} a month until they are {$pStart} — {#statPut} of your own money." },
        { t: "What it becomes", b: "{#statPlan}, of which {#statGrow} is growth you did not have to pay in." },
        { t: "What the tax break is worth", b: "{#edgeBig}. The identical money in an ordinary taxable account reaches {#edgeTaxed}, because the growth is taxed each year." },
        { t: "Against the bill", b: "It covers {#statCovers} of a four-year degree at the prices you set." }
      ],
      qs: [
        { q: "What happens if it isn't used for school?", a: "The growth becomes taxable and usually carries a 10% penalty on top. What you contributed always comes back to you. This is the one real catch, and it is why the flexible alternatives exist." },
        { q: "Does my state give anything?", a: "Many do — a deduction or credit on what you contribute each year. Over your timeline that is worth {#dedBig}, but it varies a great deal and some states only give it on their own plan." },
        { q: "Is a 529 the only option?", a: "No, and covering all of it is not the goal for most families. It is one piece beside savings, scholarships and what the student contributes." },
        { q: "Can the money move to another child?", a: "Usually yes — the beneficiary can generally be changed to another family member without losing the tax treatment. That flexibility is worth knowing about before you worry about over-saving." }
      ]
    }
  }
};
