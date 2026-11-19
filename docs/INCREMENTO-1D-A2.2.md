# Incremento 1D-A2.2 — migração do legado v1

## Política

Com reutilização habilitada internamente, antes de carregar a primeira arena local elegível o adaptador pede ao IndexedDB que migre as chaves `diep-arena:bot-memory:v1:<profileId>`. A opção continua **desligada por padrão**; nesse caso não há leitura do legado, abertura do IndexedDB ou espera assíncrona adicional. Multiplayer continua sem sessão de persistência. Não há interface neste incremento.

A migração examina somente chaves com o prefixo do sistema de memória. Cada wrapper v1 precisa ter a versão e o identificador esperados, tamanho máximo de 40.000 bytes e snapshot aceito pelo codec 1A, inclusive limites de classes, registros e 32.768 bytes. Perfis inválidos são contados e omitidos; as chaves originais, válidas ou inválidas, permanecem intactas. O resultado de `migrateLegacy` informa `status`, `copied`, `invalid` e `preserved`; a integração registra no console a quantidade inválida. A futura interface deverá informar esse estado ao usuário.

Falhas ao acessar ou ler o armazenamento legado não são classificadas como dados inválidos. Elas interrompem a tentativa sem publicar o marcador; a arena continua sem persistência e uma próxima arena elegível pode tentar de novo. Se a transação IndexedDB abortar, perfis e marcador também permanecem inalterados. Não há fallback para gravação no `localStorage`.

## Atomicidade e concorrência

O marcador `legacy-v1` em `metadata` tem versão 1 e estado `complete` ou `blocked`. Após uma leitura prévia para evitar acesso desnecessário ao legado, a migração valida os dados fora da transação e verifica o marcador **novamente dentro de uma única transação readwrite** que abrange `metadata` e `profiles`. Ela insere apenas perfis ausentes com revisão inicial 1, preserva registros e revisões existentes e grava `complete` nessa mesma transação. Duas conexões concorrentes só podem concluir uma cópia.

`clear()` e `replace()` gravam `blocked` na mesma transação que altera os perfis e incrementa a geração. Assim, se uma dessas operações vencer a corrida antes da escrita de uma migração atrasada, a migração encontra o marcador e não copia dados; se ocorrer depois, remove ou substitui os perfis e impede nova cópia. Escritas posteriores por versões antigas do jogo no legado não são importadas novamente. Os registros legados continuam fisicamente presentes; essa proteção é do jogo atualizado, não apaga ou impede acesso a eles por versões antigas.

## Testes

Execute `node --test tests/*.test.js`, `node tests/run-idb-browser.js` e `node tests/run-arena-browser.js`. Na execução local, os 26 testes Node, 24 cenários transacionais no Chrome e 19 cenários de integração/medição passaram. A suíte de IndexedDB real inclui duas conexões, migração repetida, revisão preexistente, registros inválidos, falha de leitura, aborto de migração, as duas ordens e a corrida entre migração e `clear`/`replace`, além de abortos dessas operações. A suíte de arena confirma que o primeiro bot recupera a memória legada antes de `spendBot` e que uma falha de leitura permite nova tentativa.

## Medição de 36 bots

Chrome 157 headless, Node 24, dados simples para 36 perfis. A instrumentação é injetada somente pelo servidor de teste. Na execução local, a **primeira inicialização**, incluindo carregamento da página/iframe, levou 176,8 ms; a migração levou 25,2 ms, dos quais 3,4 ms foram leitura/validação do legado e 16,6 ms a transação de migração. A leitura/validação da sessão IndexedDB levou 2,2 ms e a construção da arena 9,3 ms. Não há serialização de snapshot anterior na primeira arena.

Em três reinícios seguintes, após 120 ticks cada, as medianas foram **54,7 ms por reinício**: serialização dos snapshots 0,5 ms, gravação 41,7 ms, leitura/validação IndexedDB 2,2 ms, construção da arena 5,2 ms e verificação do marcador 0,7 ms. A gravação inclui validação, verificações de revisão, espera e commit, não apenas chamadas `put`; a construção inclui a reidratação dos bots. A medição de migração engloba seus subcomponentes, e a inicialização total inclui carregamento da página, portanto não se deve somá-los novamente. Os números são amostras pequenas de um dispositivo e indicam a gravação como principal custo observado nos reinícios, não uma garantia de desempenho.

Permanecem necessários testes manuais em celular, modo privado, outros navegadores, quota real, encerramento de página e partidas multiplayer reais. `pagehide` continua sendo tentativa assíncrona sem garantia de conclusão.

