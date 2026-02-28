import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

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
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: true,
    },
    plugins: [react(), audioApiPlugin()],
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
