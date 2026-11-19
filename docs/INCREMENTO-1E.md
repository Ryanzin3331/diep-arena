# Incremento 1E — validação da memória da Fase 1

## Corrida e correção

Na base `3d0dd83138d7d5ed9df881c795bffeca944eef61`, dois testes com a ordem controlada reproduziram a perda do pedido: importação durante a entrada em Survival instalou outro mapa; exclusão em outra aba durante o ensaio do chefe instalou um duelo comum. Os testes bloqueiam o salvamento até a operação ou notificação ocorrer. Não dependem de temporização casual.

A transição conserva a configuração e a promessa originais. Uma revisão de memória sinaliza mudanças locais e notificações entre abas; quando muda, a preparação é repetida antes da instalação. A validação da geração continua dentro do Web Lock. O identificador da transição continua garantindo a prioridade do pedido mais recente do jogador, inclusive durante importação. O retorno da promessa original conserva a ação de foco após a entrada Survival. Multiplayer e o caminho imediato sem memória permanecem isolados.

## Validação automatizada

- `node --test tests/*.test.js`: passou; Node 24.22.1 apresenta quatro arquivos de teste, contendo 28 casos.
- `node tests/run-idb-browser.js`: 24 cenários passaram com IndexedDB real.
- `node tests/run-arena-browser.js`: 35 cenários passaram, incluindo a reprodução controlada, prioridade de pedido posterior, duas abas, geração, memória desligada e multiplayer. Os diálogos e o download são substituídos por controles de teste nessa suíte.
- Chromium 156.0.8078.79 headless no Linux x86_64. Neste ambiente, o executável padrão não terminou o modo `--dump-dom`; os dois comandos de navegador foram executados com `CHROME_BIN` apontando para um adaptador temporário Playwright que abre o mesmo Chromium e aguarda o resultado da página. Não altera o código do jogo nem os cenários.

## Interface visível

Em Chromium com interface, no endereço local `http://127.0.0.1:8765/index.html`, foram verificados o download real do JSON, a seleção e reimportação do mesmo arquivo com diálogo nativo de confirmação (24 perfis), e a preferência ativada após fechar e reabrir a aba. A exclusão em duas abas foi verificada na automação, mas não concluída pela interface visível. O fechamento e reabertura foram da aba, não do processo completo do navegador.

## Medições

Linux x86_64, AMD EPYC 7763 (3 CPUs disponíveis), Node 24.22.1, Chromium 156 headless, 36 bots. Para cada combinação, três carregamentos iniciais em quadros novos com banco de benchmark separado e 15 reinícios subsequentes (cinco por quadro). O tempo inicial inclui navegação, carregamento e inicialização da página; o reinício mede da chamada até a instalação. Medianas em milissegundos, amostras pequenas e ambiente compartilhado; não são medidas de celular. Os reinícios não incluem simulação de combate entre amostras.

| Mapa | Memória | Inicial, n=3 | Reinício, n=15 |
|---|---|---:|---:|
| FFA | Desligada | 87,9 | 1,7 |
| FFA | Ligada | 230,0 | 39,1 |
| Maze fixo | Desligada | 190,7 | 3,0 |
| Maze fixo | Ligada | 216,1 | 32,3 |

## Pendente

Validar a exclusão com diálogos nativos em duas abas visíveis; fechamento e reabertura completa do navegador; toque, rotação e download no Poco C75 físico. Permanecem também os limites registrados no 1D-B: outros navegadores, modo privado, quota real e multiplayer em dispositivos reais. `pagehide` é tentativa sem garantia de conclusão.
