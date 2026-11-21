# Retomada da integração do Diep Arena

No checkpoint, a `main` e o deploy ativo do GitHub Pages estavam em `5805932471a4c39ef4e323548e6df6f7f0d43df0`. [Workflow daquele deploy](https://github.com/Ryanzin3331/diep-arena/actions/runs/44864252874) · [Site](https://ryanzin3331.github.io/diep-arena/)

| PR | Branch e revisão | Estado confirmado |
| --- | --- | --- |
| [#11 Hunter](https://github.com/Ryanzin3331/diep-arena/pull/11) | `feature/classe-hunter` em `b09b402` | Merge `928f58c`. Suíte com 101 testes. Menu de evolução e os dois disparos confirmados no Chromium local. README aponta para `docs/CLASSES.md`. Publicado. |
| [#8 Cor](https://github.com/Ryanzin3331/diep-arena/pull/8) | `feature/cor-tanque-jogar` em `9f61926` | Merge `5805932`. Suíte com 101 testes. Chromium local confirmou cor livre, Padrão, persistência, renascimento com morte controlada, identificação de equipe, layout responsivo a 390 × 844 e paleta da sala em WebRTC real entre dois clientes do mesmo notebook. Publicado. |
| [#3 Salas](https://github.com/Ryanzin3331/diep-arena/pull/3) | `feature/salas-4-jogadores`, integração `bd0eb8a1fbbdd46a2ef5f1c57b2f8e02e2a57e98` | A suíte Node passou com 106 testes. Os cinco testes de sala da suíte usam transporte simulado. A execução com WebRTC real está registrada abaixo. |

## Validação do multiplayer

O medidor aguarda `host.api.room?.ready===true`, mantém os clientes visíveis e espera os primeiros estados antes de enviar os comandos. As primeiras rodadas tiveram falhas de comando, morte ou amostragem. Com a seed fixa 7103 e os jogadores preparados fora do ninho para evitar mortes antes da medição, os fluxos passaram usando o mesmo código do jogo.

Para repetir na raiz do repositório, execute:

```sh
node tests/generate-room-audit-fixture.js
node tests/serve-3c-fixture.js
```

Abra `http://127.0.0.1:8766/audit-webrtc.html` e clique em **Testar salas reais de 2, 3 e 4**. Use `8768` se o servidor desta cópia já estiver ativo nessa porta.

Os três cenários usaram Chromium 157 no mesmo notebook Windows com Intel Core i3-N305, clientes simultâneos em iframes visíveis e sinalização PeerJS real. O medidor confirmou canais de dados WebRTC abertos, comandos independentes e paleta da sala. A morte foi controlada pelo teste e o renascimento usou o botão normal. Nenhuma execução foi feita entre dispositivos ou com latência emulada.

| Jogadores | Bots | p95 de frame dos convidados | Resultado |
| ---: | ---: | --- | --- |
| 2 | 0 | 16,8 ms | Renascimento individual |
| 3 | 8 | 16,8 / 16,8 ms | Reinício da rodada e continuidade após a saída |
| 4 | 8 | 33,4 / 33,4 / 33,4 ms | Renascimento individual e continuidade após a saída |

O p95 mede intervalos de `requestAnimationFrame` na janela de 4,5 s com os convidados atirando. Inclui o custo de executar simultaneamente todos os clientes no notebook. Na sala de quatro, o p95 de chegada dos estados nos convidados foi de 98,5 a 100,8 ms. Uma execução preliminar de quatro jogadores chegou a 50,0 ms de p95 por frame.

## Arquivos locais preservados

Na cópia original, o cenário manual do PR #10 ficou em `tests/generate-dodge-play-fixture.js` e `esquiva-jogavel.html`. O teste anterior no navegador confirmou Destroyer nível 30, disparo manual e os Pixels com históricos distintos. É um cenário local de revisão. As páginas geradas `esquiva-fixture.html` e `hunter-fixture.html` também permanecem na cópia original. O cenário de conferência de cor `audit-color.html` permaneceu no worktree de cor.

O experimento do flanco do Sniper continua na branch `experiment/4a-sniper-heavy-compatible` (`a260965`). A investigação sobre desistência da perseguição continua separada.
