"""Regenerates assets/qr-share.svg, the QR shown on the info page.

Run it only when SHARE_URL changes:

    uv run --no-project --with segno tools/gen_share_qr.py

segno is deliberately NOT a project dependency — the pipeline is stdlib-only and this
artifact is committed, so the one command above is the whole story
(--no-project keeps uv from writing a uv.lock into a project that has no deps). The encoded URL is
stamped into the SVG's <desc> so tests/test_share_qr.py can catch the artifact drifting
away from the URL app.js advertises.
"""
from pathlib import Path

import segno

SHARE_URL = "https://amaix-dev.com/pokedex/"
OUTPUT = Path(__file__).resolve().parent.parent / "assets" / "qr-share.svg"


def generateShareQr(url=SHARE_URL, output=OUTPUT):
    qr = segno.make(url, error="q")
    qr.save(
        str(output),
        kind="svg",
        scale=10,
        border=2,
        dark="#000000",
        # Baked in rather than left transparent: the card behind it is themed, and a QR
        # on a dark background does not scan.
        light="#ffffff",
        title="Pokedex",
        desc=url,
    )
    return output


if __name__ == "__main__":
    path = generateShareQr()
    print(f"wrote {path} ({path.stat().st_size} bytes) for {SHARE_URL}")
