"""The share QR is a committed artifact; these tests guard it against drifting
away from the URL the app actually advertises."""
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
QR_SVG = REPO / "assets" / "qr-share.svg"
APP_JS = REPO / "app.js"
GENERATOR = REPO / "tools" / "gen_share_qr.py"


def readQrEncodedUrl():
    """The generator stamps the encoded URL into the SVG's <desc>, so the committed
    artifact carries the only thing a stdlib test can check it against."""
    svg = QR_SVG.read_text(encoding="utf-8")
    match = re.search(r"<desc>(.*?)</desc>", svg, re.DOTALL)
    assert match, "qr-share.svg has no <desc> stamping the URL it encodes"
    return match.group(1).strip()


def testShareQrArtifactIsCommitted():
    assert QR_SVG.exists(), "assets/qr-share.svg is missing — regenerate it"
    svg = QR_SVG.read_text(encoding="utf-8")
    assert svg.lstrip().startswith("<?xml") or svg.lstrip().startswith("<svg")
    assert "</svg>" in svg
    assert len(svg) > 500, "SVG is suspiciously small to hold a QR"


def testShareQrEncodesThePublicUrl():
    assert readQrEncodedUrl() == "https://amaix-dev.com/pokedex/"


def testAppAdvertisesTheSameUrlTheQrEncodes():
    """A QR pointing somewhere other than the link next to it is worse than no QR."""
    app = APP_JS.read_text(encoding="utf-8")
    match = re.search(r'const SHARE_URL = "([^"]+)"', app)
    assert match, "app.js has no SHARE_URL constant"
    assert match.group(1) == readQrEncodedUrl()


def testGeneratorIsCheckedInSoTheArtifactCanBeRebuilt():
    assert GENERATOR.exists(), "tools/gen_share_qr.py is missing"
    source = GENERATOR.read_text(encoding="utf-8")
    assert "https://amaix-dev.com/pokedex/" in source
