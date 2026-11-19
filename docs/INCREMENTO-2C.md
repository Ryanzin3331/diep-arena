# 2C — validação de descoberta

## Deduplicação de tiros

A base `54755022f210851c3ee5e232ce3679e8dbc5645b` acumulava IDs de tiros pesados observados durante toda a arena e copiava o conjunto no renascimento. O jogo só permite nova observação do mesmo projétil até a idade de 0,25 s. A memória registra agora o prazo calculado a partir dessa idade e do relógio da arena, com margem adicional de um tick para a ordem de nascimento e atualização. A limpeza ocorre no pensamento do bot e antes de registrar novo tiro. O mapa e seus prazos são copiados no renascimento; os contadores táticos e o codec de backup não mudam.

A regressão exercita perda temporária de visão, repetição antes do prazo, renascimento real com tiro elegível, novo tiro após limpeza e 300 tiros distintos ao longo do relógio. Também verifica limpeza sem outro disparo. Passaram `node --test tests/*.test.js`, `node tests/run-idb-browser.js` (24 cenários) e `node tests/run-arena-browser.js` (35 cenários), em Linux; Chromium headless com IndexedDB real usou o adaptador temporário Playwright para `CHROME_BIN` descrito no 2A. Não houve teste em celular físico nesta etapa.

As partidas autônomas pareadas, o custo em cenas com muitos drones e a avaliação de evasão permanecem em investigação separada.
