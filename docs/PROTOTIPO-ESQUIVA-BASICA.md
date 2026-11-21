# Protótipo da reação básica

Para a implementação e a reprodução completa, consulte a [Fase 1 da esquiva adaptativa](ESQUIVA-ADAPTATIVA-FASE1.md).

Na branch de esquiva adaptativa, o cálculo existente limita a janela de previsão a 0,32 s para balas pesadas perceptíveis em FFA e Maze locais. Quando uma aproximação imediata pode ocorrer em até 0,22 s, permanece a janela original de 0,61 s. Outras ameaças, multiplayer e mira não foram alterados. Ainda não há reação antecipada, atribuição de resultado nem aprendizado.

`node --test tests/adaptive-dodge.test.js`: quatro testes passaram. No cenário FFA seed 1, tiro real de Destroyer humano a 260 unidades horizontais e 60 verticais, o primeiro `bestOffset` superior a 0,6 ocorre no tick 6 na base `633a120` e no 11 no protótipo. Num caso de risco imediato, o vetor defensivo coincidiu com a base. As colisões reais de tiro humano em FFA e Maze também foram testadas; o cenário de Maze remove a obstrução para esse teste controlado.

Na investigação das duas falhas, comparei `633a120` e `f59b7ce` com `DISABLE_3B=1` e as condições originais dos testes. Usei `CORE` para apontar os medidores para o HTML de cada commit e observei o vetor escolhido ao fim da avaliação de movimentos.

| Cenário original | Primeira diferença no vetor escolhido | Resultado da colisão |
|---|---|---|
| Duelo 7103, distância 200, 100 ticks, controle 0 | Tick 76, slot 0, desvio de −1,39 para −0,67 radianos com os mesmos dois tiros pesados no cálculo | O tiro do tick 67 atingiu o mesmo rival no tick 89 na base e no 88 com o patch. A tentativa 2 encerrou no 76 em ambos, recebeu os mesmos 25 de dano causado e foi avaliada uma vez. |
| FFA 7102, 36 bots, 470 ticks | Tick 60, slot 35 (Machine Gun), desvio de 0 para +0,67 radianos com os mesmos dois tiros pesados no cálculo. A tentativa que abria no tick 60 deixou de abrir. | Na base, o slot 18 acertou o rival perceptível no tick 442 durante uma tentativa ativa. Com o patch esse tiro nem foi emitido sob a tentativa original. Houve três acertos tardios registrados e dois resultados com dano causado, mas nenhum acerto registrado na categoria ativa e perceptível nessa janela. |

As falhas eram dependências da trajetória. O duelo agora relaciona o impacto do mesmo disparo ao encerramento, ao dano e à avaliação da tentativa original, sem fixar o tick do impacto. A regressão da FFA usa a seed 7103 na mesma janela de 470 ticks, com acerto do slot 20 no tick 325 durante a tentativa aberta no 275 e encerrada no 335, com 11,75 de dano creditado. O teste vincula o acerto à tentativa que foi avaliada.

`node --test tests/*.test.js` passou com 92 testes. O primeiro desvio do tiro humano continuou nos ticks 6 e 11 na base e na reação básica, respectivamente. A situação de emergência manteve o vetor defensivo da base.
