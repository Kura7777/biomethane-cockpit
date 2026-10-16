import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { registerPWA } from './app/pwa'
import './index.css'

// Automatically reload the page when a new deployment rotates chunk hashes
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'chunk_reload_loop';
  let lastReload: number;
  try {
    lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
  } catch {
    return; // storage blocked: cannot guard against a reload loop, so do not reload
  }
  if (Date.now() - lastReload > 8000) {
    try {
      sessionStorage.setItem(reloadKey, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerPWA()

