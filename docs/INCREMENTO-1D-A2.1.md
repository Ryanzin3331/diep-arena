# Incremento 1D-A2.1 — integração assíncrona IndexedDB

## Escopo e configuração

O adaptador `memory-bridge.js` abre o núcleo transacional 1D-A1 sob demanda, captura uma sessão consistente e disponibiliza `load` síncrono ao construtor da arena. Ele usa o codec 1A para reconstruir memórias antes de `spendBot` e para preparar snapshots separados do mundo antes de gravar. `Arena`, a IA de combate, a física e o protocolo multiplayer não foram reimplementados.

`REUSE_BOT_MEMORY` permanece `false` por padrão. Com essa configuração, a criação/reinício continua síncrona, não abre IndexedDB e não lê nem grava perfis. Para teste interno em uma cópia local, a constante pode ser alterada para `true`; a suíte de navegador faz isso somente na resposta HTTP de teste, sem alterar o arquivo do jogo. Não há interface, migração, importação ou exclusão neste incremento. Os registros `localStorage` v1 permanecem intocados; não há fallback de escrita para eles.

Com a constante habilitada, somente FFA aberto, Maze fixo, Maze por seed e laboratório normal abrem sessões. Os demais modos e salas multiplayer não abrem nem salvam perfis. Cada arena elegível mantém a própria sessão e suas revisões. O adaptador serializa saves da mesma sessão, e o núcleo 1D-A1 continua responsável por verificar gerações e revisões dentro das transações. Conflitos, dados inválidos e falhas de IndexedDB não ativam outro armazenamento: são registrados no console e a próxima arena continua sem a memória indisponível. Uma futura interface deverá apresentar esse estado ao usuário.

## Transições

Ao reiniciar uma arena elegível, o snapshot é preparado imediatamente, a simulação é pausada e a gravação é aguardada antes de preparar os perfis da próxima arena. Um contador monotônico invalida respostas atrasadas; novos pedidos de reinício ou troca de modo não permitem que um pedido anterior instale sua arena. A inicialização aguarda a primeira arena quando necessário. O caminho de Survival que depende de `restart` também espera sua conclusão quando há um snapshot anterior pendente.

A entrada numa sala multiplayer é imediata, sem abrir ou aguardar IndexedDB para a sala. Se houver snapshot local pendente, ele continua em segundo plano; uma transição posterior de volta para uma arena local o aguarda antes de carregar perfis. `pagehide` é uma tentativa adicional assíncrona e pode ser interrompida pelo encerramento da página. O último aprendizado pode não ser salvo nesse caso. O fechamento da partida e transições normais são caminhos adicionais de snapshot.

## Validação e desempenho

Execute `node --test tests/*.test.js` (26 testes anteriores), `node tests/run-idb-browser.js` (14 cenários transacionais no navegador) e `node tests/run-arena-browser.js` (integração no jogo real com IndexedDB do Chrome). Os três conjuntos passaram localmente com Node 24 e Chrome 157. A suíte de arena cobre recuperação e identidade, restauração antes da build, reinícios e salvamentos atrasados, pedidos rápidos, troca de modo, falhas, invalidação externa, seletividade A/B, renascimento, 36 bots, multiplayer, modo desligado e preservação dos dados legados. A ativação e os hooks de observação são injetados apenas pelo servidor de teste.

Na comparação local em Chrome headless, com 36 bots, três amostras após aquecimento, 120 ticks e duas transições por amostra, as medianas da execução final foram: total de **188,1 ms desligado** e **446,5 ms habilitado**; simulação de **180,1 ms** e **179,3 ms**; transições de **7,4 ms** e **275,0 ms**. A diferença observada está concentrada nas transições e é relevante; não constitui medição de FPS ou garantia para outros dispositivos. As amostras são pequenas e a carga/estado podem variar.

Ainda precisam de validação manual os controles e o comportamento em celular, fechamento real da página, modo privado, quota real, outros navegadores e partidas multiplayer reais. A integração não é uma migração: memórias v1 permanecem separadas e não são carregadas até o incremento de migração.

