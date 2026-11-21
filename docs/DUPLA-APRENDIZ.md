# Dupla Aprendiz

Abra **Laboratório**, vá em **Configurar** e clique em **Iniciar Dupla Aprendiz**. A dupla começa como dois Tanks nível 1 com atributos vazios. O placar mostra o nível, a classe, o XP e os acertos que entraram no aprendizado de cada bot. Clique num tanque do placar para ver a ação atual e se ela veio de exploração ou da experiência.

O Guardião aparece depois de 90 segundos se pelo menos um tanque sobreviver. A luta tem até 60 segundos. O Guardião deste modo tem 540 HP, pode atacar tanques abaixo do nível 15 e usa até sete drones. Cada tanque tem uma vida.

## Memória e tentativas

**Repetir treino** usa a mesma seed e conserva a experiência dos dois bots. **Zerar dupla** reinicia com as duas memórias e o histórico vazios. Para treinar com outra seed, mude **Seed** e inicie o modo pelas configurações.

A experiência é salva ao fim da preparação, ao encerrar a tentativa e ao sair da arena ou da página. Ela pertence ao endereço do jogo aberto no navegador. Use a mesma porta ao jogar localmente. O modo mostra quando o armazenamento está bloqueado e pode continuar na aba. Se outra aba salvou uma versão nova, a aba desatualizada pede para recarregar antes de salvar.

**Histórico de tentativas** guarda até 30 relatórios. Cada um mostra XP, XP por minuto, nível e classe ao fim da preparação, HP perdido por contato com formas e drones e dano causado ao Guardião. O XP por minuto usa a duração real da preparação da dupla, inclusive quando os dois tanques são derrotados cedo. A primeira e a melhor preparação são comparadas para até 60 seeds distintas.

## O que os bots aprendem

Cada bot tem seu próprio histórico e experimenta comandos de movimento e disparo em relação aos alvos visíveis. Durante a preparação, cada projétil carrega a referência à ação que o disparou. O dano efetivo em formas dá crédito à ação, com bônus pela destruição.

O dano efetivo de contato entra no histórico da ação escolhida no momento da colisão. A penalidade começa após dois contatos registrados naquela ação e faixa de distância. Ela é descontada dos resultados do farm, permitindo comparar rendimento e risco. Quando esse desconto muda a escolha, o relatório registra a ação anterior, a escolhida e a faixa de distância.

Investir pontos e escolher a classe ainda são decisões exploratórias. O relatório mede o combate contra o Guardião. O aprendizado de esquiva de drones e de cooperação é a próxima fase.

## Comparação controlada

Os dois grupos passaram pelas seeds de treino 9, 23, 42, 169, 384 e 440. Ambos tinham aprendizado de farm. A diferença foi incluir ou excluir o custo de contato na escolha. Nas avaliações, a memória ficou congelada e as condições iniciais foram iguais para cada par. Todas as duplas chegaram aos 90 segundos nesses dois grupos de seeds.

| Seeds de avaliação | HP perdido por contato, antes → depois | XP total, antes → depois | Escolhas alteradas pelo histórico de contato |
| --- | ---: | ---: | ---: |
| 7102, 7103, 4231, 9731, 777, 1050 | 883,8 → 260,6 | 9.660 → 9.420 | 15 |
| 1234, 1928, 8008, 6144, 9087, 3129 | 705,6 → 271,1 | 8.425 → 10.090 | 31 |

Nos dois grupos, a dupla com aprendizado de colisão perdeu menos vida de contato no total. O XP variou por seed. O primeiro grupo também integra a suíte Node como regressão.

## Próximas etapas

1. Registrar a perseguição dos drones, a abertura aproveitada por outro bot e o dano que ele causou ao chefe. Usar essas situações para ensinar esquiva e depois cooperação.
2. Comparar o aprendizado de uma dupla com o de um bot sozinho e o de três aliados. Testar uma arena de treino com zona aberta e abrigo de duas saídas.
3. Desenvolver o Sucateiro em uma etapa de chefe independente. Começar no Laboratório e validar sua entrada no sorteio de eventos do FFA e nas outras rotações que já aceitam chefes. Verificar as regras próprias de chefes do Survival antes de definir se o encontro entra ali.

## Teste local

Na raiz do repositório, execute:

```sh
node --test tests/dupla-aprendiz.test.js
node tests/serve-3c-fixture.js 8772
```

Abra o [jogo local](http://127.0.0.1:8772/index.html) e entre no Laboratório. Repita uma seed até o fim de algumas tentativas, confira **Histórico de tentativas**, feche a aba e reabra o mesmo endereço para conferir a memória.
