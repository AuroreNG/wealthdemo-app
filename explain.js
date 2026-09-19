/* ============================================================
   WEALTHDEMO — the explain layer

   One glossary, shared by every tool. Two levels:

     plain  — what it actually is, for a client who has never
              heard the term before
     say    — the sentence an agent can read out loud, shown
              only in Agent mode

   Any element carrying data-term="roth" becomes tappable.
   The Explain switch turns on a plain-English line under the
   things on screen, so the page stays clean until it's wanted.
   ============================================================ */
window.WD = window.WD || {};

(function () {
  const GLOSSARY = {
    /* ---------- lending, for the readiness scorecards ---------- */
    requiredpot: {
      term: "What the plan needs",
      plain: "The pot that would produce the income they are short of, drawn at the rate they have set, in the money of the year they retire. It is not a target somebody chose \u2014 it falls out of the spending, the social security and the drawdown rate together.",
      say: "This isn't a number I picked. It's what your own spending, minus your own social security, drawn at your own rate, adds up to."
    },
    readiness: {
      term: "Readiness score",
      plain: "Four things a lender looks at, weighted the way a lender weights them: your credit, how much of your income is already spoken for, how much you are putting down, and how long you have been in the job. Out of 100.",
      say: "This isn't my opinion of the file. It's the four things an underwriter actually checks, scored the way they weight them."
    },
    creditband: {
      term: "Credit band",
      plain: "Lenders do not price every score separately \u2014 they price in bands, and the big steps are at 620, 680 and 740. Moving from 739 to 740 can be worth more than moving from 700 to 739, because one crosses a line and the other does not.",
      say: "It's the band that matters, not the number. You're one band under the good one."
    },
    backratio: {
      term: "Debt-to-income",
      plain: "Every monthly payment you owe \u2014 the new mortgage plus car loans, cards and student loans \u2014 added up and divided by what you earn before tax. It is the single number most likely to decide whether a file is approved.",
      say: "Everything you owe each month, against everything you earn each month. This is the one that gets files declined."
    },
    dticeiling: {
      term: "The 43% ceiling",
      plain: "Most lenders stop at 43% debt-to-income, and the better rates stop earlier than that, around 36%. Past 43% it is usually not a negotiation \u2014 the file does not pass.",
      say: "43% is where most lenders stop. 36% is where the good rates stop."
    },
    downpayment: {
      term: "Deposit / down payment",
      plain: "The part of the price you pay yourself rather than borrow. Below 20% the lender adds insurance to the payment to cover itself; at 20% that goes away.",
      say: "Under twenty per cent, the lender adds insurance on top. At twenty, it disappears."
    },
    mortgageins: {
      term: "Mortgage insurance",
      plain: "An extra monthly charge when the deposit is under 20%. It protects the lender, not you. You may ask for it to come off once the balance reaches 80% of the value, and it comes off on its own at 78% \u2014 but only if somebody asks, or waits.",
      say: "This one protects them, not you. Ask for it to come off the moment you're at eighty per cent \u2014 nobody will remind you."
    },
    jobhistory: {
      term: "Time in the job",
      plain: "Two years in the same line of work is what a lender wants to see. It does not have to be the same employer \u2014 moving jobs inside the same field usually counts, and changing field usually resets it.",
      say: "Two years in the same line of work. Changing employers is fine; changing careers isn't."
    },
    preapproval: {
      term: "Pre-approval",
      plain: "Three different things get called this. A prequalification is a phone call and worth little. A pre-approval means documents were checked. Fully underwritten means a human has already said yes, subject only to the property \u2014 and that is the one that wins a competitive offer.",
      say: "There are three kinds, and only one of them wins you a house you're bidding on."
    },
    borrowingpower: {
      term: "Borrowing power",
      plain: "The most a lender would lend on this income once every other monthly payment is counted. Clearing a debt does not just save you its payment \u2014 it raises this by roughly the whole loan that payment could have supported.",
      say: "Clearing a payment doesn't save you that payment. It gives you back everything that payment could have borrowed."
    },

    qualified: {
      term: "Qualified / tax-deferred",
      plain: "Money you put in before tax was taken out. You got the break up front, so the IRS taxes it on the way out — and before 59½ they usually add another 10% on top.",
      say: "You haven't paid tax on this money yet. Every dollar you take out counts as income this year."
    },
    roth: {
      term: "Roth",
      plain: "Money you have already paid tax on. It grows without tax, and once the rules are met it comes out without tax too.",
      say: "This one's already been taxed. What comes out is yours."
    },
    nonqualified: {
      term: "Non-qualified / after-tax",
      plain: "An ordinary brokerage or savings account. You only owe tax on the growth, not on the money you originally put in.",
      say: "You only pay on the gain here, not on the whole withdrawal."
    },
    iul: {
      term: "IUL cash value",
      plain: "A life insurance policy that builds a cash value you can borrow against or withdraw from. It is insurance first — how the cash value behaves depends on the contract.",
      say: "This is insurance with a savings component. Access depends on the policy, not on the IRS."
    },
    rmd: {
      term: "Required minimum distribution",
      plain: "From a set age the IRS makes you take money out of tax-deferred accounts every year and pay tax on it, whether you need the money or not.",
      say: "At 73 the government starts making the withdrawal decision for you."
    },
    excise: {
      term: "Excise tax on a missed RMD",
      plain: "The penalty for not taking a required distribution — 25% of what you should have taken, reduced to 10% if it's corrected inside the correction window.",
      say: "Miss one of these and the penalty is a quarter of the amount you skipped."
    },
    early: {
      term: "The 59½ rule",
      plain: "Take money out of a retirement account before age 59½ and there is usually an extra 10% tax on top of the income tax. A handful of exceptions exist.",
      say: "Before 59½ there's a 10% surcharge on top of the tax — that's the cost of being early."
    },
    capitalgain: {
      term: "Capital-gain tax",
      plain: "Tax on the growth in an investment you sell. For investments held long enough it is usually charged at a lower rate than income tax.",
      say: "You're only taxed on what it grew by, and usually at a friendlier rate."
    },
    fiveyear: {
      term: "The five-year rule",
      plain: "A Roth account generally has to have been open five years before the earnings can come out tax-free — separate from the age test.",
      say: "The clock matters here as much as your age."
    },
    provisional: {
      term: "Provisional income",
      plain: "A figure the IRS uses for one purpose only: deciding how much of your Social Security is taxable. It is your other income, plus tax-free interest, plus half your benefit.",
      say: "This isn't your tax bill — it's the yardstick that decides how much of your Social Security gets taxed."
    },
    sequence: {
      term: "Sequence of returns",
      plain: "The order your investment returns arrive in. Two accounts can average exactly the same return and run out years apart, because a loss early — while you're also withdrawing — does far more damage than the same loss later.",
      say: "It isn't just what you average. Losing money in the first few years of retirement is what really shortens a plan."
    },
    bridge: {
      term: "The bridge years",
      plain: "The gap between the day you stop working and the day Social Security starts. Everything in that window comes out of savings, with nothing coming in to offset it.",
      say: "These are the years your savings carry the whole load on their own."
    },
    timevalue: {
      term: "Why starting early matters",
      plain: "Money you put in early gets counted into every year of growth that follows, so the first dollars do most of the work. Money you add later never gets those years back, however much of it you add.",
      say: "The early money is doing the heavy lifting. Everything you add later is just topping it up."
    },
    asymmetry: {
      term: "Why the climb back is steeper",
      plain: "A fall and the recovery are measured against different numbers. Falling 30% is 30% of what you had. Climbing back is measured against what is left, which is smaller — so the same dollars are a much bigger percentage.",
      say: "The fall is measured on the big number. The climb back is measured on the small one. That's the whole trick."
    },
    dimecheck: {
      term: "Why DIME can be off",
      plain: "DIME multiplies your income by the years you want covered and stops there — as if the money sat in a drawer. In real life a lump sum is invested and earns something, while the cost of living keeps rising. Whichever of those two is stronger decides if DIME asks for too much or too little.",
      say: "DIME is a good first pass. It just assumes the money earns nothing and prices never move — so let's check it both ways."
    },
    inherited: {
      term: "An inherited 401(k) or IRA",
      plain: "Money in these accounts has never been taxed. Whoever inherits it pays income tax as they take it out, and most people who aren't a spouse have to empty the account within about ten years. So the balance on the statement is not the amount that reaches them.",
      say: "That balance has a bill attached. The statement says four hundred thousand; the children see what's left after tax."
    },
    settling: {
      term: "The cost of settling an estate",
      plain: "Court fees, legal and executor costs, appraisals and filings, charged against what goes through probate. How much depends heavily on the state and on how things are held. Anything with a named beneficiary — life insurance, most retirement accounts — usually skips it and goes straight to the person.",
      say: "Anything with a name on it goes straight to that person. Everything else has to go through the process, and the process charges for itself."
    },
    essentialbills: {
      term: "Essential monthly bills",
      plain: "The non-discretionary ones — housing, food, utilities, insurance, transportation, childcare, minimum debt payments. Leave out travel, dining out and anything you would cut in week one. That exclusion is what makes the figure a real obligation rather than a lifestyle number.",
      say: "Not what you spend. What you'd still be obligated to pay if everything else stopped."
    },
    continuing: {
      term: "Income that would still continue",
      plain: "Any income not tied to the insured — a spouse's earnings, rental income, a pension, a trust distribution. It offsets the obligation dollar for dollar, so it belongs in the calculation rather than being left at zero.",
      say: "What keeps coming in on its own? That's the part we don't have to replace."
    },
    emergencyfund: {
      term: "Emergency fund",
      plain: "Liquid reserves you could access within days without a penalty: cash, savings, money market. Not qualified retirement money you would be taxed and penalised on, not home equity, not anything that has to be sold first. Liquidity is the test, not balance.",
      say: "What could you get your hands on this week without losing a chunk of it on the way out?"
    },
    livingbenefit: {
      term: "Living benefit / income protection",
      plain: "A provision that lets you draw on a policy while you're alive rather than at death — often an accelerated death benefit on a life policy, sometimes a standalone disability or critical illness contract. Availability, what qualifies, the payout and its effect on the death benefit are all set by the carrier and the contract.",
      say: "Same policy. This is the part that can pay out while you're still here to use it."
    },
    qualifying: {
      term: "Qualifying event",
      plain: "The condition the contract requires before it pays anything — commonly a critical, chronic or terminal illness, or a disability that meets the policy's own definition. Definitions vary widely between carriers, and a diagnosis that triggers one contract may not trigger another. This is a paperwork question, not a maths question.",
      say: "The number only matters if the event qualifies. That's a conversation about the contract, not the calculator."
    },
    elimination: {
      term: "Elimination period",
      plain: "The waiting time after a qualifying event before any benefit is payable — typically 30, 60, 90 or 180 days. Nothing is paid during it, so the emergency fund carries the whole obligation alone. A longer elimination period usually lowers the premium, which is a fair trade only if the reserves can actually bridge it.",
      say: "Benefits don't start on day one. Whatever the elimination period is, that's the stretch your fund has to bridge by itself."
    },
    monthsgoal: {
      term: "Months you want protected",
      plain: "Your own target, not an industry rule. Three to six months is the common reserve guideline for job loss. For a disabling illness people usually want twelve or more, because returning to full earnings takes longer than finding a new job.",
      say: "How long would you want to not think about money while you deal with everything else?"
    },
    totalres: {
      term: "Total resources available",
      plain: "The emergency fund plus the illustrated benefit — every dollar that could go toward essential bills. It is a gross figure: it ignores tax treatment, any effect on the death benefit, and whether the claim would be approved at all.",
      say: "That's everything available on paper. Whether it all arrives, and when, is the next conversation."
    },
    illustrated: {
      term: "Illustrated at 6% and 8%",
      plain: "Two hypothetical growth assumptions shown side by side so you can see how much the outcome moves. They are not a projection, not an offer and not tied to any specific product. Actual returns vary, and this ignores taxes and fees.",
      say: "Two assumptions, not a prediction. The point is the range, not the number."
    },
    waitperiod: {
      term: "The months before anything is paid",
      plain: "Almost every income policy waits before it pays a cent — often 30, 60 or 90 days, sometimes longer. Your savings have to carry the whole bill on their own until then. A longer wait usually means a cheaper policy, which is fine as long as the savings are actually there to cover it.",
      say: "The policy doesn't start on day one. Whatever the wait is, that's the part your savings have to cover by themselves."
    },
    opportunity: {
      term: "Return on money not used to buy",
      plain: "The down payment and closing costs are not free just because you would spend them either way. A renter who does not hand that money over can invest it instead, and whatever it earns is a real part of the renting side. This assumption is usually the single biggest lever in the whole comparison.",
      say: "The down payment isn't gone — it's just somewhere else. The question is which place grows it faster."
    },
    carrying: {
      term: "Carrying costs",
      plain: "Everything a buyer pays that a renter does not: property tax, homeowner's insurance, HOA dues, and maintenance. None of it builds equity — it is the cost of holding the asset. On most homes it runs 1.5% to 3% of the purchase price every year, which is often larger than people expect.",
      say: "Principal and interest is the number people compare. Taxes, insurance and upkeep are the number that decides it."
    },
    closingcosts: {
      term: "Closing costs",
      plain: "One-time costs to complete the purchase — lender fees, title, escrow, appraisal, recording, prepaid items. Commonly 2% to 5% of the price. They buy you nothing you can sell later, so in a break-even calculation they behave like the down payment: money the renter still has and the buyer does not.",
      say: "These don't come back when you sell. They're the entry fee."
    },
    appreciation: {
      term: "Appreciation assumption",
      plain: "How fast the property is assumed to gain value each year. It is an assumption, not a forecast — long-run US housing has tracked somewhere near inflation, with long flat stretches and sharp local swings. Because it compounds on the whole purchase price rather than on your equity, small changes here move the answer more than almost anything else.",
      say: "Move this one number by a point and the whole comparison can flip. That's worth knowing before we lean on it."
    },
    depreciation: {
      term: "Depreciation assumption",
      plain: "How fast the vehicle is assumed to lose value. New cars commonly shed 15% to 25% in the first year and settle around 10% to 15% a year after that. Unlike a home, the asset side of buying shrinks over time, which is why the comparison usually turns on total cash rather than on what you own at the end.",
      say: "A house is assumed to go up. A car is going down. That changes which side of this the asset sits on."
    },
    sellingcost: {
      term: "Selling cost",
      plain: "What comes out of the sale price when you exit — agent commission, transfer taxes, title and closing fees, and any repairs demanded. Typically 6% to 8% of the sale price. It is charged on the full value, not on your equity, so it is a real drag on any short holding period.",
      say: "You don't get the sale price. You get the sale price less the cost of selling, and that's charged on the whole number."
    },
    taxbenefit: {
      term: "Estimated tax savings",
      plain: "Mortgage interest and property tax can be deductible, but only for those who itemise, only above the standard deduction, and only up to the current caps. Many buyers see no benefit at all. Leave it at zero unless you have a real figure for this specific household — an invented number here quietly tilts the whole comparison.",
      say: "This one only counts if you itemise, and most people don't. I'd rather leave it at zero than guess in our own favour."
    },
    breakeven: {
      term: "The break-even point",
      plain: "The year buying finally pulls ahead of renting and investing the difference. Before it, the buyer is behind because of the entry costs and the interest-heavy early payments. After it, the buyer is ahead because equity keeps building while rent keeps rising. If the break-even never arrives inside the period shown, that is the answer, not a gap in the calculation.",
      say: "There's usually a year where buying pulls ahead. The real question is whether you'll still be in the place when it arrives."
    },
    position: {
      term: "Estimated financial position",
      plain: "What each path leaves you holding at the end: for the renter, the invested portfolio; for the buyer, the property's value less selling costs and less whatever is still owed. It is a net-worth comparison, not a cash comparison, which is why the cheaper monthly payment does not always win.",
      say: "Not what it costs. What you'd be holding at the end. Those are two different questions."
    },
    leaseupfront: {
      term: "Lease down payment and fees",
      plain: "Cash handed over at signing — the capitalised cost reduction, acquisition fee, disposition fee, doc fees. It buys no equity at all, and unlike a down payment on a purchase you never see it again. It also repeats: every time the lease ends and a new one starts, the whole amount is due again.",
      say: "This part doesn't come back. And it comes around again every time you re-sign."
    },
    mileage: {
      term: "Excess mileage",
      plain: "Leases set an annual mileage allowance, commonly 10,000 to 15,000 miles. Every mile over it is billed at the end, typically 15 to 30 cents. Someone driving 5,000 miles a year over the cap on a three-year lease is looking at a four-figure bill they did not plan for.",
      say: "How many miles do you actually drive? That's a real number on this contract, not a formality."
    },
    rolledin: {
      term: "Tax and fees rolled into the loan",
      plain: "Sales tax and registration are usually financed rather than paid at the counter, which means you borrow them and pay interest on them for the whole term. It keeps the cash due at signing low and quietly raises both the payment and the total cost.",
      say: "These get financed, so you're paying interest on the tax. It's small per month and not small over five years."
    },
    resale: {
      term: "Estimated resale value",
      plain: "What the vehicle would fetch when you sell it. Most cars lose roughly half their value in the first five years, then slow to around 10-15% a year. This figure is the entire asset side of buying, so a generous guess here flatters the purchase — check it against real listings for the same model and year.",
      say: "This one number is the whole case for owning. Worth getting it from the market rather than from hope."
    },
    policyloan: {
      term: "A policy loan",
      plain: "Borrowing against the cash value of a permanent life policy. The insurer lends you their money and holds your cash value as collateral, charging a loan rate. Nothing is underwritten and there is no repayment schedule — but interest accrues whether or not you pay it, and anything still owed at death comes off the death benefit.",
      say: "You're not withdrawing your money. You're borrowing the carrier's, with yours as security — and the interest runs whether you pay it or not."
    },
    crediting: {
      term: "Crediting on loaned cash value",
      plain: "The rate the carrier credits to cash value that is out on loan. Some contracts keep crediting the full rate — that is what makes a policy loan attractive. Many credit loaned value at a lower rate, or at the loan rate itself, which quietly removes most of the advantage. It is a contract term, not a market question, so the illustration has to be read rather than assumed.",
      say: "Ask one question about the loan: while my money is out on loan, is it still being credited the same as the rest? The answer changes the whole picture."
    },
    apr: {
      term: "APR",
      plain: "The yearly rate the card charges. Card issuers divide it by twelve to get a monthly rate and apply that to whatever is left owing, so the interest falls only as the balance does. It is quoted per year but charged every month.",
      say: "The rate is annual, but it's charged monthly on whatever's still sitting there."
    },
    extrapayment: {
      term: "Extra monthly payment",
      plain: "Anything above the payment already being made. It goes straight against the balance rather than the interest, so it removes that amount from every future month's interest calculation as well. That is why a small, steady increase does more than it looks like it should.",
      say: "Every extra dollar comes off the balance, so it also cancels the interest that dollar would have been charged for the rest of the term."
    },
    firstpmt: {
      term: "First payment interest",
      plain: "The share of the very first payment that is swallowed by interest rather than reducing what is owed. On a high-rate card it is often more than half, which is why a balance can feel like it barely moves at the start.",
      say: "More than half of that first payment never touches the balance — it just pays for the privilege of carrying it."
    },
    origination: {
      term: "Origination fee",
      plain: "A charge for setting up the loan, usually a percentage of the amount borrowed, and usually added to the balance rather than paid separately. It means the loan starts larger than the debt it is replacing, and the interest is charged on that larger figure.",
      say: "The fee is rolled in, so you borrow more than you owe and pay interest on the difference too."
    },
    taxbracket: {
      term: "Your tax rate today",
      plain: "The rate that would apply to this money if you paid tax on it now. It is not the rate on everything you earn — only on the next dollars, which is what matters when you are deciding whether to pay tax on an amount this year or a later one.",
      say: "This is the rate on the next dollar, not the average across everything you earn."
    },
    growthrate: {
      term: "An assumed growth rate",
      plain: "A single rate stood in for every year, because a calculator needs one number. Real returns never arrive that evenly \u2014 they come in a jagged order, and the order itself changes the answer. Use a rate you would be comfortable defending out loud, then look at what happens a couple of points either side of it.",
      say: "One steady rate is a way to compare choices, not a forecast. Try it two points lower and see what still holds."
    },
    costrise: {
      term: "The yearly rise in college costs",
      plain: "College has gone up faster than ordinary prices for most of the last forty years \u2014 an average of about 3.9% a year since 2010. It matters more than the growth rate on your savings, because it applies to the whole bill while your growth only applies to what you have actually put away.",
      say: "The price is moving too. That's why starting earlier does more than saving harder later."
    },
    taxdrag: {
      term: "Tax drag",
      plain: "Tax taken out of the growth each year rather than at the end. Because the money that leaves is money that would otherwise have kept compounding, the effect builds on itself: a 6% return taxed at 22% every year behaves like a 4.68% return, and over decades that gap is the whole difference.",
      say: "Paying tax on the growth each year doesn't just cost you the tax — it costs you everything that tax would have earned."
    },
    lapse: {
      term: "Lapse risk on a loaned policy",
      plain: "If unpaid loan interest keeps compounding, the loan can grow until it exceeds the cash value. At that point the policy lapses — the cover ends, and the forgiven loan can become a taxable event in the year it happens. The larger the loan is as a share of cash value, the less room there is for a bad year.",
      say: "The number to watch isn't the loan. It's the loan as a share of the cash value, and whether it's still climbing."
    },
    principalfirst: {
      term: "Why a lump sum on principal does so much",
      plain: "Early mortgage payments are almost all interest. A dollar put straight against principal removes that dollar from every future interest calculation, so it saves far more than a dollar. The same dollar applied in year twenty saves almost nothing, because there is barely any interest left to remove.",
      say: "A dollar on the principal today doesn't save you a dollar. It saves you every dollar of interest that was going to be charged on it for the next twenty years."
    },
    fairtest: {
      term: "The fair comparison",
      plain: "A strategy that adds money to the problem will always beat one that doesn't. To know whether the policy loan itself is doing the work, the honest control is to send the same monthly repayment straight at the mortgage instead and compare that. Whatever gap remains is what the loan is actually contributing.",
      say: "Before we credit the policy for this, let's check what the same money does if we just pay it straight onto the mortgage. That's the only fair test."
    },
    rule72: {
      term: "The Rule of 72",
      plain: "A quick way to work out how long money takes to double: divide 72 by the yearly rate. At 8%, that is 9 years. It is a shortcut, not the exact answer — it is spot on around 7.85% and drifts a little either side.",
      say: "Divide 72 by your rate and you get the years to double. It's the fastest piece of maths in this business."
    },
    compounding: {
      term: "Compounding",
      plain: "Growth on top of growth. Each year's gain is added to the balance, so the following year grows on a bigger number. It works exactly the same way on money you owe.",
      say: "It doesn't care which side it's on. It just keeps doubling whatever it's attached to."
    },
    realreturn: {
      term: "Your return after rising prices",
      plain: "What you really earn once you allow for prices going up. Earning 8% while prices rise 3% leaves you about 4.9% better off in what you can actually buy.",
      say: "The balance grows at eight. What it buys grows at about five. That gap never shows up on a statement."
    },
    crossover: {
      term: "When debt overtakes savings",
      plain: "The point where the amount you owe grows past the amount you have saved. Before it, your savings are the bigger number. After it, the debt is — and the gap keeps widening.",
      say: "Right here is the day the card is worth more than the account. Everything we do is about moving that day, or removing it."
    },
    grossup: {
      term: "Grossing up",
      plain: "Working backwards from the money you actually want in your hand to the larger amount you have to withdraw, because tax comes off on the way.",
      say: "If you want fifty thousand to spend, you have to ask for more than fifty thousand."
    },
    safewithdrawal: {
      term: "Safe withdrawal rate",
      plain: "The share of a retirement balance you can draw in the first year, then raise with inflation, and still expect the money to last a full retirement. The long-standing rule of thumb is about 4%, which is where the dashed line comes from. It is a yardstick to measure a plan against, not a promise.",
      say: "This is the industry's yardstick \u2014 about 4% a year, rising with inflation. It's not a rule, but it tells us quickly whether a plan is inside the lines."
    },
    levelreturn: {
      term: "A level return",
      plain: "The same percentage earned every single year, with no good or bad years at all. No real account behaves this way. It is used here as the baseline, so the second line can show what changes when the identical average arrives in a different order.",
      say: "This line assumes every year is identical. Nothing does that \u2014 it's the control we measure the real-world line against."
    },
    netheirs: {
      term: "Net to heirs",
      plain: "What actually reaches the people you name, after debts are cleared, income tax is paid on anything that was never taxed, and the cost of settling the estate comes out. It is almost always smaller than the figure on the statements.",
      say: "The statement total isn't the inheritance. Net to heirs is, and that's the number worth planning around."
    },
    coveragegap: {
      term: "Coverage gap",
      plain: "The difference between what the family would need and the cover already in force. Only the gap has to be solved \u2014 the existing policies and savings are doing the rest of the job already.",
      say: "We're not insuring the whole need. We're insuring the gap, which is a much smaller conversation."
    },
    outofpocket: {
      term: "Out of pocket",
      plain: "Money that came from you, as opposed to money the account earned. Comparing two plans by what each one cost you out of pocket separates the saving you did from the growth you were given.",
      say: "This is what came out of your pocket. Everything above it was earned, not contributed."
    }
  };

  /* ---------- the popover ----------

     The "Say it like this" block is built fresh on every open and
     only when Agent mode is on, so in Client mode the agent wording
     is never in the page at all — and the role switch can never
     reach in and take a piece of the popover away.
  */
  let pop = null;
  let openKey = null;
  let openAnchor = null;

  function build() {
    const el = document.createElement("div");
    el.className = "xp-pop";
    el.hidden = true;
    el.setAttribute("role", "dialog");
    el.innerHTML =
      '<div class="xp-head"><b class="xp-term"></b>' +
        '<button type="button" class="xp-close" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>' +
        '</button></div>' +
      '<p class="xp-plain"></p>';
    el.querySelector(".xp-close").addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation(); close();
    });
    el.addEventListener("click", function (e) { e.stopPropagation(); });
    el.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    document.body.appendChild(el);
    return el;
  }

  function close() {
    if (!pop) return;
    pop.hidden = true;
    if (openAnchor) openAnchor.setAttribute("aria-expanded", "false");
    openKey = null;
    openAnchor = null;
  }

  function isAgent() {
    try { return !!(window.WD && window.WD.isAgent && window.WD.isAgent()); } catch (e) { return false; }
  }

  function place(anchor) {
    if (!pop || pop.hidden || !anchor) return;
    const r = anchor.getBoundingClientRect();
    if (!r.width && !r.height) { close(); return; }

    const w = Math.min(340, window.innerWidth - 24);
    pop.style.width = w + "px";

    let left = r.left + window.scrollX;
    const maxLeft = window.scrollX + window.innerWidth - w - 12;
    if (left > maxLeft) left = maxLeft;
    if (left < window.scrollX + 12) left = window.scrollX + 12;
    pop.style.left = Math.round(left) + "px";

    const h = pop.offsetHeight;
    const roomBelow = window.innerHeight - r.bottom;
    const flip = roomBelow < h + 16 && r.top > h + 16;
    pop.style.top = Math.round(flip
      ? r.top + window.scrollY - h - 10
      : r.bottom + window.scrollY + 10) + "px";
    pop.classList.toggle("is-above", flip);
  }

  function open(key, anchor) {
    const g = GLOSSARY[key];
    if (!g) return;
    if (!pop) pop = build();

    /* tapping the same word again closes it */
    if (!pop.hidden && openAnchor === anchor) { close(); return; }
    if (openAnchor && openAnchor !== anchor) openAnchor.setAttribute("aria-expanded", "false");

    pop.querySelector(".xp-term").textContent = g.term;
    pop.querySelector(".xp-plain").textContent = g.plain;

    const old = pop.querySelector(".xp-say");
    if (old) old.parentNode.removeChild(old);
    if (g.say && isAgent()) {
      const say = document.createElement("div");
      say.className = "xp-say";
      say.innerHTML = '<span>Say it like this</span><p></p>';
      say.querySelector("p").textContent = g.say;
      pop.appendChild(say);
    }

    pop.hidden = false;
    openKey = key;
    openAnchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
    place(anchor);
  }

  /* ---------- wiring ---------- */
  function mark(root) {
    (root || document).querySelectorAll("[data-term]").forEach(function (el) {
      const key = el.getAttribute("data-term");
      if (!GLOSSARY[key]) return;
      if (el.dataset.xpDone && el.querySelector(".xp-i")) return;

      el.dataset.xpDone = "1";
      el.classList.add("xp-term-link");
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-expanded", "false");
      el.setAttribute("aria-label", el.textContent.trim() + " — what is " + GLOSSARY[key].term + "?");

      /* a real element, not a pseudo: a proper tap target */
      if (!el.querySelector(".xp-i")) {
        const i = document.createElement("i");
        i.className = "xp-i";
        i.setAttribute("aria-hidden", "true");
        el.appendChild(i);
      }

      if (el.dataset.xpBound) return;
      el.dataset.xpBound = "1";

      /* stop the click reaching a <summary>, a <label> or the document */
      el.addEventListener("mousedown", function (e) { e.preventDefault(); e.stopPropagation(); });
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        open(el.getAttribute("data-term"), el);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); e.stopPropagation();
          open(el.getAttribute("data-term"), el);
        }
      });
    });
  }

  /* the Explain switch — plain lines appear where a tool declares them */
  /* the same plain-language definitions, readable by the assistant */
  window.WD.glossary = GLOSSARY;

  const KEY = "wealthdemo.explain";
  function on() {
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function apply() {
    document.body.setAttribute("data-explain", on() ? "on" : "off");
    document.querySelectorAll("[data-explain-for]").forEach(function (el) {
      const g = GLOSSARY[el.getAttribute("data-explain-for")];
      if (g && !el.textContent.trim()) el.textContent = g.plain;
    });
    const btn = document.getElementById("explainBtn");
    if (btn) {
      btn.classList.toggle("on", on());
      btn.setAttribute("aria-pressed", on() ? "true" : "false");
    }
  }

  function mountSwitch() {
    const bar = document.querySelector(".tool-topbar .topbar-right");
    if (!bar || document.getElementById("explainBtn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "explainBtn";
    btn.className = "explain-btn";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 11.5v5"/><path d="M12 7.8h.01"/></svg>' +
      '<span>Explain</span>';
    btn.addEventListener("click", function () {
      try { localStorage.setItem(KEY, on() ? "0" : "1"); } catch (e) {}
      apply();
    });
    bar.insertBefore(btn, bar.firstChild);
    apply();
  }

  document.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { close(); if (openAnchor) openAnchor.focus(); }
  });
  /* follow the word rather than vanishing */
  window.addEventListener("resize", function () { place(openAnchor); });
  window.addEventListener("scroll", function () { place(openAnchor); }, { passive: true });
  /* the agent block must not linger after a switch to client view */
  document.addEventListener("wd:role", function () {
    if (openKey && openAnchor && pop && !pop.hidden) {
      const k = openKey, a = openAnchor;
      close();
      open(k, a);
    }
  });

  WD.explain = { GLOSSARY: GLOSSARY, mark: mark, refresh: function () { mark(); apply(); } };

  function boot() { mark(); mountSwitch(); apply(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
