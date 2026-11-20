# 3C — painel tático em Assistir

O inspetor do bot selecionado mostra a resposta ativa a tiro pesado ou enxame, sua origem (exploração, histórico ou padrão quando conhecida) e a última tentativa avaliada com pontuação. Sem tentativa ou avaliação, o painel informa isso explicitamente. O resumo compacto usa as mesmas informações. Os campos de diagnóstico acompanham o estado real da tentativa, inclusive atualização por projétil tardio, e não entram no backup nem no multiplayer. Não mudam a seleção, pontuação ou física.

## Reprodução no navegador

Na raiz do repositório, execute `node tests/generate-3c-fixture.js` e depois `node tests/serve-3c-fixture.js`. Abra `http://127.0.0.1:8766/3c-fixture.html`. O cenário é o FFA da seed 7104 do ensaio 3B: Tank e Overseer com 5000 HP iniciais, distância 300, nível 30, decisões e colisões reais da Arena. Ele avança automaticamente até o tick 901 e pausa. Em Assistir, no painel Aprendizado do Pixel, devem aparecer `Enxame: Afastamento · histórico` e `Última avaliação: enxame · Lateral · -0.19`. Selecione Nix no placar para confirmar que o painel muda para a memória dele. A vida artificial do cenário não representa uma partida normal. Para finalizar, pare o servidor com Ctrl+C e apague `3c-fixture.html`, que é gerado localmente.

O cenário foi verificado no navegador integrado; a troca do bot também foi observada. `node --test tests/*.test.js` passou 86 testes no Node 24.15.0. Não houve teste em celular físico.
