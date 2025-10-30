import './index.css';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './src/Dashboard_ollama_revB'
import SetupWizard from './src/SetupWizard'

function App() {
  const [setupComplete, setSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if setup has been completed before
    const isComplete = localStorage.getItem('llmscope_setup_complete') === 'true';
    setSetupComplete(isComplete);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <p className="text-cyan-400 font-bold">Loading LLMscope...</p>
        </div>
      </div>
    );
  }

  if (!setupComplete) {
    return <SetupWizard onComplete={() => setSetupComplete(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)