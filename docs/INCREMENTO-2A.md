# 2A — descoberta de tiro pesado

Na base `3f296e42fdc5ad18655a9b78acdc2d2237979530`, um teste controlado do Maze com a linha de visão bloqueada reproduziu a seleção do tanque oculto e a gravação de suas coordenadas em `t.memory`. Em arenas locais FFA e Maze, a seleção agora exige linha de visão. A memória da última posição continua sujeita ao prazo existente. Projéteis precisam ser visíveis para entrar na lista de riscos, mas seu autor não precisa estar visível para que sejam evitados. Dano de origem não vista não registra classe, rival de dano ou amostra de confronto; o estado de dano continua permitindo recuperação defensiva. A guarda dos minitanques Factory e a avaliação de retirada também conferem percepção. O comportamento multiplayer não usa essas alterações.

O detector é de ameaça, não de classe: um projétil `bullet` visível de raio pelo menos 75% do raio do tanque visível, com idade até 0,25 s, a até 3,5 raios do tanque e sem outro tanque visível nessa mesma vizinhança, é atribuído àquele oponente. Isso inclui o tiro do Destroyer e outros tiros com os mesmos sinais. É uma aproximação conservadora de observação do disparo, não reconhecimento visual perfeito. Cada ID de projétil conta uma vez por observador, inclusive após renascimento. Após dois disparos distintos, ao enfrentar novamente esse perfil visível, o bot soma 110 unidades à distância preferida da movimentação de combate existente. Isso prepara espaço antes do próximo tiro. A descoberta e IDs observados são individuais, mantidos no renascimento e descartados na próxima arena; não fazem parte do codec ou JSON de backup da Fase 1. Necromancer fica para incremento posterior.

## Reprodução e testes

`node tests/discovery-2a.test.js` executa o cenário controlado com seed 12345, dois tanques a 300 unidades de distância. Sem experiência, o vetor de intenção do bot Tank é aproximadamente `(0,784; 0,621)`; com duas evidências de tiro pesado para o mesmo oponente, é `(-0,585; 0,811)`. As demais condições são iguais e não há tiro presente no momento da decisão. Os testes também cobrem alvo e dano ocultos, tiro visível com autor oculto, deduplicação, sinal compartilhado por outra classe, ambiguidade de atribuição, tiro real de Destroyer, renascimento e nova arena.

Foram executados `node --test tests/*.test.js` (28 casos anteriores e 9 novos), `node tests/run-idb-browser.js` (24 cenários) e `node tests/run-arena-browser.js` (35 cenários), todos aprovados. Os testes de navegador usam Chromium 156 headless com IndexedDB real, por meio de um adaptador temporário Playwright para `CHROME_BIN` neste ambiente; diálogos e download são controlados na suíte de arena.

## Custo por tick

Linux x86_64, AMD EPYC 7763, 3 CPUs disponíveis, Node 24.22.1, simulação no Node VM; 36 bots, memória de persistência desligada, aprendizado ligado. Para cada mapa e versão, cinco seeds iguais (7101–7105), 120 ticks de aquecimento e 240 ticks medidos por seed; ordem base/nova alternada. A mediana das cinco médias em ms/tick foi:

| Mapa | Base 3f296e4 | 2A |
|---|---:|---:|
| FFA | 5,616 | 5,727 |
| Maze | 15,012 | 14,547 |

São amostras pequenas em ambiente compartilhado e a diferença no Maze pode refletir também caminhos e comportamentos distintos; não são medidas de celular. Para reproduzir: `git show 3f296e4:index.html > /tmp/2a-base.html` e `node tests/benchmark-2a.js /tmp/2a-base.html`.

A auditoria anterior identifica outros usos de classe e propriedades reais em decisões legadas. Este incremento não declara que todos esses usos foram convertidos em descoberta. Permanecem testes em dispositivos e navegadores reais, multiplayer real e a descoberta do Necromancer.
