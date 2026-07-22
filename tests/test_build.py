import json
import subprocess

import build


def testParseI18nDexExtractsEntries():
    text = '''window.I18N.pokemon = {
  1: { category: "Pokémon Semente", flavor: "Uma semente estranha." },
  25: { category: "Pokémon Rato", flavor: "Ele solta faíscas." },
};'''
    parsed = build.parseI18nDex(text)
    assert parsed[1] == {"category": "Pokémon Semente", "flavor": "Uma semente estranha."}
    assert parsed[25]["flavor"] == "Ele solta faíscas."


def testBuildDexEntriesMergesI18nWithEnglishFallback():
    pokemon = [
        {"id": 1, "name": "Bulbasaur", "gen": 1, "types": ["grass", "poison"],
         "evolution": {"stages": [[1], [2], [3]]}, "stats": {"total": 318},
         "category": "Seed Pokémon", "flavorText": "A strange seed."},
        {"id": 999, "name": "Gimmighoul", "gen": 9, "types": ["ghost"],
         "evolution": {"stages": [[999], [1000]]}, "stats": {"total": 300},
         "category": "Coin Chest Pokémon", "flavorText": "It hides in a chest."},
    ]
    i18n = {1: {"category": "Pokémon Semente", "flavor": "Uma semente estranha."}}
    entries = build.buildDexEntries(pokemon, i18n)
    assert entries[0] == {"id": 1, "name": "Bulbasaur", "gen": 1,
                          "types": ["grass", "poison"], "evo": [[1], [2], [3]],
                          "cat": "Pokémon Semente", "flavor": "Uma semente estranha.",
                          "power": 318}
    assert entries[1]["cat"] == "Coin Chest Pokémon"  # english fallback
    assert entries[1]["flavor"] == "It hides in a chest."
    assert entries[1]["power"] == 300
    assert "speak" not in entries[0]  # no pronounce override passed


def testParsePronounceDexExtractsEntries():
    text = '''window.PRONOUNCE = {
  6: "Tcharizárd",
  25: "Pikatchu",
};'''
    parsed = build.parsePronounceDex(text)
    assert parsed == {6: "Tcharizárd", 25: "Pikatchu"}


def testBuildDexEntriesAppliesPronounceOverride():
    pokemon = [
        {"id": 6, "name": "Charizard", "gen": 1, "types": ["fire", "flying"],
         "evolution": {"stages": [[4], [5], [6]]}, "stats": {"total": 534},
         "category": "Flame Pokémon", "flavorText": "It spits fire."},
    ]
    entries = build.buildDexEntries(pokemon, {}, {6: "Tcharizárd"})
    assert entries[0]["speak"] == "Tcharizárd"
    assert entries[0]["name"] == "Charizard"  # displayed name never changes


def testBuildDatasetToleratesMissingPronounceFile(tmp_path, monkeypatch):
    root = tmp_path / "pokedex"
    (root / "data").mkdir(parents=True)
    (root / "data" / "pokemon.json").write_text(json.dumps([
        {"id": 1, "name": "Bulbasaur", "gen": 1, "types": ["grass"],
         "evolution": {"stages": [[1]]}, "stats": {"total": 318},
         "category": "Seed Pokémon", "flavorText": "A strange seed."},
    ]))
    (root / "i18n-dex.js").write_text("window.I18N.pokemon = {};")
    monkeypatch.chdir(tmp_path)
    entries = build.buildDataset(root=root, outPath=tmp_path / "data" / "dex.js",
                                  pronouncePath=tmp_path / "pronounce-dex.js")
    assert entries[0]["power"] == 318
    assert "speak" not in entries[0]


def testRenderDexJsEmitsWindowGlobals():
    entries = [{"id": 1, "name": "Bulbasaur", "gen": 1, "types": ["grass"],
                "evo": [[1]], "cat": "X", "flavor": "Y"}]
    out = build.renderDexJs(entries)
    assert out.startswith("window.DEX=")
    assert "window.TYPES=" in out
    assert '"Bulbasaur"' in out


def testTypesTableComplete():
    assert len(build.TYPES) == 18
    for key, info in build.TYPES.items():
        assert set(info) == {"name", "color", "emoji"}


def testRenderPrecacheJsListsGen1AssetUrls():
    out = build.renderPrecacheJs([1, 25])
    assert out.startswith("const RAFADEX_PRECACHE=")
    for url in ("assets/sprites/thumb/1.webp", "assets/sprites/full/25.webp",
                "assets/cries/25.m4a"):
        assert f'"{url}"' in out
    assert "/rafadex/" not in out  # relative URLs only


def testConvertSpriteAndCryProduceFiles(tmp_path):
    srcPng = tmp_path / "in.png"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i",
                    "color=red:size=64x64", "-frames:v", "1", str(srcPng)], check=True)
    dstWebp = tmp_path / "out.webp"
    build.convertSprite(srcPng, dstWebp, 32)
    assert dstWebp.exists() and dstWebp.stat().st_size > 0

    srcOgg = tmp_path / "in.ogg"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i",
                    "sine=frequency=440:duration=0.2", str(srcOgg)], check=True)
    dstM4a = tmp_path / "out.m4a"
    build.convertCry(srcOgg, dstM4a)
    assert dstM4a.exists() and dstM4a.stat().st_size > 0


def testResolveFfmpegPrefersEnvVar(monkeypatch):
    monkeypatch.setenv("RAFADEX_FFMPEG", "/custom/ffmpeg")
    assert build.resolveFfmpeg() == "/custom/ffmpeg"


def testBuildAssetsSkipsUpToDateOutputs(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(build, "convertSprite", lambda s, d, w: calls.append(d) or d.write_bytes(b"x"))
    monkeypatch.setattr(build, "convertCry", lambda s, d: calls.append(d) or d.write_bytes(b"x"))
    root = tmp_path / "pokedex"
    for rel in ("data/sprites/official", "data/cries"):
        (root / rel).mkdir(parents=True)
    (root / "data/sprites/official/1.png").write_bytes(b"png")
    (root / "data/cries/1.ogg").write_bytes(b"ogg")
    monkeypatch.chdir(tmp_path)
    build.buildAssets([1], root)
    assert len(calls) == 3  # thumb + full + cry
    calls.clear()
    build.buildAssets([1], root)
    assert calls == []  # second run skips everything


def testRenderServiceWorkerInjectsTimestamp():
    template = 'const VERSION = "__SW_BUILD__";\nconsole.log(VERSION);\n'
    out = build.renderServiceWorker(template, "20260722040414")
    assert out == 'const VERSION = "20260722040414";\nconsole.log(VERSION);\n'
    assert "__SW_BUILD__" not in out


def testRenderVersionJsEmitsWindowGlobals():
    out = build.renderVersionJs("v1.3", "22/07/2026")
    assert out == 'window.APP_VERSION = "v1.3";\nwindow.APP_BUILD_DATE = "22/07/2026";\n'
