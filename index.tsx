
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Importando estilos globais
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker para PWA (VitePWA)
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível. Recarregar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('✅ O aplicativo está pronto para uso offline.');
  },
});
