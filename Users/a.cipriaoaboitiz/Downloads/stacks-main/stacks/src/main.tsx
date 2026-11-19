import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { detectStandalone } from './services/env.ts'

// App instalada (iPhone/Android/Capacitor): las capas con desenfoque se sustituyen por un degradado sólido para mantener 60 FPS.
if (detectStandalone()) document.documentElement.classList.add('is-standalone')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
