import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'

// Automatically reload the page when a new deployment rotates chunk hashes
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

