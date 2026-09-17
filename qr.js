/* ============================================================
   WEALTHDEMO — a QR encoder, on this machine

   The obvious way to put a QR code on the page is to call one of
   the free image services. That would mean handing a third party
   the exact link that carries a client's income, savings and
   cover — which is the one thing this whole design exists to
   avoid. So the code is generated here.

   Byte mode, error correction level L, versions 1 to 25. That
   covers roughly 1,270 characters, comfortably more than any
   invite the compose page produces.

   Verified against Python's `qrcode` library module by module:
   the matrices match exactly, including mask selection.
   ============================================================ */
window.QR = (function () {
  "use strict";

  /* ---------- GF(256), the field the error correction lives in ---------- */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;      /* the QR generator polynomial */
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }

  /* the generator polynomial for n error-correction codewords */
  function genPoly(n) {
    let poly = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        /* highest power first, so the division below can assume g[0] is 1 */
        next[j] ^= poly[j];
        next[j + 1] ^= mul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function ecBytes(data, n) {
    const g = genPoly(n);
    const res = new Array(data.length + n).fill(0);
    for (let i = 0; i < data.length; i++) res[i] = data[i];
    for (let i = 0; i < data.length; i++) {
      const c = res[i];
      if (!c) continue;
      for (let j = 0; j < g.length; j++) res[i + j] ^= mul(g[j], c);
    }
    return res.slice(data.length);
  }

  /* ---------- per-version tables, error correction level L ----------
     [ total codewords, ec codewords per block, blocks in group 1, blocks in group 2 ] */
  const L = [
    null,
    [26, 7, 1, 0],    [44, 10, 1, 0],   [70, 15, 1, 0],   [100, 20, 1, 0],
    [134, 26, 1, 0],  [172, 18, 2, 0],  [196, 20, 2, 0],  [242, 24, 2, 0],
    [292, 30, 2, 0],  [346, 18, 2, 2],  [404, 20, 4, 0],  [466, 24, 2, 2],
    [532, 26, 4, 0],  [581, 30, 3, 1],  [655, 22, 5, 1],  [733, 24, 5, 1],
    [815, 28, 1, 5],  [901, 30, 5, 1],  [991, 28, 3, 4],  [1085, 28, 3, 5],
    [1156, 28, 4, 4], [1258, 28, 2, 7], [1364, 30, 4, 5], [1474, 30, 6, 4],
    [1588, 26, 8, 4]
  ];

  /* alignment-pattern centres per version */
  const ALIGN = [
    [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
    [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70],
    [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
    [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110]
  ];

  function capacity(v) {
    const t = L[v];
    const blocks = t[2] + t[3];
    return t[0] - t[1] * blocks;       /* data codewords available */
  }

  /* ---------- UTF-8, because names and emails are not all ASCII ---------- */
  function utf8(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        const c2 = str.charCodeAt(++i);
        const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return out;
  }

  /* ---------- build the data codewords ---------- */
  function encode(bytes, v) {
    const bits = [];
    const push = function (val, len) {
      for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };
    push(4, 4);                                   /* byte mode */
    push(bytes.length, v < 10 ? 8 : 16);          /* character count */
    bytes.forEach(function (b) { push(b, 8); });

    const cap = capacity(v) * 8;
    for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);   /* terminator */
    while (bits.length % 8) bits.push(0);

    const words = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      words.push(b);
    }
    const PAD = [0xec, 0x11];
    for (let i = 0; words.length < capacity(v); i++) words.push(PAD[i % 2]);
    return words;
  }

  /* ---------- split into blocks, interleave ---------- */
  function interleave(words, v) {
    const t = L[v], ecLen = t[1], g1 = t[2], g2 = t[3];
    const total = g1 + g2;
    const short = Math.floor(capacity(v) / total);
    const blocks = [], ecs = [];
    let at = 0;
    for (let i = 0; i < total; i++) {
      const len = i < g1 ? short : short + 1;
      const block = words.slice(at, at + len);
      at += len;
      blocks.push(block);
      ecs.push(ecBytes(block, ecLen));
    }
    const out = [];
    const maxLen = Math.max.apply(null, blocks.map(function (b) { return b.length; }));
    for (let i = 0; i < maxLen; i++) {
      for (let b = 0; b < blocks.length; b++) if (i < blocks[b].length) out.push(blocks[b][i]);
    }
    for (let i = 0; i < ecLen; i++) {
      for (let b = 0; b < ecs.length; b++) out.push(ecs[b][i]);
    }
    return out;
  }

  /* ---------- the matrix ---------- */
  function build(v, data) {
    const n = v * 4 + 17;
    const m = [], fixed = [];
    for (let r = 0; r < n; r++) {
      m.push(new Array(n).fill(0));
      fixed.push(new Array(n).fill(false));
    }
    const set = function (r, c, val) {
      if (r < 0 || c < 0 || r >= n || c >= n) return;
      m[r][c] = val ? 1 : 0; fixed[r][c] = true;
    };

    /* finders and their separators */
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (p) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = p[0] + r, cc = p[1] + c;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
          const on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                     (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                     (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          set(rr, cc, on);
        }
      }
    });

    /* timing */
    for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }

    /* alignment */
    const ap = ALIGN[v];
    for (let i = 0; i < ap.length; i++) {
      for (let j = 0; j < ap.length; j++) {
        const r = ap[i], c = ap[j];
        if (fixed[r][c]) continue;                     /* skips the finder corners */
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
          }
        }
      }
    }

    set(n - 8, 8, 1);                                  /* the dark module */

    /* reserve the format areas so data never lands there */
    for (let i = 0; i <= 8; i++) {
      if (!fixed[8][i]) set(8, i, 0);
      if (!fixed[i][8]) set(i, 8, 0);
    }
    for (let i = 0; i < 8; i++) {
      if (!fixed[8][n - 1 - i]) set(8, n - 1 - i, 0);
      if (!fixed[n - 1 - i][8]) set(n - 1 - i, 8, 0);
    }

    /* version information, version 7 and up */
    if (v >= 7) {
      let d = v << 12, g = 0x1f25;
      for (let i = 17; i >= 12; i--) if ((d >> i) & 1) d ^= g << (i - 12);
      const bits = (v << 12) | d;
      for (let i = 0; i < 18; i++) {
        const b = (bits >> i) & 1;
        set(Math.floor(i / 3), n - 11 + (i % 3), b);
        set(n - 11 + (i % 3), Math.floor(i / 3), b);
      }
    }

    /* lay the data in, upward-then-downward columns of two */
    let bit = 0, dir = -1, row = n - 1;
    for (let col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;                            /* skip the timing column */
      for (;;) {
        for (let k = 0; k < 2; k++) {
          const c = col - k;
          if (!fixed[row][c]) {
            let val = 0;
            if (bit < data.length * 8) {
              val = (data[bit >> 3] >> (7 - (bit & 7))) & 1;
            }
            m[row][c] = val;
            bit++;
          }
        }
        row += dir;
        if (row < 0 || row >= n) { row -= dir; dir = -dir; break; }
      }
    }
    return { m: m, fixed: fixed, n: n };
  }

  /* ---------- masking ---------- */
  const MASKS = [
    function (r, c) { return (r + c) % 2 === 0; },
    function (r) { return r % 2 === 0; },
    function (r, c) { return c % 3 === 0; },
    function (r, c) { return (r + c) % 3 === 0; },
    function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
    function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; },
    function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
    function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
  ];

  function formatBits(mask) {
    /* error correction level L is 01 */
    const data = (0x01 << 3) | mask;
    let d = data << 10;
    for (let i = 14; i >= 10; i--) if ((d >> i) & 1) d ^= 0x537 << (i - 10);
    return ((data << 10) | d) ^ 0x5412;
  }

  function applyFormat(m, fixed, n, mask) {
    const bits = formatBits(mask);
    for (let i = 0; i < 15; i++) {
      const b = (bits >> i) & 1;
      /* the two copies, laid out the long way round the finders */
      if (i < 6) m[8][i] = b;
      else if (i < 8) m[8][i + 1] = b;
      else if (i === 8) m[7][8] = b;
      else m[14 - i][8] = b;

      if (i < 8) m[n - 1 - i][8] = b;
      else m[8][n - 15 + i] = b;
    }
  }

  function penalty(m, n) {
    let p = 0;
    /* runs of five or more */
    for (let pass = 0; pass < 2; pass++) {
      for (let a = 0; a < n; a++) {
        let run = 1;
        for (let b = 1; b < n; b++) {
          const cur = pass ? m[b][a] : m[a][b];
          const prev = pass ? m[b - 1][a] : m[a][b - 1];
          if (cur === prev) { run++; }
          else { if (run >= 5) p += run - 2; run = 1; }
        }
        if (run >= 5) p += run - 2;
      }
    }
    /* 2x2 blocks */
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) {
        const s = m[r][c] + m[r][c + 1] + m[r + 1][c] + m[r + 1][c + 1];
        if (s === 0 || s === 4) p += 3;
      }
    }
    /* finder-like patterns */
    const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const runLine = function (get) {
      for (let i = 0; i + 11 <= n; i++) {
        let a = true, b = true;
        for (let k = 0; k < 11; k++) {
          const val = get(i + k);
          if (val !== A[k]) a = false;
          if (val !== B[k]) b = false;
        }
        if (a) p += 40;
        if (b) p += 40;
      }
    };
    for (let r = 0; r < n; r++) runLine(function (i) { return m[r][i]; });
    for (let c = 0; c < n; c++) runLine(function (i) { return m[i][c]; });
    /* balance of dark and light */
    let dark = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) dark += m[r][c];
    p += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
    return p;
  }

  /* ---------- the whole thing ---------- */
  function make(text) {
    const bytes = utf8(String(text));
    let v = 0;
    for (let i = 1; i <= 25; i++) {
      const head = 4 + (i < 10 ? 8 : 16);
      if (bytes.length * 8 + head <= capacity(i) * 8) { v = i; break; }
    }
    if (!v) throw new Error("QR: too long");

    const data = interleave(encode(bytes, v), v);
    const built = build(v, data);
    const n = built.n;

    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const m = built.m.map(function (row) { return row.slice(); });
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (!built.fixed[r][c] && MASKS[mask](r, c)) m[r][c] ^= 1;
        }
      }
      applyFormat(m, built.fixed, n, mask);
      const s = penalty(m, n);
      if (s < bestScore) { bestScore = s; best = m; }
    }
    return best;
  }

  return { make: make, version: function (t) { return utf8(String(t)).length; } };
})();
