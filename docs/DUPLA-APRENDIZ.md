# Dupla Aprendiz

Abra **Laboratório**, vá em **Configurar** e clique em **Iniciar Dupla Aprendiz**. A dupla começa como dois Tanks nível 1 com atributos vazios. O placar mostra o nível, a classe, o XP e os acertos que entraram no aprendizado de cada bot. Clique num tanque do placar para ver a ação atual e se ela veio de exploração ou da experiência.

O Guardião aparece depois de 90 segundos se pelo menos um tanque sobreviver. A luta tem até 60 segundos. O Guardião deste modo tem 540 HP, pode atacar tanques abaixo do nível 15 e usa até sete drones. Cada tanque tem uma vida.

**Repetir treino** usa a mesma seed e conserva a memória dos dois bots. **Zerar dupla** inicia de novo com as duas memórias vazias. A memória dura enquanto a página está aberta. Para testar outra seed com a mesma dupla, mude **Seed** e inicie o modo de novo nas configurações.

## O que os bots aprendem

A IA especial observa objetos próximos e pode experimentar comandos de movimento e disparo em relação aos alvos visíveis. Nenhuma ação começa com vantagem por classe ou por tipo de objeto. Durante a preparação, o projétil carrega a referência à ação que o disparou. Acertar formas aumenta a pontuação dessa ação, com um bônus pela destruição. Os bots tendem a repetir as ações que renderam mais por tentativa em distâncias parecidas, mas seguem experimentando.

Cada bot tem seu próprio histórico. Investir pontos e escolher a classe ainda são decisões exploratórias entre as opções permitidas. Durante o encontro, os bots usam o que aprenderam na preparação, sem receber pontuação para aprender esquiva de drones, combate de chefe ou coordenação em dupla.

## Comparação controlada

Na preparação, a equipe treinada passou pelas seeds 9, 23, 42, 169, 384 e 440. A avaliação congelou as duas memórias, usou as mesmas condições iniciais de arena em cada par e comparou a equipe treinada com uma sem experiência. Se os dois tanques forem eliminados antes dos 90 segundos, conta o XP alcançado até a eliminação.

| Seed de avaliação | XP da dupla novata | XP da dupla treinada |
| --- | ---: | ---: |
| 7102 | 700 | 1.145 |
| 7103 | 240 | 1.050 |
| 4231 | 1.785 | 2.100 |
| 9731 | 425 | 2.175 |
| 777 | 645 | 1.675 |
| 1050 | 485 | 1.515 |
| **Total** | **4.280** | **9.660** |

A treinada chegou ao chefe nas seis seeds e venceu na 1050. A novata chegou em uma e terminou sem vitória. Essa amostra mede principalmente a preparação. O XP a mais e as classes alcançadas também afetam a luta.

Na raiz do repositório, execute:

```sh
node --test tests/dupla-aprendiz.test.js
node tests/serve-3c-fixture.js 8772
```

Abra o [jogo local](http://127.0.0.1:8772/index.html) no navegador e entre no Laboratório.
