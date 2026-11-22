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

Investir pontos e escolher a classe ainda são decisões exploratórias. O relatório mede o combate contra o Guardião.

## Cooperação

A política cooperativa aparece quando o bot usa projéteis e percebe um aliado. A ação é escolhida conforme a situação e o histórico individual de sucessos. Os papéis podem se alternar dentro da partida.

- **Concentrar fogo** experimenta atacar um alvo visível atingido recentemente pelo aliado. Conta quando o próprio tiro também atinge esse alvo. Vale para formas e chefes, inclusive durante a preparação.
- **Cobrir aliado** experimenta interceptar um projétil que vai na direção do colega. Conta quando o tiro destrói a ameaça durante a trajetória prevista.
- **Aproveitar abertura** experimenta atacar o autor da ameaça que está ocupando o aliado. Conta quando o disparo acerta o autor enquanto aquela ameaça segue em direção ao aliado. A previsão aceita balas comuns e projéteis que seguem alvos.

Cada ação conta no máximo um sucesso. O relatório separa tentativas, sucessos e escolhas por experiência. A memória cooperativa tem registros próprios dentro da Dupla Aprendiz e é carregada junto com o histórico de farm e colisões das versões anteriores.

Os três comportamentos foram confirmados em cenários controlados com colisões reais. Uma bala comum serviu nos testes de cobertura e abertura. Após três sucessos no cenário de fogo conjunto, a mesma situação acionou a escolha pela experiência. Ao retirar só a memória cooperativa, aquela escolha deixou de ocorrer.

Em seis partidas livres de avaliação (7102, 7103, 4231, 9731, 777 e 1050), as duas versões tinham a mesma memória congelada de farm e colisões. Com a memória cooperativa vazia, houve 10 sucessos em 22 tentativas de fogo conjunto. Com experiência das seeds de treino 9, 23, 42, 169, 384 e 440, houve 41 em 64 tentativas, com 61 escolhas por experiência. A dupla experiente tentou cobertura cinco vezes sem interceptação e nenhuma das duplas registrou tentativa de aproveitar abertura nessa amostra. Cobertura e abertura precisam de mais exemplos espontâneos na arena.

## Comparação controlada

Os dois grupos passaram pelas seeds de treino 9, 23, 42, 169, 384 e 440. Ambos tinham aprendizado de farm. A diferença foi incluir ou excluir o custo de contato na escolha. Nas avaliações, a memória ficou congelada e as condições iniciais foram iguais para cada par. Todas as duplas chegaram aos 90 segundos nesses dois grupos de seeds.

| Seeds de avaliação | HP perdido por contato, antes → depois | XP total, antes → depois | Escolhas alteradas pelo histórico de contato |
| --- | ---: | ---: | ---: |
| 7102, 7103, 4231, 9731, 777, 1050 | 883,8 → 260,6 | 9.660 → 9.420 | 15 |
| 1234, 1928, 8008, 6144, 9087, 3129 | 705,6 → 271,1 | 8.425 → 10.090 | 31 |

Nos dois grupos, a dupla com aprendizado de colisão perdeu menos vida de contato no total. O XP variou por seed. O primeiro grupo também integra a suíte Node como regressão, em cenário de preparação com a cooperação desativada para isolar o custo de contato.

## Próximas etapas

1. Criar mais situações de combate em que os aliados consigam observar ameaças e atribuir a ação que deu início a uma abertura. Usar esses encontros para medir cobertura, atração de ameaças e esquiva.
2. Comparar o aprendizado de uma dupla com o de um bot sozinho e o de três aliados. Testar uma arena de treino com zona aberta e abrigo de duas saídas.
3. Desenvolver o Sucateiro em uma etapa de chefe independente. Começar no Laboratório e validar sua entrada no sorteio de eventos do FFA e nas outras rotações que já aceitam chefes. Verificar as regras próprias de chefes do Survival antes de definir se o encontro entra ali.

## Teste local

Na raiz do repositório, execute:

```sh
node --test tests/dupla-aprendiz.test.js
node tests/serve-3c-fixture.js 8772
```

Abra o [jogo local](http://127.0.0.1:8772/index.html) e entre no Laboratório. Repita uma seed até o fim de algumas tentativas, confira **Histórico de tentativas**, feche a aba e reabra o mesmo endereço para conferir a memória.
