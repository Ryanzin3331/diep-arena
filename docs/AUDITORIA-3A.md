# 3A — pontos de integração iniciais

A implementação e a validação do 3A ainda não foram concluídas.

- `botThink` escolhe a distância e o componente lateral usando a descoberta 2A; decisões específicas de classe podem substituí-los depois. Registrar uma estratégia antes dessas substituições poderia creditar uma tática que o bot não executou.
- `spawnShot` registra `learningTarget` e `sourceTactic`, e `combatHit` encaminha esses dados para `observeHit`. São identificadores da tática legada, não da nova tentativa 3A. Projéteis podem atingir depois de uma troca de alvo ou depois que uma tentativa termina; a nova tentativa precisa de identidade própria para não transferir crédito entre confrontos.
- `tuneApproach` já acumula trocas e limita seu período, mas depende da classe real e da tática legada. Reutilizar seus resultados diretamente não demonstraria que foram causados pela resposta aprendida a tiro pesado.
- `respawnLearning` copia explicitamente apenas estruturas agregadas selecionadas. O 3A deve copiar seus agregados, descartar a tentativa ativa e deixar o codec e o backup da Fase 1 inalterados. Os registros devem começar vazios em uma arena nova.
- Os testes precisam exercitar os eventos reais de `Arena`, inclusive dano recebido e causado, interrupção por perda de visão, morte e troca de alvo, além de confirmar comportamento inicial 2A e isolamento do multiplayer.

Ainda faltam desenho verificável da tentativa, implementação, cenários comparativos, suítes e medições. Este documento não afirma que o 3A esteja pronto.
