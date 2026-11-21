# Cartógrafo

No **Laboratório**, selecione **Cartógrafo** em **Chefe do desafio** e clique em **Invocar Cartógrafo**. O desenho em Canvas usa um hexágono azul-acinzentado, contorno escuro e dois canhões cinza. A silhueta usa formas chapadas, como as referências, e preserva a grade e a barra de vida do simulador. O desenho e a mecânica da barreira são originais do Diep Arena. [Guardian](https://diepio.fandom.com/wiki/Guardian) · [Fallen Booster](https://diepio.fandom.com/wiki/Fallen_Booster)

No **FFA aberto**, abra **Configurar**, escolha uma frequência em **Chefes na próxima partida**, ligue **Bosses de evento** e reinicie. O Cartógrafo é um dos oito chefes desse sorteio. É possível invocá-lo diretamente no Laboratório.

## Barreira

- O contorno tracejado avisa 1,5 s antes de subir. A abertura tem 150 unidades e também dá para contornar as extremidades. Se um casco ocupar o traçado, o chefe adia a construção por até um segundo e cancela o ciclo se o espaço continuar ocupado.
- Paredes e pilares bloqueiam cascos e projéteis. Cada pilar tem 135 HP. Destruí-lo com tiros derruba o trecho que ele sustenta. A sobra expira depois de sete segundos e é removida quando o encontro acaba.
- Cada pilar ativo abriga uma torreta Auto com intervalo nominal de 1,12 s. Ela mira no tanque em sua posição atual e pode apontar para a parte exposta do casco se o tiro central raspar no canto da parede. As balas leves dos pilares têm cor âmbar. A perda do pilar ou a expiração remove a torreta e os projéteis dela ainda em voo.
- Na pausa de dois segundos após a expiração ou o cancelamento, o chefe pode se afastar da ameaça visível mais próxima em qualquer direção. O percurso leva até 1,8 s e fica dentro de um diâmetro do ponto inicial, com espaço para contornar as duas extremidades. O chefe interrompe o deslocamento se um tanque entrar na trajetória. O tracejado marca a geometria a partir da posição em que ele parou.
- A torreta cinza dupla gira continuamente na direção de alvos visíveis, inclusive durante a recarga. Ao alinhar a mira, dispara um projétil comum pelo próximo canhão. O intervalo nominal entre tiros é de 0,53 s. As paredes ocultam o alvo e bloqueiam o tiro.
- Os bots calculam a rota pelas aberturas das duas linhas levando em conta o raio do casco. Continuam pela passagem escolhida até sair do outro lado ou até a rota deixar de ser segura. Derrubar um pilar libera novas rotas imediatamente. A mira conserva o pilar por até 0,5 s quando a visão do chefe abre de passagem, e só dispara enquanto o pilar estiver acessível.

## Fases

A vida máxima é de 1.350 HP. A barra marca 70% e 35%, indica a fase em vigor e muda de cor com o casco. As fases avançam entre barreiras. O aviso e a construção em curso terminam com o mesmo desenho.

| Fase | Vida no início da fase | Movimento e barreira | Visual |
| --- | ---: | --- | --- |
| 1 | 1.350 HP | Uma linha com dois pilares, abertura à esquerda e alcance de mira de 245 unidades nas torretas dos pilares. | Casco e pilares azul-acinzentados. |
| 2 | 945 HP | Deslizamento 50% mais rápido e até 225 unidades por pausa. Abertura à direita. Os pilares acompanham alvos mais rápido e seu alcance de mira sobe para 310 unidades. | Casco azul com duas divisas âmbar e pilares âmbar. |
| 3 | 472,5 HP | Mantém o deslizamento. Uma segunda linha curta cobre a passagem direta. O terceiro pilar pode ser derrubado para reabri-la. As torretas dos pilares disparam com pelo menos 0,22 s de intervalo entre si. | Casco cobre com três divisas, pilar extra acobreado e tracejado curto na segunda linha. |

As duas linhas da fase final são avisadas e construídas juntas. As duas rotas externas continuam livres. A torreta principal mantém a antecipação e a cadência anteriores. A perfuração dos projéteis sobe de 1,8 para 2,4 e 3,0 nas três fases. Velocidade e dano base permanecem iguais. As paredes ainda bloqueiam esses tiros.

## Teste jogável

Na raiz do repositório, execute:

```sh
node tests/generate-cartographer-fixture.js
node tests/serve-3c-fixture.js 8770
```

Abra o [cenário local](http://127.0.0.1:8770/cartografo-fixture.html). Você começa pausado como Destroyer nível 45, perto do chefe, com um bot aliado. Aperte **P** para começar. Use **WASD** para mover, o **mouse** para mirar e **clique esquerdo** ou **Espaço** para disparar. Observe o tracejado, mire no quadrado para derrubar seu trecho e atravesse a passagem. Ao reduzir a vida do chefe, aguarde a próxima barreira para ver as mudanças de fase. Acrescente [`?fase=2`](http://127.0.0.1:8770/cartografo-fixture.html?fase=2) ou [`?fase=3`](http://127.0.0.1:8770/cartografo-fixture.html?fase=3) para começar com vida suficiente para testar diretamente a fase desejada.

Na versão de uma barreira, a seleção do Laboratório e o cenário jogável foram conferidos no Chromium. A silhueta, a grade, o aviso e a passagem ficaram legíveis com zoom afastado e em viewport de 390 px. Nessa viewport, tiros manuais derrubaram um pilar e reduziram a vida do chefe abaixo de 50%. O Destroyer atravessou a segunda abertura com a barreira ativa.

As regressões Node cobrem aviso, ocupação por tanques, colisão de cascos e projéteis, destruição parcial, espelhamento, expiração, término do encontro e um bot que atravessa a barreira ativa e causa dano ao Cartógrafo. A revisão de movimento cobre dois ciclos consecutivos, deslizamento em dois eixos, interrupção por um tanque na rota e saídas livres. Os testes do FFA cobrem a entrada no sorteio de eventos e a remoção da barreira ao encerrar a partida.

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
