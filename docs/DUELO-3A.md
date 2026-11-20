# Duelo autônomo 3A: Tank contra Destroyer

**Correção da medição:** o callback `impact` sobrescrevia a função de colisão da física no VM. Por isso os resultados publicados no commit 20b9d94 e no arquivo `3a-duelo.json` são inválidos. Agora o callback se chama `measureImpact` e testes exercitam colisões reais nos dois medidores.

Reprodução atual: `node tests/measure-3a-pairs.js > resultados.json`. O núcleo FFA aberto executa seeds 7102–7105 e distâncias iniciais 200, 300 e 380, 900 ticks por luta; cada condição é repetida com a mesma seed no controle e no 3A. Dois bots nível 30 têm metas fixas Tank e Destroyer, sem formas ou proteção inicial. O Tank começa com reconhecimento 2, sem tentativas nem resultados. A Arena decide movimento, tiros e colisões. O controle desativa somente o plano 3A e preserva a descoberta e a resposta da Fase 2.

| 12 lutas por grupo | Controle | 3A antes | 3A depois |
|---|---:|---:|---:|
| Tiros Tank / Destroyer | 450 / 191 | 450 / 186 | 450 / 186 |
| Acertos Tank / Destroyer | 15 / 1 | 7 / 2 | 7 / 2 |
| Lutas sem acertos | 4 | 6 | 6 |
| Colisões entre projéteis | 134 | 140 | 140 |
| Tentativas | — | 197 | 197 |
| Tentativas com resultado | — | 0 | 5 |
| Tiros associados que acertaram rival durante tentativa / depois | — | 0 / 5 | 0 / 5 |

As cinco tentativas passaram a receber crédito tardio. No 3A, 184 encerraram por desvio, cinco por prazo e oito estavam abertas ao terminar a observação. Nem toda troca envolve tiro associado a uma tentativa: há sete acertos do Tank, dos quais cinco são de tiros associados. O controle não abre tentativas. As trajetórias das lutas deste conjunto permaneceram iguais, sem demonstrar uma mudança de decisão em função dos novos créditos.

Na seed 7103, distância 200, a tentativa 2 dispara no tick 67, encerra por desvio no 76 e acerta no 89. A nova janela de 1,5 s credita a tentativa original. As regressões cobrem segunda tentativa ativa, deduplicação, expiração e atualização de resultado já computado. Dados: `docs/resultados/3a-duelo-fisica-corrigida-antes.json` e `docs/resultados/3a-duelo-fisica-corrigida-depois.json`. A análise antes usa o commit 20b9d94 com apenas o nome do callback corrigido. Não confundir contatos entre projéteis com interceptações defensivas creditadas.

Reprodução do antes, a partir do Git: `node tests/measure-3a-before.js pairs > antes.json`.
