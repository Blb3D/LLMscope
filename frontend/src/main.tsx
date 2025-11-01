import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);