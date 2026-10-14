import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { registerPWA } from './app/pwa'
import './index.css'

// Automatically reload the page when a new deployment rotates chunk hashes
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'chunk_reload_loop';
  const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
  if (Date.now() - lastReload > 8000) {
    sessionStorage.setItem(reloadKey, String(Date.now()));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerPWA()

