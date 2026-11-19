# Incremento 1D-A — desenho proposto, ainda não implementado

**Estado:** apenas investigação e proposta. O jogo continua usando o armazenamento 1C; ele não oferece as garantias transacionais descritas abaixo. Não usar este documento como evidência de segurança ou conclusão do incremento.

## Problema confirmado

O 1C guarda perfis em chaves independentes de `localStorage`. Uma sessão que leu uma chave ausente mantém `null` como valor esperado: remover essa chave não altera essa comparação e, posteriormente, o snapshot da sessão pode recriá-la. Uma substituição de vários perfis também não pode ser tornada atômica apenas com chamadas individuais de `setItem`/`removeItem`, especialmente se a quota falhar durante a operação ou a reversão.

## Proposta a implementar

Usar IndexedDB com dois object stores: `profiles` (chave `profileId`, snapshot validado e revisão) e `metadata` (geração e estado de migração). A exclusão ou substituição integral deve incrementar a geração e alterar todos os perfis na **mesma transação readwrite**, incluindo ambos os stores. Se a operação falhar ou for abortada, nenhum dos efeitos deve ser publicado.

Uma sessão de arena deve capturar a geração durante sua carga inicial. Cada salvamento deve comparar essa geração dentro da mesma transação readwrite que realiza as gravações. Se for diferente, a sessão deve falhar permanentemente: não atualizar sua geração, inclusive em `pagehide` e `restart`. Para evitar sobrescrita por outra sessão da mesma geração, verificar também a revisão de cada perfil dentro dessa transação. Resultados das transações devem ser considerados efetivos somente no evento `complete`.

O codec 1A deve validar todos os perfis e limites antes de iniciar uma substituição. A exportação deve usar uma transação readonly e não alterar dados. Nenhuma interface de importação, exclusão ou ativação faz parte desta proposta.

## Integração e migração pendentes

A abertura do banco e a carga dos perfis são assíncronas. A criação de uma arena elegível deve aguardar seu snapshot antes de chamar o construtor e `spendBot`. A transição deve ter um identificador monotônico de solicitação: se o usuário trocar de modo ou reiniciar enquanto uma carga estiver pendente, sua resposta não pode instalar uma arena obsoleta. Os snapshots da arena anterior devem ser ordenados antes da leitura da próxima arena; `pagehide` deve ser apenas tentativa adicional, pois a conclusão assíncrona não é garantida ao fechar a página. Quando IndexedDB falhar ou estiver indisponível, prosseguir sem persistência e disponibilizar à futura interface um estado de erro.

A migração proposta deve validar os registros v1 antes de copiá-los; publicar perfis e um marcador de migração na mesma transação IndexedDB, sem apagar automaticamente o legado. Uma vez marcado como concluído ou bloqueado por uma operação explícita de exclusão/substituição, o legado não deve voltar a ser importado automaticamente, mesmo que uma versão antiga do jogo continue gravando no `localStorage`. A política de registros legados inválidos e de recuperação de uma migração interrompida ainda precisa de implementação e testes.

## Verificações realizadas e pendentes

- Na base `6fcf166d0ba86567f52e9dc4ff5c06ba329eb3b7`, `node --test tests/*.test.js` passou 26 testes. Esses testes cobrem o 1C, não a proposta IndexedDB.
- Uma página de teste local executou uma transação IndexedDB básica no Chrome headless. Isso confirma apenas a disponibilidade dessa API no ambiente de teste; não valida atomicidade do projeto, concorrência, migração ou compatibilidade com outros navegadores.
- Permanecem a implementação e testes de duas conexões, diferentes ordens de transação, abortos, quota, importação integral, exclusão, invalidação de sessões vazias e antigas, `pagehide`, migração e transições assíncronas. Os testes existentes devem continuar passando após a integração.

