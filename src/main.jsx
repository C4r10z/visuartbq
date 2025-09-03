import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'              // <<--- IMPORTANTE
import Home from './pages/Home.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>,
)
