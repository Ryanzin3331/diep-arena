# Protótipo da reação básica

Na branch de esquiva adaptativa, o cálculo existente limita a janela de previsão a 0,32 s para balas pesadas perceptíveis em FFA e Maze locais. Quando uma aproximação imediata pode ocorrer em até 0,22 s, permanece a janela original de 0,61 s. Outras ameaças, multiplayer e mira não foram alterados. Ainda não há reação antecipada, atribuição de resultado nem aprendizado.

`node --test tests/adaptive-dodge.test.js`: quatro testes passaram. No cenário FFA seed 1, tiro real de Destroyer humano a 260 unidades horizontais e 60 verticais, o primeiro `bestOffset` superior a 0,6 ocorre no tick 6 na base `633a120` e no 11 no protótipo. Num caso de risco imediato, o vetor defensivo coincidiu com a base. As colisões reais de tiro humano em FFA e Maze também foram testadas; o cenário de Maze remove a obstrução para esse teste controlado.

A suíte completa não passou: os testes `medidor preserva física e credita tiro autônomo tardio à tentativa original` e `medidor FFA mantém impacto físico e registra acerto autônomo` falharam porque esperam acertos específicos em trajetórias que mudaram. É preciso investigar e atualizar as regressões preservando sua capacidade de detectar falhas; não se conclui que os mecanismos 3A estejam corretos apenas por atribuir as falhas à mudança de trajetória. Nenhum teste de navegador ou celular foi feito.
