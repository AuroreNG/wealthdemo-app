    (function () {
      const root = document.getElementById("wp-building-retirement");
      let lastData2 = {};
      let mlData = {}, ttData = {}, pdData = {}, dimeData = {};

      function el(id) { return root.querySelector("#" + id); }
      function number(id) { return Math.max(0, Number(el(id).value) || 0); }
      function money(v) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.max(0, v)); }

      function futureValue(start, monthly, annualRate, months) {
        const r = annualRate / 12;
        if (r === 0) return start + monthly * months;
        return start * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r);
      }

      const TYPE_LABELS = {
        "now-checking": "Checking Account",
        "now-savings": "Savings / Money Market",
        "now-cd": "Certificate of Deposit (CD)",
        "now-brokerage": "Taxable Brokerage Account",
        "now-stocks": "Individual Stocks",
        "now-bonds": "Bonds / Bond Funds",
        "now-crypto": "Cryptocurrency",
        "now-realestate": "Real Estate / Rental Property",
        "later-401k": "401(k)",
        "later-403b": "403(b)",
        "later-tsp": "TSP (Thrift Savings Plan)",
        "later-ira": "Traditional IRA",
        "later-sepira": "SEP IRA",
        "later-simpleira": "SIMPLE IRA",
        "later-annuity": "Tax-Deferred Annuity",
        "never-roth401k": "Roth 401(k)",
        "never-rothira": "Roth IRA",
        "never-life": "Cash Value Life Insurance",
        "never-hsa": "Health Savings Account (HSA)",
        "never-529": "529 Education Plan"
      };

      const LUMP_EXPENSE_CHARGE = 0.10; // flat premium expense charge applied to IUL lump-sum transfers; 90% goes toward investment

      const MARKET_EXPOSED_TYPES = {
        "now-brokerage": true, "now-stocks": true, "now-bonds": true, "now-crypto": true,
        "later-401k": true, "later-403b": true, "later-tsp": true, "later-ira": true, "later-sepira": true, "later-simpleira": true,
        "never-roth401k": true, "never-rothira": true, "never-529": true
      };
      const ACCOUNT_TYPE_OPTIONS =
        '<optgroup label="Tax Now (Taxable)">' +
          '<option value="now-checking">Checking Account</option>' +
          '<option value="now-savings">Savings / Money Market</option>' +
          '<option value="now-cd">Certificate of Deposit (CD)</option>' +
          '<option value="now-brokerage">Taxable Brokerage Account</option>' +
          '<option value="now-stocks">Individual Stocks</option>' +
          '<option value="now-bonds">Bonds / Bond Funds</option>' +
          '<option value="now-crypto">Cryptocurrency</option>' +
          '<option value="now-realestate">Real Estate / Rental Property</option>' +
        '</optgroup>' +
        '<optgroup label="Tax Later (Tax-Deferred)">' +
          '<option value="later-401k">401(k)</option>' +
          '<option value="later-403b">403(b)</option>' +
          '<option value="later-tsp">TSP (Thrift Savings Plan)</option>' +
          '<option value="later-ira">Traditional IRA</option>' +
          '<option value="later-sepira">SEP IRA</option>' +
          '<option value="later-simpleira">SIMPLE IRA</option>' +
          '<option value="later-annuity">Tax-Deferred Annuity</option>' +
        '</optgroup>' +
        '<optgroup label="Tax-Free Later">' +
          '<option value="never-roth401k">Roth 401(k)</option>' +
          '<option value="never-rothira">Roth IRA</option>' +
          '<option value="never-life">Cash Value Life Insurance</option>' +
          '<option value="never-hsa">Health Savings Account (HSA)</option>' +
          '<option value="never-529">529 Education Plan</option>' +
        '</optgroup>';
      function readContribItems() {
        const items = [];
        el("contribItems").querySelectorAll(".contrib-item").forEach(function (row) {
          const type = row.querySelector(".contrib-type").value;
          const grossMonthly = Math.max(0, Number(row.querySelector(".contrib-monthly").value) || 0);
          const rate = Math.max(0, Number(row.querySelector(".contrib-rate").value) || 0) / 100;
          const category = type.split("-")[0]; // "now" | "later" | "never"

          let cvPct = 100;
          let monthly = grossMonthly;
          let grossLump = 0;
          let lump = 0;
          if (type === "never-life") {
            const cvInput = row.querySelector(".contrib-cvpct");
            cvPct = cvInput ? Math.min(100, Math.max(0, Number(cvInput.value) || 0)) : 100;
            monthly = grossMonthly * (cvPct / 100);
            const lumpInput = row.querySelector(".contrib-lump");
            grossLump = lumpInput ? Math.max(0, Number(lumpInput.value) || 0) : 0;
            lump = grossLump * (1 - LUMP_EXPENSE_CHARGE); // lump-sum transfers get a flat premium expense charge, not the monthly cash-value split
          }

          const marketExposed = !!MARKET_EXPOSED_TYPES[type];
          items.push({ type, grossMonthly, monthly, cvPct, grossLump, lump, rate, category, isIul: type === "never-life", marketExposed });
        });
        return items;
      }

      function addContribItem(type, monthlyVal, rateVal) {
        const wrap = el("contribItems");
        const row = document.createElement("div");
        row.className = "contrib-item";
        row.innerHTML =
          '<div class="contrib-item-grid">' +
            '<div class="wp-field"><div class="wp-label">Account Type</div>' +
              '<select class="wp-select contrib-type">' + ACCOUNT_TYPE_OPTIONS + '</select>' +
            '</div>' +
            '<div class="wp-field"><div class="wp-label">Monthly ($)</div><input type="number" class="wp-input contrib-monthly" value="' + monthlyVal + '"></div>' +
            '<div class="wp-field"><div class="wp-label">Rate of Return (%)</div><input type="number" class="wp-input contrib-rate" value="' + rateVal + '" step="0.1"></div>' +
          '</div>' +
          '<div class="iul-split-field" style="display:none;margin-top:10px;">' +
            '<div class="wp-field" style="margin-bottom:0;">' +
              '<div class="wp-label" style="font-size:11px;">% of Premium Going to Cash Value<button type="button" class="info-btn iul-split-info">i</button></div>' +
              '<input type="number" class="wp-input contrib-cvpct" value="70" min="0" max="100">' +
            '</div>' +
            '<div class="wp-tip iul-split-tip">' +
              'Part of a life insurance premium covers the actual cost of insurance and fees; only the ' +
              'remainder builds cash value. Enter the percentage that goes toward cash value, based on your ' +
              'policy illustration, so only that portion is used in the projections below. A common range ' +
              'is roughly 50&ndash;80%, especially lower in early policy years, but your actual illustration is the best source.' +
            '</div>' +
            '<div class="wp-field" style="margin-bottom:0;margin-top:12px;">' +
              '<div class="wp-label" style="font-size:11px;">Lump Sum Transfer In ($)<button type="button" class="info-btn iul-lump-info">i</button></div>' +
              '<input type="number" class="wp-input contrib-lump" value="0" min="0">' +
            '</div>' +
            '<div class="wp-tip iul-lump-tip">' +
              'If you\'re moving a one-time amount into this policy &mdash; for example, from an existing Tax Now ' +
              'savings, CD, or brokerage account in Step 1 &mdash; enter it here. A flat 10% premium expense ' +
              'charge applies to lump-sum transfers, so 90% goes toward investment/cash value; this is separate ' +
              'from the cash-value percentage above, which only applies to the ongoing monthly premium. If this ' +
              'money is coming out of an existing account rather than being new savings, remember to reduce that ' +
              'account\'s balance in Step 1 by the same amount, so it isn\'t counted twice.' +
            '</div>' +
            '<div class="subtext lump-projection-note" style="margin-top:8px;font-size:11px;"></div>' +
            '<div class="lump-compare-box" style="display:none;">' +
              '<div class="lump-compare-label">What If You Moved This From Tax Now Instead?</div>' +
              '<div class="lump-compare-num"></div>' +
              '<div class="lump-compare-sub"></div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="contrib-remove">Remove Account</button>';
        wrap.appendChild(row);
        const typeSelect = row.querySelector(".contrib-type");
        typeSelect.value = type;

        const splitField = row.querySelector(".iul-split-field");
        const splitInfoBtn = row.querySelector(".iul-split-info");
        const splitTip = row.querySelector(".iul-split-tip");
        const lumpInfoBtn = row.querySelector(".iul-lump-info");
        const lumpTip = row.querySelector(".iul-lump-tip");
        function toggleSplitField() {
          splitField.style.display = typeSelect.value === "never-life" ? "block" : "none";
        }
        toggleSplitField();
        typeSelect.addEventListener("change", toggleSplitField);
        splitInfoBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          splitTip.classList.toggle("open");
        });
        lumpInfoBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          lumpTip.classList.toggle("open");
        });

        row.querySelectorAll("input, select").forEach(function (input) {
          input.addEventListener("input", update);
          input.addEventListener("change", update);
        });
        row.querySelector(".contrib-remove").addEventListener("click", function () {
          row.remove();
          update();
        });
      }

      el("addContribBtn").addEventListener("click", function () {
        addContribItem("later-401k", 0, 7);
        update();
      });

      function readSavingsItems() {
        const items = [];
        el("savingsItems").querySelectorAll(".savings-item").forEach(function (row) {
          const type = row.querySelector(".savings-type").value;
          const balance = Math.max(0, Number(row.querySelector(".savings-balance").value) || 0);
          const rate = Math.max(0, Number(row.querySelector(".savings-rate").value) || 0) / 100;
          const category = type.split("-")[0];
          const marketExposed = !!MARKET_EXPOSED_TYPES[type];
          items.push({ type, balance, rate, category, marketExposed });
        });
        return items;
      }

      function addSavingsItem(type, balanceVal, rateVal) {
        if (rateVal === undefined) rateVal = 7;
        const wrap = el("savingsItems");
        const row = document.createElement("div");
        row.className = "contrib-item savings-item";
        row.innerHTML =
          '<div class="contrib-item-grid">' +
            '<div class="wp-field"><div class="wp-label">Account Type</div>' +
              '<select class="wp-select savings-type">' + ACCOUNT_TYPE_OPTIONS + '</select>' +
            '</div>' +
            '<div class="wp-field"><div class="wp-label">Current Balance ($)</div><input type="number" class="wp-input savings-balance" value="' + balanceVal + '"></div>' +
            '<div class="wp-field"><div class="wp-label">Rate of Return (%)</div><input type="number" class="wp-input savings-rate" value="' + rateVal + '" step="0.1"></div>' +
          '</div>' +
          '<button type="button" class="contrib-remove">Remove Account</button>';
        wrap.appendChild(row);
        row.querySelector(".savings-type").value = type;

        row.querySelectorAll("input, select").forEach(function (input) {
          input.addEventListener("input", update);
          input.addEventListener("change", update);
        });
        row.querySelector(".contrib-remove").addEventListener("click", function () {
          row.remove();
          update();
        });
      }

      el("addSavingsBtn").addEventListener("click", function () {
        addSavingsItem("later-401k", 0, 7);
        update();
      });

      function estimateTaxableSocialSecurity(annualBenefits, combinedIncome, filingStatus) {
        annualBenefits = Math.max(0, Number(annualBenefits) || 0);
        combinedIncome = Math.max(0, Number(combinedIncome) || 0);
        if (annualBenefits <= 0) return 0;

        // Current federal Social Security benefit-taxation framework.
        // "combined income" = other income + tax-exempt interest + 1/2 Social Security.
        if (filingStatus === "mfs") {
          return Math.min(annualBenefits * 0.85, combinedIncome * 0.85);
        }

        const base = filingStatus === "joint" ? 32000 : 25000;
        const upper = filingStatus === "joint" ? 44000 : 34000;
        if (combinedIncome <= base) return 0;
        if (combinedIncome <= upper) {
          return Math.min(annualBenefits * 0.50, (combinedIncome - base) * 0.50);
        }
        const firstBand = Math.min(annualBenefits * 0.50, (upper - base) * 0.50);
        return Math.min(annualBenefits * 0.85, firstBand + (combinedIncome - upper) * 0.85);
      }

      function update() {
        const savingsItems = readSavingsItems();
        const currentSavings = savingsItems.reduce(function (sum, it) { return sum + it.balance; }, 0);
        const savingsTotalEl = el("savingsTotal");
        if (savingsItems.length) {
          savingsTotalEl.innerHTML = "<strong>Total saved so far:</strong> " + money(currentSavings) + " across " + savingsItems.length + " account" + (savingsItems.length === 1 ? "" : "s") + ".";
        } else {
          savingsTotalEl.textContent = "Add an account above to see your total.";
        }
        const curAge = number("curAge2");
        const retireAge = Math.max(curAge, number("retireAge2"));
        const employerMatch = number("employerMatch");
        const goalIncome = number("goalIncome");
        const socialSecurityMonthly = Math.max(0, number("socialSecurityMonthly"));
        const ssFilingStatus = el("ssFilingStatus").value || "single";
        const ssOtherIncomeMonthly = Math.max(0, number("ssOtherIncomeMonthly"));
        const ssTaxExemptMonthly = Math.max(0, number("ssTaxExemptMonthly"));
        const inflation = number("inflationRate") / 100;
        const withdrawRate = number("withdrawRate2") / 100;

        const yearsToRetire = retireAge - curAge;
        const months = yearsToRetire * 12;

        const items = readContribItems();
        const contribTotal = items.reduce(function (sum, it) { return sum + it.monthly; }, 0);
        const totalMonthly = contribTotal + employerMatch;

        // Live "grows to" note under any account with a lump-sum transfer entered
        const contribRows = el("contribItems").querySelectorAll(".contrib-item");
        const curTaxRateForCompare = number("curTaxRate") / 100;
        contribRows.forEach(function (row, i) {
          const noteEl = row.querySelector(".lump-projection-note");
          const compareBox = row.querySelector(".lump-compare-box");
          if (!noteEl) return;
          const it = items[i];
          if (it && it.lump > 0) {
            const grownTo = futureValue(it.lump, 0, it.rate, months);
            noteEl.innerHTML = "This " + money(it.grossLump) + " transfer (" + money(it.lump) + " after a " +
              (LUMP_EXPENSE_CHARGE * 100).toFixed(0) + "% premium expense charge) " +
              "is projected to grow to <strong>" + money(grownTo) + "</strong> by age " + retireAge + ".";

            if (compareBox) {
              // Same money, same rate, left in a Tax Now account instead — full amount (no expense charge),
              // reduced by the ongoing tax drag used elsewhere in this tool for the Tax Now bucket.
              const taxNowRate = it.rate * (1 - curTaxRateForCompare);
              const taxNowValue = futureValue(it.grossLump, 0, taxNowRate, months);
              const moreAmount = grownTo - taxNowValue;
              const numEl = compareBox.querySelector(".lump-compare-num");
              const subEl = compareBox.querySelector(".lump-compare-sub");
              compareBox.style.display = "block";
              if (moreAmount >= 0) {
                numEl.textContent = "+" + money(moreAmount) + " more";
                subEl.innerHTML = "Left in a Tax Now account at " + (curTaxRateForCompare * 100).toFixed(0) +
                  "% ongoing tax drag, the same " + money(it.grossLump) + " is projected to reach only " +
                  money(taxNowValue) + " by age " + retireAge + " &mdash; potentially <strong>" + money(moreAmount) +
                  " less</strong> than moving it here.";
              } else {
                numEl.textContent = money(Math.abs(moreAmount)) + " less";
                subEl.innerHTML = "In this illustration, leaving it in a Tax Now account is projected to reach " +
                  money(taxNowValue) + " by age " + retireAge + ", more than this Tax Never option due to the " +
                  (LUMP_EXPENSE_CHARGE * 100).toFixed(0) + "% expense charge and the entered rates.";
              }
            }
          } else {
            if (noteEl) noteEl.textContent = "";
            if (compareBox) compareBox.style.display = "none";
          }
        });

        const contribWeightedRate = items.reduce(function (sum, it) { return sum + it.monthly * it.rate; }, 0);
        const avgItemRate = contribTotal > 0 ? contribWeightedRate / contribTotal : 0.07;

        // Blended rate used for the extra-contribution illustration and summary calculations
        const savingsWeightedRate = savingsItems.reduce(function (sum, it) { return sum + it.balance * it.rate; }, 0);
        const allWeightedRateSum = contribWeightedRate + employerMatch * avgItemRate + savingsWeightedRate;
        const allWeightBase = totalMonthly + currentSavings;
        const growth = allWeightBase > 0 ? allWeightedRateSum / allWeightBase : avgItemRate;

        // Category totals — combining EXISTING savings (lump) and ONGOING contributions (flow) per tax bucket
        const catTotals = { now: 0, later: 0, never: 0 };
        const catRateSum = { now: 0, later: 0, never: 0 };
        items.forEach(function (it) {
          catTotals[it.category] += it.monthly;
          catRateSum[it.category] += it.monthly * it.rate;
        });
        catTotals.later += employerMatch; // employer match treated as pre-tax / Tax Later
        catRateSum.later += employerMatch * avgItemRate;

        const catRates = {
          now: catTotals.now > 0 ? catRateSum.now / catTotals.now : avgItemRate,
          later: catTotals.later > 0 ? catRateSum.later / catTotals.later : avgItemRate,
          never: catTotals.never > 0 ? catRateSum.never / catTotals.never : avgItemRate
        };

        const savingsCatTotals = { now: 0, later: 0, never: 0 };
        const savingsCatRateSum = { now: 0, later: 0, never: 0 };
        savingsItems.forEach(function (it) {
          savingsCatTotals[it.category] += it.balance;
          savingsCatRateSum[it.category] += it.balance * it.rate;
        });
        // Lump-sum transfers entered on a Step 2 account (e.g. IUL) behave mathematically like an
        // existing balance — a one-time amount compounding with no ongoing flow — so they're folded
        // into the same lump-sum totals used for existing savings, keeping every downstream
        // calculation (tax buckets, chaos numbers, PDF) automatically consistent.
        items.forEach(function (it) {
          if (it.lump > 0) {
            savingsCatTotals[it.category] += it.lump;
            savingsCatRateSum[it.category] += it.lump * it.rate;
          }
        });
        const savingsCatRates = {
          now: savingsCatTotals.now > 0 ? savingsCatRateSum.now / savingsCatTotals.now : avgItemRate,
          later: savingsCatTotals.later > 0 ? savingsCatRateSum.later / savingsCatTotals.later : avgItemRate,
          never: savingsCatTotals.never > 0 ? savingsCatRateSum.never / savingsCatTotals.never : avgItemRate
        };

        // Projected balance: sum of each individual account's own future value (existing balances + ongoing contributions)
        let projectedBalance = 0;
        savingsItems.forEach(function (it) { projectedBalance += futureValue(it.balance, 0, it.rate, months); });
        items.forEach(function (it) { projectedBalance += futureValue(it.lump, it.monthly, it.rate, months); });
        projectedBalance += futureValue(0, employerMatch, avgItemRate, months);

        let marketExposedBalance = 0;
        savingsItems.forEach(function (it) { if (it.marketExposed) marketExposedBalance += futureValue(it.balance, 0, it.rate, months); });
        items.forEach(function (it) { if (it.marketExposed) marketExposedBalance += futureValue(it.lump, it.monthly, it.rate, months); });
        marketExposedBalance += futureValue(0, employerMatch, avgItemRate, months); // match assumed market-exposed (401k-style)

        const mixEl = el("contribMix");
        if (totalMonthly > 0) {
          const pct = function (v) { return Math.round((v / totalMonthly) * 100); };
          const hasIul = items.some(function (it) { return it.isIul && (it.grossMonthly > 0 || it.grossLump > 0); });
          mixEl.innerHTML = "<strong>Your new contributions:</strong> " + pct(catTotals.now) + "% Tax Now &middot; " +
            pct(catTotals.later) + "% Tax Later &middot; " + pct(catTotals.never) + "% Tax-Free Later " +
            "(blended assumed return: " + (growth * 100).toFixed(1) + "%)." +
            (hasIul ? " Life insurance premiums are counted here only at their cash value portion, not the full premium." : "");
        } else {
          mixEl.textContent = "Add an account above to see your contribution mix.";
        }

        const futureGoalIncome = goalIncome * Math.pow(1 + inflation, yearsToRetire);

        // Social Security is treated as retirement income, not as an investment account.
        // We estimate how much of the benefit may be taxable using current federal combined-income rules,
        // then use an estimated after-tax Social Security amount to reduce the income the portfolio must produce.
        const ssAnnual = socialSecurityMonthly * 12;
        const ssOtherAnnual = ssOtherIncomeMonthly * 12;
        const ssTaxExemptAnnual = ssTaxExemptMonthly * 12;
        const ssProvisionalIncome = ssOtherAnnual + ssTaxExemptAnnual + (ssAnnual * 0.50);
        const ssTaxableAnnual = estimateTaxableSocialSecurity(ssAnnual, ssProvisionalIncome, ssFilingStatus);
        const ssRetirementTaxRate = Math.max(0, number("futTaxRate") / 100);
        const ssEstimatedFederalTax = ssTaxableAnnual * ssRetirementTaxRate;
        const ssNetMonthly = Math.max(0, (ssAnnual - ssEstimatedFederalTax) / 12);
        const portfolioIncomeNeed = Math.max(0, futureGoalIncome - ssNetMonthly);

        const goalNestEgg = withdrawRate > 0 ? (portfolioIncomeNeed * 12) / withdrawRate : 0;
        const onTrackPct = goalNestEgg > 0 ? Math.min(150, (projectedBalance / goalNestEgg) * 100) : 0;

        el("yearsToRetireOut").textContent = yearsToRetire;
        el("totalMonthlyOut").textContent = money(totalMonthly) + "/mo";
        el("projectedBalanceOut").textContent = money(projectedBalance);
        el("goalNestEggOut").textContent = money(goalNestEgg);
        el("ssGrossOut").textContent = money(socialSecurityMonthly) + "/mo";
        el("ssProvisionalOut").textContent = money(ssProvisionalIncome) + "/yr";
        el("ssTaxableOut").textContent = money(ssTaxableAnnual) + "/yr";
        el("portfolioIncomeNeedOut").textContent = money(portfolioIncomeNeed) + "/mo";
        const taxablePct = ssAnnual > 0 ? Math.round((ssTaxableAnnual / ssAnnual) * 100) : 0;
        el("ssSummaryNote").innerHTML = socialSecurityMonthly > 0
          ? "Using the information entered, about <strong>" + taxablePct + "%</strong> of your Social Security benefit may be included in taxable income under current federal rules. That does <strong>not</strong> mean it is taxed at " + taxablePct + "%. For this illustration, we apply your estimated retirement tax rate only to the portion potentially taxable. Tax law can change before you retire."
          : "Enter your expected Social Security benefit to include it in your retirement-income picture.";
        el("inflationNote").innerHTML = '<div style="font-size:17px;line-height:1.55;color:var(--navy);font-weight:700;padding:8px 0;">Your <strong style="font-size:20px;color:var(--gold);">' + money(goalIncome) + '/Month</strong> retirement lifestyle goal is estimated at <strong style="font-size:22px;color:var(--red);">' + money(futureGoalIncome) + '/Month</strong> at age <strong>' + retireAge + '</strong>. After estimated Social Security, your savings may need to produce about <strong style="font-size:22px;color:#2f7b4b;">' + money(portfolioIncomeNeed) + '/Month</strong>.</div>';

        const trackBox = el("trackStatusBox");
        const trackHeadline = el("trackHeadline");
        const trackDetail = el("trackDetail");
        const onTrack = projectedBalance >= goalNestEgg;

        if (onTrack) {
          trackBox.className = "status-box good";
          trackHeadline.textContent = "Your current path reaches the goal — now protect the outcome.";
          trackDetail.innerHTML = "At your current savings rate and assumed growth, you're projected to reach <strong>" + money(projectedBalance) + "</strong> by age " + retireAge + ", which meets or exceeds your estimated goal of " + money(goalNestEgg) + ".";
        } else {
          trackBox.className = "status-box bad";
          const shortfall = goalNestEgg - projectedBalance;
          trackHeadline.textContent = "Your projected retirement gap is " + money(shortfall) + ".";
          trackDetail.innerHTML = "At your current savings rate and assumed growth, you're projected to reach <strong>" + money(projectedBalance) + "</strong> by age " + retireAge + ", about " + money(shortfall) + " short of your estimated goal of " + money(goalNestEgg) + ".";
        }

        el("trackBar").style.width = Math.min(100, onTrackPct) + "%";
        el("trackPctLabel").textContent = Math.round(onTrackPct) + "% of your goal, projected.";

        lastData2 = { currentSavings, savingsItems, curAge, retireAge, contribTotal, items, employerMatch, totalMonthly, growth, goalIncome, inflation, futureGoalIncome, withdrawRate, yearsToRetire, projectedBalance, goalNestEgg, onTrack, catTotals, catRates, savingsCatTotals, savingsCatRates, marketExposedBalance, socialSecurityMonthly, ssFilingStatus, ssOtherIncomeMonthly, ssTaxExemptMonthly, ssProvisionalIncome, ssTaxableAnnual, ssEstimatedFederalTax, ssNetMonthly, portfolioIncomeNeed };

        updateExtraContribution();
        updateTaxPicture();
        updateChaosNumbers();
        updateDecisionDashboard();
      }

      function updateExtraContribution() {
        const d = lastData2;
        const extra = Number(el("extraContribSlider").value) || 0;
        el("extraContribVal").textContent = "$" + extra + "/mo";

        const months = d.yearsToRetire * 12;
        const withExtra = futureValue(d.currentSavings, d.totalMonthly + extra, d.growth, months);
        const gained = withExtra - d.projectedBalance;

        const box = el("extraImpactText");
        const headline = el("extraImpactHeadline");
        const detail = el("extraImpactDetail");

        if (extra <= 0) {
          box.className = "status-box good";
          headline.textContent = "Move the slider to see the impact.";
          detail.textContent = "";
          return;
        }

        box.className = "status-box good";
        headline.textContent = money(extra) + "/mo today → about +" + money(gained) + " by retirement.";
        detail.innerHTML = "Adding " + money(extra) + "/mo brings your projected balance to <strong>" + money(withExtra) + "</strong> by age " + d.retireAge + ".";
      }

      function updateDecisionDashboard() {
        const d = lastData2;
        if (!d || !d.goalNestEgg) return;
        const gap = Math.max(0, d.goalNestEgg - d.projectedBalance);
        const months = Math.max(0, d.yearsToRetire * 12);
        const monthlyRate = d.growth > 0 ? d.growth / 12 : 0;
        let extraNeeded = 0;
        if (gap > 0 && months > 0) {
          extraNeeded = monthlyRate > 0 ? gap * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1) : gap / months;
        }
        const marketShock = Math.max(0, (d.marketExposedBalance || 0) * .20);
        const futTaxRate = number("futTaxRate") / 100;
        const laterGross = futureValue(d.savingsCatTotals.later, 0, d.savingsCatRates.later, months) + futureValue(0, d.catTotals.later, d.catRates.later, months);

        const roundedExtra = Math.ceil(extraNeeded);
        const totalNeededNow = d.totalMonthly + roundedExtra;
        el("actionGap").textContent = gap > 0 ? money(gap) : "ON TRACK";
        el("actionKicker").textContent = gap > 0 ? "WHAT MAY STILL BE MISSING" : "YOUR CURRENT PROJECTION";
        el("actionGapCopy").innerHTML = gap > 0
          ? "You said you want about <strong>" + money(d.goalIncome) + "/month</strong> in today's lifestyle. With inflation, that same lifestyle could cost about <strong>" + money(d.futureGoalIncome) + "/month</strong> at age " + d.retireAge + ". Based on what you're saving now, you may still be short by the amount above."
          : "Based on the numbers you entered, your current savings path reaches your retirement goal. Now you can look at how taxes, market losses and unexpected life events could affect it.";
        el("actionMonthly").textContent = gap > 0 ? "+" + money(roundedExtra) + "/mo" : "$0/mo";
        const monthlyExplain = el("actionMonthlyExplain");
        if (monthlyExplain) monthlyExplain.innerHTML = gap > 0
          ? "You're already saving <strong>" + money(d.totalMonthly) + "/month</strong>. Adding about <strong>" + money(roundedExtra) + "/month</strong> would bring your estimated total to about <strong>" + money(totalNeededNow) + "/month</strong>."
          : "Based on these assumptions, no additional monthly savings are needed to reach the goal you entered.";
        el("actionMarket").textContent = "-" + money(marketShock);
        el("actionTaxLater").textContent = money(laterGross);
        el("decisionQuestion").textContent = gap > 0
          ? "You have a gap to work on. What would you like to focus on first?"
          : "You may be on track. What would you like to improve or protect next?";
      }

      function accountNames(d, category) {
        const found = [];
        const savingsCounts = {};
        const contribCounts = {};

        (d.savingsItems || []).forEach(function (it) {
          if (it.category === category && it.balance > 0) {
            savingsCounts[it.type] = (savingsCounts[it.type] || 0) + 1;
          }
        });
        (d.items || []).forEach(function (it) {
          if (it.category === category && (it.monthly > 0 || it.lump > 0)) {
            contribCounts[it.type] = (contribCounts[it.type] || 0) + 1;
          }
        });

        const allTypes = new Set(Object.keys(savingsCounts).concat(Object.keys(contribCounts)));
        allTypes.forEach(function (type) {
          const label = TYPE_LABELS[type] || type;
          // Only flag a "×N" multiplier when the SAME source (savings or contributions) has
          // genuinely separate rows of this type — a balance + a contribution of the same
          // account type is one real account, not two, so that combination stays unmultiplied.
          const maxCount = Math.max(savingsCounts[type] || 0, contribCounts[type] || 0);
          found.push(maxCount > 1 ? label + " \u00d7" + maxCount : label);
        });

        if (category === "later" && d.employerMatch > 0) found.push("Employer Match");

        return found;
      }

      function updateTaxPicture() {
        const d = lastData2;
        if (!d.catTotals) return;

        const curTaxRate = number("curTaxRate") / 100;
        const futTaxRate = number("futTaxRate") / 100;
        const months = d.yearsToRetire * 12;

        const nowMonthly = d.catTotals.now;
        const laterMonthly = d.catTotals.later;
        const neverMonthly = d.catTotals.never;

        const nowSaved = d.savingsCatTotals.now;
        const laterSaved = d.savingsCatTotals.later;
        const neverSaved = d.savingsCatTotals.never;

        // TAX NOW: taxable accounts. This is a simplified illustration of tax drag.
        const nowLumpValue = futureValue(nowSaved, 0, d.savingsCatRates.now * (1 - curTaxRate), months);
        const nowFlowValue = futureValue(0, nowMonthly, d.catRates.now * (1 - curTaxRate), months);
        const nowValue = nowLumpValue + nowFlowValue;

        // TAX LATER: traditional tax-deferred accounts; retirement tax applied at withdrawal.
        const laterGross =
          futureValue(laterSaved, 0, d.savingsCatRates.later, months) +
          futureValue(0, laterMonthly, d.catRates.later, months);
        const laterValue = laterGross * (1 - futTaxRate);

        // POTENTIALLY TAX-FREE: qualified Roth/HSA/529 access and properly structured
        // cash-value life insurance access are illustrated without a retirement withdrawal tax.
        const neverLumpValue = futureValue(neverSaved, 0, d.savingsCatRates.never, months);
        const neverFlowValue = futureValue(0, neverMonthly, d.catRates.never, months);
        const neverValue = neverLumpValue + neverFlowValue;

        const combined = nowValue + laterValue + neverValue;
        const totalIn = nowSaved + laterSaved + neverSaved + nowMonthly + laterMonthly + neverMonthly;

        // Estimated tax dollars shown for education. For Tax Now, this is the illustrated
        // tax drag on growth through retirement. For Tax Later, it is the estimated tax due
        // at retirement. For Tax Never, future contributions are treated as after-tax dollars;
        // we estimate the tax paid before those future contributions are deposited. Historical
        // tax already paid on existing balances cannot be known from a current balance alone.
        const nowGrossBeforeTaxDrag =
          futureValue(nowSaved, 0, d.savingsCatRates.now, months) +
          futureValue(0, nowMonthly, d.catRates.now, months);
        const nowTaxPaid = Math.max(0, nowGrossBeforeTaxDrag - nowValue);
        const laterTaxPaid = Math.max(0, laterGross - laterValue);
        const neverFutureNetContrib = Math.max(0, neverMonthly * months);
        const neverTaxPaid = curTaxRate > 0 && curTaxRate < 1
          ? neverFutureNetContrib * (curTaxRate / (1 - curTaxRate))
          : 0;

        const cards = [
          { key: "now", label: "Tax Now", value: nowValue, taxPaid: nowTaxPaid, taxNote: "Illustrated tax drag on growth", accounts: accountNames(d, "now") },
          { key: "later", label: "Tax Later", value: laterValue, taxPaid: laterTaxPaid, taxNote: "Estimated tax due at retirement", accounts: accountNames(d, "later") },
          { key: "never", label: "Tax Never", value: neverValue, taxPaid: neverTaxPaid, taxNote: "Estimated tax paid before future contributions", accounts: accountNames(d, "never") }
        ];

        const grid = el("taxResultGrid");
        grid.innerHTML = cards.map(function (c) {
          const list = c.accounts.length
            ? c.accounts.map(function (name) {
                return '<div class="tax-account">' + name + '</div>';
              }).join("")
            : '<div class="tax-account empty">No accounts</div>';

          const amtClass = c.key === "now" ? "amt amt-taxable" : "amt";
          const preTaxEquivalent = c.value + c.taxPaid;
          const taxPct = preTaxEquivalent > 0 ? (c.taxPaid / preTaxEquivalent) * 100 : 0;
          return '<div class="tax-result-item">' +
                   '<div class="tag">' + c.label + '</div>' +
                   '<div class="' + amtClass + '">' + money(c.value) + '</div>' +
                   '<div class="tax-paid-alert">' +
                     '<div class="tax-paid-label">Estimated Tax Paid / Impact</div>' +
                     '<div class="tax-paid-num">' + money(c.taxPaid) + ' <span class="tax-paid-pct">(' + taxPct.toFixed(1) + '%)</span></div>' +
                     '<div class="tax-paid-note">' + c.taxNote + '</div>' +
                   '</div>' +
                   '<div class="tax-account-list">' + list + '</div>' +
                 '</div>';
        }).join("");

        const introEl = el("taxBucketsIntro");
        if (introEl) {
          introEl.textContent = "Your accounts are grouped below by when taxes may apply.";
        }

        const box = el("taxPictureBox");
        const headline = el("taxPictureHeadline");
        const detail = el("taxPictureDetail");
        if (totalIn <= 0) {
          if (box) box.className = "status-box good";
          if (headline) headline.textContent = "Add accounts in Step 1 or Step 2 to see your combined total.";
          if (detail) detail.textContent = "";
          return;
        }
        if (box) box.className = "status-box good";
        if (headline) headline.textContent = "Projected combined total at retirement: " + money(combined);
        if (detail) detail.textContent = "This adds up the three buckets above using the tax treatment and rate of return entered for each account.";
      }

      el("curTaxRate").addEventListener("input", updateTaxPicture);
      el("futTaxRate").addEventListener("input", updateTaxPicture);
      ["socialSecurityMonthly","ssOtherIncomeMonthly","ssTaxExemptMonthly"].forEach(function(id){
        el(id).addEventListener("input", update);
      });
      el("ssFilingStatus").addEventListener("change", update);

      function gapAnswerFor(choice) {
        const d = lastData2;
        const gap = Math.max(0, (d.goalNestEgg || 0) - (d.projectedBalance || 0));
        const gapText = gap > 0
          ? "You're currently projected to be about <strong>" + money(gap) + "</strong> short of your goal. "
          : "You're currently projected to be on track, but here's how this choice would work if you wanted to add more cushion. ";

        const map = {
          now: gapText + "Closing it with a <strong>Tax Now</strong> account (like a taxable brokerage account) means no contribution limits and full flexibility, but ongoing growth is taxed along the way, so it typically grows the slowest of the three.",
          later: gapText + "Closing it with a <strong>Tax Later</strong> account (like a 401(k) or Traditional IRA) lets the full amount grow untouched until withdrawal, often paired with an upfront tax deduction today, but the withdrawals themselves are taxed as income in retirement.",
          never: gapText + "Closing it with a <strong>Tax Never</strong> account (like a Roth IRA) means paying tax on the contribution now, but qualifying growth and withdrawals are never taxed again, often the strongest outcome if you expect to be in the same or a higher tax bracket later."
        };
        return map[choice];
      }

      root.querySelectorAll('[data-gapchoice]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          root.querySelectorAll('[data-gapchoice]').forEach(function (b) { b.classList.toggle("active", b === btn); });
          const answerEl = el("gapQuestionAnswer");
          answerEl.innerHTML = gapAnswerFor(btn.dataset.gapchoice);
          answerEl.style.display = "block";
        });
      });

      function marketAnswerFor(choice) {
        const amount = mlData.amount || Number(el("mlAmount").value) || 0;
        const lossAt30 = amount * 0.30;
        const map = {
          variable: "In a <strong>Variable Market</strong> account, this money is fully exposed to swings like the ones above &mdash; a repeat of 2008 or 2022 could mean a real, on-paper loss of roughly " + money(lossAt30) + " on " + money(amount) + " before it has a chance to recover. The tradeoff is full participation in the market's upside too, with no cap on how much it could grow.",
          fixed: "In a <strong>Fixed Market</strong> account, " + money(amount) + " would be shielded from downturns like the ones above entirely &mdash; the balance doesn't fall when the market does. The tradeoff is a lower, capped rate of growth, so it's unlikely to keep pace with the market's best years either.",
          index: "In an <strong>Index Market</strong> strategy, " + money(amount) + " is typically protected by a floor (often 0%) during downturns like the ones above, so a crash year wouldn't reduce the balance the way it would in a variable account. In exchange, growth in strong years is usually capped, so it won't fully capture the market's best upside either."
        };
        return map[choice];
      }

      root.querySelectorAll('[data-marketchoice]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          root.querySelectorAll('[data-marketchoice]').forEach(function (b) { b.classList.toggle("active", b === btn); });
          const answerEl = el("marketQuestionAnswer");
          answerEl.innerHTML = marketAnswerFor(btn.dataset.marketchoice);
          answerEl.style.display = "block";
        });
      });



      function updateSnapshotGap(){
        const d=lastData2||{};
        const gap=Math.max(0,(d.goalNestEgg||0)-(d.projectedBalance||0));
        const g=el("snapshotGap"); if(g) g.textContent=money(gap);
      }
      const taxChoice=el("taxFutureChoice");
      if(taxChoice){
        taxChoice.addEventListener("change",function(){
          const adv=el("taxAdvancedRates");
          if(this.value==="know"){adv.classList.remove("hidden-tax-inputs");}
          else{
            adv.classList.add("hidden-tax-inputs");
            el("curTaxRate").value=22;
            el("futTaxRate").value=this.value==="higher"?28:(this.value==="lower"?18:22);
            update();
          }
        });
      }

      const decisionMessages = {
        protect: "You chose protection. Next, compare how much of your retirement money is exposed to a major market loss and whether your family income is protected if life interrupts the plan.",
        grow: "You chose your retirement goal. Use the monthly savings slider to see how a manageable increase could improve your projection.",
        work: "You chose to make your money work harder. Consider whether your current accounts' rates of return and tax treatment are doing as much as they could \u2014 small differences in rate or tax bucket compound significantly over the years ahead.",
        tax: "You chose tax control. Review your Tax Now, Tax Later, and Tax-Free Later mix to see how much of your future money may still have a tax bill attached.",
        review: "Review your retirement gap, market exposure, tax position, and protection needs together before deciding what to change."
      };
      root.querySelectorAll('[data-decision]').forEach(function(btn){
        btn.addEventListener('click', function(){
          root.querySelectorAll('[data-decision]').forEach(function(b){ b.classList.toggle('active', b === btn); });
          const r = el('decisionResponse');
          r.innerHTML = '<strong>Your priority:</strong> ' + decisionMessages[btn.dataset.decision];
          r.style.display = 'block';
        });
      });

      root.querySelectorAll('input[type="number"]').forEach(function (input) {
        input.addEventListener("input", update);
      });
      el("extraContribSlider").addEventListener("input", updateExtraContribution);

      let chaosNumbers = {};

      function updateChaosNumbers() {
        updateSnapshotGap();
        const d = lastData2;
        if (!d.projectedBalance && d.projectedBalance !== 0) return;

        const marketLoss = (d.marketExposedBalance || 0) * 0.20;
        el("chaosNumMarket").textContent = "-" + money(marketLoss);

        const curTaxRate = number("curTaxRate") / 100;
        const futTaxRate = number("futTaxRate") / 100;
        const months = d.yearsToRetire * 12;

        // Use the real per-bucket math (same as the Tax Buckets card) instead of a generic hypothetical,
        // so this number always agrees with what's shown below.
        const nowValue = futureValue(d.savingsCatTotals.now, 0, d.catRates.now * (1 - curTaxRate), months) +
                          futureValue(0, d.catTotals.now, d.catRates.now * (1 - curTaxRate), months);
        const laterGross = futureValue(d.savingsCatTotals.later, 0, d.catRates.later, months) +
                            futureValue(0, d.catTotals.later, d.catRates.later, months);
        const laterValue = laterGross * (1 - futTaxRate);
        const neverValue = futureValue(d.savingsCatTotals.never, 0, d.catRates.never, months) +
                            futureValue(0, d.catTotals.never, d.catRates.never, months);

        const bestValue = Math.max(nowValue, laterValue, neverValue);
        const taxLossPct = bestValue > 0 ? ((bestValue - laterValue) / bestValue) * 100 : 0;
        el("chaosNumTaxes").textContent = Math.round(Math.max(0, taxLossPct)) + "%";

        const annualIncome = number("annualIncome");
        const deathAmount = annualIncome * 10;
        el("chaosNumDisability").textContent = money(annualIncome);
        el("chaosNumDeath").textContent = money(deathAmount);

        chaosNumbers = { marketLoss, taxLossPct, annualIncome, deathAmount, marketExposedBalance: d.marketExposedBalance || 0 };

        // refresh the outcome panel too, if one is currently showing
        const activeBtn = root.querySelector(".chaos-choice-btn.active");
        if (activeBtn) showChaosOutcome(activeBtn.dataset.chaos);
      }

      function chaosOutcomeFor(key) {
        const n = chaosNumbers;
        const map = {
          market: {
            tag: "MARKET CRASH",
            body: "A 20% market downturn could reduce the market-exposed portion of your projected balance by about <strong>" + money(n.marketLoss) + "</strong>. Cash, CDs, and annuities aren't included in this estimate.",
            cover: "Consider keeping a portion of your savings in less volatile options as you get closer to retirement, so a downturn right before or after you retire doesn't force you to withdraw at a loss.",
            target: "#recovery-section",
            cta: "Try the Market Loss calculator ↓"
          },
          taxes: {
            tag: "HIGHER TAXES",
            body: "Choosing a fully taxable strategy over your strongest tax-advantaged option could mean losing about <strong>" + Math.round(Math.max(0, n.taxLossPct)) + "%</strong> more of this money to taxes.",
            cover: "Consider directing new contributions toward tax-advantaged accounts, and revisit the mix as tax law and your income change over time.",
            target: "#tax-timing-section",
            cta: "Try the Tax Timing calculator ↓"
          },
          disability: {
            tag: "SICKNESS / DISABILITY",
            body: "About <strong>" + money(n.annualIncome) + "</strong>, a full year of your income, could be at risk if you couldn't work due to illness or injury.",
            cover: "Consider whether disability insurance, or an emergency fund close to this amount, could replace your income if you were unable to work.",
            target: "#disability-section",
            cta: "Try the Paycheck Protection calculator ↓"
          },
          death: {
            tag: "PREMATURE DEATH",
            body: "About <strong>" + money(n.deathAmount) + "</strong> of future earnings over 10 years could disappear if you weren't there to provide it.",
            cover: "Consider whether life insurance coverage close to this amount would let your family's plan continue without interruption. The question: would the family plan continue without your income?",
            target: "#death-section",
            cta: "Try the DIME Needs calculator ↓"
          }
        };
        return map[key];
      }

      function showChaosOutcome(key) {
        const data = chaosOutcomeFor(key);
        el("chaosOutcomeTag").textContent = data.tag;
        el("chaosOutcomeBody").innerHTML = data.body;
        el("chaosOutcomeCover").innerHTML = "<strong>What it takes to cover yourself:</strong> " + data.cover;
        const outBtn = el("chaosOutcomeBtn");
        outBtn.textContent = data.cta;
        outBtn.href = data.target;
        el("chaosOutcome").classList.add("show");
      }

      root.querySelectorAll(".chaos-choice-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          root.querySelectorAll(".chaos-choice-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
          showChaosOutcome(btn.dataset.chaos);
        });
      });

      function populateMiniCalc(id) {
        const d = lastData2;

        if (id === "recovery-section") {
          if (d.marketExposedBalance) {
            const rounded = Math.round(d.marketExposedBalance);
            el("mlAmount").value = rounded;
            el("mlAmountSlider").value = Math.min(1000000, rounded);
          }
          updateMarketLoss();

        } else if (id === "tax-timing-section") {
          if (d.currentSavings) el("ttAmount").value = Math.round(d.currentSavings);
          if (d.curAge) el("ttCurAge").value = d.curAge;
          if (d.retireAge) el("ttRetAge").value = d.retireAge;
          if (d.growth) el("ttGrowth").value = (d.growth * 100).toFixed(1);
          const curRateEl = el("curTaxRate"), futRateEl = el("futTaxRate");
          if (curRateEl && curRateEl.value) el("ttRateNow").value = curRateEl.value;
          if (futRateEl && futRateEl.value) el("ttRateRet").value = futRateEl.value;
          updateTaxTiming();

        } else if (id === "disability-section") {
          if (d.currentSavings) el("pdSavings").value = Math.round(d.currentSavings);
          updatePaycheckProtection();

        } else if (id === "death-section") {
          const incomeEl = el("annualIncome");
          const income = incomeEl ? Number(incomeEl.value) || 0 : 0;
          if (income) el("dimeIncome").value = income;
          if (d.currentSavings) el("dimeSavingsInput").value = Math.round(d.currentSavings);
          updateDime();
        }
      }

      const openedPanels = {};
      function showMcPanel(id) {
        root.querySelectorAll(".mc-panel").forEach(function (p) { p.classList.remove("show"); });
        const target = el(id);
        if (target) {
          if (!openedPanels[id]) {
            populateMiniCalc(id);
            openedPanels[id] = true;
          }
          target.classList.add("show");
          setTimeout(function () { target.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
        }
      }

      el("chaosOutcomeBtn").addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href").replace("#", "");
        showMcPanel(targetId);
      });

      root.querySelectorAll(".mc-close-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const panel = el(btn.dataset.closeTarget);
          if (panel) panel.classList.remove("show");
        });
      });


      root.querySelectorAll(".info-btn").forEach(function (button) {
        button.addEventListener("click", function () {
          const target = el(button.dataset.tip);
          const open = target.classList.contains("open");
          root.querySelectorAll(".wp-tip").forEach(function (t) { t.classList.remove("open"); });
          if (!open) target.classList.add("open");
        });
      });

      function generatePDFReport() {
        const nameEl = el("clientName2"), emailEl = el("clientEmail2"), phoneEl = el("clientPhone2");
        const statusEl = el("reportStatus2"), btn = el("generateReportBtn2");
        const name = nameEl.value.trim(), emailAddr = emailEl.value.trim(), phone = phoneEl.value.trim();

        if (!name || !emailAddr || !phone) {
          statusEl.textContent = "Please enter your name, email, and phone number before downloading your report.";
          statusEl.className = "wp-report-status err";
          return;
        }

        statusEl.className = "wp-report-status";
        btn.disabled = true;
        btn.textContent = "Building your report...";

        if (!window.jspdf || !window.jspdf.jsPDF) {
          statusEl.textContent = "The PDF tool didn't load correctly. Please refresh the page and try again — if this keeps happening, try a different browser or check your connection.";
          statusEl.className = "wp-report-status err";
          btn.disabled = false;
          btn.textContent = "Download PDF Report";
          return;
        }

        try {

        const d = lastData2;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: "pt", format: "letter" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 50;
        let y = 60;
        const navy = [27, 42, 74], muted = [107, 114, 128];

        function checkPageBreak(space) { if (y + space > 760) { doc.addPage(); y = 60; } }
        function heading(text) {
          checkPageBreak(30);
          doc.setFont("times", "bold"); doc.setFontSize(15); doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.text(text, margin, y); y += 10;
          doc.setDrawColor(230, 227, 216); doc.line(margin, y, pageWidth - margin, y); y += 20;
        }
        function row(label, value) {
          checkPageBreak(20);
          doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(60, 60, 60);
          doc.text(label, margin, y);
          doc.setFont("helvetica", "bold"); doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.text(value, pageWidth - margin, y, { align: "right" });
          y += 18;
        }
        function paragraph(text) {
          checkPageBreak(40);
          doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(muted[0], muted[1], muted[2]);
          const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
          doc.text(lines, margin, y); y += lines.length * 13 + 10;
        }

        doc.setFillColor(navy[0], navy[1], navy[2]); doc.rect(0, 0, pageWidth, 90, "F");
        doc.setFont("times", "bold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
        doc.text("WEALTHDEMO", margin, 42);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(220, 220, 230);
        doc.text("Financial Assessment Intelligence", margin, 60);
        doc.setFontSize(10); doc.text("Building Your Retirement Report", margin, 76);

        y = 120;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(60, 60, 60);
        doc.text("Prepared for: " + name, margin, y); y += 16;
        doc.setTextColor(muted[0], muted[1], muted[2]); doc.setFontSize(9.5);
        doc.text(emailAddr + "   |   " + phone, margin, y); y += 30;

        heading("Your Savings Today");
        const typeLabels = {
          "now-checking": "Checking Account (Tax Now)",
          "now-savings": "Savings / Money Market (Tax Now)",
          "now-cd": "Certificate of Deposit (Tax Now)",
          "now-brokerage": "Taxable Brokerage Account (Tax Now)",
          "now-stocks": "Individual Stocks (Tax Now)",
          "now-bonds": "Bonds / Bond Funds (Tax Now)",
          "now-crypto": "Cryptocurrency (Tax Now)",
          "now-realestate": "Real Estate / Rental Property (Tax Now)",
          "later-401k": "401(k) (Tax Later)",
          "later-403b": "403(b) (Tax Later)",
          "later-tsp": "TSP (Tax Later)",
          "later-ira": "Traditional IRA (Tax Later)",
          "later-sepira": "SEP IRA (Tax Later)",
          "later-simpleira": "SIMPLE IRA (Tax Later)",
          "later-annuity": "Tax-Deferred Annuity (Tax Later)",
          "never-life": "Cash Value Life Insurance (Tax-Free Later)",
          "never-roth401k": "Roth 401(k) (Tax-Free Later)",
          "never-rothira": "Roth IRA (Tax-Free Later)",
          "never-hsa": "Health Savings Account (Tax-Free Later)",
          "never-529": "529 Education Plan (Tax-Free Later)"
        };
        row("Total Current Savings", money(d.currentSavings));
        d.savingsItems.forEach(function (it) {
          if (it.balance > 0) row("  \u2014 " + (typeLabels[it.type] || it.type), money(it.balance));
        });
        d.items.forEach(function (it) {
          if (it.isIul && (it.grossMonthly > 0 || it.grossLump > 0)) {
            if (it.grossMonthly > 0) {
              row(typeLabels[it.type] || it.type, money(it.grossMonthly) + "/mo premium at " + (it.rate * 100).toFixed(1) + "%");
              row("  \u2014 Cash Value Portion (" + it.cvPct + "%)", money(it.monthly) + "/mo used in projections");
            } else {
              row(typeLabels[it.type] || it.type, "at " + (it.rate * 100).toFixed(1) + "%");
            }
            if (it.grossLump > 0) {
              row("  \u2014 Lump Sum Transfer In", money(it.grossLump));
              row("  \u2014 After 10% Premium Expense Charge", money(it.lump) + " used in projections");
            }
          } else if (it.monthly > 0) {
            row(typeLabels[it.type] || it.type, money(it.monthly) + "/mo at " + (it.rate * 100).toFixed(1) + "%");
          }
        });
        row("Employer Match", money(d.employerMatch) + "/mo");
        row("Saving Each Month (Growth-Contributing)", money(d.totalMonthly) + "/mo");
        row("Blended Assumed Growth Rate", (d.growth * 100).toFixed(1) + "%");
        row("Current Age / Retirement Age", d.curAge + " / " + d.retireAge);

        // ===== PAGE 2: CHILDREN & COLLEGE =====
        doc.addPage(); y = 60;
        heading("Page 2 of 7 — Children & College");
        const collegeYesBtn = root.querySelector('[data-college-choice="yes"].active');
        const collegeNoBtn = root.querySelector('[data-college-choice="no"].active');
        if (collegeYesBtn) {
          const collegeRows = []; let totalCollegeCost = 0, totalCollegeSavings = 0;
          root.querySelectorAll('#collegeChildren .college-child').forEach(function (child, i) {
            const nameInput = child.querySelector('.cf-name');
            const ageInput = child.querySelector('.cf-age');
            const savingsInput = child.querySelector('.cf-savings');
            const monthlyInput = child.querySelector('.cf-monthly');
            const childName = (nameInput && nameInput.value.trim()) || ('Child ' + (i + 1));
            const age = Math.min(17, Math.max(0, Number(ageInput ? ageInput.value : 0) || 0));
            const current = Math.max(0, Number(savingsInput ? savingsInput.value : 0) || 0);
            const monthly = Math.max(0, Number(monthlyInput ? monthlyInput.value : 0) || 0);
            const years = Math.max(18 - age, 0);
            const cost = 30000 * 4 * Math.pow(1.05, years);
            const r = .06 / 12, n = years * 12;
            const projected = current * Math.pow(1 + r, n) + (n > 0 ? monthly * ((Math.pow(1 + r, n) - 1) / r) : 0);
            const gap = Math.max(cost - projected, 0);
            totalCollegeCost += cost; totalCollegeSavings += projected;
            collegeRows.push({ childName, age, current, monthly, cost, projected, gap });
          });
          row("Children Under 18", "Yes");
          collegeRows.forEach(function (c) {
            checkPageBreak(115);
            doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(navy[0], navy[1], navy[2]);
            doc.text(c.childName + " — Age " + c.age, margin, y); y += 18;
            row("  Current College Savings", money(c.current));
            row("  Monthly College Savings", money(c.monthly) + "/mo");
            row("  Estimated Future College Cost", money(c.cost));
            row("  Projected College Savings", money(c.projected));
            doc.setTextColor(190, 35, 35); doc.setFont("helvetica", "bold");
            doc.text("  Education Gap", margin, y); doc.text(money(c.gap), pageWidth - margin, y, { align: "right" }); y += 20;
          });
          row("Total Estimated College Cost", money(totalCollegeCost));
          row("Total Projected College Savings", money(totalCollegeSavings));
          row("TOTAL EDUCATION GAP", money(Math.max(totalCollegeCost - totalCollegeSavings, 0)));
          paragraph("College illustration assumes $30,000 annual cost today, four years of college, 5% annual education-cost inflation, and 6% assumed savings growth.");
        } else if (collegeNoBtn) {
          row("Children Under 18", "No / College planning skipped");
        } else {
          row("Children Under 18", "Not answered");
        }

        // ===== PAGE 3: PROTECTION =====
        doc.addPage(); y = 60;
        heading("Page 3 of 7 — Protection");
        const hasMortgagePdf = !!root.querySelector('[data-mortgage-choice="yes"].active');
        const protectionYearsPdf = Number(root.querySelector('[data-protection-years].active')?.getAttribute('data-protection-years')) || 1;
        const mortgageBalance = hasMortgagePdf ? number('protMortgageBalance') : 0;
        const mortgageMonthly = hasMortgagePdf ? number('protMortgageMonthly') : 0;
        const otherBills = number('protBills');
        const continuingIncome = number('protContinue');
        const emergencySavings = number('protSavings');
        const monthlyNeed = Math.max(0, otherBills + mortgageMonthly - continuingIncome);
        const billsToCover = monthlyNeed * protectionYearsPdf * 12;
        const protectionGap = Math.max(0, billsToCover - emergencySavings);
        row("Current Mortgage", hasMortgagePdf ? "Yes" : "No");
        if (hasMortgagePdf) {
          row("Monthly Mortgage Payment", money(mortgageMonthly) + "/mo");
          row("Remaining Mortgage Balance", money(mortgageBalance));
        }
        row("Essential Monthly Bills (excluding mortgage)", money(otherBills) + "/mo");
        row("Monthly Income That Would Continue", money(continuingIncome) + "/mo");
        row("Emergency Savings Available", money(emergencySavings));
        row("Income Protection Period Selected", protectionYearsPdf + (protectionYearsPdf === 1 ? " year" : " years"));
        row("Household Bills to Cover", money(billsToCover));
        row("Estimated Income Interruption Gap", money(protectionGap));
        paragraph(hasMortgagePdf
          ? "The protection picture includes two separate objectives: the remaining mortgage obligation and the household income-interruption gap."
          : "No mortgage was selected, so the protection picture focuses on the household income-interruption gap.");
        paragraph("Living benefits, when available, are generally an acceleration of a life insurance policy's death benefit and require a qualifying event. Availability and terms vary by carrier, policy, rider, and state.");

        // ===== PAGE 4: LEGACY =====
        doc.addPage(); y = 60;
        heading("Page 4 of 7 — Your Legacy");
        const legacyYesBtn = root.querySelector('[data-legacy-choice="yes"].active');
        const legacyNoBtn = root.querySelector('[data-legacy-choice="no"].active');
        if (legacyYesBtn) {
          const legacyAssets = Math.max(0, Number(document.getElementById('legacyOwn')?.value) || 0);
          const legacyLiabilities = Math.max(0, Number(document.getElementById('legacyOwe')?.value) || 0);
          const legacyInsurance = Math.max(0, Number(document.getElementById('legacyInsurance')?.value) || 0);
          const legacyGoal = Math.max(0, Number(document.getElementById('legacyGoal')?.value) || 0);
          const familyReceives = Math.max(0, legacyAssets + legacyInsurance - legacyLiabilities);
          const legacyGap = Math.max(0, legacyGoal - familyReceives);
          row("Legacy Matters", "Yes");
          row("Assets", money(legacyAssets));
          row("Liabilities", money(legacyLiabilities));
          row("Existing Life Insurance", money(legacyInsurance));
          row("WHAT YOUR FAMILY MAY RECEIVE", money(familyReceives));
          row("Your Legacy Goal", money(legacyGoal));
          row("Potential Legacy Gap", money(legacyGap));
          paragraph("Legacy tools reviewed in WEALTHDEMO include a will, a trust, and Transfer on Death / beneficiary designations. These tools are not interchangeable; which document controls depends on the asset, ownership, beneficiary designations, state law, and how the estate plan is structured.");
          paragraph("Will: can state how probate assets should be distributed and can name guardians for minor children. Trust: can add instructions and control over how and when certain assets are managed or distributed. TOD / beneficiary designation: may allow certain assets to pass directly to named beneficiaries, depending on the asset and state rules.");
        } else if (legacyNoBtn) {
          row("Legacy Matters", "Not a priority right now / skipped");
        } else {
          row("Legacy Matters", "Not answered");
        }

        // ===== PAGE 5: YOUR FUTURE =====
        doc.addPage(); y = 60;
        heading("Page 5 of 7 — Your Future");
        heading("Your Projected Path");
        row("Time to Retirement", String(d.yearsToRetire));
        row("Projected at Retirement", money(d.projectedBalance));
        row("Estimated Nest Egg Needed", money(d.goalNestEgg));
        row("Goal Today / Goal at Retirement (Inflated)", money(d.goalIncome) + "/mo / " + money(d.futureGoalIncome) + "/mo");
        row("Expected Social Security", money(d.socialSecurityMonthly || 0) + "/mo");
        row("Estimated Provisional Income", money(d.ssProvisionalIncome || 0) + "/yr");
        row("Social Security Potentially Taxable", money(d.ssTaxableAnnual || 0) + "/yr");
        row("Estimated After-Tax Social Security", money(d.ssNetMonthly || 0) + "/mo");
        row("Income Savings May Need to Produce", money(d.portfolioIncomeNeed || d.futureGoalIncome) + "/mo");
        row("Assumed Inflation Rate", (d.inflation * 100).toFixed(1) + "%");
        paragraph(d.onTrack
          ? "Based on your current savings rate and assumed growth, you are projected to meet or exceed your estimated goal by retirement age."
          : "Based on your current savings rate and assumed growth, you are projected to fall short of your estimated goal by about " + money(Math.max(0, d.goalNestEgg - d.projectedBalance)) + ".");

        // ===== PAGE 6: YOUR RISKS =====
        doc.addPage(); y = 60;
        heading("Page 6 of 7 — Your Risks");
        const taxChoice = el("taxFutureChoice");
        const taxChoiceText = taxChoice && taxChoice.options[taxChoice.selectedIndex] ? taxChoice.options[taxChoice.selectedIndex].text : "Not selected";
        row("Expected Tax Environment in Retirement", taxChoiceText);
        const taxDecision = root.querySelector('.tax-btn.active');
        row("Preferred Tax Timing", taxDecision ? taxDecision.querySelector('strong').textContent.trim() : "Not selected");
        row("Estimated Provisional Income", money(d.ssProvisionalIncome || 0) + "/yr");
        row("Social Security Potentially Taxable", money(d.ssTaxableAnnual || 0) + "/yr");
        row("Market-Exposed Balance Today", money(d.marketExposedBalance || 0));
        paragraph("This page reviews tax exposure, market risk, income interruption, and premature-death considerations. Any risk calculator the client explored is printed below with its current values.");

        if (openedPanels["recovery-section"] && mlData.amount) {
          checkPageBreak(120);
          heading("Market Loss Illustration");
          row("Amount Invested", money(mlData.amount));
          row("Percentage Lost", mlData.pct + "%");
          row("Value After Loss", money(mlData.after));
          row("Gain Needed to Break Even", mlData.recoveryPct.toFixed(1) + "%");
        }

        if (openedPanels["tax-timing-section"] && ttData.amount) {
          checkPageBreak(140);
          heading("Tax Timing Illustration");
          row("Money Available Today", money(ttData.amount));
          row("Current Age / Retirement Age", ttData.curAge + " / " + ttData.retAge);
          row("Tax Now \u2014 Estimated Amount You Keep", money(ttData.nowValue));
          row("Tax Later \u2014 Estimated Amount You Keep", money(ttData.laterNet));
          row("Tax-Free Later \u2014 Estimated Amount You Keep", money(ttData.freeValue));
        }

        if (openedPanels["disability-section"] && (pdData.bills || pdData.savings)) {
          checkPageBreak(140);
          heading("Income Protection Illustration");
          row("Essential Monthly Bills", money(pdData.bills) + "/mo");
          row("Monthly Gap If Paycheck Stopped", money(pdData.gap) + "/mo");
          row("Emergency Fund Only \u2014 Months Covered", (isFinite(pdData.efMonths) ? pdData.efMonths.toFixed(1) : "\u221e"));
          row("Fund + Income Protection \u2014 Months Covered", (isFinite(pdData.combinedMonths) ? pdData.combinedMonths.toFixed(1) : "\u221e"));
        }

        if (openedPanels["death-section"] && dimeData.dimeTotal) {
          checkPageBreak(160);
          heading("DIME Life Insurance Needs Illustration");
          row("Outstanding Debts", money(dimeData.debt));
          row("Income Replacement (" + dimeData.years + " yrs)", money(dimeData.incomeTotal));
          row("Remaining Mortgage Balance", money(dimeData.mortgage));
          row("Education (" + dimeData.kids + " children)", money(dimeData.eduTotal));
          row("Estimated DIME Need", money(dimeData.dimeTotal));
          row("Estimated Additional Coverage Gap", money(dimeData.coverageGap));
        }

        // ===== PAGE 7: YOUR OPTIONS =====
        doc.addPage(); y = 60;
        heading("Page 7 of 7 — Your Options");
        const selectedDecision = root.querySelector('.decision-btn.active');
        const decisionLabel = selectedDecision ? selectedDecision.textContent.trim() : "No option selected yet";
        row("Client's Selected Priority", decisionLabel);
        const actionGapNode = el("actionGap");
        const actionMonthlyNode = el("actionMonthly");
        row("Retirement Gap Shown", actionGapNode ? actionGapNode.textContent.trim() : money(Math.max(0, d.goalNestEgg - d.projectedBalance)));
        row("Possible Additional Monthly Saving", actionMonthlyNode ? actionMonthlyNode.textContent.trim() : "Not calculated");
        const decisionResponseNode = el("decisionResponse");
        if (decisionResponseNode && decisionResponseNode.textContent.trim()) paragraph(decisionResponseNode.textContent.trim());
        paragraph("Use this complete WEALTHDEMO report as a conversation guide. The next step is to review the areas that matter most to the client and evaluate appropriate strategies with qualified professionals.");

        checkPageBreak(80); y += 10;
        doc.setDrawColor(232, 163, 61); doc.setLineWidth(1.5);
        doc.rect(margin, y, pageWidth - margin * 2, 50);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(navy[0], navy[1], navy[2]);
        doc.text("Questions About This Report?", margin + 14, y + 20);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
        doc.text("WEALTHDEMO  ·  817-917-1221", margin + 14, y + 38);
        y += 70;

        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(150, 150, 150);
        const disclaimer = "For educational purposes only. This report does not constitute financial, tax, or legal advice and should not be relied upon as such. All figures are hypothetical estimates based solely on the information provided and simplified assumptions; actual results will vary and are not guaranteed. Consult a licensed financial advisor, tax professional, and/or attorney before making any financial decision. WEALTHDEMO, its owners, and its affiliates are not responsible for any decisions made, or outcomes resulting from, the use of this report or reliance on the information it provides.";
        const discLines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
        checkPageBreak(discLines.length * 11 + 10);
        doc.text(discLines, margin, y);

        doc.save("WEALTHDEMO-Financial-Report-" + name.replace(/\s+/g, "-") + ".pdf");
        statusEl.textContent = "Your PDF report has been downloaded.";
        statusEl.className = "wp-report-status ok";
        btn.disabled = false;
        btn.textContent = "Download PDF Report";

        } catch (err) {
          statusEl.textContent = "Something went wrong building your PDF. Please try again in a moment.";
          statusEl.className = "wp-report-status err";
          btn.disabled = false;
          btn.textContent = "Download PDF Report";
        }
      }

      // ===== Market Loss calculator =====
      function updateMarketLoss() {
        const amount = Math.max(0, Number(el("mlAmount").value) || 0);
        const pct = Math.min(90, Math.max(1, Number(el("mlPct").value) || 0));
        el("mlAmountSlider").value = Math.min(1000000, amount);
        el("mlPctSlider").value = pct;

        const lost = amount * pct / 100;
        const after = amount - lost;
        const recoveryPct = after > 0 ? (lost / after * 100) : 0;

        el("mlStarting").textContent = money(amount);
        el("mlLost").textContent = money(lost);
        el("mlAfter").textContent = money(after);
        el("mlGain").textContent = recoveryPct.toFixed(1) + "%";
        el("mlBandLab").textContent = "You Lost " + pct + "%...";
        el("mlBandNum").textContent = recoveryPct.toFixed(1) + "% needed to get back to even";
        el("mlLossPctLab").textContent = pct + "%";
        el("mlGainPctLab").textContent = recoveryPct.toFixed(1) + "%";
        el("mlLossBar").style.width = Math.min(100, pct) + "%";
        el("mlGainBar").style.width = Math.min(100, recoveryPct) + "%";
        el("mlCallout").innerHTML = "On a " + money(amount) + " investment, a " + pct + "% loss takes you down to " +
          money(after) + ". To climb back to " + money(amount) + ", you need a <strong>" + recoveryPct.toFixed(1) + "%</strong> gain.";

        mlData = { amount, pct, lost, after, recoveryPct };
      }
      ["mlAmount", "mlPct"].forEach(function (id) { el(id).addEventListener("input", updateMarketLoss); });
      el("mlAmountSlider").addEventListener("input", function () { el("mlAmount").value = this.value; updateMarketLoss(); });
      el("mlPctSlider").addEventListener("input", function () { el("mlPct").value = this.value; updateMarketLoss(); });

      // ===== Tax Timing calculator =====
      function updateTaxTiming() {
        const amount = Math.max(0, Number(el("ttAmount").value) || 0);
        const curAge = Math.max(0, Number(el("ttCurAge").value) || 0);
        const retAge = Math.max(curAge, Number(el("ttRetAge").value) || 0);
        const rateNow = Math.min(60, Math.max(0, Number(el("ttRateNow").value) || 0)) / 100;
        const growth = Math.min(20, Math.max(0, Number(el("ttGrowth").value) || 0)) / 100;
        const rateRet = Math.min(60, Math.max(0, Number(el("ttRateRet").value) || 0)) / 100;
        const years = retAge - curAge;

        el("ttSameNote").innerHTML = "Each strategy starts with the same <strong>" + money(amount) + "</strong> and has <strong>" + years + " years</strong> to grow.";

        const taxToday = amount * rateNow;
        const afterTax = amount - taxToday;
        const afterTaxGrowth = growth * (1 - rateNow);
        const nowValue = afterTax * Math.pow(1 + afterTaxGrowth, years);

        const laterGross = amount * Math.pow(1 + growth, years);
        const laterTax = laterGross * rateRet;
        const laterNet = laterGross - laterTax;

        const freeValue = afterTax * Math.pow(1 + growth, years);

        el("ttNowStart").textContent = money(amount);
        el("ttNowTax").textContent = "-" + money(taxToday);
        el("ttNowGrowing").textContent = money(afterTax);
        el("ttNowFinal").textContent = money(nowValue);

        el("ttLaterStart").textContent = money(amount);
        el("ttLaterGross").textContent = money(laterGross);
        el("ttLaterTax").textContent = "-" + money(laterTax);
        el("ttLaterFinal").textContent = money(laterNet);

        el("ttFreeStart").textContent = money(amount);
        el("ttFreeTax").textContent = "-" + money(taxToday);
        el("ttFreeFinal").textContent = money(freeValue);

        ttData = { amount, curAge, retAge, years, rateNow, growth, rateRet, nowValue, laterNet, freeValue };
      }
      ["ttAmount", "ttCurAge", "ttRetAge", "ttRateNow", "ttGrowth", "ttRateRet"].forEach(function (id) {
        el(id).addEventListener("input", updateTaxTiming);
      });

      // ===== Paycheck Protection (Disability) calculator =====
      function pdDots() {
        let html = "";
        for (let i = 0; i < 12; i++) html += '<div class="mc-dot"></div>';
        return html;
      }
      function updatePaycheckProtection() {
        const bills = Math.max(0, Number(el("pdBills").value) || 0);
        const cont = Math.max(0, Number(el("pdContinue").value) || 0);
        const savings = Math.max(0, Number(el("pdSavings").value) || 0);
        const benefit = Math.max(0, Number(el("pdBenefit").value) || 0);
        const goal = Number(el("pdGoal").value) || 12;

        const gap = Math.max(0, bills - cont);
        const efMonths = gap > 0 ? savings / gap : (savings > 0 ? Infinity : 0);
        const combinedMonths = gap > 0 ? (savings + benefit) / gap : Infinity;
        const neededForGoal = gap * goal;
        const totalResources = savings + benefit;

        el("pdGapNote").innerHTML = "Monthly gap if the paycheck stopped: " + money(bills) + " in bills minus " + money(cont) +
          " still coming in = <strong>" + money(gap) + "/month</strong> that needs to be covered.";

        el("pdEfMonths").textContent = (isFinite(efMonths) ? efMonths.toFixed(1) : "\u221e") + " months";
        const efFilled = gap > 0 ? Math.round(Math.min(efMonths / goal, 1) * 12) : 12;
        const efDotsEl = el("pdEfDots");
        efDotsEl.innerHTML = pdDots();
        efDotsEl.querySelectorAll(".mc-dot").forEach(function (d, i) { d.classList.toggle("fill-red", i < efFilled); });
        el("pdEfNote").textContent = efMonths >= goal ? "Your goal is covered by savings alone." : "Savings may run out during month " + (Math.floor(efMonths) + 1) + ".";
        el("pdEfNeed").textContent = money(neededForGoal);

        el("pdCombMonths").textContent = (isFinite(combinedMonths) ? combinedMonths.toFixed(1) : "\u221e") + " months";
        const combFilled = gap > 0 ? Math.round(Math.min(combinedMonths / goal, 1) * 12) : 12;
        const combDotsEl = el("pdCombDots");
        combDotsEl.innerHTML = pdDots();
        combDotsEl.querySelectorAll(".mc-dot").forEach(function (d, i) { d.classList.toggle("fill-green", i < combFilled); });
        el("pdCombNote").textContent = combinedMonths >= goal ? "Your " + goal + "-month goal is covered in this illustration." : "Combined resources may run out during month " + (Math.floor(combinedMonths) + 1) + ".";
        el("pdCombTotal").textContent = money(totalResources);

        pdData = { bills, cont, savings, benefit, goal, gap, efMonths, combinedMonths, neededForGoal, totalResources };

        updatePdLeftover();
      }
      function updatePdLeftover() {
        const amt = Math.max(0, Number(el("pdLeftover").value) || 0);
        const yrs = Math.max(0, Number(el("pdYears").value) || 0);
        el("pd6pct").textContent = money(amt * Math.pow(1.06, yrs));
        el("pd8pct").textContent = money(amt * Math.pow(1.08, yrs));
      }
      ["pdBills", "pdContinue", "pdSavings", "pdBenefit"].forEach(function (id) { el(id).addEventListener("input", updatePaycheckProtection); });
      el("pdGoal").addEventListener("change", updatePaycheckProtection);
      ["pdLeftover", "pdYears"].forEach(function (id) { el(id).addEventListener("input", updatePdLeftover); });

      // ===== DIME (Family Protection) calculator =====
      function updateDime() {
        const debt = Math.max(0, Number(el("dimeDebt").value) || 0);
        const income = Math.max(0, Number(el("dimeIncome").value) || 0);
        const mortgage = Math.max(0, Number(el("dimeMortgage").value) || 0);
        const kids = Math.max(0, Number(el("dimeKids").value) || 0);
        const years = Math.max(1, Number(el("dimeYears").value) || 1);
        const eduEach = Math.max(0, Number(el("dimeEduEach").value) || 0);
        el("dimeYearsSlider").value = years;

        const incomeTotal = income * years;
        const eduTotal = kids * eduEach;
        const dimeTotal = debt + incomeTotal + mortgage + eduTotal;

        el("dimeDebtStat").textContent = money(debt);
        el("dimeIncomeStat").textContent = money(incomeTotal);
        el("dimeMortgageStat").textContent = money(mortgage);
        el("dimeEduStat").textContent = money(eduTotal);
        el("dimeNeedBand").textContent = money(dimeTotal);

        const existingCov = Math.max(0, Number(el("dimeExistingCov").value) || 0);
        const liquidAssets = Math.max(0, Number(el("dimeSavingsInput").value) || 0);
        const coverageGap = Math.max(0, dimeTotal - existingCov - liquidAssets);
        el("dimeGapBand").textContent = money(coverageGap);

        dimeData = { debt, income, mortgage, kids, years, eduEach, incomeTotal, eduTotal, dimeTotal, existingCov, liquidAssets, coverageGap };
      }
      ["dimeDebt", "dimeIncome", "dimeMortgage", "dimeKids", "dimeYears", "dimeEduEach", "dimeExistingCov", "dimeSavingsInput"].forEach(function (id) {
        el(id).addEventListener("input", updateDime);
      });
      el("dimeYearsSlider").addEventListener("input", function () { el("dimeYears").value = this.value; updateDime(); });


      el("generateReportBtn2").addEventListener("click", generatePDFReport);

      // Starter accounts, matching the tool's original defaults
      addSavingsItem("later-401k", 25000, 7);
      addContribItem("later-401k", 400, 7);
      addContribItem("now-brokerage", 0, 6);

      update();
      updateMarketLoss();
      updateTaxTiming();
      updatePaycheckProtection();
      updateDime();
    })();
    (function(){
      const root=document.getElementById('wp-building-retirement');
      const about=document.getElementById('guidedAbout');
      const future=document.getElementById('guidedFuture');
      const risks=document.getElementById('guidedRisks');
      const options=document.getElementById('guidedOptions');
      const college=document.getElementById('guidedCollege');
      const protection=document.getElementById('guidedProtection');
      const grid=root.querySelector('.wp-grid');
      const left=grid && grid.children[0];
      const right=grid && grid.children[1];
      if(!left||!right) return;

      const leftKids=Array.from(left.children);
      const aboutCards=leftKids.filter(x=>x.classList.contains('wp-card')).slice(0,3);
      aboutCards.forEach(x=>about.appendChild(x));
      const chaos=left.querySelector('.chaos-opener') || root.querySelector('.chaos-opener');

      const results=right.querySelector('.results-top');
      if(results) future.appendChild(results);
      const rightCards=Array.from(right.children);
      const onTrack=rightCards.find(x=>x.querySelector && x.querySelector('#trackStatusBox'));
      if(onTrack) future.appendChild(onTrack);
      const extra=rightCards.find(x=>x.querySelector && x.querySelector('#extraContribSlider'));
      if(extra) future.appendChild(extra);

      // Risks page order: taxes first, then the choose-an-area risk explorer.
      const tax=document.getElementById('tax-section'); if(tax) risks.appendChild(tax);
      if(chaos) risks.appendChild(chaos);
      ['recovery-section','tax-timing-section','death-section'].forEach(id=>{const x=document.getElementById(id);if(x) risks.appendChild(x);});
      const legacyDisability=document.getElementById('disability-section'); if(legacyDisability) legacyDisability.style.display='none';

      const action=document.getElementById('action-section'); if(action) options.appendChild(action);
      const reportCard=document.getElementById('generateReportBtn2')?.closest('.wp-card'); if(reportCard) options.appendChild(reportCard);

      // Children & College page: only reveal the calculator when it applies.
      const collegePlanner=document.getElementById('collegePlanner');
      const collegeNoMessage=document.getElementById('collegeNoMessage');
      const collegeChildren=document.getElementById('collegeChildren');
      const collegeResults=document.getElementById('collegeResults');
      const fmtCollege=n=>'$'+Math.round(Number(n)||0).toLocaleString('en-US');
      let collegeChildCount=0;

      function addCollegeChild(){
        collegeChildCount++;
        const wrap=document.createElement('div');
        wrap.className='college-child';
        wrap.innerHTML=`
          <h4>Child ${collegeChildCount}</h4>
          ${collegeChildCount>1?'<button type="button" class="college-remove">Remove</button>':''}
          <div class="college-grid">
            <div class="college-field"><label>Child Name</label><input type="text" class="cf-name" placeholder="Child ${collegeChildCount}"></div>
            <div class="college-field"><label>Current Age</label><input type="number" class="cf-age" min="0" max="17" value="10"></div>
            <div class="college-field"><label>Current College Savings ($)</label><input type="number" class="cf-savings" min="0" value="0"></div>
            <div class="college-field"><label>Monthly College Savings ($)</label><input type="number" class="cf-monthly" min="0" value="300"></div>
          </div>`;
        collegeChildren.appendChild(wrap);
        const remove=wrap.querySelector('.college-remove');
        if(remove) remove.addEventListener('click',()=>{wrap.remove();calculateCollege();});
      }

      function calculateCollege(){
        if(!collegeChildren) return;
        const rows=[]; let totalCost=0,totalSavings=0;
        collegeChildren.querySelectorAll('.college-child').forEach((row,i)=>{
          const name=row.querySelector('.cf-name').value.trim()||`Child ${i+1}`;
          const age=Math.min(17,Math.max(0,Number(row.querySelector('.cf-age').value)||0));
          const current=Math.max(0,Number(row.querySelector('.cf-savings').value)||0);
          const monthly=Math.max(0,Number(row.querySelector('.cf-monthly').value)||0);
          const years=Math.max(18-age,0);
          const cost=30000*4*Math.pow(1.05,years);
          const r=.06/12,n=years*12;
          const projected=current*Math.pow(1+r,n)+(n>0?monthly*((Math.pow(1+r,n)-1)/r):0);
          const gap=Math.max(cost-projected,0);
          totalCost+=cost; totalSavings+=projected; rows.push({name,cost,projected,gap});
        });
        const familyGap=Math.max(totalCost-totalSavings,0);
        collegeResults.innerHTML=`
          <div class="wp-section-number">Your College Picture</div>
          <div class="college-summary">
            <div class="college-stat"><small>Estimated College Cost</small><strong>${fmtCollege(totalCost)}</strong></div>
            <div class="college-stat"><small>Projected College Savings</small><strong>${fmtCollege(totalSavings)}</strong></div>
            <div class="college-stat gap"><small>Estimated College Gap</small><strong>${fmtCollege(familyGap)}</strong></div>
          </div>
          <div style="overflow-x:auto"><table class="college-table"><thead><tr><th>Child</th><th>Estimated Cost</th><th>Projected Savings</th><th>Gap</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.name}</td><td>${fmtCollege(r.cost)}</td><td>${fmtCollege(r.projected)}</td><td class="college-child-gap">${fmtCollege(r.gap)}</td></tr>`).join('')}</tbody></table></div>`;
        collegeResults.classList.add('show');
      }

      root.querySelectorAll('[data-college-choice]').forEach(btn=>btn.addEventListener('click',()=>{
        root.querySelectorAll('[data-college-choice]').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const yes=btn.dataset.collegeChoice==='yes';
        collegePlanner.classList.toggle('show',yes);
        collegeNoMessage.classList.toggle('show',!yes);
        if(yes && collegeChildren.children.length===0){addCollegeChild();calculateCollege();}
      }));
      document.getElementById('collegeAddChild')?.addEventListener('click',()=>{addCollegeChild();calculateCollege();});
      document.getElementById('collegeCalculate')?.addEventListener('click',calculateCollege);


      // Protection page — independent, defensive event handling.
      const fmtProtect = n => '$' + Math.round(Math.max(0, Number(n) || 0)).toLocaleString('en-US');
      let hasMortgage = false;
      let protectionYears = 1;
      const val = id => {
        const node = document.getElementById(id);
        return node ? Math.max(0, Number(node.value) || 0) : 0;
      };
      function updateProtection(){
        const balance = hasMortgage ? val('protMortgageBalance') : 0;
        const mortgagePayment = hasMortgage ? val('protMortgageMonthly') : 0;

        const otherBills = val('protBills');
        const continuingIncome = val('protContinue');
        const emergencySavings = val('protSavings');
        const monthlyHouseholdNeed = Math.max(0, otherBills + mortgagePayment - continuingIncome);
        const totalBillsToCover = monthlyHouseholdNeed * protectionYears * 12;
        const incomeGap = Math.max(0, totalBillsToCover - emergencySavings);

        const setText = (id, text) => { const node = document.getElementById(id); if(node) node.textContent = text; };
        setText('protMortgagePayment', fmtProtect(mortgagePayment));
        setText('protMortgageNeed', fmtProtect(balance));
        setText('protBillsNeed', fmtProtect(totalBillsToCover));
        setText('protIncomeGap', fmtProtect(incomeGap));
        setText('combinedMortgage', fmtProtect(balance));
        setText('combinedIncome', fmtProtect(incomeGap));
        setText('protQuestionText', `If your income stopped today, could your current plan cover ${protectionYears} ${protectionYears === 1 ? 'year' : 'years'} of essential bills${hasMortgage ? ' and your mortgage payment' : ''}?`);

        const msg = document.getElementById('combinedProtectionMessage');
        if(msg){
          if(hasMortgage){
            msg.innerHTML = `Your plan has <strong>two jobs</strong>: protect approximately <strong>${fmtProtect(balance)}</strong> of remaining mortgage obligation for your family, and address an estimated <strong>${fmtProtect(incomeGap)}</strong> household-income interruption gap if a qualifying illness occurs. A properly designed policy review can evaluate both objectives together.`;
          } else {
            msg.innerHTML = `You selected no mortgage. Your current protection focus is the estimated <strong>${fmtProtect(incomeGap)}</strong> household-income interruption gap for the period you selected.`;
          }
        }
      }

      root.querySelectorAll('[data-mortgage-choice]').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('[data-mortgage-choice]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          hasMortgage = btn.getAttribute('data-mortgage-choice') === 'yes';
          const planner = document.getElementById('mortgagePlanner');
          if(planner) planner.hidden = !hasMortgage;
          updateProtection();
        });
      });
      root.querySelectorAll('[data-protection-years]').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('[data-protection-years]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          protectionYears = Math.max(1, Math.min(5, Number(btn.getAttribute('data-protection-years')) || 1));
          updateProtection();
        });
      });
      ['protMortgageMonthly','protMortgageBalance','protBills','protContinue','protSavings'].forEach(id => {
        const node = document.getElementById(id);
        if(node) node.addEventListener('input', updateProtection);
      });
      updateProtection();

      // Legacy page — opt-in, simple educational estimate.
      const fmtLegacy = n => '$' + Math.round(Math.max(0, Number(n) || 0)).toLocaleString('en-US');
      function updateLegacy(){
        const own = Math.max(0, Number(document.getElementById('legacyOwn')?.value) || 0);
        const owe = Math.max(0, Number(document.getElementById('legacyOwe')?.value) || 0);
        const insurance = Math.max(0, Number(document.getElementById('legacyInsurance')?.value) || 0);
        const goal = Math.max(0, Number(document.getElementById('legacyGoal')?.value) || 0);
        const today = Math.max(0, own + insurance - owe);
        const gap = Math.max(0, goal - today);
        const set = (id,val) => { const n=document.getElementById(id); if(n) n.textContent=val; };
        set('legacyToday', fmtLegacy(today));
        set('legacyGoalOut', fmtLegacy(goal));
        set('legacyGap', fmtLegacy(gap));
        const q=document.getElementById('legacyQuestion');
        if(q) q.textContent = gap>0
          ? `Based on what you entered, your family is projected to receive ${fmtLegacy(today)} — ${fmtLegacy(gap)} below the legacy goal you selected.`
          : `Based on what you entered, your family is projected to receive ${fmtLegacy(today)} — which meets or exceeds your ${fmtLegacy(goal)} goal.`;
      }
      root.querySelectorAll('[data-legacy-choice]').forEach(btn=>btn.addEventListener('click',()=>{
        root.querySelectorAll('[data-legacy-choice]').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const yes=btn.getAttribute('data-legacy-choice')==='yes';
        document.getElementById('legacyPlanner')?.classList.toggle('show',yes);
        document.getElementById('legacyNoMessage')?.classList.toggle('show',!yes);
        if(yes) updateLegacy();
      }));
      ['legacyOwn','legacyOwe','legacyInsurance','legacyGoal'].forEach(id=>{
        document.getElementById(id)?.addEventListener('input',updateLegacy);
      });

      const legacyInfo = {
        will: {
          title: 'Will — state your wishes',
          body: `<p>A will is a legal document that can direct how property in your probate estate should be distributed after death.</p>
                 <ul><li>Can name who receives probate assets.</li><li>Can name a guardian for minor children.</li><li>Usually must go through probate before estate assets are distributed.</li><li>It generally does not override a valid beneficiary designation on an account or policy.</li></ul>
                 <div class="legacy-modal-callout"><strong>Simple question:</strong> If your family had to rely on your current will today, would it clearly reflect what you want?</div>`
        },
        trust: {
          title: 'Trust — add control and structure',
          body: `<p>A trust is a legal arrangement that can hold and manage assets for the people or causes you choose.</p>
                 <ul><li>Can provide instructions about when and how beneficiaries receive assets.</li><li>Can help manage assets for children or other beneficiaries.</li><li>Assets properly titled in certain trusts may avoid probate.</li><li>Trusts must be created and funded correctly to work as intended.</li></ul>
                 <div class="legacy-modal-callout"><strong>Simple question:</strong> Do you only want to name who receives your assets, or do you also want control over how and when they receive them?</div>`
        },
        tod: {
          title: 'Transfer on Death (TOD) — direct beneficiary transfer',
          body: `<p>A Transfer on Death arrangement can allow certain assets to pass directly to a named beneficiary at death without becoming part of the probate estate.</p>
                 <ul><li>Common forms include TOD or POD account registrations, beneficiary designations, and in some states TOD deeds for real estate.</li><li>The exact document and rules vary by asset type, financial institution, and state.</li><li>The beneficiary designation normally must be completed correctly and kept current.</li><li>A TOD designation can operate separately from instructions in a will.</li></ul>
                 <div class="legacy-modal-callout"><strong>Important:</strong> There is not one universal “certificate of transfer at death” for every asset. The correct TOD form, deed, beneficiary designation, or supporting certificate depends on the asset and state.</div>`
        }
      };
      const legacyModal=document.getElementById('legacyInfoModal');
      const legacyModalTitle=document.getElementById('legacyModalTitle');
      const legacyModalBody=document.getElementById('legacyModalBody');
      const closeLegacyModal=()=>{ if(legacyModal){legacyModal.classList.remove('show');legacyModal.setAttribute('aria-hidden','true');} };
      root.querySelectorAll('[data-legacy-info]').forEach(btn=>btn.addEventListener('click',()=>{
        const info=legacyInfo[btn.getAttribute('data-legacy-info')];
        if(!info||!legacyModal) return;
        if(legacyModalTitle) legacyModalTitle.textContent=info.title;
        if(legacyModalBody) legacyModalBody.innerHTML=info.body;
        legacyModal.classList.add('show');
        legacyModal.setAttribute('aria-hidden','false');
      }));
      document.getElementById('legacyModalClose')?.addEventListener('click',closeLegacyModal);
      legacyModal?.addEventListener('click',e=>{if(e.target===legacyModal) closeLegacyModal();});
      document.addEventListener('keydown',e=>{if(e.key==='Escape') closeLegacyModal();});

      updateLegacy();

      let page=0;
      const pages=Array.from(root.querySelectorAll('.guided-page'));
      const steps=Array.from(root.querySelectorAll('.client-progress span'));
      function showPage(n){
        page=Math.max(0,Math.min(6,n));
        pages.forEach((p,i)=>p.classList.toggle('active',i===page));
        steps.forEach((s,i)=>{s.classList.toggle('active',i===page);s.classList.toggle('done',i<page);});
        root.scrollIntoView({behavior:'smooth',block:'start'});
      }
      root.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>showPage(page+1)));
      root.querySelectorAll('[data-prev]').forEach(b=>b.addEventListener('click',()=>showPage(page-1)));
      steps.forEach((s,i)=>s.addEventListener('click',()=>showPage(i)));
      showPage(0);
    })();
