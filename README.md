# Diep Arena

Diep Arena é um simulador de batalhas de tanques inspirado em Diep.io. Você pode acompanhar partidas entre bots, evoluir seu próprio tanque ou criar uma sala para jogar com um amigo. O jogo roda no navegador, no PC e no celular.

**[Jogar Diep Arena](https://ryanzin3331.github.io/diep-arena/)**

[![Partida FFA do Diep Arena com a câmera livre, minimapa e placar dos bots](docs/images/arena-ffa.jpg)](https://ryanzin3331.github.io/diep-arena/)

## Modos de jogo

| Modo | O que dá pra fazer |
| --- | --- |
| **Assistir** | Siga um bot pelo placar, veja o líder, acompanhe a ação ou use a câmera livre. Dá para pausar, acelerar e rever destaques no histórico. |
| **Jogar** | Comece no nível 1, destrua formas para ganhar XP, distribua pontos entre oito atributos e escolha sua classe conforme avança. |
| **Laboratório** | Escolha as classes dos bots e monte um duelo ou um desafio contra um chefe para testar como eles se enfrentam. |
| **Multiplayer** | Crie uma sala com código para 2, 3 ou 4 jogadores, com 0, 4 ou 8 bots na arena aberta. |

Em **Configurar**, escolha o cenário da próxima partida. Além do FFA aberto, há **2 Teams, 4 Teams, Dominação, Mothership, Tag, Survival, Comboio e Maze**. O Maze tem uma versão fixa e outra gerada por seed. Os bots escolhem rotas de evolução e podem ajustar seus atributos e táticas durante a simulação.

O [Cartógrafo](docs/CARTOGRAFO.md) pode ser invocado no Laboratório e entra no sorteio do FFA aberto com **Bosses de evento** ligados. O [Sucateiro](docs/SUCATEIRO.md) também pode ser invocado no Laboratório e participa da rotação de eventos do FFA, do 2 Teams e do 4 Teams.

No **Laboratório → Configurar → Importar chefe JSON**, abra o projeto exportado pelo Montador de Chefes, escolha as classes e o nível dos dois tanques e clique em **Invocar**. O desafio usa o visual, as fases e os comportamentos ativos no arquivo. Os projetos antigos usam 1.400 HP, 22 de dano de contato base e o tamanho da fase como raio de colisão. Para ajustar esses valores, use **Atributos de combate** no Montador. O arquivo importado fica disponível no seletor enquanto a página estiver aberta.

Na [Dupla Aprendiz](docs/DUPLA-APRENDIZ.md), dois bots começam no nível 1, aprendem com o farm e enfrentam o Guardião dos Pentágonos no Laboratório.

![Duelo no Laboratório do Diep Arena com dois tanques de nível 45 e suas classes no placar](docs/images/arena-laboratorio.jpg)

## Jogar com amigos

1. Todos abrem o jogo no navegador.
2. Quem vai hospedar toca em **Multiplayer**, escolhe o total de jogadores, incluindo o anfitrião, e o número de bots. Depois cria a sala.
3. Os convidados digitam o código em **Multiplayer → Entrar**. A partida começa quando o total escolhido entra. Todos precisam abrir a mesma versão do jogo.

A opção **Reiniciar ao morrer** define como a rodada funciona. Ligada, a morte de qualquer jogador encerra a rodada e todos recomeçam no nível 1 após quatro segundos. Desligada, a arena continua e cada eliminação entre jogadores vale um ponto no placar da sala. Quem caiu pode renascer.

Se um convidado sair de uma sala em andamento, a partida continua enquanto houver outro convidado conectado. O teste local com WebRTC e as medições dos convidados estão no [registro de validação do multiplayer](docs/RETOMADA-INTEGRACAO.md#validação-do-multiplayer).

## Classes

Consulte o [guia de classes](docs/CLASSES.md) para ver os níveis, as rotas de evolução e como testar o Hunter localmente.

## Controles

| Ação | PC | Celular |
| --- | --- | --- |
| Mover | WASD ou setas | Arraste no lado esquerdo da arena |
| Mirar e atirar | Mouse para mirar, clique esquerdo ou Espaço para atirar | Arraste no lado direito |
| Tiro automático | E | **Auto** |
| Ação secundária da classe | Shift ou clique direito | **Secundário**, quando disponível |
| Gastar pontos | Teclas 1–8 ou painel de melhorias | **Melhorias** |

Em tela cheia, toque em **Top 10** para abrir ou recolher o placar. No celular, dá para fazer isso com outro dedo enquanto continua movendo ou mirando.

## Rodar a partir do código

Abra [`index.html`](index.html) em um navegador ou sirva a pasta do projeto como um site estático. O jogo e o simulador estão em um único arquivo HTML com JavaScript e Canvas 2D. O multiplayer carrega o PeerJS e precisa de conexão de rede.

Projeto de **Ryanzin3331**, desenvolvido com auxílio de IA.
