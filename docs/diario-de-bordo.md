# Diário de Bordo — RafaDex

> Registro pessoal e informal da evolução do projeto. Da ideia solta até achar algo
> que vale a pena construir. Ordem do **mais recente para o mais antigo** (estilo blog).

---

*Continua... (novas entradas entram aqui no topo)*

---

## 21/07/2026 13:28 — Execução por subagentes: pipeline e casca do app no ar

Peguei o plano de 13 tasks e comecei a execução via subagent-driven-development: um
implementador novo por task, revisor independente depois, ciclo de correção quando
sobra achado. Fechei as Tasks 1–6 (scaffold do repo, pipeline de dados, conversão de
mídia, casca do app + Home, telas de mundo/detalhe, service worker) — todas com
revisão aprovada, algumas só depois de rodada de correção.

Pegou bug de verdade em quase toda revisão. O revisor achou que a home ficava com a
cor do último tipo visitado grudada (corrigi centralizando o reset no router). O maior
susto foi o service worker: o `cache.addAll()` é atômico, e como os ícones do app só
nascem na Task 11, uma 404 deles derrubava a instalação inteira — o app ficava sem
offline nenhum. Separei em núcleo obrigatório + ícones opcionais tolerantes a falha.
Testei offline **de verdade** matando o processo do servidor (não só o toggle do
DevTools) e confirmei por `curl` que a porta morreu — nesse teste vi o segundo bug: a
tela de detalhe mostrava o ícone de imagem quebrada do navegador pra Pokémon nunca
cacheado, contra a exigência explícita da spec ("nunca imagem quebrada"). Troquei por
um pixel transparente + fundo cinza arredondado, confirmado por computed style, não só
por olhômetro. Também bati de frente com cache HTTP obsoleto do meu próprio servidor
de desenvolvimento de longa duração mascarando os fixes — resolvido trocando de porta
a cada rodada de verificação. Dois subagentes corretores travaram no meio do caminho
(um por stall, um por limite de sessão) — nos dois casos assumi eu mesmo terminar o
commit em vez de redespachar do zero. Restam 7 tasks: áudio, favoritos, evolução,
jogo, ícones, deploy no GitHub Pages e a verificação final no iPhone de verdade.

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
