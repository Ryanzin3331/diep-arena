# Aprendizado e Cuidado em perseguições

Em **Assistir**, selecione um bot no placar e abra **Aprendizado**. Cada barra tem detalhes expansíveis. Reconhecimento mostra quantos rivais deram evidência de tiro pesado ou enxame. As respostas e a esquiva mostram resultados agrupados por ameaça, tentativas iniciadas e avaliadas, e a origem da última escolha registrada. O nome do rival aparece nos eventos em que o reconhecimento já o identificou.

## Regra de Cuidado

Antes desta fase, um rival que continuava visível e no alcance continuava elegível para combate. O alvo anterior recebe um desconto de 36 no custo de seleção. A regra de confronto prolongado existente avalia disputas entre bots que estão atacando, por isso não encerrava o caso preparado com um jogador em fuga.

No FFA e no Maze locais, Cuidado começa a observar quando o movimento escolhido avança em direção ao rival visível. Depois de seis segundos, o bot pode continuar por dois segundos ou voltar à seleção normal. Na regra inicial, ele insiste se causou pelo menos 6 de dano e saiu na frente na troca, ou se reduziu a distância em mais de 42 unidades sem tomar dano. Ao abandonar, evita selecionar o mesmo rival distante por três segundos. Proximidade e risco imediato continuam disponíveis para defesa e fuga.

O aprendizado estima o retorno de insistir. O saldo combina dano causado e recebido do rival, custo pelo tempo e desfecho. Uma extensão inteira sem interação tem saldo negativo pelo tempo gasto. Uma interrupção sem interação fica sem avaliação. Abandonar serve de referência de custo zero e não ganha crédito por sair ileso. Depois de duas extensões avaliadas, o bot usa o saldo médio com exploração periódica. O dano de um tiro só credita a janela em que saiu. O resultado fica com o bot ao renascer na mesma arena e o backup mantém o formato anterior.

## Reprodução local

Na raiz da branch, execute `node tests/generate-care-fixture.js`. Sirva a pasta com `node tests/serve-3c-fixture.js` e abra [o cenário na porta 8766](http://127.0.0.1:8766/cuidado-fixture.html). Se o servidor de revisão na porta 8769 estiver ativo, abra [o cenário na porta 8769](http://127.0.0.1:8769/cuidado-fixture.html).

Você nasce de Sniper nível 15, à direita do Pixel. Abra a barra **Cuidado em perseguições**, aperte **P** e segure **D** por cerca de sete segundos sem disparar. A aba mostra a decisão de Pixel e a evidência da janela. A cópia de revisão exibe a aba durante Jogar para permitir acompanhar o bot enquanto você controla o tanque. Recarregue para restaurar a preparação.

## Cenários controlados

- `node tests/measure-care.js` usa o mesmo comando de fuga em FFA por 800 ticks. Com `CARE_CORE` apontando para o `index.html` de `97df646`, o bot manteve o alvo por 796 ticks, sem causar dano. Com Cuidado, foram 360 ticks e o abandono ocorreu no tick 365.
- `node --test tests/care.test.js` reproduz uma perseguição em que o bot causa dano e insiste. Em outra reprodução, dois encontros da Arena renderam extensões com saldo negativo. No mesmo estado do próximo confronto, o histórico fez o bot abandonar e retirar apenas `careResults` fez o bot insistir.
- As regressões verificam atribuição ao rival e à janela do disparo, prioridade de emergência, persistência após renascer, seleção no Maze e isolamento do multiplayer. A aba foi conferida no Chromium ao trocar de bot pelo placar e durante uma fuga com teclado.

## Partidas normais

`node tests/measure-care.js open 7103 5400` e `node tests/measure-care.js maze 7103 5400` rodaram 90 s simulados, com 36 bots e a preparação normal da arena. Todos os slots iniciaram observações em ambos os mapas. A observação mais longa foi de 3,40 s no FFA e 4,23 s no Maze. Nenhuma atingiu os seis segundos que dão acesso à decisão, então não houve extensão avaliada nem escolha por histórico nessas partidas. A mudança de escolha por experiência foi verificada no cenário controlado.

`node --test tests/*.test.js` passou com 111 testes, incluindo a esquiva de emergência e as regressões de dano do 3A.
