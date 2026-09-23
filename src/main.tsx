import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registro automático de Service Worker para PWA
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('⚡ Nueva versión de Bet Analyzer disponible.');
    },
    onOfflineReady() {
      console.log('📲 Bet Analyzer listo para operar sin conexión (PWA).');
    }
  });
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
