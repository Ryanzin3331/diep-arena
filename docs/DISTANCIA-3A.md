# 3A — faixa de combate da resposta de distância

Na base `8a6fc30307de1329e48c661a57e85ff66dc7d466`, `Math.min(radial,-.55)` forçava recuo independentemente da distância. Em FFA controlado, Tank contra Destroyer a 520 unidades, com duas evidências de tiro pesado e o mesmo estado inicial, a intenção da Fase 2 tinha componente radial `+0,8894`, e a resposta de distância do 3A `-0,7307`; ambos atiravam.

A resposta de distância agora usa o alcance de disparo já calculado pelo jogo: `min(visão × 0,98, velocidade × 1,35 × vida × 0,9 + raio do rival)`. A menos de 50% desse alcance ela propõe abrir espaço; entre 50% e 80% propõe componente radial zero; acima de 80% propõe aproximar. Se não houver armamento ou alcance, conserva o componente calculado pelas regras existentes. As regras de classe anteriores e o seletor final de desvio continuam tendo prioridade; o componente lateral existente permanece. A tentativa só é registrada se o movimento final seguir a resposta, como antes. Os fatores são uma regra inicial, não uma garantia de dano: obstáculos, velocidade e esquivas podem impedir o acerto.

`node tests/auto-strategy-3a.test.js` inclui Tank contra Destroyer sem ameaças extras. A 200, 380 e 520 unidades, os componentes radiais observados foram `-0,7307`, `0,0000` e `+0,7307`, respectivamente; a 380 o bot podia atirar. Outro teste confirma diferença em relação ao flanco na mesma situação. A regressão de identidade de tentativa permanece na suíte. `node --test tests/*.test.js` passou no Node 24.22.1, com oito arquivos reportados.

## Seed 7101 — mesma preparação

`tests/measure-3a-autonomous.js` repete FFA com 36 bots no nível 30, score `XP[29]`, raio e atributos preparados; slots 0–5 Destroyer e 6–11 Overseer, 2400 ticks, aprendizado ligado e persistência desligada. Depois da preparação, decisões, tiros e colisões são autônomos. O tempo em alcance abaixo soma ticks de bots com tentativa de distância ativa, rival vivo e perceptível dentro do limite de disparo acima, dividido por 60. É tempo agregado entre bots, não duração da partida nem medida de impacto. Amostras no final do passo; tentativas encerradas dentro de um passo podem não aparecer. Acerto é o primeiro contato de dano registrado por projétil associado com seu rival, independentemente de a tentativa estar ativa; tentativas avaliadas são as encerradas com dano causado ou recebido.

| Medida | Antes | Depois |
|---|---:|---:|
| Tempo em alcance em tentativas de distância, agregado | 28,83 s | 37,92 s |
| Acertos de projéteis associados no rival | 0 | 0 |
| Tentativas encerradas com dano avaliado | 0 | 0 |
| Projéteis associados ainda em voo ao fim | 1 | 2 |

A seed continua sem trocas avaliadas na janela. As partidas divergem após escolhas diferentes; esses totais não isolam causalmente a mudança nem garantem aprendizado em outras partidas. Reproduza:

```sh
git show 8a6fc30:index.html > /tmp/3a-distancia-base.html
CORE=/tmp/3a-distancia-base.html node tests/measure-3a-autonomous.js
node tests/measure-3a-autonomous.js
```

Os registros completos estão em `docs/resultados/3a-distancia-7101-antes.json` e `docs/resultados/3a-distancia-7101-depois.json`. Não houve medição em celular físico ou nova suíte de navegador nesta etapa.
