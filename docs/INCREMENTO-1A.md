# Memória evolutiva — incremento 1A

O arquivo `memory-codec.js` oferece `createMemoryCodec({classes, newMemory, ttl})` como exportação CommonJS ou como função global no navegador. As dependências devem ser as definições reais da IA (`C`, `newMemory` e `MEMORY_TTL`). Nenhuma parte do jogo carrega ou chama o codec neste incremento.

- `serialize(memory, time)` devolve JSON v1 de um bot, com contadores e confrontos por classe. `time` é o relógio da arena de origem. Registros vencidos pelo TTL são descartados; os demais recebem o decaimento existente da IA antes do snapshot. A confiança herdada é limitada a 4 por tática.
- `deserialize(json, adaptiveBuilds, time = 0)` valida o JSON e cria uma memória fresca com `newMemory`, reconstruindo o `Map` de classes e atribuindo aos registros o relógio da arena de destino. O decaimento e TTL normais continuam nessa arena. IDs de entidades, decisões em andamento e pressão da build não são transferidos.
- `validate(snapshot)` valida o objeto v1 e lança erro para dados incompatíveis. `deserialize` também limita o JSON a 32 KiB. Há até 40 confrontos por bot, três táticas por confronto e limites numéricos para confiança e contadores. Nomes de classes precisam existir no registro fornecido.

Execute `node --test tests/memory-codec.test.js` na raiz do repositório. O teste extrai `newMemory` e `recordOutcome` do `index.html` para verificar o contrato com a IA atual.

O codec trata uma memória por vez; identidade, armazenamento, seleção de modo, renascimento e conexão ao jogo pertencem aos próximos incrementos. A evidência já vencida no momento do snapshot não é recuperada. Não há gravação automática, alterações de interface ou mudanças no multiplayer.

