# Aprendizado dos bots em partidas comuns

A auditoria rodou sobre o commit `9c8c8d9`, antes da inclusão das oito classes. Cada linha compara três partidas de 120 segundos de jogo, com 24 bots a partir do nível 1 e sem chefes. A seed e o mapa são iguais nas três partidas. O controle desliga o aprendizado. A segunda versão ativa a memória tática com builds fixas. A terceira também deixa a experiência influenciar os atributos.

| Mapa e seed | Bots que mudaram de postura com build fixa | Trocas de postura com build fixa | Pontos de atributo escolhidos pela experiência | Líder aos 120 s (controle / memória / memória e build) |
| --- | ---: | ---: | ---: | --- |
| FFA 7101 | 22 de 24 | 115 | 41 | 2.470 / 5.025 / 5.935 |
| FFA 7104 | 22 de 24 | 138 | 52 | 2.160 / 3.565 / 2.915 |
| Maze 7102 | 22 de 24 | 144 | 38 | 3.075 / 2.225 / 4.815 |
| Maze 7103 | 23 de 24 | 106 | 37 | 6.330 / 5.781 / 7.925 |

A mudança é contabilizada quando o seletor de combate troca de postura em relação à escolha anterior contra o mesmo rival. O total conta 503 trocas em 89 dos 96 bots com builds fixas. Ativar builds adaptativas produziu 168 escolhas de atributo guiadas pela experiência em 75 dos 96 bots. Quando um bot renasce, o script conserva o maior contador observado naquele slot para evitar contagem dupla.

Os bots têm regras fixas de percepção, seleção de alvo e ações possíveis. Dentro delas, os resultados de combate mudam a escolha de postura e os pontos de atributo. A pontuação do líder mostra partidas diferentes. Com quatro seeds e batalhas que divergem cedo, ela não estima aumento de força.

Nenhum bot terminou no nível 45 e não houve avaliação das respostas especializadas a tiros pesados, esquivas ou enxames nessa amostra. A suíte controlada cobre essas respostas. Em um teste separado de 15 s por duelo, Tank e Destroyer começaram no nível 30, a 200, 300 ou 380 unidades um do outro, nas seeds 7102, 7103 e 7104. O Tank já reconhecia o tiro pesado. O medidor abriu 127 tentativas nos nove duelos, com dois resultados avaliados de 0,25. Nos três controles a 300 unidades, o reconhecimento continuou ativo, mas nenhum plano de resposta foi iniciado após desativar o seletor experimental. O ponto fraco é transformar uma tentativa em evidência de dano, defesa ou fuga bem-sucedida em confrontos comuns.

## Reproduzir a amostra

```sh
git show 9c8c8d9:index.html > /tmp/diep-base-ia.html
CORE=/tmp/diep-base-ia.html node tests/audit-class-learning.js open 7101
CORE=/tmp/diep-base-ia.html node tests/audit-class-learning.js open 7104
CORE=/tmp/diep-base-ia.html node tests/audit-class-learning.js maze 7102
CORE=/tmp/diep-base-ia.html node tests/audit-class-learning.js maze 7103
```
