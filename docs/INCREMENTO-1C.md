# IA evolutiva — incremento 1C

## Política e escopo

`REUSE_BOT_MEMORY` em `index.html` é uma configuração interna, inicialmente `false`. Para testar o recurso antes da interface 1D, altere-a para `true` em uma cópia local. Desligada, nenhuma memória de bot é lida, gravada ou excluída; o aprendizado dentro da arena continua sujeito a `learningMode`. Não há preferência persistida ou controle visível neste incremento.

O suporte é restrito a FFA aberto (`open`), Maze (`maze` e `maze-seed`) e laboratório normal (`lab`). Os perfis são separados por modalidade e slot. Laboratório de chefe, equipes, objetivos, sobrevivência, Comboio e multiplayer não usam este armazenamento. Em multiplayer, tanto host quanto convidado criam arenas sem sessão de persistência; o protocolo permanece inalterado.

## Armazenamento e transições

`memory-store.js` usa uma chave local independente por perfil, `diep-arena:bot-memory:v1:<profileId>`. Cada valor é um objeto JSON com `schemaVersion: 1`, `profileId` e `memory` contendo o snapshot versionado do codec 1A. Apenas slots 0–35 (0–1 no laboratório) são aceitos. Cada valor é limitado a 40.000 bytes; o codec limita o conteúdo a 32.768 bytes e a 40 confrontos por perfil. Antes de restaurar, a estrutura, versão, identidade, classes e limites são validados. Nenhuma entidade ou decisão temporária é serializada.

A sessão pertence à arena, é aberta antes da criação dos tanques e carrega cada perfil elegível antes de `spendBot`. Ao reiniciar ou sair da arena para uma sala, o snapshot é feito antes da substituição; o fim da partida também aciona snapshot e `pagehide` é uma salvaguarda adicional. Tanques mortos ainda presentes são incluídos. Perfis ausentes por redução de elenco não são tocados. O renascimento na mesma arena continua usando a cópia do 1B, com o relógio original; ao trocar de arena o codec aplica TTL e decaimento e restaura com o novo relógio.

Cada sessão só substitui o valor que ela própria leu ou gravou por último. Valores inválidos ou modificados externamente ficam bloqueados para aquela sessão, sem exclusão automática; falhas de leitura, quota e serialização não interrompem o jogo. Uma falha de gravação pode ser tentada novamente no mesmo tick. Snapshots repetidos no mesmo tick são omitidos quando a gravação anterior teve sucesso. Essa comparação reduz sobrescritas de snapshots antigos, mas `localStorage` não oferece transação de comparação e troca entre abas: duas abas que gravem simultaneamente ainda podem competir. O 1D deve tratar explicitamente conflitos e operações de exportação, importação e exclusão.

## Validação

Execute `node --test tests/*.test.js` na raiz. Os testes cobrem o codec e renascimento anteriores, duas arenas, perfis e modos isolados, política desligada, TTL, decaimento, build, transições reais `restart`/`setMode`, falhas, dados inválidos, elencos variáveis e exclusão do multiplayer.

Comparação offline em Node 24, com 36 bots, construção da arena, 240 ticks e snapshot ao final quando ativado: cinco amostras alternadas após aquecimento tiveram mediana de 1.852,87 ms desligado e 1.873,51 ms ativado (aproximadamente +1,1%). Trata-se de uma medição local de simulação, não de FPS ou consumo de memória no navegador.

Ainda dependem de validação manual: abertura e reinício no navegador com a configuração ativada, fechamento/reabertura e restrições de armazenamento do navegador, modo leve, celular, transições e partidas multiplayer reais. Não há backup/exportação/importação/exclusão ou indicação de erros na interface; falhas podem resultar em aprendizado não salvo, mas os registros anteriores não são apagados automaticamente.

