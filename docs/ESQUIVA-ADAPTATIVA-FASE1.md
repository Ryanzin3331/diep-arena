# Esquiva adaptativa por projétil

Em FFA e Maze locais, cada bot começa com a reação básica. Depois de avaliar
uma tentativa básica, experimenta a antecipada. Quando já tem resultados das
duas, usa a proporção de desvios bem-sucedidos, com exploração periódica e
preferência pela básica em caso de empate. A janela de emergência segue a do
protótipo. Os resultados permanecem com o bot após renascer na mesma arena.

Uma tentativa acompanha a bala pesada visível que mudou o movimento escolhido.
A avaliação exige que o bot execute o desvio e que a trajetória de referência
sem a influência daquela bala indique colisão. A referência projeta o comando
alternativo inicial com a aceleração do tanque e as restrições do mapa. Um
sucesso exige que a bala ainda em voo atravesse a referência e já esteja se
afastando do tanque. Um impacto da própria bala conta como falha. A remoção
da bala antes da resolução encerra a tentativa sem pontuação, incluindo
interceptações. Cada par bot–projétil é acompanhado uma só vez.

## Reprodução no jogo

Na raiz do repositório, gere a página de teste e inicie o servidor local.

```sh
node tests/generate-dodge-fixture.js
node tests/serve-3c-fixture.js
```

1. Abra [FFA com Pixel novato](http://127.0.0.1:8766/esquiva-fixture.html?bot=novato).
2. Aperte **P** ou clique em **Retomar**. O indicador na arena mostra o
   primeiro tick de desvio e o desfecho. Use **+1** para avançar um tick.
3. Repita com [Pixel experiente](http://127.0.0.1:8766/esquiva-fixture.html?bot=experiente).
   Acrescente `&mapa=maze` aos dois endereços para testar no Maze.

O cenário usa um disparo de Destroyer na vaga humana, com o mesmo estado
inicial para as duas execuções de cada mapa. A Arena conduz a resposta do
Sniper e as colisões. O histórico do experiente vem de dois encontros
preparados no FFA. A reação básica foi atingida e a antecipada evitou o tiro.
Ao reavaliar a decisão do experiente retirando apenas esses resultados, o
seletor volta à básica.

| Mapa | Novato | Experiente |
| --- | --- | --- |
| FFA | Tick 11, atingido | Tick 6, sem acerto |
| Maze | Tick 21, sem acerto | Tick 16, sem acerto |

Os ticks medem a primeira reação executada no cenário. Para reproduzir as
verificações automatizadas, incluindo a reação de emergência, execute
`node --test tests/adaptive-dodge.test.js`. A suíte completa roda com
`node --test tests/*.test.js`.
