# Classes do Diep Arena

Em **Jogar**, você começa de Tank. O menu de evolução mostra os destinos disponíveis para a sua classe e o seu nível atual. Em **Laboratório**, você pode selecionar diretamente as classes compatíveis com o nível escolhido. A tabela segue o catálogo do simulador.

| Origem | Nível mínimo | Destinos |
| --- | ---: | --- |
| Tank | 15 | Twin, Sniper, Machine Gun, Flank Guard |
| Tank | 30 | Smasher |
| Tank | 45 | Auto Tank |
| Twin | 30 | Triple Shot, Quad Tank, Twin Flank |
| Sniper | 30 | Assassin, Overseer, Trapper, **Hunter** |
| Machine Gun | 30 | Destroyer, Gunner, Shotgun |
| Machine Gun | 45 | Sprayer |
| Flank Guard | 30 | Tri-Angle, Auto 3, Quad Tank, Twin Flank |
| Twin Flank | 45 | Battleship, Triple Twin |
| Triple Shot | 45 | Triplet, Penta Shot, Spread Shot |
| Quad Tank | 45 | Octo Tank, Auto 5 |
| Auto 3 | 45 | Auto 5, Auto Gunner |
| Assassin | 45 | Ranger |
| Hunter | 45 | Streamliner |
| Overseer | 45 | Overlord, Necromancer, Factory, Mothership, Battleship |
| Trapper | 45 | Mega Trapper, Auto Trapper, Gunner Trapper, Tri-Trapper |
| Destroyer | 45 | Annihilator, Hybrid, Firework, Skimmer, Rocketeer |
| Gunner | 45 | Gunner Trapper, Auto Gunner, Streamliner |
| Shotgun | 45 | Dual-Barrel, Pellet Shot |
| Tri-Angle | 45 | Booster, Fighter |
| Smasher | 45 | Spike |

## Novas rotas de nível 45

| Classe | Comportamento no Diep Arena |
| --- | --- |
| Auto Tank | Mantém o canhão do Tank e ganha uma torreta automática central. Evolui direto de Tank no nível 45. |
| Auto Gunner | Combina os quatro canhões do Gunner com uma torreta automática central. |
| Pellet Shot | Dispara 30 projéteis pequenos em uma salva larga. |
| Spread Shot | Usa 11 canhões em leque. O canhão central causa mais dano que os laterais. |
| Sprayer | Combina uma bala maior e dispersa com outra menor, mais rápida e frequente. |
| Streamliner | Alterna entre cinco canhões alinhados, formando uma rajada contínua. |
| Tri-Trapper | Lança armadilhas em três direções. Elas duram menos que as do Trapper. |
| Triple Twin | Alterna duas salvas de três tiros. Cada par de canhões cobre uma direção. |

Em FFA aberto e nas duas versões do Maze com pelo menos 8 bots, até três rotas repetidas podem ter um representante redirecionado por seed. O último representante de cada rota é preservado. Você pode escolher qualquer uma das novas classes diretamente no Laboratório no nível 45.

A árvore clássica ainda tem sete classes para portar. Stalker, Manager e Landmine usam invisibilidade. Predator desloca o campo de visão. Overtrapper combina drones e armadilhas. Glider usa mísseis com propulsão lateral. Auto Smasher combina corpo de Smasher, torreta e limites de atributos próprios.

As rotas e os formatos seguem as referências do Diep.io. Alcance, recarga, penetração e dano usam a escala do simulador. [Upgrades](https://diepio.fandom.com/wiki/Upgrades) · [Changelog do Diep.io](https://diep.io/changelog/)

## Hunter

**Tank → Sniper (nível 15) → Hunter (nível 30).** Das referências vieram a rota, os dois canhões no mesmo eixo (o mais largo, sobreposto ao canhão mais longo), a ordem da rajada e a velocidade ligeiramente menor que a do Sniper. O simulador usa o próprio desenho em Canvas. [Diep.io Wiki](https://diepio.fandom.com/wiki/Hunter) · [Diep.io Archive Wiki](https://diepio-archive.fandom.com/wiki/Hunter)

Os valores abaixo foram escolhidos para a escala e o balanceamento do Diep Arena. Os multiplicadores de dano, velocidade e penetração usam as mesmas fórmulas das demais armas.

| Parâmetro | Bala menor | Bala maior | Sniper |
| --- | ---: | ---: | ---: |
| Multiplicador de velocidade | 1,40 | 1,40 | 1,48 |
| Multiplicador de dano | 0,85 | 1,03 | 1,36 |
| Multiplicador de penetração | 1,05 | 1,25 | 1,30 |
| Raio da bala em relação ao tanque | 0,285 | 0,48 | 0,38 |

A bala maior sai após um intervalo nominal de 0,12 s (8 ticks a 60 Hz). Um toque no gatilho completa a rajada. Segurar o gatilho ou ligar o tiro automático repete a rajada a cada 0,99 s de recarga nominal (60 ticks sem pontos em Recarga). A Recarga reduz o intervalo entre rajadas. O campo de visão usa o fator 1,23, ante 1,19 do Sniper.

Em FFA aberto e Maze, uma distribuição por seed pode redirecionar para Hunter um bot que seguiria uma rota repetida de Ranger. A arena mantém pelo menos um candidato a Ranger nesse caso.

### Teste local

Na raiz do repositório, execute:

```sh
node tests/generate-hunter-fixture.js
node tests/serve-3c-fixture.js
```

Abra o [FFA com Hunter nível 30](http://127.0.0.1:8766/hunter-fixture.html). Use **WASD** para mover e o mouse para mirar. Clique uma vez para ver a rajada ou aperte **E** para ligar e desligar o tiro automático. A [variante com Sniper nível 30](http://127.0.0.1:8766/hunter-fixture.html?classe=sniper) permite escolher Hunter pelo menu de evolução normal.
