# Retomada da integração do Diep Arena

A `main` e o deploy ativo do GitHub Pages estão em `5805932471a4c39ef4e323548e6df6f7f0d43df0`. O workflow `pages build and deployment` concluiu com sucesso para esse SHA. A conferência visual no Pages ficou para a retomada. [Workflow](https://github.com/Ryanzin3331/diep-arena/actions/runs/44864252874) · [Site](https://ryanzin3331.github.io/diep-arena/)

| PR | Branch e revisão | Estado confirmado |
| --- | --- | --- |
| [#11 Hunter](https://github.com/Ryanzin3331/diep-arena/pull/11) | `feature/classe-hunter` em `b09b402` | Merge `928f58c`. Suíte com 101 testes. Menu de evolução e os dois disparos confirmados no Chromium local. README aponta para `docs/CLASSES.md`. Publicado. |
| [#8 Cor](https://github.com/Ryanzin3331/diep-arena/pull/8) | `feature/cor-tanque-jogar` em `9f61926` | Merge `5805932`. Suíte com 101 testes. Chromium local confirmou cor livre, Padrão, persistência, renascimento com morte controlada, identificação de equipe, layout responsivo a 390 × 844 e paleta da sala em WebRTC real entre dois clientes do mesmo notebook. Publicado. |
| [#3 Salas](https://github.com/Ryanzin3331/diep-arena/pull/3) | `feature/salas-4-jogadores`, integração `bd0eb8a1fbbdd46a2ef5f1c57b2f8e02e2a57e98` | Rascunho. A integração sobre `5805932` passou em `node --test tests/*.test.js` com 106 testes. O transporte dos cinco testes de sala da suíte é simulado. O cenário de WebRTC real desta branch foi preparado e ainda aguarda execução. |

## Próximo passo do PR #3

Em `tests/audit-webrtc.html`, mudar a espera do anfitrião de `host.api.room?.phase==="lobby"` para `host.api.room?.ready===true`. A inspeção de `openRoom()` mostrou que a sinalização do anfitrião define `ready` e atualiza o diálogo, mas só o convidado passa pela fase `lobby`. O cenário ainda não foi executado, portanto esse ajuste pendente é do medidor e nenhum bloqueio de produto foi observado nesta revisão.

Depois executar na raiz da branch:

```sh
node tests/generate-room-audit-fixture.js
node tests/serve-3c-fixture.js
```

Abrir `http://127.0.0.1:8766/audit-webrtc.html` e clicar em **Testar salas reais de 2, 3 e 4**. Se o servidor desta cópia ainda estiver ativo em `8768`, usar essa porta. Registrar os canais RTC reais, comandos independentes, saída do convidado, renascimento ou reinício e p95 dos frames do convidado. O cenário roda clientes Chromium separados em iframes visíveis do mesmo notebook, sem emulação de latência. Depois revisar o README e reavaliar o merge. Conferir o Pages no navegador após o deploy.

## Arquivos locais preservados

Na cópia original, o cenário manual do PR #10 ficou em `tests/generate-dodge-play-fixture.js` e `esquiva-jogavel.html`. O teste anterior no navegador confirmou Destroyer nível 30, disparo manual e os Pixels com históricos distintos. É um cenário local de revisão. As páginas geradas `esquiva-fixture.html` e `hunter-fixture.html` também permanecem na cópia original. O cenário de conferência de cor `audit-color.html` permaneceu no worktree de cor.

O experimento do flanco do Sniper continua na branch `experiment/4a-sniper-heavy-compatible` (`a260965`). A investigação sobre desistência da perseguição continua separada.
