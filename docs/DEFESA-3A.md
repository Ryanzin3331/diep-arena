# Sinal defensivo do 3A

Uma tentativa ativa recebe até três créditos de 0,02 quando um tiro seu destrói um projétil balístico pesado do rival perceptível e esse projétil está em rota de colisão com o observador. A previsão usa a mesma janela de 0,61 s e margem da esquiva, com velocidade atual do projétil e observador parado. Cada projétil hostil conta uma vez; o teto por tentativa é 0,06. O dano mantém escala de (causado − recebido)/100 e ambos são combinados na avaliação limitada a [-1, 1]. Tentativas sem dano ou interceptação não têm resultado. A identidade do tiro deve ser a da tentativa ativa, e o rival e o projétil precisam ser perceptíveis. Os dados permanecem apenas no aprendizado agregado da arena, sem alterar backup ou multiplayer.

`node tests/auto-strategy-3a.test.js` testa colisões reais positivas, terceiro, trajetória sem risco e tiro antigo, além de deduplicação e teto. `node --test tests/*.test.js` passou (8 arquivos de teste). A previsão é uma aproximação e não garante impacto futuro se velocidades mudarem.

Partidas autônomas Linux: `for seed in 7102 7103 7104; do SEED=$seed node tests/measure-3a-autonomous.js > /tmp/def-$seed.json; done`. FFA, 36 bots nível 30, slots 0–5 Destroyer e 6–11 Overseer, 2400 ticks, aprendizado ligado. Bot contado por slot ao encerrar uma tentativa com o respectivo sinal; um bot pode aparecer nas duas categorias.

| Seed | Tentativas | Bots com dano | Bots com interceptação |
| --- | ---: | ---: | ---: |
| 7102 | 187 | 0 | 0 |
| 7103 | 120 | 0 | 0 |
| 7104 | 149 | 0 | 0 |

A amostra totaliza 456 tentativas e não demonstra aprendizado em jogo autônomo. Resultados detalhados em `docs/resultados/def-710*.json`. Não houve validação em celular físico.
