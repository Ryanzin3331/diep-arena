# 2C — validação de descoberta

## Deduplicação de tiros

A base `54755022f210851c3ee5e232ce3679e8dbc5645b` acumulava IDs de tiros pesados observados durante toda a arena e copiava o conjunto no renascimento. O jogo só permite nova observação do mesmo projétil até a idade de 0,25 s. A memória registra agora o prazo calculado a partir dessa idade e do relógio da arena, com margem adicional de um tick para a ordem de nascimento e atualização. A limpeza ocorre no pensamento do bot e antes de registrar novo tiro. O mapa e seus prazos são copiados no renascimento; os contadores táticos e o codec de backup não mudam.

A regressão exercita perda temporária de visão, repetição antes do prazo, renascimento real com tiro elegível, novo tiro após limpeza e 300 tiros distintos ao longo do relógio. Também verifica limpeza sem outro disparo. Passaram `node --test tests/*.test.js`, `node tests/run-idb-browser.js` (24 cenários) e `node tests/run-arena-browser.js` (35 cenários), em Linux; Chromium headless com IndexedDB real usou o adaptador temporário Playwright para `CHROME_BIN` descrito no 2A. Não houve teste em celular físico nesta etapa.

As partidas e medições adicionais abaixo são separadas da correção de deduplicação.

## Amostras autônomas preliminares no Linux

Node 24.22.1 em Linux x86_64, AMD EPYC 7763 (3 CPUs disponíveis). Para cada mapa, seed 7101, 36 bots e 1.200 ticks, sem persistência entre arenas. O comparador desliga os dois detectores no texto carregado pelo ambiente de teste, preservando as regras de visão; nenhuma configuração de produto é alterada. Uma única seed e uma janela de 20 segundos simulados não bastam para avaliar a frequência de encontros ao longo de partidas completas ou evasão excessiva.

No elenco normal, houve zero bots com evidência, limiar ou ativação nos dois mapas durante a janela. No elenco preparado, 6 bots começaram como Destroyer e 6 como Overseer, nível 30, e todos jogaram autonomamente:

| Mapa | Tiro: observaram / limiar / ativação | Enxame: observaram / limiar / ativação | ms/tick desligado / ligado |
|---|---|---|---:|
| FFA | 16 / 10 / 5 | 10 / 4 / 3 | 6,432 / 6,423 |
| Maze | 16 / 15 / 11 | 11 / 3 / 1 | 16,978 / 16,190 |

Contam-se slots únicos, inclusive ao renascer. Ativação significa que o caminho tático correspondente foi executado com um alvo visível e a evidência no limiar; não demonstra um reencontro separado nem uma mudança causal de posicionamento. Os tempos são médias individuais por execução, não medianas; a execução desligada não registra evidências por definição. Essa amostra preliminar não prova que os bots evitem combate por tempo demais; um reencontro da seed foi analisado separadamente abaixo.

Reproduza com `node tests/measure-2c-matches.js` e `PREPARED=1 node tests/measure-2c-matches.js`. Scripts de instrumentação e resultados não são medições em celular físico.

## Densidade de drones — sondagem separada

Em uma cena sintética, uma chamada ao agrupador com todos os drones próximos e convergentes teve medianas de cinco amostras de 300 chamadas: 12 drones **0,0534 ms**, 36 **0,4735 ms**, 72 **1,5331 ms**. Reproduza com `node tests/measure-2c-drones.js`. Essa medição é por chamada da função para um bot, não por tick da arena; não mede a taxa de chamadas ou o custo total de uma partida. A rotina compara drones entre si e o custo aumenta com a densidade. A medição de `Arena.step` com drones reais e a comparação de um reencontro estão registradas abaixo; a sondagem sintética não representa custo por tick.


## Reencontro e comparação no mesmo tick

Em FFA com elenco preparado e seed 7101, o slot 7 atingiu o limiar de tiro pesado contra o slot 3 no tick 168. Após última seleção no tick 1063, voltou a selecioná-lo no tick 1473. Reencontro significa pelo menos 60 ticks sem selecionar aquele par; não significa que os tanques ficaram invisíveis ou distantes durante todo o intervalo. Os primeiros reencontros por par/tipo até o tick 2400 estão em `docs/2c-reencontros-7101.json`, reproduzíveis por `SEARCH_ALL=1 TICKS=2400 node tests/measure-2c-reencounter.js`. O limiar é registrado no primeiro pensamento do bot em que a instrumentação o constata.

A comparação foi repetida com o comando exato em `docs/RETOMADA-2C.md`. As duas execuções usam o mesmo núcleo e seed; até a decisão escolhida, a flag de supressão não altera o jogo. No tick escolhido a instrumentação altera apenas as duas flags que alimentam a distância preferida e o componente lateral; nesse caso a de tiro pesado era verdadeira e a de enxame falsa. Visão e evidência permanecem ativas. Os campos selecionados de tanques e projéteis no snapshot tinham o mesmo SHA-256 `ddacc7ec931ac96aa6efeda036fce8128dbba938751a503b0d4896a93f3900de`; esse hash não cobre todo o estado interno nem substitui a análise do código. Posição, vida e evidência do par também coincidiram. O alvo era Destroyer e não havia nenhum projétil ativo dele.

Com a descoberta, o componente da intenção em direção ao alvo foi **0,4498**, contra **0,8172** ao suprimir o efeito: redução de **0,3674**. O componente lateral foi **0,8931** contra **0,5764**: aumento de **0,3168**. O bot ainda se move parcialmente em direção ao alvo; não se deve interpretar o resultado como recuo. `node tests/validate-2c-reencounter.js` executa ambas as simulações e verifica o par, hash parcial, evidência, ausência de projéteis e os componentes.

## Participação em combate — janelas pareadas

Para a seed 7101, 36 bots e 2400 ticks (40 s simulados), `tests/measure-2c-long.js` usa as regras de visão nos dois grupos; no grupo desligado, os detectores não registram evidência. Encontros são primeira seleção ou retorno após 60 ticks sem selecionar o par. Alvo visível é a fração de ticks por 36 slots em que o alvo selecionado continua perceptível; a taxa de projéteis inclui drones criados por `spawnShot` e usa 36 slots como denominador mesmo durante mortes. São indicadores de participação, não uma contagem exclusiva de tiros de combate.

| Elenco / mapa | Encontros desligado / ligado | Alvo visível desligado / ligado | Projéteis por slot por minuto desligado / ligado |
|---|---:|---:|---:|
| Preparado / FFA | 244 / 369 | 82,40% / 82,17% | 88,79 / 86,67 |
| Preparado / Maze | 261 / 313 | 78,17% / 76,67% | 87,75 / 85,79 |
| Normal / FFA | 255 / 255 | 83,52% / 83,52% | 104,38 / 104,38 |
| Normal / Maze | 227 / 227 | 78,10% / 78,10% | 105,71 / 105,71 |

No elenco preparado começaram seis Destroyer e seis Overseer; essas classes apareceram nas amostras. No elenco normal, nenhuma das seis classes monitoradas pelo script (Destroyer, Annihilator, Hybrid, Overseer, Overlord, Necromancer) apareceu na janela. Essas amostras não demonstram redução extrema da participação, mas uma seed e 40 segundos não bastam para concluir que isso nunca ocorrerá. Reproduza com `TICKS=2400 PREPARED=1 node tests/measure-2c-long.js` e `TICKS=2400 node tests/measure-2c-long.js`.

## Cena preparada com drones reais

`node tests/measure-2c-dense.js` mede apenas o tempo de `Arena.step`, com 36 bots, 12 concentrados e quatro Overseers, em três seeds e 240 ticks sem aquecimento. Em Maze, seed 7101, sem/com 32 drones criados inicialmente: **19,660 / 19,634 ms por tick**, média de **4,075 / 16,225 drones vivos**, e **32,14 / 120,14 pares bot–drone** a menos de 430 unidades por tick. Esse número de pares não exige linha de visão. Drones são destruídos; nas outras duas seeds da cena com 32 iniciais restaram médias de apenas 1,35 e 2,70, com 12,57 e 25,32 pares próximos por tick. O cenário é localizado e a ausência de aquecimento e a rápida mudança de densidade impedem atribuir a diferença de tempo ao detector ou extrapolar para partidas longas. A sondagem sintética acima permanece separada.

## Estado para revisão

A Fase 2 está pronta para revisão em PR rascunho, com o reencontro reproduzível e limitações explícitas. Ainda são necessárias amostras mais longas e variadas para concluir sobre evasão excessiva e custo sustentado em densidade alta; não há medição desta etapa em celular físico. Não se trata de aprovação para merge.
