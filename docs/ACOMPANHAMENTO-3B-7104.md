# Acompanhamento do slot 19 — seed 7104

`node tests/measure-3b-7104-followup.js > acompanhamento.json` reproduz FFA preparada do medidor 3B: seed 7104, 36 bots, nível 30, seis Necromancers e seis Overseers, 4800 ticks. Duas execuções, com e sem instrumentação, produziram o mesmo SHA-256 da sequência de posições, estado vivo e HP dos tanques. O hook de encerramento não distingue entre as causas de invalidação do plano; não identifica individualmente esquiva, substituição e perda de alvo.

| Evento | Tick | Tentativa / rival | Ameaça efetiva | Dano causado / recebido | Histórico ao abrir |
|---|---:|---|---|---|---|
| Abre | 1076 | 1 / 425 | — | — | vazio; escolha 0, exploração |
| Encerra por prazo | 1196 | 1 / 425 | sim | 107,8 / 0 | resultado da resposta 0: soma 1, contagem 1 (valor limitado) |
| Abre | 1196 | 2 / 425 | — | — | resposta 0: 1/1; resposta 1: 0/0; escolha 1, exploração |
| Encerra por plano inválido ou perda de alvo | 1211 | 2 / 425 | não | 0 / 0 | nenhuma nova avaliação |

Do tick 1211 ao fim, 4800, não houve nova tentativa de enxame do slot 19; o bot estava vivo e sem tentativa ativa no fim. Assim, a sequência parou após a interrupção/invalidação da segunda manobra e sem nova tentativa observada. O registro não prova se os rivais voltaram a se perceber sem que uma manobra válida fosse aberta. A decisão livre de exploração não ocorreu; não há comparação contrafactual dessa decisão. Nas duas aberturas registradas, retirar os resultados não mudou a escolha, pois ambas eram exploração inicial. Dados integrais em `docs/resultados/3b-7104-acompanhamento.json`. A regra de aprendizado não foi modificada.
