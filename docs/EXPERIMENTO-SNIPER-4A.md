# Experimento: flanco de tiro pesado durante recuo de Sniper

Referência PR #7, `569d23f9c191356a784b88795d8df7358fe783dc`, Maze 7103 A, início nível 15. O registro até o tick 7250 contém, para cada pensamento dos slots 16 e 17 com plano pesado, os componentes radiais e laterais antes/depois das etapas; `docs/resultados/4a-conflito-sniper-antes.json` tem os eventos e verificou hash sem/com registro. Dos 46 candidatos descartados, todos eram Snipers e somente o lateral mudou: 45 pela regra de recuo diagonal ao recarregar/enfrentar ameaça próxima e um pela busca de linha de tiro. O recuo radial nesses 45 já era −1 antes da regra de classe. A regra de cobertura e demais vetos continuam intactos.

A alteração experimental permite somente flanco (resposta 0) nesse recuo de Sniper quando a componente radial calculada antes já é idêntica ao recuo, e não há fuga de perseguidor. A componente radial não muda; a fuga, a busca de cobertura, rota, alvo, parede e desvio continuam prioritários. O validador existente continua exigindo destino, classe, alvo, movimento e direção final compatíveis antes de abrir a tentativa. A pontuação não foi alterada.

`node --test tests/sniper-heavy-compat.test.js` passou: Sniper recuando e recarregando abre flanco preservando recuo; projétil que força desvio encerra a tentativa; parede no Maze impede alvo oculto. `node --test tests/*.test.js` passou 90 testes no Node 24.15.0.

## Maze 7103, 10800 ticks

| Medida | Antes | Depois |
|---|---:|---:|
| Tentativas de tiro pesado abertas, todos os bots | 3 | 6 |
| Tentativas de tiro pesado avaliadas, todos os bots | 1 | 2 |
| Aberturas de tiro pesado nos slots 16 e 17 | 1 | 4 |
| Dano efetivo recebido pelo slot 16 | 540,69 | 652,94 |
| Dano efetivo recebido pelo slot 17 | 559,23 | 340,01 |
| Dano efetivo recebido por todos os slots | 14.407,24 | 13.813,05 |

Dano é somado nas chamadas de colisão entre tanques, limitado ao HP disponível na chamada; não inclui dano de formas ou fontes fora desse caminho. Slots incluem vidas sucessivas. Uma avaliação depois ocorreu por tiro tardio associado à tentativa encerrada. As trajetórias divergiram; a diferença de dano não isola efeito causal, e uma seed não demonstra melhora de combate. A contagem maior de aberturas demonstra maior execução registrada somente nesta reprodução.

Cada execução de medição foi comparada com e sem registro; hashes dos campos observados coincidiram. Dados por evento e por slot: `docs/resultados/4a-conflito-sniper-antes.json`, `4a-sniper-dano-antes.json` e `4a-sniper-dano-depois.json`. Sem teste visual ou de celular.

## Reprodução PowerShell

```powershell
git show 569d23f:index.html | Set-Content work-base-569d23f.html -Encoding utf8
$env:START_LEVEL='15'; $env:PREPARED='0'; $env:MAP='maze'; $env:SEED='7103'; $env:VARIANT='A'
$env:CORE='work-base-569d23f.html'; $env:TICKS='7250'
node tests/measure-4a-class-conflict.js > conflito.json
$env:TICKS='10800'; node tests/measure-sniper-damage.js > antes.json
Remove-Item Env:CORE
node tests/measure-sniper-damage.js > depois.json
node --test tests/*.test.js
Remove-Item work-base-569d23f.html
```
