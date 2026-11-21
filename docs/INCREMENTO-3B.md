# Incremento 3B — respostas individuais a enxames

Em FFA e Maze locais, a evidência de enxame da Fase 2 associada ao perfil perceptível do rival habilita afastamento e deslocamento lateral, independentemente da classe. As duas primeiras tentativas exploram opções; depois é usada a mesma regra de seleção e exploração periódica do 3A, com contadores e resultados independentes. Se ambas ameaças forem reconhecidas, a resposta ao enxame tem prioridade. Troca ou perda do rival, substituição da rota ou do alvo, desvio ou ausência de movimento encerram a tentativa. O resultado usa apenas a troca de dano com o rival durante uma tentativa que tenha observado o episódio efetivo atribuído a ele; não há recompensa por sobreviver a uma janela vazia. Tiros creditados devem pertencer à tentativa ativa original. Agregados sobrevivem ao renascimento e ficam fora do backup e multiplayer.

## Testes

`node --test tests/auto-strategy-3b.test.js`: drones gerados por Overseer e convertidos por Necromancer, colisões reais, identidade do rival, interrupção por desvio, respostas opostas por resultados de colisões, ausência de crédito sem ameaça ou sem dano e isolamento multiplayer. `node --test tests/*.test.js`: 84 testes passaram no Node 24.15.0. Os medidores de 3A usados pelos testes de regressão recebem `DISABLE_3B=1`, preservando a resposta de descoberta da Fase 2 enquanto isolam as decisões antigas de tiro pesado.

## Ensaio autônomo e transparência do registro

`node tests/measure-3b-autonomous.js` usa FFA aberta, seed 7102, 36 bots preparados no nível 30, seis Necromancers e seis Overseers, 1600 ticks. Em PowerShell, repita com `$env:SEED='7103'; node tests/measure-3b-autonomous.js` e depois `7104`. Os resultados estão em `docs/resultados/3b-710{2,3,4}.json`. Cada execução compara simulação sem registro com outra instrumentada e verifica SHA-256 da sequência de posições, vida e HP dos tanques em todos os ticks. A instrumentação observa aberturas e consulta a mesma função com os resultados de enxame removidos, restaurando o contador ao valor anterior à abertura; não altera a escolha. Os hashes coincidiram.

| Seed | Tentativas registradas | Bots com resultado | Escolhas alteradas pelo histórico |
|---|---:|---:|---:|
| 7102 | 23 | 0 | 0 |
| 7103 | 11 | 0 | 0 |
| 7104 | 5 | 1 | 0 |

Não se demonstrou uma decisão autônoma alterada pelo histórico nesta amostra. A evidência de escolhas diferentes vem do teste controlado com drones reais e colisões. O número de bots é por slot ao final da partida; não é uma estimativa geral de eficácia.

## Custo por tick

Windows x64, Node 24.15.0, Intel i3-N305. Main `04596ece4fb07618823f2c0d2a42400f2cad0721` versus o `index.html` 3B da árvore de trabalho, medido antes do commit. O campo `head` no JSON registra a base porque o código ainda não estava commitado. Dois pares de seeds 7102/7103, 36 bots, aquecimento de 240 ticks e medição de 600 por seed, com ordem alternada; mediana e p95 agregam 1200 ticks. FFA e Maze preparados usam seis Destroyers e seis Overseers, nível 30; a cena densa começa com 36 Overseers em grade. A IA e colisões evoluem normalmente depois da preparação, e trajetórias podem divergir. Não há renderização ou medição no Poco C75.

| Cena | main mediana / p95 (ms) | 3B mediana / p95 (ms) |
|---|---:|---:|
| FFA preparada | 9,606 / 15,704 | 8,325 / 15,097 |
| Maze preparada | 21,914 / 37,657 | 23,076 / 36,467 |
| Drones densos | 9,364 / 16,978 | 9,874 / 17,551 |

Medição observacional pequena, suscetível a carga e JIT; não estabelece equivalência estatística nem desempenho em celular. Na cena densa houve mediana de 126–134 projéteis/drones por seed e pico de 144–160. Dados em `docs/resultados/3b-performance.json`. Reprodução PowerShell: `$env:BASE_REF='04596ece4fb07618823f2c0d2a42400f2cad0721'; $env:SCENARIOS='prepared-open,prepared-maze,crowded'; $env:SEEDS='7102,7103'; node tests/benchmark-3a-review.js > performance.json`. O script lê a main pelo Git e a versão comparada do `index.html` corrente.
