# 4A — experimento A/B em partidas normais

Na base `f6714f9cd667ba515f0e3eb7ea9aa4c497b3044f`, `tests/measure-4a.js` carrega o núcleo em VM. A usa o seletor normal; B substitui apenas a leitura dos resultados no seletor compartilhado, mantendo contador, exploração, tentativa ativa, percepção, esquiva, builds, física e memória geral. O jogo de produção não foi modificado. Os resultados continuam sendo registrados na memória em B, mas não são consultados pelo seletor. O teste `node --test tests/experiment-4a.test.js` cobre as diferenças e a preservação de exploração e tentativa ativa.

As oito partidas foram FFA aberta e Maze, 36 bots em configurações iniciais normais, seeds 7102/7103, 2400 ticks, aprendizado e builds adaptativos ligados e chefes desligados. Sem preparação de classe, nível ou score; não foram incluídos cenários preparados. Por condição, uma execução sem registro mede cada `Arena.step`; outra com registro compara o seletor no mesmo estado, removendo somente os resultados. O SHA-256 da sequência de estado vivo, posições e HP dos tanques, posições/durabilidade dos projéteis e posições/HP das formas coincidiu dentro de cada condição. Os hashes são verificações desses campos, não de todo o estado interno.

Em todas as oito condições, zero slots atingiram confiança 2 para tiro pesado ou enxame, zero tiveram tentativas avaliadas e zero chegaram a decisão alterada pelo histórico. Portanto, a amostra não demonstra efeito ou ausência de efeito do aprendizado: o funil parou no reconhecimento. Contagens são por slot durante a partida, incluindo renascimentos; o detector de escolha alterada compara o seletor no estado real mantendo tentativas e contador. Em B ele naturalmente não encontra escolha alterada por resultados, já que a leitura deles está desabilitada.

| Mapa | Seed | Versão | Mediana ms/tick | p95 ms/tick |
|---|---:|---|---:|---:|
| FFA | 7102 | A | 7,401 | 13,803 |
| FFA | 7102 | B | 8,009 | 13,403 |
| FFA | 7103 | A | 7,961 | 12,934 |
| FFA | 7103 | B | 7,184 | 12,863 |
| Maze | 7102 | A | 20,609 | 26,952 |
| Maze | 7102 | B | 20,442 | 27,068 |
| Maze | 7103 | A | 21,066 | 28,760 |
| Maze | 7103 | B | 20,789 | 29,343 |

Windows x64, Node 24.15.0, Intel i3-N305; sem renderização, sem aquecimento separado, A executado antes de B em cada par. Consultas curtas ao sistema ocorreram durante a medição; variação de carga, JIT, ordem e apenas duas seeds limitam comparações de desempenho. Tempo do hash e do registro não entra no tempo do tick. Dados individuais em `docs/resultados/4a-*.json`.

Reprodução PowerShell, na raiz:

```powershell
$env:TICKS='2400'
foreach ($map in 'open','maze') { foreach ($seed in 7102,7103) { foreach ($variant in 'A','B') {
  $env:MAP=$map; $env:SEED="$seed"; $env:VARIANT=$variant
  node tests/measure-4a.js > "4a-$map-$seed-$variant.json"
} } }
node --test tests/*.test.js
```

A suíte completa passou 87 testes no Node 24.15.0. Não houve teste em celular físico.
