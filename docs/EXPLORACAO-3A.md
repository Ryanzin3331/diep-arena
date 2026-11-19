# 3A — exploração após janelas vazias

Na base `c98efc8dbbd8c17709809887a189dbabe8464306`, `chooseHeavyResponse` retornava distância assim que não havia resultados, antes de avaliar a exploração periódica. Depois das duas primeiras tentativas vazias, flanco não voltava a ser selecionado. A correção verifica primeiro a exploração existente: na sexta oportunidade escolhe flanco, na décima segunda distância, alternando a cada seis. Fora dessas oportunidades, mantém a escolha pela pontuação quando existem resultados e distância como padrão quando não existem. Uma janela sem dano continua sem criar pontuação; a esquiva e a identidade de tentativa não foram alteradas.

`node tests/auto-strategy-3a.test.js` inclui a regressão de 13 janelas vazias e a verificação da escolha por resultados. Os nove cenários passaram; `node --test tests/*.test.js` passou, com oito arquivos reportados no Node 24.22.1.

## Seed 7101, antes e depois

`tests/measure-3a-autonomous.js` executa FFA com 36 bots, 2400 ticks, todos no nível 30 com score, raio e atributos preparados; slots 0–5 Destroyer e 6–11 Overseer. Persistência desligada, aprendizado ligado. Decisões e colisões são autônomas após a preparação. Linux x86_64; os resultados são de uma única seed, não de celular. Reproduza na raiz do repositório:

```sh
git show c98efc8:index.html > /tmp/3a-exploracao-base.html
CORE=/tmp/3a-exploracao-base.html node tests/measure-3a-autonomous.js
node tests/measure-3a-autonomous.js
```

| Medida | Antes | Depois |
|---|---:|---:|
| Tentativas de flanco | 7 | 15 |
| Tentativas de distância | 48 | 68 |
| Bots com alguma troca avaliada por dano | 0 | 0 |
| Bots com resultados avaliados para ambas | 0 | 0 |

Os totais são tentativas abertas e slots únicos; o instrumento contabiliza dano em tentativas encerradas. Uma execução não terminou todas as tentativas ou projéteis, portanto não implica ausência de futuros impactos. As decisões mudam a evolução das partidas após a primeira divergência; a diferença nos totais não é um experimento isolado para cada decisão. Os JSONs completos estão em `docs/resultados/3a-exploracao-7101-antes.json` e `docs/resultados/3a-exploracao-7101-depois.json`. A ausência de trocas nesta amostra permanece uma limitação; a correção garante oportunidades, não garante contato ou aprendizado.
