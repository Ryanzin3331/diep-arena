# IA evolutiva — Fase 1: memória individual entre arenas

**Estado:** especificação inicial, sem alteração de comportamento do jogo.  
**Escopo da primeira implementação:** persistir apenas conhecimento tático confiável de bots, sem adicionar ainda descoberta de classes, novas táticas ou inteligência geral artificial.

## Situação confirmada no código

O `index.html` já implementa:
- `newMemory(adaptiveBuilds)` com `foes` e `classes` (Maps), amostras, mudanças táticas e sinais de build.
- `recordOutcome`, `observeHit`, `combatTactic`, `assessApproach` e `adaptiveStat`: aprendizado tático durante a partida.
- `MEMORY_TTL = 115` segundos, usado para experiências de combate; não deve invalidar todo o conhecimento acumulado entre arenas.
- `spawnTank(...)` atribui `newMemory(...)` a bots elegíveis. Bots mortos reaparecem por meio de outro `spawnTank`, então hoje a memória não acompanha automaticamente o renascimento.
- `restart()` cria `new Arena(...)` e reinicia a arena.
- `localStorage` já é usado para a preferência de modo leve.

## Comportamento decidido

1. **Opção «Usar memória da partida/arena anterior»**, aplicada à próxima partida:
   - **Ligada:** carregar perfis salvos, preservando conhecimento consolidado e permitindo continuar aprendendo.
   - **Desligada:** iniciar cada bot com memória de aprendizado zerada, **sem apagar** os perfis armazenados; esta arena não deve sobrescrever o arquivo de perfis anterior.
   - **Apagar memórias permanentemente:** ação separada, com confirmação explícita e sem apagamento acidental ao alternar opções.
2. **Morte e renascimento dentro da mesma arena:** o bot mantém conhecimento tático individual; não carrega estados transitórios como alvo atual, cronômetros e evasão em execução.
3. **Reinício e mudança de modo:** o botão Reiniciar deve fazer snapshot da arena anterior antes de substituí-la, quando a persistência estiver ativada. Ao abandonar uma arena para entrar em outra, a origem da memória deve estar definida, evitando sobrescrever um snapshot novo com outro antigo.
4. **Multiplayer:** host é a autoridade pelas decisões e pelo armazenamento; o cliente não grava estados dos bots. Não transmitir perfis individuais completos pela rede.
5. **Falhas do armazenamento:** se estiver bloqueado ou cheio, continuar jogando sem travar; mostrar aviso não intrusivo. Nunca considerar uma gravação como bem-sucedida sem ter recebido sucesso do armazenamento.
6. **Exportação/importação:** JSON versionado e validado; exportar para backup antes de excluir, importar com prévia/confirmar substituição. Limitar tamanho, quantidade de bots, entradas por classe e números para evitar payloads inválidos.

## Identidade dos bots

`t.id` é um identificador transitório de entidade e não serve para persistência. A primeira implementação deve associar **um slot persistente do elenco** (`profileId`) ao bot, preservado ao renascer. O nome e a classe **não** são identificadores: podem mudar sem alterar a memória do mesmo bot.

Como FFA, Laboratório e multiplayer têm elencos e regras diferentes, sugerido:
- FFA / Arena aberta / Maze: elenco por modo ou grupo estável de `profileId`s.
- Laboratório: perfis separados de `A` e `B`, para não contaminar o histórico do FFA.
- Modos em equipes / objetivos: definir política explícita antes de habilitar continuidade.
- Multiplayer: começar com persistência desligada, até validar host, reconexão e separação de salas.

**Não mudar a escolha de classe apenas por um histórico favorável nesta fase.** A diversidade de evoluções deve ser preservada.

## Modelo de dados recomendado (v1)

Exemplo ilustrativo (não contrato final de código):

```json
{
  "schemaVersion": 1,
  "savedAt": "2026-11-18T00:00:00Z",
  "rosters": {
    "ffa": {
      "bot:0": {
        "experience": {"samples": 0, "escapes": 0, "changes": 0},
        "matchups": {
          "Tank|Necromancer": {
            "entries": [
              {"sum": 0, "weight": 0, "hits": 0},
              {"sum": 0, "weight": 0, "hits": 0},
              {"sum": 0, "weight": 0, "hits": 0}
            ],
            "choice": 0
          }
        }
      }
    }
  }
}
```

Persistir somente **conhecimento duradouro**: evidências agregadas por classe enfrentada, experiência acumulada, eventualmente preferências individuais de exploração na Fase 2. Não persistir `foes` indexado por `e.id`, alvos, `retreat`, `approach`, `build.pressure`, `until`, `enemy`, `combatAim`, HP ou entidades ligadas à arena antiga.

Ao reidratar, converter os registros para `Map` e inicializar estado temporário fresco por `newMemory`. Normalizar/clamp números e rejeitar chaves de classes desconhecidas, dados não finitos e versões futuras.

### Atenção ao tempo tático

O `MEMORY_TTL` atual compara `time` da arena, que volta a zero após `restart()`. **Não copiar timestamp antigo para uma arena nova**. Fazer transformação explícita de conhecimento consolidado para contexto da nova arena e limitar confiança herdada. A memória persistente pode guardar pesos agregados, mas o decaimento de curto prazo continuará ligado ao relógio da partida corrente.

## Sequência de implementação recomendada

1. Isolar funções puras `serializeMemory`, `deserializeMemory`, `validateMemorySnapshot` e `mergeArenaKnowledge`.
2. Garantir `profileId` estável e retenção após renascimento.
3. Testar persistência apenas no FFA e no Laboratório.
4. Adicionar opção na configuração, status de memória salva, botão exportar, importar e apagar com confirmação.
5. Conectar aos pontos de transição: reinício, fim, saída, fechamento de aba; `pagehide` apenas como salvaguarda, não como caminho único.
6. Estender aos demais modos somente após testes de isolamento de perfis e multiplayer.

## Testes de aceitação (obrigatórios antes de merge)

- **Paridade desligado:** com aprendizado persistente desligado, o gameplay deve continuar equivalente à IA existente (com seeds fixas), salvo correção explícita de bug.
- **Primeiro uso:** sem armazenamento prévio, bots começam com memória vazia.
- **Reuso ligado:** resultado registrado na Arena 1 é recuperado na Arena 2 para o mesmo `profileId`.
- **Reuso desligado:** Arena 2 começa vazia e **não modifica** memória salva da Arena 1.
- **Voltar a ligar:** a memória original ainda é recuperável, salvo se excluída explicitamente.
- **Excluir:** confirmação obrigatória, perfis zerados; backup anterior exportado permanece importável.
- **Renascer:** aprendizagem duradoura preservada, estados transitórios e refs de entidades descartados.
- **Timestamp:** depois de reiniciar, as táticas não ficam artificialmente válidas/inválidas devido ao relógio de outra arena.
- **Importação:** rejeitar JSON corrompido, valores NaN/infinitos, esquema incompatível, mapas gigantes, nomes estranhos e chaves de classe inexistentes.
- **Storage:** quota excedida, modo privado e indisponibilidade não interrompem a partida.
- **Regressão:** FFA 36 bots, Maze, Lab A/B, modos em equipe e multiplayer host/guest, inclusive dispositivo móvel e modo leve.
- **Medição:** comparar FPS/tempo por tick e memória em 36 bots antes e depois; sem gravar no `localStorage` a cada tick.

## Critério de aceite da Fase 1

O comportamento deve ser **reversível e seguro** antes de ser sofisticado. Persistência correta e isolamento de memória vêm antes de atribuir níveis de inteligência ou ensinar propriedades de classes.

**Fases seguintes:**
- Fase 2: observação e descoberta gradual de classes (sem conhecimento perfeito do Necromancer, Destroyer etc.).
- Fase 3: aprendizado contextual de estratégias com exploração controlada.
- Fase 4: painel de evolução, métricas e experimentos A/B por seed.

Este documento não afirma que essas fases já foram programadas.
