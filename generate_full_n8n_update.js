import fs from 'fs';
const content = fs.readFileSync('C:/Users/40000398/.gemini/antigravity/brain/ab99dfa0-7ef0-4afa-992e-024175ac06bd/.system_generated/steps/143/output.txt', 'utf8');
const wf = JSON.parse(content);

const jsNode = wf.data.nodes.find(n => n.name === 'Montar Prompt IA');
let code = jsNode.parameters.jsCode;

code = code.replace('const previsaoGnEspec = gasEspecAcum;', 'let previsaoGnEspec = 0;');
code = code.replace('const previsaoEeEspec = eeEspecAcum;', 'let previsaoEeEspec = 0;');
code = code.replace(
    "url: supabaseUrl + '/rest/v1/forecast_cache?id=eq.current&select=previsao_fechamento,updated_at',",
    "url: supabaseUrl + '/rest/v1/forecast_cache?id=eq.current&select=previsao_fechamento,previsao_gas,previsao_energia,updated_at',"
);
code = code.replace(
    "previsaoProducao = Math.round(cacheResp[0].previsao_fechamento);",
    "previsaoProducao = Math.round(cacheResp[0].previsao_fechamento);\n    previsaoGnEspec = cacheResp[0].previsao_gas || 0;\n    previsaoEeEspec = cacheResp[0].previsao_energia || 0;"
);

code = code.replace(
    "previsaoProducao = forecastResp.previsaoFechamento;",
    "previsaoProducao = forecastResp.previsaoFechamento;\n      previsaoGnEspec = forecastResp.previsaoGas || 0;\n      previsaoEeEspec = forecastResp.previsaoEnergia || 0;"
);

code = code.replace(
    "forecastDebug += ' | Linear: ' + previsaoProducao;\n}",
    "forecastDebug += ' | Linear: ' + previsaoProducao;\n}\n\nif (previsaoGnEspec === 0) previsaoGnEspec = gasEspecAcum;\nif (previsaoEeEspec === 0) previsaoEeEspec = eeEspecAcum;"
);

jsNode.parameters.jsCode = code;

const updateObj = {
    id: wf.data.id,
    nodes: wf.data.nodes,
    connections: wf.data.connections,
    name: wf.data.name,
    settings: wf.data.settings
};

fs.writeFileSync('C:/Users/40000398/OneDrive - ArcelorMittal/Desktop/n8n/update_n8n_full.json', JSON.stringify(updateObj, null, 2));

console.log('Update full JSON created.');
