import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './Dashboard'
import SPCAnalysisPlotly from "./SPCAnalysisPlotly";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analysis" element={<SPCAnalysisPlotly />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
