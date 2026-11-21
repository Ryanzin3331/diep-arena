# Investigação Maze 7103 — nível 15, A

Na raiz, PowerShell: `$env:START_LEVEL='15'; $env:PREPARED='0'; $env:MAP='maze'; $env:SEED='7103'; $env:VARIANT='A'; $env:TICKS='10800'; node tests/measure-4a-investigation.js > investigacao.json`. O medidor reproduz a preparação de nível 15 do ensaio anterior e não altera regras da Arena. O hash dos campos observados com e sem registro foi `502fa2dd78768204974c25d8c80d5123128990b87b309028803684b3b3605167`, igual também ao resultado anterior dessa condição. O hash cobre posições, vida/HP dos tanques e formas e posições/durabilidade dos projéteis, não todo o estado interno.

| Ameaça | Planos novos | Pensamentos mantendo tentativa | Planos novos abertos | Novos sem abertura |
|---|---:|---:|---:|---|
| Tiro pesado | 59 | 22 | 3 | 46 sem candidato final, 8 com desvio, 2 com destino alterado |
| Enxame | 8 | 5 | 1 | 2 com desvio, 5 com destino alterado |

Cada decisão e motivo está em `docs/resultados/4a-maze7103-investigacao.json`. `candidato_substituido` significa que não restou candidato na etapa de validação; não identifica por si só qual regra anterior o eliminou. Contagens são por pensamento, não por bot.

| Ameaça / slot | Abriu | Encerrou | Motivo registrado | Resultado |
|---|---:|---:|---|---|
| Pesado / 17 | 6948 | 6953 | candidato ausente na validação | sem dano ou interceptação; sem avaliação |
| Pesado / 19 | 9063 | 9088 | candidato ausente na validação | recebeu 123,2; avaliação −1 |
| Pesado / 0 | 9695 | 9785 | perda ou troca de alvo | sem dano ou interceptação; sem avaliação |
| Enxame / 30 | 9820 | 9850 | candidato ausente na validação | sem ameaça efetiva e sem dano; sem avaliação |

O slot 19 abriu a primeira tentativa contra o rival 455 em exploração inicial. Ela terminou e foi avaliada no tick 9088. Nesse momento o rival ainda estava perceptível; permaneceu perceptível até o tick 9409 e depois não voltou a ser perceptível até o fim da janela. Não houve outra chamada ao seletor de tiro pesado do slot 19 após a avaliação, nem outra tentativa aberta. Assim, não é possível dizer que uma próxima decisão tenha sido de exploração ou que uma manobra posterior específica tenha sido vetada; houve percepção continuada por parte da janela, mas isso não comprova que o rival continuou selecionado para combate. Os hooks distinguem visibilidade, não todos os critérios de seleção de alvo.

`node --test tests/*.test.js`: 87 testes passaram no Node 24.15.0. As regras do jogo não foram alteradas.
