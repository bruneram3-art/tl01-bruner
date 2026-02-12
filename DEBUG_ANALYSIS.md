# Análise de Debug - Metas não carregando

## Problema
As colunas "Meta Gás" e "Meta Energia" aparecem vazias no dashboard, indicando que o matching entre PCP e Metas não está funcionando.

## Possíveis Causas

### 1. Metas não foram carregadas do Supabase
- O arquivo Excel de Metas nunca foi importado
- Houve erro no Supabase ao salvar
- A tabela `metas_producao` não existe ou está vazia

### 2. Incompatibilidade de Estrutura de Dados
- As colunas SAP no Excel de Metas têm nome diferente do esperado
- As colunas Gas/Energia têm nomes diferentes
- Formato dos dados (texto vs número, zeros à esquerda)

### 3. Lógica de Matching Incorreta
- As chaves que estamos usando não batem (SAP vs Bitola)
- Problema de case-sensitivity (maiúsculas/minúsculas)
- Problema de espaços ou caracteres especiais

## Plano de Ação

1. **Verificar se há dados no Supabase**
   - Abrir console (F12) e verificar se `getMetasFromSupabase()` retorna dados
   - Ver quantas linhas de metas foram carregadas

2. **Analisar estrutura do arquivo Excel de Metas**
   - Verificar nomes das colunas
   - Verificar formato dos valores (SAP, Gás, Energia)

3. **Comparar chaves SAP/Bitola entre PCP e Metas**
   - Ver exemplos concretos de valores em cada lado
   - Identificar padrão de diferença

## Próximos Passos
Vamos adicionar logs de diagnóstico intensivos no código para capturar essas informações.
