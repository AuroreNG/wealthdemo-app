# WEALTHDEMO — redesigned

Financial assessment app rebuilt around the clean, 7-step layout from the reference screens:
sticky masthead, numbered step bar, one white card per section, and a live "Your Snapshot" rail.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page structure — masthead, 7-step wizard, snapshot rail |
| `tokens.css` | Brand tokens: emerald, gold, ivory, type scale, radii, shadows |
| `app.css` | All application styling (full rewrite) |
| `app.js` | Calculations, interactions, and the PDF report — **unchanged** |
| `shell.js` | Snapshot ring, `$`/`%` field adornments, autosave, Save & Exit |
| `wealthdemo-logo.webp` | Transparent logo |
| `img-terrace.webp` | Step 1 hero band photo |
| `img-skyline.webp` | "See What Your Money Can Do." rail card photo |

Drop all eight files in the repository root — same structure as before, just two new files
(`shell.js`, and the two images).

## What changed

- **New shell.** Sticky white masthead with the wordmark, "Your information is secure", and a
  working **Save & Exit**; sticky numbered step bar that collapses to numbers-only on phones.
- **One card per idea.** Every section is a white card with an icon chip, a serif heading and a
  one-line explanation — no gradients, no colored panels competing for attention.
- **Your Snapshot rail.** Progress ring, money saved so far, years to retirement, and on-track
  status, all updating live. On tablet and phone it moves above the form.
- **Account rows** read as a table: column headings once at the top, `$` and `%` adornments inside
  the inputs, and a quiet trash button per row.
- **Autosave.** Answers are kept in the browser and restored on the next visit; Save & Exit
  confirms it. Nothing leaves the device.
- **Fixed:** the "Health or Income Loss" risk card opened a calculator that `app.js` had hidden —
  it now opens properly.

The math, the PDF report, and every field id are untouched, so results are identical to before.

## Preview

```bash
npx serve .
```

## GitHub Pages

Upload all files to the repository root. **Settings → Pages → Deploy from a branch**, choose
`main` and `/(root)`, save.

## Swapping the photos

`img-terrace.webp` and `img-skyline.webp` were lifted from the reference screens, so they are
modest resolution. Replace them with your own art at the same aspect ratios (roughly 950×370 and
830×550) and nothing else needs to change.
