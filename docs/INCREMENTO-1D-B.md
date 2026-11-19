# Incremento 1D-B — interface de memória

## Uso

Em Configurações, **Usar memória da arena anterior** começa desativado e a preferência é salva neste navegador. A seleção vale para a próxima arena. Desativada, a nova arena não abre sessão de persistência: os bots ainda aprendem na partida e preservam aprendizado no renascimento, sem sobrescrever o backup anterior. A arena anterior, se tiver sessão habilitada, é salva na transição. Multiplayer continua isolado; a reutilização só se aplica a FFA aberto, Maze e laboratório normal.

O status informa a quantidade de perfis confirmados no IndexedDB, operações e falhas. A consulta de status ocorre ao abrir as configurações e não migra o legado. Um aviso de falha é mantido no status mesmo após uma atualização de contagem. Se armazenamento ou coordenação não estiver disponível, o jogo continua sem persistência; a preferência pode não ser salva.

**Exportar memória** prepara um JSON UTF-8 com `schemaVersion: 1` e `profiles`, contendo apenas identificadores e memórias confirmadas no IndexedDB. Não inclui preferências, revisões ou dados do mundo. A exportação não força snapshot da arena atual. Se o banco contiver registros inválidos ou estiver indisponível, a exportação falha integralmente, em vez de produzir um backup parcial.

**Importar memória** aceita até 3.700.000 bytes e 110 perfis, rejeita chaves e esquemas inesperados, identificadores inválidos ou duplicados e perfis que não passem pelo codec e seus limites. A quantidade é mostrada na confirmação antes de `replace()`. Cancelamento, validação inválida ou falha da transação preservam os registros existentes. O sucesso só é informado após o commit e afeta arenas futuras, não a arena em combate.

**Apagar memórias permanentemente** oferece exportar um backup e depois pede confirmação separada. Após `clear()` confirmar, tenta remover somente as chaves legadas com prefixo `diep-arena:bot-memory:v1:`. Se essa limpeza falhar, o status distingue o IndexedDB limpo dos dados legados remanescentes; o marcador transacional os impede de voltar a ser migrados pelo jogo atualizado. Outras preferências e dados locais não são removidos. Uma versão antiga do jogo ainda pode acessar ou voltar a gravar no legado.

## Coordenação

Importação e exclusão incrementam a geração do IndexedDB na mesma transação que altera os perfis. Sessões antigas, inclusive de outras abas, não podem salvar sobre a nova geração. Reinícios aguardam operações em andamento e conferem a geração antes de instalar perfis carregados. Uma notificação `BroadcastChannel`, quando disponível, cancela e reinicia uma transição pendente em outra aba.

O jogo usa um Web Lock exclusivo compartilhado entre abas atualizadas para coordenar o commit de importação/exclusão com a verificação final e instalação da próxima arena. Se Web Locks não estiver disponível, a reutilização e as operações destrutivas falham de forma segura; o jogo e a exportação continuam disponíveis. Código externo ou versões antigas que alterem diretamente o IndexedDB sem esse lock não participam dessa coordenação de interface, embora o núcleo continue validando gerações e revisões ao gravar.

## Validação

Foram executados `node --test tests/*.test.js` (28 testes), `node tests/run-idb-browser.js` (24 cenários com IndexedDB real) e `node tests/run-arena-browser.js` no Chrome 157 headless. A última suíte cobre os controles, ligado → desligado → ligado, reabertura da preferência, JSON inválido e cancelado, exportação e reimportação, aborto de importação, exportação antes de exclusão, falha de limpeza, ausência de Web Locks e exclusão entre duas abas reais com carga antiga pendente. As confirmações e a captura do arquivo de download são substituídas por controles de teste; o arquivo validado é obtido do Blob produzido pela interface. Uma viewport de 390 px foi verificada automaticamente para dimensões e corte dos botões.

Ainda precisam de validação manual: os diálogos nativos e o download no sistema do usuário, interação por toque e orientação em celular físico, outros navegadores, modo privado, quota real, fechamento real da página e multiplayer em dispositivos reais. `pagehide` continua sendo tentativa adicional sem garantia de conclusão.

