# Sinal defensivo e comparação autônoma 3A

A tentativa ativa recebe até três créditos de 0,02 quando um tiro seu destrói um projétil pesado do rival perceptível em trajetória de risco. A identidade da tentativa e o rival são verificados. A regra de esquiva e a atribuição defensiva permanecem inalteradas.

**Retificação:** no commit 20b9d94, o callback `impact` do medidor substituía a função física de colisão dentro do VM. Os números antigos de 187/120/149 tentativas e zero avaliações são inválidos. Os arquivos históricos `def-710*.json` não representam a física correta.

FFA local, 36 bots nível 30, slots 0–5 Destroyer e 6–11 Overseer, 2400 ticks, aprendizado ligado. Antes é o commit 20b9d94 com o callback renomeado; depois inclui a janela para resolver tiros da tentativa encerrada. Uma avaliação pode incluir dano ou sinal defensivo, e bots são identificados por slot dentro de cada seed.

| Seed | Tentativas antes → depois | Tentativas com resultado antes → depois | Bots com ambas respostas avaliadas antes → depois |
|---|---:|---:|---:|
| 7102 | 113 → 113 | 9 → 12 | 1 → 1 |
| 7103 | 86 → 115 | 4 → 11 | 1 → 1 |
| 7104 | 176 → 130 | 4 → 13 | 0 → 2 |

Na seed 7103, antes, uma tentativa recebeu sinal defensivo; nas outras duas seeds antes e nas três depois, nenhum bot recebeu esse sinal. As mudanças de comportamento alteram as trajetórias, logo não se trata de pares de eventos físicos idênticos.

Na 7102, slot 21 acertou causando 17,75 com distância, 17,75 com flanco e 17,75 novamente com distância. No tick 1029, contra o mesmo rival, os resultados eram flanco `0,1775/1` e distância `0,3195/2`; a escolha foi flanco, enquanto a mesma função sem histórico escolheria distância. Isso ocorreu antes e depois da nova janela: é evidência de uso do histórico, não prova de que o acerto tardio causou essa mudança. Na 7104 depois, slot 25 também escolheu flanco no tick 770 com as duas respostas avaliadas, contra distância sem resultados. O mesmo slot e rival reaparecem nos registros. As decisões incluem a comparação contrafactual sem resultados, com o mesmo número de tentativas e exploração periódica.

Dados por seed em `docs/resultados/3a-ffa-710{2,3,4}-{antes,depois}.json`. Para reproduzir o estado atual, em shell POSIX: `for seed in 7102 7103 7104; do SEED=$seed node tests/measure-3a-autonomous.js > ffa-$seed.json; done`. Em PowerShell: `7102,7103,7104 | ForEach-Object { $env:SEED="$_"; node tests/measure-3a-autonomous.js > "ffa-$_.json" }`. Não houve validação em celular físico.

Reprodução do antes: `node tests/measure-3a-before.js ffa 7102 > antes-7102.json` (repita com 7103 e 7104).
