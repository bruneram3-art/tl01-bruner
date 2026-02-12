# Projeto n8n + AI Agent - ArcelorMittal

Este repositório contém a configuração do servidor n8n local integrado com agentes de IA via MCP (Model Context Protocol).

## 🚀 Como Executar em Outra Máquina

Se você clonou este repositório em uma nova máquina (ex: em casa), siga os passos abaixo para rodar o projeto:

### Pré-requisitos
1.  **Node.js** instalado (versão 18 ou superior).
2.  **Git** instalado.

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/bruneram3-art/tl01-bruner.git
    cd tl01-bruner
    ```

2.  **Instale as dependências (Primeira vez apenas):**
    Abra um terminal na pasta do projeto e execute:
    ```bash
    npm install
    ```

3.  **Inicie o Servidor n8n:**
    Basta dar dois cliques no arquivo:
    📂 `iniciar_n8n_corrigido.bat`

    Ou via terminal:
    ```bash
    ./iniciar_n8n_corrigido.bat
    ```

4.  **Acesse o n8n:**
    Abra seu navegador em: `http://localhost:5678`

---

## ☁️ Como Salvar Suas Alterações

Para enviar suas modificações (novos workflows, ajustes) para o GitHub:

1.  Dê dois cliques no script:
    📂 `sincronizar_github.bat`
2.  Digite uma mensagem descrevendo o que você fez.
3.  Pronto! O script fará o upload automático.

## 📂 Estrutura do Projeto
- `n8n-mcp/`: Código do servidor MCP (integração com IA).
- `.gemini/`: Configurações do agente IA.
- `iniciar_n8n_corrigido.bat`: Script para iniciar o servidor com correções de CORS.
- `sincronizar_github.bat`: Script para facilitar o backup no GitHub.
