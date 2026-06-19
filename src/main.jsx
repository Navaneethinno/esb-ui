import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { APIProvider } from './contexts/APIContext'

createRoot(document.getElementById('root')).render(
  <APIProvider>
    <App />
  </APIProvider>,
)