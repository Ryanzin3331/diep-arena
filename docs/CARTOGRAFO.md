# Cartógrafo

No **Laboratório**, selecione **Cartógrafo** em **Chefe do desafio** e clique em **Invocar Cartógrafo**. O desenho em Canvas usa um hexágono azul-acinzentado, contorno escuro e dois canhões cinza. A silhueta usa formas chapadas, como as referências, e preserva a grade e a barra de vida do simulador. O desenho e a mecânica da barreira são originais do Diep Arena. [Guardian](https://diepio.fandom.com/wiki/Guardian) · [Fallen Booster](https://diepio.fandom.com/wiki/Fallen_Booster)

## Barreira

- O contorno tracejado avisa 1,5 s antes de subir. A abertura tem 150 unidades e também dá para contornar as extremidades. Se um casco ocupar o traçado, o chefe adia a construção por até um segundo e cancela o ciclo se o espaço continuar ocupado.
- Paredes e pilares bloqueiam cascos e projéteis. Cada pilar tem 135 HP. Destruí-lo com tiros derruba o trecho que ele sustenta. A sobra expira depois de sete segundos e é removida quando o encontro acaba.
- O Cartógrafo tem 1.350 HP e usa projéteis comuns. A próxima barreira avisada abaixo de 675 HP espelha a abertura da esquerda para a direita.
- Os bots aproveitam as passagens e podem atirar num pilar acessível enquanto se deslocam. A rota é mantida em cache por até 0,65 s. A destruição de um trecho invalida o cache do traçado.

## Teste jogável

Na raiz do repositório, execute:

```sh
node tests/generate-cartographer-fixture.js
node tests/serve-3c-fixture.js 8770
```

Abra o [cenário local](http://127.0.0.1:8770/cartografo-fixture.html). Você começa pausado como Destroyer nível 45, perto do chefe, com um bot aliado. Aperte **P** para começar. Use **WASD** para mover, o **mouse** para mirar e **clique esquerdo** ou **Espaço** para disparar. Observe o tracejado, mire no quadrado para derrubar seu trecho e atravesse a passagem. Depois de baixar a vida do chefe à metade, aguarde o próximo ciclo para ver o lado da abertura mudar.

A seleção do Laboratório e o cenário jogável foram conferidos no Chromium. A silhueta, a grade, o aviso e a passagem ficaram legíveis com zoom afastado e em viewport de 390 px. Nessa viewport, tiros manuais derrubaram um pilar e reduziram a vida do chefe abaixo de 50%. O Destroyer atravessou a segunda abertura com a barreira ativa.

As regressões Node cobrem aviso, ocupação por tanques, colisão de cascos e projéteis, destruição parcial, espelhamento, expiração, término do encontro e um bot que atravessa a barreira ativa e causa dano ao Cartógrafo. A rotação de chefes do FFA segue com o mesmo catálogo.
