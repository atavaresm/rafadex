"""RafaDex pipeline: reads the pokedex project's data and emits dex.js + optimized assets."""
import argparse
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

POKEDEX_ROOT = Path("/Users/amais/project/pokedex")

TYPES = {
    "normal":   {"name": "Normal",   "color": "#a8a878", "emoji": "⭐"},
    "fire":     {"name": "Fogo",     "color": "#f08030", "emoji": "🔥"},
    "water":    {"name": "Água",     "color": "#6890f0", "emoji": "💧"},
    "electric": {"name": "Elétrico", "color": "#f8d030", "emoji": "⚡"},
    "grass":    {"name": "Planta",   "color": "#78c850", "emoji": "🍃"},
    "ice":      {"name": "Gelo",     "color": "#98d8d8", "emoji": "❄️"},
    "fighting": {"name": "Lutador",  "color": "#c03028", "emoji": "🥊"},
    "poison":   {"name": "Veneno",   "color": "#a040a0", "emoji": "☠️"},
    "ground":   {"name": "Terra",    "color": "#e0c068", "emoji": "⛰️"},
    "flying":   {"name": "Voador",   "color": "#a890f0", "emoji": "🪽"},
    "psychic":  {"name": "Psíquico", "color": "#f85888", "emoji": "🔮"},
    "bug":      {"name": "Inseto",   "color": "#a8b820", "emoji": "🐛"},
    "rock":     {"name": "Pedra",    "color": "#b8a038", "emoji": "🪨"},
    "ghost":    {"name": "Fantasma", "color": "#705898", "emoji": "👻"},
    "dragon":   {"name": "Dragão",   "color": "#7038f8", "emoji": "🐉"},
    "dark":     {"name": "Sombrio",  "color": "#705848", "emoji": "🌙"},
    "steel":    {"name": "Aço",      "color": "#b8b8d0", "emoji": "⚙️"},
    "fairy":    {"name": "Fada",     "color": "#ee99ac", "emoji": "✨"},
}

I18N_LINE = re.compile(r'^\s*(\d+):\s*\{\s*category:\s*"(.*?)",\s*flavor:\s*"(.*?)"\s*\},?\s*$')


def parseI18nDex(text):
    parsed = {}
    for line in text.splitlines():
        match = I18N_LINE.match(line)
        if match:
            parsed[int(match.group(1))] = {"category": match.group(2), "flavor": match.group(3)}
    return parsed


PRONOUNCE_LINE = re.compile(r'^\s*(\d+):\s*"(.*?)",?\s*$')


def parsePronounceDex(text):
    parsed = {}
    for line in text.splitlines():
        match = PRONOUNCE_LINE.match(line)
        if match:
            parsed[int(match.group(1))] = match.group(2)
    return parsed


def buildDexEntries(pokemon, i18n, pronounce=None):
    pronounce = pronounce or {}
    entries = []
    for mon in pokemon:
        override = i18n.get(mon["id"], {})
        entry = {
            "id": mon["id"], "name": mon["name"], "gen": mon["gen"], "types": mon["types"],
            "evo": mon["evolution"]["stages"],
            "cat": override.get("category", mon["category"]),
            "flavor": override.get("flavor", mon["flavorText"]),
            "power": mon["stats"]["total"],
        }
        if mon["id"] in pronounce:
            entry["speak"] = pronounce[mon["id"]]
        entries.append(entry)
    return entries


def renderDexJs(entries):
    dex = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    types = json.dumps(TYPES, ensure_ascii=False, separators=(",", ":"))
    return f"window.DEX={dex};\nwindow.TYPES={types};\n"


def buildDataset(root=POKEDEX_ROOT, outPath=Path("data/dex.js"),
                  pronouncePath=Path("pronounce-dex.js")):
    pokemon = json.loads((root / "data" / "pokemon.json").read_text())
    i18n = parseI18nDex((root / "i18n-dex.js").read_text())
    pronounceText = pronouncePath.read_text() if pronouncePath.exists() else ""
    pronounce = parsePronounceDex(pronounceText)
    entries = buildDexEntries(pokemon, i18n, pronounce)
    outPath.parent.mkdir(parents=True, exist_ok=True)
    outPath.write_text(renderDexJs(entries))
    print(f"dex.js: {len(entries)} entries, {sum(1 for m in pokemon if m['id'] in i18n)} pt-BR, "
          f"{len(pronounce)} pronounce overrides")
    return entries


def resolveFfmpeg():
    envPath = os.environ.get("RAFADEX_FFMPEG")
    if envPath:
        return envPath
    candidates = ("ffmpeg", "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
                  "/usr/local/opt/ffmpeg-full/bin/ffmpeg")
    for candidate in candidates:
        found = shutil.which(candidate)
        if not found:
            continue
        probe = subprocess.run([found, "-hide_banner", "-encoders"], capture_output=True)
        if b"webp" in probe.stdout:
            return found
    return "ffmpeg"


FFMPEG = resolveFfmpeg()


def runFfmpeg(args):
    subprocess.run([FFMPEG, "-loglevel", "error", "-y", *args], check=True)


def convertSprite(src, dst, width):
    runFfmpeg(["-i", str(src), "-vf", f"scale={width}:-1", str(dst)])


def convertCry(src, dst):
    runFfmpeg(["-i", str(src), "-c:a", "aac", "-b:a", "64k", str(dst)])


def isUpToDate(src, dst):
    return dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime


def buildAssets(ids, root=POKEDEX_ROOT, force=False):
    jobs = {"thumb": 0, "full": 0, "cry": 0}
    for kind in ("thumb", "full"):
        Path(f"assets/sprites/{kind}").mkdir(parents=True, exist_ok=True)
    Path("assets/cries").mkdir(parents=True, exist_ok=True)
    for monId in ids:
        srcPng = root / "data" / "sprites" / "official" / f"{monId}.png"
        srcOgg = root / "data" / "cries" / f"{monId}.ogg"
        targets = [(srcPng, Path(f"assets/sprites/thumb/{monId}.webp"), "thumb", 128),
                   (srcPng, Path(f"assets/sprites/full/{monId}.webp"), "full", 512)]
        for src, dst, kind, width in targets:
            if src.exists() and (force or not isUpToDate(src, dst)):
                convertSprite(src, dst, width)
                jobs[kind] += 1
        dstM4a = Path(f"assets/cries/{monId}.m4a")
        if srcOgg.exists() and (force or not isUpToDate(srcOgg, dstM4a)):
            convertCry(srcOgg, dstM4a)
            jobs["cry"] += 1
    print(f"assets: converted {jobs}")


def renderPrecacheJs(ids):
    urls = []
    for monId in ids:
        urls += [f"assets/sprites/thumb/{monId}.webp", f"assets/sprites/full/{monId}.webp",
                 f"assets/cries/{monId}.m4a"]
    return f"const RAFADEX_PRECACHE={json.dumps(urls)};\n"


def renderSwVersionJs():
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f'const SW_BUILD = "{stamp}";\n'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="re-convert all media")
    args = parser.parse_args()
    entries = buildDataset()
    allIds = [entry["id"] for entry in entries]
    buildAssets(allIds, force=args.force)
    gen1Ids = [entry["id"] for entry in entries if entry["gen"] == 1]
    Path("precache.js").write_text(renderPrecacheJs(gen1Ids))
    Path("sw-version.js").write_text(renderSwVersionJs())
    missing = [i for i in allIds
               if not (Path(f"assets/sprites/thumb/{i}.webp").exists()
                       and Path(f"assets/sprites/full/{i}.webp").exists()
                       and Path(f"assets/cries/{i}.m4a").exists())]
    if missing:
        raise SystemExit(f"missing outputs for ids: {missing[:20]}...")


if __name__ == "__main__":
    main()
