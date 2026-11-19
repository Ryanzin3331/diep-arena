# 2C — validação de descoberta

## Deduplicação de tiros

A base `54755022f210851c3ee5e232ce3679e8dbc5645b` acumulava IDs de tiros pesados observados durante toda a arena e copiava o conjunto no renascimento. O jogo só permite nova observação do mesmo projétil até a idade de 0,25 s. A memória registra agora o prazo calculado a partir dessa idade e do relógio da arena, com margem adicional de um tick para a ordem de nascimento e atualização. A limpeza ocorre no pensamento do bot e antes de registrar novo tiro. O mapa e seus prazos são copiados no renascimento; os contadores táticos e o codec de backup não mudam.

A regressão exercita perda temporária de visão, repetição antes do prazo, renascimento real com tiro elegível, novo tiro após limpeza e 300 tiros distintos ao longo do relógio. Também verifica limpeza sem outro disparo. Passaram `node --test tests/*.test.js`, `node tests/run-idb-browser.js` (24 cenários) e `node tests/run-arena-browser.js` (35 cenários), em Linux; Chromium headless com IndexedDB real usou o adaptador temporário Playwright para `CHROME_BIN` descrito no 2A. Não houve teste em celular físico nesta etapa.

As partidas autônomas pareadas, o custo em cenas com muitos drones e a avaliação de evasão permanecem em investigação separada.

## Amostras autônomas preliminares no Linux

Node 24.22.1 em Linux x86_64, AMD EPYC 7763 (3 CPUs disponíveis). Para cada mapa, seed 7101, 36 bots e 1.200 ticks, sem persistência entre arenas. O comparador desliga os dois detectores no texto carregado pelo ambiente de teste, preservando as regras de visão; nenhuma configuração de produto é alterada. Uma única seed e uma janela de 20 segundos simulados não bastam para avaliar a frequência de encontros ao longo de partidas completas ou evasão excessiva.

No elenco normal, houve zero bots com evidência, limiar ou ativação nos dois mapas durante a janela. No elenco preparado, 6 bots começaram como Destroyer e 6 como Overseer, nível 30, e todos jogaram autonomamente:

| Mapa | Tiro: observaram / limiar / ativação | Enxame: observaram / limiar / ativação | ms/tick desligado / ligado |
|---|---|---|---:|
| FFA | 16 / 10 / 5 | 10 / 4 / 3 | 6,432 / 6,423 |
| Maze | 16 / 15 / 11 | 11 / 3 / 1 | 16,978 / 16,190 |

Contam-se slots únicos, inclusive ao renascer. Ativação significa que o caminho tático correspondente foi executado com um alvo visível e a evidência no limiar; não demonstra um reencontro separado nem uma mudança causal de posicionamento. Os tempos são médias individuais por execução, não medianas; a execução desligada não registra evidências por definição. A comparação instrumentada não prova que os bots evitem combate por tempo demais, nem identifica uma seed com reencontro comprovado.

Reproduza com `node tests/measure-2c-matches.js` e `PREPARED=1 node tests/measure-2c-matches.js`. Scripts de instrumentação e resultados não são medições em celular físico.

## Densidade de drones — sondagem separada

Em uma cena sintética, uma chamada ao agrupador com todos os drones próximos e convergentes teve medianas de cinco amostras de 300 chamadas: 12 drones **0,0534 ms**, 36 **0,4735 ms**, 72 **1,5331 ms**. Reproduza com `node tests/measure-2c-drones.js`. Essa medição é por chamada da função para um bot, não por tick da arena; não mede a taxa de chamadas ou o custo total de uma partida. A rotina compara drones entre si e o custo aumenta com a densidade. Permanecem pendentes medição por tick em uma cena densa real, amostragem mais ampla de partidas, identificação e comparação causal de um reencontro e análise de evasão.
