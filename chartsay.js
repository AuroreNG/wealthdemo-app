/* ============================================================
   WEALTHDEMO — a chart that explains itself

   Touch a line chart anywhere and it tells you, in words, what
   is true at that point: every line's value, which one is ahead,
   and by how much.

   It does this without being told the data. It reads what is
   actually drawn:

     · the value scale comes from the axis labels already on the
       chart ($0 at one height, $82k at another)
     · the year scale comes from the two ends of the bottom axis
     · each line's height at a given x comes from the SVG path
       itself, via getPointAtLength

   So the readout cannot drift from the picture — it IS the
   picture, measured. If a chart does not carry a readable scale,
   nothing is attached and the page is left exactly as it was.
   ============================================================ */
(function () {
  "use strict";

  /* what each drawn line is called. Read off the class the page gave it,
     because guessing a series name from a colour is how charts start lying. */
  const NAMES = {
    "pl-l-plan": "Inside a 529", "pl-l-tax": "Taxable account",
    "tx-l-now": "Pay tax now", "tx-l-later": "Pay tax later", "tx-l-free": "Pay tax once",
    "rb-l-buy": "Buying", "rb-l-rent": "Renting",
    "mg-l-trad": "Current mortgage schedule", "mg-l-strat": "With the policy loan",
    "mg-l-ctrl": "Extra principal payments", "mg-l-pol": "The policy loan",
    "fb-line": "Accumulated value",
    "ft-line": "This option", "ft-illus": "From the illustration",
    "c-inv": "What you have saved", "c-debt": "What you owe",
    "c-late": "Starting later", "c-line": "Level return",
    "c-safe": "Safe withdrawal rate", "c-bad": "Poor returns early"
  };

  /* what each bar in a bar chart is, and the one thing worth saying about it */
  const BARS = {
    debt: {
      "dt-int": ["Interest", "Charged on the whole balance before any of the payment reaches it."],
      "dt-prin": ["Off the balance", "The only part of the payment that actually reduces what you owe."]
    },
    dime: {
      "wf-d": ["Debts", "Cleared straight away, so nobody inherits the payments."],
      "wf-i": ["Income replacement", "The wages that would stop, replaced for the years you set."],
      "wf-m": ["Mortgage", "So the family does not have to move at the worst possible moment."],
      "wf-e": ["Education", "The children's plans, kept whole."],
      "wf-total": ["Total need", "The four pieces added up, before anything you already have."],
      "wf-have": ["Existing coverage and savings", "Cover in force and savings they could reach. This comes off the total."]
    },
    legacy: {
      "lg-home": ["Home equity", "Real, but not spendable unless they sell — and selling costs money and time."],
      "lg-retire": ["401(k) / IRA", "Tax has never been paid on this. They pay income tax as they draw it out."],
      "lg-save": ["Savings and investments", "The simplest piece to hand over."],
      "lg-life": ["Life insurance", "Generally arrives income-tax-free, and usually skips the settling process."],
      "lg-cut": ["Estate costs and taxes", "Debts, tax and the cost of settling — all paid before anyone sees a share."],
      "lg-gapblock": ["Shortfall against your goal", "The difference between what reaches them and what you wanted to leave."],
      "lg-net": ["Net to heirs", "What is left once the debts, the tax and the cost of settling have been paid."]
    },
    loss: {
      "lc-start": ["Before the fall", "Where the money started."],
      "lc-after": ["After the fall", "What is left is what has to do all the climbing."],
      "lc-ghost": ["Back to break-even", "Not a gain \u2014 just the same number you began with."],
      "lc-base": ["Where the climb starts", "The recovery has to be earned on this smaller amount, which is why it takes a bigger percentage."]
    },
    paycheck: {
      "rw-sav": ["Savings alone", "How long the emergency fund covers the gap by itself."],
      "rw-ben": ["With the benefit", "What the income-protection benefit adds on top."]
    }
  };

  const SLUG = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "");
  const M = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  /* "$82k" -> 82000, "$2.9M" -> 2900000, "$0" -> 0 */
  function scale(txt) {
    const s = String(txt).replace(/[,\s]/g, "");
    const m = s.match(/^-?\$?(-?\d+(?:\.\d+)?)([kKmM])?$/);
    if (!m) return null;
    let v = parseFloat(m[1]);
    if (m[2]) v *= /[kK]/.test(m[2]) ? 1e3 : 1e6;
    return v;
  }
  /* "age 18" -> 18, "yr 3" -> 3, "now" -> 0 */
  function step(txt) {
    const s = String(txt).trim();
    if (/^now$/i.test(s)) return 0;
    const m = s.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  /* "42% more" is useful; "515% more" is not — that is a number nobody
     pictures. Once one side is a fraction of the other, say it in multiples,
     and once it is a rout, say nothing and let the two figures speak. */
  function times(ratio) {
    if (!isFinite(ratio) || ratio <= 1) return "";
    if (ratio < 3) return " \u2014 " + Math.round(ratio * 100 - 100) + "% more";
    if (ratio < 10) return " \u2014 " + (Math.round(ratio * 10) / 10).toFixed(1).replace(/\.0$/, "") + " times as much";
    return "";
  }

  function money(v) {
    if (Math.abs(v) >= 1e6) return "$" + (v / 1e6).toFixed(2).replace(/\.?0+$/, "") + "m";
    return M.format(Math.round(v));
  }

  /* ---------- work out a chart's two scales, or give up ---------- */
  function measure(svg) {
    const vb = svg.viewBox.baseVal;
    if (!vb || vb.width < 380) return null;

    const texts = Array.prototype.slice.call(svg.querySelectorAll("text"));
    const yPts = [], xPts = [];

    /* a chart can hand over its own scale — "y,value,y,value" — and then the
       readout is exact rather than inferred from a rounded axis label */
    const bandAttr = (svg.getAttribute("data-cs-band") || "").split(",").map(parseFloat);
    const band = bandAttr.length === 2 && bandAttr.every(function (n) { return isFinite(n); }) ? bandAttr : null;
    const told = (svg.getAttribute("data-cs-scale") || "").split(",").map(parseFloat);
    const exact = told.length === 4 && told.every(function (n) { return isFinite(n); }) &&
                  told[0] !== told[2] && told[1] !== told[3];
    texts.forEach(function (t) {
      const x = parseFloat(t.getAttribute("x")) || 0;
      const y = parseFloat(t.getAttribute("y")) || 0;
      const s = (t.textContent || "").trim();
      /* a value-axis label carries a currency mark; a year label in the same
         gutter ("now", "1") does not, and reading it as a value breaks the scale */
      if (!exact && x < vb.width * 0.16 && s.indexOf("$") >= 0) {
        const v = scale(s);
        if (v !== null) {
          let mid = null;
          try { const bb = t.getBBox(); mid = bb.y + bb.height / 2; } catch (e) {}
          yPts.push({ y: y, v: v, box: mid });
        }
      }
      /* the bottom row also holds the axis's own "$0", sitting in the left
         gutter. Counted as a step it drags the whole year scale sideways. */
      /* the bottom row also carries the value axis's own "$0". Counted as a
         step it drags the whole year scale sideways, so drop anything with a
         currency mark and keep the rest wherever it sits. */
      if (y > vb.height * 0.8 && s.indexOf("$") < 0) {
        const v = step(s);
        if (v !== null) xPts.push({ x: x, v: v, s: s });
      }
    });
    if ((!exact && yPts.length < 2) || xPts.length < 2) return null;

    if (exact) {
      yPts.length = 0;
      yPts.push({ y: told[0], v: told[1] }, { y: told[2], v: told[3] });
    } else {
      /* the label's baseline sits a few pixels below the gridline it names, so
         snap to that line where the chart drew one */
      const rules = Array.prototype.filter.call(svg.querySelectorAll("line"), function (l) {
        const y1 = parseFloat(l.getAttribute("y1")), y2 = parseFloat(l.getAttribute("y2"));
        const x1 = parseFloat(l.getAttribute("x1")), x2 = parseFloat(l.getAttribute("x2"));
        return isFinite(y1) && Math.abs(y1 - y2) < 0.6 && Math.abs(x2 - x1) > vb.width * 0.4;
      }).map(function (l) { return parseFloat(l.getAttribute("y1")); });
      yPts.forEach(function (pt) {
        let best = null;
        rules.forEach(function (ry) {
          if (best === null || Math.abs(ry - pt.y) < Math.abs(best - pt.y)) best = ry;
        });
        if (best !== null && Math.abs(best - pt.y) <= 6) pt.y = best;
        else if (pt.box) pt.y = pt.box;
      });
    }
    yPts.sort(function (a, b) { return a.y - b.y; });
    /* a single ladder, or nothing: two stacked plots in one svg cannot share a scale */
    for (let i = 1; i < yPts.length; i++) {
      if (yPts[i].v > yPts[i - 1].v + 1e-9) return null;    /* lower on screen must mean smaller */
    }
    const hi = yPts[0], lo = yPts[yPts.length - 1];
    if (hi.v === lo.v || hi.y === lo.y) return null;

    xPts.sort(function (a, b) { return a.x - b.x; });
    const x0 = xPts[0], x1 = xPts[xPts.length - 1];
    if (x0.x === x1.x) return null;

    const lines = Array.prototype.filter.call(svg.querySelectorAll("path, polyline"), function (p) {
      const cs = getComputedStyle(p);
      if (!cs.stroke || cs.stroke === "none" || parseFloat(cs.strokeWidth) < 0.8) return false;
      let len = 0;
      try { len = p.getTotalLength(); } catch (e) { return false; }
      const box = p.getBBox();
      /* a real series spans most of the plot; a tick or a flag does not */
      if (band && (box.y + box.height < band[0] - 4 || box.y > band[1] + 4)) return false;
      const span = x1.x - x0.x;
      /* a series starts at the left edge of the plot. It does NOT have to reach
         the right edge — on a "when does it run out" chart, stopping early is
         the whole message, and the old two-thirds rule hid those lines. */
      /* a series touches one end of the plot: it either starts at the left, or
         runs to the right. Requiring both hid the lines that end early (money
         running out) and the ones that start late (a policy from age 18). */
      const startsLeft = box.x <= x0.x + span * 0.12;
      const endsRight = box.x + box.width >= x1.x - span * 0.12;
      return (startsLeft || endsRight) && box.width > span * 0.18 && len > span * 0.18;
    });
    if (!lines.length) return null;

    /* "age 40" -> "age", "Year 4" -> "Year", "now" -> whatever the caption says */
    let word = (svg.getAttribute("data-cs-xword") || "").trim() ||
               String(x0.s || "").replace(/[\d.,]+/g, "").trim();
    if (/^now$/i.test(word) || !word) {
      for (let i = 1; i < xPts.length; i++) {
        const w = String(xPts[i].s || "").replace(/[\d.,]+/g, "").trim();
        if (w && !/^now$/i.test(w)) { word = w; break; }
      }
    }
    if (!word) {
      const caps = texts.filter(function (t) {
        return (parseFloat(t.getAttribute("y")) || 0) > vb.height * 0.86 && step(t.textContent) === null;
      });
      const cap = caps.length ? (caps[caps.length - 1].textContent || "").trim() : "";
      word = /year/i.test(cap) ? "year" : /age/i.test(cap) ? "age" : "";
    }

    return {
      vb: vb,
      val: function (y) { return lo.v + (lo.y - y) * (hi.v - lo.v) / (lo.y - hi.y); },
      atX: function (px) { return x0.v + (px - x0.x) * (x1.v - x0.v) / (x1.x - x0.x); },
      pxOf: function (v) { return x0.x + (v - x0.v) * (x1.x - x0.x) / (x1.v - x0.v); },
      left: x0.x, right: x1.x, top: band ? band[0] : hi.y, bottom: band ? band[1] : lo.y,
      xWord: word,
      low: svg.getAttribute("data-cs-low") === "1",
      say: svg.getAttribute("data-cs-say") || "",
      /* a line that is a yardstick, not a rival: it is left out of "who is
         ahead" and given a clause of its own */
      ref: (svg.getAttribute("data-cs-ref") || "").trim(),
      why: (svg.getAttribute("data-cs-why") || "").trim(),
      lines: lines
    };
  }

  /* the height of a drawn path at a given x, found on the path itself */
  function yAt(path, px) {
    let len;
    try { len = path.getTotalLength(); } catch (e) { return null; }
    let a = 0, b = len;
    const at = function (t) { return path.getPointAtLength(t); };
    if (at(0).x > at(len).x) { a = len; b = 0; }              /* drawn right to left */
    for (let i = 0; i < 24; i++) {
      const mid = (a + b) / 2;
      if (at(mid).x < px) a = mid; else b = mid;
    }
    const p = at((a + b) / 2);
    if (Math.abs(p.x - px) <= 8) return { y: p.y, over: false };
    /* past the end of this line — where it stopped is the answer */
    const box = path.getBBox();
    if (px > box.x + box.width) return { y: null, over: true, endX: box.x + box.width };
    return null;
  }

  /* the chart usually has a legend sitting beside it. Matching a line to its
     own swatch by colour beats any table, because the page wrote both. */
  function legendOf(svg) {
    const card = svg.closest(".runway, .panel, .results, section") || svg.parentElement;
    const map = {};
    if (!card) return map;
    card.querySelectorAll('.rw-key span, [class*="key"] span, [class*="legend"] span, [id$="Key"] span').forEach(function (sp) {
      const sw = sp.querySelector("i, .swatch");
      if (!sw) return;
      /* a dashed swatch has no fill — its colour lives in the border */
      const cs = getComputedStyle(sw);
      const col = cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)"
        ? cs.backgroundColor : cs.borderTopColor;
      const label = (sp.textContent || "").trim();
      if (col && label && col !== "rgba(0, 0, 0, 0)") map[col] = label;
    });
    return map;
  }

  function nameOf(path, i, total, legend) {
    const col = getComputedStyle(path).stroke;
    if (legend && legend[col]) return legend[col];
    const cls = (path.getAttribute("class") || "").split(/\s+/);
    for (let k = cls.length - 1; k >= 0; k--) if (NAMES[cls[k]]) return NAMES[cls[k]];
    return total > 1 ? "Line " + (i + 1) : "The line";
  }

  /* ---------- attach ---------- */
  function wire(svg) {
    const g = measure(svg);
    if (!g) return false;

    const NS = "http://www.w3.org/2000/svg";
    const layer = document.createElementNS(NS, "g");
    layer.setAttribute("class", "cs-layer");
    layer.setAttribute("aria-hidden", "true");
    const rule = document.createElementNS(NS, "line");
    rule.setAttribute("class", "cs-rule");
    rule.setAttribute("y1", g.top);
    rule.setAttribute("y2", g.bottom);
    layer.appendChild(rule);
    const dots = g.lines.map(function () {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "cs-dot");
      c.setAttribute("r", "4.5");
      layer.appendChild(c);
      return c;
    });
    svg.appendChild(layer);

    const hit = document.createElementNS(NS, "rect");
    hit.setAttribute("class", "cs-hit");
    hit.setAttribute("x", g.left);
    hit.setAttribute("y", g.top - 10);
    hit.setAttribute("width", g.right - g.left);
    hit.setAttribute("height", g.bottom - g.top + 20);
    svg.appendChild(hit);

    const host = svg.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const tip = document.createElement("div");
    tip.className = "cs-tip";
    tip.hidden = true;
    host.appendChild(tip);

    const nudge = document.createElement("span");
    nudge.className = "cs-nudge";
    nudge.textContent = "Tap the chart to read it";
    host.appendChild(nudge);

    const legend = legendOf(svg);
    let live = false;

    function read(clientX, clientY) {
      const box = svg.getBoundingClientRect();
      const px = g.vb.x + (clientX - box.left) / box.width * g.vb.width;
      const py = g.vb.y + (clientY - box.top) / box.height * g.vb.height;
      const x = Math.max(g.left, Math.min(g.right, px));

      const rows = [], done = [];
      g.lines.forEach(function (p, i) {
        const hit = yAt(p, x);
        if (!hit) { dots[i].setAttribute("r", "0"); return; }
        const name = nameOf(p, i, g.lines.length, legend);
        const col = getComputedStyle(p).stroke;
        if (hit.over) {
          dots[i].setAttribute("r", "0");
          done.push({ name: name, col: col, at: g.atX(hit.endX) });
          return;
        }
        dots[i].setAttribute("cx", x);
        dots[i].setAttribute("cy", hit.y);
        dots[i].setAttribute("r", "4.5");
        dots[i].setAttribute("stroke", col);
        rows.push({ name: name, v: g.val(hit.y), y: hit.y, col: col,
          ref: !!g.ref && (p.getAttribute("class") || "").split(/\s+/).indexOf(g.ref) >= 0 });
      });
      if (!rows.length && !done.length) return;

      rule.setAttribute("x1", x);
      rule.setAttribute("x2", x);
      layer.setAttribute("data-on", "1");

      /* which line did they actually reach for? */
      let near = rows[0];
      rows.forEach(function (r) { if (near && Math.abs(r.y - py) < Math.abs(near.y - py)) near = r; });

      const when = g.atX(x);
      const whenTxt = (g.xWord ? g.xWord.replace(/s$/, "") + " " : "") +
        (Math.abs(when - Math.round(when)) < 0.05 ? Math.round(when) : when.toFixed(1));

      const word = function (v) {
        return (g.xWord ? g.xWord.replace(/s$/, "") + " " : "") +
          (Math.abs(v - Math.round(v)) < 0.08 ? Math.round(v) : v.toFixed(1));
      };
      const yard = rows.filter(function (r) { return r.ref; })[0] || null;
      const real = rows.filter(function (r) { return !r.ref; });
      const sorted = real.slice().sort(function (a, b) { return b.v - a.v; });
      const tail = (g.why ? " " + g.why : "") +
        (yard ? " " + yard.name + " would leave " + money(yard.v) + "." : "");
      let says = "";
      if (done.length) {
        /* a line that has already stopped is the headline on this kind of chart */
        says = done.map(function (d) { return d.name + " ran out at " + word(d.at); }).join("; ") + ".";
        if (sorted.length) says += " " + sorted[0].name + " still has " + money(sorted[0].v) + ".";
        says += tail;
      } else if (real.length > 1) {
        const top = sorted[0], bot = sorted[sorted.length - 1];
        const gap = top.v - bot.v;
        /* on a chart of what is still owed, or what something has cost,
           the line at the bottom is the one winning */
        if (g.say === "range") {
          /* these lines are the spread of one outcome, not rivals */
          says = "Between " + money(bot.v) + " and " + money(top.v) + ", depending on how the returns land.";
        } else if (g.say === "gap") {
          /* neither line is the winner here — one is savings, one is debt */
          const second = rows[1].name.charAt(0).toLowerCase() + rows[1].name.slice(1);
          says = rows[0].name + " " + money(rows[0].v) + " against " + second + " " +
                 money(rows[1].v) + " \u2014 a gap of " + money(Math.abs(rows[0].v - rows[1].v)) + ".";
        } else if (g.low) {
          says = bot.name + " is lowest here \u2014 " + money(gap) + " below " + top.name + ".";
        } else {
          says = top.name + " is ahead by " + money(gap) +
            (gap > 0 && bot.v > 0 ? times(top.v / bot.v) : "") + ".";
        }
        says += tail;
      } else if (real.length === 1) {
        says = "That is " + money(real[0].v) + " at this point on the line." + tail;
      } else {
        says = (g.why || "").trim() + (yard ? " " + yard.name + " would leave " + money(yard.v) + "." : "");
      }

      tip.innerHTML =
        '<span class="cs-when">' + whenTxt.replace(/^\s+/, "") + "</span>" +
        rows.map(function (r) {
          return '<span class="cs-row"' + (r === near ? ' data-near="1"' : "") + '>' +
            '<i style="background:' + r.col + '"></i>' +
            "<em>" + r.name + "</em><b>" + money(r.v) + "</b></span>";
        }).join("") +
        /* a line that has already run out still gets its row, so the reader
           can see every series named rather than wondering where two went */
        done.map(function (d) {
          return '<span class="cs-row" data-gone="1">' +
            '<i style="background:' + d.col + '"></i>' +
            "<em>" + d.name + "</em><b>gone</b></span>";
        }).join("") +
        '<span class="cs-says">' + says + "</span>";

      tip.hidden = false;
      const hb = host.getBoundingClientRect();
      const wantLeft = clientX - hb.left;
      tip.style.left = Math.max(8, Math.min(hb.width - tip.offsetWidth - 8, wantLeft - tip.offsetWidth / 2)) + "px";
      tip.style.top = Math.max(4, (clientY - hb.top) - tip.offsetHeight - 16) + "px";

      if (!live) {
        live = true;
        nudge.hidden = true;
        try { localStorage.setItem("wealthdemo.chartSeen", "1"); } catch (e) {}
      }
    }

    function clear() {
      layer.removeAttribute("data-on");
      tip.hidden = true;
    }

    hit.addEventListener("pointermove", function (e) { read(e.clientX, e.clientY); });
    hit.addEventListener("pointerdown", function (e) { read(e.clientX, e.clientY); });
    hit.addEventListener("pointerleave", clear);
    svg.addEventListener("pointerleave", clear);

    try { if (localStorage.getItem("wealthdemo.chartSeen")) nudge.hidden = true; } catch (e) {}
    return true;
  }

  /* ---------- bars: the other half of the charts ---------- */
  function wireBars(svg) {
    const table = BARS[SLUG];
    if (!table) return false;
    const vb = svg.viewBox.baseVal;
    if (!vb || vb.width < 300) return false;

    const clsOf = function (r) {
      const c = (r.getAttribute("class") || "").split(/\s+/);
      for (let i = 0; i < c.length; i++) if (table[c[i]]) return c[i];
      return null;
    };
    const bars = Array.prototype.filter.call(svg.querySelectorAll("rect"), function (r) {
      return clsOf(r) && (parseFloat(r.getAttribute("height")) || 0) > 1.5;
    });
    if (!bars.length) return false;

    let g = measure(svg);                         /* may be null; bars cope */
    if (!g) {
      const told = (svg.getAttribute("data-cs-scale") || "").split(",").map(parseFloat);
      if (told.length === 4 && told.every(function (n) { return isFinite(n); }) &&
          told[0] !== told[2] && told[1] !== told[3]) {
        const word = (svg.getAttribute("data-cs-xword") || "").trim();
        const xs = [];
        svg.querySelectorAll("text").forEach(function (t) {
          const y = parseFloat(t.getAttribute("y")) || 0;
          const x = parseFloat(t.getAttribute("x")) || 0;
          const str = (t.textContent || "").trim();
          if (y > vb.height * 0.8 && str.indexOf("$") < 0) {
            const v = step(str);
            if (v !== null) xs.push({ x: x, v: v });
          }
        });
        xs.sort(function (a, b) { return a.x - b.x; });
        g = {
          val: function (y) { return told[1] + (told[0] - y) * (told[3] - told[1]) / (told[0] - told[2]); },
          atX: xs.length > 1
            ? function (px) { return xs[0].v + (px - xs[0].x) * (xs[xs.length - 1].v - xs[0].v) / (xs[xs.length - 1].x - xs[0].x); }
            : function () { return NaN; },
          xWord: word
        };
      }
    }
    const texts = Array.prototype.slice.call(svg.querySelectorAll("text"));

    const host = svg.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    let tip = host.querySelector(".cs-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "cs-tip";
      tip.hidden = true;
      host.appendChild(tip);
    }
    if (!host.querySelector(".cs-nudge")) {
      const nudge = document.createElement("span");
      nudge.className = "cs-nudge";
      nudge.textContent = "Tap a bar to read it";
      try { if (localStorage.getItem("wealthdemo.chartSeen")) nudge.hidden = true; } catch (e) {}
      host.appendChild(nudge);
    }

    /* a figure printed on this bar beats anything inferred — but only if it
       really sits on this bar. An axis label in the gutter is not a value. */
    function printed(r) {
      const bb = r.getBBox();
      if (bb.width > vb.width * 0.5) return null;      /* a background track, not a bar */
      let best = null, bestD = 1e9;
      texts.forEach(function (t) {
        const s = (t.textContent || "").trim();
        if (!/\d/.test(s)) return;
        let tb;
        try { tb = t.getBBox(); } catch (e) { return; }
        const tx = tb.x + tb.width / 2;
        if (tx < bb.x - 2 || tx > bb.x + bb.width + 2) return;     /* must be over the bar */
        if (tb.x < vb.width * 0.14 && bb.x > vb.width * 0.14) return;   /* left gutter */
        /* a bare short number along the bottom is an axis tick, not a value */
        if (s.indexOf("$") < 0 && s.replace(/[^0-9]/g, "").length <= 2 && s.length <= 3 &&
            tb.y > vb.height * 0.82) return;
        /* nearest to the bar's own centre wins; ties fall to the closer caption */
        /* a figure sitting inside the block is that block's own figure —
           a stack of four blocks all answering with the top one is worse
           than no figure at all */
        const inside = tb.y >= bb.y - 2 && tb.y <= bb.y + bb.height + 2;
        const d = (inside ? 0 : 500) + Math.abs(tx - (bb.x + bb.width / 2)) * 10 +
                  Math.min(Math.abs(tb.y - (bb.y + bb.height)), Math.abs(tb.y - bb.y));
        if (d < bestD) { bestD = d; best = s; }
      });
      return best;
    }

    bars.forEach(function (r) {
      r.classList.add("cs-bar");
      const key = clsOf(r);
      const read = function (e) {
        const row = table[key];
        const bb = r.getBBox();
        const shown = printed(r);
        const measured = g ? Math.abs(g.val(bb.y) - g.val(bb.y + bb.height)) : null;
        const value = shown || (measured !== null && isFinite(measured) && measured > 0 ? money(measured) : "");
        let when = "";
        if (g && !shown) {
          const at = g.atX(bb.x + bb.width / 2);
          if (isFinite(at)) when = (g.xWord ? g.xWord.replace(/s$/, "") + " " : "") +
            (Math.abs(at - Math.round(at)) < 0.08 ? Math.round(at) : at.toFixed(1));
        }
        tip.innerHTML =
          (when ? '<span class="cs-when">' + when + "</span>" : "") +
          '<span class="cs-row" data-near="1"><i style="background:' + getComputedStyle(r).fill + '"></i>' +
          "<em>" + row[0] + "</em>" + (value ? "<b>" + value + "</b>" : "") + "</span>" +
          '<span class="cs-says">' + row[1] + "</span>";
        tip.hidden = false;
        const hb = host.getBoundingClientRect();
        tip.style.left = Math.max(8, Math.min(hb.width - tip.offsetWidth - 8,
          (e.clientX - hb.left) - tip.offsetWidth / 2)) + "px";
        tip.style.top = Math.max(4, (e.clientY - hb.top) - tip.offsetHeight - 16) + "px";
        const n = host.querySelector(".cs-nudge");
        if (n) n.hidden = true;
        try { localStorage.setItem("wealthdemo.chartSeen", "1"); } catch (err) {}
      };
      r.addEventListener("pointermove", read);
      r.addEventListener("pointerdown", read);
    });
    svg.addEventListener("pointerleave", function () { tip.hidden = true; });
    return true;
  }

  function sweep() {
    document.querySelectorAll(".tool-wrap svg").forEach(function (svg) {
      if (svg.getAttribute("data-cs")) return;
      let ok = false;
      try { ok = wire(svg); } catch (e) { ok = false; }
      if (!ok) { try { ok = wireBars(svg) ? "bars" : false; } catch (e) { ok = false; } }
      svg.setAttribute("data-cs", ok === "bars" ? "bars" : (ok ? "1" : "0"));
    });
  }

  function start() {
    if (document.body.getAttribute("data-page") !== "app") return;
    sweep();
    /* a tool draws its chart from its own script at the end of the body, so
       the first sweep can easily arrive before the chart does */
    setTimeout(sweep, 60);
    setTimeout(sweep, 400);
    const wrap = document.querySelector(".tool-wrap");
    if (wrap && window.MutationObserver) {
      let mt = null;
      new MutationObserver(function () {
        clearTimeout(mt);
        mt = setTimeout(sweep, 80);
      }).observe(wrap, { childList: true, subtree: true });
    }
    /* charts are redrawn whenever a number changes, so watch for new ones */
    let t = null;
    const again = function () { clearTimeout(t); t = setTimeout(sweep, 120); };
    document.addEventListener("input", again);
    document.addEventListener("change", again);
    document.addEventListener("click", again);
    window.addEventListener("resize", again);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
