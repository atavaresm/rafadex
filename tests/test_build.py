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
         "evolution": {"stages": [[1], [2], [3]]},
         "category": "Seed Pokémon", "flavorText": "A strange seed."},
        {"id": 999, "name": "Gimmighoul", "gen": 9, "types": ["ghost"],
         "evolution": {"stages": [[999], [1000]]},
         "category": "Coin Chest Pokémon", "flavorText": "It hides in a chest."},
    ]
    i18n = {1: {"category": "Pokémon Semente", "flavor": "Uma semente estranha."}}
    entries = build.buildDexEntries(pokemon, i18n)
    assert entries[0] == {"id": 1, "name": "Bulbasaur", "gen": 1,
                          "types": ["grass", "poison"], "evo": [[1], [2], [3]],
                          "cat": "Pokémon Semente", "flavor": "Uma semente estranha."}
    assert entries[1]["cat"] == "Coin Chest Pokémon"  # english fallback
    assert entries[1]["flavor"] == "It hides in a chest."


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
