# 2B — descoberta de enxames

Em FFA e Maze locais, o observador considera um grupo hostil quando pelo menos três drones visíveis (`drone` ou `necroDrone`) estão a até 180 unidades de um drone do grupo e se movem em direção ao observador com componente radial superior a 20 unidades/s. É necessário haver exatamente um tanque hostil visível com perfil a até 450 unidades do centro do grupo; todos os drones do grupo devem pertencer a ele. Essa última verificação evita atribuição incorreta na simulação; a classe interna do controlador não determina a detecção. Se houver controlador oculto, outro controlador possível ou mistura de donos, não se registra evidência individual. Os drones visíveis continuam na avaliação normal de ameaças.

Uma investida é um episódio desse grupo qualificado por controlador. O contador aumenta na primeira observação e só volta a aumentar após mais de dois segundos sem uma observação qualificável atribuída ao mesmo controlador. Assim, várias unidades, ticks e uma perda de visão de até dois segundos não criam novas evidências. Uma ausência maior, ou movimento sem aproximação por mais de dois segundos, encerra o episódio para esse critério; isso é uma aproximação, não uma identificação perfeita de ataques no mundo real.

Após duas investidas, no reencontro visível, a movimentação existente acrescenta 80 unidades à distância preferida e 0,35 ao componente lateral. Quando também há experiência de tiro pesado, os acréscimos de distância são limitados a 140 unidades no total. As evidências de tiro pesado e enxame usam mapas separados; contadores e tempo do episódio são individuais, copiados no renascimento, iniciam vazios em nova arena e não entram no backup. Multiplayer permanece fora do detector.

## Reprodução e validação

`node tests/discovery-2b.test.js` cria drones reais pelas rotinas de conversão do Necromancer e de disparo do Overseer. Para controlar a demonstração, posiciona três drones e define velocidades convergentes, faz o bot observar dois episódios separados e transfere somente o mapa de evidências observado para um cenário idêntico sem o próximo ataque. Em seed 12345 e distância de 300, o vetor de intenção sem experiência foi `(0,701; 0,713)` e com experiência `(-0,091; 0,996)`: o bot deixa de avançar em direção ao controlador e preserva mais movimento lateral. Outro teste executa passos reais de `Arena.step`, com as posições e o relógio controlados para apresentar dois episódios, e verifica o renascimento. Não se trata de uma partida autônoma completa.

Os testes incluem observação contínua e breve interrupção, duas classes e independência da classe real, parede sobre controlador ou drones, ambiguidade, separação entre ameaças, limite combinado, renascimento, nova arena, codec e isolamento multiplayer. `node --test tests/*.test.js` passou; `node tests/run-idb-browser.js` passou 24 cenários; `node tests/run-arena-browser.js` passou 35 cenários. As suítes de navegador usaram Chromium 156 headless com IndexedDB real e adaptador temporário Playwright para `CHROME_BIN`, conforme 2A.

## Custo por tick

Node 24.22.1, Linux x86_64, AMD EPYC 7763 com 3 CPUs disponíveis; 36 bots, aprendizado ligado e persistência desligada. Cinco seeds iguais 7101–7105, 120 ticks de aquecimento e 240 medidos por seed, alternando a ordem entre base e 2B. Medianas das cinco médias:

| Mapa | Base 2A c414142 | 2B |
|---|---:|---:|
| FFA | 5,116 ms/tick | 5,300 ms/tick |
| Maze | 14,709 ms/tick | 14,739 ms/tick |

Amostras pequenas em ambiente compartilhado; mudanças de comportamento afetam o trabalho por tick. Reproduza com `git show c414142:index.html > /tmp/2b-base.html` e `node tests/benchmark-2a.js /tmp/2b-base.html`. Não são medições em celular. Permanecem os limites de percepção e os testes em dispositivos e multiplayer reais registrados no 2A.
