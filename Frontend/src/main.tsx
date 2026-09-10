import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProvider } from '@/state/AppContext'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Jugnu could not find its root element.')

createRoot(root).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
