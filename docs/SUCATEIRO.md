# Sucateiro

Em **Laboratório → Chefe do desafio**, selecione **Sucateiro** e clique em **Invocar Sucateiro**. Para vê-lo numa partida normal de FFA, 2 Teams ou 4 Teams, ative o agendamento de chefes e **Bosses de evento** antes de reiniciar.

O Sucateiro patrulha o ninho, atrai polígonos comuns próximos e gira o estoque ao redor do casco. As peças absorvem tiros e continuam sujeitas às colisões da arena. Quando escolhe uma peça para arremessar, ele para, congela a peça e marca a trajetória com um tracejado. A peça pode ser destruída durante o aviso. Um arremesso bem-sucedido tira a peça da órbita, e o chefe espera 1,2 s antes de voltar a coletar.

| Fase | Entrada | Capacidade por peso | Tipos de peça disponíveis |
| --- | ---: | ---: | --- |
| Coleta | 100% | 6 | Quadrado e triângulo |
| Escudo carregado | 70% | 9 | Também pentágonos azuis |
| Sobrecarga | 35% | 12 | Também um pentágono alfa |

| Peça | Peso | Máximo por tipo | Dano nominal | Velocidade em unidades/s | Aviso |
| --- | ---: | ---: | ---: | ---: | ---: |
| Quadrado | 1 | 6 | 8 | 250 | 0,75 s |
| Triângulo | 1 | 6 | 11 | 420 | 0,75 s |
| Pentágono azul | 2 | 3 | 17 | 300 | 0,93 s |
| Pentágono alfa | 5 | 1 | 28 | 205 | 1,20 s |

O dano efetivo segue as regras de colisão e resistência do jogo. O chefe começa com 2.100 HP, tem recarga de 3 s e concede 30.000 XP pelo golpe final. O alfa tem até 240 HP enquanto estiver em órbita e rende XP proporcional se for destruído nesse estado. Vencer o chefe solta as peças que sobraram, preservando o dano recebido antes e durante a órbita.

## Visual no Montador de Chefes

O bloco `SUCATEIRO_VISUAL` em `index.html` contém o preset exportável de versão 2. O jogo usa o formato, o tamanho, as cores e os contornos do casco, as peças com suas posições e rotação e a aparência da órbita de cada fase. Para enviar um visual novo, use **Exportar JSON** no montador. O campo `qty` controla a quantidade da prévia, enquanto `limit` e `capacity` controlam quanto o chefe pode coletar na arena. O campo `aim` é a direção de demonstração no painel. O alvo no jogo é escolhido durante a luta.

## Verificação local

```sh
node --test tests/sucateiro.test.js
node tests/serve-3c-fixture.js 8772
```

Abra [o jogo local](http://127.0.0.1:8772/index.html) e invoque o chefe pelo Laboratório. Para observar o escudo em cada fase, comece com dois tanques de nível 45 e acompanhe a troca de faixa na barra de vida.
