
export interface AlertPayload {
    type: 'critical' | 'warning' | 'info';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: string;
}

// URL do Webhook do n8n (via Proxy do Vite para evitar CORS)
// O Vite redirecionará /n8n/* para localhost:5678/*
const N8N_WEBHOOK_URL_TEST = '/n8n/webhook-test/smart-alert'; // Para testes no n8n
const N8N_WEBHOOK_URL_PROD = '/n8n/webhook/smart-alert';      // Para produção (Workflow Ativo)

export const triggerSmartAlert = async (payload: AlertPayload, isTest: boolean = false): Promise<boolean> => {
    // Começa com a URL solicitada (Teste ou Produção)
    let url = isTest ? N8N_WEBHOOK_URL_TEST : N8N_WEBHOOK_URL_PROD;
    const payloadJson = JSON.stringify(payload);

    try {
        console.log(`[n8n Service] Tentando conectar em: ${url}`);

        let response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadJson,
        });

        // Se a URL de teste der 404, significa que o usuário não clicou em "Execute Workflow".
        // Nesse caso, tentamos a URL de Produção (Active Workflow) automaticamente.
        if (!response.ok && response.status === 404 && isTest) {
            console.warn('[n8n Service] Webhook de Teste offline (404). Tentando URL de Produção (Workflow Ativo)...');
            url = N8N_WEBHOOK_URL_PROD;
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payloadJson,
            });
        }

        if (response.ok) {
            console.log('[n8n Service] Sucesso! Alerta entregue em:', url);
            return true;
        } else {
            console.warn(`[n8n Service] Falha. Código: ${response.status} na URL: ${url}`);
            return false;
        }
    } catch (error) {
        console.warn('[n8n Service] Erro de conexão com n8n. Verifique se ele está rodando na porta 5678.', error);
        return false;
    }
};
