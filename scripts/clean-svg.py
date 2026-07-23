#!/usr/bin/env python3
"""Derive the production speedometer SVG from the source artwork.

The source `Compteur-SVG.svg` (from Illustrator) bakes SAMPLE dynamic values into
the four dial groups (Cadran_CONSO, Cadran-HEURES, Cabdran-METEO, Cadran-KM):
literal text like "0353" / "003826" and raster images (value bands, pump icon,
the whole weather widget). The app draws those values as live HTML overlays on
top of the dials, so the baked-in content must be stripped — otherwise it shows
through behind the overlays.

This script keeps each dial's white <ellipse> (the circle the overlay sits on)
and removes every <text> and <image> inside the Cadran* groups. Everything else
(chrome/face background image, black+white scale numbers, Vespa logo, #Jauge
path) is preserved untouched.

Usage: python3 scripts/clean-svg.py
Reads:  Compteur-SVG.svg  (pristine source in repo root)
Writes: public/compteur.svg
"""
import re
import sys
import xml.etree.ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", XLINK_NS)

SRC = "Compteur-SVG.svg"
DST = "public/compteur.svg"
DIAL_ID = re.compile(r"adran|abdran", re.IGNORECASE)  # matches Cadran* and the "Cabdran" typo group
STRIP_TAGS = {f"{{{SVG_NS}}}text", f"{{{SVG_NS}}}image"}

tree = ET.parse(SRC)
root = tree.getroot()

removed = 0
kept_ellipses = 0
for g in root.iter(f"{{{SVG_NS}}}g"):
    gid = g.get("id", "")
    if not DIAL_ID.search(gid):
        continue
    for child in list(g):
        if child.tag in STRIP_TAGS:
            g.remove(child)
            removed += 1
        elif child.tag == f"{{{SVG_NS}}}ellipse":
            kept_ellipses += 1

if kept_ellipses < 4:
    sys.exit(f"ERROR: expected >=4 dial ellipses, kept {kept_ellipses} — aborting")

tree.write(DST, encoding="unicode", xml_declaration=True)
print(f"cleaned SVG: removed {removed} text/image nodes, kept {kept_ellipses} dial ellipses -> {DST}")
