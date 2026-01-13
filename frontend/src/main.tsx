import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

console.log('main.tsx: Starting render');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
