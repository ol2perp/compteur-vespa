#!/usr/bin/env python3
"""Derive the production speedometer SVG from the source artwork.

V_1-MAIN.svg (Illustrator export) contains the exact live text for every
dynamic readout (font, size, color, position) as real <text>/<tspan>
elements — src/dials.js writes straight into those nodes at runtime. This
script only handles what the raw Illustrator export can't do itself:

1. Insert a full-canvas "Couleur-dynamique" rect just under the BG image,
   recolored live from Réglages (V2 color customization) — visible through
   V_2-Compteur-BG.png's transparent body-color cutouts.
2. Inline the background image as base64 (V_2-Compteur-BG.png, not the
   V_1-MAIN-CodeSVG.txt source's own — still V_1 — image reference; see
   BG_IMAGE below), so public/compteur.svg stays a single self-contained
   file the app can fetch.
3. Swap the dynamic-text font to the Typekit-embedded family: Illustrator
   labels it "DINCondensed-Bold", which has no matching cut on Adobe Fonts
   (only "DIN Condensed" Regular) — and drop the font-weight: 700 the
   designer asked to remove (no synthetic bold).
4. Re-anchor the CONSO / HEURES / Cabdran-Vitesse dynamic text to the
   designer's reference guides (the "REPERES" layer: dashed lines marking
   where each dial's text should stay pinned as digit count changes) —
   right-aligned for CONSO, centered for HEURES and Cabdran-Vitesse — then
   strip that guide layer, which exists only to communicate the anchor
   points and must not render in the app.
5. Drop the hardcoded x on the KM odometer's colored last-digit tspan.
   Illustrator bakes in an absolute x tuned for how wide "00382" happens to
   render in DIN Condensed specifically — any other font (a fallback, if the
   Typekit embed fails to load in a given browser) has different digit
   widths, so that fixed offset either gaps or overlaps. Without an x, the
   tspan just continues immediately after the previous one, which is exactly
   right regardless of which font actually renders.

Usage: python3 scripts/clean-svg.py
Reads:  docs/DesignGraphik/V_1/V_1-MAIN-CodeSVG.txt
        docs/DesignGraphik/V_2/V_2-Compteur-BG.png
Writes: public/compteur.svg
"""
import base64
import re

SRC_DIR = "docs/DesignGraphik/V_1"
# The designer's hand-off channel is the .txt copy of the SVG code (kept more
# reliably up to date than the .svg file itself across edits).
SRC = f"{SRC_DIR}/V_1-MAIN-CodeSVG.txt"
# The source .txt still links V_1-Compteur-BG.png (the designer hasn't
# re-exported it) — the regex below matches on that filename regardless, and
# we inline V_2's file (with alpha transparency over the body-color areas,
# letting Couleur-dynamique show through) in its place.
BG_IMAGE = "docs/DesignGraphik/V_2/V_2-Compteur-BG.png"
DST = "public/compteur.svg"

with open(SRC, encoding="utf-8") as f:
    svg = f.read()

# --- 1. insert the recolorable body-color layer -----------------------------
# Sits directly under the BG image so it's invisible until the designer
# hands off a BG PNG with transparent cutouts over the "body color" areas
# (V_2-Compteur-BG.png) — see docs/superpowers/specs — at which point src/
# dials.js's setAccentColor() recolors it live from the Réglages picker.
# Full-canvas flat rect: the *PNG's* alpha shapes the visible silhouette, so
# this doesn't need to trace any outline by hand.
vb_match = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg)
if not vb_match:
    raise SystemExit("could not find viewBox to size the Couleur-dynamique layer")
vb_w, vb_h = vb_match.group(1), vb_match.group(2)
svg, n_color_layer = re.subn(
    r'(<image id="Compteur-BG")',
    f'<rect id="Couleur-dynamique" x="0" y="0" width="{vb_w}" height="{vb_h}" fill="#2e97b7"/>\n    \\1',
    svg,
    count=1,
)
if n_color_layer != 1:
    raise SystemExit("could not insert Couleur-dynamique layer before Compteur-BG image")

# --- 2. inline the background image ----------------------------------------
# Illustrator sometimes exports this as an absolute/relative path instead of
# a bare filename, so match on the filename regardless of what precedes it.
with open(BG_IMAGE, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
svg, n_bg = re.subn(
    r'xlink:href="[^"]*V_1-Compteur-BG\.png"',
    f'xlink:href="data:image/png;base64,{b64}"',
    svg,
)
if n_bg != 1:
    raise SystemExit(f"expected exactly 1 BG image reference, found {n_bg}")

# --- 3. font-family -> Typekit embed, drop the synthetic-bold weight -------
svg, n_font = re.subn(
    r"font-family:\s*DINCondensed-Bold,\s*'DIN Condensed';\s*font-weight:\s*700;",
    'font-family: "din-condensed", sans-serif;',
    svg,
)
if n_font != 1:
    raise SystemExit(f"expected exactly 1 DINCondensed-Bold font-family rule, found {n_font}")

# Group-id prefix match: Illustrator appends a digit on export whenever the
# designer duplicates a layer (e.g. "Cadran-HEURES" -> "Cadran-HEURES1"), so
# match the stable prefix rather than the exact id.
def extract_group(svg_text, group_id):
    start = svg_text.index(f'<g id="{group_id}')
    depth = 0
    end = None
    for m in re.finditer(r"<g\b|</g>", svg_text[start:]):
        depth += 1 if m.group(0) == "<g" else 0
        if m.group(0) == "</g>":
            depth -= 1
            if depth == 0:
                end = start + m.end()
                break
    if end is None:
        raise SystemExit(f"could not find matching </g> for group {group_id}")
    return start, end, svg_text[start:end]

# --- 4. re-anchor dynamic text onto the designer's reference guides --------
def realign_group(svg_text, group_id, new_x, anchor):
    start, end, block = extract_group(svg_text, group_id)
    block, n = re.subn(
        r'(<text class="[^"]+")( transform="translate\()[-\d.]+( [-\d.]+\)")',
        rf'\1 text-anchor="{anchor}"\g<2>{new_x}\g<3>',
        block,
    )
    if n == 0:
        raise SystemExit(f"no <text> re-anchored in group {group_id}")
    return svg_text[:start] + block + svg_text[end:]

svg = realign_group(svg, "Cadran_CONSO", 366.7, "end")
svg = realign_group(svg, "Cadran-HEURES", 516.2, "middle")
svg = realign_group(svg, "Cabdran-Vitesse", 679.1, "middle")

# --- 5. let the KM odometer's colored last digit flow naturally -----------
def strip_colored_tspan_x(svg_text, group_id):
    start, end, block = extract_group(svg_text, group_id)
    block, n = re.subn(r'(<tspan class="[^"]+")\s+x="[-\d.]+"', r"\1", block)
    if n == 0:
        raise SystemExit(f"no colored tspan x-offset found in group {group_id}")
    return svg_text[:start] + block + svg_text[end:]

svg = strip_colored_tspan_x(svg, "Cadran-KM")

# --- 6. drop the REPERES guide layer (design aid only, never shipped) ------
repere_start = svg.index('<g id="REPERES">')
svg = svg[:repere_start] + "</svg>\n"

with open(DST, "w", encoding="utf-8") as f:
    f.write(svg)

print(f"wrote {DST} ({len(svg)} bytes) — color layer inserted, BG inlined, font patched, text re-anchored, guides stripped")
