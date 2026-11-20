# Auditoria e partidas longas — 4A

Base `f6714f9cd667ba515f0e3eb7ea9aa4c497b3044f`. FFA e Maze locais, 36 bots normais, seeds 7102/7103, 10.800 ticks, A e B; classes, nível e score não foram preparados. A usa resultados; B ignora apenas os agregados no seletor. A execução sem registro e a instrumentada de cada condição produziram o mesmo hash dos campos observados de tanques, projéteis e formas. Os seis resultados do checkpoint foram reaproveitados: as alterações posteriores ao medidor adicionam apenas a preparação `PREPARED=heavy`, inativa nas partidas normais.

## Auditoria de classes e emissões

Uma classe de tiro pesado é registrada quando possui canhão de bala capaz de produzir raio de pelo menos 0,75 do raio do tanque: no catálogo atual, Destroyer, Annihilator e Hybrid. Uma classe de enxame possui canhão de drone elegível ou converte quadrados (Necromancer). O mapa de classes registra o primeiro tick observado de cada nome de classe, não o número de bots daquela classe. O hook de emissão conta projéteis de tanque criados por `spawnShot` que atendem o mesmo limiar de raio e tipo bala, e drones `drone` criados por `spawnShot` ou `necroDrone` criados por conversão. Fragmentos de fogos e projéteis derivados de deployer são menores que o limiar de tiro pesado. Evidência 1/2 conta slots que atingiram confiança pelo menos 1/2 durante a partida. Propostas contam pensamentos que formaram plano, inclusive manutenção de tentativa; aberturas e avaliações contam tentativas. Mudança aplicada exige contrafactual diferente no mesmo pensamento e abertura efetiva nesse tick.

Validação preparada de Destroyer: `$env:PREPARED='heavy'; $env:SEED='7104'; $env:TICKS='300'; $env:MAP='open'; $env:VARIANT='A'; node tests/measure-4a.js` registrou Destroyer no tick 1, cinco tiros pesados reais, primeira e segunda evidências em um bot, duas aberturas e uma avaliação. No cenário preparado de Overseer/Pixel, `$env:PREPARED='1'; $env:SEED='7104'; $env:TICKS='1000'; $env:MAP='open'; $env:VARIANT='A'; node tests/measure-4a.js` registrou Overseer, 26 drones e a mudança aplicada no tick 901: afastamento 0 contra lateral 1 sem resultados. Ambos comparam hash com/sem instrumentação. Os cenários usam dois bots e 5000 HP iniciais; são validações, não partidas normais. Dados em `docs/resultados/4a-validacao-tiro.json` e `4a-validacao-pixel.json`.

## Resultados normais

| Mapa e seed | Versão | Classes capazes: primeiro tick | Emissões pesado/enxame | Bots evidência 1 pesado/enxame | Bots evidência 2 pesado/enxame | Propostas, aberturas, avaliações e mudanças aplicadas |
|---|---|---|---|---|---|---|
| FFA 7102 | A e B | nenhuma | 0 / 0 | 0 / 0 | 0 / 0 | todas 0 |
| FFA 7103 | A e B | nenhuma | 0 / 0 | 0 / 0 | 0 / 0 | todas 0 |
| Maze 7102 | A e B | nenhuma | 0 / 0 | 0 / 0 | 0 / 0 | todas 0 |
| Maze 7103 | A e B | Overseer: 8805 | 0 / 23 | 0 / 5 | 0 / 0 | todas 0 |

Para tiro pesado o funil parou antes do surgimento de classe capaz em todas as partidas. Para enxame parou antes de classe capaz nas três primeiras condições por seed/modalidade; em Maze 7103 surgiu Overseer e cinco bots chegaram à primeira evidência, mas nenhum à segunda. Não houve propostas, tentativas avaliadas ou decisões alteradas em qualquer lado. Isso não demonstra ausência de efeito da memória em partidas com mais oportunidade. Dados por condição em `docs/resultados/4a-longo-*.json`.

Reprodução PowerShell:

```powershell
$env:PREPARED='0'; $env:TICKS='10800'
foreach ($map in 'open','maze') { foreach ($seed in 7102,7103) { foreach ($variant in 'A','B') {
  $env:MAP=$map; $env:SEED="$seed"; $env:VARIANT=$variant
  node tests/measure-4a.js > "4a-longo-$map-$seed-$variant.json"
} } }
node --test tests/*.test.js
```

A suíte completa passou 87 testes no Node 24.15.0. Não houve teste em celular físico.
