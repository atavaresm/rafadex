"""RafaDex pipeline: reads the pokedex project's data and emits dex.js + optimized assets."""
import json
import re
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


def buildDexEntries(pokemon, i18n):
    entries = []
    for mon in pokemon:
        override = i18n.get(mon["id"], {})
        entries.append({
            "id": mon["id"], "name": mon["name"], "gen": mon["gen"], "types": mon["types"],
            "evo": mon["evolution"]["stages"],
            "cat": override.get("category", mon["category"]),
            "flavor": override.get("flavor", mon["flavorText"]),
        })
    return entries


def renderDexJs(entries):
    dex = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    types = json.dumps(TYPES, ensure_ascii=False, separators=(",", ":"))
    return f"window.DEX={dex};\nwindow.TYPES={types};\n"


def buildDataset(root=POKEDEX_ROOT, outPath=Path("data/dex.js")):
    pokemon = json.loads((root / "data" / "pokemon.json").read_text())
    i18n = parseI18nDex((root / "i18n-dex.js").read_text())
    entries = buildDexEntries(pokemon, i18n)
    outPath.parent.mkdir(parents=True, exist_ok=True)
    outPath.write_text(renderDexJs(entries))
    print(f"dex.js: {len(entries)} entries, {sum(1 for m in pokemon if m['id'] in i18n)} pt-BR")
    return entries


if __name__ == "__main__":
    buildDataset()
