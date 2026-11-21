# Partidas A/B iniciadas no nível 15

Base do jogo: `9daad91`. FFA seed 7102 e Maze seed 7103; 36 bots, 10800 ticks. A preparação mantém o `goal` e `autoBranch` gerados na partida normal, define nível 15, `XP[14]`, raio, distribui pontos via `spendBot`, restaura HP máximo e reinicia a memória. Depois a Arena controla toda a partida. Cada condição foi repetida sem e com registro; os hashes dos estados observados coincidiram. A/B desligam apenas a leitura dos resultados no seletor.

## FFA 7102

| Versão | Tiros pesados / drones | Evidência 1 pesado / enxame | Evidência 2 pesado / enxame | Tentativas avaliadas pesado / enxame | Bots com decisão aplicada por histórico pesado / enxame |
|---|---:|---:|---:|---:|---:|
| A | 54 / 4 | 14 / 0 | 10 / 0 | 0 / 0 | 0 / 0 |
| B | 54 / 4 | 14 / 0 | 10 / 0 | 0 / 0 | 0 / 0 |

Na partida normal A salva: 0 tiros pesados, 0 drones, primeira evidência 0/0, segunda 0/0.

| Rota inicial | Bots | Chegaram ao 30 | Tick do primeiro 30 por slot | Mortes antes do primeiro 30 |
|---|---:|---:|---|---:|
| Firework | 4 | 0 | — | 6 |
| Fighter | 3 | 0 | — | 15 |
| Triplet | 3 | 0 | — | 4 |
| Dual-Barrel | 2 | 0 | — | 4 |
| Gunner Trapper | 1 | 0 | — | 1 |
| Penta Shot | 4 | 1 | 21: 6557 | 6 |
| Spike | 3 | 0 | — | 5 |
| Annihilator | 2 | 1 | 27: 7619 | 4 |
| Hybrid | 1 | 0 | — | 1 |
| Overlord | 3 | 1 | 13: 9345 | 9 |
| Ranger | 4 | 1 | 30: 4003 | 6 |
| Rocketeer | 1 | 0 | — | 1 |
| Booster | 3 | 0 | — | 3 |
| Skimmer | 1 | 0 | — | 1 |
| Mega Trapper | 1 | 1 | 34: 9066 | 0 |

A e B tiveram as mesmas contagens e progressão nesta seed; dados individuais dos dois lados estão nos JSONs. Mortes contam vidas perdidas por slot antes de seu primeiro nível 30, não bots distintos. Tick dividido por 60 dá segundos simulados.

## Maze 7103

| Versão | Tiros pesados / drones | Evidência 1 pesado / enxame | Evidência 2 pesado / enxame | Tentativas avaliadas pesado / enxame | Bots com decisão aplicada por histórico pesado / enxame |
|---|---:|---:|---:|---:|---:|
| A | 79 / 29 | 15 / 7 | 13 / 2 | 1 / 0 | 0 / 0 |
| B | 79 / 29 | 15 / 7 | 13 / 2 | 1 / 0 | 0 / 0 |

Na partida normal A salva: 0 tiros pesados, 23 drones, primeira evidência 0/5, segunda 0/0.

| Rota inicial | Bots | Chegaram ao 30 | Tick do primeiro 30 por slot | Mortes antes do primeiro 30 |
|---|---:|---:|---|---:|
| Overlord | 4 | 1 | 0: 9114 | 6 |
| Triplet | 4 | 0 | — | 8 |
| Penta Shot | 4 | 0 | — | 9 |
| Booster | 4 | 0 | — | 10 |
| Ranger | 3 | 3 | 5: 5712, 16: 4646, 18: 4454 | 0 |
| Rocketeer | 1 | 0 | — | 0 |
| Spike | 3 | 0 | — | 4 |
| Annihilator | 3 | 1 | 30: 5934 | 7 |
| Mega Trapper | 3 | 1 | 17: 7994 | 1 |
| Gunner | 5 | 1 | 21: 10436 | 12 |
| Dual-Barrel | 1 | 0 | — | 3 |
| Fighter | 1 | 0 | — | 3 |

A e B tiveram as mesmas contagens e progressão nesta seed; dados individuais dos dois lados estão nos JSONs. Mortes contam vidas perdidas por slot antes de seu primeiro nível 30, não bots distintos. Tick dividido por 60 dá segundos simulados.

## Reprodução

```powershell
$env:START_LEVEL='15'; $env:PREPARED='0'; $env:TICKS='10800'
foreach ($job in @(@('open','7102'),@('maze','7103'))) {
  $env:MAP=$job[0]; $env:SEED=$job[1]
  foreach ($variant in 'A','B') {
    $env:VARIANT=$variant
    node tests/measure-4a.js > "4a-nivel15-$($env:MAP)-$($env:SEED)-$variant.json"
  }
}
```

A largada no nível 15 é um cenário preparado, não uma partida normal. Foram duas seeds e não se observou escolha aplicada por histórico; não é evidência de ausência de efeito em outras partidas. `node --test tests/*.test.js`: 87 testes passaram no Node 24.15.0.
