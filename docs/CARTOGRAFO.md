# Cartógrafo

No **Laboratório**, selecione **Cartógrafo** em **Chefe do desafio** e clique em **Invocar Cartógrafo**. O desenho em Canvas usa um hexágono azul-acinzentado, contorno escuro e dois canhões cinza. A silhueta usa formas chapadas, como as referências, e preserva a grade e a barra de vida do simulador. O desenho e a mecânica da barreira são originais do Diep Arena. [Guardian](https://diepio.fandom.com/wiki/Guardian) · [Fallen Booster](https://diepio.fandom.com/wiki/Fallen_Booster)

## Barreira

- O contorno tracejado avisa 1,5 s antes de subir. A abertura tem 150 unidades e também dá para contornar as extremidades. Se um casco ocupar o traçado, o chefe adia a construção por até um segundo e cancela o ciclo se o espaço continuar ocupado.
- Paredes e pilares bloqueiam cascos e projéteis. Cada pilar tem 135 HP. Destruí-lo com tiros derruba o trecho que ele sustenta. A sobra expira depois de sete segundos e é removida quando o encontro acaba.
- Cada pilar ativo abriga uma torreta Auto com alcance de mira de 245 unidades e intervalo nominal de 1,12 s. Ela lança balas leves contra alvos visíveis. A perda do pilar ou a expiração remove a torreta e os projéteis dela ainda em voo.
- Na pausa de dois segundos após a expiração ou o cancelamento, o chefe escolhe um ponto lateral afastado da ameaça visível mais próxima. O percurso leva até 1,8 s e fica limitado à região inicial, com espaço para contornar as duas extremidades. O tracejado marca a geometria a partir da posição em que ele parou.
- A torreta cinza dupla gira continuamente na direção de alvos visíveis, inclusive durante a recarga. Ao alinhar a mira, dispara um projétil comum pelo próximo canhão. O intervalo nominal entre tiros é de 0,53 s. As paredes ocultam o alvo e bloqueiam o tiro.
- O Cartógrafo tem 1.350 HP. A próxima barreira avisada abaixo de 675 HP espelha a abertura da esquerda para a direita.
- Os bots aproveitam as passagens e podem atirar num pilar acessível enquanto se deslocam. A rota é mantida em cache por até 0,65 s. A destruição de um trecho invalida o cache do traçado.

## Teste jogável

Na raiz do repositório, execute:

```sh
node tests/generate-cartographer-fixture.js
node tests/serve-3c-fixture.js 8770
```

Abra o [cenário local](http://127.0.0.1:8770/cartografo-fixture.html). Você começa pausado como Destroyer nível 45, perto do chefe, com um bot aliado. Aperte **P** para começar. Use **WASD** para mover, o **mouse** para mirar e **clique esquerdo** ou **Espaço** para disparar. Observe o tracejado, mire no quadrado para derrubar seu trecho e atravesse a passagem. Depois de baixar a vida do chefe à metade, aguarde o próximo ciclo para ver o lado da abertura mudar.

A seleção do Laboratório e o cenário jogável foram conferidos no Chromium. A silhueta, a grade, o aviso e a passagem ficaram legíveis com zoom afastado e em viewport de 390 px. Nessa viewport, tiros manuais derrubaram um pilar e reduziram a vida do chefe abaixo de 50%. O Destroyer atravessou a segunda abertura com a barreira ativa.

As regressões Node cobrem aviso, ocupação por tanques, colisão de cascos e projéteis, destruição parcial, espelhamento, expiração, término do encontro e um bot que atravessa a barreira ativa e causa dano ao Cartógrafo. A revisão de movimento confirmou dois ciclos consecutivos, saídas livres e deslizamento após cancelamento por ocupação. No Chromium, conferi o deslizamento entre os ciclos, o alinhamento do segundo tracejado com a parede erguida e os pilares azul-acinzentados com zoom afastado. A rotação de chefes do FFA segue com o mesmo catálogo.

## Comparação da torreta

`node tests/measure-cartographer.js a7396e1` compara as duas revisões do movimento e da mira no cenário de Destroyer nível 45, seed 7103, com o mesmo roteiro de controles por 900 ticks (15 s).

| Medida | Antes | Revisão |
| --- | ---: | ---: |
| Tiros do chefe | 26 | 23 |
| Máximo de tiros do chefe num tick | 2 | 1 |
| Ticks com rotação da mira sem tiro | 0 | 698 |
| Primeiro pilar derrubado | Tick 245 | Tick 245 |
| Deslocamento horizontal da segunda barreira | 150 | 97 |
| Tiros do chefe que acertaram o Destroyer | 1 | 1 |
| Vida restante do chefe | 270,6 | 663,4 |

O teste de cobertura começa com o jogador atrás da parede, derruba o pilar com tiros e confirma que o jogador passa a poder acertar e ser acertado por essa linha. O HP e o dano por projétil foram mantidos. Os números descrevem esse roteiro, com um bot aliado, e não representam todas as lutas do Laboratório.

No Chromium, conferi a torreta girando sobre o casco fixo e a segunda marcação após o deslocamento. A suíte completa passou com 120 testes.

## Disparo quadro a quadro

Em `a7396e1`, os dois canhões já criavam a bala no centro da boca, com o mesmo ângulo. A Arena também avançava a bala 6,64 unidades no tick de nascimento, o que deixava a primeira imagem pausada à frente do canhão. A torreta era desenhada no último ângulo simulado, enquanto a posição já era interpolada.

A primeira posição visível agora coincide com a boca desenhada, e a bala começa a percorrer a trajetória no tick seguinte. O Canvas interpola a rotação entre os estados da Arena. O recuo usa a mesma escala visual das torretas Auto, com a animação acionada por canhão. As torretas dos pilares usam a mesma geometria e verificam a linha de tiro contra a barreira.

Os canhões têm comprimento fixo e giram ao redor do centro da torreta. No recuo, a base e a boca se deslocam juntas. O canhão do pilar tem 58,5 unidades para que a bala caiba fora do quadrado mesmo a 45°. A emissão ainda exige que a boca esteja livre e que o caminho até ela não atravesse um trecho de parede. As regressões comparam a geometria desenhada e o nascimento a 0°, 45° e 90°, incluindo o tiro horizontal que a parede bloqueia.

Abra a [variante quadro a quadro](http://127.0.0.1:8770/cartografo-fixture.html?quadros=1). **Próximo tiro do chefe** roda a simulação até a próxima bala do casco e pausa no nascimento. Use **+1** para ver a saída e o recuo, depois repita para o outro canhão. Pressione **P** para voltar ao controle normal. No Chromium, foi possível ver os dois pontos de saída, as torretas ativas, um pilar com sua torreta desaparecer ao ser destruído e o Destroyer atravessar o trecho com o resto da barreira ainda de pé.
