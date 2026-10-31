import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Warm up the barcode-scanner chunk in the background so tapping Scan
// doesn't have to download 450 KB first (slow connections were timing out).
setTimeout(() => {
  import('@zxing/browser').catch(() => {})
}, 1500)
