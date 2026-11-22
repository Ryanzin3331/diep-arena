# Sucateiro

Em **Laboratório → Chefe do desafio**, selecione **Sucateiro** e clique em **Invocar Sucateiro**. Para vê-lo numa partida normal de FFA, 2 Teams ou 4 Teams, ative o agendamento de chefes e **Bosses de evento** antes de reiniciar.

O Sucateiro patrulha o ninho, atrai polígonos comuns próximos e gira o estoque ao redor do casco. A peça acelera e desacelera durante a captura até acompanhar a órbita, em cerca de 0,52 s para as formas pequenas, 0,60 s para os pentágonos e 0,82 s para o alfa. As peças absorvem tiros e continuam sujeitas às colisões da arena. Um arremesso tira a peça da órbita, e o chefe espera 1,2 s antes de voltar a coletar.

Na fase 1, o chefe para e marca a trajetória com um tracejado. Destruir a peça destacada cancela esse ataque. Nas fases 2 e 3, o chefe segue em movimento e arremessa sem aviso. Com dois atacantes e duas peças elegíveis, lança uma em cada alvo. Os dois canhões alternam tiros de 7 de dano nominal a cada 0,88 s quando alinhados. Há um intervalo mínimo de 0,3 s após um arremesso para o próximo tiro de canhão.

Na fase 3, os polígonos saem 12% mais rápidos. A direção curva nos primeiros 0,62 s e então segue em linha reta. A trajetória é definida no lançamento e o alfa faz uma curva mais aberta.

| Fase | Entrada | Capacidade por peso | Tipos de peça disponíveis |
| --- | ---: | ---: | --- |
| Coleta | 100% | 6 | Quadrado e triângulo |
| Escudo carregado | 70% | 9 | Também pentágonos azuis |
| Sobrecarga | 35% | 12 | Também um pentágono alfa |

| Peça | Peso | Máximo por tipo | Dano nominal | Velocidade base em unidades/s |
| --- | ---: | ---: | ---: | ---: |
| Quadrado | 1 | 6 | 8 | 250 |
| Triângulo | 1 | 6 | 11 | 420 |
| Pentágono azul | 2 | 3 | 17 | 300 |
| Pentágono alfa | 5 | 1 | 28 | 205 |

O aviso da fase 1 dura 0,75 s. O dano efetivo segue as regras de colisão e resistência do jogo. O chefe começa com 2.100 HP, tem recarga de 3 s e concede 30.000 XP pelo golpe final. O alfa tem até 240 HP enquanto estiver em órbita e rende XP proporcional se for destruído nesse estado. Vencer o chefe solta as peças que sobraram, preservando o dano recebido antes e durante a órbita.

## Visual no Montador de Chefes

O bloco `SUCATEIRO_VISUAL` em `index.html` contém o preset exportável de versão 2. O jogo usa o formato, o tamanho, as cores e os contornos do casco, as peças com suas posições e rotação e a aparência da órbita de cada fase. Para enviar um visual novo, use **Exportar JSON** no montador. O campo `qty` controla a quantidade da prévia, enquanto `limit` e `capacity` controlam quanto o chefe pode coletar na arena. O campo `aim` é a direção de demonstração no painel. O alvo no jogo é escolhido durante a luta.

## Verificação local

```sh
node --test tests/sucateiro.test.js
node tests/serve-3c-fixture.js 8772
```

Abra [o jogo local](http://127.0.0.1:8772/index.html) e invoque o chefe pelo Laboratório. Para observar o escudo em cada fase, comece com dois tanques de nível 45 e acompanhe a troca de faixa na barra de vida.
