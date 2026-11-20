# Retomada 4A — checkpoint WIP

Base do PR #7: `35d6d2d917dce00af424e664ed8ca348f1fee8eb`. O jogo de produção não foi alterado. `tests/measure-4a.js` tem alterações locais de instrumentação: propostas e aberturas separadas, mudança aplicada apenas quando abre no mesmo tick, primeira e segunda evidências por slot, avaliações de tentativas, classes observadas e emissões. A implementação ainda precisa de auditoria: as classes usam os critérios declarados no medidor e as emissões são contadas nos pontos instrumentados de disparo e conversão; conferir cobertura de todos os tipos e se o contador de propostas corresponde ao significado desejado. Não tratar os zeros como conclusão final antes dessa auditoria.

## O que passou

- Cenário preparado Pixel: `$env:PREPARED='1'; $env:SEED='7104'; $env:TICKS='1000'; node tests/measure-4a.js` registrou no tick 901, slot 0, enxame, escolha 0 e contrafactual 1, com mudança aplicada; hash sem/com registro coincidiu. Resultado: `docs/resultados/4a-validacao-pixel.json`.
- Uma execução curta de 10 ticks do medidor passou antes da última mudança de instrumentação. `node --test tests/experiment-4a.test.js` passou antes da última mudança do medidor. A suíte completa não foi executada para este WIP.

## Condições longas concluídas

Arquivos `docs/resultados/4a-longo-*.json` contendo 10800 ticks foram concluídos para FFA 7102 A/B, FFA 7103 A/B e Maze 7102 A/B. Todos verificaram igualdade de hash entre execução sem e com registro. Nesses seis arquivos os contadores atuais de emissões, primeira e segunda evidências e aberturas são zero para ambas ameaças; interpretar sujeito à auditoria de cobertura acima. A condição Maze 7103 A estava em andamento quando foi interrompida e não produziu arquivo; seu resultado é parcial e deve ser refeito. Maze 7103 B ainda não foi iniciado. Os arquivos `4a-open-*` e `4a-maze-*` anteriores são os ensaios de 2400 ticks, não resultados longos.

## Próximo comando — PowerShell, na raiz do repositório

```powershell
$env:PREPARED='0'; $env:TICKS='10800'; $env:MAP='maze'; $env:SEED='7103'
foreach ($variant in 'A','B') {
  $env:VARIANT=$variant
  node tests/measure-4a.js | Set-Content "docs/resultados/4a-longo-maze-7103-$variant.json" -Encoding utf8
  if ($LASTEXITCODE -ne 0) { throw "Falhou Maze 7103 $variant" }
}
```

Após completar, auditar instrumentação e resultados, rodar `node --test tests/*.test.js`, registrar resultados por seed e atualizar o PR #7 mantendo-o em rascunho. Não foi publicado resultado final do experimento longo.
