# Auditoria inicial — Incremento 2A

Este documento é um levantamento inicial, não uma implementação concluída da descoberta.

- Conhecimento próprio: `botThink` consulta `C[t.cls]` para armas, estilo e movimentação; `combatTactic` usa a própria classe na chave de aprendizagem. Isso não exige revelar o adversário.
- Percepção: `botThink` consulta `w.sense.nearby` e testa `maze.hit` em vários pontos, mas candidatos a inimigo atrás de parede recebem uma penalidade de custo em vez de exclusão. Depois, `t.memory` recebe suas coordenadas. Projéteis próximos entram em `risks` sem teste de linha de visão nessa coleta. A seleção e todos os consumidores precisam ser auditados em conjunto antes de afirmar que não há vazamento.
- Antecipação e propriedades reais: `combatTactic` indexa `foes` e `classes` por `e.cls`; `evaluateRetreat` e `assessApproach` registram classe real. `boosterManeuver`, `rivalOpening`, `necroPlan`, a guarda de Factory, o cálculo de movimento e outras decisões consultam `C[enemy.cls]`. Há também leituras de vida, nível, alvo, disparo recente e proteção do inimigo. Essas leituras não são equivalentes a evidência observada.
- Dano: `observeHit` recebe `enemyClass`; os chamadores em `Arena` passam a classe do autor ao registrar dano. `necroPlan` pode usar `risks[0].owner` como ameaça, inclusive sua posição. Logo, apenas acrescentar um contador de projéteis não satisfaria a restrição sobre atacantes ocultos.
- Persistência: `respawnLearning` copia os registros de classe da memória; o codec de backup da Fase 1 é compartilhado entre arenas. A descoberta 2A deve ter armazenamento próprio de vida da arena, copiado explicitamente no renascimento e omitido do codec.

Ainda faltam desenho e implementação dos sinais distintos, deduplicação por evento, associação ao adversário somente quando observável, decisão tática, testes controlados e medições comparativas por tick. Nenhuma conclusão de segurança de percepção ou desempenho é alegada neste levantamento.
