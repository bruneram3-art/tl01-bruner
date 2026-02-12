# Documento de Requisitos do Produto (PRD) - Industrial Predictor Pro

## 1. Visão Geral
O **Industrial Predictor Pro** é uma aplicação web desenvolvida para monitoramento, análise e previsão de métricas de produção industrial (PCP). O sistema visa centralizar dados operacionais complexos importados de planilhas Excel, automatizar cálculos de indicadores chave de desempenho (KPIs) como produção, rendimento, consumo de energia/gás e produtividade, além de fornecer ferramentas robustas para simulação de cenários e fechamento mensal.

## 2. Objetivos
- **Centralização:** Consolidar dados dispersos de produção e metas em uma única plataforma visual.
- **Automação:** Eliminar cálculos manuais propensos a erros para indicadores críticos (Rendimento, Consumo Específico).
- **Previsibilidade:** Fornecer previsões precisas de fechamento de mês baseadas no ritmo atual e ordens planejadas.
- **Tomada de Decisão:** Permitir simulações rápidas de cenários (ex: alteração de dias úteis, eficiência) para avaliar impactos financeiros e operacionais.

## 3. Público-Alvo
- **Gerentes de Produção:** Monitoramento macro de metas e resultados financeiros.
- **Analistas de PCP:** Detalhamento de ordens, validação de dados e planejamento.
- **Engenheiros de Processo:** Análise de desvios de consumo e produtividade técnica.

## 4. Funcionalidades Principais

### 4.1. Importação e Tratamento de Dados
- **Upload de PCP (Excel):** Importação de planilhas contendo dados diários (Ordens de Produção, Datas, Quantidades, Setups, Tempos).
  - Suporte a múltiplas abas e detecção automática de cabeçalhos.
  - Conversão inteligente de datas e tratamento de células mescladas/formatadas.
- **Upload de Metas (Excel):** Importação de metas específicas por código SAP ou grupo de Bitolas (Gás, Energia, Rendimento Alvo).
- **Validação de Dados:** Identificação automática de códigos sem meta cadastrada ("Missing SAPs") e alertas de inconsistência.

### 4.2. Dashboard Interativo
- **Cards de Métricas (KPIs):** Exibição em tempo real de:
  - Produção Total Acumulada (t).
  - Consumo Específico Médio de Gás (m³/t) e Energia (kWh/t).
  - Rendimento Médio (%).
  - Produtividade Média (t/h).
  - Tempo Total de Setup (horas).
  - Custo Extra Estimado (R$) baseado no desvio de metas.
- **Gráficos Dinâmicos:**
  - Evolução temporal da Produção Diária vs Meta.
  - Acompanhamento de Consumo Específico ao longo do mês.
- **Comparativo Visual:** Indicadores coloridos (Verde/Vermelho) para metas atingidas ou não.

### 4.3. Previsão e Simulação
- **Forecast Híbrido:** Projeção automática do fechamento do mês, combinando produção realizada + ordens planejadas importadas.
- **Simulador de Cenários:** Interface dedicada para ajustar variáveis como:
  - Dias úteis restantes.
  - Eficiência esperada (%).
  - Ritmo de produção diária.
  - Ver o impacto imediato no resultado final esperado.
- **Gestão de Custos:** Configuração editável dos custos unitários de insumos (Gás, Energia, Material) para cálculo preciso de desperdícios financeiros.

### 4.4. Gestão de Dados (Supabase)
- **Persistência de Metas:** Armazenamento seguro das metas de consumo e rendimento no Supabase.
- **Atualização em Lote:** Funcionalidade de "Upsert" para atualizar metas existentes ou criar novas via upload de planilha.

### 4.5. Funcionalidades Auxiliares
- **Recorte Temporal:** Filtro por data de corte para análise parcial do mês.
- **Exportação:** Geração de relatórios (PDF/Imagem) do painel atual (via `html2canvas` / `jspdf`).
- **Comparador:** Modo de comparação para avaliar diferentes versões de planos de produção.

## 5. Requisitos Não Funcionais
- **Performance:** Processamento eficiente de planilhas com milhares de linhas no frontend (client-side).
- **Usabilidade:** Interface moderna e responsiva utilizando Design System (Glassmorphism, Tailwind CSS).
- **Confiabilidade:** Robustez na leitura de arquivos Excel com formatações variadas.
- **Segurança:** Integração segura com Backend (Supabase) via variáveis de ambiente.

## 6. Stack Tecnológico
- **Frontend:** React 18+, Vite, TypeScript.
- **Estilização:** Tailwind CSS, Lucide React (Ícones).
- **Visualização de Dados:** Recharts.
- **Manipulação de Arquivos:** SheetJS (xlsx).
- **Backend as a Service:** Supabase (PostgreSQL).
- **Testes:** TestSprite (Integração/Unitário).

## 7. Estrutura de Dados (Interfaces Chave)
### PCPData
Representa uma linha de dados de produção importada.
- `data`: Data da produção.
- `producao`: Quantidade produzida (t).
- `setup`: Tempo de setup (min/h).
- `sap`: Código do material.
- `...` (outros campos variáveis).

### MetaData
Representa a meta associada a um produto.
- `sap` / `bitola`: Chave de identificação.
- `gas`: Meta de consumo de gás (m³/t).
- `energia`: Meta de consumo de energia (kWh/t).
- `rm`: Rendimento Meta (%).
