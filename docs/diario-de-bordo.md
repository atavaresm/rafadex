# Diário de Bordo — RafaDex

> Registro pessoal e informal da evolução do projeto. Da ideia solta até achar algo
> que vale a pena construir. Ordem do **mais recente para o mais antigo** (estilo blog).

---

*Continua... (novas entradas entram aqui no topo)*

---

## 19/07/2026 22:57 — Nasce o RafaDex

Gostei tanto da pokedex que decidi transformá-la em presente: um app pro Rafa ver os
Pokémon no meu iPhone. Fiz o brainstorm completo hoje e as decisões saíram redondas:
**PWA** (zero App Store, instala pela Tela de Início) hospedada no **GitHub Pages**,
projeto novo com nome próprio — **RafaDex**, a Pokédex do Rafa.

O design nasceu todo em função dele: 3–6 anos, ainda não lê, então **nada depende de
texto** — navegação por mundos de tipo (ícones gigantes coloridos), detalhe com sprite
enorme e três botões de som (nome falado, grito oficial, narração da descrição — as
minhas 1025 traduções à mão viraram o tesouro do app), evoluções como fita visual
tocável, favoritos com coração e o jogo **"Quem é esse Pokémon?"** de silhueta, sem
pontuação nem derrota. Identidade visual derivada da pokedex mas infantil: Baloo 2,
botões gordinhos, animações com molejo, ícone de Pokébola com R.

Na parte técnica, o pulo do gato é que o RafaDex **não baixa nada da PokéAPI**: o
pipeline lê o cache e as traduções da pokedex e gera dados enxutos + sprites em WebP +
gritos convertidos de `.ogg` pra `.m4a` — descobri no caminho que **iOS não toca .ogg**,
o app nasceria mudo sem isso. Cache offline em duas camadas (Gen 1 pré-instalada, resto
sob demanda, botão "baixar tudo" pra viagem). Spec escrita, auto-revisada (fechei a
brecha do jogo sortear Pokémon sem cache) e commitada no repo novo. Próximo passo:
plano de implementação em 6 fases e execução por subagentes TDD.
