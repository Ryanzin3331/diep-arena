# Incremento 1D-A1 — núcleo transacional IndexedDB

## Escopo

`memory-idb.js` é independente e ainda **não é carregado pelo jogo**. `memory-store.js`, `Arena`, reinício, multiplayer, a preferência desligada por padrão e o comportamento dos incrementos anteriores não foram alterados. Não há migração ou interface neste incremento.

## API

No navegador, carregue `memory-codec.js` e depois `memory-idb.js`. Em Node, o módulo exporta a fábrica CommonJS. Chame `createTransactionalMemoryStore({indexedDB, codec, name})` e `await store.open()`. O nome é opcional; use nomes exclusivos em testes. A abertura rejeita se IndexedDB estiver indisponível, bloqueado ou falhar. A conexão fecha em `versionchange`; `close()` encerra a conexão explicitamente. O chamador precisa tratar falhas e, quando houver integração futura, continuar o jogo sem persistência e sinalizar o erro.

O banco versão 1 contém `profiles` (chave `profileId`, `revision` positiva e `memory` no formato 1A) e `metadata` (registro `state` com `schemaVersion: 1` e geração global). São aceitos os perfis 1C de FFA aberto, Maze e laboratório normal: até 110 perfis, com snapshots limitados a 32.768 bytes e validados pelo codec. Dados desconhecidos, incompatíveis ou malformados são rejeitados. Os perfis em memória devolvidos são cópias; não representam referências vivas ao banco.

- `await db.session()` captura um snapshot consistente e devolve `{generation, profiles, save}`. `profiles` contém `{profileId, memory}`; ausências nesse snapshot são tratadas como revisão zero. `await session.save([{profileId, memory}, ...])` valida o lote e só o grava se a geração e todas as revisões ainda coincidirem. Um conflito rejeita o lote inteiro. Uma sessão invalidada por geração permanece inválida; abrir outra sessão é necessário. Chamadas simultâneas de `save` na mesma sessão são rejeitadas enquanto ela estiver ocupada.
- `await db.replace([{profileId, memory}, ...])` valida integralmente a entrada, substitui todos os perfis e incrementa a geração. `await db.clear()` faz a mesma operação com uma lista vazia. Ambas invalidam sessões anteriores mesmo quando o perfil estava ausente.
- `await db.export()` devolve `{generation, profiles}` com `revision` em cada perfil, usando um snapshot readonly. Para passar dados exportados a `replace`, remova o campo `revision` de cada perfil; revisões são atribuídas pelo banco. `db.close()` fecha a conexão.

Cada escrita de sessão, substituição ou exclusão usa uma transação `readwrite` que inclui ambos os stores. A comparação de geração e revisão ocorre dentro dela; sucesso só é informado no evento `complete`. Não há espera por operações externas durante a transação. A API não oferece exclusão individual; `replace` altera a geração e reinicia revisões dos novos registros. Revisões de perfis diferentes permitem que duas sessões da mesma geração salvem perfis distintos sem conflito.

## Testes

Execute `node --test tests/*.test.js` para os 26 testes anteriores. Execute `node tests/run-idb-browser.js` para o conjunto de IndexedDB real. A suíte inicia um servidor HTTP local temporário e Chrome headless; configure `CHROME_BIN` se o executável não estiver no caminho padrão. Ela retorna código diferente de zero se o navegador falhar, não concluir ou reportar falha.

Foram aprovados 14 cenários no Chrome 157 headless: duas conexões, criação e leitura, codec, conflito do mesmo perfil inclusive ausente, gravações de perfis diferentes, invalidação após exclusão e importação, ambas as ordens de salvamento e exclusão, exportação, dados inválidos, lote com conflito, abertura bloqueada e indisponibilidade. Os testes de importação e exclusão chamam `IDBTransaction.abort()` depois de operações reais terem sido enfileiradas e verificam que perfis e geração permanecem iguais. Esses abortos reproduzíveis não simulam todas as condições reais de quota ou desligamento do navegador.

Ainda faltam integração assíncrona com o jogo, proteção contra respostas atrasadas nas transições, migração do `localStorage` e testes em outros navegadores, dispositivos, modo privado e falhas reais de quota. Até a integração, a antiga limitação do 1C permanece no jogo; o módulo novo não altera nem protege sessões do armazenamento legado.

