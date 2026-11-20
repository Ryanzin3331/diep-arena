# Revisão final do 3A — escolha e desempenho

A comparação usa `main` `0b6433c617d863f19fe6ff1a6fa56ae4dad20a70` e PR `33f3970b6c4eda9bde917f653ee73104a033a77a`, sem alterações de pontuação ou esquiva. Sistema Windows x64, Node 24.15.0, Intel Core i3-N305, 8 processadores lógicos. As medições são do núcleo em Node, sem renderização ou navegador; não há tempo por frame. O Poco C75 físico não foi testado e permanece pendente.

## Decisão autônoma

`node --test tests/*.test.js`: 72 testes passaram. `node tests/review-3a-choice.js` reproduz o pensamento real na FFA preparada da seed 7102. No tick 1029, slot 21, rival 450, o contador antes da decisão é 7. Com os resultados `[{sum:0.1775,count:1},{sum:0.3195,count:2}]`, o seletor e a tentativa 8 escolhem flanco (0). Reavaliando nesse mesmo ponto sem resultados, com o mesmo contador e sem tentativa ativa, escolhe distância (1). A comparação consulta o seletor real e verifica a tentativa criada; não altera a decisão da Arena.

## Método de desempenho

`node tests/benchmark-3a-review.js > performance.json` executa FFA aberta, Maze e FFA carregada. Em PowerShell, `$env:SCENARIOS='prepared-open,prepared-maze'; node tests/benchmark-3a-review.js > preparado.json` executa as duas partidas preparadas. Para repetir a cena carregada seed 7104 em ordem inversa: `$env:SCENARIOS='crowded'; $env:SEEDS='7104'; $env:ORDER='pr-first'; node tests/benchmark-3a-review.js > repeticao.json`. Use uma sessão limpa ou remova as variáveis para voltar aos padrões. A main é carregada via `git show` do commit acima; a versão PR é o `index.html` corrente. Rode com checkout do commit PR acima.

Cada versão usa 36 bots, seeds 7102–7104, aprendizado e builds adaptativos ligados, chefes desligados; 240 ticks de aquecimento e 600 ticks medidos por seed. A ordem é alternada entre versões a cada seed. Mede-se `Arena.step` por `performance.now`, sem a coleta de contagens; mediana e p95 usam o conjunto de 1.800 ticks por versão e cenário (percentil por posto). Os JSONs incluem amostras individuais e resultados por seed. Valores abaixo são milissegundos por tick; tempos são observacionais, sujeitos a carga do computador, JIT e coleta de lixo.

| Cena | main mediana / p95 | PR mediana / p95 |
|---|---:|---:|
| FFA, início normal | 6,100 / 9,013 | 6,329 / 9,127 |
| Maze, início normal | 15,943 / 21,524 | 16,031 / 22,050 |
| FFA preparada | 12,984 / 17,027 | 12,936 / 17,092 |
| Maze preparada | 33,128 / 38,597 | 33,356 / 41,207 |
| FFA carregada de drones | 9,306 / 14,577 | 10,383 / 17,526 |

As partidas preparadas põem todos no nível 30, slots 0–5 Destroyer e 6–11 Overseer, os demais com a classe inicial, score e atributos preparados igualmente. No PR, durante os 840 ticks totais, FFA teve 43/64/87 tentativas em 14/15/20 bots; Maze teve 68/49/68 em 14/8/19 bots. A main não tem tentativas 3A. Os caminhos podem divergir após a preparação: por exemplo, no Maze preparado a mediana de projéteis/drones por seed foi 135/170/157 na main e 128/161/151 no PR.

Na cena carregada, 36 Overseers nível 30 começam em grade central com 180 unidades de espaçamento; depois a IA, os disparos e as colisões são normais. As medianas por seed foram 126–134 projéteis ou drones em ambas versões, com máximos de 144–176. O agregado inicial de p95 foi 20,2% maior no PR, concentrado na seed 7104 (15,202 → 20,344 ms). Na repetição dessa seed com PR primeiro, mediana/p95 foi 14,151/24,334 ms na main e 14,202/22,981 ms no PR; a diferença inicial não se repetiu. A variação absoluta entre execuções limita a conclusão.

No Maze preparado o p95 agregado do PR ficou 6,8% maior; por seed, main → PR: 37,636 → 41,584, 38,552 → 39,691 e 39,526 → 41,353 ms. Na repetição da seed 7102 com PR primeiro, mediana/p95 foi 32,454/38,295 ms na main e 32,428/41,083 ms no PR. O p95 maior se repetiu, mas a comparação ainda mistura custo de código e trajetórias diferentes. É uma possível regressão sem limiar de aceitação informado; a main já ultrapassa 16,67 ms por tick nesta máquina. A medição não permite concluir desempenho no celular nem isolar o custo do 3A das mudanças de trajetória.

Dados brutos: `docs/resultados/3a-revisao-performance.json`, `3a-revisao-performance-preparado.json`, `3a-revisao-performance-7104-repeticao.json` e `3a-revisao-performance-maze-repeticao.json`. Para repetir: `$env:SCENARIOS='prepared-maze'; $env:SEEDS='7102'; $env:ORDER='pr-first'; node tests/benchmark-3a-review.js > maze-repeticao.json`. Não há resultado de navegador ou de Poco C75 físico.
