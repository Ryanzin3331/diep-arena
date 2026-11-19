# 3A — pontos de integração iniciais

A implementação e a validação do 3A ainda não foram concluídas.

- `botThink` escolhe a distância e o componente lateral usando a descoberta 2A; decisões específicas de classe podem substituí-los depois. Registrar uma estratégia antes dessas substituições poderia creditar uma tática que o bot não executou.
- `spawnShot` registra `learningTarget` e `sourceTactic`, e `combatHit` encaminha esses dados para `observeHit`. São identificadores da tática legada, não da nova tentativa 3A. Projéteis podem atingir depois de uma troca de alvo ou depois que uma tentativa termina; a nova tentativa precisa de identidade própria para não transferir crédito entre confrontos.
- `tuneApproach` já acumula trocas e limita seu período, mas depende da classe real e da tática legada. Reutilizar seus resultados diretamente não demonstraria que foram causados pela resposta aprendida a tiro pesado.
- `respawnLearning` copia explicitamente apenas estruturas agregadas selecionadas. O 3A deve copiar seus agregados, descartar a tentativa ativa e deixar o codec e o backup da Fase 1 inalterados. Os registros devem começar vazios em uma arena nova.
- Os testes precisam exercitar os eventos reais de `Arena`, inclusive dano recebido e causado, interrupção por perda de visão, morte e troca de alvo, além de confirmar comportamento inicial 2A e isolamento do multiplayer.

Ainda faltam desenho verificável da tentativa, implementação, cenários comparativos, suítes e medições. Este documento não afirma que o 3A esteja pronto.

## Detalhes verificados na retomada

O ponto de aplicação inicial de distância e flanco em `botThink` não é a decisão final: armadilhas, Booster, sniper, Overlord, abertura, Necromancer e Factory podem alterar o destino; o desvio de ameaças e o caminho no Maze também podem alterar o vetor efetivo. Uma tentativa só pode ser aberta ou mantida depois dessas etapas se a resposta selecionada de fato continuar expressa no movimento. Desvios defensivos precisam interromper ou excluir o período de avaliação, em vez de serem pontuados como execução da resposta original.

Os tiros secundários em `detonate` e `fireDeployerRound` copiam a origem da tática legada a partir do projétil pai. Uma identidade de tentativa 3A deve ser propagada do mesmo modo quando esses tiros derivam do disparo original, e não ser obtida da tentativa atual no momento da colisão. A recepção de dano tem regra distinta: só pode ser atribuída à tentativa ativa do alvo se a fonte for o adversário certo e o período efetivo ainda estiver válido. O evento de dano não deve revelar fonte oculta.

A tentativa precisa terminar sem crédito positivo quando não houver interação. Uma troca de alvo, perda de percepção, morte ou substituição da movimentação deve interromper a tentativa anterior; projéteis antigos não devem pontuar para outra tentativa mesmo contra o mesmo adversário. Essas são condições de implementação e de teste, ainda não comportamento entregue.
