# Duelo autônomo 3A: Tank contra Destroyer

Reprodução (Node, na raiz): `node tests/measure-3a-pairs.js > resultados.json`. Os dados registrados estão em `docs/resultados/3a-duelo.json`. O ensaio usa o núcleo FFA aberto, seeds 7102–7105 e distâncias iniciais 200, 300 e 380, 900 ticks (15 s) por luta. Cada condição é repetida com a mesma seed no controle e no 3A. Dois bots nível 30 recebem atributos de nível 30; metas de classe mantêm Tank e Destroyer, sem evolução automática. Inicialmente estão protegidos por zero ticks, sem formas, e o Tank tem reconhecimento 2 do perfil rival, sem tentativas nem avaliações. Depois da preparação, a Arena conduz a simulação. O controle desativa somente a formação do plano 3A, preservando descoberta e cálculo de distância tática da Fase 2. Não é o modo de laboratório.

| Medida, 12 lutas por grupo | Controle | 3A |
|---|---:|---:|
| Tiros Tank / Destroyer | 450 / 189 | 450 / 186 |
| Contatos entre projéteis | 126 | 140 |
| Projéteis destruídos do Tank / Destroyer | 126 / 0 | 140 / 0 |
| Acertos de qualquer lado | 0 | 0 |
| Lutas sem acerto de qualquer lado | 12 | 12 |
| Tentativas abertas | 0 | 196 |
| Tentativas com dano ou crédito defensivo | 0 | 0 |

No 3A houve 183 encerramentos por desvio, quatro por prazo e nove ainda abertas ao fim da observação. As durações e os motivos individuais, disparos associados, contatos e remoções estão no JSON. As nove abertas são censuradas ao fim; não se deve tratá-las como encerramentos naturais. Nenhum tiro acertou o rival durante a tentativa ou após seu encerramento. Os 140 contatos de projéteis resultaram na destruição de tiros do Tank, não dos tiros do Destroyer; portanto não preencheram o critério de interceptação defensiva. Contatos são contados por colisão no motor, não como tiros pesados neutralizados.

O Tank não formou avaliação nem preferência aprendida nesta amostra; portanto não há escolha posterior atribuível a eventos de aprendizagem. O valor consultado de `nextChoice` é apenas a escolha da função no estado final, podendo refletir exploração ou padrão e, se houver tentativa ativa, a tentativa atual; não é um reencontro observado. As trajetórias divergem entre os grupos, e o número reduzido de seeds não prova desempenho geral. A comparação revela falta de dano nos dois grupos, sem evidência específica para alterar crédito, duração, pontuação ou esquiva. Nenhuma alteração foi feita nesses mecanismos.
