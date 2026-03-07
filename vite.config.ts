import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { VitePWA } from 'vite-plugin-pwa';

// Plugin personalizado para salvar áudios enviados pelo n8n
function audioApiPlugin() {
  return {
    name: 'audio-api',
    configureServer(server: any) {
      server.middlewares.use('/api/audio', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { audioFilename, audioData, textFilename, textContent } = JSON.parse(body);

            const audioDir = path.resolve(__dirname, 'public', 'audio');
            if (!fs.existsSync(audioDir)) {
              fs.mkdirSync(audioDir, { recursive: true });
            }

            // Salvar arquivo de áudio
            if (audioFilename && audioData) {
              const audioPath = path.join(audioDir, audioFilename);
              const buffer = Buffer.from(audioData, 'base64');
              fs.writeFileSync(audioPath, buffer);
              console.log(`✅ Áudio salvo: ${audioPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
            }

            // Salvar arquivo de texto (transcrição), se fornecido
            if (textFilename && textContent) {
              const textPath = path.join(audioDir, textFilename);
              fs.writeFileSync(textPath, textContent, 'utf-8');
              console.log(`✅ Texto salvo: ${textPath}`);
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              message: 'Áudio e texto salvos com sucesso!',
              audioSaved: !!audioFilename,
              textSaved: !!textFilename
            }));
          } catch (err: any) {
            console.error('❌ Erro ao salvar áudio:', err.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      // Rota de status (GET) para debug
      server.middlewares.use('/api/audio-status', (_req: any, res: any) => {
        const audioDir = path.resolve(__dirname, 'public', 'audio');
        const files = fs.existsSync(audioDir) ? fs.readdirSync(audioDir) : [];
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'online', files }));
      });

      // Cache simples: dashboard faz POST com o valor exato do card, n8n faz GET para ler
      let cachedForecast: any = null;

      server.middlewares.use('/api/forecast', (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              cachedForecast = JSON.parse(body);
              console.log(`✅ [FORECAST] Valores recebidos: Prod=${cachedForecast.previsaoFechamento}, GN=${cachedForecast.previsaoGas}, EE=${cachedForecast.previsaoEnergia}`);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (e: any) { res.statusCode = 400; res.end(JSON.stringify({ error: e.message })); }
          });
          return;
        }

        // GET: retorna o valor exato enviado pelo dashboard
        if (cachedForecast) {
          res.statusCode = 200;
          res.end(JSON.stringify(cachedForecast));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Dashboard ainda nao enviou dados.' }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: true,
    },
    plugins: [
      react(),
      audioApiPlugin(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        manifest: {
          name: 'Industrial Predictor Pro',
          short_name: 'TL01 Predictor',
          description: 'Dashboard Operacional e Simulador Avançado ArcelorMittal',
          theme_color: '#f8fafc',
          background_color: '#f8fafc',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5000000
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
